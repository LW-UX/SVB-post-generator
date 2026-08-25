export type BackgroundFormatKey = "post" | "story" | "landscape" | "widescreen";
export type FilterPreset = "original" | "retro" | "vignette";

export type CropState = {
  zoom: number;
  positionX: number;
  positionY: number;
};

export type EditableBackgroundImage = {
  source: HTMLCanvasElement;
  fileName: string;
  preset: FilterPreset;
  strengths: Record<Exclude<FilterPreset, "original">, number>;
  crops: Partial<Record<BackgroundFormatKey, CropState>>;
};

export type ImageDimensions = {
  width: number;
  height: number;
};

export type CropPlacement = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const DEFAULT_FILTER_STRENGTH = 85;
export const MAX_BACKGROUND_EDGE = 4096;
export const MIN_CROP_ZOOM = 1;
export const MAX_CROP_ZOOM = 3;
export const FILTER_LUT_SIZE = 17;

const RETRO_EXPONENTS = [
  [0, 0, 0], [0, 0, 1], [0, 1, 0], [1, 0, 0], [0, 0, 2],
  [0, 1, 1], [0, 2, 0], [1, 0, 1], [1, 1, 0], [2, 0, 0],
  [0, 0, 3], [0, 1, 2], [0, 2, 1], [0, 3, 0], [1, 0, 2],
  [1, 1, 1], [1, 2, 0], [2, 0, 1], [2, 1, 0], [3, 0, 0],
  [0, 0, 4], [0, 1, 3], [0, 2, 2], [0, 3, 1], [0, 4, 0],
  [1, 0, 3], [1, 1, 2], [1, 2, 1], [1, 3, 0], [2, 0, 2],
  [2, 1, 1], [2, 2, 0], [3, 0, 1], [3, 1, 0], [4, 0, 0],
] as const;

const RETRO_COEFFICIENTS = [
  [0.084127370, 0.108228422, 0.090531248], [-0.062844108, -0.024347483, -0.064320771],
  [-0.433100664, -0.365753208, -0.051783342], [-0.005391700, -0.025037375, -0.041479110],
  [0.596219380, 0.138293036, 3.451883207], [-1.516587883, 0.934288264, -0.845261804],
  [1.697675453, 4.156383924, 0.971006892], [0.931769471, -1.068184421, 0.977539119],
  [1.977546594, 0.731504821, -1.100728517], [1.794216934, 0.477484770, 0.485043654],
  [0.408948247, 0.974097691, -3.879878695], [1.360119837, -4.062561137, 0.560578873],
  [1.573054717, 0.513758826, -1.250873841], [-1.899790139, -1.045880526, 1.548374742],
  [-1.412389643, 3.836746760, -2.573786203], [-1.562464215, -3.951689629, 5.249755461],
  [3.214003100, -2.612599065, -3.309556890], [-1.820744178, 1.019540905, -2.057287771],
  [-8.466813299, -2.270977619, 0.627787011], [1.507919643, 0.281044757, -0.143142423],
  [-1.609527706, -1.848907736, 1.215003272], [7.188881292, 11.387177370, 0.303459076],
  [-15.510685605, -21.951937308, 1.892106395], [12.120565285, 18.624913142, -4.323491621],
  [-8.254975020, -10.269722989, -1.977180039], [-2.402077806, -6.579830767, 1.204190401],
  [5.530147091, 16.375875929, -5.768506894], [-2.694917629, -9.788542742, 10.139573198],
  [14.836527241, 15.183934909, 5.975054513], [2.497374417, -1.828412658, 2.285237710],
  [-4.183779004, -2.300721530, -6.353930646], [-15.240273334, -9.876182195, -7.639600834],
  [1.853981785, 0.953262445, 1.737642479], [11.978801537, 6.342150558, 4.398581085],
  [-3.146932070, -1.239599394, -0.838316614],
] as const;

const VIGNETTE_EXPONENTS = RETRO_EXPONENTS.slice(0, 20);

