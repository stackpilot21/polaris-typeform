-- Add DBA and legal name fields to processing_profiles
alter table processing_profiles add column if not exists dba_name text;
alter table processing_profiles add column if not exists legal_name text;
