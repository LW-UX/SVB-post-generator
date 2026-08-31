import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import test from "node:test";
import {
  FIRST_TEAM_FIXTURES,
  findFirstTeamFixture,
  getFixtureEditableValues,
} from "../src/fixtures.ts";

test("contains the 24 first-team fixtures without the two free matchdays", async () => {
  assert.equal(FIRST_TEAM_FIXTURES.length, 24);

  const rounds = FIRST_TEAM_FIXTURES.map((fixture) => Number.parseInt(fixture.round, 10));
  assert.deepEqual(
    rounds,
    Array.from({ length: 26 }, (_, index) => index + 1).filter((round) =>
      round !== 4 && round !== 17
    ),
  );
  assert.equal(new Set(FIRST_TEAM_FIXTURES.map((fixture) => fixture.id)).size, 24);
  assert.equal(
    new Set(FIRST_TEAM_FIXTURES.map((fixture) =>
      `${fixture.opponentLogoId}:${fixture.homeAway}`
    )).size,
    24,
  );

  for (const fixture of FIRST_TEAM_FIXTURES) {
    assert.match(fixture.date, /^202[67]-\d{2}-\d{2}$/);
    assert.match(fixture.time, /^\d{2}:\d{2}$/);
    assert.ok(fixture.venue);
    assert.ok(fixture.venueAddress);
  }

  const opponentFiles = (await readdir(new URL("../src/assets/opponents", import.meta.url)))
    .map((file) => file.replace(/\.png$/i, "").normalize("NFC"));
  for (const fixture of FIRST_TEAM_FIXTURES) {
    assert.ok(
      opponentFiles.includes(fixture.opponentLogoName.normalize("NFC")),
      `Logo fehlt für ${fixture.opponentLogoName}`,
    );
  }
});

test("looks up home and away fixtures independently from the shared club logo", () => {
  const home = findFirstTeamFixture("tsv-schwabmunchen", "home");
  const away = findFirstTeamFixture("tsv-schwabmunchen", "away");

  assert.equal(home?.round, "1. Spieltag");
  assert.equal(home?.opponentLogoName, "TSV Schwabmünchen");
  assert.equal(home?.opponentName, "TSV Schwabmünchen 2");
  assert.equal(home?.venue, "Mößmann Sportanlage Hauptfeld");
  assert.equal(away?.round, "14. Spieltag");
  assert.equal(away?.venue, "siegmund arena Platz 3");
});

test("merges session corrections without changing the fixture preset", () => {
  const preset = findFirstTeamFixture("spvgg-langerringen", "away");
  assert.ok(preset);

  const corrected = getFixtureEditableValues(preset, {
    time: "13:30",
    venueAddress: "Korrigierte Adresse",
  });

  assert.equal(corrected.opponentName, "SpVgg Langerringen 2");
  assert.equal(corrected.round, "5. Spieltag");
  assert.equal(corrected.time, "13:30");
  assert.equal(corrected.venueAddress, "Korrigierte Adresse");
  assert.equal(preset.time, "13:00");
  assert.equal(preset.venueAddress, "Am Sportplatz 1, 86853 Langerringen");
});
