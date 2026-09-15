# Progress

## 2026-09-16 (d) — Education Brain integration (how Isabella actually studies)
Adapted the system to the detailed ChatGPT "Personal Education Brain" profile Isabella has been
studying from, in three parts:
- **Penny teaches her way** (`src/lib/tutor/prompt.ts`): added "HOW SHE LEARNS BEST" — task-first
  (start from her real worksheet/brief, read the command word, answer at that depth/length), match
  depth to the deliverable, iterate don't restart, visible structure (headings/arrows/tables), give
  frames not answers (PEEL, cause→effect, claim→evidence→limitation), keep her voice when editing,
  the assessment-check protocol (required vs optional, name what's missing, never invent
  requirements), misconception→hint→retry→rule, and observation vs proof.
- **Cheat sheets are kept + upgraded** (answers "where do the cheat sheets go?"): `generateCheatSheet`
  now returns coreIdea, answerFrame and a 3-question self-test (the profile's §25 revision template);
  new `src/lib/cheatsheets.ts` saves each sheet to her device; `/cheat-sheets` shows "Your cheat
  sheets" to reopen/delete and renders the new fields. They were ephemeral before — now they persist.
- **"My work" checks the real assessment** (`markWork` + `/api/work`): when the subject has an
  upcoming Canvas assessment, her draft is checked against that actual task — returns a requirement
  checklist (done/not-done) plus the two highest-value gaps, working from the real brief not a
  generic rubric. New "Against the task" panel on the work page.
- Verified: `npm run build` clean. Committed + deployed + backed up + handover updated.

## 2026-09-16 (c) — Phase 4: weekly note, cost cap, export/delete, rollover
- **Weekly parent note**: `generateWeeklyNote` + `/api/cron/weekly-note` (Vercel cron Sun 09:00 UTC
  + "Write this week's note" button on console Overview; dual auth secret-or-parent). Verified: real
  plain-language note built from her memory (netball, fractional scaling).
- **Usage + cost cap**: `model.ts` records per-call token cost into `usage_monthly` (**migration
  0004 — Sarah runs SQL**); `/api/tutor` responds gracefully when `settings.monthly_cap_usd` is hit;
  console Overview shows $spent/cap this month. Safe pre-migration (recordUsage no-ops, cost reads 0).
- **Data & privacy** console page (`/console/data`): export all her data as JSON
  (`/api/console/export`), hard-delete with typed DELETE (`/api/console/delete`), roll over to next
  school year (sets year_level + age). Added "Data" to console nav.
- Handover rewritten to full current state; committed + deployed + backed up + **pushed to GitHub**.
- ALL PHASES (1-4) now built. Remaining polish only (Word/PDF upload extraction, streaming, etc.).

## 2026-09-16 (b) — Switched to OpenAI + push table live
- **Now running on OpenAI** `gpt-4o-mini` (incl. vision). `model.ts` picks OpenAI when
  `OPENAI_API_KEY` is set (it is, in Vercel prod + local), else Claude. Verified live: proactive
  plan opener via OpenAI. ~5x cheaper/token than Haiku (~$1-2/mo). To revert: remove OPENAI_API_KEY.
- **push_subscriptions table applied** by Sarah → reminders ready. `/api/cron/reminders` verified
  ({ok, sent:0} with no subs yet). Isabella turns them on in My corner (Chrome; iPhone needs installed PWA).

## 2026-09-16 — Warmer dashboard + push notifications
- **Home redesigned** (was "too plain"): Penny (full character) on the hero, streak chip, sanctuary
  peek, later-this-week, quick tiles. Alive + personal, still one clear "Start here".
- **Push notifications** (session reminders): `public/sw.js` service worker, VAPID keys generated +
  set in Vercel (NEXT_PUBLIC_VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT) + CRON_SECRET;
  `/api/push/subscribe` (POST/DELETE), daily `/api/cron/reminders` (Sydney session-day aware, prunes
  dead subs) via `vercel.json` cron (21:00 UTC ≈ 7-8am AEST); "Session reminders" toggle in My corner
  (`Reminders.tsx`). **NEEDS migration 0003 (push_subscriptions)** — Sarah runs the SQL to enable.
  Web Push works desktop Chrome; iPhone only once added to home screen.
- Model/cost note: told Sarah subscriptions (ChatGPT/Claude) can't power the app (API only, pay-per-use).
  OpenAI gpt-4o-mini ~5x cheaper/token than Haiku but only $1-3/mo saving; offered to wire it (needs her
  OpenAI key). Awaiting her decision — adapter is `src/lib/tutor/model.ts` (currently Anthropic only).

## 2026-09-15 (late night) — My work, Cheat sheets, proactive lesson plans, calendar upcoming
- **My work** (`/work`, `/api/work` + `markWork`): upload a photo (Claude vision) or paste text →
  "what's working" + EXACTLY two fixes, no rewrite, marked to NESA. Verified (essay → 2 coaching fixes).
- **Cheat sheets** (`/cheat-sheets`, `/api/cheatsheet` + `generateCheatSheet`): built from her profile
  + notes → personalised facts, why, "the one you keep missing" (her real error), NSW wording;
  styleable (warm/notebook/minimal) + print CSS. Verified (ratios sheet used netball + her exact error).
- **Proactive lesson plans**: tutor now LEADS. `/api/tutor` `start` flow → the first message is a plan
  grounded in profile (how she learns + struggles), `next_focus` set at end of last session, and
  upcoming assessments. `summariseSession` outputs `next_focus` (stored in `dimensions._next_focus`).
  Verified: maths opener proposed equivalent-ratios/non-integer scaling using her netball interest.
- **Calendar Upcoming**: scheduled tutor classes (with planned topic) + assessments/exams, merged +
  sorted, class/exam/due badges, Join/Prep buttons. Verified.
- All 8 learner sections now built (Home, Subjects, Calendar, My work, Cheat sheets, My corner).

## 2026-09-15 (night) — Voice input + tutor memory / self-learning
- **Voice input** (`useSpeechInput`, Web Speech API): a "Talk" mic in the call transcribes her
  speech and sends it. Desktop Chrome/Edge only (hidden on Safari/iOS → keyboard mic). Sarah is on a
  computer + chose free browser voice, so: **use Chrome** for the Talk button; "Hear a hello" in the
  customiser is the reliable output test (verified speaking=true on a real tap; silence = device volume).
- **Tutor memory + self-learning**: `summariseSession` now reads prior beliefs and extracts structured
  `dimensions` (hint_need, entry_point, engages_with, struggles_with, pace, interests, recovery,
  confidence); session-end **merges** them into `learner_profile.dimensions` (accumulates + refines).
  The prompt already reads dimensions, so tutoring gets steadily more tailored. **Verified**: one real
  session populated maths dims (interests=netball, struggles_with=non-integer scaling, etc.).
- New **console Memory page** (`/console/memory`): per-subject level, rolling summary, how-she-works
  dimensions, recent notes. Detailed memory kept parent-side (spec's surveillance-feeling caution).

## 2026-09-15 (late) — Clothed character, Calendar + streak, voice hardening
- **Character now has clothes + a body** (`TutorCharacter` `full` mode: dungarees, straps, buttons,
  pocket, arms). Used big in the **call so it fills the screen** like the mock, plus lobby + customiser.
- **Calendar** (`/calendar`): month grid — days she showed up (🔥), scheduled session days, due-item
  dots, today ringed — plus the Coming up list. Replaced "Coming up" in the nav.
- **Duolingo-style day streak** (`lib/streak.ts`, forgiving: alive if active today or yesterday) on
  Calendar + My corner. Sanctuary (collection) + goals already Duolingo-flavoured.
- **Voice hardened**: on-device voice preference, Chrome `resume()` keep-alive, robust selection.
  Added a **"Hear a hello"** test button in the customiser — verified a real tap makes `speaking:true`
  (Karen en-AU). Script-triggered speech is blocked by browsers by design; a real tap works. If still
  silent for the user it's device/tab volume or browser.
- Duolingo ideas still open: daily-goal ring, achievements, streak freeze, reminder notifications.

## 2026-09-15 (eve) — Pig default + CALL rebuild + My corner + Coming up
- **Default tutor = cute pig "Penny"** (added `pig` to the animal set + renderer). Isabella still
  fully redesigns it.
- **Session rebuilt as a real call** (`SessionChat.tsx`): tutor on camera, her **self-view tile**
  (camera **off by default**, real local webcam toggle via getUserMedia, never uploaded), timer,
  **sound + camera controls**, **Leave**, and a live **SHARED BOARD** beside it (conversation as a
  working document). Type-instead always present. Fully responsive (side-by-side desktop, stacked
  mobile) — verified both.
- **My corner** (`/me`): progress stats, a growing **animal SANCTUARY** (one friend joins per
  completed week = a week with 3+ sessions), and her own **goals** (per-device localStorage).
- **Coming up**: learner `/coming-up` (3 on screen, each with next step + "work on it") and parent
  `/console/coming-up` add/edit form, both on the existing `assessments` table (no migration).
- Nav: Coming up now built; My work / Cheat sheets still "soon". Verified live, deployed.

### Still to build (Phase 3–4 remainder)
- **My work** (upload photo/Word/PDF → what's working + exactly 2 fixes, no rewrite). Needs a
  Supabase **Storage bucket** (Sarah creates it / applies policy) + text extraction + a vision call.
- **Cheat sheets** (printable, generated from her own history; she styles them).
- **Push notifications** for session reminders — needs a **service worker + web-push (VAPID) backend**;
  iOS requires the installed PWA. (Manifest/installability already done.)
- **Weekly parent note** + **usage-cap enforcement** + **export/delete** + **Year 11 rollover** (Phase 4).

## 2026-09-15 (pm) — Mockup redesign + animal tutor + responsive + PWA
- New look & feel per Sarah's desktop mockup: warm **cream / sage / terracotta** palette (remapped
  the teal/coral tokens so the whole app shifted) + **Fraunces serif** headings.
- **Tutor is now an ANIMAL Isabella picks** (fox/cat/rabbit/bear/owl) with name, fur colour and
  voice (male/female) — `persona.ts` reshaped, `TutorCharacter.tsx` draws animals, `/tutor` picker
  rebuilt, `useTutorVoice` honours gender. Default = fox "Hazel".
- **Responsive**: calm left **sidebar on desktop** (`LearnerNav`), **bottom bar on mobile**; Home
  restyled to the reserved tone (Start here / Later this week / "do ten minutes instead").
- **Installable app**: `public/manifest.webmanifest` + `icon.svg`, apple-web-app meta.
- Softened the privacy line ("Only you and Mum can see them, no one else.").
- Verified in-browser (desktop sidebar + mobile + animal picker switching + session lobby). Deployed.

### NOT built yet (proposed next — see HANDOVER §5/§6 and below)
- **The call centrepiece rebuild**: self-view tile, camera OFF by default, mic/camera buttons,
  live **shared board** where working appears, "type instead" in-call, leave button.
- **My corner = animal sanctuary** growing one animal per completed week (Me page is still the old
  gamification).
- **Goals + progress** tracking.
- **Push notifications** for session reminders (needs a service worker + web-push/VAPID backend;
  iOS requires the PWA be installed to the home screen). Manifest/installability is done; push is not.
- Coming up / My work / Cheat sheets pages (shown as "soon" in the nav).

## 2026-09-15 — Tutor customiser + Haiku cost switch + debug pass
- **Isabella can customise her tutor** (`/tutor`): name, skin tone, hair colour, hair style, live
  preview. Stored per-device in localStorage (`src/lib/persona.ts`), no DB change. Chosen name is
  passed into each tutor request so the model self-identifies. Entry points on Today + Me.
  Verified in-browser: changed to "Zoe" (dark skin, bun) and it carried across the app.
- **Cheaper model:** session model set to Haiku via `TUTOR_SESSION_MODEL` (Vercel + local). ~$2–5/mo.
- **Spoken greeting on Join** so voice is obvious on desktop (free browser TTS; verified speaking=true).
- **Debug/gaps fixes:**
  - BUG: Christian Studies faith-handling was injected into *every* subject (school context is
    "Christian school"); now gated to the `christian` subject only.
  - Model now told its name in the system prompt.
  - `/session` guards against opening an inactive subject.
  - Safe-area padding on the call view for iPhone notch.
  - Abandoned sessions close+summarise via `pagehide` `sendBeacon`.
- HANDOVER.md rewritten as a full build bible incl. detailed Phase 3–4 specs for another builder.

## 2026-09-14 — Phase 2 (voice + character + live-call) + full NSW grounding
- **Animated character** Mia (`TutorCharacter.tsx`): warm tutor on a headset, blinks, idles,
  mouth moves while speaking.
- **Voice out** via browser SpeechSynthesis (`useTutorVoice.ts`): free, on-device, works on iPhone,
  iOS gesture unlock (`prime()`), speaker toggle. No token/API cost — reads the already-generated
  text aloud. Neural-TTS upgrade left as an optional paid swap behind the same interface.
- **Immersive live-call session**: moved `/session` out of the tab-bar shell; join lobby, LIVE
  badge, live countdown + session-arc stage, active-speaker glow, call-style controls.
- **Today redesigned** into a personal organiser: time-of-day greeting, next-session hero with
  Join, streak, jump-in tiles.
- **Sign-out** button added (console + Me).
- **All 8 subjects now have NSW/NESA Year 10 grounding** (`curriculum/index.ts`): maths, english,
  science, hsie, pdhpe, food_tech, money (financial maths), christian (school's own program, not
  NESA). NOTE: Sarah activated all 8 subjects in the console (seed only had maths+english).
- Verified end to end in-browser as Isabella (login → join → coached reply). Deployed to prod.

## 2026-09-14 — LIVE on Vercel (dev account)
- Deployed to production: **https://isabella-ai-tutor.vercel.app** (mysterynuggets25 dev account,
  project `isabella-ai-tutor`, org `team_AdqDghUWAggSEMrWTTfL2YPT`).
- Supabase project live (ref `ynzgathnscejsvtaasih`): both migrations run, 8 subjects (Maths +
  English active), settings row, 2 auth users mapped in `app_users`
  (sarah.bellefever@gmail.com = parent, isabella.saputra@gmail.com = learner).
- All 4 env vars set in Vercel Production (URL + anon = Config; service_role + Anthropic = Secret).
- Verified end to end: Anthropic key works and Mia coaches instead of answering; login renders;
  protected routes redirect; production URL public (no Vercel SSO wall).
- Added a sign-out button (console header + learner Me) for shared-device use.
- Deployed via Vercel CLI from local (not git-connected), so GitHub `origin/main` is 1 commit
  behind prod (the sign-out commit). Push it when the account allows, or connect the repo in the
  Vercel dashboard for auto-deploy.

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
