# Isabella AI Tutor — Handover

> A voice-enabled AI tutor for Isabella (NSW, Year 10, Christian school) plus a private parent
> console for Sarah. Built to `Isabella AI Tutor - Build Specification v1.1.pdf`. This document is
> the complete build bible: current live state, how to run and deploy, and enough Phase 3–4 detail
> that a **fresh Claude (or any builder) with no prior context** can continue it.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (Postgres + Auth + RLS) ·
Anthropic API · Vercel. Mirrors the **ArborOS** pattern on the `mysterynuggets25` dev account.

---

## 0. Live state (as of 2026-09-15)

| Thing | Value |
|---|---|
| **Production URL** | https://isabella-ai-tutor.vercel.app |
| **GitHub** | `git@github.com:mysterynuggets25-ui/isabella-ai-tutor.git` (SSH key `~/.ssh/id_ed25519_arborpride`, set as repo `core.sshCommand`) |
| **Vercel** | project `isabella-ai-tutor`, org `team_AdqDghUWAggSEMrWTTfL2YPT` (mysterynuggets25 dev account) |
| **Supabase** | project ref `ynzgathnscejsvtaasih` (`https://ynzgathnscejsvtaasih.supabase.co`) |
| **Logins** | `sarah.bellefever@gmail.com` = parent · `isabella.saputra@gmail.com` = learner (mapped in `app_users`) |
| **Local path** | `~/isabella-ai-tutor` · **Backups** | `~/isabella-ai-tutor-backups/` |

**Phases 1 and 2 are DONE and live.** Phases 3 and 4 are specced below, not built.

### Env vars (set in Vercel Production + local `.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL          (config)  https://ynzgathnscejsvtaasih.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY     (config)  public anon key — safe to expose, RLS protects
SUPABASE_SERVICE_ROLE_KEY         (secret)  server-only, bypasses RLS
ANTHROPIC_API_KEY                 (secret)  console.anthropic.com, no-training terms
TUTOR_SESSION_MODEL               (config)  claude-haiku-4-5-20251001   ← set for cost
TUTOR_ADHOC_MODEL                 (optional) defaults to claude-haiku-4-5-20251001
```
`NEXT_PUBLIC_` credential-looking vars need `--type config` when added via the Vercel CLI.

### Deploy (important — not git-connected)
Deploys are done from local via the Vercel CLI, **not** GitHub auto-deploy:
```bash
cd ~/isabella-ai-tutor && npx vercel@59 --prod --yes
```
- **`git push origin main` is auto-blocked on this machine's account** (a classifier guardrail).
  Sarah runs the push herself; production does not depend on it. To get GitHub auto-deploy later,
  connect the repo in the Vercel dashboard (Project → Settings → Git).
- The Vercel CLI must be logged into the **mysterynuggets25** account (`npx vercel@59 whoami` →
  `mysterynuggets25-...`). If it shows a Belle Fever account, `npx vercel@59 login` as the dev account.

---

## 1. Product overview

Two surfaces, one email/password sign-in, role decides where you land (enforced server-side):

| Surface | Routes | Who | What |
|---|---|---|---|
| Learner app | `/`, `/subjects`, `/session`, `/me`, `/tutor` | Isabella | Personal organiser home, subject tiles, the immersive live call, showing-up gamification, tutor customiser |
| Parent console | `/console`, `/console/transcripts`, `/console/settings`, `/console/safety` | Sarah | Overview, full transcripts, all settings, safety flags |
| Sign-in | `/login` | both | Supabase email + password |

**The learner profile is the product.** Every session reads the per-subject profile before it starts
and writes a short structured note back on end (`/api/session` → `summariseSession`).

### The guardrails (must never regress — `src/lib/tutor/prompt.ts` + `safety.ts`)
- **Never writes work she could submit** — coaches, never hands over answers or paragraphs.
- **Rewards effort, not correctness.**
- **Scope-locked** to schoolwork; no web, images, roleplay, companionship.
- **Escalation** on self-harm/abuse/bullying/distress → safe reply + AU lines (Kids Helpline
  1800 55 1800, Lifeline 13 11 14) + `safety_flags` row shown in the console. High-recall, not a
  crisis service.
- **Christian Studies framing** — ONLY on the `christian` subject (present the position she studies,
  point to parent/teacher on contested questions, never argue her out of her faith).

---

## 2. File map

```
src/app/
  (learner)/            learner tab-bar shell (guard: parent -> /console)
    page.tsx            Today — personal organiser, next-session hero, streak, jump-in
    subjects/           subject grid (active only)
    me/                 gamification + "Customise your tutor" + sign out
    tutor/              CUSTOMISER — Isabella picks name, skin, hair, style (localStorage)
  session/page.tsx      immersive live-call route (own guard; outside the tab shell)
  console/              parent console (overview / transcripts / settings / safety) + sign out
  login/                shared sign-in
  api/tutor/route.ts    POST: one tutor turn (auth, safety screen, profile-aware prompt, model)
  api/session/route.ts  POST {action:'end'}: close session + summarise into profile (sendBeacon-safe)
