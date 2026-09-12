-- Isabella AI Tutor — initial schema (Phase 1)
-- Next.js + Supabase, mirrors the arborOS stack pattern.
--
-- Design note: the learner profile is the product. Sessions read it before
-- every session and write a structured note back after. Keep it small and
-- specific so the prompt stays cheap.
--
-- Two roles share this database:
--   parent  -> Sarah's console. Sees everything, sets all settings.
--   learner -> Isabella's app. Reads her config + her own work, writes
--              sessions/messages. Never sees the console, safety flags,
--              or parent notes.
--
-- Apply in the Supabase SQL editor (or `supabase db push`). See HANDOVER.md.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Role mapping: which auth user is the parent, which is the learner
-- ---------------------------------------------------------------------------
create table if not exists app_users (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  role         text not null check (role in ('parent', 'learner')),
  display_name text,
  created_at   timestamptz not null default now()
);

-- Helper: the current request's role ('parent' | 'learner' | null)
create or replace function auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from app_users where user_id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- Subjects (the eight NSW Year 10 subjects; Phase 1 activates Maths + English)
-- ---------------------------------------------------------------------------
create table if not exists subjects (
  key        text primary key,           -- e.g. 'maths', 'english'
  name       text not null,              -- display name on the tile
  blurb      text,                       -- one-line subtext on the tile
  active     boolean not null default false,
  level      text not null default 'standard' check (level in ('support','standard','advanced')),
  sort_order int  not null default 0
);

-- ---------------------------------------------------------------------------
-- Settings (single household row, controlled by the console)
-- ---------------------------------------------------------------------------
create table if not exists settings (
  id                 int primary key default 1 check (id = 1),
  age                int  not null default 15,
  year_level         text not null default 'Year 10',
  curriculum         text not null default 'NSW / NESA',
  school_context     text not null default 'Christian school',
  learning_supports  text[] not null default '{}',  -- dyslexia|adhd|processing|anxiety
  session_length_min int  not null default 30 check (session_length_min in (15,20,30)),
  session_days       text[] not null default array['Tue','Thu','Sat'],
  tone               text not null default 'warm' check (tone in ('warm','balanced','brisk')),
  voice              text not null default 'default',
  voice_speed        numeric not null default 1.0,
  monthly_cap_usd    numeric not null default 15,
  reward_ladder      jsonb not null default '[]'::jsonb,
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Learner profile: one row per subject. The dimensions the spec says the
-- tutor watches (chunk size, entry point, hint ladder, context need,
-- recovery, interest hooks, time of day) live in `dimensions` jsonb.
-- ---------------------------------------------------------------------------
create table if not exists learner_profile (
  subject_key   text primary key references subjects(key) on delete cascade,
  level_estimate text,                    -- tutor's observed working level
  dimensions    jsonb not null default '{}'::jsonb,
  summary       text,                      -- rolling plain-language summary
  updated_at    timestamptz not null default now()
);

-- Append-only structured notes, one per session close.
create table if not exists profile_notes (
  id          uuid primary key default gen_random_uuid(),
  subject_key text not null references subjects(key) on delete cascade,
  session_id  uuid,
  note        text not null,              -- e.g. "needed two hints on equivalent ratios..."
  signals     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sessions + transcript
-- ---------------------------------------------------------------------------
create table if not exists sessions (
  id           uuid primary key default gen_random_uuid(),
  subject_key  text references subjects(key) on delete set null,
  mode         text not null default 'scheduled' check (mode in ('scheduled','adhoc')),
  status       text not null default 'active' check (status in ('active','ended')),
  topic        text,
  arc_stage    text,                       -- recall|teach|check|teachback|close
  hint_count   int  not null default 0,
  engagement   jsonb not null default '{}'::jsonb,   -- {disengaged_at_min, reengaged_on, ...}
  win          text,                       -- the one win at close
  next_try     text,                       -- the one thing to try
  summary      text,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz
);

create table if not exists messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  role       text not null check (role in ('learner','tutor','system')),
  content    text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_session_idx on messages(session_id, created_at);

-- ---------------------------------------------------------------------------
-- Coming up (assessment / due-item awareness). Phase 3 fills this out.
-- ---------------------------------------------------------------------------
create table if not exists assessments (
  id          uuid primary key default gen_random_uuid(),
  subject_key text references subjects(key) on delete set null,
  title       text not null,
  due_date    date,
  next_step   text,
  source      text not null default 'manual' check (source in ('manual','schedule')),
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Safety flags (escalation). Parent-only visibility.
-- ---------------------------------------------------------------------------
create table if not exists safety_flags (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid references sessions(id) on delete set null,
  category       text not null,            -- self_harm|abuse|bullying|distress|other
  excerpt        text,
  message_shown  text,
  created_at     timestamptz not null default now(),
  acknowledged_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Weekly parent note
-- ---------------------------------------------------------------------------
create table if not exists weekly_notes (
  id           uuid primary key default gen_random_uuid(),
  week_start   date not null,
  body         text not null,
  generated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table app_users       enable row level security;
alter table subjects        enable row level security;
alter table settings        enable row level security;
alter table learner_profile enable row level security;
alter table profile_notes   enable row level security;
alter table sessions        enable row level security;
alter table messages        enable row level security;
alter table assessments     enable row level security;
alter table safety_flags    enable row level security;
alter table weekly_notes    enable row level security;

-- Everyone signed in can read their own app_users row.
create policy app_users_self_read on app_users
  for select using (user_id = auth.uid());

-- Parent: full read/write on everything.
create policy parent_all_subjects        on subjects        for all using (auth_role() = 'parent') with check (auth_role() = 'parent');
create policy parent_all_settings        on settings        for all using (auth_role() = 'parent') with check (auth_role() = 'parent');
create policy parent_all_profile         on learner_profile for all using (auth_role() = 'parent') with check (auth_role() = 'parent');
create policy parent_all_notes           on profile_notes   for all using (auth_role() = 'parent') with check (auth_role() = 'parent');
create policy parent_all_sessions        on sessions        for all using (auth_role() = 'parent') with check (auth_role() = 'parent');
create policy parent_all_messages        on messages        for all using (auth_role() = 'parent') with check (auth_role() = 'parent');
create policy parent_all_assessments     on assessments     for all using (auth_role() = 'parent') with check (auth_role() = 'parent');
create policy parent_all_flags           on safety_flags    for all using (auth_role() = 'parent') with check (auth_role() = 'parent');
create policy parent_all_weeklynotes     on weekly_notes    for all using (auth_role() = 'parent') with check (auth_role() = 'parent');

-- Learner: read config (subjects, settings, her profile, coming-up),
-- read + write her sessions and messages. No console, flags, or parent notes.
create policy learner_read_subjects    on subjects        for select using (auth_role() = 'learner');
create policy learner_read_settings    on settings        for select using (auth_role() = 'learner');
create policy learner_read_profile     on learner_profile for select using (auth_role() = 'learner');
create policy learner_read_assessments on assessments     for select using (auth_role() = 'learner');
create policy learner_rw_sessions      on sessions        for all using (auth_role() = 'learner') with check (auth_role() = 'learner');
create policy learner_rw_messages      on messages        for all using (auth_role() = 'learner') with check (auth_role() = 'learner');

-- Note: profile_notes, safety_flags and weekly_notes have NO learner policy,
-- so the learner cannot read or write them. The server (service role) writes
-- notes and flags; RLS is bypassed for the service role by design.
