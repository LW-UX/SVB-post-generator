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
  assert.match(html, /Instagram Story/);
  assert.match(html, /16:9 Querformat/);
  assert.doesNotMatch(html, /Alles bleibt auf diesem Gerät/);
  assert.doesNotMatch(html, /Ein Spiel\. Vier Formate\. Sofort bereit\./i);
  assert.match(html, /PNG herunterladen/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps uploads local and supports every requested format", async () => {
  const [page, packageJson, workflow] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
  ]);

  assert.match(page, /post:\s*\{[^}]*1080[^}]*1350[^}]*exportScale:\s*2/s);
  assert.match(page, /story:\s*\{[^}]*1080[^}]*1920[^}]*exportScale:\s*2/s);
  assert.match(page, /landscape:\s*\{[^}]*1500[^}]*1000[^}]*exportScale:\s*1/s);
  assert.match(page, /widescreen:\s*\{[^}]*1920[^}]*1080[^}]*exportScale:\s*1/s);
  assert.match(page, /type="file"/);
  assert.match(page, /SV Bergheim II/);
  assert.match(page, /chooseTeamDesign/);
  assert.match(page, /svb-logo-weiss-1906\.svg/);
  assert.match(page, /svb-logo-blau-1906\.svg/);
  assert.match(page, /#003076/);
  assert.match(page, /#14589e/);
  assert.match(page, /createAngledGradient\(context, width, height, 52\)/);
  assert.match(page, /function renderMatchdayGraphic\(/);
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
  assert.match(page, /new ResizeObserver\(reportHeight\)/);
  assert.match(page, /svb-generator-height/);
  assert.match(page, /https:\/\/fussball\.sportverein-bergheim\.de/);
  assert.match(page, /https:\/\/www\.sportverein-bergheim\.de/);
  assert.doesNotMatch(page, /localStorage|sessionStorage|fetch\(/);
  assert.match(packageJson, /"build:pages"/);
  assert.match(workflow, /actions\/deploy-pages@v4/);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await access(new URL("../app/fonts/Inter-Variable.ttf", import.meta.url));
});
