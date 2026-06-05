import {
  buildIcs,
  escapeIcsText,
  foldLine,
  tripIcsSlug,
  type IcsMilestone,
  type IcsTrip,
} from '../ics';

const TRIP: IcsTrip = { id: 'trip-1', name: 'Road Trip' };

function lines(ics: string): string[] {
  return ics.split('\r\n');
}

/** Unfold folded continuation lines back into logical content lines. */
function unfold(ics: string): string[] {
  const out: string[] = [];
  for (const line of lines(ics)) {
    if (line.startsWith(' ') && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

describe('escapeIcsText', () => {
  it('escapes backslash, semicolon, comma and newline', () => {
    expect(escapeIcsText('a,b;c\\d')).toBe('a\\,b\\;c\\\\d');
    expect(escapeIcsText('line1\nline2')).toBe('line1\\nline2');
    expect(escapeIcsText('win\r\nrow')).toBe('win\\nrow');
  });

  it('escapes backslash before the other delimiters (order matters)', () => {
    // A literal backslash must not be re-escaped by the comma/semicolon passes.
    expect(escapeIcsText('\\,')).toBe('\\\\\\,');
  });

  it('leaves plain text untouched', () => {
    expect(escapeIcsText('Eiffel Tower')).toBe('Eiffel Tower');
  });
});

describe('buildIcs — calendar envelope', () => {
  it('emits a well-formed VCALENDAR header and footer with CRLF', () => {
    const ics = buildIcs(TRIP, []);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('VERSION:2.0\r\n');
    expect(ics).toContain('PRODID:-//This Is The Journey//Trip Export//EN\r\n');
  });

  it('uses CRLF between every line', () => {
    const ics = buildIcs(TRIP, []);
    expect(ics.includes('\r\n')).toBe(true);
    // No bare LF that is not part of a CRLF pair.
    expect(/[^\r]\n/.test(ics)).toBe(false);
  });

  it('escapes the trip name in X-WR-CALNAME', () => {
    const ics = buildIcs({ id: 't', name: 'Paris, France' }, []);
    expect(ics).toContain('X-WR-CALNAME:Paris\\, France');
  });
});

describe('buildIcs — timed events', () => {
  const milestone: IcsMilestone = {
    id: 'm-1',
    name: 'Check-in',
    arrival_at: '2026-06-05T09:30:00.000Z',
    departure_at: '2026-06-05T11:00:00.000Z',
    address: 'Hotel Lobby',
    lat: 48.8584,
    lng: 2.2945,
  };

  it('emits UTC DTSTART/DTEND without VALUE=DATE for timed milestones', () => {
    const got = unfold(buildIcs(TRIP, [milestone]));
    expect(got).toContain('DTSTART:20260605T093000Z');
    expect(got).toContain('DTEND:20260605T110000Z');
    expect(got).not.toContain('DTSTART;VALUE=DATE:20260605');
  });

  it('emits a deterministic UID, SUMMARY, LOCATION and GEO', () => {
    const got = unfold(buildIcs(TRIP, [milestone]));
    expect(got).toContain('UID:m-1@journey.app');
    expect(got).toContain('SUMMARY:Check-in');
    expect(got).toContain('LOCATION:Hotel Lobby');
    expect(got).toContain('GEO:48.8584;2.2945');
  });

  it('wraps each event in BEGIN/END:VEVENT and includes DTSTAMP', () => {
    const got = unfold(buildIcs(TRIP, [milestone]));
    expect(got.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(1);
    expect(got.filter((l) => l === 'END:VEVENT')).toHaveLength(1);
    expect(got.some((l) => /^DTSTAMP:\d{8}T\d{6}Z$/.test(l))).toBe(true);
  });
});

describe('buildIcs — all-day events', () => {
  it('uses VALUE=DATE and an exclusive next-day DTEND for date-only milestones', () => {
    const got = unfold(
      buildIcs(TRIP, [
        { id: 'm-2', name: 'Arrival Day', arrival_at: '2026-06-05', departure_at: '2026-06-05' },
      ]),
    );
    expect(got).toContain('DTSTART;VALUE=DATE:20260605');
    expect(got).toContain('DTEND;VALUE=DATE:20260606');
  });

  it('falls back to the only available date for start and end', () => {
    const got = unfold(
      buildIcs(TRIP, [{ id: 'm-3', name: 'Departure only', departure_at: '2026-07-10' }]),
    );
    expect(got).toContain('DTSTART;VALUE=DATE:20260710');
    expect(got).toContain('DTEND;VALUE=DATE:20260711');
  });
});

describe('buildIcs — missing / invalid dates', () => {
  it('skips milestones with no arrival and no departure', () => {
    const ics = buildIcs(TRIP, [
      { id: 'no-date', name: 'Someday', arrival_at: null, departure_at: null },
      { id: 'm-ok', name: 'Real', arrival_at: '2026-06-05T09:00:00Z' },
    ]);
    const got = unfold(ics);
    expect(got.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(1);
    expect(got).toContain('UID:m-ok@journey.app');
    expect(got).not.toContain('UID:no-date@journey.app');
  });

  it('skips milestones whose date string is unparseable', () => {
    const ics = buildIcs(TRIP, [{ id: 'bad', name: 'Bad', arrival_at: 'not-a-date' }]);
    expect(unfold(ics).filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(0);
  });

  it('omits GEO when lat/lng are absent', () => {
    const ics = buildIcs(TRIP, [{ id: 'm', name: 'No coords', arrival_at: '2026-06-05' }]);
    expect(ics).not.toContain('GEO:');
  });

  it('omits LOCATION when address is absent', () => {
    const ics = buildIcs(TRIP, [{ id: 'm', name: 'No addr', arrival_at: '2026-06-05' }]);
    expect(ics).not.toContain('LOCATION:');
  });
});

describe('foldLine', () => {
  it('leaves short lines untouched', () => {
    expect(foldLine('SUMMARY:Short')).toBe('SUMMARY:Short');
  });

  it('folds lines longer than 75 octets and prefixes continuations with a space', () => {
    const long = `SUMMARY:${'x'.repeat(120)}`;
    const folded = foldLine(long);
    const parts = folded.split('\r\n');
    expect(parts.length).toBeGreaterThan(1);
    // First physical line ≤ 75 octets.
    expect(Buffer.byteLength(parts[0], 'utf8')).toBeLessThanOrEqual(75);
    // Every continuation begins with exactly one space.
    for (const p of parts.slice(1)) expect(p.startsWith(' ')).toBe(true);
    // Unfolding restores the original logical line.
    const rebuilt =
      parts[0] +
      parts
        .slice(1)
        .map((p) => p.slice(1))
        .join('');
    expect(rebuilt).toBe(long);
  });

  it('every physical line of a folded multi-byte value stays within 75 octets', () => {
    const long = `SUMMARY:${'é'.repeat(60)}`; // 'é' is 2 octets in UTF-8
    for (const p of foldLine(long).split('\r\n')) {
      expect(Buffer.byteLength(p, 'utf8')).toBeLessThanOrEqual(75);
    }
  });

  it('produces folded output inside a full calendar for a long summary', () => {
    const ics = buildIcs(TRIP, [
      { id: 'm', name: 'A'.repeat(200), arrival_at: '2026-06-05T09:00:00Z' },
    ]);
    // At least one folded continuation line exists.
    expect(lines(ics).some((l) => l.startsWith(' '))).toBe(true);
    // And it round-trips back to the escaped summary.
    expect(unfold(ics)).toContain(`SUMMARY:${'A'.repeat(200)}`);
  });
});

describe('tripIcsSlug', () => {
  it('slugifies the trip name', () => {
    expect(tripIcsSlug({ id: 't', name: 'Summer Road Trip 2026!' })).toBe('summer-road-trip-2026');
  });

  it('falls back to the id when the name has no slug-safe characters', () => {
    expect(tripIcsSlug({ id: 'abc', name: '!!!' })).toBe('trip-abc');
  });
});
