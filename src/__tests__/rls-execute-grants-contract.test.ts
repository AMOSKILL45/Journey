/**
 * RLS-helper EXECUTE-grant contract.
 *
 * Some helper functions are referenced INSIDE RLS policy predicates
 * (`USING (is_trip_member(id, auth.uid()))`). Postgres evaluates a policy predicate
 * AS THE CALLING ROLE — even for a SECURITY DEFINER function, the caller still needs
 * EXECUTE to *invoke* it. So if `authenticated` loses EXECUTE on one of these, EVERY
 * policy that calls it throws `42501 permission denied for function …` and the table
 * 403s. On 2026-05-25 a "security hardening" migration did exactly that (revoked from
 * anon, authenticated, public) and silently 403'd Home / Trips / Map / Realtime — a
 * total data-layer outage that no test caught, because unit tests mock Supabase and
 * synthetic-RLS checks ran as a superuser (which bypasses the EXECUTE check).
 *
 * This is a STATIC contract over the migration sequence (both sides live in the repo):
 * replay every GRANT/REVOKE EXECUTE on these functions in filename order and assert
 * `authenticated` ends up holding EXECUTE. A future REVOKE-without-re-grant fails here
 * in CI instead of on a TestFlight device. The live prod grant is tracked separately in
 * docs/superpowers/reference/runtime-contracts-dashboard-checklist.md.
 */

import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'supabase', 'migrations');

/**
 * RLS-PREDICATE helpers: appear in `pg_policies.qual`/`with_check`, so `authenticated`
 * MUST keep EXECUTE. (NOT pure trigger functions like handle_new_user — those are
 * correctly revoked from authenticated because triggers run with table-owner rights.)
 */
const PROTECTED_FNS = [
  'is_trip_member',
  'is_trip_editor',
  'reaction_target_trip',
  '_capsule_is_open',
];

interface GrantEvent {
  kind: 'grant' | 'revoke';
  /** statement targets `authenticated` (directly or via `public`) */
  affectsAuthenticated: boolean;
  /** global order across the sorted migration sequence */
  ord: number;
  file: string;
}

function stripSqlComments(sql: string): string {
  // Drop `-- …` line comments (our own fix migration's docstring *describes* the bad
  // REVOKE — without this, the prose would false-match as a real statement) and `/* */`.
  return sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function migrationsInOrder(): { file: string; sql: string }[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({
      file: f,
      sql: stripSqlComments(fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8')),
    }));
}

function eventsFor(fn: string): GrantEvent[] {
  const events: GrantEvent[] = [];
  const stmtRe = /\b(grant|revoke)\s+execute\s+on\s+function\s+([^;]*?);/gis;
  const fnRe = new RegExp(`\\b${fn}\\b`, 'i');
  migrationsInOrder().forEach(({ file, sql }, fileIdx) => {
    for (const m of sql.matchAll(stmtRe)) {
      const body = m[2];
      if (!fnRe.test(body)) continue;
      const kind = m[1].toLowerCase() === 'grant' ? 'grant' : 'revoke';
      // Role list sits after TO (grant) / FROM (revoke).
      const roleSeg = body
        .split(/\b(?:to|from)\b/i)
        .slice(1)
        .join(' ');
      events.push({
        kind,
        affectsAuthenticated: /\b(authenticated|public)\b/i.test(roleSeg),
        ord: fileIdx * 1_000_000 + (m.index ?? 0),
        file,
      });
    }
  });
  return events.sort((a, b) => a.ord - b.ord);
}

describe('RLS-helper EXECUTE-grant contract', () => {
  it.each(PROTECTED_FNS)(
    'authenticated retains EXECUTE on %s across the migration sequence',
    (fn) => {
      const events = eventsFor(fn);
      // Sanity: the grant for this RLS helper is actively managed in a migration (the
      // re-grant migration must stay in the repo, or a db reset regresses the outage).
      expect(events.length).toBeGreaterThan(0);

      const lastRevoke = Math.max(
        -1,
        ...events.filter((e) => e.kind === 'revoke' && e.affectsAuthenticated).map((e) => e.ord),
      );
      const lastGrant = Math.max(
        -1,
        ...events.filter((e) => e.kind === 'grant' && e.affectsAuthenticated).map((e) => e.ord),
      );

      if (lastRevoke >= 0 && !(lastGrant > lastRevoke)) {
        throw new Error(
          `RLS helper ${fn}() is REVOKEd from authenticated by a later migration than ` +
            `any GRANT (last revoke ord=${lastRevoke}, last grant ord=${lastGrant}). ` +
            `Every RLS policy calling ${fn}() will 403 with "permission denied for function ${fn}". ` +
            `Add a GRANT EXECUTE ON FUNCTION public.${fn}(...) TO authenticated; in a later migration.`,
        );
      }
      // When ever revoked, a re-grant must come after it.
      if (lastRevoke >= 0) expect(lastGrant).toBeGreaterThan(lastRevoke);
    },
  );
});
