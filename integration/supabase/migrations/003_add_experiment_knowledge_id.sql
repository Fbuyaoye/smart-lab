-- Run after the existing experiments table migration.
-- `id` remains the database primary key; `knowledge_id` is the stable key used
-- by the AI knowledge base and must not be derived from an auto-increment ID.
alter table public.experiments
  add column if not exists knowledge_id text;

create unique index if not exists experiments_knowledge_id_unique_idx
  on public.experiments (knowledge_id)
  where knowledge_id is not null;

comment on column public.experiments.knowledge_id is
  'Stable AI knowledge-base identifier, for example photoelectric-effect.';
