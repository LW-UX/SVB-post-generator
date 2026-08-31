import type { ChangeEvent, KeyboardEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import ImageEditorDialog from "./ImageEditorDialog";
import {
  cloneEditableBackground,
  drawEditableBackground,
  loadEditableBackground,
} from "./image-editor";
import type { BackgroundFormatKey, EditableBackgroundImage } from "./image-editor";
import {
  findFixture,
  getFixtureEditableValues,
} from "./fixtures";
import { getClubByLogoId } from "./club-database";
import type {
  FixtureEditableValues,
  FixtureHomeAway,
  FixtureOverrides,
} from "./fixtures";

type PostType = "matchday" | "result";
type FormatKey = BackgroundFormatKey;
type HomeAway = "home" | "away";
type TeamDesign = "first" | "second";
type MatchdayDesign = "classic" | "photo";
type PhotoEdge = "top" | "bottom";
type DateDisplay = "date-time" | "day-date" | "custom";
type ExportAction = "shared" | "downloaded" | "cancelled";
type Department = "football" | "general";
type AnnouncementPageCount = 1 | 2;
type AnnouncementPage = 1 | 2;

type OpponentCatalogEntry = {
  id: string;
  clubId?: string;
  name: string;
  searchVariants: string[];
  src: string;
};

type FormState = {
  clubName: string;
  opponentName: string;
  competition: string;
  competitionRegion: string;
  round: string;
  date: string;
  time: string;
  dateDisplay: DateDisplay;
  customDateUpperLine: string;
  customDateLargeLine: string;
  venue: string;
  venueAddress: string;
  headline: string;
  clubScore: string;
  opponentScore: string;
  halfTime: string;
  footer: string;
  homeAway: HomeAway;
};

function isFixtureEditableKey(
  key: keyof FormState,
): key is keyof FixtureEditableValues {
  return key === "opponentName" ||
    key === "round" ||
    key === "date" ||
    key === "time" ||
    key === "venue" ||
    key === "venueAddress";
}

type Assets = {
  clubLogo: HTMLImageElement | null;
  colorClubLogo: HTMLImageElement | null;
  opponentLogo: HTMLImageElement | null;
  matchdayWordmark: HTMLImageElement | null;
  backgroundImage: EditableBackgroundImage | null;
};

type PhotoMatchdayState = {
  edge: PhotoEdge;
  textPosition: number;
};

const OPPONENT_LOGO_FILES = import.meta.glob<string>(
  "./assets/opponents/*.png",
  { eager: true, query: "?url", import: "default" },
);

function germanTransliteration(value: string) {
  return value
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss");
}

function basicSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ß", "ss")
    .toLocaleLowerCase("de")
    .trim();
}

function createSearchVariants(value: string) {
  const normalized = value.normalize("NFC").toLocaleLowerCase("de").trim();
  return Array.from(new Set([
    normalized,
    basicSearchValue(normalized),
    germanTransliteration(normalized),
  ]));
}

function createOpponentCatalog(): OpponentCatalogEntry[] {
  return Object.entries(OPPONENT_LOGO_FILES)
    .map(([path, src]) => {
      const fileName = path.split("/").at(-1) ?? path;
      const name = fileName.replace(/\.png$/i, "").normalize("NFC");
      const id = germanTransliteration(basicSearchValue(name))
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const club = getClubByLogoId(id);
      const displayName = club?.name ?? name;
      return {
        id,
        clubId: club?.id,
        name: displayName,
        searchVariants: Array.from(new Set([
          ...createSearchVariants(displayName),
          ...createSearchVariants(name),
        ])),
        src,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "de", { sensitivity: "base" }));
}

const OPPONENT_CATALOG = createOpponentCatalog();

type AnnouncementFormState = {
  title: string;
  subtitleBold: string;
  subtitleLight: string;
  secondHeadline: string;
  body: string;
  disclaimer: string;
};

const FORMATS: Record<
  FormatKey,
  { label: string; short: string; width: number; height: number; exportScale: 1 | 2 }
> = {
  post: { label: "Instagram Post", short: "4:5", width: 1080, height: 1350, exportScale: 2 },
  story: { label: "Instagram Story", short: "9:16", width: 1080, height: 1920, exportScale: 2 },
  landscape: { label: "Querformat", short: "3:2", width: 1500, height: 1000, exportScale: 1 },
  widescreen: { label: "16:9 Querformat", short: "16:9", width: 1920, height: 1080, exportScale: 1 },
};

const RESULT_POST_FORMAT = {
  label: "Instagram Post",
  short: "4:5",
  width: 1080,
  height: 1350,
  exportScale: 2 as const,
};

const FORMAT_FILE_NAMES: Record<FormatKey, string> = {
  post: "Post",
  story: "Story",
  landscape: "Querformat",
  widescreen: "16-9",
};

const EMBED_ORIGINS = [
  "https://fussball.sportverein-bergheim.de",
  "https://www.sportverein-bergheim.de",
];

const MATCHDAY_ANGLE_DEGREES = 52;

const TEAM_DESIGNS: Record<
  TeamDesign,
  { label: string; clubName: string; competition: string; competitionRegion: string }
> = {
  first: {
    label: "1. Mannschaft",
    clubName: "SV Bergheim",
    competition: "Kreisklasse",
    competitionRegion: "Augsburg Süd",
  },
  second: {
    label: "2. Mannschaft",
    clubName: "SV Bergheim II",
    competition: "A-Klasse",
    competitionRegion: "Augsburg Mitte",
  },
};

const INITIAL_FORM: FormState = {
  clubName: "SV Bergheim",
  opponentName: "TSV Schwabmünchen II",
  competition: "Kreisklasse",
  competitionRegion: "Augsburg Süd",
  round: "1. Spieltag",
  date: "2026-08-16",
  time: "15:00",
  dateDisplay: "date-time",
  customDateUpperLine: "",
  customDateLargeLine: "",
  venue: "Mößmann Sportanlage Hauptfeld",
  venueAddress: "Am Langen Berg 5, 86199 Augsburg",
  headline: "MATCHDAY",
  clubScore: "2",
  opponentScore: "0",
  halfTime: "1:0",
  footer: "",
  homeAway: "home",
};

const INITIAL_PHOTO_MATCHDAY_STATE: PhotoMatchdayState = {
  edge: "top",
  textPosition: 50,
};

const INITIAL_ANNOUNCEMENT_FORM: AnnouncementFormState = {
  title: "",
  subtitleBold: "",
  subtitleLight: "",
  secondHeadline: "",
  body: "",
  disclaimer: "",
};

const ANNOUNCEMENT_PLACEHOLDERS = {
  title: "Überschrift",
  subtitleBold: "Untere Zeile Bold",
  subtitleLight: "Untere Zeile Light",
  secondHeadline: "Überschrift",
  body: "Fließtext kann auch lange sein und mit mehreren Absätzen beginnen. Aber der Text ist immer zentriert auf der Seite. Der Text wächst also aus der Mitte heraus nach oben.",
};

const ANNOUNCEMENT_FIELD_PLACEHOLDERS = {
  subtitleBold: "z.B.: Datum",
  subtitleLight: "z.B.: Ort",
};

type AnnouncementTitleLayout = {
  cornerTopX: number;
  logoX: number;
  logoY: number;
  logoMaxWidth: number;
  logoMaxHeight: number;
  titleX: number;
  titleTopY: number;
  titleMaxWidth: number;
  lowerX: number;
  lowerBoldY: number;
  lowerLightY: number;
  lowerMaxWidth: number;
};

const ANNOUNCEMENT_TITLE_LAYOUTS: Record<FormatKey, AnnouncementTitleLayout> = {
  post: {
    cornerTopX: 0.27,
    logoX: 0.5,
    logoY: 0.36,
    logoMaxWidth: 0.19,
    logoMaxHeight: 0.235,
    titleX: 0.5,
    titleTopY: 0.505,
    titleMaxWidth: 0.94,
    lowerX: 0.5,
    lowerBoldY: 0.797,
    lowerLightY: 0.842,
    lowerMaxWidth: 0.86,
  },
  story: {
    cornerTopX: 0.18,
    logoX: 0.5,
    logoY: 0.31,
    logoMaxWidth: 0.2,
    logoMaxHeight: 0.19,
    titleX: 0.5,
    titleTopY: 0.47,
    titleMaxWidth: 0.9,
    lowerX: 0.5,
    lowerBoldY: 0.79,
    lowerLightY: 0.83,
    lowerMaxWidth: 0.84,
  },
  landscape: {
    cornerTopX: 0.21,
    logoX: 0.5,
    logoY: 0.26,
    logoMaxWidth: 0.14,
    logoMaxHeight: 0.25,
    titleX: 0.5,
    titleTopY: 0.43,
    titleMaxWidth: 0.82,
    lowerX: 0.5,
    lowerBoldY: 0.74,
    lowerLightY: 0.8,
    lowerMaxWidth: 0.76,
  },
  widescreen: {
    cornerTopX: 0.17,
    logoX: 0.5,
    logoY: 0.24,
    logoMaxWidth: 0.12,
    logoMaxHeight: 0.27,
    titleX: 0.5,
    titleTopY: 0.42,
    titleMaxWidth: 0.78,
    lowerX: 0.5,
    lowerBoldY: 0.72,
    lowerLightY: 0.79,
    lowerMaxWidth: 0.7,
  },
};

type MatchdayLayout = {
  cornerTopX: number;
  bottomCornerStartX?: number;
  bottomCornerRightY?: number;
  headerX: number;
  roundY: number;
  competitionY: number;
  regionY: number;
  leftLogoX: number;
  rightLogoX: number;
  logoY: number;
  logoMaxWidth: number;
  logoMaxHeight: number;
  largeTextSize?: number;
  smallTextSize?: number;
  versusY?: number;
  dateY: number;
  timeY: number;
  venueY?: number;
  addressY?: number;
};

const MATCHDAY_LAYOUTS: Record<FormatKey, MatchdayLayout> = {
  story: {
    cornerTopX: 0.18,
    headerX: 0.5,
    roundY: 0.214,
    competitionY: 0.274,
    regionY: 0.325,
    leftLogoX: 0.26,
    rightLogoX: 0.74,
    logoY: 0.51,
    logoMaxWidth: 0.34,
    logoMaxHeight: 0.245,
    versusY: 0.52,
    dateY: 0.725,
    timeY: 0.775,
    venueY: 0.86,
    addressY: 0.887,
  },
  post: {
    cornerTopX: 0.27,
    headerX: 0.5,
    roundY: 0.16,
    competitionY: 0.235,
    regionY: 0.295,
    leftLogoX: 0.255,
    rightLogoX: 0.745,
    logoY: 0.49,
    logoMaxWidth: 0.3,
    logoMaxHeight: 0.28,
    versusY: 0.505,
    dateY: 0.69,
    timeY: 0.77,
    venueY: 0.895,
    addressY: 0.93,
  },
  landscape: {
    cornerTopX: 0.21,
    headerX: 0.5,
    roundY: 0.12,
    competitionY: 0.205,
    regionY: 0.3,
    leftLogoX: 0.31,
    rightLogoX: 0.69,
    logoY: 0.55,
    logoMaxWidth: 0.24,
    logoMaxHeight: 0.36,
    versusY: 0.55,
    dateY: 0.77,
    timeY: 0.86,
  },
  widescreen: {
    cornerTopX: 0.17,
    bottomCornerStartX: 0.834375,
    bottomCornerRightY: 0.621778,
    headerX: 0.5,
    roundY: 0.245,
    competitionY: 0.345,
    regionY: 0.42,
    leftLogoX: 0.195,
    rightLogoX: 0.805,
    logoY: 0.455,
    logoMaxWidth: 0.2,
    logoMaxHeight: 0.46,
    dateY: 0.61,
    timeY: 0.71,
    venueY: 0.855,
    addressY: 0.905,
  },
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

const FULL_MONTHS = [
  "JANUAR",
  "FEBRUAR",
  "MÄRZ",
  "APRIL",
  "MAI",
  "JUNI",
  "JULI",
  "AUGUST",
  "SEPTEMBER",
  "OKTOBER",
  "NOVEMBER",
  "DEZEMBER",
];

const PHOTO_MONTHS = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

const WEEKDAYS = [
  "SONNTAG",
  "MONTAG",
  "DIENSTAG",
  "MITTWOCH",
  "DONNERSTAG",
  "FREITAG",
  "SAMSTAG",
];

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value || "DATUM";
  return `${String(day).padStart(2, "0")} ${MONTHS[month - 1]} ${year}`;
}

function formatMatchdayDate(value: string) {
  const { weekday, dayMonth } = formatMatchdayDateParts(value);
  return `${weekday}, ${dayMonth}`;
}

function formatMatchdayDateParts(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return { weekday: "TAG", dayMonth: value.toUpperCase() || "DATUM" };
  }
  const date = new Date(year, month - 1, day, 12);
  return {
    weekday: WEEKDAYS[date.getDay()],
    dayMonth: `${day}. ${FULL_MONTHS[month - 1]}`,
  };
}

