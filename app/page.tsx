"use client";

import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";

type PostType = "matchday" | "result";
type FormatKey = "post" | "story" | "landscape" | "widescreen";
type HomeAway = "home" | "away";
type TeamDesign = "first" | "second";
type DateDisplay = "date-time" | "day-date";

type FormState = {
  clubName: string;
  opponentName: string;
  competition: string;
  competitionRegion: string;
  round: string;
  date: string;
  time: string;
  dateDisplay: DateDisplay;
  venue: string;
  venueAddress: string;
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
  backgroundImage: HTMLImageElement | null;
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
  { label: string; clubName: string; competition: string }
> = {
  first: { label: "1. Mannschaft", clubName: "SV Bergheim", competition: "Kreisklasse" },
  second: { label: "2. Mannschaft", clubName: "SV Bergheim II", competition: "A-Klasse" },
};

const INITIAL_FORM: FormState = {
  clubName: "SV Bergheim",
  opponentName: "TSV Königsbrunn II",
  competition: "Kreisklasse",
  competitionRegion: "Augsburg Süd",
  round: "1. Spieltag",
  date: "2026-08-23",
  time: "15:00",
  dateDisplay: "date-time",
  venue: "Mößmann Sportanlage",
  venueAddress: "Am Langen Berg 5, 86199 Augsburg",
  headline: "MATCHDAY",
  clubScore: "2",
  opponentScore: "0",
  halfTime: "1:0",
  footer: "",
  homeAway: "home",
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
  const imageData = tintedContext.getImageData(0, 0, tintedCanvas.width, tintedCanvas.height);
  const pixels = imageData.data;
  for (let index = 0; index < pixels.length; index += 4) {
    const distanceFromWhite = Math.max(
      255 - pixels[index],
      255 - pixels[index + 1],
      255 - pixels[index + 2],
    );
    const foregroundOpacity = Math.min(1, Math.max(0, (distanceFromWhite - 12) / 36));
    pixels[index + 3] = Math.round(pixels[index + 3] * foregroundOpacity);
  }
  tintedContext.putImageData(imageData, 0, 0);
  tintedContext.globalCompositeOperation = "source-in";
  tintedContext.fillStyle = tintColor;
  tintedContext.fillRect(0, 0, tintedCanvas.width, tintedCanvas.height);
  context.drawImage(tintedCanvas, centerX - width / 2, centerY - height / 2, width, height);
  return true;
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (sourceWidth <= 0 || sourceHeight <= 0) return;

  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;
  context.drawImage(
    image,
    (width - renderedWidth) / 2,
    (height - renderedHeight) / 2,
    renderedWidth,
    renderedHeight,
  );
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
  const smallDateLine = form.dateDisplay === "day-date"
    ? weekday
    : formatMatchdayDate(form.date);
  const largeDateLine = form.dateDisplay === "day-date"
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

function renderResultGraphic(
  context: CanvasRenderingContext2D,
  form: FormState,
  assets: Assets,
  teamDesign: TeamDesign,
) {
  const { width, height } = RESULT_POST_FORMAT;
  const blue = "#00448a";
  const isHomeMatch = form.homeAway === "home";
  const isFirstTeam = teamDesign === "first";
  const footerY = 1215;
  const diagonalTopY = 982;
  const logoDiagonalSlope = (2245.41 - 164.95) / (2040.45 - 411.84);
  const diagonalBottomX = width - (height - diagonalTopY) / logoDiagonalSlope;
  const contentY = 1281;

  context.fillStyle = "#a6a6a6";
  context.fillRect(0, 0, width, height);
  if (assets.backgroundImage) {
    drawImageCover(context, assets.backgroundImage, width, height);
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

  const clubX = 857;
  const clubMaxWidth = 74;
  const clubMaxHeight = 94;
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
  const opponentX = isHomeMatch ? 1025 : 689;
  const scoreX = isHomeMatch ? 941 : 773;
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
      66,
      90,
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
    context.fillText(form.footer.toUpperCase(), 40, contentY);
  }
  context.letterSpacing = "0px";
}

function getGraphicFormat(type: PostType, formatKey: FormatKey) {
  return type === "result" && formatKey === "post"
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
  scale = 1,
) {
  const format = getGraphicFormat(type, formatKey);
  canvas.width = format.width * scale;
  canvas.height = format.height * scale;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.scale(scale, scale);

  const width = format.width;
  const height = format.height;

  if (type === "result" && formatKey === "post") {
    renderResultGraphic(context, form, assets, teamDesign);
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
  const [assets, setAssets] = useState<Assets>({
    clubLogo: null,
    opponentLogo: null,
    backgroundImage: null,
  });
  const [downloadStatus, setDownloadStatus] = useState("");
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    let isActive = true;
    Promise.all([
      document.fonts.load('300 40px "Inter"'),
      document.fonts.load('700 100px "Inter"'),
    ]).finally(() => {
      if (isActive) setFontReady(true);
    });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      renderGraphic(canvasRef.current, formatKey, postType, form, assets, teamDesign);
    }
  }, [formatKey, postType, form, assets, teamDesign, fontReady]);

  useEffect(() => {
    const image = new Image();
    const fileName = postType === "result"
      ? "svb-logo-farbe-1906.svg"
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
  }, [postType, teamDesign]);

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

  const selectedFormat = getGraphicFormat(postType, formatKey);
  const availableFormats: FormatKey[] = postType === "result"
    ? ["post"]
    : Object.keys(FORMATS) as FormatKey[];

  function updateForm<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function chooseType(type: PostType) {
    setPostType(type);
    if (type === "result") setFormatKey("post");
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
      competition: TEAM_DESIGNS[design].competition,
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
    const team = teamDesign === "first" ? "Erste" : "Zweite";
    const venue = form.homeAway === "home" ? "Heim" : "Auswaerts";
    return `SVB ${FORMAT_FILE_NAMES[key]} ${team} ${roundFilePart(form.round)} ${venue}.png`;
  }

  function createPngBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
  }

  async function downloadCanvas(canvas: HTMLCanvasElement, key: FormatKey) {
    const blob = await createPngBlob(canvas);
    if (!blob) {
      setDownloadStatus("Das Bild konnte nicht erstellt werden.");
      return false;
    }

    const name = fileName(key);
    const file = new File([blob], name, { type: "image/png" });
    const isMobileViewport = window.matchMedia("(max-width: 820px)").matches;
    const canShareFile = isMobileViewport
      && typeof navigator.share === "function"
      && typeof navigator.canShare === "function"
      && navigator.canShare({ files: [file] });

    if (canShareFile) {
      try {
        await navigator.share({
          files: [file],
          title: "SVB Social Media Grafik",
        });
        return true;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setDownloadStatus("Speichern wurde abgebrochen.");
          return false;
        }
        // Eingebettete Browser können die Web-Share-API blockieren. In diesem
        // Fall wird die Datei über einen regulären Download-Link gespeichert.
      }
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return true;
  }

  async function downloadSelected() {
    const exportScale = selectedFormat.exportScale;
    const exportWidth = selectedFormat.width * exportScale;
    const exportHeight = selectedFormat.height * exportScale;
    setDownloadStatus(`PNG mit ${exportWidth} × ${exportHeight} px wird erstellt …`);
    const canvas = document.createElement("canvas");
    renderGraphic(canvas, formatKey, postType, form, assets, teamDesign, exportScale);
    const downloaded = await downloadCanvas(canvas, formatKey);
    if (downloaded) {
      setDownloadStatus(`PNG mit ${exportWidth} × ${exportHeight} px wurde erstellt.`);
    }
  }

  async function downloadAll() {
    setDownloadStatus("Vier Formate werden erstellt …");
    for (const key of Object.keys(FORMATS) as FormatKey[]) {
      const canvas = document.createElement("canvas");
      renderGraphic(canvas, key, postType, form, assets, teamDesign, FORMATS[key].exportScale);
      await downloadCanvas(canvas, key);
    }
    setDownloadStatus("Alle vier Formate wurden erstellt.");
  }

  function resetForm() {
    setForm({
      ...INITIAL_FORM,
      clubName: TEAM_DESIGNS[teamDesign].clubName,
      competition: TEAM_DESIGNS[teamDesign].competition,
      headline: postType === "matchday" ? "MATCHDAY" : "FULL TIME",
    });
    setAssets((current) => ({
      ...current,
      opponentLogo: null,
      backgroundImage: null,
    }));
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
          <div className={`format-options ${postType === "result" ? "single-option" : ""}`}>
            {availableFormats.map((key) => (
              <button key={key} type="button" className={formatKey === key ? "active" : ""} onClick={() => setFormatKey(key)}>
                <span>{FORMATS[key].label}</span>
                <small>{FORMATS[key].short}</small>
              </button>
            ))}
          </div>
          {postType === "result" && <small className="format-note">Weitere Formate folgen.</small>}
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
              Export {selectedFormat.width * selectedFormat.exportScale} × {selectedFormat.height * selectedFormat.exportScale} px
            </span>
          </div>
          <div className={`canvas-stage canvas-${formatKey}`}>
            <canvas ref={canvasRef} aria-label={`Vorschau für ${selectedFormat.label}`} />
          </div>
          <div className={`preview-actions ${postType === "result" ? "single-action" : ""}`}>
            <button className="primary-button" type="button" onClick={downloadSelected}>PNG herunterladen</button>
            {postType === "matchday" && <button className="secondary-button" type="button" onClick={downloadAll}>Alle 4 Formate</button>}
          </div>
          <p className="status-message" aria-live="polite">{downloadStatus || "Keine Datei wird hochgeladen oder gespeichert."}</p>
        </section>

        <section className="form-column" aria-labelledby="details-title">
          <div className="panel-heading form-heading">
            <div>
              <p className="section-kicker">Inhalte</p>
              <h2 id="details-title">{postType === "result" ? "Ergebnis bearbeiten" : "Spieldaten bearbeiten"}</h2>
            </div>
            <button className="text-button reset-button" type="button" onClick={resetForm}>Zurücksetzen</button>
          </div>

          <div className="form-section">
            <h3>Spielort</h3>
            <div>
              <span className="field-label">Heim / Auswärts</span>
              <div className="segmented-control compact">
                <button type="button" className={form.homeAway === "home" ? "active" : ""} onClick={() => updateForm("homeAway", "home")}>Heim</button>
                <button type="button" className={form.homeAway === "away" ? "active" : ""} onClick={() => updateForm("homeAway", "away")}>Auswärts</button>
              </div>
            </div>
          </div>

          {postType === "matchday" && (
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
                <label>
                  <span className="field-label">Datum</span>
                  <input type="date" value={form.date} onChange={(event) => updateForm("date", event.target.value)} />
                </label>
                <label>
                  <span className="field-label">Anstoß</span>
                  <input type="time" value={form.time} onChange={(event) => updateForm("time", event.target.value)} />
                </label>
              </div>
              <div className="field-block">
                <span className="field-label">Darstellung Datum / Uhrzeit</span>
                <div className="segmented-control compact">
                  <button type="button" className={form.dateDisplay === "date-time" ? "active" : ""} onClick={() => updateForm("dateDisplay", "date-time")}>Datum + Uhrzeit</button>
                  <button type="button" className={form.dateDisplay === "day-date" ? "active" : ""} onClick={() => updateForm("dateDisplay", "day-date")}>Tag + Datum</button>
                </div>
              </div>
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
            </div>
          )}

          {postType === "result" && (
            <div className="form-section">
              <h3>Texte</h3>
              <label className="field-block no-top-margin">
                <span className="field-label">Untere Zeile (optional)</span>
                <input value={form.footer} maxLength={40} placeholder="z. B. DERBYSIEGER" onChange={(event) => updateForm("footer", event.target.value)} />
              </label>
            </div>
          )}

          <div className="form-section">
            <h3>Bilder</h3>
            <div className="upload-grid">
              <UploadField id="opponent-logo" label="Gegnerlogo" image={assets.opponentLogo} onChange={loadAsset("opponentLogo")} onRemove={() => setAssets((current) => ({ ...current, opponentLogo: null }))} />
              {postType === "result" && <UploadField id="background-image" label="Hintergrundbild" image={assets.backgroundImage} onChange={loadAsset("backgroundImage")} onRemove={() => setAssets((current) => ({ ...current, backgroundImage: null }))} />}
            </div>
            <p className="helper-text">Das SVB-Logo, die Inter-Schrift und das Mannschaftsdesign werden automatisch gewählt. {postType === "result" ? "Das Hintergrundbild wird formatfüllend zugeschnitten; das Gegnerlogo erscheint automatisch in Weiß." : "Das Gegnerlogo wird passend weiß oder blau eingefärbt."} Die Bilder bleiben nur in dieser Browser-Sitzung.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
