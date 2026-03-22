create table messages (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade,
  direction text not null check (direction in ('INBOUND', 'OUTBOUND')),
  channel text not null check (channel in ('SMS', 'EMAIL')),
  from_number text,
  to_number text,
  from_email text,
  to_email text,
  subject text,
  body text not null,
  external_id text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_messages_deal_id on messages(deal_id);
create index idx_messages_created_at on messages(created_at desc);
create index idx_messages_from_number on messages(from_number);
