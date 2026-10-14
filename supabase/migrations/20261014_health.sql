create table if not exists public.health_activities (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 date date not null, time time not null,
 category text not null check (category in ('food','fitness','study','rest','sleep','water')),
 title text not null check (length(trim(title)) between 1 and 100),
 detail text not null default '' check (length(detail) <= 160),
 quantity numeric not null default 0 check (quantity between 0 and 100000),
 unit text not null default '' check (length(unit) <= 20),
 minutes integer not null default 0 check (minutes between 0 and 1440),
 sleep_start time, sleep_end time,
 created_at timestamptz not null default now()
);
create index if not exists health_activities_user_date on public.health_activities(user_id, date);
alter table public.health_activities enable row level security;
create policy "health_activities_own_rows" on public.health_activities for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.health_activities from anon;
grant select, insert, update, delete on public.health_activities to authenticated;

create table if not exists public.health_habit_checks (
 user_id uuid not null references auth.users(id) on delete cascade,
 date date not null, habit text not null check (habit in ('move','breakfast','read','sleep')),
 primary key (user_id,date,habit)
);
alter table public.health_habit_checks enable row level security;
create policy "health_habits_own_rows" on public.health_habit_checks for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.health_habit_checks from anon;
grant select, insert, update, delete on public.health_habit_checks to authenticated;
