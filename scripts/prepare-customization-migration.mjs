import fs from 'node:fs';
import {defaultItems} from '../src/lib/model.ts';
const seed=JSON.stringify(defaultItems.map(({user_id,...item})=>item)).replace(/'/g,"''");
const columns='id, kind, name, icon, metric, unit, target, overview, quick, quick_amount, position, archived, route';
const records=`jsonb_to_recordset('${seed}'::jsonb) as seed(id text,kind text,name text,icon text,metric text,unit text,target numeric,overview boolean,quick boolean,quick_amount numeric,position integer,archived boolean,route text)`;
fs.writeFileSync('supabase/migrations/20261014_customization.sql',`begin;
create table public.health_items (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text not null default gen_random_uuid()::text check (length(id) between 1 and 80),
 kind text not null check (kind in ('category','habit','navigation')),
 name text not null check (length(trim(name)) between 1 and 100),
 icon text not null check (length(icon) between 1 and 32),
 metric text not null default 'count' check (metric in ('count','quantity','minutes','sleep')),
 unit text not null default '' check (length(unit)<=20),
 target numeric not null default 0 check (target between 0 and 1000000),
 overview boolean not null default false, quick boolean not null default false,
 quick_amount numeric not null default 0 check (quick_amount between 0 and 100000),
 position integer not null default 0 check (position between 0 and 100000),
 archived boolean not null default false,
 route text not null default 'today' check (route in ('today','journal','habits','week')),
 primary key (user_id,id)
);
alter table public.health_items enable row level security;
create policy "health_items_own_rows" on public.health_items for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
revoke all on public.health_items from anon;
grant select,insert,update,delete on public.health_items to authenticated;

insert into public.health_items(user_id,${columns}) select users.id,seed.* from auth.users as users cross join ${records};
create function public.health_seed_items() returns void language sql security invoker set search_path='' as $function$
 insert into public.health_items(user_id,${columns}) select auth.uid(),seed.* from ${records} where auth.uid() is not null on conflict (user_id,id) do nothing;
$function$;
revoke all on function public.health_seed_items() from public,anon;
grant execute on function public.health_seed_items() to authenticated;

alter table public.health_activities drop constraint health_activities_category_check;
alter table public.health_activities add column icon text not null default '' check (length(icon)<=32);
alter table public.health_activities add constraint health_activities_item_fk foreign key(user_id,category) references public.health_items(user_id,id);
alter table public.health_habit_checks drop constraint health_habit_checks_habit_check;
update public.health_habit_checks set habit='sleep-habit' where habit='sleep';
alter table public.health_habit_checks add constraint health_habit_checks_item_fk foreign key(user_id,habit) references public.health_items(user_id,id);
commit;
`);
