-- Chỉ đọc. Chạy trong SQL Editor của đúng project, gửi lại kết quả để duyệt.
select 'table' as kind, schemaname as schema_name, tablename as name, null::text as parent
from pg_tables where schemaname = 'public'
union all
select 'view', schemaname, viewname, null from pg_views where schemaname = 'public'
union all
select 'materialized_view', schemaname, matviewname, null from pg_matviews where schemaname = 'public'
union all
select case p.prokind when 'p' then 'procedure' else 'function' end,
 n.nspname, p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', null
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind in ('f', 'p')
 and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
union all
select 'trigger', n.nspname, t.tgname, c.relname
from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and not t.tgisinternal
union all
select 'policy', schemaname, policyname, tablename from pg_policies where schemaname = 'public'
order by kind, name;
