-- Chat history for Polaris Assistant conversations
create table chat_history (
  id uuid primary key default gen_random_uuid(),
  deal_ids uuid[] default '{}',
  messages jsonb not null default '[]',
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger chat_history_updated_at
  before update on chat_history
  for each row execute function update_updated_at();

create index idx_chat_history_updated_at on chat_history(updated_at desc);
