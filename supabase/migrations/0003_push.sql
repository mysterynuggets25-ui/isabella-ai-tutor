-- Web Push subscriptions for session reminders.
-- Each browser that turns on reminders stores a push subscription here; a daily
-- cron reads them (service role) and sends "you've got a session today".

create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('parent', 'learner')),
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

-- Each signed-in user manages their own subscriptions. The cron uses the
-- service role (which bypasses RLS) to read them all when sending.
create policy push_own_select on push_subscriptions for select using (user_id = auth.uid());
create policy push_own_insert on push_subscriptions for insert with check (user_id = auth.uid());
create policy push_own_delete on push_subscriptions for delete using (user_id = auth.uid());
