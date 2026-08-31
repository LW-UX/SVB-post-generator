import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import test from "node:test";
import { CLUBS, getClubById } from "../src/club-database.ts";
import {
  FIRST_TEAM_FIXTURES,
  SECOND_TEAM_FIXTURES,
  findFixture,
  getFixtureEditableValues,
} from "../src/fixtures.ts";

function logoIdFromFileName(fileName: string) {
  return fileName
    .replace(/\.png$/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ß", "ss")
    .toLocaleLowerCase("de")
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

test("contains 24 reusable and complete club records with existing logos", async () => {
  assert.equal(CLUBS.length, 24);
  assert.equal(new Set(CLUBS.map((club) => club.id)).size, CLUBS.length);
  assert.equal(new Set(CLUBS.map((club) => club.logoId)).size, CLUBS.length);

  const logoIds = new Set(
    (await readdir(new URL("../src/assets/opponents", import.meta.url)))
      .filter((file) => file.endsWith(".png"))
      .map(logoIdFromFileName),
  );

  for (const club of CLUBS) {
    assert.ok(club.name);
    assert.ok(club.venue, `Spielstätte fehlt für ${club.name}`);
    assert.ok(club.address, `Adresse fehlt für ${club.name}`);
    assert.ok(logoIds.has(club.logoId), `Logo fehlt für ${club.name}: ${club.logoId}`);
  }
});

test("contains both 24-match schedules without the free matchdays", () => {
  assert.equal(FIRST_TEAM_FIXTURES.length, 24);
  assert.equal(SECOND_TEAM_FIXTURES.length, 24);

  const expectedRounds = (freeRounds: number[]) =>
    Array.from({ length: 26 }, (_, index) => index + 1)
      .filter((round) => !freeRounds.includes(round));

  assert.deepEqual(
    FIRST_TEAM_FIXTURES.map((fixture) => fixture.round),
    expectedRounds([4, 17]),
  );
  assert.deepEqual(
    SECOND_TEAM_FIXTURES.map((fixture) => fixture.round),
    expectedRounds([12, 25]),
  );

  for (const fixtures of [FIRST_TEAM_FIXTURES, SECOND_TEAM_FIXTURES]) {
    assert.equal(new Set(fixtures.map((fixture) => fixture.id)).size, fixtures.length);
    assert.equal(
      new Set(fixtures.map((fixture) =>
        `${fixture.team}:${fixture.opponentClubId}:${fixture.homeAway}`
      )).size,
      fixtures.length,
    );

    for (const fixture of fixtures) {
      assert.ok(getClubById(fixture.opponentClubId));
      assert.match(fixture.date, /^202[67]-\d{2}-\d{2}$/);
      assert.match(fixture.time, /^\d{2}:\d{2}$/);
      const values = getFixtureEditableValues(fixture);
      assert.ok(values.opponentName);
      assert.ok(values.venue);
      assert.ok(values.venueAddress);
    }
  }
});

test("resolves first and second teams independently from the shared club logo", () => {
  const firstHome = findFixture("first", "tsv-schwabmunchen", "home");
  const firstAway = findFixture("first", "tsv-schwabmunchen", "away");
  const secondHome = findFixture("second", "tsv-leitershofen", "home");
  const secondAway = findFixture("second", "tsv-leitershofen", "away");

  assert.ok(firstHome && firstAway && secondHome && secondAway);
  assert.equal(getFixtureEditableValues(firstHome).opponentName, "TSV Schwabmünchen II");
  assert.equal(getFixtureEditableValues(firstHome).venue, "Mößmann Sportanlage Hauptfeld");
  assert.equal(getFixtureEditableValues(firstAway).venue, "siegmund arena Platz 3");
  assert.equal(getFixtureEditableValues(secondHome).opponentName, "TSV Leitershofen II");
  assert.equal(getFixtureEditableValues(secondAway).venue, "Erhardt-Leimer-Stadion Hauptfeld");
});

test("keeps special logo mappings and the BFV return-round venues", () => {
  assert.equal(getClubById("psv-augsburg")?.name, "PSV Augsburg");
  assert.equal(getClubById("psv-augsburg")?.logoId, "polizei-sv");
  assert.equal(getClubById("fk-srbija-augsburg")?.venue, "AC Torres Augsburg");
  assert.equal(
    getClubById("tsv-leitershofen")?.venue,
    "Erhardt-Leimer-Stadion Hauptfeld",
  );
  assert.equal(getClubById("tsv-goggingen")?.venue, "Karl-Mögele-Sportanlage (R1)");
  assert.equal(getClubById("ksv-bih-augsburg")?.venue, "Stadtwerke SV Hauptfeld");

  for (const [clubId, expectedVenue] of [
    ["fk-srbija-augsburg", "AC Torres Augsburg"],
    ["tsv-leitershofen", "Erhardt-Leimer-Stadion Hauptfeld"],
    ["tsv-goggingen", "Karl-Mögele-Sportanlage (R1)"],
    ["ksv-bih-augsburg", "Stadtwerke SV Hauptfeld"],
  ] as const) {
    const preset = findFixture("second", clubId, "away");
    assert.ok(preset);
    assert.equal(getFixtureEditableValues(preset).venue, expectedVenue);
  }
});

test("merges session corrections without changing normalized presets or club data", () => {
  const preset = findFixture("first", "spvgg-langerringen", "away");
  assert.ok(preset);

  const corrected = getFixtureEditableValues(preset, {
    time: "13:30",
    venueAddress: "Korrigierte Adresse",
  });

  assert.equal(corrected.opponentName, "SpVgg Langerringen II");
  assert.equal(corrected.round, "5. Spieltag");
  assert.equal(corrected.time, "13:30");
  assert.equal(corrected.venueAddress, "Korrigierte Adresse");
  assert.equal(preset.time, "13:00");
  assert.equal(getClubById("spvgg-langerringen")?.address, "Am Sportplatz 1, 86853 Langerringen");
});