const VIGNETTE_COEFFICIENTS = [
  [0.081374509, 0.114069653, 0.074998380], [0.005631130, -0.099308141, 0.304770375],
  [0.441942206, 0.643407978, 0.140329500], [-0.311905785, -0.478323854, -0.277403060],
  [0.302181860, 0.465096412, 1.228081940], [-1.924308973, -1.292582310, -1.751708701],
  [0.988160949, 1.034815078, 1.002121041], [0.819065294, 0.660280215, 0.803431643],
  [-1.368470164, -1.020054341, -1.440726154], [2.282714029, 1.428968044, 1.217756924],
  [0.470979523, 0.077962446, -1.086175469], [-0.925534778, -0.355301036, 2.890456494],
  [2.629056559, 1.103703305, -2.718669671], [-1.538576248, -0.391889478, 0.717535851],
  [-1.199387696, -0.835794473, -2.088550329], [0.824600512, 0.992772971, 3.625987780],
  [-0.112975027, -1.121879561, -1.284959516], [0.120755953, -0.095645118, -0.171210491],
  [0.755157964, 1.164117200, 0.580467216], [-1.476902950, -1.137852330, -0.972914600],
  [-0.024796693, -0.031188723, 0.008367131], [-0.019806887, 0.263749022, 0.119105861],
  [-0.349771158, -0.675374101, -0.187322616], [0.021413792, 0.090727546, -0.276936297],
] as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function evaluatePolynomial(
  red: number,
  green: number,
  blue: number,
  exponents: readonly (readonly [number, number, number])[],
  coefficients: readonly (readonly [number, number, number])[],
) {
  const result = [0, 0, 0];
  for (let index = 0; index < exponents.length; index += 1) {
    const [redPower, greenPower, bluePower] = exponents[index];
    const term = (red ** redPower) * (green ** greenPower) * (blue ** bluePower);
    result[0] += term * coefficients[index][0];
    result[1] += term * coefficients[index][1];
    result[2] += term * coefficients[index][2];
  }
  return result;
}

function createCalibratedLut(kind: "retro" | "vignette-center" | "vignette-edge") {
  const lut = new Uint8Array(FILTER_LUT_SIZE ** 3 * 3);
  let outputIndex = 0;
  for (let redIndex = 0; redIndex < FILTER_LUT_SIZE; redIndex += 1) {
    for (let greenIndex = 0; greenIndex < FILTER_LUT_SIZE; greenIndex += 1) {
      for (let blueIndex = 0; blueIndex < FILTER_LUT_SIZE; blueIndex += 1) {
        const red = redIndex / (FILTER_LUT_SIZE - 1);
        const green = greenIndex / (FILTER_LUT_SIZE - 1);
        const blue = blueIndex / (FILTER_LUT_SIZE - 1);
        const transformed = kind === "retro"
          ? evaluatePolynomial(red, green, blue, RETRO_EXPONENTS, RETRO_COEFFICIENTS)
          : evaluatePolynomial(
              red,
              green,
              blue,
              VIGNETTE_EXPONENTS,
              VIGNETTE_COEFFICIENTS.slice(0, VIGNETTE_EXPONENTS.length),
            );

        if (kind === "vignette-edge") {
          transformed[0] += VIGNETTE_COEFFICIENTS[20][0]
            + (red * VIGNETTE_COEFFICIENTS[21][0])
            + (green * VIGNETTE_COEFFICIENTS[22][0])
            + (blue * VIGNETTE_COEFFICIENTS[23][0]);
          transformed[1] += VIGNETTE_COEFFICIENTS[20][1]
            + (red * VIGNETTE_COEFFICIENTS[21][1])
            + (green * VIGNETTE_COEFFICIENTS[22][1])
            + (blue * VIGNETTE_COEFFICIENTS[23][1]);
          transformed[2] += VIGNETTE_COEFFICIENTS[20][2]
            + (red * VIGNETTE_COEFFICIENTS[21][2])
            + (green * VIGNETTE_COEFFICIENTS[22][2])
            + (blue * VIGNETTE_COEFFICIENTS[23][2]);
        }

        lut[outputIndex] = Math.round(clamp(transformed[0], 0, 1) * 255);
        lut[outputIndex + 1] = Math.round(clamp(transformed[1], 0, 1) * 255);
        lut[outputIndex + 2] = Math.round(clamp(transformed[2], 0, 1) * 255);
        outputIndex += 3;
      }
    }
  }
  return lut;
}

