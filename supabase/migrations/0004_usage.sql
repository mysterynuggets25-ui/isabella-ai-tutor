-- Monthly model usage, for the cost cap + a usage line in the console.
-- Written by the server (service role) after each model call; parent can read.

create table if not exists usage_monthly (
  month         text primary key,        -- 'YYYY-MM' (Sydney)
  calls         int    not null default 0,
  input_tokens  bigint not null default 0,
  output_tokens bigint not null default 0,
  cost_usd      numeric not null default 0,
  updated_at    timestamptz not null default now()
);

alter table usage_monthly enable row level security;
create policy usage_parent_read on usage_monthly for select using (auth_role() = 'parent');
