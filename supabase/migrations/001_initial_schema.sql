-- Polaris Typeform: Initial Schema

-- Deals
create table deals (
  id uuid primary key default gen_random_uuid(),
  merchant_name text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text not null,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'IN_PROGRESS', 'DOCUMENTS_COMPLETE', 'APPROVED', 'DECLINED')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Documents
create table documents (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  type text not null
    check (type in ('VOIDED_CHECK', 'BANK_LETTER', 'DRIVERS_LICENSE', 'PRINCIPAL_INFO')),
  status text not null default 'MISSING'
    check (status in ('MISSING', 'SUBMITTED', 'APPROVED', 'REJECTED')),
  storage_path text,
  file_name text,
  uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (deal_id, type)
);

-- Principals
create table principals (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  ssn_encrypted text,
  ssn_iv text,
  ssn_tag text,
  dob date,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  ownership_percentage numeric(5,2),
  drivers_license_path text,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Follow-up sequences
create table follow_up_sequences (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null unique references deals(id) on delete cascade,
  interval_days int not null default 2,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'PAUSED', 'COMPLETED')),
  next_send_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Follow-up messages
create table follow_up_messages (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references follow_up_sequences(id) on delete cascade,
  channel text not null check (channel in ('SMS', 'EMAIL')),
  sent_at timestamptz not null default now(),
  content text not null,
  external_id text
);

-- Delegation tokens
create table delegation_tokens (
  id uuid primary key default gen_random_uuid(),
  principal_id uuid not null references principals(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_documents_deal_id on documents(deal_id);
create index idx_principals_deal_id on principals(deal_id);
create index idx_follow_up_sequences_next_send on follow_up_sequences(next_send_at) where status = 'ACTIVE';
create index idx_delegation_tokens_token on delegation_tokens(token);

-- Updated_at trigger for deals
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger deals_updated_at
  before update on deals
  for each row execute function update_updated_at();
