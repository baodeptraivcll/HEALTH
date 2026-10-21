alter table public.words add column if not exists synonyms jsonb not null default '[]'::jsonb;
alter table public.words add constraint words_synonyms_array check (jsonb_typeof(synonyms) = 'array');