src/components/
  SessionChat.tsx       the live "call" client component (lobby, timer/arc, voice, controls)
  TutorCharacter.tsx    animated SVG tutor on a headset; renders Isabella's chosen look
  PersonaName.tsx       client component that renders her chosen tutor name
  SignOutButton.tsx
src/lib/
  persona.ts            Isabella's tutor name+look, stored in localStorage (per device)
  tutor/prompt.ts       ** system prompt + all boundaries — most important file **
  tutor/model.ts        Anthropic adapter (session + adhoc models) + summariser
  tutor/useTutorVoice.ts browser TTS hook (free, iOS-gesture unlock via prime())
  tutor/safety.ts       escalation screen + safe response
  curriculum/index.ts   NSW/NESA Year 10 reference for all 8 subjects
  supabase/{client,server,service}.ts
  auth.ts               getUserRole()
src/proxy.ts            Supabase session refresh (Next 16 "proxy")
supabase/migrations/    0001_init.sql (schema+RLS), 0002_seed.sql (8 subjects, Maths+English active)
```

### Persona (tutor look/name) design note
Isabella's chosen **name + look live in her browser's localStorage** (`src/lib/persona.ts`), not the
database — so it needs no migration, no parent approval, and works instantly. The chosen **name is
passed into each `/api/tutor` request** so the model self-identifies correctly. Trade-off: it does
not sync across devices and the parent console does not see it. To make it server-side later, add
`tutor_name`/`tutor_look` columns to `settings` (or a `tutor_persona` table) + a learner-writable
path, and read them in the server components.

---

## 3. Data model + RLS (supabase/migrations/0001_init.sql)

Tables: `app_users` (role map), `subjects`, `settings` (single row), `learner_profile` (per subject),
`profile_notes` (append-only), `sessions`, `messages`, `assessments` (coming-up, Phase 3 stub),
`safety_flags`, `weekly_notes` (Phase 4 stub).

RLS: **parent** = full read/write on everything. **learner** = read subjects/settings/profile/
assessments, read+write own sessions/messages. `profile_notes`/`safety_flags`/`weekly_notes` have
**no learner policy** (she can't see them); the server writes them with the service-role key.
`auth_role()` resolves the current user's role from `app_users`.

Single-family assumption: `messages`/`sessions` learner policy is not row-scoped per user (there is
one learner). If this ever becomes multi-student, scope those policies by owner.

---

## 4. Running + the model

**Run locally:** copy `.env.example` → `.env.local`, fill values, `npm install && npm run dev`.

**Model:** `src/lib/tutor/model.ts`. Sessions use `TUTOR_SESSION_MODEL` (currently
`claude-haiku-4-5-20251001` for cost), the ad-hoc/summariser path uses `TUTOR_ADHOC_MODEL`. Both
default to Anthropic; the adapter is the single place to add another provider (e.g. OpenAI
`gpt-4o-mini`) — implement a second branch keyed off the model id and set the env var. To go back to
higher quality, set `TUTOR_SESSION_MODEL=claude-sonnet-5` in Vercel and redeploy.

**Cost:** free browser voice (no tokens). Text at ~7 sessions/week is ~$2–5/month all-Haiku
(~$5–12 with Sonnet). Cost cap is stored (`settings.monthly_cap_usd`) but **not yet enforced** —
Phase 4.

---

## 5. Phase 3 — the full product (NOT built)

Goal: make it a daily tool, not a drill app. Build in this order; each is independent.

1. **Coming-up / calendar awareness.** `assessments` table already exists (subject_key, title,
   due_date, next_step, source, done). Build:
   - Learner: a "Coming up" section on Today and/or a `/calendar` view — everything due in the next
     10 days, **capped at 3 items on screen**, each with a worked-out next step and a progress bar.
   - Console: let Sarah add/edit due items (a form writing `assessments`). Optionally import a term
     assessment schedule (CSV/paste) once a term.
   - The tutor should read upcoming items and offer to prep for them.

2. **Bring your work in (upload + feedback).** The highest-value feature.
   - Learner uploads a photo / Word doc / PDF of work she has done. Use Supabase Storage for the
     file. Extract text: PDFs/Docx server-side; photos via an AI vision call (handwriting OCR).
   - Return, in this exact order: **what is working**, **exactly two things to fix**, and a button to
     talk each fix through with the tutor. **No rewrite button** — and the screen says so in plain
     words (this is a spec hard rule; the boundary is visible, not hidden).
   - For essays: mark against NESA marking criteria; never rewrite her sentences.

3. **Cheat sheets.** One printable page per topic, generated **from her own session history**
   (`profile_notes` + `messages`), not generic notes. Fixed structure: core facts, the one-line why,
   "the one you keep missing" (drawn from her real errors), and NSW exam phrasing. Save as PDF; the
   tutor can then quiz her on it.

4. **All 8 subjects fully.** Subjects already all togg-able and NSW-grounded
   (`curriculum/index.ts`). Expand each subject's curriculum reference as needed; confirm the
   Christian Studies grounding with the school's actual document if one exists (open question in the
   spec).

5. **Richer gamification.** Weekly quest (3 sessions, resets Sunday — partly present on `/me`),
   week-based streak with 2 silent forgiveness days/month, badges for firsts and unlocks. Keep the
   rule: reward effort/showing-up, never correctness; no leaderboards, nothing to lose.

Data/infra Phase 3 will add: Supabase Storage bucket + policies for uploads; a vision model call in
the model adapter; a PDF generation path for cheat sheets (e.g. server-side render to PDF).

---

## 6. Phase 4 — runs itself (NOT built)

1. **Weekly parent note.** `weekly_notes` table exists. A weekly job summarises the week in plain
   language (what improved, where she stalled, what I'd do next) from `sessions` + `profile_notes`,
   writes a `weekly_notes` row; the console Overview already renders the latest note. Schedule it
   with a Vercel Cron (add `vercel.json` crons) or a Supabase pg_cron → an authed API route. Deliver
   to Sarah's phone, not Isabella's.

2. **Usage-cap enforcement.** `settings.monthly_cap_usd` is stored but not enforced. Add per-request
   token accounting (the Anthropic response has `usage`), sum per calendar month, and when the cap is
   hit return a graceful "that's enough for this month" message instead of calling the model. Show a
   usage line in the console.

3. **Export + delete.** One button each in the console: export all of Isabella's data (profile,
   transcripts) as JSON/zip; delete everything (hard delete with confirmation). Spec requirement.

4. **Year 11 rollover.** Let Sarah swap the subject list for Year 11 choices and bump age/year level
   in settings; keep or archive the Year 10 profile. Mostly a settings + subjects change.

---

## 7. Known gaps / things a maintainer should know

- **Deploy is CLI-from-local, not git-connected** (see §0). GitHub can lag production.
- **Persona is per-device** (localStorage), not synced or visible to the parent (see §2).
- **Cost cap not enforced** (Phase 4).
- **Abandoned sessions** rely on a `pagehide` `sendBeacon` to close+summarise; if that misses (hard
  crash), the session stays `active` and never summarises. A periodic sweep (cron) that ends stale
  active sessions would harden this.
- **Chat is not streamed** — one request, one reply. Streaming would improve feel.
- **Safety screen is a regex first-pass**, deliberately high-recall; it backs up the model's care,
  it does not replace it. Review real transcripts and tune `safety.ts`.
- **Voice is the phone's built-in TTS** (free). A neural voice (ElevenLabs/OpenAI) is an optional
  paid upgrade behind `useTutorVoice`'s interface.
- **Single-family RLS** assumption (see §3).

---

## 8. Backups
Snapshots in `~/isabella-ai-tutor-backups/`. `git bundle` is sometimes blocked by the account
classifier, so a plain source archive is the reliable fallback:
```bash
cd ~/isabella-ai-tutor && tar --exclude='./node_modules' --exclude='./.next' --exclude='./.git' \
  --exclude='./.vercel' -czf ~/isabella-ai-tutor-backups/isabella-ai-tutor-src-$(date +%Y%m%d-%H%M%S).tar.gz .
```

---

*Prepared for Sarah on the mysterynuggets25 dev account. Phases 1–2 live; Phases 3–4 specced above.*
