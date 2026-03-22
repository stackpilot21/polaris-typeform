-- Allow custom document types and store their display names
alter table documents drop constraint documents_type_check;
alter table documents add constraint documents_type_check check (type in ('VOIDED_CHECK', 'BANK_LETTER', 'DRIVERS_LICENSE', 'PRINCIPAL_INFO', 'CUSTOM'));
alter table documents add column if not exists custom_name text;
