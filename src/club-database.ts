import clubRecords from "./data/clubs.json" with { type: "json" };

export type ClubRecord = {
  id: string;
  name: string;
  logoId: string;
  venue: string;
  address: string;
};

export const CLUBS: readonly ClubRecord[] = clubRecords;

const CLUBS_BY_ID = new Map(CLUBS.map((club) => [club.id, club]));
const CLUBS_BY_LOGO_ID = new Map(CLUBS.map((club) => [club.logoId, club]));

export function getClubById(id: string) {
  return CLUBS_BY_ID.get(id);
}

export function getClubByLogoId(logoId: string) {
  return CLUBS_BY_LOGO_ID.get(logoId);
}
