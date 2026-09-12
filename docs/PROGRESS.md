# Progress

## 2026-09-12 — Phase 1 scaffolded and building
- New project `~/isabella-ai-tutor`, mirrors the ArborOS stack on the mysterynuggets25 dev account.
- Stack: Next.js 16 + React 19 + Tailwind v4 + Supabase + Anthropic.
- Built:
  - Two surfaces (learner app + parent console) with a shared email/password sign-in and
    role-based routing (RLS-enforced: parent = all, learner = her own work only).
  - Learner: Today, Subjects, live text Session with "Mia" (character placeholder), Me
    (showing-up gamification).
  - Console: Overview, Transcripts (list + full detail), Settings (subjects on/off + level,
    learning supports, schedule, tone, cost cap), Safety.
  - Tutor loop `/api/tutor` (profile-aware prompt → model → transcript) and `/api/session`
    (end → summarise into the learner profile).
  - The full guardrail system prompt (`src/lib/tutor/prompt.ts`): never writes her work, effort
    not correctness, scope-lock, escalation, Christian Studies framing.
  - Escalation screen (`src/lib/tutor/safety.ts`) + `safety_flags` surfaced in the console.
  - Schema + RLS + seed (2 migrations); 8 subjects, Maths + English active.
- Verified: `npm run build` clean; login renders; protected routes redirect to `/login`.
- Git initialised on `main`, remote `mysterynuggets25-ui/isabella-ai-tutor` (repo not yet created).
- Backup bundle taken.

### Remaining to go live (account steps — see HANDOVER.md §3)
- [ ] Create GitHub repo + `git push -u origin main`
- [ ] Create Supabase project, run both migrations, add 2 auth users + `app_users` rows
- [ ] Add Anthropic API key
- [ ] Import to Vercel + set env vars + deploy

### Next build phases (see HANDOVER.md §4)
- Phase 2: voice in/out, animated character, timed session-arc UI.
- Phase 3: all 8 subjects, calendar/coming-up, upload-and-feedback + OCR, cheat sheets.
- Phase 4: weekly parent note, usage-cap enforcement, export/delete, Year 11 rollover.