function formatPhotoDateParts(value: string) {
  const [, month, day] = value.split("-").map(Number);
  if (!month || !day) return { day: "", month: "" };
  return { day: String(day).padStart(2, "0"), month: PHOTO_MONTHS[month - 1] ?? "" };
}

function formatRound(value: string) {
  const trimmed = value.trim();
  const conventional = trimmed.match(/^spieltag\s+(\d+)$/i);
  if (conventional) return `${conventional[1]}. SPIELTAG`;
  if (/^\d+$/.test(trimmed)) return `${trimmed}. SPIELTAG`;
  return trimmed.toUpperCase() || "SPIELTAG";
}

function roundFilePart(value: string) {
  return value.replaceAll(".", "").trim() || "ohne Angabe";
}

function supportsSharingFiles(files: File[]) {
  if (typeof navigator === "undefined") return false;

  try {
    return typeof navigator.share === "function"
      && typeof navigator.canShare === "function"
      && navigator.canShare({ files });
  } catch {
    return false;
  }
}

function getFileShareSupport() {
  if (typeof File === "undefined") return false;

  const probeFile = new File([new Uint8Array([0])], "svb-export.png", {
    type: "image/png",
  });
  return supportsSharingFiles([probeFile]);
}

function subscribeToFileShareSupport() {
  return () => {};
}

function isFirefoxOnAndroid() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent) && /Firefox\/\d+/i.test(navigator.userAgent);
}

function downloadFile(file: File) {
  // Firefox für Android öffnet darstellbare blob:-Dateien teilweise in einer
  // Einzelansicht und ignoriert dabei den vorgegebenen Downloadnamen. Ein
  // binärer MIME-Typ erzwingt dort den Download; die .png-Endung bleibt erhalten.
  const downloadableFile = isFirefoxOnAndroid()
    ? new Blob([file], { type: "application/x-binary" })
    : file;
  const url = URL.createObjectURL(downloadableFile);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
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

function drawImageContained(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  centerX: number,
  centerY: number,
  maxWidth: number,
  maxHeight: number,
  tintColor?: string,
) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (sourceWidth <= 0 || sourceHeight <= 0) return false;

  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  if (!tintColor) {
    context.drawImage(image, centerX - width / 2, centerY - height / 2, width, height);
    return true;
  }

  const transform = context.getTransform();
  const renderScale = Math.max(
    Math.hypot(transform.a, transform.b),
    Math.hypot(transform.c, transform.d),
    1,
  );
  const tintedCanvas = document.createElement("canvas");
  tintedCanvas.width = Math.max(1, Math.ceil(width * renderScale));
  tintedCanvas.height = Math.max(1, Math.ceil(height * renderScale));
  const tintedContext = tintedCanvas.getContext("2d");
  if (!tintedContext) return false;

  tintedContext.drawImage(image, 0, 0, tintedCanvas.width, tintedCanvas.height);
  tintedContext.globalCompositeOperation = "source-in";
  tintedContext.fillStyle = tintColor;
  tintedContext.fillRect(0, 0, tintedCanvas.width, tintedCanvas.height);
  context.drawImage(tintedCanvas, centerX - width / 2, centerY - height / 2, width, height);
  return true;
}

function loadImageSource(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Das Bild konnte nicht geladen werden."));
    image.src = src;
  });
}

function canvasToImage(canvas: HTMLCanvasElement) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Die Bildmaske konnte nicht erstellt werden."));
        return;
      }

      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Die Bildmaske konnte nicht gelesen werden."));
      };
      image.src = url;
    }, "image/png");
  });
}

function estimateOpaqueBackground(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const buckets = new Map<string, { count: number; red: number; green: number; blue: number }>();
  const sample = (x: number, y: number) => {
    const index = (y * width + x) * 4;
    if (pixels[index + 3] < 128) return;
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const key = `${red >> 4}-${green >> 4}-${blue >> 4}`;
    const bucket = buckets.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 };
    bucket.count += 1;
    bucket.red += red;
    bucket.green += green;
    bucket.blue += blue;
    buckets.set(key, bucket);
  };
  const step = Math.max(1, Math.floor((width + height) / 400));
  const inset = Math.min(
    Math.max(1, Math.round(Math.min(width, height) * 0.025)),
    Math.floor((Math.min(width, height) - 1) / 2),
  );

  for (const edgeInset of Array.from(new Set([0, inset]))) {
    for (let x = edgeInset; x < width - edgeInset; x += step) {
      sample(x, edgeInset);
      sample(x, height - 1 - edgeInset);
    }
    for (let y = edgeInset; y < height - edgeInset; y += step) {
      sample(edgeInset, y);
      sample(width - 1 - edgeInset, y);
    }
  }

  const background = Array.from(buckets.values())
    .sort((left, right) => right.count - left.count)[0];
  if (!background) return { red: 255, green: 255, blue: 255 };
  return {
    red: background.red / background.count,
    green: background.green / background.count,
    blue: background.blue / background.count,
  };
}

function shouldRemoveLightLogoAreas(pixels: Uint8ClampedArray) {
  let visiblePixelCount = 0;
  let coloredOrDarkPixelCount = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 16) continue;
    visiblePixelCount += 1;
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const brightness = (red + green + blue) / 3;
    const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
    if (brightness < 225 || chroma > 20) coloredOrDarkPixelCount += 1;
  }

  return visiblePixelCount > 0
    && coloredOrDarkPixelCount / visiblePixelCount >= 0.15;
}

async function normalizeOpponentLogo(image: HTMLImageElement) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("Das Gegnerlogo besitzt keine lesbare Größe.");
  }

  const maximumDimension = 2048;
  const scale = Math.min(1, maximumDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const context = sourceCanvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Das Gegnerlogo konnte nicht verarbeitet werden.");
  context.drawImage(image, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  let transparentPixelCount = 0;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] < 16) transparentPixelCount += 1;
  }
  const transparentPixelRatio = transparentPixelCount / (pixels.length / 4);
  const hasTransparentBackground = transparentPixelRatio >= 0.05;
  const background = hasTransparentBackground
    ? null
    : estimateOpaqueBackground(pixels, width, height);
  const removeLightLogoAreas = hasTransparentBackground
    && shouldRemoveLightLogoAreas(pixels);
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let index = 0; index < pixels.length; index += 4) {
    const pixelIndex = index / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    const sourceAlpha = pixels[index + 3];
    let alpha = sourceAlpha;

    if (background) {
      const redDistance = pixels[index] - background.red;
      const greenDistance = pixels[index + 1] - background.green;
      const blueDistance = pixels[index + 2] - background.blue;
      const distance = Math.sqrt(
        redDistance * redDistance
        + greenDistance * greenDistance
        + blueDistance * blueDistance,
      );
      const foregroundOpacity = Math.min(1, Math.max(0, (distance - 12) / 52));
      alpha = Math.round(sourceAlpha * foregroundOpacity);
    } else if (removeLightLogoAreas) {
      const distanceFromWhite = Math.max(
        255 - pixels[index],
        255 - pixels[index + 1],
        255 - pixels[index + 2],
      );
      const foregroundOpacity = Math.min(1, Math.max(0, (distanceFromWhite - 10) / 42));
      alpha = Math.round(sourceAlpha * foregroundOpacity);
    }

    pixels[index] = 0;
    pixels[index + 1] = 0;
    pixels[index + 2] = 0;
    pixels[index + 3] = alpha;

    if (alpha > 8) {
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) {
    throw new Error("Im Gegnerlogo wurde kein sichtbares Motiv erkannt.");
  }

  context.putImageData(imageData, 0, 0);
  const padding = Math.max(2, Math.round(Math.max(width, height) * 0.008));
  left = Math.max(0, left - padding);
  top = Math.max(0, top - padding);
  right = Math.min(width - 1, right + padding);
  bottom = Math.min(height - 1, bottom + padding);
  const output = document.createElement("canvas");
  output.width = right - left + 1;
  output.height = bottom - top + 1;
  const outputContext = output.getContext("2d");
  if (!outputContext) throw new Error("Das Gegnerlogo konnte nicht zugeschnitten werden.");
  outputContext.drawImage(
    sourceCanvas,
    left,
    top,
    output.width,
    output.height,
    0,
    0,
    output.width,
    output.height,
  );
  return canvasToImage(output);
}

function setMatchdayFont(
  context: CanvasRenderingContext2D,
  weight: 300 | 700,
  size: number,
) {
  context.font = `${weight} ${size}px Inter, Arial, Helvetica, sans-serif`;
  context.fontKerning = "normal";
  context.letterSpacing = "0.04em";
}

