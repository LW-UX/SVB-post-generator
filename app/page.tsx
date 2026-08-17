"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type PostType = "matchday" | "result";
type FormatKey = "post" | "story" | "landscape" | "widescreen";
type HomeAway = "home" | "away";

type FormState = {
  clubName: string;
  opponentName: string;
  competition: string;
  round: string;
  date: string;
  time: string;
  venue: string;
  headline: string;
  clubScore: string;
  opponentScore: string;
  halfTime: string;
  footer: string;
  homeAway: HomeAway;
  imageZoom: number;
  imageFocusY: number;
};

type Assets = {
  clubLogo: HTMLImageElement | null;
  opponentLogo: HTMLImageElement | null;
  background: HTMLImageElement | null;
};

const FORMATS: Record<
  FormatKey,
  { label: string; short: string; width: number; height: number }
> = {
  post: { label: "Instagram Post", short: "1:1", width: 1080, height: 1080 },
  story: { label: "Instagram Story", short: "9:16", width: 1080, height: 1920 },
  landscape: { label: "Querformat", short: "1,91:1", width: 1200, height: 630 },
  widescreen: { label: "16:9 Querformat", short: "16:9", width: 1920, height: 1080 },
};

const INITIAL_FORM: FormState = {
  clubName: "SV Bergheim",
  opponentName: "TSV Königsbrunn II",
  competition: "Kreisklasse Augsburg Süd",
  round: "Spieltag 1",
  date: "2026-08-23",
  time: "15:00",
  venue: "Sportanlage Bergheim",
  headline: "MATCHDAY",
  clubScore: "3",
  opponentScore: "1",
  halfTime: "1:0",
  footer: "Gemeinsam für den SVB",
  homeAway: "home",
  imageZoom: 1,
  imageFocusY: 0,
};

const MONTHS = [
  "JAN",
  "FEB",
  "MÄR",
  "APR",
  "MAI",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OKT",
  "NOV",
  "DEZ",
];

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value || "DATUM";
  return `${String(day).padStart(2, "0")} ${MONTHS[month - 1]} ${year}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function fitFont(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
  weight = 800,
) {
  let size = maxSize;
  do {
    context.font = `${weight} ${size}px Arial, Helvetica, sans-serif`;
    if (context.measureText(text).width <= maxWidth) return size;
    size -= 2;
  } while (size > minSize);
  return minSize;
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  zoom: number,
  focusY: number,
) {
  const coverScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const scale = coverScale * zoom;
  const drawnWidth = image.naturalWidth * scale;
  const drawnHeight = image.naturalHeight * scale;
  const sourceX = x + (width - drawnWidth) / 2;
  const travel = Math.max(0, drawnHeight - height);
  const sourceY = y - travel / 2 - (focusY / 100) * (travel / 2);
  context.drawImage(image, sourceX, sourceY, drawnWidth, drawnHeight);
}

function drawBadge(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  centerX: number,
  centerY: number,
  size: number,
  fallback: string,
) {
  context.save();
  context.beginPath();
  context.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
  context.fillStyle = "rgba(255,255,255,.96)";
  context.shadowColor = "rgba(0, 0, 0, .24)";
  context.shadowBlur = size * 0.12;
  context.fill();
  context.shadowBlur = 0;
  context.clip();

  if (image) {
    const padding = size * 0.14;
    const maxWidth = size - padding * 2;
    const maxHeight = size - padding * 2;
    const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, centerX - width / 2, centerY - height / 2, width, height);
  } else {
    context.fillStyle = "#173c8f";
    context.font = `900 ${size * 0.25}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(fallback.slice(0, 3).toUpperCase(), centerX, centerY);
  }
  context.restore();
}

