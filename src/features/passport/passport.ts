export interface Stamp {
  milestone_id: string;
  trip_id: string | null;
  label: string;
  country: string | null;
  at: string | null;
}

export function parseStamps(raw: unknown): Stamp[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s) => ({
      milestone_id: String(s.milestone_id ?? ''),
      trip_id: s.trip_id ? String(s.trip_id) : null,
      label: String(s.label ?? ''),
      country: s.country ? String(s.country) : null,
      at: s.at ? String(s.at) : null,
    }))
    .filter((s) => s.milestone_id !== '');
}

export function sortByDateDesc(stamps: Stamp[]): Stamp[] {
  return [...stamps].sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''));
}

export function groupByCountry(stamps: Stamp[]): Record<string, Stamp[]> {
  return stamps.reduce<Record<string, Stamp[]>>((acc, s) => {
    const key = s.country ?? '??';
    (acc[key] ??= []).push(s);
    return acc;
  }, {});
}
