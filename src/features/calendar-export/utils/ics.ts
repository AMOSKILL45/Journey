/**
 * Pure RFC-5545 (iCalendar) VCALENDAR builder for a whole trip.
 *
 * One VEVENT per milestone. A milestone with no `arrival_at` and no
 * `departure_at` is skipped (nothing to schedule). When a milestone's date
 * carries a time component it is emitted as a UTC `DTSTART`/`DTEND`
 * (`YYYYMMDDTHHMMSSZ`); a pure calendar date (no time) is emitted all-day
 * (`VALUE=DATE`, `YYYYMMDD`).
 *
 * This module is a self-contained leaf: it takes minimal structural inputs
 * (`IcsTrip` / `IcsMilestone`) that the trips/milestones DB rows satisfy, so it
 * never imports another feature. No native or third-party dependency — it is a
 * deterministic string builder, fully unit-testable.
 */

const PRODID = '-//This Is The Journey//Trip Export//EN';
const ICAL_VERSION = '2.0';
const UID_DOMAIN = 'journey.app';
const MAX_LINE_OCTETS = 75;
const CRLF = '\r\n';
/** ms in a day — used to derive an all-day event's exclusive DTEND. */
const DAY_MS = 24 * 60 * 60 * 1000;

export interface IcsTrip {
  id: string;
  name: string;
}

export interface IcsMilestone {
  id: string;
  name: string;
  /** ISO 8601 — date only ("2026-06-05") or date-time. Nullable. */
  arrival_at?: string | null;
  departure_at?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
}

/**
 * Escape a text value per RFC-5545 §3.3.11: backslash, semicolon, comma and
 * newline are escaped. CR is normalised away (folding owns line breaks).
 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** True when an ISO string carries a time component (vs. a pure date). */
function hasTimeComponent(iso: string): boolean {
  return iso.includes('T');
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Format a Date as a UTC iCal date-time: YYYYMMDDTHHMMSSZ. */
function toIcsDateTimeUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

/** Format a Date as an all-day iCal date: YYYYMMDD (UTC calendar date). */
function toIcsDateUtc(d: Date): string {
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}`;
}

/** UTF-8 byte length of a string (line folding is octet-based, not char-based). */
function octetLength(s: string): number {
  let bytes = 0;
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      // High surrogate — a full code point is 4 bytes; consume the pair.
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}

/**
 * Fold a single content line to ≤75 octets per RFC-5545 §3.1. Continuation
 * lines are prefixed with one space. Folding never splits a multi-byte UTF-8
 * sequence (we measure whole code points, surrogate pairs included).
 */
export function foldLine(line: string): string {
  if (octetLength(line) <= MAX_LINE_OCTETS) return line;

  const out: string[] = [];
  let current = '';
  let currentOctets = 0;
  let isContinuation = false;

  for (const char of line) {
    const charOctets = octetLength(char);
    // Continuation lines spend one octet on the leading space.
    const limit = isContinuation ? MAX_LINE_OCTETS - 1 : MAX_LINE_OCTETS;
    if (currentOctets + charOctets > limit) {
      out.push(isContinuation ? ` ${current}` : current);
      current = char;
      currentOctets = charOctets;
      isContinuation = true;
    } else {
      current += char;
      currentOctets += charOctets;
    }
  }
  if (current.length > 0) out.push(isContinuation ? ` ${current}` : current);
  return out.join(CRLF);
}

interface IcsDateValue {
  /** The DTSTART/DTEND property value, e.g. "20260605" or "20260605T090000Z". */
  value: string;
  allDay: boolean;
}

function parseIcsDate(iso: string): IcsDateValue | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return hasTimeComponent(iso)
    ? { value: toIcsDateTimeUtc(d), allDay: false }
    : { value: toIcsDateUtc(d), allDay: true };
}

/** Render an all-day DTEND (exclusive): the day AFTER the given date. */
function allDayEndExclusive(iso: string): string {
  const d = new Date(iso);
  return toIcsDateUtc(new Date(d.getTime() + DAY_MS));
}

function dateProperty(name: 'DTSTART' | 'DTEND', dv: IcsDateValue): string {
  return dv.allDay ? `${name};VALUE=DATE:${dv.value}` : `${name}:${dv.value}`;
}

function buildEventLines(milestone: IcsMilestone, dtstamp: string): string[] | null {
  const startIso = milestone.arrival_at ?? milestone.departure_at;
  const endIso = milestone.departure_at ?? milestone.arrival_at;
  if (!startIso || !endIso) return null;

  const start = parseIcsDate(startIso);
  const end = parseIcsDate(endIso);
  if (!start || !end) return null;

  const lines: string[] = [
    'BEGIN:VEVENT',
    `UID:${milestone.id}@${UID_DOMAIN}`,
    `DTSTAMP:${dtstamp}`,
    dateProperty('DTSTART', start),
    // All-day events use an exclusive end on the following day so a
    // single-day milestone occupies exactly one date in the calendar grid.
    dateProperty('DTEND', end.allDay ? { value: allDayEndExclusive(endIso), allDay: true } : end),
    `SUMMARY:${escapeIcsText(milestone.name)}`,
  ];

  if (milestone.address) {
    lines.push(`LOCATION:${escapeIcsText(milestone.address)}`);
  }
  if (typeof milestone.lat === 'number' && typeof milestone.lng === 'number') {
    lines.push(`GEO:${milestone.lat};${milestone.lng}`);
  }
  lines.push('END:VEVENT');
  return lines;
}

/**
 * Build the full VCALENDAR document for a trip. CRLF line endings, every
 * content line folded to ≤75 octets. Milestones with no usable date are
 * silently skipped; the calendar is still well-formed when none remain.
 */
export function buildIcs(trip: IcsTrip, milestones: readonly IcsMilestone[]): string {
  const dtstamp = toIcsDateTimeUtc(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    `VERSION:${ICAL_VERSION}`,
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(trip.name)}`,
  ];

  for (const milestone of milestones) {
    const eventLines = buildEventLines(milestone, dtstamp);
    if (eventLines) lines.push(...eventLines);
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** Filesystem-safe slug for the exported .ics filename (no extension). */
export function tripIcsSlug(trip: IcsTrip): string {
  const base = trip.name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .toLowerCase();
  return base.length > 0 ? base : `trip-${trip.id}`;
}