function renderGraphic(
  canvas: HTMLCanvasElement,
  formatKey: FormatKey,
  type: PostType,
  form: FormState,
  assets: Assets,
) {
  const format = FORMATS[formatKey];
  canvas.width = format.width;
  canvas.height = format.height;
  const context = canvas.getContext("2d");
  if (!context) return;

  const width = format.width;
  const height = format.height;
  const isStory = formatKey === "story";
  const isLandscape = height / width < 0.7;
  const safe = width * (isLandscape ? 0.055 : 0.065);

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#173f98");
  gradient.addColorStop(0.55, "#081b42");
  gradient.addColorStop(1, "#040b19");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  if (assets.background) {
    drawCover(
      context,
      assets.background,
      0,
      0,
      width,
      height,
      form.imageZoom,
      form.imageFocusY,
    );
    const overlay = context.createLinearGradient(0, 0, 0, height);
    overlay.addColorStop(0, "rgba(3, 14, 35, .34)");
    overlay.addColorStop(0.55, "rgba(4, 19, 50, .68)");
    overlay.addColorStop(1, "rgba(2, 8, 20, .94)");
    context.fillStyle = overlay;
    context.fillRect(0, 0, width, height);
  }

  context.save();
  context.translate(width * 0.58, height * 0.14);
  context.rotate(-0.16);
  context.fillStyle = "rgba(53, 103, 220, .42)";
  context.fillRect(-width * 0.7, 0, width * 1.45, Math.max(24, height * 0.035));
  context.fillStyle = "rgba(255, 255, 255, .08)";
  context.fillRect(-width * 0.7, height * 0.06, width * 1.35, Math.max(9, height * 0.009));
  context.restore();

  const leftName = form.homeAway === "home" ? form.clubName : form.opponentName;
  const rightName = form.homeAway === "home" ? form.opponentName : form.clubName;
  const leftLogo = form.homeAway === "home" ? assets.clubLogo : assets.opponentLogo;
  const rightLogo = form.homeAway === "home" ? assets.opponentLogo : assets.clubLogo;
  const leftScore = form.homeAway === "home" ? form.clubScore : form.opponentScore;
  const rightScore = form.homeAway === "home" ? form.opponentScore : form.clubScore;

  context.textBaseline = "alphabetic";
  context.textAlign = "left";
  context.fillStyle = "rgba(255,255,255,.72)";
  context.font = `700 ${Math.round(width * (isLandscape ? 0.013 : 0.026))}px Arial, Helvetica, sans-serif`;
  context.fillText(`${form.competition}  ·  ${form.round}`.toUpperCase(), safe, safe * 1.12);

  context.fillStyle = "#ffffff";
  const headlineSize = isLandscape ? width * 0.062 : width * (isStory ? 0.11 : 0.095);
  context.font = `900 ${headlineSize}px Arial, Helvetica, sans-serif`;
  context.fillText((form.headline || (type === "matchday" ? "MATCHDAY" : "FULL TIME")).toUpperCase(), safe, safe * 2.45);

  if (isLandscape) {
    const badgeSize = height * 0.28;
    const badgeY = height * 0.49;
    drawBadge(context, leftLogo, width * 0.54, badgeY, badgeSize, leftName);
    drawBadge(context, rightLogo, width * 0.78, badgeY, badgeSize, rightName);

    context.textAlign = "center";
    context.fillStyle = "#ffffff";
    if (type === "result") {
      context.font = `900 ${height * 0.19}px Arial, Helvetica, sans-serif`;
      context.fillText(`${leftScore}:${rightScore}`, width * 0.66, height * 0.56);
    } else {
      context.font = `900 ${height * 0.075}px Arial, Helvetica, sans-serif`;
      context.fillText(form.time || "--:--", width * 0.66, height * 0.5);
      context.fillStyle = "rgba(255,255,255,.72)";
      context.font = `700 ${height * 0.029}px Arial, Helvetica, sans-serif`;
      context.fillText(formatDate(form.date), width * 0.66, height * 0.57);
    }

    const nameWidth = width * 0.19;
    context.fillStyle = "#ffffff";
    const leftSize = fitFont(context, leftName.toUpperCase(), nameWidth, height * 0.046, height * 0.027);
    context.font = `800 ${leftSize}px Arial, Helvetica, sans-serif`;
    context.fillText(leftName.toUpperCase(), width * 0.54, height * 0.75);
    const rightSize = fitFont(context, rightName.toUpperCase(), nameWidth, height * 0.046, height * 0.027);
    context.font = `800 ${rightSize}px Arial, Helvetica, sans-serif`;
    context.fillText(rightName.toUpperCase(), width * 0.78, height * 0.75);

    context.textAlign = "left";
    context.fillStyle = "rgba(255,255,255,.8)";
    context.font = `700 ${height * 0.034}px Arial, Helvetica, sans-serif`;
    context.fillText(type === "result" ? `HALBZEIT ${form.halfTime || "–"}` : form.venue, safe, height - safe * 0.85);
  } else {
    const badgeSize = width * (isStory ? 0.28 : 0.245);
    const badgeY = height * (isStory ? 0.405 : 0.43);
    const leftX = width * 0.27;
    const rightX = width * 0.73;
    drawBadge(context, leftLogo, leftX, badgeY, badgeSize, leftName);
    drawBadge(context, rightLogo, rightX, badgeY, badgeSize, rightName);

    context.textAlign = "center";
    context.fillStyle = "#ffffff";
    if (type === "result") {
      context.font = `900 ${width * 0.16}px Arial, Helvetica, sans-serif`;
      context.fillText(`${leftScore}:${rightScore}`, width / 2, badgeY + width * 0.035);
    } else {
      context.font = `900 ${width * 0.064}px Arial, Helvetica, sans-serif`;
      context.fillText(form.time || "--:--", width / 2, badgeY + width * 0.012);
      context.fillStyle = "rgba(255,255,255,.72)";
      context.font = `700 ${width * 0.025}px Arial, Helvetica, sans-serif`;
      context.fillText(formatDate(form.date), width / 2, badgeY + width * 0.065);
    }

    const nameY = badgeY + badgeSize * 0.78;
    const nameWidth = width * 0.38;
    context.fillStyle = "#ffffff";
    const leftSize = fitFont(context, leftName.toUpperCase(), nameWidth, width * 0.042, width * 0.024);
    context.font = `800 ${leftSize}px Arial, Helvetica, sans-serif`;
    context.fillText(leftName.toUpperCase(), leftX, nameY);
    const rightSize = fitFont(context, rightName.toUpperCase(), nameWidth, width * 0.042, width * 0.024);
    context.font = `800 ${rightSize}px Arial, Helvetica, sans-serif`;
    context.fillText(rightName.toUpperCase(), rightX, nameY);

    const infoY = height * (isStory ? 0.69 : 0.72);
    context.fillStyle = "rgba(255,255,255,.1)";
    const boxHeight = height * (isStory ? 0.095 : 0.11);
    context.fillRect(safe, infoY - boxHeight * 0.55, width - safe * 2, boxHeight);
    context.fillStyle = "#ffffff";
    context.font = `800 ${width * 0.035}px Arial, Helvetica, sans-serif`;
    context.fillText(
      type === "result" ? `HALBZEIT ${form.halfTime || "–"}` : formatDate(form.date),
      width / 2,
      infoY,
    );
    context.fillStyle = "rgba(255,255,255,.72)";
    context.font = `700 ${width * 0.024}px Arial, Helvetica, sans-serif`;
    context.fillText(type === "result" ? form.round : form.venue, width / 2, infoY + width * 0.047);
  }

  context.textAlign = "center";
  context.fillStyle = "rgba(255,255,255,.72)";
  context.font = `700 ${Math.max(18, width * (isLandscape ? 0.014 : 0.024))}px Arial, Helvetica, sans-serif`;
  context.fillText((form.footer || "GEMEINSAM FÜR DEN SVB").toUpperCase(), width / 2, height - safe * 0.7);
}

