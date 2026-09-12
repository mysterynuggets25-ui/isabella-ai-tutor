# Decisions

Design decisions and why, so a future maintainer does not undo them by accident.

- **D1 — Mirror the ArborOS stack, not Viktor Spaces.** The spec's "Viktor Space" is a mockup
  platform; production is Next.js + Supabase + Vercel on the mysterynuggets25 account, exactly like
  ArborOS. Keeps one deploy pattern across the dev account.

- **D2 — Two roles in one database, separated by RLS.** `parent` reads/writes everything; `learner`
  reads her config and her own sessions/messages and nothing else. `profile_notes`, `safety_flags`
  and `weekly_notes` have no learner policy at all, so she cannot see them. The server uses the
  service-role key (RLS bypass) to write notes and flags. Do not add a learner policy to those
  tables.

- **D3 — The learner profile is the product.** Sessions read the per-subject `learner_profile`
  before starting and write a short structured note back on end (via the cheap model). This keeps
  every prompt small (summary, not full history), which is what keeps cost at ~$7–15/month.

- **D4 — "Never writes her work" lives in three places.** The system prompt states it, the
  transcript makes it visible to Sarah, and (Phase 2+) response checks can enforce it. It is the
  single most important instruction. NSW assesses writing she produces herself, and schools screen
  for AI-written work.

- **D5 — Reward effort, never correctness.** Gamification (Me screen + prompt) rewards showing up.
  No leaderboards, no points for speed, nothing to lose. Rewarding right answers teaches a 15-year-old
  to avoid hard questions.

- **D6 — Escalation is explicit, high-recall, and points to humans.** A regex first-pass on her own
  words backs up the model's care; on a hit she gets AU support lines and Sarah is flagged. It is
  deliberately over-sensitive (better a false flag than a miss) and is not a crisis service.

- **D7 — Model-agnostic adapter, Anthropic default.** `TUTOR_SESSION_MODEL` / `TUTOR_ADHOC_MODEL`
  env vars; Sonnet for sessions (quality), Haiku for the ad-hoc path (cost). Mirrors Cove's
  route-by-need pattern.

- **D8 — Plain punctuation, no em dashes** in learner-facing copy (house-style lean, kept
  consistent with Belle Fever customer-copy convention).

- **D9 — Phase 1 is a desire test.** Two subjects, text only, before paying for voice or the
  character. If she does not reach for it in a fortnight, the fix is in how it talks to her, not in
  more features.