function fitMatchdayFont(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
  weight: 300 | 700,
) {
  let size = maxSize;
  while (size > minSize) {
    setMatchdayFont(context, weight, size);
    if (context.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return minSize;
}

function drawMatchdayText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  weight: 300 | 700,
  size: number,
  maxWidth?: number,
) {
  const value = text.toUpperCase();
  const fittedSize = maxWidth
    ? fitMatchdayFont(context, value, maxWidth, size, Math.max(26, size * 0.58), weight)
    : size;
  setMatchdayFont(context, weight, fittedSize);
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(value, x, y);
}

function drawMatchdayLogo(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  centerX: number,
  centerY: number,
  maxWidth: number,
  maxHeight: number,
  tintColor?: string,
) {
  if (!image) return;
  drawImageContained(context, image, centerX, centerY, maxWidth, maxHeight, tintColor);
}

function renderMatchdayGraphic(
  context: CanvasRenderingContext2D,
  formatKey: FormatKey,
  form: FormState,
  assets: Assets,
  teamDesign: TeamDesign,
) {
  const { width, height } = FORMATS[formatKey];
  const layout = MATCHDAY_LAYOUTS[formatKey];
  const isFirstTeam = teamDesign === "first";
  const blue = "#00448a";
  const textColor = isFirstTeam ? "#ffffff" : blue;
  const largeTextSize = layout.largeTextSize ?? 100;
  const smallTextSize = layout.smallTextSize ?? 40;
  const { weekday, dayMonth } = formatMatchdayDateParts(form.date);
  const smallDateLine = form.dateDisplay === "custom"
    ? form.customDateUpperLine
    : form.dateDisplay === "day-date"
      ? weekday
      : formatMatchdayDate(form.date);
  const largeDateLine = form.dateDisplay === "custom"
    ? form.customDateLargeLine
    : form.dateDisplay === "day-date"
      ? dayMonth
      : `${form.time || "--:--"} UHR`;

  const gradient = createAngledGradient(context, width, height, MATCHDAY_ANGLE_DEGREES);
  gradient.addColorStop(0, "#003076");
  gradient.addColorStop(1, "#14589e");

  context.fillStyle = isFirstTeam ? gradient : "#ffffff";
  context.fillRect(0, 0, width, height);

  context.fillStyle = isFirstTeam ? "#ffffff" : gradient;
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(width * layout.cornerTopX, 0);
  context.lineTo(
    0,
    width * layout.cornerTopX * Math.tan((MATCHDAY_ANGLE_DEGREES * Math.PI) / 180),
  );
  context.closePath();
  context.fill();

  if (layout.bottomCornerStartX !== undefined && layout.bottomCornerRightY !== undefined) {
    context.beginPath();
    context.moveTo(width, height * layout.bottomCornerRightY);
    context.lineTo(width, height);
    context.lineTo(width * layout.bottomCornerStartX, height);
    context.closePath();
    context.fill();
  }

  const leftLogo = form.homeAway === "home" ? assets.clubLogo : assets.opponentLogo;
  const rightLogo = form.homeAway === "home" ? assets.opponentLogo : assets.clubLogo;

  drawMatchdayText(
    context,
    formatRound(form.round),
    width * layout.headerX,
    height * layout.roundY,
    textColor,
    300,
    smallTextSize,
    width * 0.75,
  );
  drawMatchdayText(
    context,
    form.competition,
    width * layout.headerX,
    height * layout.competitionY,
    textColor,
    700,
    largeTextSize,
    width * (formatKey === "widescreen" ? 0.38 : 0.72),
  );
  drawMatchdayText(
    context,
    form.competitionRegion,
    width * layout.headerX,
    height * layout.regionY,
    textColor,
    300,
    smallTextSize,
    width * 0.62,
  );

  drawMatchdayLogo(
    context,
    leftLogo,
    width * layout.leftLogoX,
    height * layout.logoY,
    width * layout.logoMaxWidth,
    height * layout.logoMaxHeight,
    form.homeAway === "away" ? textColor : undefined,
  );
  drawMatchdayLogo(
    context,
    rightLogo,
    width * layout.rightLogoX,
    height * layout.logoY,
    width * layout.logoMaxWidth,
    height * layout.logoMaxHeight,
    form.homeAway === "home" ? textColor : undefined,
  );

  if (layout.versusY !== undefined) {
    drawMatchdayText(
      context,
      "VS.",
      width / 2,
      height * layout.versusY,
      textColor,
      300,
      smallTextSize,
    );
  }

  drawMatchdayText(
    context,
    smallDateLine,
    width / 2,
    height * layout.dateY,
    textColor,
    300,
    smallTextSize,
    width * 0.8,
  );
  drawMatchdayText(
    context,
    largeDateLine,
    width / 2,
    height * layout.timeY,
    textColor,
    700,
    largeTextSize,
    width * 0.78,
  );

  if (layout.venueY !== undefined && form.venue) {
    drawMatchdayText(
      context,
      form.venue,
      width / 2,
      height * layout.venueY,
      textColor,
      700,
      smallTextSize,
      width * 0.88,
    );
  }
  if (layout.addressY !== undefined && form.venueAddress) {
    drawMatchdayText(
      context,
      form.venueAddress,
      width / 2,
      height * layout.addressY,
      textColor,
      300,
      smallTextSize,
      width * 0.9,
    );
  }

  context.letterSpacing = "0px";
}

function setAnnouncementFont(
  context: CanvasRenderingContext2D,
  weight: 300 | 700,
  size: number,
) {
  context.font = `${weight} ${size}px Inter, Arial, Helvetica, sans-serif`;
  context.fontKerning = "normal";
  context.letterSpacing = "0.04em";
}

function fitAnnouncementFontToLongestWord(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
  weight: 300 | 700,
) {
  const words = text.split(/\s+/).filter(Boolean);
  for (let size = maxSize; size >= minSize; size -= 1) {
    setAnnouncementFont(context, weight, size);
    if (words.every((word) => context.measureText(word).width <= maxWidth)) {
      return size;
    }
  }
  return minSize;
}

function breakLongWord(
  context: CanvasRenderingContext2D,
  word: string,
  maxWidth: number,
) {
  const parts: string[] = [];
  let part = "";

  for (const character of Array.from(word)) {
    const candidate = `${part}${character}`;
    if (part && context.measureText(candidate).width > maxWidth) {
      parts.push(part);
      part = character;
    } else {
      part = candidate;
    }
  }
  if (part) parts.push(part);
  return parts;
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const lines: string[] = [];
  const paragraphs = text.replaceAll("\r\n", "\n").split("\n");

  paragraphs.forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      return;
    }

    let line = "";
    for (const word of words) {
      const wordParts = context.measureText(word).width > maxWidth
        ? breakLongWord(context, word, maxWidth)
        : [word];

      for (const wordPart of wordParts) {
        const candidate = line ? `${line} ${wordPart}` : wordPart;
        if (line && context.measureText(candidate).width > maxWidth) {
          lines.push(line);
          line = wordPart;
        } else {
          line = candidate;
        }
      }
    }
    if (line) lines.push(line);
  });

  while (lines.length > 1 && lines.at(-1) === "") lines.pop();
  return lines.length ? lines : [""];
}

function lineBlockHeight(lines: string[], lineHeight: number) {
  return lines.reduce(
    (height, line) => height + (line ? lineHeight : lineHeight * 0.68),
    0,
  );
}

function drawLineBlock(
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  top: number,
  lineHeight: number,
) {
  let y = top;
  for (const line of lines) {
    if (line) context.fillText(line, x, y);
    y += line ? lineHeight : lineHeight * 0.68;
  }
}

function drawAnnouncementBackground(
  context: CanvasRenderingContext2D,
  formatKey: FormatKey,
  pageWidth: number,
  height: number,
  pageCount: AnnouncementPageCount,
) {
  const totalWidth = pageWidth * pageCount;
  const layout = ANNOUNCEMENT_TITLE_LAYOUTS[formatKey];
  const gradient = createAngledGradient(
    context,
    totalWidth,
    height,
    MATCHDAY_ANGLE_DEGREES,
  );
  gradient.addColorStop(0, "#003076");
  gradient.addColorStop(1, "#14589e");
  context.fillStyle = gradient;
  context.fillRect(0, 0, totalWidth, height);

  context.fillStyle = "#ffffff";
  const cornerWidth = pageWidth * layout.cornerTopX;
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(cornerWidth, 0);
  context.lineTo(
    0,
    cornerWidth * Math.tan((MATCHDAY_ANGLE_DEGREES * Math.PI) / 180),
  );
  context.closePath();
  context.fill();

  if (formatKey === "post" && pageCount === 2) {
    const lowerCornerWidth = pageWidth * 0.27;
    context.beginPath();
    context.moveTo(totalWidth, height * 0.73);
    context.lineTo(totalWidth, height);
    context.lineTo(totalWidth - lowerCornerWidth, height);
    context.closePath();
    context.fill();
  }
}

function drawAnnouncementArrow(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const startX = width * 0.28;
  const endX = width * 0.72;
  const y = height * 0.94;
  const arrowSize = width * 0.025;

  context.save();
  context.strokeStyle = "#ffffff";
  context.lineWidth = Math.max(3, width * 0.0026);
  context.lineCap = "square";
  context.lineJoin = "miter";
  context.beginPath();
  context.moveTo(startX, y);
  context.lineTo(endX, y);
  context.moveTo(endX - arrowSize, y - arrowSize);
  context.lineTo(endX, y);
  context.lineTo(endX - arrowSize, y + arrowSize);
  context.stroke();
  context.restore();
}

function drawAnnouncementTitleSlide(
  context: CanvasRenderingContext2D,
  formatKey: FormatKey,
  form: AnnouncementFormState,
  whiteLogo: HTMLImageElement | null,
  showArrow: boolean,
) {
  const { width, height } = FORMATS[formatKey];
  const layout = ANNOUNCEMENT_TITLE_LAYOUTS[formatKey];
  const typeScale = formatKey === "post" || formatKey === "story"
    ? 1
    : Math.min(1.18, width / 1500 + 0.18);
  const titleSize = 76 * typeScale;
  const smallSize = 40 * typeScale;

  if (whiteLogo) {
    drawImageContained(
      context,
      whiteLogo,
      width * layout.logoX,
      height * layout.logoY,
      width * layout.logoMaxWidth,
      height * layout.logoMaxHeight,
    );
  }

  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "top";

  const titleValue = (form.title || ANNOUNCEMENT_PLACEHOLDERS.title).toUpperCase();
  const fittedTitleSize = fitAnnouncementFontToLongestWord(
    context,
    titleValue,
    width * layout.titleMaxWidth,
    titleSize,
    titleSize * 0.78,
    700,
  );
  setAnnouncementFont(context, 700, fittedTitleSize);
  const titleLines = wrapCanvasText(
    context,
    titleValue,
    width * layout.titleMaxWidth,
  );
  drawLineBlock(
    context,
    titleLines,
    width * layout.titleX,
    height * layout.titleTopY,
    fittedTitleSize * 1.16,
  );

  setAnnouncementFont(context, 700, smallSize);
  context.fillText(
    (form.subtitleBold || ANNOUNCEMENT_PLACEHOLDERS.subtitleBold).toUpperCase(),
    width * layout.lowerX,
    height * layout.lowerBoldY,
    width * layout.lowerMaxWidth,
  );

  setAnnouncementFont(context, 300, smallSize);
  const lowerLines = wrapCanvasText(
    context,
    (form.subtitleLight || ANNOUNCEMENT_PLACEHOLDERS.subtitleLight).toUpperCase(),
    width * layout.lowerMaxWidth,
  );
  drawLineBlock(
    context,
    lowerLines,
    width * layout.lowerX,
    height * layout.lowerLightY,
    smallSize * 1.22,
  );

  if (showArrow && formatKey === "post") {
    drawAnnouncementArrow(context, width, height);
  }
  context.letterSpacing = "0px";
}

function getAnnouncementBodyLayout(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
) {
  for (let size = 30; size >= 20; size -= 1) {
    setAnnouncementFont(context, 300, size);
    const lines = wrapCanvasText(context, text, maxWidth);
    const lineHeight = size * 1.28;
    const height = lineBlockHeight(lines, lineHeight);
    if (height <= maxHeight || size === 20) {
      return { size, lines, lineHeight, height };
    }
  }

  return { size: 20, lines: [text], lineHeight: 25.6, height: 25.6 };
}

