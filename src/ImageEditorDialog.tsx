import type {
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_FILTER_STRENGTH,
  MAX_CROP_ZOOM,
  MIN_CROP_ZOOM,
  cloneEditableBackground,
  createInitialCrop,
  getCropForFormat,
  panCrop,
  renderEditableBackground,
  setCropZoom,
} from "./image-editor";
import type {
  BackgroundFormatKey,
  CropState,
  EditableBackgroundImage,
  FilterPreset,
  ImageDimensions,
} from "./image-editor";

type PointerPosition = {
  x: number;
  y: number;
};

type GestureSnapshot = {
  x: number;
  y: number;
  distance: number;
};

type ImageEditorDialogProps = {
  initialImage: EditableBackgroundImage;
  formatKey: BackgroundFormatKey;
  format: ImageDimensions & { label: string; short: string };
  renderPreview?: (canvas: HTMLCanvasElement, image: EditableBackgroundImage) => void;
  onApply: (image: EditableBackgroundImage) => void;
  onCancel: () => void;
};

const FILTERS: { key: FilterPreset; label: string; description: string }[] = [
  { key: "original", label: "Original", description: "Ohne Filter" },
  { key: "retro", label: "Retro", description: "Matt und leicht grünlich" },
  { key: "vignette", label: "Vignette", description: "Dunkel mit kräftigem Rand" },
];

function createGestureSnapshot(pointers: Map<number, PointerPosition>) {
  const points = Array.from(pointers.values());
  if (points.length === 0) return null;
  if (points.length === 1) {
    return { x: points[0].x, y: points[0].y, distance: 0 };
  }
  const first = points[0];
  const second = points[1];
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
    distance: Math.hypot(second.x - first.x, second.y - first.y),
  };
}

function previewDimensions(format: ImageDimensions) {
  const scale = Math.min(720 / format.width, 520 / format.height);
  return {
    width: Math.max(1, Math.round(format.width * scale)),
    height: Math.max(1, Math.round(format.height * scale)),
  };
}

