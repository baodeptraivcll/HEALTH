-- Additive only: preserve word ids, account data and all learning progress.
begin;
alter table public.words
 add column if not exists study_term text,
 add column if not exists example_vi text,
 add column if not exists example_answer text,
 add column if not exists example_source text,
 add column if not exists source_note text,
 add column if not exists dictionary_url text;
commit;
