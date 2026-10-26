import type { PDFFont } from "pdf-lib";
import cormorantFontUrl from "./assets/CormorantGaramond-Light.ttf?url";
import certificateTemplatePdfUrl from "./assets/certificates/SVB-Urkunden-2026-blanko.pdf?url";
import longOneDigitPreviewUrl from "./assets/certificates/certificate-template-1.png?url";
import longTwoDigitsPreviewUrl from "./assets/certificates/certificate-template-2.png?url";
import shortPreviewUrl from "./assets/certificates/certificate-template-3.png?url";
import oneYearPreviewUrl from "./assets/certificates/certificate-template-4.png?url";
import {
  getCertificateVariant,
  normalizeCertificateYears,
} from "./certificate-logic";
import type { CertificateVariant } from "./certificate-logic";

export type CertificateFormState = {
  name: string;
  years: number;
};

export const INITIAL_CERTIFICATE_FORM: CertificateFormState = {
  name: "",
  years: 1,
};

export const CERTIFICATE_FORMAT = {
  label: "Mitgliedsurkunde",
  short: "A4",
  width: 595,
  height: 842,
  exportScale: 1 as const,
};

const PAGE_WIDTH = 595.276;
const PAGE_HEIGHT = 841.89;
const NAME_X = 184.7874;
const NAME_Y = 284.3896;
const NAME_SIZE = 36;
const NAME_MIN_SIZE = 24;
const NAME_MAX_WIDTH = 325;
const NUMBER_X = 184.7874;
const NUMBER_SIZE = 24;
const NUMBER_TARGET_CENTER_Y = 172.25;
const BLUE = "#1c4b94";

const TEMPLATE_DETAILS: Record<
  CertificateVariant,
  { pageIndex: number; previewUrl: string }
> = {
  "long-one-digit": {
    pageIndex: 0,
    previewUrl: longOneDigitPreviewUrl,
  },
  "long-two-digits": {
    pageIndex: 1,
    previewUrl: longTwoDigitsPreviewUrl,
  },
  short: {
    pageIndex: 2,
    previewUrl: shortPreviewUrl,
  },
  "one-year": {
    pageIndex: 3,
    previewUrl: oneYearPreviewUrl,
  },
};

function getTemplateDetails(years: number) {
  return TEMPLATE_DETAILS[getCertificateVariant(years)];
}

export function getCertificatePreviewUrl(years: number) {
  return getTemplateDetails(years).previewUrl;
}

function fitCanvasNameFont(
  context: CanvasRenderingContext2D,
  name: string,
  coordinateScale: number,
) {
  let size = NAME_SIZE;
  while (size > NAME_MIN_SIZE) {
    context.font = `${size * coordinateScale}px "Cormorant Garamond", serif`;
    if (context.measureText(name).width <= NAME_MAX_WIDTH * coordinateScale) return size;
    size -= 0.5;
  }
  return NAME_MIN_SIZE;
}

export function renderCertificateGraphic(
  canvas: HTMLCanvasElement,
  form: CertificateFormState,
  template: HTMLImageElement | null,
) {
  canvas.width = CERTIFICATE_FORMAT.width;
  canvas.height = CERTIFICATE_FORMAT.height;
  const context = canvas.getContext("2d");
  if (!context) return;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (template) context.drawImage(template, 0, 0, canvas.width, canvas.height);

  const scaleX = canvas.width / PAGE_WIDTH;
  const scaleY = canvas.height / PAGE_HEIGHT;
  const name = form.name.trim();
  if (name) {
    const nameSize = fitCanvasNameFont(context, name, scaleX);
    context.font = `${nameSize * scaleX}px "Cormorant Garamond", serif`;
    context.fillStyle = BLUE;
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.fillText(name, NAME_X * scaleX, (PAGE_HEIGHT - NAME_Y) * scaleY);
  }

  const years = normalizeCertificateYears(form.years);
  context.font = `${NUMBER_SIZE * scaleX}px "Cormorant Garamond", serif`;
  context.fillStyle = BLUE;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  const yearsText = String(years);
  const numberMetrics = context.measureText(yearsText);
  const numberCenterY = (PAGE_HEIGHT - NUMBER_TARGET_CENTER_Y) * scaleY;
  const numberBaselineY = numberCenterY
    + (numberMetrics.actualBoundingBoxAscent - numberMetrics.actualBoundingBoxDescent) / 2;
  context.fillText(yearsText, NUMBER_X * scaleX, numberBaselineY);
}

async function fetchBytes(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Datei konnte nicht geladen werden: ${response.status}`);
  return response.arrayBuffer();
}

function fitPdfNameSize(font: PDFFont, name: string) {
  let size = NAME_SIZE;
  while (size > NAME_MIN_SIZE && font.widthOfTextAtSize(name, size) > NAME_MAX_WIDTH) {
    size -= 0.5;
  }
  return size;
}

export async function createCertificatePdf(form: CertificateFormState) {
  const name = form.name.trim();
  if (!name) throw new Error("Bitte einen Namen eingeben.");

  const years = normalizeCertificateYears(form.years);
  const details = getTemplateDetails(years);
  const [{ default: fontkit }, { PDFDocument, rgb }, templateBytes, fontBytes] = await Promise.all([
    import("@pdf-lib/fontkit"),
    import("pdf-lib"),
    fetchBytes(certificateTemplatePdfUrl),
    fetchBytes(cormorantFontUrl),
  ]);

  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  document.setTitle(`Mitgliedsurkunde für ${name}`);
  document.setAuthor("Sportverein Bergheim");
  document.setCreator("SVB Post-Generator");

  const [templatePage] = await document.embedPdf(templateBytes, [details.pageIndex]);
  const font = await document.embedFont(fontBytes, { subset: false });
  const fontkitFont = fontkit.create(new Uint8Array(fontBytes));
  const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawPage(templatePage, {
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
  });

  const color = rgb(28 / 255, 75 / 255, 148 / 255);
  page.drawText(name, {
    x: NAME_X,
    y: NAME_Y,
    size: fitPdfNameSize(font, name),
    font,
    color,
  });
  const yearsText = String(years);
  const numberBounds = fontkitFont.layout(yearsText).bbox;
  const numberCenterOffset = (numberBounds.minY + numberBounds.maxY)
    / 2
    * NUMBER_SIZE
    / fontkitFont.unitsPerEm;
  page.drawText(yearsText, {
    x: NUMBER_X,
    y: NUMBER_TARGET_CENTER_Y - numberCenterOffset,
    size: NUMBER_SIZE,
    font,
    color,
  });

  return document.save();
}

export function certificateFileName(name: string) {
  const safeName = name
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "Mitglied";
  return `SVB Urkunde ${safeName}.pdf`;
}
