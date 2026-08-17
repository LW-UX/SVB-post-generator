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
  competitionRegion: string;
  round: string;
  date: string;
  time: string;
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
  venue: "Sportanlage Bergheim",
  venueAddress: "",
  headline: "MATCHDAY",
  clubScore: "3",
  opponentScore: "1",
  halfTime: "1:0",
  footer: "Gemeinsam für den SVB",
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
    bottomCornerStartX: 0.85,
    bottomCornerRightY: 0.5,
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
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value.toUpperCase() || "DATUM";
  const date = new Date(year, month - 1, day, 12);
  return `${WEEKDAYS[date.getDay()]}, ${day}. ${FULL_MONTHS[month - 1]}`;
}

function formatRound(value: string) {
  const trimmed = value.trim();
  const conventional = trimmed.match(/^spieltag\s+(\d+)$/i);
  if (conventional) return `${conventional[1]}. SPIELTAG`;
  if (/^\d+$/.test(trimmed)) return `${trimmed}. SPIELTAG`;
  return trimmed.toUpperCase() || "SPIELTAG";
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
  fallback: string,
  color: string,
  fallbackSize: number,
  tintColor?: string,
) {
  if (image && drawImageContained(context, image, centerX, centerY, maxWidth, maxHeight, tintColor)) return;
  drawMatchdayText(context, fallback.slice(0, 3), centerX, centerY, color, 700, fallbackSize);
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

  const leftName = form.homeAway === "home" ? form.clubName : form.opponentName;
  const rightName = form.homeAway === "home" ? form.opponentName : form.clubName;
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
    width * 0.62,
  );
  drawMatchdayText(
    context,
    form.competition,
    width * layout.headerX,
    height * layout.competitionY,
    textColor,
    700,
    largeTextSize,
    width * (formatKey === "widescreen" ? 0.34 : 0.72),
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
    leftName,
    textColor,
    smallTextSize,
    form.homeAway === "away" ? textColor : undefined,
  );
  drawMatchdayLogo(
    context,
    rightLogo,
    width * layout.rightLogoX,
    height * layout.logoY,
    width * layout.logoMaxWidth,
    height * layout.logoMaxHeight,
    rightName,
    textColor,
    smallTextSize,
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
    formatMatchdayDate(form.date),
    width / 2,
    height * layout.dateY,
    textColor,
    300,
    smallTextSize,
    width * 0.8,
  );
  drawMatchdayText(
    context,
    `${form.time || "--:--"} UHR`,
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
  const [assets, setAssets] = useState<Assets>({ clubLogo: null, opponentLogo: null });
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
    const team = teamDesign === "first" ? "erste" : "zweite";
    return `svb-${team}-${postType === "matchday" ? "spieltag" : "ergebnis"}-${slugify(form.opponentName) || "gegner"}-${key}.png`;
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
    const exportScale = selectedFormat.exportScale;
    setDownloadStatus(`PNG in ${exportScale}× wird erstellt …`);
    const canvas = document.createElement("canvas");
    renderGraphic(canvas, formatKey, postType, form, assets, teamDesign, exportScale);
    await downloadCanvas(canvas, formatKey);
    setDownloadStatus(`PNG in ${exportScale}× wurde erstellt.`);
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
              Export {selectedFormat.width * selectedFormat.exportScale} × {selectedFormat.height * selectedFormat.exportScale} px
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
                <span className="field-label">Liga</span>
                <input value={form.competition} maxLength={45} onChange={(event) => updateForm("competition", event.target.value)} />
              </label>
              <label>
                <span className="field-label">Staffel / Region</span>
                <input value={form.competitionRegion} maxLength={45} onChange={(event) => updateForm("competitionRegion", event.target.value)} />
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

          {postType === "result" && (
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
          )}

          <div className="form-section">
            <h3>Bilder</h3>
            <div className="upload-grid">
              <UploadField id="opponent-logo" label="Gegnerlogo" image={assets.opponentLogo} onChange={loadAsset("opponentLogo")} onRemove={() => setAssets((current) => ({ ...current, opponentLogo: null }))} />
            </div>
            <p className="helper-text">Das SVB-Logo, die Inter-Schrift und das Mannschaftsdesign werden automatisch gewählt. Das Gegnerlogo wird passend weiß oder blau eingefärbt und bleibt nur in dieser Browser-Sitzung.</p>
          </div>

          <div className="mobile-download">
            <button className="primary-button" type="button" onClick={downloadSelected}>PNG herunterladen</button>
          </div>
        </section>
      </div>
    </main>
  );
}
