# Isabella AI Tutor — Handover

> A voice-enabled AI tutor for Isabella (NSW, Year 10, Christian school) plus a private parent
> console for Sarah. This is the complete build bible: current live state, how to run/deploy, and
> what remains — enough that a **fresh Claude (or any builder) with no prior context** can continue.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (Postgres + Auth + RLS) ·
**OpenAI** (gpt-4o-mini; Claude Haiku fallback) · Web Push · Vercel. Mirrors the **ArborOS** pattern
on the `mysterynuggets25` dev account.

---

## 0. Live state (2026-09-16)

| Thing | Value |
|---|---|
| **Production URL** | https://isabella-ai-tutor.vercel.app |
| **GitHub** | `git@github.com:mysterynuggets25-ui/isabella-ai-tutor.git` (SSH key `~/.ssh/id_ed25519_arborpride`, set as repo `core.sshCommand`) |
| **Vercel** | project `isabella-ai-tutor`, org `team_AdqDghUWAggSEMrWTTfL2YPT` (mysterynuggets25 dev account) |
| **Supabase** | ref `ynzgathnscejsvtaasih` (`https://ynzgathnscejsvtaasih.supabase.co`) |
| **Logins** | `sarah.bellefever@gmail.com` = parent · `isabella.saputra@gmail.com` = learner (temp pw `Isabella-Tutor-26`, set via admin API) — both mapped in `app_users` |
| **Local path** | `~/isabella-ai-tutor` · **Backups** | `~/isabella-ai-tutor-backups/` (tar.gz; git-bundle sometimes classifier-blocked) |

**Phases 1–3 are DONE and live.** Phase 4 (parent/admin) is specced in §6, not built.

### Model (provider-agnostic — `src/lib/tutor/model.ts`)
Uses **OpenAI `gpt-4o-mini`** when `OPENAI_API_KEY` is set (it is), else **Claude Haiku**. One
`complete()` helper serves runTutor / markWork (vision) / generateCheatSheet / summariseSession. To
revert to Claude: remove `OPENAI_API_KEY`. OpenAI needs account credit (a ChatGPT sub does NOT work
for the API). Cost ≈ **$1–2/month**.

