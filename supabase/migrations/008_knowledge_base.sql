-- Knowledge base for storing example documents (executive summaries, templates, etc.)
create table knowledge_base (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'executive_summary',
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger knowledge_base_updated_at
  before update on knowledge_base
  for each row execute function update_updated_at();

-- Store generated executive summaries per deal
create table executive_summaries (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  content text not null,
  generated_at timestamptz not null default now()
);

create index idx_executive_summaries_deal_id on executive_summaries(deal_id);