// Die Polynome wurden offline aus drei gleich gewichteten Vorher-/Nachher-Reihen
// kalibriert. Zur Laufzeit entstehen daraus kleine, deterministische 17³-LUTs.
export const RETRO_LUT = createCalibratedLut("retro");
export const VIGNETTE_CENTER_LUT = createCalibratedLut("vignette-center");
export const VIGNETTE_EDGE_LUT = createCalibratedLut("vignette-edge");

const LUT_LOW = new Uint8Array(256);
const LUT_HIGH = new Uint8Array(256);
const LUT_FRACTION = new Float32Array(256);
for (let value = 0; value < 256; value += 1) {
  const scaled = (value / 255) * (FILTER_LUT_SIZE - 1);
  LUT_LOW[value] = Math.floor(scaled);
  LUT_HIGH[value] = Math.min(FILTER_LUT_SIZE - 1, Math.ceil(scaled));
  LUT_FRACTION[value] = scaled - LUT_LOW[value];
}

function lutOffset(redIndex: number, greenIndex: number, blueIndex: number) {
  return (((redIndex * FILTER_LUT_SIZE) + greenIndex) * FILTER_LUT_SIZE + blueIndex) * 3;
}

export function sampleLut(
  lut: Uint8Array,
  red: number,
  green: number,
  blue: number,
  output: Float32Array | number[] = [0, 0, 0],
) {
  const redLow = LUT_LOW[red];
  const redHigh = LUT_HIGH[red];
  const greenLow = LUT_LOW[green];
  const greenHigh = LUT_HIGH[green];
  const blueLow = LUT_LOW[blue];
  const blueHigh = LUT_HIGH[blue];
  const redFraction = LUT_FRACTION[red];
  const greenFraction = LUT_FRACTION[green];
  const blueFraction = LUT_FRACTION[blue];

  for (let channel = 0; channel < 3; channel += 1) {
    const c000 = lut[lutOffset(redLow, greenLow, blueLow) + channel];
    const c001 = lut[lutOffset(redLow, greenLow, blueHigh) + channel];
    const c010 = lut[lutOffset(redLow, greenHigh, blueLow) + channel];
    const c011 = lut[lutOffset(redLow, greenHigh, blueHigh) + channel];
    const c100 = lut[lutOffset(redHigh, greenLow, blueLow) + channel];
    const c101 = lut[lutOffset(redHigh, greenLow, blueHigh) + channel];
    const c110 = lut[lutOffset(redHigh, greenHigh, blueLow) + channel];
    const c111 = lut[lutOffset(redHigh, greenHigh, blueHigh) + channel];
    const c00 = c000 + ((c001 - c000) * blueFraction);
    const c01 = c010 + ((c011 - c010) * blueFraction);
    const c10 = c100 + ((c101 - c100) * blueFraction);
    const c11 = c110 + ((c111 - c110) * blueFraction);
    const c0 = c00 + ((c01 - c00) * greenFraction);
    const c1 = c10 + ((c11 - c10) * greenFraction);
    output[channel] = c0 + ((c1 - c0) * redFraction);
  }
  return output;
}

export function getFilterGain(strength: number) {
  return clamp(strength, 0, 100) / 100 * 1.1;
}

export function getVignetteAmount(x: number, y: number, width: number, height: number) {
  if (width <= 0 || height <= 0) return 0;
  const normalizedX = (x - ((width - 1) / 2)) / (width / 2);
  const normalizedY = (y - ((height - 1) / 2)) / (height / 2);
  const radius = Math.hypot(normalizedX, normalizedY) / Math.SQRT2;
  const progress = clamp((radius - 0.3) / 0.55, 0, 1);
  return progress * progress * (3 - (2 * progress));
}