### Env vars (Vercel Production + local `.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL          (config)   https://ynzgathnscejsvtaasih.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY     (config)   public anon key — RLS protects
SUPABASE_SERVICE_ROLE_KEY         (secret)   server-only, bypasses RLS
OPENAI_API_KEY                    (secret)   makes the app use OpenAI (remove → Claude)
ANTHROPIC_API_KEY                 (secret)   fallback model + still used if OpenAI unset
NEXT_PUBLIC_VAPID_PUBLIC_KEY      (config)   web push
VAPID_PRIVATE_KEY                 (secret)   web push
VAPID_SUBJECT                     (config)   mailto:sarah.bellefever@gmail.com
CRON_SECRET                       (secret)   protects /api/cron/* routes
CANVAS_ICS_URL                    (secret)   Isabella's Canvas calendar feed (.ics) for assessment sync
TUTOR_SESSION_MODEL/ADHOC_MODEL   (config)   Claude model ids (used only if on Claude)
OPENAI_SESSION_MODEL/ADHOC_MODEL  (optional) default gpt-4o-mini
```

### Deploy (CLI from local — NOT git-connected)
```bash
cd ~/isabella-ai-tutor && npx vercel@59 --prod --yes
```
- `git push origin main` is **auto-blocked on this machine's account** (a classifier guardrail).
  Sarah runs the push herself; production does not depend on it.
- Vercel CLI must be the **mysterynuggets25** account (`npx vercel@59 whoami`). If not, `vercel login`.
- Adding a `NEXT_PUBLIC_` credential-looking var via CLI needs `--type config`.

### Migrations
`supabase/migrations/`: `0001_init.sql` (schema + RLS), `0002_seed.sql` (8 subjects; Maths+English
active — Sarah later activated all 8; names later changed to "Maths"/"English"), `0003_push.sql`
(push_subscriptions), `0004_usage.sql` (usage_monthly — cost cap/meter), `0005_holiday_mode.sql`
(settings.holiday_mode). Apply in the Supabase SQL editor. NOTE: `create policy` is not idempotent —
re-running a migration whose policy exists errors "already exists"; run only the new statements.

### Since-launch capabilities (all live)
- **Canvas sync**: `lib/canvas.ts` pulls assessments/exams from `CANVAS_ICS_URL` (.ics), parses due
  times (Sydney), type + weighting + task details, maps courses→subjects, filters out lessons; live
  (throttled `maybeSyncCanvas()` on calendar/home load) + `/api/canvas/sync` button. Stored as
  assessments `source='schedule'`; details go in `next_step` and into the tutor's lesson plan.
- **Holidays**: `lib/holidays.ts` (ACC 2026 term-break dates) + `settings.holiday_mode`
  (off/reduced/normal) — calendar + home respect it via `classScheduled()`.
- **Interactive calendar** (`CalendarBoard.tsx`): clickable days, event chips, Up-next strip, per-type
  icons (lesson/assessment/quiz/exam/holiday/mine), month nav; Isabella adds her own items
  (localStorage `lib/events.ts`).
- **Wellbeing**: `summariseSession` emits a `concern` → `safety_flags` category `concern` (amber in
  the console "Wellbeing" view, distinct from crisis); the weekly note covers wellbeing + social.
- **Tutor prompt**: CONNECT (love learning + come out of her shell) + HELPING GROW (goals + AI
  literacy, integrity-first) sections in `prompt.ts`.
- **Dashboard**: study-time chart + weekly progress ring, colourful subjects, Penny mood states
  (happy/proud/sleepy, `TutorCharacter` `mood` prop), "you finished" card, goal nudge, Lexend body
  font, nav simplified (Cheat sheets is a quick action, not a nav item).

---

## 1. Product overview

Two surfaces, one email/password sign-in, role decides where you land (enforced server-side):

**Learner app** (`/`): Home (warm organiser — Penny, streak, sanctuary peek, tiles), Subjects,
Calendar (streak + upcoming classes/assessments), My work (upload/paste → feedback), Cheat sheets,
My corner (progress, sanctuary, goals, reminders), `/tutor` (design the tutor), `/session` (the call).

**Parent console** (`/console`): Overview, Sessions (transcripts), Coming up (add assessments),
Memory (what the tutor learned about her), Subjects & settings, Safety.

**The tutor** (`/session`, an immersive video-call): the animal Isabella designed on "camera"
(clothed, fills the screen), her self-view (camera OFF by default), timer, a **live shared board**,
sound + camera controls, a **🎤 Talk** mic (desktop Chrome speech-to-text) + typing, and **Leave**.
It **opens with a lesson plan** and never asks "what do you want to do?".

### Guardrails (must never regress — `src/lib/tutor/prompt.ts` + `safety.ts`)
Never writes work she could submit (coaches only) · rewards effort not correctness · scope-locked ·
escalation on self-harm/abuse/bullying/distress (safe reply + AU lines + `safety_flags` shown to
parent) · Christian Studies framing only on the `christian` subject.

### How the tutor is personal (the asset)
After every session it updates a per-subject memory: a rolling summary, **structured `dimensions`**
(how she learns, what she struggles with, interests…) that **accumulate**, and a **`next_focus`**
(the plan for next time). Before each session it reads that memory + upcoming assessments and **leads
with a plan** grounded in it. Verified: it used her netball interest and non-integer-scaling struggle
unprompted. Detailed memory is parent-side (`/console/memory`) by design (surveillance caution).

---

## 2. File map

```
src/app/(learner)/        learner shell (LearnerNav: sidebar desktop / bottom bar mobile)
  page.tsx                Home — warm organiser
  subjects/  calendar/    subject grid · month grid + streak + upcoming classes/assessments
  work/                   My work — photo (vision) or text -> what's working + 2 fixes, no rewrite
  cheat-sheets/           printable, personalised, styleable
  me/                     My corner — progress, sanctuary (animal/week), goals, reminders, sign out
  tutor/                  customiser — animal / name / colour / voice + "Hear a hello"
src/app/session/page.tsx  the immersive call (own guard, outside the tab shell)
src/app/console/          overview / transcripts / coming-up / memory / settings / safety + sign out
src/app/login/            shared sign-in
src/app/api/
  tutor/route.ts          one tutor turn; `start:true` = proactive plan opener; safety screen
  session/route.ts        end session -> summarise -> merge memory + next_focus (sendBeacon-safe)
  work/route.ts           markWork (photo/text feedback)
  cheatsheet/route.ts     generateCheatSheet
  push/subscribe/route.ts store/remove a browser's push subscription
  cron/reminders/route.ts daily reminder send (Vercel cron; Sydney session-day aware)
src/lib/
  tutor/prompt.ts         ** system prompt + all boundaries + lesson-plan lead **
  tutor/model.ts          provider-agnostic adapter (OpenAI or Claude) + summarise/mark/cheatsheet
  tutor/useTutorVoice.ts  browser TTS out (free); tutor/useSpeechInput.ts  Web Speech STT (Chrome)
  tutor/safety.ts         escalation screen; curriculum/index.ts  NESA refs (all 8 subjects)
  persona.ts (localStorage animal/name/colour/voice) · goals.ts · streak.ts · supabase/* · auth.ts
src/components/            SessionChat, TutorCharacter (animals + `full` dungarees), LearnerNav,
                          PersonaName, Goals, Reminders, SignOutButton
public/sw.js              service worker (push); public/manifest.webmanifest + icon.svg (installable)
vercel.json               daily reminders cron (21:00 UTC ≈ 7-8am AEST)
supabase/migrations/      0001 init+RLS · 0002 seed · 0003 push · 0004 usage · 0005 holiday_mode
src/lib/                  canvas.ts (Canvas .ics sync) · holidays.ts · events.ts (personal calendar)
src/components/           CalendarBoard.tsx (interactive) · GoalNudge · AckFlagButton · WeeklyNoteButton
```

---

## 3. Data model + RLS

Tables: `app_users` (role map), `subjects`, `settings` (single row + `session_days`, tone, supports,
`monthly_cap_usd`…), `learner_profile` (per subject: summary, `level_estimate`, `dimensions` jsonb —
incl. reserved `_next_focus`), `profile_notes` (append-only), `sessions`, `messages`, `assessments`
(coming-up), `safety_flags`, `weekly_notes` (Phase 4 stub), `push_subscriptions`.

RLS: **parent** = full; **learner** = read subjects/settings/profile/assessments, read+write own
sessions/messages, own push_subscriptions. `profile_notes`/`safety_flags`/`weekly_notes` have **no**
learner policy (server writes them with the service role). Single-family assumption (one learner);
scope `messages`/`sessions` by owner if it ever becomes multi-student.

**Persona (animal/name/colour/voice)** lives in the browser's localStorage, not the DB — no
migration, instant, hers. The chosen name is passed into each `/api/tutor` call so the model matches it.

---

## 4. Voice + notifications

- **Voice out**: browser SpeechSynthesis (free, on-device). Only speaks on a real tap (browser rule);
  "Hear a hello" in `/tutor` is the reliable test. Chrome keep-alive + on-device voice preference.
- **Voice in ("Talk")**: Web Speech API — **desktop Chrome/Edge only**, hidden on Safari/iOS (there,
  the phone keyboard mic dictates). For real cross-device talk later, move to an STT API.
- **Notifications**: Web Push. `Reminders.tsx` (My corner) registers `sw.js`, asks permission,
  subscribes, POSTs to `/api/push/subscribe`. Daily `vercel.json` cron → `/api/cron/reminders`
  (checks Sydney weekday vs `session_days`, sends via web-push, prunes dead subs). **Chrome desktop;
  iPhone only once added to home screen.** Verified route returns `{ok, sent}`.

---

## 5. Running locally
`cp .env.example .env.local`, fill values, `npm install && npm run dev`. Remove `OPENAI_API_KEY`
locally to test the Claude path.

---

## 6. Phase 4 — parent/admin (NOT built)

1. **Weekly parent note.** `weekly_notes` table exists; console Overview already renders the latest.
   A weekly job summarises the week (what improved, where she stalled, what I'd do next) from
   `sessions` + `profile_notes`, writes a `weekly_notes` row. Schedule via a new `vercel.json` cron →
   an authed API route (reuse the `CRON_SECRET` pattern). Deliver to Sarah (email/push), not Isabella.

2. **Usage-cap enforcement.** `settings.monthly_cap_usd` is stored, not enforced. Add per-call token
   accounting (both SDKs return `usage`), sum per calendar month (a `usage_log` table or a monthly
   counter), and when the cap is hit return a graceful "that's enough for this month" instead of
   calling the model. Show a usage line in the console.

3. **Export + delete.** Console buttons: export all her data (profile, transcripts, notes) as
   JSON/zip; hard-delete everything with confirmation. Spec requirement.

4. **Year 11 rollover.** Swap the subject list for Year 11, bump age/year in settings; keep or
   archive the Year 10 profile. Mostly a settings + subjects change.

---

## 7. Known gaps
- Deploy is CLI-from-local, not git-connected (GitHub can lag prod).
- Persona is per-device (not synced / not parent-visible).
- Cost cap not enforced (Phase 4). No streaming in the call (one request/reply).
- Safety screen is a regex first-pass (high-recall), backs up the model's care, not a crisis service.
- Voice input is Chrome-only; My work reads photos + pasted text (Word/PDF file extraction is a small add).
- OpenAI needs account credit topped up or the tutor stops responding.

---

## 8. Backups
```bash
cd ~/isabella-ai-tutor && tar --exclude='./node_modules' --exclude='./.next' --exclude='./.git' \
  --exclude='./.vercel' -czf ~/isabella-ai-tutor-backups/isabella-ai-tutor-src-$(date +%Y%m%d-%H%M%S).tar.gz .
```

*Prepared for Sarah on the mysterynuggets25 dev account. Phases 1–3 live; Phase 4 specced in §6.*
