alter table if exists public.email_verification_tokens
  add column if not exists request_ip text;

create index if not exists email_verification_tokens_request_ip_created_at_idx
  on public.email_verification_tokens (request_ip, created_at desc);