function UploadField({
  id,
  label,
  image,
  onChange,
  onRemove,
}: {
  id: string;
  label: string;
  image: HTMLImageElement | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="upload-field">
      <span className="field-label">{label}</span>
      <label className={`upload-box ${image ? "has-file" : ""}`} htmlFor={id}>
        <span className="upload-mark" aria-hidden="true">{image ? "✓" : "+"}</span>
        <span>{image ? "Bild ausgewählt" : "Bild auswählen"}</span>
        <input id={id} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onChange} />
      </label>
      {image && (
        <button className="text-button" type="button" onClick={onRemove}>
          Bild entfernen
        </button>
      )}
    </div>
  );
}

export default function Home() {
  const appShellRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [postType, setPostType] = useState<PostType>("matchday");
  const [formatKey, setFormatKey] = useState<FormatKey>("post");
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [assets, setAssets] = useState<Assets>({ clubLogo: null, opponentLogo: null, background: null });
  const [downloadStatus, setDownloadStatus] = useState("");

  useEffect(() => {
    if (canvasRef.current) renderGraphic(canvasRef.current, formatKey, postType, form, assets);
  }, [formatKey, postType, form, assets]);

  useEffect(() => {
    const appShell = appShellRef.current;
    if (!appShell || window.parent === window) return;

    let animationFrame = 0;

    function reportHeight() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const height = Math.ceil(appShell.getBoundingClientRect().bottom);
        window.parent.postMessage(
          { type: "svb-generator-height", height },
          "https://fussball.sportverein-bergheim.de",
        );
      });
    }

    const resizeObserver = new ResizeObserver(reportHeight);
    resizeObserver.observe(appShell);
    window.addEventListener("resize", reportHeight);
    void document.fonts?.ready.then(reportHeight);
    reportHeight();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", reportHeight);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  const selectedFormat = FORMATS[formatKey];
  const textWarning = useMemo(
    () => form.clubName.length > 28 || form.opponentName.length > 28,
    [form.clubName, form.opponentName],
  );

  function updateForm<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function chooseType(type: PostType) {
    setPostType(type);
    setForm((current) => ({
      ...current,
      headline: type === "matchday" ? "MATCHDAY" : "FULL TIME",
    }));
  }

  function loadAsset(key: keyof Assets) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        setAssets((current) => ({ ...current, [key]: image }));
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        setDownloadStatus("Dieses Bildformat konnte nicht gelesen werden.");
      };
      image.src = url;
      event.target.value = "";
    };
  }

  function fileName(key: FormatKey) {
    return `svb-${postType === "matchday" ? "spieltag" : "ergebnis"}-${slugify(form.opponentName) || "gegner"}-${key}.png`;
  }

  function downloadCanvas(canvas: HTMLCanvasElement, key: FormatKey) {
    return new Promise<void>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          setDownloadStatus("Das Bild konnte nicht erstellt werden.");
          resolve();
          return;
        }
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName(key);
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve();
      }, "image/png");
    });
  }

  async function downloadSelected() {
    if (!canvasRef.current) return;
    setDownloadStatus("PNG wird erstellt …");
    await downloadCanvas(canvasRef.current, formatKey);
    setDownloadStatus("PNG wurde erstellt.");
  }

  async function downloadAll() {
    setDownloadStatus("Vier Formate werden erstellt …");
    for (const key of Object.keys(FORMATS) as FormatKey[]) {
      const canvas = document.createElement("canvas");
      renderGraphic(canvas, key, postType, form, assets);
      await downloadCanvas(canvas, key);
    }
    setDownloadStatus("Alle vier Formate wurden erstellt.");
  }

  function resetForm() {
    setForm({ ...INITIAL_FORM, headline: postType === "matchday" ? "MATCHDAY" : "FULL TIME" });
    setAssets({ clubLogo: null, opponentLogo: null, background: null });
    setDownloadStatus("Eingaben wurden zurückgesetzt.");
  }

  return (
    <main ref={appShellRef} className="app-shell">
      <section className="selector-card" aria-label="Grafik auswählen">
        <div className="selector-group">
          <span className="selector-label">Beitrag</span>
          <div className="segmented-control">
            <button type="button" className={postType === "matchday" ? "active" : ""} onClick={() => chooseType("matchday")}>Spieltagsankündigung</button>
            <button type="button" className={postType === "result" ? "active" : ""} onClick={() => chooseType("result")}>Ergebnismeldung</button>
          </div>
        </div>
        <div className="selector-group format-selector">
          <span className="selector-label">Format</span>
          <div className="format-options">
            {(Object.keys(FORMATS) as FormatKey[]).map((key) => (
              <button key={key} type="button" className={formatKey === key ? "active" : ""} onClick={() => setFormatKey(key)}>
                <span>{FORMATS[key].label}</span>
                <small>{FORMATS[key].short}</small>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="studio-grid">
        <section className="preview-column" aria-labelledby="preview-title">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Live-Vorschau</p>
              <h2 id="preview-title">{selectedFormat.label}</h2>
            </div>
            <span>{selectedFormat.width} × {selectedFormat.height} px</span>
          </div>
          <div className={`canvas-stage canvas-${formatKey}`}>
            <canvas ref={canvasRef} aria-label={`Vorschau für ${selectedFormat.label}`} />
          </div>
          <div className="preview-actions">
            <button className="primary-button" type="button" onClick={downloadSelected}>PNG herunterladen</button>
            <button className="secondary-button" type="button" onClick={downloadAll}>Alle 4 Formate</button>
          </div>
          <p className="status-message" aria-live="polite">{downloadStatus || "Keine Datei wird hochgeladen oder gespeichert."}</p>
        </section>

        <section className="form-column" aria-labelledby="details-title">
          <div className="panel-heading form-heading">
            <div>
              <p className="section-kicker">Inhalte</p>
              <h2 id="details-title">Spieldaten bearbeiten</h2>
            </div>
            <button className="text-button reset-button" type="button" onClick={resetForm}>Zurücksetzen</button>
          </div>

          <div className="form-section">
            <h3>Mannschaften</h3>
            <div className="field-grid">
              <label>
                <span className="field-label">Vereinsname</span>
                <input value={form.clubName} maxLength={40} onChange={(event) => updateForm("clubName", event.target.value)} />
              </label>
              <label>
                <span className="field-label">Gegner</span>
                <input value={form.opponentName} maxLength={40} onChange={(event) => updateForm("opponentName", event.target.value)} />
              </label>
            </div>
            {textWarning && <p className="input-warning">Sehr lange Vereinsnamen werden in der Grafik automatisch verkleinert.</p>}
            <div className="field-block">
              <span className="field-label">Heim / Auswärts</span>
              <div className="segmented-control compact">
                <button type="button" className={form.homeAway === "home" ? "active" : ""} onClick={() => updateForm("homeAway", "home")}>Heim</button>
                <button type="button" className={form.homeAway === "away" ? "active" : ""} onClick={() => updateForm("homeAway", "away")}>Auswärts</button>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Spielinformationen</h3>
            <div className="field-grid">
              <label>
                <span className="field-label">Wettbewerb</span>
                <input value={form.competition} maxLength={45} onChange={(event) => updateForm("competition", event.target.value)} />
              </label>
              <label>
                <span className="field-label">Spieltag</span>
                <input value={form.round} maxLength={24} onChange={(event) => updateForm("round", event.target.value)} />
              </label>
              <label>
                <span className="field-label">Datum</span>
                <input type="date" value={form.date} onChange={(event) => updateForm("date", event.target.value)} />
              </label>
              <label>
                <span className="field-label">Anstoß</span>
                <input type="time" value={form.time} onChange={(event) => updateForm("time", event.target.value)} />
              </label>
            </div>
            <label className="field-block">
              <span className="field-label">Spielort</span>
              <input value={form.venue} maxLength={45} onChange={(event) => updateForm("venue", event.target.value)} />
            </label>
          </div>

          {postType === "result" && (
            <div className="form-section">
              <h3>Ergebnis</h3>
              <div className="score-grid">
                <label>
                  <span className="field-label">Tore {form.clubName}</span>
                  <input inputMode="numeric" value={form.clubScore} maxLength={2} onChange={(event) => updateForm("clubScore", event.target.value.replace(/\D/g, ""))} />
                </label>
                <span aria-hidden="true">:</span>
                <label>
                  <span className="field-label">Tore Gegner</span>
                  <input inputMode="numeric" value={form.opponentScore} maxLength={2} onChange={(event) => updateForm("opponentScore", event.target.value.replace(/\D/g, ""))} />
                </label>
              </div>
              <label className="field-block">
                <span className="field-label">Halbzeitstand (optional)</span>
                <input value={form.halfTime} maxLength={8} onChange={(event) => updateForm("halfTime", event.target.value)} />
              </label>
            </div>
          )}

          <div className="form-section">
            <h3>Texte</h3>
            <div className="field-grid">
              <label>
                <span className="field-label">Headline</span>
                <input value={form.headline} maxLength={24} onChange={(event) => updateForm("headline", event.target.value)} />
              </label>
              <label>
                <span className="field-label">Untere Zeile</span>
                <input value={form.footer} maxLength={40} onChange={(event) => updateForm("footer", event.target.value)} />
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3>Bilder</h3>
            <div className="upload-grid">
              <UploadField id="club-logo" label="Vereinslogo" image={assets.clubLogo} onChange={loadAsset("clubLogo")} onRemove={() => setAssets((current) => ({ ...current, clubLogo: null }))} />
              <UploadField id="opponent-logo" label="Gegnerlogo" image={assets.opponentLogo} onChange={loadAsset("opponentLogo")} onRemove={() => setAssets((current) => ({ ...current, opponentLogo: null }))} />
              <UploadField id="background" label="Hintergrundfoto (optional)" image={assets.background} onChange={loadAsset("background")} onRemove={() => setAssets((current) => ({ ...current, background: null }))} />
            </div>
            {assets.background && (
              <div className="range-grid">
                <label>
                  <span className="field-label">Foto-Zoom</span>
                  <input type="range" min="1" max="2.5" step="0.05" value={form.imageZoom} onChange={(event) => updateForm("imageZoom", Number(event.target.value))} />
                </label>
                <label>
                  <span className="field-label">Bildausschnitt</span>
                  <input type="range" min="-100" max="100" step="1" value={form.imageFocusY} onChange={(event) => updateForm("imageFocusY", Number(event.target.value))} />
                </label>
              </div>
            )}
            <p className="helper-text">PNG, JPG, WebP oder SVG. Die Dateien werden nur in dieser Browser-Sitzung verwendet.</p>
          </div>

          <div className="mobile-download">
            <button className="primary-button" type="button" onClick={downloadSelected}>PNG herunterladen</button>
          </div>
        </section>
      </div>
    </main>
  );
}