function drawAnnouncementSecondSlide(
  context: CanvasRenderingContext2D,
  form: AnnouncementFormState,
  colorLogo: HTMLImageElement | null,
  xOffset: number,
) {
  const { width, height } = FORMATS.post;
  const headlineValue = (form.secondHeadline || ANNOUNCEMENT_PLACEHOLDERS.secondHeadline).toUpperCase();
  const bodyValue = form.body || ANNOUNCEMENT_PLACEHOLDERS.body;
  const headlineSize = fitAnnouncementFontToLongestWord(
    context,
    headlineValue,
    width * 0.86,
    76,
    58,
    700,
  );
  const headlineLineHeight = headlineSize * 1.16;
  const headlineBodyGap = 48;
  const contentCenterY = height * 0.5;
  const contentMaxHeight = height * 0.61;

  context.save();
  context.translate(xOffset, 0);
  context.fillStyle = "#ffffff";
  context.textBaseline = "top";

  setAnnouncementFont(context, 700, headlineSize);
  context.textAlign = "center";
  const headlineLines = wrapCanvasText(
    context,
    headlineValue,
    width * 0.86,
  );
  const headlineHeight = lineBlockHeight(headlineLines, headlineLineHeight);
  const bodyMaxHeight = Math.max(
    120,
    contentMaxHeight - headlineHeight - headlineBodyGap,
  );
  const bodyLayout = getAnnouncementBodyLayout(
    context,
    bodyValue,
    width * 0.78,
    bodyMaxHeight,
  );
  const totalHeight = headlineHeight + headlineBodyGap + bodyLayout.height;
  const contentTop = contentCenterY - totalHeight / 2;

  setAnnouncementFont(context, 700, headlineSize);
  drawLineBlock(
    context,
    headlineLines,
    width / 2,
    contentTop,
    headlineLineHeight,
  );

  setAnnouncementFont(context, 300, bodyLayout.size);
  context.textAlign = "left";
  drawLineBlock(
    context,
    bodyLayout.lines,
    width * 0.11,
    contentTop + headlineHeight + headlineBodyGap,
    bodyLayout.lineHeight,
  );

  if (form.disclaimer.trim()) {
    setAnnouncementFont(context, 300, 24);
    context.textAlign = "left";
    const disclaimerLines = wrapCanvasText(context, form.disclaimer, width * 0.58);
    drawLineBlock(context, disclaimerLines, width * 0.04, height * 0.94, 30);
  }

  if (colorLogo) {
    context.save();
    context.shadowColor = "rgba(0, 0, 0, 0.22)";
    context.shadowBlur = 8;
    context.shadowOffsetY = 3;
    drawImageContained(
      context,
      colorLogo,
      width * 0.87,
      height * 0.895,
      width * 0.17,
      height * 0.19,
    );
    context.restore();
  }

  context.letterSpacing = "0px";
  context.restore();
}

