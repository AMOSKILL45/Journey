import type { Milestone } from '@features/milestones';

/**
 * Milestone row augmented with the `lat` / `lng` generated columns added in
 * the Phase 3 T2 migration. The Supabase-generated `Database` type may lag
 * behind the migration apply (regen is a separate step), so we declare this
 * extension here and rely on `withCoords` to narrow at the boundary.
 *
 * Once the official type regeneration includes lat/lng on Milestone.Row,
 * this alias can collapse to a plain re-export.
 */
export type MilestoneWithCoords = Milestone & {
  lat: number | null;
  lng: number | null;
};

/**
 * Narrowing helper — milestones coming back from Postgres always have
 * `lat` / `lng` set once the migration is applied (generated columns), but
 * the static type might still be the un-augmented row. Use this at any
 * map-layer boundary.
 */
export function withCoords(milestone: Milestone): MilestoneWithCoords {
  return milestone as MilestoneWithCoords;
}
