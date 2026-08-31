import { getClubById } from "./club-database.ts";
import type { ClubRecord } from "./club-database.ts";

export type FixtureHomeAway = "home" | "away";
export type FixtureTeam = "first" | "second";
export type SquadLevel = "first" | "second";

export type FixtureEditableValues = {
  opponentName: string;
  round: string;
  date: string;
  time: string;
  venue: string;
  venueAddress: string;
};

export type FixturePreset = {
  id: string;
  season: "2026/27";
  team: FixtureTeam;
  round: number;
  opponentClubId: string;
  opponentSquad: SquadLevel;
  homeAway: FixtureHomeAway;
  date: string;
  time: string;
};

export type FixtureOverride = Partial<FixtureEditableValues>;
export type FixtureOverrides = Record<string, FixtureOverride>;

const SVB_CLUB_ID = "sv-bergheim";

function fixture(
  team: FixtureTeam,
  round: number,
  opponentClubId: string,
  opponentSquad: SquadLevel,
  homeAway: FixtureHomeAway,
  date: string,
  time: string,
): FixturePreset {
  return {
    id: `${team}-2026-27-${round}`,
    season: "2026/27",
    team,
    round,
    opponentClubId,
    opponentSquad,
    homeAway,
    date,
    time,
  };
}

export const FIRST_TEAM_FIXTURES: readonly FixturePreset[] = [
  fixture("first", 1, "tsv-schwabmunchen", "second", "home", "2026-08-16", "15:00"),
  fixture("first", 2, "vfl-kaufering", "second", "away", "2026-08-22", "14:00"),
  fixture("first", 3, "fc-kleinaitingen", "first", "away", "2026-08-30", "15:00"),
  fixture("first", 5, "spvgg-langerringen", "second", "away", "2026-09-13", "13:00"),
  fixture("first", 6, "tsv-walkertshofen", "first", "home", "2026-09-20", "15:00"),
  fixture("first", 7, "fsv-inningen", "first", "away", "2026-09-27", "15:00"),
  fixture("first", 8, "sv-schwabegg", "first", "home", "2026-10-04", "15:00"),
  fixture("first", 9, "tsv-konigsbrunn", "first", "away", "2026-10-10", "13:00"),
  fixture("first", 10, "asv-hiltenfingen", "first", "home", "2026-10-18", "15:00"),
  fixture("first", 11, "fsv-grossaitingen", "first", "away", "2026-10-25", "14:30"),
  fixture("first", 12, "sv-mering", "second", "home", "2026-11-01", "14:00"),
  fixture("first", 13, "tsv-haunstetten", "second", "away", "2026-11-08", "11:30"),
  fixture("first", 14, "tsv-schwabmunchen", "second", "away", "2026-11-14", "16:00"),
  fixture("first", 15, "vfl-kaufering", "second", "home", "2027-03-21", "14:30"),
  fixture("first", 16, "fc-kleinaitingen", "first", "home", "2027-03-27", "14:30"),
  fixture("first", 18, "spvgg-langerringen", "second", "home", "2027-04-11", "15:00"),
  fixture("first", 19, "tsv-walkertshofen", "first", "away", "2027-04-18", "15:30"),
  fixture("first", 20, "fsv-inningen", "first", "home", "2027-04-25", "15:00"),
  fixture("first", 21, "sv-schwabegg", "first", "away", "2027-05-02", "15:00"),
  fixture("first", 22, "tsv-konigsbrunn", "first", "home", "2027-05-09", "15:00"),
  fixture("first", 23, "asv-hiltenfingen", "first", "away", "2027-05-17", "15:00"),
  fixture("first", 24, "fsv-grossaitingen", "first", "home", "2027-05-23", "15:00"),
  fixture("first", 25, "sv-mering", "second", "away", "2027-05-30", "13:00"),
  fixture("first", 26, "tsv-haunstetten", "second", "home", "2027-06-05", "15:30"),
];

