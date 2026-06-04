import { COUNTRIES } from '@features/profile/data/countries';

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

function deriveFlag(code: string): string | null {
  if (!/^[A-Za-z]{2}$/.test(code)) return null;
  const cc = code.toUpperCase();
  const base = 0x1f1e6; // regional indicator 'A'
  return String.fromCodePoint(base + (cc.charCodeAt(0) - 65), base + (cc.charCodeAt(1) - 65));
}

export function flagFor(code: string | null): string {
  if (!code) return '🏳️';
  const listed = BY_CODE.get(code.toUpperCase());
  if (listed) return listed.flag;
  return deriveFlag(code) ?? '🏳️';
}

export function countryName(code: string | null): string {
  if (!code) return '';
  return BY_CODE.get(code.toUpperCase())?.name ?? code;
}
