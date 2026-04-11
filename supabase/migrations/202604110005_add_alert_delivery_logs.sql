create table if not exists public.alert_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  alert_type public.alert_type not null,
  channel public.communication_channel not null,
  alert_date date not null,
  frequency text not null default 'daily' check (frequency in ('realtime', 'daily', 'weekly', 'monthly')),
  severity text not null check (severity in ('low', 'medium', 'high')),
  route_status text not null check (route_status in ('ready', 'deferred', 'blocked', 'suppressed')),
  dispatch_status text not null check (dispatch_status in ('queued', 'sent', 'failed', 'skipped')),
  destination text,
  title text not null,
  message text not null,
  metric_label text,
  metric_value numeric(10,2),
  provider text,
  provider_message_id text,
  provider_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz
);

create index if not exists alert_delivery_logs_user_date_idx
  on public.alert_delivery_logs (user_id, alert_date desc, created_at desc);

create index if not exists alert_delivery_logs_type_status_idx
  on public.alert_delivery_logs (alert_type, dispatch_status, alert_date desc);

-- Prevent duplicate deliveries of the same alert type/channel for the same user on the same day.
create unique index if not exists alert_delivery_logs_dedupe_idx
  on public.alert_delivery_logs (user_id, alert_type, channel, alert_date)
  where dispatch_status in ('queued', 'sent');

alter table public.alert_delivery_logs enable row level security;
alter table public.alert_delivery_logs force row level security;

drop policy if exists alert_delivery_logs_manage_own_rows on public.alert_delivery_logs;
create policy alert_delivery_logs_manage_own_rows
on public.alert_delivery_logs
for all
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
)
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
);
