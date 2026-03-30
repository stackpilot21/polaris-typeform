-- Transcript intake, checklist automation, and processing profiles

-- Processing profiles: business & processing details extracted from transcripts
create table processing_profiles (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null unique references deals(id) on delete cascade,
  industry text,
  business_type text check (business_type in ('B2B', 'B2C', 'BOTH')),
  years_in_business integer,
  ein_age_months integer,
  website text,
  referral_source text,
  referral_contact text,
  card_present boolean not null default false,
  card_not_present boolean not null default true,
  needs_pos boolean not null default false,
  needs_gateway boolean not null default false,
  gateway_preference text,
  needs_ach boolean not null default false,
  monthly_volume_estimate numeric(12,2),
  avg_transaction_size numeric(10,2),
  high_ticket_expected numeric(10,2),
  high_ticket_initial_limit numeric(10,2),
  risk_level text default 'TBD' check (risk_level in ('LOW', 'MEDIUM', 'HIGH', 'TBD')),
  risk_factors text,
  processor text,
  processor_team text,
  trade_component text,
  setup_fee_arrangement text,
  strategic_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger processing_profiles_updated_at
  before update on processing_profiles
  for each row execute function update_updated_at();

-- Checklist items: auto-generated + manual task tracking
create table checklist_items (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  task text not null,
  owner text not null default 'ran' check (owner in ('jason', 'ran', 'merchant', 'underwriting')),
  status text not null default 'PENDING' check (status in ('PENDING', 'IN_PROGRESS', 'COMPLETE', 'BLOCKED')),
  due_date date,
  auto_generated boolean not null default false,
  depends_on uuid references checklist_items(id) on delete set null,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_checklist_items_deal_id on checklist_items(deal_id);
create index idx_checklist_items_status on checklist_items(deal_id, status);

-- Rate comparisons: competitor vs our pricing
create table rate_comparisons (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  competitor_name text not null,
  competitor_setup_fee numeric(10,2),
  competitor_monthly_fee numeric(10,2),
  competitor_qualified_rate numeric(6,4),
  competitor_mid_qual_rate numeric(6,4),
  competitor_non_qual_rate numeric(6,4),
  competitor_per_transaction_fee numeric(6,4),
  our_proposed_rate numeric(6,4),
  our_setup_fee numeric(10,2),
  our_monthly_fee numeric(10,2),
  our_per_transaction_fee numeric(6,4),
  estimated_monthly_savings numeric(10,2),
  trade_component text,
  pricing_model text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_rate_comparisons_deal_id on rate_comparisons(deal_id);

-- Transcript records: raw input + AI extraction results
create table transcripts (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  source text not null default 'manual' check (source in ('aircall', 'loom', 'manual')),
  transcript_type text not null default 'call' check (transcript_type in ('call', 'internal_notes', 'other')),
  raw_text text not null,
  ai_extraction jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_transcripts_deal_id on transcripts(deal_id);

-- Add reviewed_at and reviewed_by to documents if not already present
alter table documents add column if not exists reviewed_at timestamptz;
alter table documents add column if not exists reviewed_by text;

-- Add custom_message to follow_up_sequences if not present
alter table follow_up_sequences add column if not exists custom_message text;
