-- Run as database admin after migration and seed. All test rows roll back.
begin;
insert into auth.users (id) values ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$
declare s public.study_sessions; w bigint; e uuid := gen_random_uuid(); i int;
begin
 select id into w from public.words order by id limit 1;
 if w is null then raise exception 'Seed words before tests'; end if;
 s := public.start_study_session();
 for i in 1..3 loop
  perform public.record_study_answer(s.id,w,'flashcard',4,null,gen_random_uuid());
 end loop;
 if (select interval_days from public.user_word_progress where word_id=w) <> 15
 or (select repetitions from public.user_word_progress where word_id=w) <> 3
 then raise exception 'SM-2 initial 1/6/15 intervals failed'; end if;
 perform public.finish_study_session(s.id,5);
 insert into public.user_settings(user_id,new_words_per_day) values(auth.uid(),10);
 begin
  insert into public.user_settings(user_id) values('10000000-0000-0000-0000-000000000002');
  raise exception 'Cross-owner settings insert accepted';
 exception when insufficient_privilege then null; end;
 s := public.start_study_session();
 begin
  perform public.finish_study_session(s.id,1);
  raise exception 'Empty session accepted';
 exception when raise_exception then
  if sqlerrm <> 'Cannot finish an empty session' then raise; end if;
 end;
 begin
  perform public.record_study_answer(s.id,w,'flashcard',2,null,gen_random_uuid());
  raise exception 'Invalid rating accepted';
 exception when raise_exception then
  if sqlerrm <> 'Invalid answer' then raise; end if;
 end;
 perform public.record_study_answer(s.id,w,'quiz_meaning',0,'wrong choice',e);
 perform public.record_study_answer(s.id,w,'quiz_meaning',0,'wrong choice',e);
 begin
  perform public.record_study_answer(s.id,w,'flashcard',5,null,e);
  raise exception 'Reused event payload accepted';
 exception when raise_exception then
  if sqlerrm <> 'Event id already used' then raise; end if;
 end;
 if (select wrong from public.study_sessions where id=s.id) <> 1 then raise exception 'Duplicate event counted'; end if;
 perform public.record_study_answer(s.id,w,'flashcard',5,null,gen_random_uuid());
 perform public.finish_study_session(s.id,30);
 perform public.finish_study_session(s.id,30);
 if (select correct_streak from public.user_word_progress where word_id=w) <> 0 then raise exception 'Wrong session incremented streak'; end if;
 if (select words_studied from public.study_sessions where id=s.id) <> 1 then raise exception 'Distinct word count failed'; end if;
 for i in 1..3 loop
  s := public.start_study_session();
  perform public.record_study_answer(s.id,w,'flashcard',4,null,gen_random_uuid());
  perform public.record_study_answer(s.id,w,'flashcard',4,null,gen_random_uuid());
  perform public.finish_study_session(s.id,20);
 end loop;
 if (select in_mistakes from public.user_word_progress where word_id=w) then raise exception 'Three completed correct sessions failed graduation'; end if;
 begin
  update public.user_word_progress set correct_count=900 where word_id=w;
  raise exception 'Derived progress writable';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
 if exists(select 1 from public.study_sessions) or exists(select 1 from public.user_word_progress) or exists(select 1 from public.mistake_log) then raise exception 'RLS leaked another owner'; end if;
 if exists(select 1 from public.user_settings) then raise exception 'Settings leaked another owner'; end if;
 begin
  perform public.record_study_answer(s.id,w,'flashcard',5,null,gen_random_uuid());
  raise exception 'Cross-owner RPC accepted';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin
  perform count(*) from public.words;
  raise exception 'Anonymous words read accepted';
 exception when insufficient_privilege then null; end;
 begin
  perform public.start_study_session();
  raise exception 'Anonymous session RPC accepted';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: RLS, ownership, anonymous denial, idempotence, SM-2 and distinct-session mistakes' as result;
