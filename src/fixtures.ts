export type FixtureHomeAway = "home" | "away";

export type FixtureEditableValues = {
  opponentName: string;
  round: string;
  date: string;
  time: string;
  venue: string;
  venueAddress: string;
};

export type FixturePreset = FixtureEditableValues & {
  id: string;
  season: "2026/27";
  team: "first";
  opponentLogoId: string;
  opponentLogoName: string;
  homeAway: FixtureHomeAway;
};

export type FixtureOverride = Partial<FixtureEditableValues>;
export type FixtureOverrides = Record<string, FixtureOverride>;

const HOME_VENUE = "Mößmann Sportanlage Hauptfeld";
const HOME_ADDRESS = "Am Langen Berg 5, 86199 Augsburg";

function fixture(
  round: number,
  opponentLogoId: string,
  opponentLogoName: string,
  opponentName: string,
  homeAway: FixtureHomeAway,
  date: string,
  time: string,
  venue: string,
  venueAddress: string,
): FixturePreset {
  return {
    id: `first-2026-27-${round}`,
    season: "2026/27",
    team: "first",
    opponentLogoId,
    opponentLogoName,
    opponentName,
    homeAway,
    round: `${round}. Spieltag`,
    date,
    time,
    venue,
    venueAddress,
  };
}

export const FIRST_TEAM_FIXTURES: readonly FixturePreset[] = [
  fixture(1, "tsv-schwabmunchen", "TSV Schwabmünchen", "TSV Schwabmünchen 2", "home", "2026-08-16", "15:00", HOME_VENUE, HOME_ADDRESS),
  fixture(2, "vfl-kaufering", "VFL Kaufering", "VfL Kaufering 2", "away", "2026-08-22", "14:00", "Sportzentrum Platz 2", "Bayernstr. 17, 86916 Kaufering"),
  fixture(3, "fc-kleinaitingen", "FC Kleinaitingen", "FC Kleinaitingen", "away", "2026-08-30", "15:00", "Hauptplatz FC Kleinaitingen", "Lechfeldstr. 31, 86507 Kleinaitingen"),
  fixture(5, "spvgg-langerringen", "SpVgg Langerringen", "SpVgg Langerringen 2", "away", "2026-09-13", "13:00", "SpVgg Langerringen Hauptplatz", "Am Sportplatz 1, 86853 Langerringen"),
  fixture(6, "tsv-walkertshofen", "TSV Walkertshofen", "TSV Walkertshofen", "home", "2026-09-20", "15:00", HOME_VENUE, HOME_ADDRESS),
  fixture(7, "fsv-inningen", "FSV Inningen", "FSV Inningen", "away", "2026-09-27", "15:00", "FSV Inningen Sportanlage (HF)", "Bergheimer Str. 35, 86199 Augsburg"),
  fixture(8, "sv-schwabegg", "SV Schwabegg", "SV Schwabegg", "home", "2026-10-04", "15:00", HOME_VENUE, HOME_ADDRESS),
  fixture(9, "tsv-konigsbrunn", "TSV Königsbrunn", "TSV Königsbrunn", "away", "2026-10-10", "13:00", "Sportpark West - Rasenplatz", "Königsallee 5, 86343 Königsbrunn"),
  fixture(10, "asv-hiltenfingen", "ASV Hiltenfingen", "ASV Hiltenfingen", "home", "2026-10-18", "15:00", HOME_VENUE, HOME_ADDRESS),
  fixture(11, "fsv-grossaitingen", "FSV Großaitingen", "FSV Großaitingen", "away", "2026-10-25", "14:30", "FSV Großaitingen Hauptplatz", "Schützenstr. 16b, 86845 Großaitingen"),
  fixture(12, "sv-mering", "SV Mering", "SV Mering 2", "home", "2026-11-01", "14:00", HOME_VENUE, HOME_ADDRESS),
  fixture(13, "tsv-haunstetten", "TSV Haunstetten", "TSV Haunstetten 2", "away", "2026-11-08", "11:30", "TSV-Platz", "Landsberger Str. 3, 86179 Augsburg"),
  fixture(14, "tsv-schwabmunchen", "TSV Schwabmünchen", "TSV Schwabmünchen 2", "away", "2026-11-14", "16:00", "siegmund arena Platz 3", "Riedstr. 59, 86830 Schwabmünchen"),
  fixture(15, "vfl-kaufering", "VFL Kaufering", "VfL Kaufering 2", "home", "2027-03-21", "14:30", HOME_VENUE, HOME_ADDRESS),
  fixture(16, "fc-kleinaitingen", "FC Kleinaitingen", "FC Kleinaitingen", "home", "2027-03-27", "14:30", HOME_VENUE, HOME_ADDRESS),
  fixture(18, "spvgg-langerringen", "SpVgg Langerringen", "SpVgg Langerringen 2", "home", "2027-04-11", "15:00", HOME_VENUE, HOME_ADDRESS),
  fixture(19, "tsv-walkertshofen", "TSV Walkertshofen", "TSV Walkertshofen", "away", "2027-04-18", "15:30", "Stauden Arena Walkertshofen", "Hauptstr. 55, 86877 Walkertshofen"),
  fixture(20, "fsv-inningen", "FSV Inningen", "FSV Inningen", "home", "2027-04-25", "15:00", HOME_VENUE, HOME_ADDRESS),
  fixture(21, "sv-schwabegg", "SV Schwabegg", "SV Schwabegg", "away", "2027-05-02", "15:00", "Hauptplatz SV 1957 Schwabegg", "Hiltenfinger Str. 10, 86830 Schwabmünchen"),
  fixture(22, "tsv-konigsbrunn", "TSV Königsbrunn", "TSV Königsbrunn", "home", "2027-05-09", "15:00", HOME_VENUE, HOME_ADDRESS),
  fixture(23, "asv-hiltenfingen", "ASV Hiltenfingen", "ASV Hiltenfingen", "away", "2027-05-17", "15:00", "Wertachstadion Hauptfeld", "Birkenstr. 1, 86856 Hiltenfingen"),
  fixture(24, "fsv-grossaitingen", "FSV Großaitingen", "FSV Großaitingen", "home", "2027-05-23", "15:00", HOME_VENUE, HOME_ADDRESS),
  fixture(25, "sv-mering", "SV Mering", "SV Mering 2", "away", "2027-05-30", "13:00", "Sportanlage Mering Hauptplatz", "Tratteilstr. 50, 86415 Mering"),
  fixture(26, "tsv-haunstetten", "TSV Haunstetten", "TSV Haunstetten 2", "home", "2027-06-05", "15:30", HOME_VENUE, HOME_ADDRESS),
];

export function findFirstTeamFixture(
  opponentLogoId: string,
  homeAway: FixtureHomeAway,
) {
  return FIRST_TEAM_FIXTURES.find((entry) =>
    entry.opponentLogoId === opponentLogoId && entry.homeAway === homeAway
  );
}

export function getFixtureEditableValues(
  fixturePreset: FixturePreset,
  fixtureOverride?: FixtureOverride,
): FixtureEditableValues {
  return {
    opponentName: fixtureOverride?.opponentName ?? fixturePreset.opponentName,
    round: fixtureOverride?.round ?? fixturePreset.round,
    date: fixtureOverride?.date ?? fixturePreset.date,
    time: fixtureOverride?.time ?? fixturePreset.time,
    venue: fixtureOverride?.venue ?? fixturePreset.venue,
    venueAddress: fixtureOverride?.venueAddress ?? fixturePreset.venueAddress,
  };
}