export function applyFilterToImageData(
  imageData: ImageData,
  preset: FilterPreset,
  strength: number,
) {
  if (preset === "original" || strength <= 0) return imageData;

  const gain = getFilterGain(strength);
  const pixels = imageData.data;
  const centerColor = new Float32Array(3);
  const edgeColor = new Float32Array(3);

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    let referenceRed: number;
    let referenceGreen: number;
    let referenceBlue: number;

    if (preset === "retro") {
      sampleLut(RETRO_LUT, red, green, blue, centerColor);
      referenceRed = centerColor[0];
      referenceGreen = centerColor[1];
      referenceBlue = centerColor[2];
    } else {
      const pixelNumber = index / 4;
      const x = pixelNumber % imageData.width;
      const y = Math.floor(pixelNumber / imageData.width);
      const vignetteAmount = getVignetteAmount(x, y, imageData.width, imageData.height);
      sampleLut(VIGNETTE_CENTER_LUT, red, green, blue, centerColor);
      sampleLut(VIGNETTE_EDGE_LUT, red, green, blue, edgeColor);
      referenceRed = centerColor[0] + ((edgeColor[0] - centerColor[0]) * vignetteAmount);
      referenceGreen = centerColor[1] + ((edgeColor[1] - centerColor[1]) * vignetteAmount);
      referenceBlue = centerColor[2] + ((edgeColor[2] - centerColor[2]) * vignetteAmount);
    }

    pixels[index] = Math.round(clamp(red + ((referenceRed - red) * gain), 0, 255));
    pixels[index + 1] = Math.round(clamp(green + ((referenceGreen - green) * gain), 0, 255));
    pixels[index + 2] = Math.round(clamp(blue + ((referenceBlue - blue) * gain), 0, 255));
  }
  return imageData;
}

export function createInitialCrop(): CropState {
  return { zoom: 1, positionX: 0, positionY: 0 };
}

export function getCropForFormat(
  image: EditableBackgroundImage,
  formatKey: BackgroundFormatKey,
) {
  return image.crops[formatKey] ?? createInitialCrop();
}

export function cloneEditableBackground(image: EditableBackgroundImage): EditableBackgroundImage {
  return {
    ...image,
    strengths: { ...image.strengths },
    crops: Object.fromEntries(
      Object.entries(image.crops).map(([key, crop]) => [key, crop ? { ...crop } : crop]),
    ),
  };
}

export function createEditableBackground(
  source: HTMLCanvasElement,
  fileName: string,
): EditableBackgroundImage {
  return {
    source,
    fileName,
    preset: "original",
    strengths: { retro: DEFAULT_FILTER_STRENGTH, vignette: DEFAULT_FILTER_STRENGTH },
    crops: {},
  };
}