function renderAnnouncementGraphic(
  canvas: HTMLCanvasElement,
  formatKey: FormatKey,
  form: AnnouncementFormState,
  assets: Assets,
  page: AnnouncementPage,
  requestedPageCount: AnnouncementPageCount,
  scale = 1,
) {
  const format = FORMATS[formatKey];
  const pageCount: AnnouncementPageCount = formatKey === "post"
    ? requestedPageCount
    : 1;
  const renderedPage: AnnouncementPage = pageCount === 2 ? page : 1;
  const master = document.createElement("canvas");
  master.width = format.width * pageCount * scale;
  master.height = format.height * scale;
  const masterContext = master.getContext("2d");
  if (!masterContext) return;
  masterContext.scale(scale, scale);

  drawAnnouncementBackground(
    masterContext,
    formatKey,
    format.width,
    format.height,
    pageCount,
  );
  drawAnnouncementTitleSlide(
    masterContext,
    formatKey,
    form,
    assets.clubLogo,
    pageCount === 2,
  );
  if (pageCount === 2) {
    drawAnnouncementSecondSlide(
      masterContext,
      form,
      assets.colorClubLogo,
      format.width,
    );
  }

  canvas.width = format.width * scale;
  canvas.height = format.height * scale;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.drawImage(
    master,
    (renderedPage - 1) * format.width * scale,
    0,
    format.width * scale,
    format.height * scale,
    0,
    0,
    format.width * scale,
    format.height * scale,
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

  if (!isBrand && inkColor !== "#ffffff") {
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

  const imageWasDrawn = image
    ? drawImageContained(
        context,
        image,
        centerX,
        centerY,
        size * (isBrand ? 0.96 : 0.72),
        size * (isBrand ? 0.96 : 0.72),
        isBrand ? undefined : inkColor,
      )
    : false;

  if (!imageWasDrawn) {
    context.fillStyle = inkColor;
    context.font = `900 ${size * 0.25}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(fallback.slice(0, 3).toUpperCase(), centerX, centerY);
  }
  context.restore();
}

function renderPhotoMatchdayGraphic(
  context: CanvasRenderingContext2D,
  formatKey: FormatKey,
  form: FormState,
  assets: Assets,
  photoState: PhotoMatchdayState,
) {
  const { width, height } = FORMATS[formatKey];
  const isStory = formatKey === "story";
  const white = "#ffffff";
  const wordmarkLeft = 116;
  const wordmarkRight = 964;
  const wordmarkCenterOffset = 171;
  const wordmarkScale = (wordmarkRight - wordmarkLeft) / 847.516;
  const renderedWordmarkHeight = 198.434 * wordmarkScale;
  const wordmarkAssetWidth = 975.516 * wordmarkScale;
  const wordmarkAssetHeight = 326.434 * wordmarkScale;
  const venueOpticalOffset = 30;
  const normalizedPosition = Math.min(100, Math.max(0, photoState.textPosition)) / 100;
  const storySafeInset = height * 0.1;
  const storyTextTravel = (955 - 540) * (height / RESULT_POST_FORMAT.height);
  const storyTextBottomOffset = wordmarkCenterOffset
    + (renderedWordmarkHeight / 2)
    + venueOpticalOffset
    + 25;
  const textTopRange = isStory
    ? photoState.edge === "top"
      ? {
          start: height - storySafeInset - storyTextBottomOffset - storyTextTravel,
          end: height - storySafeInset - storyTextBottomOffset,
        }
      : { start: storySafeInset, end: storySafeInset + storyTextTravel }
    : photoState.edge === "top"
      ? { start: 540, end: 955 }
      : { start: 115, end: 530 };
  const textTop = textTopRange.start
    + ((textTopRange.end - textTopRange.start) * normalizedPosition);
  const edgeBlockHeight = 105;
  const dateTop = isStory
    ? photoState.edge === "top"
      ? storySafeInset
      : height - storySafeInset - edgeBlockHeight
    : photoState.edge === "top" ? 34 : 1199;
  const edgeLogoY = dateTop + 52.5;
  const dateDayX = isStory ? wordmarkLeft : 51;
  const dateMonthX = isStory ? wordmarkLeft + 7 : 58;
  const rightLogoX = isStory ? wordmarkRight - (81 / 2) : 995;
  const leftLogoX = isStory ? rightLogoX - 97 : 898;
  const leftLogo = form.homeAway === "home"
    ? assets.clubLogo
    : assets.opponentLogo;
  const rightLogo = form.homeAway === "home"
    ? assets.opponentLogo
    : assets.clubLogo;
  const leftIsClubLogo = form.homeAway === "home";
  const rightIsClubLogo = form.homeAway === "away";
  const opponentName = assets.opponentLogo ? form.opponentName.trim() : "";
  const separator = form.homeAway === "home" ? "vs." : "@";
  const date = formatPhotoDateParts(form.date);

  context.fillStyle = "#a6a6a6";
  context.fillRect(0, 0, width, height);
  if (assets.backgroundImage) {
    drawEditableBackground(context, assets.backgroundImage, formatKey, width, height);
  }

  context.save();
  context.fillStyle = white;
  context.textBaseline = "top";
  context.textAlign = "left";
  context.fontKerning = "normal";
  context.letterSpacing = "0px";

  if (date.day) {
    context.font = '300 78px "Gambetta Variable", "Bodoni 72", serif';
    context.fillText(date.day, dateDayX, dateTop);
  }
  if (date.month) {
    context.font = '400 27px Inter, Arial, Helvetica, sans-serif';
    context.fillText(date.month, dateMonthX, dateTop + 78);
  }

  drawMatchdayLogo(context, leftLogo, leftLogoX, edgeLogoY, 81, 105, leftIsClubLogo ? undefined : white);
  drawMatchdayLogo(context, rightLogo, rightLogoX, edgeLogoY, 81, 105, rightIsClubLogo ? undefined : white);

  context.font = '400 28px Inter, Arial, Helvetica, sans-serif';
  context.shadowColor = "rgba(0, 0, 0, 0.9)";
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 3;
  context.shadowBlur = 10;
  context.textAlign = "left";
  if (form.time) context.fillText(`${form.time} Uhr`, 140, textTop);

  context.textAlign = "right";
  context.fillText(`${form.clubName}   ${separator}`, wordmarkRight, textTop);
  if (opponentName) context.fillText(opponentName, wordmarkRight, textTop + 32);

  if (assets.matchdayWordmark) {
    context.save();
    context.shadowColor = "transparent";
    context.shadowBlur = 0;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    drawImageContained(
      context,
      assets.matchdayWordmark,
      (wordmarkLeft + wordmarkRight) / 2,
      textTop + wordmarkCenterOffset,
      wordmarkAssetWidth,
      wordmarkAssetHeight,
    );
    context.restore();
  }

  context.textAlign = "left";
  if (form.venue.trim()) {
    const venue = form.venue.trim();
    const venueMetrics = context.measureText(venue);
    const wordmarkBottom = textTop
      + wordmarkCenterOffset
      + (renderedWordmarkHeight / 2)
      + venueOpticalOffset;
    context.textBaseline = "alphabetic";
    context.fillText(
      venue,
      wordmarkLeft,
      wordmarkBottom - venueMetrics.actualBoundingBoxDescent,
    );
  }
  context.shadowColor = "transparent";
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.shadowBlur = 0;
  context.restore();
}

function renderResultGraphic(
  context: CanvasRenderingContext2D,
  formatKey: FormatKey,
  form: FormState,
  assets: Assets,
  teamDesign: TeamDesign,
) {
  const isWidescreen = formatKey === "widescreen";
  const isLandscape = formatKey === "landscape";
  const { width, height } = isWidescreen
    ? FORMATS.widescreen
    : isLandscape ? FORMATS.landscape : RESULT_POST_FORMAT;
  const blue = "#00448a";
  const isHomeMatch = form.homeAway === "home";
  const isFirstTeam = teamDesign === "first";
  const footerY = isWidescreen ? 961 : isLandscape ? 890 : 1215;
  const diagonalTopY = isWidescreen ? 732 : isLandscape ? 680 : 982;
  const logoDiagonalSlope = (2245.41 - 164.95) / (2040.45 - 411.84);
  const diagonalBottomX = width - (height - diagonalTopY) / logoDiagonalSlope;
  const contentY = isWidescreen ? 1027 : isLandscape ? 950 : 1281;

  context.fillStyle = "#a6a6a6";
  context.fillRect(0, 0, width, height);
  if (assets.backgroundImage) {
    drawEditableBackground(context, assets.backgroundImage, formatKey, width, height);
  }

  context.fillStyle = isFirstTeam ? blue : "#ffffff";
  context.fillRect(0, footerY, width, height - footerY);

  context.fillStyle = isFirstTeam ? "#ffffff" : blue;
  context.beginPath();
  context.moveTo(width, diagonalTopY);
  context.lineTo(width, height);
  context.lineTo(diagonalBottomX, height);
  context.closePath();
  context.fill();

  const clubX = isWidescreen ? 1705 : isLandscape ? 1305 : 857;
  const clubMaxWidth = isWidescreen || isLandscape ? 70 : 74;
  const clubMaxHeight = isWidescreen || isLandscape ? 88 : 94;
  const clubSourceWidth = 2583.26;
  const clubSourceHeight = 3249.74;
  const clubScale = Math.min(
    clubMaxWidth / clubSourceWidth,
    clubMaxHeight / clubSourceHeight,
  );
  const clubWidth = clubSourceWidth * clubScale;
  const clubHeight = clubSourceHeight * clubScale;
  const logoDividerOffsetX = (2040.45 / clubSourceWidth - 0.5) * clubWidth;
  const logoDividerOffsetY = (164.95 / clubSourceHeight - 0.5) * clubHeight;
  const logoDividerX = clubX + logoDividerOffsetX;
  const logoDividerY = diagonalTopY + logoDiagonalSlope * (width - logoDividerX);
  const clubY = logoDividerY - logoDividerOffsetY;
  const opponentX = isWidescreen
    ? isHomeMatch ? 1860 : 1565
    : isLandscape
      ? isHomeMatch ? 1440 : 1170
    : isHomeMatch ? 1025 : 689;
  const scoreX = isWidescreen
    ? isHomeMatch ? 1782 : 1643
    : isLandscape
      ? isHomeMatch ? 1375 : 1238
    : isHomeMatch ? 941 : 773;
  const diagonalXAtContent = width - (contentY - diagonalTopY) / logoDiagonalSlope;
  const opponentIsOnDiagonal = opponentX >= diagonalXAtContent;
  const opponentIsOnBlue = isFirstTeam
    ? !opponentIsOnDiagonal
    : opponentIsOnDiagonal;
  const detailColor = opponentIsOnBlue ? "#ffffff" : blue;
  const clubScore = form.clubScore || "0";
  const opponentScore = form.opponentScore || "0";
  const score = form.homeAway === "home"
    ? `${clubScore}:${opponentScore}`
    : `${opponentScore}:${clubScore}`;

  if (assets.clubLogo) {
    drawImageContained(
      context,
      assets.clubLogo,
      clubX,
      clubY,
      clubMaxWidth,
      clubMaxHeight,
    );
  }
  if (assets.opponentLogo) {
    drawImageContained(
      context,
      assets.opponentLogo,
      opponentX,
      contentY,
      isWidescreen || isLandscape ? 62 : 66,
      isWidescreen || isLandscape ? 84 : 90,
      detailColor,
    );
  }

  context.font = '700 40px Inter, Arial, Helvetica, sans-serif';
  context.fontKerning = "normal";
  context.letterSpacing = "0.04em";
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.fillStyle = detailColor;
  context.fillText(score, scoreX, contentY);

  if (form.footer.trim()) {
    context.textAlign = "left";
    context.fillStyle = isFirstTeam ? "#ffffff" : blue;
    context.fillText(
      form.footer.toUpperCase(),
      isWidescreen ? 34 : isLandscape ? 32 : 40,
      contentY,
    );
  }
  context.letterSpacing = "0px";
}

function getGraphicFormat(
  department: Department,
  type: PostType,
  formatKey: FormatKey,
  matchdayDesign: MatchdayDesign,
) {
  const usesPhotoPostFormat = department === "football"
    && formatKey === "post"
    && (type === "result" || (type === "matchday" && matchdayDesign === "photo"));
  return usesPhotoPostFormat
    ? RESULT_POST_FORMAT
    : FORMATS[formatKey];
}

function renderGraphic(
  canvas: HTMLCanvasElement,
  formatKey: FormatKey,
  type: PostType,
  form: FormState,
  assets: Assets,
  teamDesign: TeamDesign,
  matchdayDesign: MatchdayDesign,
  photoMatchdayState: PhotoMatchdayState,
  department: Department,
  announcementForm: AnnouncementFormState,
  announcementPage: AnnouncementPage,
  announcementPageCount: AnnouncementPageCount,
  scale = 1,
) {
  if (department === "general") {
    renderAnnouncementGraphic(
      canvas,
      formatKey,
      announcementForm,
      assets,
      announcementPage,
      announcementPageCount,
      scale,
    );
    return;
  }

  const format = getGraphicFormat(department, type, formatKey, matchdayDesign);
  canvas.width = format.width * scale;
  canvas.height = format.height * scale;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.scale(scale, scale);

  const width = format.width;
  const height = format.height;

  if (
    type === "result"
    && (formatKey === "post" || formatKey === "landscape" || formatKey === "widescreen")
  ) {
    renderResultGraphic(context, formatKey, form, assets, teamDesign);
    return;
  }

  if (
    type === "matchday"
    && matchdayDesign === "photo"
    && (formatKey === "post" || formatKey === "story")
  ) {
    renderPhotoMatchdayGraphic(context, formatKey, form, assets, photoMatchdayState);
    return;
  }

  if (type === "matchday") {
    renderMatchdayGraphic(context, formatKey, form, assets, teamDesign);
    return;
  }

  const isStory = formatKey === "story";
  const isLandscape = height / width < 0.7;
  const safe = width * (isLandscape ? 0.055 : 0.065);
  const isFirstTeam = teamDesign === "first";
  const inkColor = isFirstTeam ? "#ffffff" : "#00448a";
  const mutedInkColor = isFirstTeam ? "rgba(255,255,255,.72)" : "rgba(0,68,138,.68)";
  const strongMutedInkColor = isFirstTeam ? "rgba(255,255,255,.8)" : "rgba(0,68,138,.8)";
  const infoSurface = isFirstTeam ? "rgba(255,255,255,.1)" : "#edf4fa";

  const gradient = createAngledGradient(context, width, height, MATCHDAY_ANGLE_DEGREES);
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
  context.fillText(
    `${form.competition} ${form.competitionRegion}  ·  ${form.round}`.toUpperCase(),
    safe,
    safe * 1.12,
  );

  context.fillStyle = inkColor;
  const headlineSize = isLandscape ? width * 0.062 : width * (isStory ? 0.11 : 0.095);
  context.font = `900 ${headlineSize}px Arial, Helvetica, sans-serif`;
  context.fillText((form.headline || "FULL TIME").toUpperCase(), safe, safe * 2.45);

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

function OpponentLogoPicker({
  entries,
  selectedEntry,
  image,
  opponentName,
  onOpponentNameChange,
  onSelect,
  onUpload,
  onClear,
}: {
  entries: OpponentCatalogEntry[];
  selectedEntry: OpponentCatalogEntry | null;
  image: HTMLImageElement | null;
  opponentName: string;
  onOpponentNameChange: (value: string) => void;
  onSelect: (entry: OpponentCatalogEntry) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  const inputId = useId();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(selectedEntry?.name ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedName = selectedEntry?.name ?? "";
  const isCustomLogo = Boolean(image && !selectedEntry);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery(selectedName);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [selectedName]);

  const filteredEntries = useMemo(() => {
    const effectiveQuery = query === selectedName ? "" : query;
    const queryVariants = createSearchVariants(effectiveQuery);
    if (!effectiveQuery.trim()) return entries;
    return entries.filter((entry) => queryVariants.some((variant) =>
      entry.searchVariants.some((searchValue) => searchValue.includes(variant))
    ));
  }, [entries, query, selectedName]);

  useEffect(() => {
    if (!isOpen || !filteredEntries[activeIndex]) return;
    document
      .getElementById(`${listboxId}-${filteredEntries[activeIndex].id}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, filteredEntries, isOpen, listboxId]);

  function selectEntry(entry: OpponentCatalogEntry) {
    setQuery(entry.name);
    setIsOpen(false);
    setActiveIndex(0);
    onSelect(entry);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const pickerWidth = rootRef.current?.clientWidth ?? 0;
    const columnCount = pickerWidth >= 680 ? 2 : 1;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => isOpen
        ? Math.min(current + columnCount, Math.max(0, filteredEntries.length - 1))
        : 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => isOpen
        ? Math.max(current - columnCount, 0)
        : Math.max(0, filteredEntries.length - 1));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => isOpen
        ? Math.min(current + 1, Math.max(0, filteredEntries.length - 1))
        : 0);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => isOpen
        ? Math.max(current - 1, 0)
        : Math.max(0, filteredEntries.length - 1));
    } else if (event.key === "Enter" && isOpen && filteredEntries[activeIndex]) {
      event.preventDefault();
      selectEntry(filteredEntries[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      setQuery(selectedName);
    }
  }

  const previewSrc = selectedEntry?.src ?? (isCustomLogo ? image?.src : undefined);
  const selectionLabel = selectedEntry
    ? selectedEntry.name
    : isCustomLogo
      ? "Eigenes Logo ausgewählt"
      : "Kein Gegnerlogo ausgewählt";

  return (
    <div className="opponent-logo-field">
      <span className="field-label">Gegnerlogo</span>
      <div className="opponent-picker" ref={rootRef}>
        <div className={`opponent-search ${image ? "has-selection" : ""}`}>
          <span className="opponent-search-preview" aria-hidden="true">
            {previewSrc ? <img src={previewSrc} alt="" /> : "⌕"}
          </span>
          <input
            id={inputId}
            role="combobox"
            aria-label="Gegnerlogo suchen"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-activedescendant={isOpen && filteredEntries[activeIndex]
              ? `${listboxId}-${filteredEntries[activeIndex].id}`
              : undefined}
            autoComplete="off"
            placeholder="Verein suchen …"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
          />
          {image && (
            <button
              className="opponent-clear-button"
              type="button"
              aria-label="Gegnerlogo entfernen"
              onClick={() => {
                setQuery("");
                setIsOpen(false);
                onClear();
              }}
            >
              ×
            </button>
          )}
        </div>
        {isOpen && (
          <div className="opponent-options" id={listboxId} role="listbox" aria-label="Vereinslogos">
            {filteredEntries.length > 0 ? filteredEntries.map((entry, index) => (
              <button
                id={`${listboxId}-${entry.id}`}
                key={entry.id}
                className={`opponent-option ${index === activeIndex ? "active" : ""}`}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={selectedEntry?.id === entry.id}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectEntry(entry)}
              >
                <span className="opponent-option-logo"><img src={entry.src} alt="" loading="lazy" /></span>
                <span>{entry.name}</span>
                {selectedEntry?.id === entry.id && <span className="opponent-option-check" aria-hidden="true">✓</span>}
              </button>
            )) : (
              <p className="opponent-empty" role="status">Kein Verein gefunden.</p>
            )}
          </div>
        )}
      </div>
      <div className="opponent-picker-footer">
        {image ? (
          <label className="opponent-name-field">
            <span className="field-label">Gegnername</span>
            <input
              value={opponentName}
              maxLength={60}
              placeholder="Vereinsname eingeben"
              onChange={(event) => onOpponentNameChange(event.target.value)}
            />
          </label>
        ) : (
          <span className="selection-status">{selectionLabel}</span>
        )}
        <label className="opponent-upload-button">
          Eigenes Logo hochladen
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(event) => {
              setQuery("");
              setIsOpen(false);
              onUpload(event);
            }}
          />
        </label>
      </div>
    </div>
  );
}

