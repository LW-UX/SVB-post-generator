"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type PostType = "matchday" | "result";
type FormatKey = "post" | "story" | "landscape" | "widescreen";
type HomeAway = "home" | "away";
type TeamDesign = "first" | "second";

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
};

type Assets = {
  clubLogo: HTMLImageElement | null;
  opponentLogo: HTMLImageElement | null;
};

const FORMATS: Record<
  FormatKey,
  { label: string; short: string; width: number; height: number }
> = {
  post: { label: "Instagram Post", short: "4:5", width: 1080, height: 1350 },
  story: { label: "Instagram Story", short: "9:16", width: 1080, height: 1920 },
  landscape: { label: "Querformat", short: "3:2", width: 1200, height: 800 },
  widescreen: { label: "16:9 Querformat", short: "16:9", width: 1920, height: 1080 },
};

const EXPORT_SCALE = 2;

const EMBED_ORIGINS = [
  "https://fussball.sportverein-bergheim.de",
  "https://www.sportverein-bergheim.de",
];

const TEAM_DESIGNS: Record<TeamDesign, { label: string; clubName: string }> = {
  first: { label: "1. Mannschaft", clubName: "SV Bergheim" },
  second: { label: "2. Mannschaft", clubName: "SV Bergheim II" },
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

function createAngledGradient(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  degrees: number,
) {
  const angle = ((degrees - 90) * Math.PI) / 180;
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  const length = Math.abs(width * directionX) + Math.abs(height * directionY);
  const centerX = width / 2;
  const centerY = height / 2;

  return context.createLinearGradient(
    centerX - (directionX * length) / 2,
    centerY - (directionY * length) / 2,
    centerX + (directionX * length) / 2,
    centerY + (directionY * length) / 2,
  );
}

function drawBadge(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  centerX: number,
  centerY: number,
  size: number,
  fallback: string,
  isBrand: boolean,
  inkColor: string,
) {
  context.save();

  if (!isBrand) {
    context.beginPath();
    context.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
    context.fillStyle = "rgba(255,255,255,.96)";
    context.shadowColor = "rgba(0, 0, 0, .18)";
    context.shadowBlur = size * 0.1;
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = "rgba(0, 68, 138, .16)";
    context.lineWidth = Math.max(2, size * 0.012);
    context.stroke();
    context.clip();
  }

  if (image) {
    const padding = size * (isBrand ? 0.02 : 0.14);
    const maxWidth = size - padding * 2;
    const maxHeight = size - padding * 2;
    const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, centerX - width / 2, centerY - height / 2, width, height);
  } else {
    context.fillStyle = isBrand ? inkColor : "#00448a";
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
  teamDesign: TeamDesign,
  scale = 1,
) {
  const format = FORMATS[formatKey];
  canvas.width = format.width * scale;
  canvas.height = format.height * scale;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.scale(scale, scale);

  const width = format.width;
  const height = format.height;
  const isStory = formatKey === "story";
  const isLandscape = height / width < 0.7;
  const safe = width * (isLandscape ? 0.055 : 0.065);
  const isFirstTeam = teamDesign === "first";
  const inkColor = isFirstTeam ? "#ffffff" : "#00448a";
  const mutedInkColor = isFirstTeam ? "rgba(255,255,255,.72)" : "rgba(0,68,138,.68)";
  const strongMutedInkColor = isFirstTeam ? "rgba(255,255,255,.8)" : "rgba(0,68,138,.8)";
  const infoSurface = isFirstTeam ? "rgba(255,255,255,.1)" : "#edf4fa";

  const gradient = createAngledGradient(context, width, height, 52);
  gradient.addColorStop(0, "#003076");
  gradient.addColorStop(1, "#14589e");
  context.fillStyle = isFirstTeam ? gradient : "#ffffff";
  context.fillRect(0, 0, width, height);

  const leftName = form.homeAway === "home" ? form.clubName : form.opponentName;
  const rightName = form.homeAway === "home" ? form.opponentName : form.clubName;
  const leftLogo = form.homeAway === "home" ? assets.clubLogo : assets.opponentLogo;
  const rightLogo = form.homeAway === "home" ? assets.opponentLogo : assets.clubLogo;
  const leftScore = form.homeAway === "home" ? form.clubScore : form.opponentScore;
  const rightScore = form.homeAway === "home" ? form.opponentScore : form.clubScore;
  const leftIsBrand = form.homeAway === "home";
  const rightIsBrand = form.homeAway === "away";

  context.textBaseline = "alphabetic";
  context.textAlign = "left";
  context.fillStyle = mutedInkColor;
  context.font = `700 ${Math.round(width * (isLandscape ? 0.013 : 0.026))}px Arial, Helvetica, sans-serif`;
  context.fillText(`${form.competition}  ·  ${form.round}`.toUpperCase(), safe, safe * 1.12);

  context.fillStyle = inkColor;
  const headlineSize = isLandscape ? width * 0.062 : width * (isStory ? 0.11 : 0.095);
  context.font = `900 ${headlineSize}px Arial, Helvetica, sans-serif`;
  context.fillText((form.headline || (type === "matchday" ? "MATCHDAY" : "FULL TIME")).toUpperCase(), safe, safe * 2.45);

  if (isLandscape) {
    const badgeSize = height * 0.28;
    const badgeY = height * 0.49;
    drawBadge(context, leftLogo, width * 0.54, badgeY, badgeSize, leftName, leftIsBrand, inkColor);
    drawBadge(context, rightLogo, width * 0.78, badgeY, badgeSize, rightName, rightIsBrand, inkColor);

    context.textAlign = "center";
    context.fillStyle = inkColor;
    if (type === "result") {
      context.font = `900 ${height * 0.19}px Arial, Helvetica, sans-serif`;
      context.fillText(`${leftScore}:${rightScore}`, width * 0.66, height * 0.56);
    } else {
      context.font = `900 ${height * 0.075}px Arial, Helvetica, sans-serif`;
      context.fillText(form.time || "--:--", width * 0.66, height * 0.5);
      context.fillStyle = mutedInkColor;
      context.font = `700 ${height * 0.029}px Arial, Helvetica, sans-serif`;
      context.fillText(formatDate(form.date), width * 0.66, height * 0.57);
    }

    const nameWidth = width * 0.19;
    context.fillStyle = inkColor;
    const leftSize = fitFont(context, leftName.toUpperCase(), nameWidth, height * 0.046, height * 0.027);
    context.font = `800 ${leftSize}px Arial, Helvetica, sans-serif`;
    context.fillText(leftName.toUpperCase(), width * 0.54, height * 0.75);
    const rightSize = fitFont(context, rightName.toUpperCase(), nameWidth, height * 0.046, height * 0.027);
    context.font = `800 ${rightSize}px Arial, Helvetica, sans-serif`;
    context.fillText(rightName.toUpperCase(), width * 0.78, height * 0.75);

    context.textAlign = "left";
    context.fillStyle = strongMutedInkColor;
    context.font = `700 ${height * 0.034}px Arial, Helvetica, sans-serif`;
    context.fillText(type === "result" ? `HALBZEIT ${form.halfTime || "–"}` : form.venue, safe, height - safe * 0.85);
  } else {
    const badgeSize = width * (isStory ? 0.28 : 0.245);
    const badgeY = height * (isStory ? 0.405 : 0.43);
    const leftX = width * 0.27;
    const rightX = width * 0.73;
    drawBadge(context, leftLogo, leftX, badgeY, badgeSize, leftName, leftIsBrand, inkColor);
    drawBadge(context, rightLogo, rightX, badgeY, badgeSize, rightName, rightIsBrand, inkColor);

    context.textAlign = "center";
    context.fillStyle = inkColor;
    if (type === "result") {
      context.font = `900 ${width * 0.16}px Arial, Helvetica, sans-serif`;
      context.fillText(`${leftScore}:${rightScore}`, width / 2, badgeY + width * 0.035);
    } else {
      context.font = `900 ${width * 0.064}px Arial, Helvetica, sans-serif`;
      context.fillText(form.time || "--:--", width / 2, badgeY + width * 0.012);
      context.fillStyle = mutedInkColor;
      context.font = `700 ${width * 0.025}px Arial, Helvetica, sans-serif`;
      context.fillText(formatDate(form.date), width / 2, badgeY + width * 0.065);
    }

    const nameY = badgeY + badgeSize * 0.78;
    const nameWidth = width * 0.38;
    context.fillStyle = inkColor;
    const leftSize = fitFont(context, leftName.toUpperCase(), nameWidth, width * 0.042, width * 0.024);
    context.font = `800 ${leftSize}px Arial, Helvetica, sans-serif`;
    context.fillText(leftName.toUpperCase(), leftX, nameY);
    const rightSize = fitFont(context, rightName.toUpperCase(), nameWidth, width * 0.042, width * 0.024);
    context.font = `800 ${rightSize}px Arial, Helvetica, sans-serif`;
    context.fillText(rightName.toUpperCase(), rightX, nameY);

    const infoY = height * (isStory ? 0.69 : 0.72);
    context.fillStyle = infoSurface;
    const boxHeight = height * (isStory ? 0.095 : 0.11);
    context.fillRect(safe, infoY - boxHeight * 0.55, width - safe * 2, boxHeight);
    context.fillStyle = inkColor;
    context.font = `800 ${width * 0.035}px Arial, Helvetica, sans-serif`;
    context.fillText(
      type === "result" ? `HALBZEIT ${form.halfTime || "–"}` : formatDate(form.date),
      width / 2,
      infoY,
    );
    context.fillStyle = mutedInkColor;
    context.font = `700 ${width * 0.024}px Arial, Helvetica, sans-serif`;
    context.fillText(type === "result" ? form.round : form.venue, width / 2, infoY + width * 0.047);
  }

  context.textAlign = "center";
  context.fillStyle = mutedInkColor;
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
  const [teamDesign, setTeamDesign] = useState<TeamDesign>("first");
  const [formatKey, setFormatKey] = useState<FormatKey>("post");
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [assets, setAssets] = useState<Assets>({ clubLogo: null, opponentLogo: null });
  const [downloadStatus, setDownloadStatus] = useState("");

  useEffect(() => {
    if (canvasRef.current) {
      renderGraphic(canvasRef.current, formatKey, postType, form, assets, teamDesign);
    }
  }, [formatKey, postType, form, assets, teamDesign]);

  useEffect(() => {
    const image = new Image();
    const fileName = teamDesign === "first"
      ? "svb-logo-weiss-1906.svg"
      : "svb-logo-blau-1906.svg";

    image.onload = () => {
      setAssets((current) => ({ ...current, clubLogo: image }));
    };
    image.onerror = () => {
      setDownloadStatus("Das SVB-Vereinslogo konnte nicht geladen werden.");
    };
    image.src = new URL(`./assets/${fileName}`, window.location.href).href;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [teamDesign]);

  useEffect(() => {
    const appShell = appShellRef.current;
    if (!appShell || window.parent === window) return;

    let animationFrame = 0;

    function reportHeight() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const height = Math.ceil(appShell.getBoundingClientRect().bottom);
        for (const origin of EMBED_ORIGINS) {
          window.parent.postMessage(
            { type: "svb-generator-height", height },
            origin,
          );
        }
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

  function chooseTeamDesign(design: TeamDesign) {
    setTeamDesign(design);
    setForm((current) => ({
      ...current,
      clubName: TEAM_DESIGNS[design].clubName,
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
    setDownloadStatus("PNG in 2× wird erstellt …");
    const canvas = document.createElement("canvas");
    renderGraphic(canvas, formatKey, postType, form, assets, teamDesign, EXPORT_SCALE);
    await downloadCanvas(canvas, formatKey);
    setDownloadStatus("PNG in 2× wurde erstellt.");
  }

  async function downloadAll() {
    setDownloadStatus("Vier Formate werden erstellt …");
    for (const key of Object.keys(FORMATS) as FormatKey[]) {
      const canvas = document.createElement("canvas");
      renderGraphic(canvas, key, postType, form, assets, teamDesign, EXPORT_SCALE);
      await downloadCanvas(canvas, key);
    }
    setDownloadStatus("Alle vier Formate wurden erstellt.");
  }

  function resetForm() {
    setForm({
      ...INITIAL_FORM,
      clubName: TEAM_DESIGNS[teamDesign].clubName,
      headline: postType === "matchday" ? "MATCHDAY" : "FULL TIME",
    });
    setAssets((current) => ({ ...current, opponentLogo: null }));
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
        <div className="selector-group">
          <span className="selector-label">Mannschaft</span>
          <div className="segmented-control" role="group" aria-label="Mannschaft auswählen">
            {(Object.keys(TEAM_DESIGNS) as TeamDesign[]).map((design) => (
              <button
                key={design}
                type="button"
                className={teamDesign === design ? "active" : ""}
                aria-pressed={teamDesign === design}
                onClick={() => chooseTeamDesign(design)}
              >
                {TEAM_DESIGNS[design].label}
              </button>
            ))}
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
            <span>
              Export {selectedFormat.width * EXPORT_SCALE} × {selectedFormat.height * EXPORT_SCALE} px
            </span>
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
              <UploadField id="opponent-logo" label="Gegnerlogo" image={assets.opponentLogo} onChange={loadAsset("opponentLogo")} onRemove={() => setAssets((current) => ({ ...current, opponentLogo: null }))} />
            </div>
            <p className="helper-text">Das SVB-Logo und das Mannschaftsdesign werden automatisch gewählt. Das Gegnerlogo bleibt nur in dieser Browser-Sitzung.</p>
          </div>

          <div className="mobile-download">
            <button className="primary-button" type="button" onClick={downloadSelected}>PNG herunterladen</button>
          </div>
        </section>
      </div>
    </main>
  );
}
