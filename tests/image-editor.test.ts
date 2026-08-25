import assert from "node:assert/strict";
import test from "node:test";
import {
  FILTER_LUT_SIZE,
  RETRO_LUT,
  VIGNETTE_CENTER_LUT,
  VIGNETTE_EDGE_LUT,
  applyFilterToImageData,
  cloneEditableBackground,
  createEditableBackground,
  getCropPlacement,
  getConstrainedImageDimensions,
  getFilterGain,
  getVignetteAmount,
  panCrop,
  sampleLut,
  setCropZoom,
} from "../src/image-editor.ts";

function roundedSample(lut: Uint8Array, color: [number, number, number]) {
  return Array.from(sampleLut(lut, ...color), (value) => Math.round(value));
}

test("uses the specified linear filter gains", () => {
  assert.equal(getFilterGain(0), 0);
  assert.equal(getFilterGain(85), 0.935);
  assert.equal(getFilterGain(100), 1.1);
  assert.equal(getFilterGain(-20), 0);
  assert.equal(getFilterGain(120), 1.1);
});

test("contains stable 17 cubed calibrated LUT checkpoints", () => {
  const expectedLength = FILTER_LUT_SIZE ** 3 * 3;
  assert.equal(RETRO_LUT.length, expectedLength);
  assert.equal(VIGNETTE_CENTER_LUT.length, expectedLength);
  assert.equal(VIGNETTE_EDGE_LUT.length, expectedLength);

  assert.deepEqual(roundedSample(RETRO_LUT, [0, 0, 0]), [21, 28, 23]);
  assert.deepEqual(roundedSample(RETRO_LUT, [128, 128, 128]), [129, 135, 124]);
  assert.deepEqual(roundedSample(RETRO_LUT, [255, 255, 255]), [237, 237, 228]);
  assert.deepEqual(roundedSample(RETRO_LUT, [32, 160, 32]), [0, 105, 81]);
  assert.deepEqual(roundedSample(RETRO_LUT, [32, 64, 200]), [81, 92, 181]);

  assert.deepEqual(roundedSample(VIGNETTE_CENTER_LUT, [128, 128, 128]), [94, 100, 92]);
  assert.deepEqual(roundedSample(VIGNETTE_EDGE_LUT, [128, 128, 128]), [43, 51, 50]);
});

test("blends the reference preset linearly at 0, 85 and 100 percent", () => {
  const original = [128, 128, 128, 255];
  const reference = sampleLut(RETRO_LUT, 128, 128, 128);

  for (const strength of [0, 85, 100]) {
    const imageData = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray(original),
    } as ImageData;
    applyFilterToImageData(imageData, "retro", strength);
    const gain = getFilterGain(strength);
    const expected = reference.map((value, channel) => (
      Math.round(Math.min(255, Math.max(0, original[channel] + ((value - original[channel]) * gain))))
    ));
    assert.deepEqual(Array.from(imageData.data), [...expected, 255]);
  }
});

test("uses the specified elliptical smoothstep vignette", () => {
  assert.equal(getVignetteAmount(50, 50, 101, 101), 0);
  assert.equal(getVignetteAmount(0, 0, 101, 101), 1);

  const size = 200;
  const center = (size - 1) / 2;
  const halfwayRadius = 0.575;
  const halfwayX = center + (halfwayRadius * Math.SQRT2 * (size / 2));
  assert.ok(Math.abs(getVignetteAmount(halfwayX, center, size, size) - 0.5) < 1e-10);
});

test("crop placement always fills the target and clamps pan and zoom", () => {
  const source = { width: 1600, height: 900 };
  const target = { width: 1080, height: 1350 };
  const centered = getCropPlacement(source, target, { zoom: 1, positionX: 0, positionY: 0 });
  assert.ok(centered.width >= target.width);
  assert.ok(centered.height >= target.height);
  assert.equal(centered.y, 0);

  const panned = panCrop(
    { zoom: 2, positionX: 0, positionY: 0 },
    100_000,
    -100_000,
    source,
    target,
  );
  assert.deepEqual(panned, { zoom: 2, positionX: 1, positionY: -1 });
  assert.equal(setCropZoom(panned, 0).zoom, 1);
  assert.equal(setCropZoom(panned, 99).zoom, 3);

  const edge = getCropPlacement(source, target, panned);
  assert.ok(edge.x <= 0);
  assert.ok(edge.y <= 0);
  assert.ok(edge.x + edge.width >= target.width);
  assert.ok(edge.y + edge.height >= target.height);
});

test("keeps independent crop and strength state without duplicating the source", () => {
  const source = { width: 1600, height: 900 } as HTMLCanvasElement;
  const image = createEditableBackground(source, "test.jpg");
  image.crops.post = { zoom: 1.2, positionX: 0.4, positionY: -0.2 };
  image.crops.story = { zoom: 1.8, positionX: -0.6, positionY: 0.7 };
  image.strengths.retro = 42;
  image.strengths.vignette = 91;

  const clone = cloneEditableBackground(image);
  clone.crops.post!.positionX = -1;
  clone.strengths.retro = 12;

  assert.equal(clone.source, source);
  assert.deepEqual(image.crops.post, { zoom: 1.2, positionX: 0.4, positionY: -0.2 });
  assert.deepEqual(image.crops.story, { zoom: 1.8, positionX: -0.6, positionY: 0.7 });
  assert.deepEqual(image.strengths, { retro: 42, vignette: 91 });
});

test("reduces oversized images locally to a 4096 pixel maximum edge", () => {
  assert.deepEqual(getConstrainedImageDimensions(2000, 3000), { width: 2000, height: 3000 });
  assert.deepEqual(getConstrainedImageDimensions(8000, 4000), { width: 4096, height: 2048 });
  assert.deepEqual(getConstrainedImageDimensions(3000, 6000), { width: 2048, height: 4096 });
});
