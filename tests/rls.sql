-- All test records are rolled back; no password or persistent account is created.
begin;
insert into auth.users(id) values ('ebfd0d71-e77c-4664-9c76-b3570d1f61bd'), ('5e6a1429-0ef8-4f48-9b0e-0c64632baeb0');
select set_config('request.jwt.claim.sub','ebfd0d71-e77c-4664-9c76-b3570d1f61bd',true);
select public.health_seed_items();
select set_config('request.jwt.claim.sub','5e6a1429-0ef8-4f48-9b0e-0c64632baeb0',true);
select public.health_seed_items();
insert into public.health_activities(user_id,date,time,category,title) values
 ('5e6a1429-0ef8-4f48-9b0e-0c64632baeb0','2026-10-14','12:00','food','RLS fixture for another user');
select set_config('request.jwt.claim.sub','ebfd0d71-e77c-4664-9c76-b3570d1f61bd',true);
set local role authenticated;
insert into public.health_activities(user_id,date,time,category,title,quantity,unit) values
 ('ebfd0d71-e77c-4664-9c76-b3570d1f61bd','2026-10-14','07:00','food','RLS own fixture',2,'quả');
insert into public.health_habit_checks(user_id,date,habit) values ('ebfd0d71-e77c-4664-9c76-b3570d1f61bd','2026-10-14','read');
insert into public.health_items(user_id,id,kind,name,icon,metric,unit,target) values ('ebfd0d71-e77c-4664-9c76-b3570d1f61bd','custom-pushups','category','Hít đất','dumbbell','quantity','cái',30);
insert into public.health_activities(user_id,date,time,category,title,quantity,unit) values ('ebfd0d71-e77c-4664-9c76-b3570d1f61bd','2026-10-14','08:00','custom-pushups','30 cái hít đất',30,'cái');
update public.health_items set name='Tập hít đất',icon='star',archived=true where id='custom-pushups';
update public.health_items set name='Ăn uống riêng',archived=true where id='food';
select public.health_seed_items();
do $$
begin
 if (select count(*) from public.health_activities) <> 2 then raise exception 'RLS read isolation failed'; end if;
 if (select count(*) from public.health_habit_checks) <> 1 then raise exception 'Habit read failed'; end if;
 if (select count(*) from public.health_items) <> 15 then raise exception 'Item read isolation failed'; end if;
 if not exists(select 1 from public.health_items where id='food' and name='Ăn uống riêng' and archived) then raise exception 'Seeding must preserve customized defaults'; end if;
 if not exists(select 1 from public.health_activities where category='custom-pushups') then raise exception 'Archiving must preserve activities'; end if;
 begin
  insert into public.health_items(user_id,id,kind,name,icon) values ('5e6a1429-0ef8-4f48-9b0e-0c64632baeb0','forbidden','category','Forbidden','star');
  raise exception 'Item write isolation failed';
 exception when insufficient_privilege then null;
 end;
 begin
  insert into public.health_activities(user_id,date,time,category,title) values ('5e6a1429-0ef8-4f48-9b0e-0c64632baeb0','2026-10-14','12:00','food','Forbidden');
  raise exception 'RLS write isolation failed';
 exception when insufficient_privilege then null;
 end;
 begin
  insert into public.health_habit_checks(user_id,date,habit) values ('5e6a1429-0ef8-4f48-9b0e-0c64632baeb0','2026-10-14','read');
  raise exception 'Habit write isolation failed';
 exception when insufficient_privilege then null;
 end;
 if has_table_privilege('anon','public.health_activities','SELECT') or has_table_privilege('anon','public.health_habit_checks','SELECT') or has_table_privilege('anon','public.health_items','SELECT') then raise exception 'Anonymous access must be denied'; end if;
end $$;
reset role;
rollback;
select 'PASS: custom items, rename/icon, archive preserves history, seeds preserve edits, RLS isolation; fixtures rolled back' as result;
