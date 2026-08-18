import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders the SVB generator shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>SVB Social Media Studio<\/title>/i);
  assert.match(html, /Spieltagsankündigung/);
  assert.match(html, /Ergebnismeldung/);
  assert.match(html, /Allgemein/);
  assert.match(html, /Instagram Story/);
  assert.match(html, /16:9 Querformat/);
  assert.doesNotMatch(html, /Alles bleibt auf diesem Gerät/);
  assert.doesNotMatch(html, /Ein Spiel\. Vier Formate\. Sofort bereit\./i);
  assert.match(html, /PNG herunterladen/);
  assert.doesNotMatch(html, />Mannschaften</);
  assert.doesNotMatch(html, />Vereinsname</);
  assert.doesNotMatch(html, />Gegner</);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps uploads local and supports every requested format", async () => {
  const [page, styles, readme, packageJson, workflow, pagesViteConfig, postcssConfig] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
    readFile(new URL("../vite.pages.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../postcss.config.mjs", import.meta.url), "utf8"),
  ]);

  assert.match(page, /post:\s*\{[^}]*1080[^}]*1350[^}]*exportScale:\s*2/s);
  assert.match(page, /story:\s*\{[^}]*1080[^}]*1920[^}]*exportScale:\s*2/s);
  assert.match(page, /landscape:\s*\{[^}]*1500[^}]*1000[^}]*exportScale:\s*1/s);
  assert.match(page, /widescreen:\s*\{[^}]*1920[^}]*1080[^}]*exportScale:\s*1/s);
  assert.match(page, /type="file"/);
  assert.match(page, /type Department = "football" \| "general"/);
  assert.match(page, /type AnnouncementPageCount = 1 \| 2/);
  assert.match(page, /useState<Department>\("football"\)/);
  assert.match(page, /useState<AnnouncementPageCount>\(2\)/);
  assert.match(page, /const INITIAL_ANNOUNCEMENT_FORM:[\s\S]*?title:\s*""[\s\S]*?subtitleBold:\s*""[\s\S]*?subtitleLight:\s*""[\s\S]*?secondHeadline:\s*""[\s\S]*?body:\s*""[\s\S]*?disclaimer:\s*""/);
  assert.match(page, /const ANNOUNCEMENT_PLACEHOLDERS = \{[\s\S]*?title:\s*"Überschrift"[\s\S]*?subtitleBold:\s*"Untere Zeile Bold"[\s\S]*?subtitleLight:\s*"Untere Zeile Light"[\s\S]*?secondHeadline:\s*"Überschrift"/);
  assert.match(page, /bodyValue = form\.body \|\| ANNOUNCEMENT_PLACEHOLDERS\.body/);
  assert.match(page, /if \(form\.disclaimer\.trim\(\)\)/);
  assert.match(page, />Fußball</);
  assert.match(page, />Allgemein</);
  assert.ok(page.indexOf(">Allgemein</") < page.indexOf(">Fußball</"));
  assert.ok(
    page.indexOf('className="department-card"') <
      page.indexOf("className={`selector-card selector-card-${department}`}"),
  );
  assert.match(page, />Ankündigung</);
  assert.match(page, />1 Seite</);
  assert.match(page, />2 Seiten</);
  assert.match(page, /Vorschauseite auswählen/);
  assert.match(page, /Ankündigung bearbeiten/);
  assert.match(page, /Untere Zeile bold/);
  assert.match(page, /Untere Zeile light/);
  assert.match(page, /Fließtext/);
  assert.match(page, /Disclaimer/);
  assert.match(page, /SV Bergheim II/);
  assert.match(page, /chooseTeamDesign/);
  assert.match(page, /svb-logo-weiss-1906\.svg/);
  assert.match(page, /svb-logo-blau-1906\.svg/);
  assert.match(page, /#003076/);
  assert.match(page, /#14589e/);
  assert.match(page, /const MATCHDAY_ANGLE_DEGREES = 52/);
  assert.match(page, /Math\.tan\(\(MATCHDAY_ANGLE_DEGREES \* Math\.PI\) \/ 180\)/);
  assert.match(page, /landscape:\s*\{\s*cornerTopX:\s*0\.21/s);
  assert.match(page, /widescreen:\s*\{[^}]*bottomCornerStartX:\s*0\.834375[^}]*bottomCornerRightY:\s*0\.621778/s);
  assert.match(page, /function renderMatchdayGraphic\(/);
  assert.match(page, /function renderAnnouncementGraphic\(/);
  assert.match(page, /function drawAnnouncementTitleSlide\(/);
  assert.match(page, /function drawAnnouncementSecondSlide\(/);
  assert.match(page, /function wrapCanvasText\(/);
  assert.match(page, /for \(let size = 30; size >= 20; size -= 1\)/);
  assert.match(page, /master\.width = format\.width \* pageCount \* scale/);
  assert.match(page, /formatKey === "post"[\s\S]*?requestedPageCount[\s\S]*?: 1/s);
  assert.match(page, /context\.moveTo\(totalWidth, height \* 0\.73\)/);
  assert.match(page, /pageCount === 2[\s\S]*?drawAnnouncementSecondSlide/s);
  assert.match(page, /type DateDisplay = "date-time" \| "day-date"/);
  assert.match(page, /dateDisplay: "date-time"/);
  assert.match(page, /Datum \+ Uhrzeit/);
  assert.match(page, /Tag \+ Datum/);
  assert.match(page, /form\.dateDisplay === "day-date"/);
  assert.match(page, /venue: "Mößmann Sportanlage"/);
  assert.match(page, /venueAddress: "Am Langen Berg 5, 86199 Augsburg"/);
  assert.match(page, /Liga \/ Überschrift/);
  assert.match(page, /formatKey === "widescreen" \? 0\.38 : 0\.72/);
  assert.match(page, /Spieltag \/ Obere Zeile/);
  assert.match(page, /value=\{form\.round\} maxLength=\{29\}/);
  assert.match(page, /Region \/ Untere Zeile/);
  assert.doesNotMatch(page, /fallback\.slice\(0, 3\).*drawMatchdayText/s);
  assert.match(page, /competitionRegion/);
  assert.match(page, /venueAddress/);
  assert.match(page, /letterSpacing = "0\.04em"/);
  assert.match(page, /layout\.largeTextSize \?\? 100/);
  assert.match(page, /layout\.smallTextSize \?\? 40/);
  assert.match(page, /700 100px/);
  assert.match(page, /300 40px/);
  assert.match(page, /function drawImageContained\(/);
  assert.match(page, /Math\.min\(maxWidth \/ sourceWidth, maxHeight \/ sourceHeight\)/);
  assert.match(page, /globalCompositeOperation = "source-in"/);
  assert.match(page, /const distanceFromWhite = Math\.max\(/);
  assert.match(page, /putImageData\(imageData, 0, 0\)/);
  assert.match(page, /isBrand \? undefined : inkColor/);
  assert.match(page, /URL\.createObjectURL/);
  assert.match(page, /canvas\.toBlob/);
  assert.match(page, /navigator\.share/);
  assert.match(page, /function supportsSharingFiles\(files: File\[\]\)/);
  assert.match(page, /navigator\.canShare\(\{ files \}\)/);
  assert.match(page, /useSyncExternalStore/);
  assert.match(page, /function isFirefoxOnAndroid\(\)/);
  assert.match(page, /application\/x-binary/);
  assert.match(page, /„\$\{files\[0\]\.name\}“ wurde heruntergeladen/);
  assert.match(page, /files\.forEach\(downloadFile\)/);
  assert.match(page, /const pages: AnnouncementPage\[\] = isTwoPageAnnouncement \? \[1, 2\] : \[1\]/);
  assert.match(page, /Beide Seiten speichern \/ teilen/);
  assert.match(page, /Beide PNGs herunterladen/);
  assert.match(page, /Allgemein Ankuendigung\$\{pagePart\}\.png/);
  assert.match(readme, /allow="web-share"/);
  assert.match(page, /"Bild speichern \/ teilen" : "PNG herunterladen"/);
  assert.doesNotMatch(page, /downloadAll|Alle 4 speichern|Alle 4 Formate herunterladen/);
  assert.match(page, /Dieser Browser kann Bilder nicht direkt an die Fotobibliothek übergeben/);
  assert.doesNotMatch(page, /window\.matchMedia\("\(max-width: 820px\)"\)/);
  assert.match(page, /document\.body\.appendChild\(anchor\)/);
  assert.match(page, /value\.replaceAll\("\."\s*,\s*""\)\.trim\(\)/);
  assert.match(page, /SVB \$\{FORMAT_FILE_NAMES\[key\]\} \$\{team\} \$\{roundFilePart\(form\.round\)\} \$\{venue\}\.png/);
  assert.match(page, /teamDesign === "first" \? "Erste" : "Zweite"/);
  assert.match(page, /homeAway === "home" \? "Heim" : "Auswaerts"/);
  assert.doesNotMatch(page, /className="mobile-download"/);
  assert.match(styles, /\.segmented-control button\.active,[\s\S]*?\.format-options button\.active\s*\{[^}]*background:\s*#1e73b9/);
  assert.match(styles, /\.primary-button\s*\{[^}]*border:\s*2px solid var\(--orange\)[^}]*background:\s*transparent[^}]*color:\s*var\(--orange\)/s);
  assert.match(styles, /\.primary-button:hover,[\s\S]*?\.primary-button:active\s*\{[^}]*background:\s*var\(--orange\)[^}]*color:\s*white/s);
  assert.match(styles, /\.segmented-control button\s*\{[^}]*min-height:\s*32px[^}]*border-radius:\s*4px/s);
  assert.match(styles, /\.format-options button\s*\{[^}]*min-height:\s*44px[^}]*border-radius:\s*1px/s);
  assert.match(styles, /\.selector-card-football\s*\{/);
  assert.match(styles, /\.selector-card-general\s*\{/);
  assert.match(styles, /\.department-card \.selector-group\s*\{/);
  assert.match(styles, /\.preview-page-control\s*\{/);
  assert.ok(
    page.indexOf('className={`canvas-stage') <
      page.indexOf('className="segmented-control compact preview-page-control"'),
  );
  assert.match(styles, /textarea\s*\{[^}]*resize:\s*vertical/s);
  assert.match(styles, /\.canvas-story canvas\s*\{[^}]*width:\s*auto[^}]*height:\s*auto/s);
  assert.doesNotMatch(styles, /\.preview-actions \.primary-button[^}]*display:\s*none/s);
  assert.match(styles, /@media \(max-width: 820px\)[\s\S]*?\.app-shell\s*\{[^}]*width:\s*100%/);
  assert.match(styles, /@media \(max-width: 820px\)[\s\S]*?\.selector-card\s*\{[^}]*padding:\s*0[^}]*border:\s*0[^}]*box-shadow:\s*none/s);
  assert.match(page, /new ResizeObserver\(reportHeight\)/);
  assert.match(page, /svb-generator-height/);
  assert.match(page, /https:\/\/fussball\.sportverein-bergheim\.de/);
  assert.match(page, /https:\/\/www\.sportverein-bergheim\.de/);
  assert.doesNotMatch(page, /localStorage|sessionStorage|fetch\(/);
  assert.match(packageJson, /"build:pages"/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(pagesViteConfig, /cssMinify:\s*false/);
  assert.match(postcssConfig, /optimize:\s*false/);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await access(new URL("../app/fonts/Inter-Variable.ttf", import.meta.url));
});