export const SECOND_TEAM_FIXTURES: readonly FixturePreset[] = [
  fixture("second", 1, "psv-augsburg", "first", "home", "2026-08-16", "13:00"),
  fixture("second", 2, "djk-goggingen", "first", "away", "2026-09-02", "18:00"),
  fixture("second", 3, "tsv-kriegshaber", "first", "away", "2026-08-30", "15:00"),
  fixture("second", 4, "fk-srbija-augsburg", "first", "home", "2026-09-06", "13:00"),
  fixture("second", 5, "fc-hellas-augsburg", "first", "away", "2026-09-13", "13:30"),
  fixture("second", 6, "tsv-leitershofen", "second", "home", "2026-09-20", "13:00"),
  fixture("second", 7, "fsv-inningen", "second", "away", "2026-09-27", "13:00"),
  fixture("second", 8, "tsv-goggingen", "second", "home", "2026-10-04", "13:00"),
  fixture("second", 9, "ksv-trenk-augsburg", "first", "away", "2026-10-11", "15:00"),
  fixture("second", 10, "ksv-bih-augsburg", "second", "home", "2026-10-18", "13:00"),
  fixture("second", 11, "esv-augsburg", "second", "away", "2026-10-25", "12:30"),
  fixture("second", 13, "tsv-pfersee", "second", "away", "2026-11-08", "12:00"),
  fixture("second", 14, "psv-augsburg", "first", "away", "2026-11-15", "13:00"),
  fixture("second", 15, "djk-goggingen", "first", "home", "2027-03-21", "12:00"),
  fixture("second", 16, "tsv-kriegshaber", "first", "home", "2027-03-27", "12:30"),
  fixture("second", 17, "fk-srbija-augsburg", "first", "away", "2027-04-04", "13:00"),
  fixture("second", 18, "fc-hellas-augsburg", "first", "home", "2027-04-11", "13:00"),
  fixture("second", 19, "tsv-leitershofen", "second", "away", "2027-04-18", "13:00"),
  fixture("second", 20, "fsv-inningen", "second", "home", "2027-04-25", "13:00"),
  fixture("second", 21, "tsv-goggingen", "second", "away", "2027-05-02", "12:30"),
  fixture("second", 22, "ksv-trenk-augsburg", "first", "home", "2027-05-09", "13:00"),
  fixture("second", 23, "ksv-bih-augsburg", "second", "away", "2027-05-17", "10:30"),
  fixture("second", 24, "esv-augsburg", "second", "home", "2027-05-23", "13:00"),
  fixture("second", 26, "tsv-pfersee", "second", "home", "2027-06-05", "13:30"),
];

export const FIXTURES: readonly FixturePreset[] = [
  ...FIRST_TEAM_FIXTURES,
  ...SECOND_TEAM_FIXTURES,
];

export function formatTeamName(club: ClubRecord, squad: SquadLevel) {
  return squad === "second" ? `${club.name} II` : club.name;
}

export function findFixture(
  team: FixtureTeam,
  opponentClubId: string,
  homeAway: FixtureHomeAway,
) {
  return FIXTURES.find((entry) =>
    entry.team === team &&
    entry.opponentClubId === opponentClubId &&
    entry.homeAway === homeAway
  );
}

export function getFixtureEditableValues(
  fixturePreset: FixturePreset,
  fixtureOverride?: FixtureOverride,
): FixtureEditableValues {
  const opponentClub = getClubById(fixturePreset.opponentClubId);
  const venueClub = getClubById(
    fixturePreset.homeAway === "home" ? SVB_CLUB_ID : fixturePreset.opponentClubId,
  );

  if (!opponentClub || !venueClub) {
    throw new Error(`Unbekannte Vereins-ID in Partie ${fixturePreset.id}`);
  }

  return {
    opponentName: fixtureOverride?.opponentName ??
      formatTeamName(opponentClub, fixturePreset.opponentSquad),
    round: fixtureOverride?.round ?? `${fixturePreset.round}. Spieltag`,
    date: fixtureOverride?.date ?? fixturePreset.date,
    time: fixtureOverride?.time ?? fixturePreset.time,
    venue: fixtureOverride?.venue ?? venueClub.venue,
    venueAddress: fixtureOverride?.venueAddress ?? venueClub.address,
  };
}
