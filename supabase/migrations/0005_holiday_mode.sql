-- How tutoring runs during school holidays.
--   normal  = same as term
--   reduced = a lighter touch (fewer session days)  [default]
--   off     = a proper break (no scheduled sessions)
alter table settings
  add column if not exists holiday_mode text not null default 'reduced'
  check (holiday_mode in ('off', 'reduced', 'normal'));
