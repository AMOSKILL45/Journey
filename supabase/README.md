# Supabase

Migrations and edge functions for the Journey project (`ewsoupkfkachxidmuwoi`).

## Applying migrations

### Option A — Supabase Dashboard (manual paste)

1. Open https://supabase.com/dashboard/project/ewsoupkfkachxidmuwoi/sql/new
2. Paste the content of the migration file (in order, by filename prefix)
3. Click "Run"
4. Verify in Tables tab

### Option B — Supabase CLI (local install required)

```bash
npm install -g supabase
supabase login
supabase link --project-ref ewsoupkfkachxidmuwoi
supabase db push
```

### Option C — MCP plugin:supabase:supabase

Once authenticated, Claude can apply migrations directly via `mcp__plugin_supabase_supabase__apply_migration`.

## Migration order

1. `20260525000001_profiles.sql` — profiles table + RLS + auto-create on signup trigger
2. `20260525000002_trips.sql` — trips + trip_members + trip_invitations + RLS + helpers

## Verifying

After migrations, in Supabase Dashboard:

- Tables: should show `profiles`, `trips`, `trip_members`, `trip_invitations` all with RLS enabled
- Database → Functions: `handle_new_user`, `handle_new_trip`, `set_updated_at`, `is_trip_member`, `is_trip_editor`
- Database → Triggers: `on_auth_user_created`, `on_trip_created`, `profiles_updated_at`, `trips_updated_at`
- Authentication → Policies: 4+ policies per table

## Edge functions (Phase 1 Task 17)

- `accept-invitation` — atomic invite token validation + member insert

Deploy via Supabase CLI: `supabase functions deploy accept-invitation` or MCP `deploy_edge_function`.
