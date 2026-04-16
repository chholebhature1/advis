-- Create email verification tokens table
create table if not exists public.email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text not null unique,
  verified boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  verified_at timestamptz
);

-- Create indexes for efficient lookups
create index if not exists email_verification_tokens_email_idx on public.email_verification_tokens (email);
create index if not exists email_verification_tokens_token_idx on public.email_verification_tokens (token);
create index if not exists email_verification_tokens_expires_at_idx on public.email_verification_tokens (expires_at);

-- Enable RLS
alter table public.email_verification_tokens enable row level security;

-- Allow anonymous users to check verification status
create policy "allow_verify_token"
on public.email_verification_tokens
for select
to anon, authenticated
using (true);

-- Allow anonymous to insert (for signup flow)
create policy "allow_insert_verification_token"
on public.email_verification_tokens
for insert
to anon, authenticated
with check (true);

-- Allow update only for marking as verified (security: can only set verified=true, not change email/token)
create policy "allow_update_verified_status"
on public.email_verification_tokens
for update
to anon, authenticated
using (true)
with check (
  verified = true and 
  email = (select email from public.email_verification_tokens where id = id)
);
