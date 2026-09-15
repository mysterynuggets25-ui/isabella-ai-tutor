-- Isabella AI Tutor — seed data
-- The eight NSW Year 10 subjects. Phase 1 activates Maths + English only;
-- Sarah flips the rest on from the console when ready.

insert into subjects (key, name, blurb, active, level, sort_order) values
  ('maths',        'Maths',            'Number, algebra, trig',      true,  'standard', 1),
  ('english',      'English',          'Essays, texts, analysis',    true,  'standard', 2),
  ('science',      'Science',          'Chemistry, biology, physics', false, 'standard', 3),
  ('hsie',         'HSIE',             'History and geography',       false, 'standard', 4),
  ('pdhpe',        'PDHPE',            'Health and movement',         false, 'standard', 5),
  ('food_tech',    'Food Technology',  'Nutrition, food safety',      false, 'standard', 6),
  ('money',        'Money Matters',    'Budgeting, financial maths',  false, 'standard', 7),
  ('christian',    'Christian Studies','Scripture, written responses',false, 'standard', 8)
on conflict (key) do nothing;

-- Single settings row.
insert into settings (id) values (1)
on conflict (id) do nothing;

-- Empty profile shells for the active subjects so the tutor always has a row.
insert into learner_profile (subject_key, summary, dimensions)
select key, 'No sessions yet.', '{}'::jsonb from subjects where active = true
on conflict (subject_key) do nothing;