export function getConstrainedImageDimensions(width: number, height: number) {
  const scale = Math.min(1, MAX_BACKGROUND_EDGE / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function loadEditableBackground(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const candidate = new Image();
      candidate.onload = () => resolve(candidate);
      candidate.onerror = () => reject(new Error("Das Hintergrundbild konnte nicht gelesen werden."));
      candidate.src = url;
    });
    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;
    if (naturalWidth <= 0 || naturalHeight <= 0) {
      throw new Error("Das Hintergrundbild besitzt keine gültige Größe.");
    }
    const dimensions = getConstrainedImageDimensions(naturalWidth, naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d", { colorSpace: "srgb" });
    if (!context) throw new Error("Das Hintergrundbild konnte nicht vorbereitet werden.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return createEditableBackground(canvas, file.name);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function getCropPlacement(
  source: ImageDimensions,
  target: ImageDimensions,
  crop: CropState,
): CropPlacement {
  const baseScale = Math.max(target.width / source.width, target.height / source.height);
  const scale = baseScale * clamp(crop.zoom, MIN_CROP_ZOOM, MAX_CROP_ZOOM);
  const width = source.width * scale;
  const height = source.height * scale;
  const maximumOffsetX = Math.max(0, (width - target.width) / 2);
  const maximumOffsetY = Math.max(0, (height - target.height) / 2);
  return {
    x: ((target.width - width) / 2) + (clamp(crop.positionX, -1, 1) * maximumOffsetX),
    y: ((target.height - height) / 2) + (clamp(crop.positionY, -1, 1) * maximumOffsetY),
    width,
    height,
  };
}

export function panCrop(
  crop: CropState,
  deltaX: number,
  deltaY: number,
  source: ImageDimensions,
  target: ImageDimensions,
) {
  const placement = getCropPlacement(source, target, crop);
  const maximumOffsetX = Math.max(0, (placement.width - target.width) / 2);
  const maximumOffsetY = Math.max(0, (placement.height - target.height) / 2);
  return {
    ...crop,
    positionX: maximumOffsetX > 0
      ? clamp(crop.positionX + (deltaX / maximumOffsetX), -1, 1)
      : 0,
    positionY: maximumOffsetY > 0
      ? clamp(crop.positionY + (deltaY / maximumOffsetY), -1, 1)
      : 0,
  };
}

export function setCropZoom(crop: CropState, zoom: number) {
  return { ...crop, zoom: clamp(zoom, MIN_CROP_ZOOM, MAX_CROP_ZOOM) };
}

const renderCache = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();

function cacheKey(
  image: EditableBackgroundImage,
  formatKey: BackgroundFormatKey,
  width: number,
  height: number,
) {
  const crop = getCropForFormat(image, formatKey);
  const strength = image.preset === "original" ? 0 : image.strengths[image.preset];
  return [
    formatKey,
    width,
    height,
    crop.zoom.toFixed(4),
    crop.positionX.toFixed(4),
    crop.positionY.toFixed(4),
    image.preset,
    strength,
  ].join(":");
}

export function renderEditableBackground(
  image: EditableBackgroundImage,
  formatKey: BackgroundFormatKey,
  width: number,
  height: number,
) {
  const roundedWidth = Math.max(1, Math.round(width));
  const roundedHeight = Math.max(1, Math.round(height));
  const key = cacheKey(image, formatKey, roundedWidth, roundedHeight);
  let imageCache = renderCache.get(image.source);
  if (!imageCache) {
    imageCache = new Map();
    renderCache.set(image.source, imageCache);
  }
  const cached = imageCache.get(key);
  if (cached) return cached;

  const output = document.createElement("canvas");
  output.width = roundedWidth;
  output.height = roundedHeight;
  const context = output.getContext("2d", {
    colorSpace: "srgb",
    willReadFrequently: image.preset !== "original",
  });
  if (!context) return output;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  const placement = getCropPlacement(
    { width: image.source.width, height: image.source.height },
    { width: roundedWidth, height: roundedHeight },
    getCropForFormat(image, formatKey),
  );
  context.drawImage(image.source, placement.x, placement.y, placement.width, placement.height);

  if (image.preset !== "original") {
    const imageData = context.getImageData(0, 0, roundedWidth, roundedHeight);
    applyFilterToImageData(imageData, image.preset, image.strengths[image.preset]);
    context.putImageData(imageData, 0, 0);
  }

  imageCache.set(key, output);
  while (imageCache.size > 8) {
    const oldestKey = imageCache.keys().next().value;
    if (typeof oldestKey === "string") imageCache.delete(oldestKey);
    else break;
  }
  return output;
}

export function drawEditableBackground(
  context: CanvasRenderingContext2D,
  image: EditableBackgroundImage,
  formatKey: BackgroundFormatKey,
  width: number,
  height: number,
) {
  const transform = context.getTransform();
  const renderScale = Math.max(
    Math.hypot(transform.a, transform.b),
    Math.hypot(transform.c, transform.d),
    1,
  );
  const rendered = renderEditableBackground(
    image,
    formatKey,
    width * renderScale,
    height * renderScale,
  );
  context.drawImage(rendered, 0, 0, width, height);
}