function UploadField({
  id,
  label,
  hasImage,
  onChange,
  onEdit,
  onRemove,
}: {
  id: string;
  label: string;
  hasImage: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="upload-field">
      <span className="field-label">{label}</span>
      <label className={`upload-box ${hasImage ? "has-file" : ""}`} htmlFor={id}>
        <span className="upload-mark" aria-hidden="true">{hasImage ? "✓" : "+"}</span>
        <span>{hasImage ? "Bild ersetzen" : "Bild auswählen"}</span>
        <input id={id} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onChange} />
      </label>
      {hasImage && (
        <div className="upload-actions">
          <button className="text-button" type="button" onClick={onEdit}>Bild bearbeiten</button>
          <button className="text-button" type="button" onClick={onRemove}>Bild entfernen</button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const appShellRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const opponentLoadRequestRef = useRef(0);
  const fixtureOverridesRef = useRef<FixtureOverrides>({});
  const activeFixtureIdRef = useRef<string | null>(null);
  const [department, setDepartment] = useState<Department>("football");
  const [postType, setPostType] = useState<PostType>("matchday");
  const [teamDesign, setTeamDesign] = useState<TeamDesign>("first");
  const [matchdayDesign, setMatchdayDesign] = useState<MatchdayDesign>("classic");
  const [photoMatchdayState, setPhotoMatchdayState] = useState<PhotoMatchdayState>(
    INITIAL_PHOTO_MATCHDAY_STATE,
  );
  const [formatKey, setFormatKey] = useState<FormatKey>("post");
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [announcementForm, setAnnouncementForm] = useState<AnnouncementFormState>(
    INITIAL_ANNOUNCEMENT_FORM,
  );
  const [announcementPageCount, setAnnouncementPageCount] =
    useState<AnnouncementPageCount>(2);
  const [announcementPage, setAnnouncementPage] = useState<AnnouncementPage>(1);
  const [assets, setAssets] = useState<Assets>({
    clubLogo: null,
    colorClubLogo: null,
    opponentLogo: null,
    matchdayWordmark: null,
    backgroundImage: null,
  });
  const [backgroundEditorImage, setBackgroundEditorImage] =
    useState<EditableBackgroundImage | null>(null);
  const [selectedOpponentId, setSelectedOpponentId] = useState<string | null>(null);
  const [, setFixtureOverrides] = useState<FixtureOverrides>({});
  const [downloadStatus, setDownloadStatus] = useState("");
  const [fontReady, setFontReady] = useState(false);
  const supportsFileSharing = useSyncExternalStore(
    subscribeToFileShareSupport,
    getFileShareSupport,
    () => false,
  );

  useEffect(() => {
    if (!downloadStatus) return;

    const timeoutId = window.setTimeout(() => {
      setDownloadStatus("");
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [downloadStatus]);

  useEffect(() => {
    let isActive = true;
    Promise.all([
      document.fonts.load('300 40px "Inter"'),
      document.fonts.load('300 30px "Inter"'),
      document.fonts.load('700 76px "Inter"'),
      document.fonts.load('700 100px "Inter"'),
      document.fonts.load('300 78px "Gambetta Variable"'),
    ]).finally(() => {
      if (isActive) setFontReady(true);
    });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      if (!canvasRef.current) return;
      renderGraphic(
        canvasRef.current,
        formatKey,
        postType,
        form,
        assets,
        teamDesign,
        matchdayDesign,
        photoMatchdayState,
        department,
        announcementForm,
        announcementPage,
        announcementPageCount,
      );
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [
    formatKey,
    postType,
    form,
    assets,
    teamDesign,
    matchdayDesign,
    photoMatchdayState,
    department,
    announcementForm,
    announcementPage,
    announcementPageCount,
    fontReady,
  ]);

  useEffect(() => {
    const image = new Image();
    const fileName = department === "general"
      ? "svb-logo-weiss-1906.svg"
      : postType === "result"
      ? "svb-logo-farbe-1906.svg"
      : matchdayDesign === "photo"
        ? "svb-logo-weiss-1906.svg"
      : teamDesign === "first"
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
  }, [department, postType, teamDesign, matchdayDesign]);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      setAssets((current) => ({ ...current, colorClubLogo: image }));
    };
    image.onerror = () => {
      setDownloadStatus("Das farbige SVB-Vereinslogo konnte nicht geladen werden.");
    };
    image.src = new URL("./assets/svb-logo-farbe-1906.svg", window.location.href).href;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, []);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      setAssets((current) => ({ ...current, matchdayWordmark: image }));
    };
    image.onerror = () => {
      setDownloadStatus("Der MATCH-DAY-Schriftzug konnte nicht geladen werden.");
    };
    image.src = new URL("./assets/matchday-wordmark.svg", window.location.href).href;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, []);

  useEffect(() => {
    const appShell = appShellRef.current;
    if (!appShell || window.parent === window) return;
    const observedAppShell = appShell;

    let animationFrame = 0;

    function reportHeight() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const height = Math.ceil(observedAppShell.getBoundingClientRect().bottom);
        for (const origin of EMBED_ORIGINS) {
          window.parent.postMessage(
            { type: "svb-generator-height", height },
            origin,
          );
        }
      });
    }

    const resizeObserver = new ResizeObserver(reportHeight);
    resizeObserver.observe(observedAppShell);
    window.addEventListener("resize", reportHeight);
    void document.fonts?.ready.then(reportHeight);
    reportHeight();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", reportHeight);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  const selectedFormat = getGraphicFormat(department, postType, formatKey, matchdayDesign);
  const availableFormats: FormatKey[] = department === "football" && postType === "result"
    ? ["post", "landscape", "widescreen"]
    : department === "football" && postType === "matchday" && matchdayDesign === "photo"
      ? ["post", "story"]
      : Object.keys(FORMATS) as FormatKey[];
  const selectedOpponentEntry = selectedOpponentId
    ? OPPONENT_CATALOG.find((entry) => entry.id === selectedOpponentId) ?? null
    : null;

  function updateForm<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    const activeFixtureId = activeFixtureIdRef.current;
    if (activeFixtureId && isFixtureEditableKey(key)) {
      const nextOverrides: FixtureOverrides = {
        ...fixtureOverridesRef.current,
        [activeFixtureId]: {
          ...fixtureOverridesRef.current[activeFixtureId],
          [key]: value,
        },
      };
      fixtureOverridesRef.current = nextOverrides;
      setFixtureOverrides(nextOverrides);
    }
  }

  function updateAnnouncementForm<Key extends keyof AnnouncementFormState>(
    key: Key,
    value: AnnouncementFormState[Key],
  ) {
    setAnnouncementForm((current) => ({ ...current, [key]: value }));
  }

  function chooseDepartment(nextDepartment: Department) {
    setDepartment(nextDepartment);
    setAnnouncementPage(1);
  }

  function chooseFormat(key: FormatKey) {
    setFormatKey(key);
    if (key !== "post") setAnnouncementPage(1);
  }

  function chooseAnnouncementPageCount(pageCount: AnnouncementPageCount) {
    setAnnouncementPageCount(pageCount);
    if (pageCount === 1) setAnnouncementPage(1);
  }

  function chooseType(type: PostType) {
    setPostType(type);
    if (type === "result") setFormatKey("post");
    setForm((current) => ({
      ...current,
      headline: type === "matchday" ? "MATCHDAY" : "FULL TIME",
    }));
  }

  function chooseMatchdayDesign(design: MatchdayDesign) {
    setMatchdayDesign(design);
    if (design === "photo") setFormatKey("post");
  }

  function updatePhotoMatchdayState<Key extends keyof PhotoMatchdayState>(
    key: Key,
    value: PhotoMatchdayState[Key],
  ) {
    setPhotoMatchdayState((current) => ({ ...current, [key]: value }));
  }

  function chooseTeamDesign(design: TeamDesign) {
    setTeamDesign(design);
    const fixturePreset = selectedOpponentEntry?.clubId
      ? findFixture(design, selectedOpponentEntry.clubId, form.homeAway)
      : undefined;
    activeFixtureIdRef.current = fixturePreset?.id ?? null;
    setForm((current) => ({
      ...current,
      clubName: TEAM_DESIGNS[design].clubName,
      competition: TEAM_DESIGNS[design].competition,
      competitionRegion: TEAM_DESIGNS[design].competitionRegion,
      ...(fixturePreset
        ? getFixtureEditableValues(fixturePreset, fixtureOverridesRef.current[fixturePreset.id])
        : {}),
    }));
  }

  function chooseHomeAway(homeAway: FixtureHomeAway) {
    const fixturePreset = selectedOpponentEntry?.clubId
      ? findFixture(teamDesign, selectedOpponentEntry.clubId, homeAway)
      : undefined;
    activeFixtureIdRef.current = fixturePreset?.id ?? null;
    setForm((current) => ({
      ...current,
      homeAway,
      ...(fixturePreset
        ? getFixtureEditableValues(fixturePreset, fixtureOverridesRef.current[fixturePreset.id])
        : {}),
    }));
  }

  function loadBackgroundUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setDownloadStatus("Hintergrundbild wird vorbereitet …");
    void loadEditableBackground(file)
      .then((image) => {
        setBackgroundEditorImage(
          postType === "matchday" && matchdayDesign === "photo"
            ? { ...image, preset: "vignette" }
            : image,
        );
        setDownloadStatus("");
      })
      .catch(() => {
        setDownloadStatus("Dieses Bildformat konnte nicht gelesen werden.");
      });
  }

  function editBackgroundImage() {
    if (!assets.backgroundImage) return;
    setBackgroundEditorImage(cloneEditableBackground(assets.backgroundImage));
  }

  function applyBackgroundImage(image: EditableBackgroundImage) {
    setAssets((current) => ({
      ...current,
      backgroundImage: cloneEditableBackground(image),
    }));
    setBackgroundEditorImage(null);
    setDownloadStatus("Hintergrundbild wurde übernommen.");
  }

  function removeBackgroundImage() {
    setAssets((current) => ({ ...current, backgroundImage: null }));
    setBackgroundEditorImage(null);
    setDownloadStatus("Hintergrundbild wurde entfernt.");
  }

  async function chooseOpponent(entry: OpponentCatalogEntry) {
    const requestId = ++opponentLoadRequestRef.current;
    const fixturePreset = entry.clubId
      ? findFixture(teamDesign, entry.clubId, form.homeAway)
      : undefined;
    activeFixtureIdRef.current = fixturePreset?.id ?? null;
    setSelectedOpponentId(entry.id);
    setForm((current) => ({
      ...current,
      opponentName: entry.name,
      ...(fixturePreset
        ? getFixtureEditableValues(fixturePreset, fixtureOverridesRef.current[fixturePreset.id])
        : {}),
    }));
    setAssets((current) => ({ ...current, opponentLogo: null }));
    setDownloadStatus("");

    try {
      const source = await loadImageSource(entry.src);
      const normalizedLogo = await normalizeOpponentLogo(source);
      if (requestId !== opponentLoadRequestRef.current) return;
      setAssets((current) => ({ ...current, opponentLogo: normalizedLogo }));
    } catch {
      if (requestId !== opponentLoadRequestRef.current) return;
      setSelectedOpponentId(null);
      setDownloadStatus(`Das Gegnerlogo „${entry.name}“ konnte nicht verarbeitet werden.`);
    }
  }

  function loadOpponentUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const requestId = ++opponentLoadRequestRef.current;
    const url = URL.createObjectURL(file);
    activeFixtureIdRef.current = null;
    setSelectedOpponentId(null);
    setForm((current) => ({ ...current, opponentName: "" }));
    setAssets((current) => ({ ...current, opponentLogo: null }));
    setDownloadStatus(`„${file.name}“ wird verarbeitet …`);

    void loadImageSource(url)
      .then(normalizeOpponentLogo)
      .then((normalizedLogo) => {
        if (requestId !== opponentLoadRequestRef.current) return;
        setAssets((current) => ({ ...current, opponentLogo: normalizedLogo }));
        setDownloadStatus(`„${file.name}“ wurde als Gegnerlogo übernommen.`);
      })
      .catch(() => {
        if (requestId !== opponentLoadRequestRef.current) return;
        setDownloadStatus("Dieses Gegnerlogo konnte nicht verarbeitet werden.");
      })
      .finally(() => URL.revokeObjectURL(url));
  }

  function clearOpponentLogo() {
    opponentLoadRequestRef.current += 1;
    activeFixtureIdRef.current = null;
    setSelectedOpponentId(null);
    setForm((current) => ({ ...current, opponentName: INITIAL_FORM.opponentName }));
    setAssets((current) => ({ ...current, opponentLogo: null }));
    setDownloadStatus("Gegnerlogo wurde entfernt.");
  }

  function fileName(key: FormatKey, page?: AnnouncementPage) {
    if (department === "general") {
      const pagePart = page ? ` Seite ${page}` : "";
      return `SVB ${FORMAT_FILE_NAMES[key]} Allgemein Ankuendigung${pagePart}.png`;
    }

    const team = teamDesign === "first" ? "Erste" : "Zweite";
    const venue = form.homeAway === "home" ? "Heim" : "Auswaerts";
    if (postType === "matchday" && matchdayDesign === "photo") {
      return `SVB ${FORMAT_FILE_NAMES[key]} ${team} Matchday ${venue}.png`;
    }
    return `SVB ${FORMAT_FILE_NAMES[key]} ${team} ${roundFilePart(form.round)} ${venue}.png`;
  }

  function createPngBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
  }

  async function saveFiles(files: File[]): Promise<ExportAction> {
    if (supportsSharingFiles(files)) {
      try {
        await navigator.share({
          files,
          title: "SVB Social Media Grafik",
        });
        return "shared";
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return "cancelled";
        }
        // Falls der Systemdialog trotz positiver Erkennung blockiert wird,
        // bleiben die PNG-Dateien über den regulären Download erreichbar.
      }
    }

    files.forEach(downloadFile);
    return "downloaded";
  }

  async function createPngFile(
    canvas: HTMLCanvasElement,
    key: FormatKey,
    page?: AnnouncementPage,
  ) {
    const blob = await createPngBlob(canvas);
    if (!blob) {
      return null;
    }

    const name = fileName(key, page);
    return new File([blob], name, { type: "image/png" });
  }

  async function downloadSelected() {
    const exportScale = selectedFormat.exportScale;
    const exportWidth = selectedFormat.width * exportScale;
    const exportHeight = selectedFormat.height * exportScale;
    const isTwoPageAnnouncement = department === "general"
      && formatKey === "post"
      && announcementPageCount === 2;
    const pages: AnnouncementPage[] = isTwoPageAnnouncement ? [1, 2] : [1];
    setDownloadStatus(
      `${pages.length === 2 ? "Zwei PNGs" : "PNG"} mit ${exportWidth} × ${exportHeight} px ${pages.length === 2 ? "werden" : "wird"} erstellt …`,
    );
    const files: File[] = [];

    for (const page of pages) {
      const canvas = document.createElement("canvas");
      renderGraphic(
        canvas,
        formatKey,
        postType,
        form,
        assets,
        teamDesign,
        matchdayDesign,
        photoMatchdayState,
        department,
        announcementForm,
        page,
        announcementPageCount,
        exportScale,
      );
      const file = await createPngFile(
        canvas,
        formatKey,
        isTwoPageAnnouncement ? page : undefined,
      );
      if (!file) {
        setDownloadStatus("Das Bild konnte nicht erstellt werden.");
        return;
      }
      files.push(file);
    }

    const action = await saveFiles(files);
    if (action === "shared") {
      setDownloadStatus(
        `${files.length === 2 ? "Beide PNGs wurden" : "Das PNG wurde"} gespeichert oder geteilt.`,
      );
    } else if (action === "downloaded") {
      setDownloadStatus(
        files.length === 2
          ? "Beide Seiten wurden als einzelne PNG-Dateien heruntergeladen."
          : `„${files[0].name}“ wurde heruntergeladen.`,
      );
    } else {
      setDownloadStatus("Speichern wurde abgebrochen.");
    }
  }

  function resetForm() {
    if (department === "general") {
      setAnnouncementForm(INITIAL_ANNOUNCEMENT_FORM);
      setAnnouncementPageCount(2);
      setAnnouncementPage(1);
      setDownloadStatus("Ankündigung wurde zurückgesetzt.");
      return;
    }

    setForm({
      ...INITIAL_FORM,
      clubName: TEAM_DESIGNS[teamDesign].clubName,
      competition: TEAM_DESIGNS[teamDesign].competition,
      competitionRegion: TEAM_DESIGNS[teamDesign].competitionRegion,
      headline: postType === "matchday" ? "MATCHDAY" : "FULL TIME",
    });
    setPhotoMatchdayState(INITIAL_PHOTO_MATCHDAY_STATE);
    activeFixtureIdRef.current = null;
    fixtureOverridesRef.current = {};
    setFixtureOverrides({});
    opponentLoadRequestRef.current += 1;
    setSelectedOpponentId(null);
    setBackgroundEditorImage(null);
    setAssets((current) => ({
      ...current,
      opponentLogo: null,
      backgroundImage: null,
    }));
    setDownloadStatus("Eingaben wurden zurückgesetzt.");
  }

  return (
    <main ref={appShellRef} className="app-shell">
      <section className="department-card" aria-label="Abteilung auswählen">
        <div className="selector-group">
          <span className="selector-label">Abteilung</span>
          <div className="selector-options">
            <button type="button" className={department === "general" ? "active" : ""} onClick={() => chooseDepartment("general")}>Allgemein</button>
            <button type="button" className={department === "football" ? "active" : ""} onClick={() => chooseDepartment("football")}>Fußball</button>
          </div>
        </div>
      </section>

      <div className="studio-grid">
        <section
          className={`selector-card selector-card-${department}`}
          aria-label="Grafik auswählen"
        >
          <div className="selector-group">
            <span className="selector-label">Beitrag</span>
            <div className="selector-options">
              {department === "football" ? (
                <>
                  <button type="button" className={postType === "matchday" ? "active" : ""} onClick={() => chooseType("matchday")}>Spieltagsankündigung</button>
                  <button type="button" className={postType === "result" ? "active" : ""} onClick={() => chooseType("result")}>Ergebnismeldung</button>
                </>
              ) : (
                <button type="button" className="active" aria-pressed="true">Ankündigung</button>
              )}
            </div>
            {department === "football" && postType === "matchday" && (
              <>
                <span className="selector-label">Design</span>
                <div className="selector-options" role="group" aria-label="Design auswählen">
                  <button
                    type="button"
                    className={matchdayDesign === "classic" ? "active" : ""}
                    aria-pressed={matchdayDesign === "classic"}
                    onClick={() => chooseMatchdayDesign("classic")}
                  >
                    Klassisch
                  </button>
                  <button
                    type="button"
                    className={matchdayDesign === "photo" ? "active" : ""}
                    aria-pressed={matchdayDesign === "photo"}
                    onClick={() => chooseMatchdayDesign("photo")}
                  >
                    Matchday
                  </button>
                </div>
              </>
            )}
          </div>
          {department === "football" && (
            <div className="selector-group">
              <span className="selector-label">Mannschaft</span>
              <div className="selector-options" role="group" aria-label="Mannschaft auswählen">
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
          )}
          <div className="selector-group format-selector">
            <span className="selector-label">Format</span>
            <div className="selector-options">
              {availableFormats.map((key) => (
                <button key={key} type="button" className={formatKey === key ? "active" : ""} onClick={() => chooseFormat(key)}>
                  <span>{FORMATS[key].label}</span>
                  <small>{FORMATS[key].short}</small>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="preview-column" aria-labelledby="preview-title">
          <div className="panel-heading">
            <div>
              <p className="section-kicker preview-kicker">
                <span>Live-Vorschau</span>
                <span className="preview-export-size">
                  Export {selectedFormat.width * selectedFormat.exportScale} × {selectedFormat.height * selectedFormat.exportScale} px
                </span>
              </p>
              <h2 id="preview-title">{selectedFormat.label}</h2>
            </div>
            <button className="primary-button preview-download-button" type="button" onClick={downloadSelected}>
              {department === "general" && formatKey === "post" && announcementPageCount === 2
                ? supportsFileSharing ? "Beide Seiten speichern / teilen" : "Beide PNGs herunterladen"
                : supportsFileSharing ? "Bild speichern / teilen" : "PNG herunterladen"}
            </button>
          </div>
          <div className={`canvas-stage canvas-${formatKey}`}>
            <canvas ref={canvasRef} aria-label={`Vorschau für ${selectedFormat.label}${department === "general" && announcementPageCount === 2 ? `, Seite ${announcementPage}` : ""}`} />
          </div>
          {department === "general" && formatKey === "post" && announcementPageCount === 2 && (
            <div className="selector-options compact preview-page-control" role="group" aria-label="Vorschauseite auswählen">
              <button type="button" className={announcementPage === 1 ? "active" : ""} aria-pressed={announcementPage === 1} onClick={() => setAnnouncementPage(1)}>Seite 1</button>
              <button type="button" className={announcementPage === 2 ? "active" : ""} aria-pressed={announcementPage === 2} onClick={() => setAnnouncementPage(2)}>Seite 2</button>
            </div>
          )}
          {downloadStatus && <p className="status-message" aria-live="polite">{downloadStatus}</p>}
        </section>

        <section className="form-column" aria-labelledby="details-title">
          <div className="panel-heading form-heading">
            <div>
              <p className="section-kicker">Inhalte</p>
              <h2 id="details-title">
                {department === "general"
                  ? "Ankündigung bearbeiten"
                  : postType === "result"
                    ? "Ergebnis bearbeiten"
                    : matchdayDesign === "photo"
                      ? "Matchday bearbeiten"
                      : "Spieldaten bearbeiten"}
              </h2>
            </div>
            <button className="text-button reset-button" type="button" onClick={resetForm}>Zurücksetzen</button>
          </div>

          {department === "football" && (
            <div className="form-section">
              <h3>Spielort</h3>
              <div>
                <span className="field-label">Heim / Auswärts</span>
                <div className="selector-options compact">
                  <button type="button" className={form.homeAway === "home" ? "active" : ""} onClick={() => chooseHomeAway("home")}>Heim</button>
                  <button type="button" className={form.homeAway === "away" ? "active" : ""} onClick={() => chooseHomeAway("away")}>Auswärts</button>
                </div>
              </div>
            </div>
          )}

          {department === "football" && postType === "matchday" && matchdayDesign === "photo" && (
            <div className="form-section">
              <h3>Anordnung</h3>
              <div>
                <span className="field-label">Datum und Logos am Rand</span>
                <div className="selector-options compact">
                  <button
                    type="button"
                    className={photoMatchdayState.edge === "top" ? "active" : ""}
                    aria-pressed={photoMatchdayState.edge === "top"}
                    onClick={() => updatePhotoMatchdayState("edge", "top")}
                  >
                    Oben
                  </button>
                  <button
                    type="button"
                    className={photoMatchdayState.edge === "bottom" ? "active" : ""}
                    aria-pressed={photoMatchdayState.edge === "bottom"}
                    onClick={() => updatePhotoMatchdayState("edge", "bottom")}
                  >
                    Unten
                  </button>
                </div>
              </div>
              <div className="range-grid">
                <label htmlFor="photo-text-position" aria-label="Höhe des Textblocks">
                  <span className="range-label-row">
                    <span className="field-label">Höhe des Textblocks</span>
                    <output htmlFor="photo-text-position">{photoMatchdayState.textPosition} %</output>
                  </span>
                  <input
                    id="photo-text-position"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={photoMatchdayState.textPosition}
                    onChange={(event) => updatePhotoMatchdayState("textPosition", Number(event.target.value))}
                  />
                </label>
              </div>
              <p className="helper-text">Der Textblock bleibt vollständig sichtbar, kann bis etwa 60 % der Posthöhe verschoben werden und hält automatisch Abstand zu Datum und Logos.</p>
            </div>
          )}

          {department === "football" && (
            <div className="form-section">
              <h3>Bilder</h3>
              <div className="upload-grid">
                <OpponentLogoPicker
                  key={selectedOpponentEntry?.id ?? (assets.opponentLogo ? "custom" : "none")}
                  entries={OPPONENT_CATALOG}
                  selectedEntry={selectedOpponentEntry}
                  image={assets.opponentLogo}
                  opponentName={form.opponentName}
                  onOpponentNameChange={(value) => updateForm("opponentName", value)}
                  onSelect={(entry) => void chooseOpponent(entry)}
                  onUpload={loadOpponentUpload}
                  onClear={clearOpponentLogo}
                />
                {(postType === "result" || (postType === "matchday" && matchdayDesign === "photo")) && (
                  <UploadField
                    id="background-image"
                    label="Hintergrundbild"
                    hasImage={Boolean(assets.backgroundImage)}
                    onChange={loadBackgroundUpload}
                    onEdit={editBackgroundImage}
                    onRemove={removeBackgroundImage}
                  />
                )}
              </div>
              <p className="helper-text">Wähle ein vorhandenes Gegnerlogo oder lade ein eigenes hoch. Den Gegnernamen kannst du direkt darunter anpassen. {(postType === "result" || (postType === "matchday" && matchdayDesign === "photo")) ? "Das Hintergrundbild kannst du lokal zuschneiden und filtern." : ""} Eigene Bilder bleiben nur in dieser Browser-Sitzung.</p>
            </div>
          )}

          {department === "football" && postType === "matchday" && matchdayDesign === "classic" && (
            <div className="form-section">
              <h3>Spielinformationen</h3>
              <div className="field-grid">
                <label>
                  <span className="field-label">Liga / Überschrift</span>
                  <input value={form.competition} maxLength={45} onChange={(event) => updateForm("competition", event.target.value)} />
                </label>
                <label>
                  <span className="field-label">Region / Untere Zeile</span>
                  <input value={form.competitionRegion} maxLength={45} onChange={(event) => updateForm("competitionRegion", event.target.value)} />
                </label>
                <label>
                  <span className="field-label">Spieltag / Obere Zeile</span>
                  <input value={form.round} maxLength={29} onChange={(event) => updateForm("round", event.target.value)} />
                </label>
              </div>
              <div className="field-block">
                <span className="field-label">Darstellung Datum / Uhrzeit</span>
                <div className="selector-options compact three-options">
                  <button type="button" className={form.dateDisplay === "date-time" ? "active" : ""} onClick={() => updateForm("dateDisplay", "date-time")}>Datum + Uhrzeit</button>
                  <button type="button" className={form.dateDisplay === "day-date" ? "active" : ""} onClick={() => updateForm("dateDisplay", "day-date")}>Tag + Datum</button>
                  <button type="button" className={form.dateDisplay === "custom" ? "active" : ""} onClick={() => updateForm("dateDisplay", "custom")}>Eigene</button>
                </div>
              </div>
              {form.dateDisplay === "custom" && (
                <div className="field-grid field-block">
                  <label>
                    <span className="field-label">Oberzeile</span>
                    <input value={form.customDateUpperLine} maxLength={45} placeholder="Eigene Oberzeile" onChange={(event) => updateForm("customDateUpperLine", event.target.value)} />
                  </label>
                  <label>
                    <span className="field-label">Große Zeile</span>
                    <input value={form.customDateLargeLine} maxLength={32} placeholder="Eigene große Zeile" onChange={(event) => updateForm("customDateLargeLine", event.target.value)} />
                  </label>
                </div>
              )}
              {form.dateDisplay !== "custom" && (
                <div className="field-grid field-block date-time-fields">
                  <label>
                    <span className="field-label">Datum</span>
                    <input type="date" value={form.date} onChange={(event) => updateForm("date", event.target.value)} />
                  </label>
                  <label>
                    <span className="field-label">Anstoß</span>
                    <input type="time" value={form.time} onChange={(event) => updateForm("time", event.target.value)} />
                  </label>
                </div>
              )}
              <div className="field-grid field-block">
                <label>
                  <span className="field-label">Spielstätte</span>
                  <input value={form.venue} maxLength={55} onChange={(event) => updateForm("venue", event.target.value)} />
                </label>
                <label>
                  <span className="field-label">Adresse</span>
                  <input value={form.venueAddress} maxLength={65} onChange={(event) => updateForm("venueAddress", event.target.value)} />
                </label>
              </div>
            </div>
          )}

          {department === "football" && postType === "matchday" && matchdayDesign === "photo" && (
            <div className="form-section">
              <h3>Spielinformationen</h3>
              <div className="field-grid">
                <label>
                  <span className="field-label">Datum</span>
                  <input type="date" value={form.date} onChange={(event) => updateForm("date", event.target.value)} />
                </label>
                <label>
                  <span className="field-label">Anstoß</span>
                  <input type="time" value={form.time} onChange={(event) => updateForm("time", event.target.value)} />
                </label>
                <label>
                  <span className="field-label">Ort</span>
                  <input value={form.venue} maxLength={55} onChange={(event) => updateForm("venue", event.target.value)} />
                </label>
              </div>
            </div>
          )}

          {department === "football" && postType === "result" && (
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
            </div>
          )}

          {department === "football" && postType === "result" && (
            <div className="form-section">
              <h3>Texte</h3>
              <label className="field-block no-top-margin">
                <span className="field-label">Untere Zeile (optional)</span>
                <input value={form.footer} maxLength={40} placeholder="z. B. DERBYSIEGER" onChange={(event) => updateForm("footer", event.target.value)} />
              </label>
            </div>
          )}

          {department === "general" && formatKey === "post" && (
            <div className="form-section">
              <h3>Seiten</h3>
              <div>
                <span className="field-label">Umfang des Posts</span>
                <div className="selector-options compact">
                  <button type="button" className={announcementPageCount === 1 ? "active" : ""} aria-pressed={announcementPageCount === 1} onClick={() => chooseAnnouncementPageCount(1)}>1 Seite</button>
                  <button type="button" className={announcementPageCount === 2 ? "active" : ""} aria-pressed={announcementPageCount === 2} onClick={() => chooseAnnouncementPageCount(2)}>2 Seiten</button>
                </div>
              </div>
            </div>
          )}

          {department === "general" && (
            <div className="form-section">
              <h3>Titelseite</h3>
              <label className="field-block no-top-margin">
                <span className="field-label">Titel</span>
                <textarea className="textarea-title" value={announcementForm.title} maxLength={180} rows={3} placeholder={ANNOUNCEMENT_PLACEHOLDERS.title} onChange={(event) => updateAnnouncementForm("title", event.target.value)} />
              </label>
              <label className="field-block">
                <span className="field-label">Untere Zeile bold</span>
                <input value={announcementForm.subtitleBold} maxLength={80} placeholder={ANNOUNCEMENT_FIELD_PLACEHOLDERS.subtitleBold} onChange={(event) => updateAnnouncementForm("subtitleBold", event.target.value)} />
              </label>
              <label className="field-block">
                <span className="field-label">Untere Zeile light</span>
                <textarea value={announcementForm.subtitleLight} maxLength={180} rows={3} placeholder={ANNOUNCEMENT_FIELD_PLACEHOLDERS.subtitleLight} onChange={(event) => updateAnnouncementForm("subtitleLight", event.target.value)} />
              </label>
              <p className="helper-text">Titel und leichte Unterzeile umbrechen automatisch; manuelle Zeilenumbrüche werden übernommen. Das SVB-Logo wird aus den vorhandenen Vereinsdateien eingesetzt.</p>
            </div>
          )}

          {department === "general" && formatKey === "post" && announcementPageCount === 2 && (
            <div className="form-section">
              <h3>Seite 2</h3>
              <label className="field-block no-top-margin">
                <span className="field-label">Headline</span>
                <textarea value={announcementForm.secondHeadline} maxLength={120} rows={2} placeholder={ANNOUNCEMENT_PLACEHOLDERS.secondHeadline} onChange={(event) => updateAnnouncementForm("secondHeadline", event.target.value)} />
              </label>
              <label className="field-block">
                <span className="field-label">Fließtext</span>
                <textarea className="textarea-body" value={announcementForm.body} maxLength={1800} rows={10} placeholder={ANNOUNCEMENT_PLACEHOLDERS.body} onChange={(event) => updateAnnouncementForm("body", event.target.value)} />
              </label>
              <label className="field-block">
                <span className="field-label">Disclaimer</span>
                <textarea value={announcementForm.disclaimer} maxLength={240} rows={2} onChange={(event) => updateAnnouncementForm("disclaimer", event.target.value)} />
              </label>
              <p className="helper-text">Der Fließtext startet bei 30 px, bleibt als Block mittig ausgerichtet und wird bei Platzmangel automatisch bis auf 20 px verkleinert.</p>
            </div>
          )}
        </section>
      </div>
      {backgroundEditorImage && (
        <ImageEditorDialog
          initialImage={backgroundEditorImage}
          formatKey={formatKey}
          format={selectedFormat}
          renderPreview={(canvas, image) => {
            const renderedPost = document.createElement("canvas");
            renderGraphic(
              renderedPost,
              formatKey,
              postType,
              form,
              { ...assets, backgroundImage: image },
              teamDesign,
              matchdayDesign,
              photoMatchdayState,
              department,
              announcementForm,
              announcementPage,
              announcementPageCount,
            );
            const context = canvas.getContext("2d", { colorSpace: "srgb" });
            if (!context) return;
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(renderedPost, 0, 0, canvas.width, canvas.height);
          }}
          onApply={applyBackgroundImage}
          onCancel={() => setBackgroundEditorImage(null)}
        />
      )}
    </main>
  );
}
