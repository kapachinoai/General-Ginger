-- General Ginger: database setup for Supabase.
-- Paste this whole file into Supabase > SQL Editor > New query, then press Run.
-- Safe to run once on a new project.

-- Players' public profile: gamer tag and running points total
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tag text not null unique check (tag ~ '^[A-Za-z0-9_]{3,15}$'),
  total_points integer not null default 0,
  created_at timestamptz not null default now()
);

-- One row per verified game
create table if not exists public.points_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null unique,
  game text not null default 'flight',
  score integer not null,
  points integer not null,
  created_at timestamptz not null default now()
);
create index if not exists points_ledger_user_day on public.points_ledger (user_id, created_at);

-- Players can read their own rows; only the Worker (service role) writes.
alter table public.profiles enable row level security;
alter table public.points_ledger enable row level security;
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "read own points" on public.points_ledger;
create policy "read own points" on public.points_ledger for select using (auth.uid() = user_id);

-- Start of today in Lagos time
create or replace function public.lagos_day_start()
returns timestamptz language sql stable as $$
  select date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos';
$$;

-- Start of today in UTC: the daily points limit resets at midnight UTC for players everywhere
create or replace function public.points_day_start()
returns timestamptz language sql stable as $$
  select date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
$$;

-- Points a player has earned today
create or replace function public.points_today(p_user uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(sum(points), 0)::int from points_ledger
  where user_id = p_user and created_at >= points_day_start();
$$;

-- Saves a verified game's points, applying the daily cap, in one step.
create or replace function public.add_points(p_user uuid, p_session text, p_score int, p_points int, p_daily_cap int)
returns table(awarded int, total int, today int)
language plpgsql security definer set search_path = public as $$
declare
  v_today int;
  v_award int;
  v_total int;
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));   -- one save at a time per player
  v_today := points_today(p_user);
  v_award := greatest(0, least(p_points, p_daily_cap - v_today));
  insert into points_ledger (user_id, session_id, score, points) values (p_user, p_session, p_score, v_award);
  update profiles set total_points = total_points + v_award where id = p_user returning total_points into v_total;
  awarded := v_award; total := coalesce(v_total, 0); today := v_today + v_award;
  return next;
end;
$$;

-- The Worker (service role) reads and writes these tables; players may read their own rows
grant select, insert, update on public.profiles to service_role;
grant select, insert on public.points_ledger to service_role;
grant select on public.profiles, public.points_ledger to authenticated;
grant execute on function public.add_points(uuid, text, int, int, int) to service_role;
grant execute on function public.points_today(uuid) to service_role;
grant execute on function public.lagos_day_start() to service_role;
grant execute on function public.points_day_start() to service_role;

-- Only the Worker may call these
revoke execute on function public.add_points(uuid, text, int, int, int) from public, anon, authenticated;
revoke execute on function public.points_today(uuid) from public, anon, authenticated;

-- Leaderboard view: top tags and totals only, no emails
create or replace view public.leaderboard as
  select tag, total_points from public.profiles order by total_points desc limit 100;
grant select on public.leaderboard to anon, authenticated;