export default function ImageEditorDialog({
  initialImage,
  formatKey,
  format,
  renderPreview,
  onApply,
  onCancel,
}: ImageEditorDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointersRef = useRef(new Map<number, PointerPosition>());
  const gestureRef = useRef<GestureSnapshot | null>(null);
  const [draft, setDraft] = useState(() => cloneEditableBackground(initialImage));
  const dimensions = useMemo(
    () => previewDimensions(format),
    [format],
  );
  const crop = getCropForFormat(draft, formatKey);
  const activeStrength = draft.preset === "original"
    ? DEFAULT_FILTER_STRENGTH
    : draft.strengths[draft.preset];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const animationFrame = window.requestAnimationFrame(() => {
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      if (renderPreview) {
        renderPreview(canvas, draft);
        return;
      }
      const context = canvas.getContext("2d", { colorSpace: "srgb" });
      if (!context) return;
      const rendered = renderEditableBackground(
        draft,
        formatKey,
        dimensions.width,
        dimensions.height,
      );
      context.drawImage(rendered, 0, 0);
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [dimensions.height, dimensions.width, draft, formatKey, renderPreview]);

  function updateCrop(updater: (current: CropState) => CropState) {
    setDraft((current) => ({
      ...current,
      crops: {
        ...current.crops,
        [formatKey]: updater(getCropForFormat(current, formatKey)),
      },
    }));
  }

  function canvasDelta(deltaX: number, deltaY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const bounds = canvas.getBoundingClientRect();
    return {
      x: bounds.width > 0 ? deltaX * (canvas.width / bounds.width) : 0,
      y: bounds.height > 0 ? deltaY * (canvas.height / bounds.height) : 0,
    };
  }

  function moveCrop(deltaX: number, deltaY: number, zoomFactor = 1) {
    const delta = canvasDelta(deltaX, deltaY);
    updateCrop((current) => {
      const zoomed = setCropZoom(current, current.zoom * zoomFactor);
      return panCrop(
        zoomed,
        delta.x,
        delta.y,
        { width: draft.source.width, height: draft.source.height },
        dimensions,
      );
    });
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gestureRef.current = createGestureSnapshot(pointersRef.current);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    const previous = gestureRef.current;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const next = createGestureSnapshot(pointersRef.current);
    if (previous && next) {
      const zoomFactor = previous.distance > 0 && next.distance > 0
        ? next.distance / previous.distance
        : 1;
      moveCrop(next.x - previous.x, next.y - previous.y, zoomFactor);
    }
    gestureRef.current = next;
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLCanvasElement>) {
    pointersRef.current.delete(event.pointerId);
    gestureRef.current = createGestureSnapshot(pointersRef.current);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleWheel(event: WheelEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const zoomFactor = Math.exp(-event.deltaY * 0.0015);
    moveCrop(0, 0, zoomFactor);
  }

  function handleCropKeys(event: KeyboardEvent<HTMLCanvasElement>) {
    if (!event.key.startsWith("Arrow")) return;
    event.preventDefault();
    const distance = event.shiftKey ? 30 : 10;
    const deltaX = event.key === "ArrowLeft" ? -distance : event.key === "ArrowRight" ? distance : 0;
    const deltaY = event.key === "ArrowUp" ? -distance : event.key === "ArrowDown" ? distance : 0;
    moveCrop(deltaX, deltaY);
  }

  function choosePreset(preset: FilterPreset) {
    setDraft((current) => ({ ...current, preset }));
  }

  function updateStrength(strength: number) {
    if (draft.preset === "original") return;
    const preset = draft.preset;
    setDraft((current) => ({
      ...current,
      strengths: { ...current.strengths, [preset]: strength },
    }));
  }

  function resetDraft() {
    setDraft((current) => ({
      ...current,
      preset: "original",
      crops: { ...current.crops, [formatKey]: createInitialCrop() },
    }));
  }

  return (
    <dialog
      ref={dialogRef}
      className="image-editor-dialog"
      aria-labelledby="image-editor-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="image-editor-shell">
        <header className="image-editor-header">
          <div>
            <p className="section-kicker">Hintergrundbild</p>
            <h2 id="image-editor-title">Bild bearbeiten</h2>
            <p>{format.label} · {format.short}</p>
          </div>
          <button
            className="image-editor-close"
            type="button"
            aria-label="Bildbearbeitung abbrechen"
            onClick={onCancel}
          >
            ×
          </button>
        </header>

        <div className="image-editor-workspace is-cropping">
          <div className="image-editor-canvas-wrap">
            <canvas
              ref={canvasRef}
              tabIndex={0}
              aria-label="Postvorschau: Hintergrundbild mit Maus, Touch oder Pfeiltasten im Ausschnitt bewegen"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onWheel={handleWheel}
              onKeyDown={handleCropKeys}
            />
          </div>

          <div className="image-editor-controls">
            <div className="editor-control-block">
              <div className="editor-control-heading">
                <label htmlFor="background-zoom">Zoom</label>
                <output htmlFor="background-zoom">{Math.round(crop.zoom * 100)} %</output>
              </div>
              <input
                id="background-zoom"
                type="range"
                min={MIN_CROP_ZOOM * 100}
                max={MAX_CROP_ZOOM * 100}
                step="1"
                value={Math.round(crop.zoom * 100)}
                onChange={(event) => updateCrop((current) => (
                  setCropZoom(current, Number(event.target.value) / 100)
                ))}
              />
              <p>Ziehe das Bild in die gewünschte Position. Mausrad oder zwei Finger ändern den Zoom.</p>
            </div>
            <div className="filter-options" role="radiogroup" aria-label="Bildfilter">
              {FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  role="radio"
                  aria-checked={draft.preset === filter.key}
                  className={draft.preset === filter.key ? "active" : ""}
                  onClick={() => choosePreset(filter.key)}
                >
                  <strong>{filter.label}</strong>
                  <span>{filter.description}</span>
                </button>
              ))}
            </div>
            <div className="editor-control-block">
              <div className="editor-control-heading">
                <label htmlFor="filter-strength">Filterstärke</label>
                <output htmlFor="filter-strength">
                  {draft.preset === "original" ? "–" : `${activeStrength} %`}
                </output>
              </div>
              <input
                id="filter-strength"
                type="range"
                min="0"
                max="100"
                step="1"
                value={activeStrength}
                disabled={draft.preset === "original"}
                onChange={(event) => updateStrength(Number(event.target.value))}
              />
              <p>85 % ist die Standardeinstellung, 100 % verstärkt den Referenzlook leicht.</p>
            </div>
          </div>
        </div>

        <footer className="image-editor-footer">
          <div>
            <button className="text-button" type="button" onClick={resetDraft}>Zurücksetzen</button>
            <span title={draft.fileName}>{draft.fileName}</span>
          </div>
          <div>
            <button className="secondary-button" type="button" onClick={onCancel}>Abbrechen</button>
            <button className="primary-button" type="button" onClick={() => onApply(draft)}>Übernehmen</button>
          </div>
        </footer>
      </div>
    </dialog>
  );
}
