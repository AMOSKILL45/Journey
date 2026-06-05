-- Phase 7B — Polls
-- Mirrors what was applied to ewsoupkfkachxidmuwoi via MCP (migration phase_7b_polls).
-- is_trip_member / is_trip_editor are the 2-arg (trip_id, user_id) overloads from 4A.

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  question text not null,
  options jsonb not null,
  created_by uuid not null references auth.users(id),
  expires_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create index polls_trip on public.polls (trip_id, created_at desc);
alter table public.polls enable row level security;
create policy polls_select on public.polls for select using (is_trip_member(trip_id, auth.uid()));
create policy polls_insert on public.polls for insert with check (is_trip_editor(trip_id, auth.uid()) and created_by = auth.uid());
create policy polls_update on public.polls for update using (created_by = auth.uid() or is_trip_editor(trip_id, auth.uid()));

create table public.poll_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_id text not null,
  voted_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);
alter table public.poll_votes enable row level security;
create policy votes_select on public.poll_votes for select using (is_trip_member((select trip_id from public.polls where id = poll_id), auth.uid()));
-- A vote must be cast by a MEMBER of the poll's trip (not merely a self-identified user),
-- else a user who knows a poll UUID from another trip could stuff votes there.
create policy votes_insert on public.poll_votes for insert with check (user_id = auth.uid() and is_trip_member((select trip_id from public.polls where id = poll_id), auth.uid()));
create policy votes_update on public.poll_votes for update using (user_id = auth.uid() and is_trip_member((select trip_id from public.polls where id = poll_id), auth.uid()));
alter publication supabase_realtime add table public.poll_votes;
