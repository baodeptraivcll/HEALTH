-- Run only on the verified legacy health project. Auth and system schemas are untouched.
begin;
do $$
begin
 if exists (select 1 from pg_tables where schemaname='public' and tablename not in ('health_activities','health_habit_checks','health_items'))
 or exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('S','f') and not (c.relkind='S' and exists (select 1 from pg_depend d join pg_class t on t.oid=d.refobjid join pg_namespace tn on tn.oid=t.relnamespace where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype in ('a','i') and tn.nspname='public' and t.relname in ('health_activities','health_habit_checks','health_items'))))
 or exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typtype in ('e','d','r','m') and not exists (select 1 from pg_depend d where d.classid='pg_type'::regclass and d.objid=t.oid and d.deptype='e'))
 or exists (select 1 from pg_views where schemaname='public')
 or exists (select 1 from pg_matviews where schemaname='public')
 or exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind in ('f','p') and not (p.proname='health_seed_items' and p.pronargs=0) and not exists (select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e'))
 or exists (select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal)
 or exists (select 1 from pg_policies where schemaname='public' and (tablename,policyname) not in (('health_activities','health_activities_own_rows'),('health_habit_checks','health_habits_own_rows'),('health_items','health_items_own_rows')))
 then raise exception 'Unknown public objects found. Review inventory before reset.'; end if;
end $$;
drop function if exists public.health_seed_items();
drop table if exists public.health_activities;
drop table if exists public.health_habit_checks;
drop table if exists public.health_items;
commit;
