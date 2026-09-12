# Isabella AI Tutor — Handover

> A private, voice-ready AI tutor for Isabella (NSW, Year 10, Christian school) plus a
> parent console for Sarah. Built to the spec in
> `Isabella AI Tutor - Build Specification v1.1.pdf`. This document is everything a
> builder (or future me) needs to finish the account setup and carry it forward.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (Postgres + Auth + RLS) · Anthropic API · Vercel.
This mirrors the **ArborOS** pattern on the `mysterynuggets25` dev account (`~/Downloads/Arbor Pride/arboros`).

**Repo:** `git@github.com:mysterynuggets25-ui/isabella-ai-tutor.git` (create the empty repo, then push — see below).
**Local path:** `~/isabella-ai-tutor`

---

## 1. What is built (Phase 1)

Phase 1 from the spec: **Maths + English, text tutor, the learner profile, and the parent
console with settings and transcripts.** Voice and the animated character are Phase 2.

Two surfaces, one sign-in, role decides where you land:

| Surface | Route | Who | What |
|---|---|---|---|
| Learner app | `/`, `/subjects`, `/session`, `/me` | Isabella | Today card, subject tiles, the live text session with "Mia", a showing-up-not-scores Me screen |
| Parent console | `/console`, `/console/transcripts`, `/console/settings`, `/console/safety` | Sarah | This-week overview, full transcripts, all settings, safety flags |
| Sign-in | `/login` | both | Email + password (Supabase Auth) |

**The learner profile is the product.** Every session reads the per-subject profile before it
starts and writes a short structured note back when it ends (`/api/session` → `summariseSession`).
Over a term the profile becomes specific to Isabella.

### The guardrails (all live)
- **Never writes work she could submit.** Encoded in `src/lib/tutor/prompt.ts` (the "ONE RULE"
  section), applies to both maths solutions and English sentences/paragraphs. Visible to Sarah in
  every transcript.
- **Rewards effort, not correctness.** In the prompt.
- **Scope-locked** to schoolwork; no web, images, roleplay or companionship framing.
- **Escalation path.** `src/lib/tutor/safety.ts` screens Isabella's own words for self-harm /
  abuse / bullying / distress. On a hit: the tutor gives a safe response with AU support lines
  (Kids Helpline 1800 55 1800, Lifeline 13 11 14), a `safety_flags` row is written, and it shows
  in the console under Safety. High-recall on purpose. **Not a crisis service** — it points to
  humans.
- **Christian Studies framing** baked into the prompt for that subject / school context.
- **Full transparency:** Sarah sees every transcript; nothing hidden.

---

## 2. Files that matter

```
src/
  app/
    (learner)/          learner shell + Today / Subjects / Me / Session
    console/            parent console (overview, settings, transcripts, safety)
    login/              shared sign-in
    api/tutor/          POST: send a message, get the tutor reply (main loop)
    api/session/        POST {action:'end'}: close a session, summarise into profile
  components/SessionChat.tsx   the live chat client component (character placeholder = Mia)
  lib/
    tutor/prompt.ts     ** the system prompt + all boundaries — the most important file **
    tutor/model.ts      Anthropic adapter (Sonnet sessions / Haiku ad-hoc) + summariser
    tutor/safety.ts     escalation screen + safe response text
    curriculum/index.ts light NESA Year 10 reference (Maths + English)
    supabase/{client,server,service}.ts   the three Supabase clients
    auth.ts             getUserRole() -> 'parent' | 'learner' | null
  proxy.ts              Supabase session refresh (Next 16 "proxy", was "middleware")
supabase/migrations/
  0001_init.sql         schema + RLS (parent = all, learner = her own work only)
  0002_seed.sql         8 subjects (Maths + English active), settings row, profile shells
```

---

## 3. Account setup — the four things I can't do for you

Everything above is built and builds clean (`npm run build` passes). To make it live you need
four account-level steps on the **mysterynuggets25** account. Plain steps:

### A. GitHub repo
1. Sign in to GitHub as **mysterynuggets25** (org `mysterynuggets25-ui`).
2. New repo → name it exactly **`isabella-ai-tutor`** → Private → **do not** add a README/gitignore
   (the local repo already has them).
3. Back in the terminal:
   ```bash
   cd ~/isabella-ai-tutor
   git push -u origin main
   ```
   (The remote is already set. This is the same SSH identity ArborOS uses.)

### B. Supabase project
1. Supabase dashboard (mysterynuggets25) → **New project**. Name: `isabella-ai-tutor`. Region:
   Sydney. Save the database password.
2. **SQL editor** → run `supabase/migrations/0001_init.sql`, then `0002_seed.sql` (in that order).
3. **Authentication → Users → Add user** twice (email + password):
   - Sarah's email → this is the **parent**.
   - Isabella's email (or a made-up one you hold) → the **learner**.
4. Copy each user's UUID (Authentication → Users), then in the SQL editor:
   ```sql
   insert into app_users (user_id, role, display_name) values
     ('PARENT-UUID',  'parent',  'Sarah'),
     ('LEARNER-UUID', 'learner', 'Isabella');
   ```
5. **Project Settings → API**: copy the Project URL, the `anon` public key, and the
   `service_role` key.

### C. Anthropic API key
- console.anthropic.com → API keys → create one for this project. (Model IDs default to
  `claude-sonnet-5` for sessions, `claude-haiku-4-5-20251001` for the fast ad-hoc path;
  override via env if needed.) Confirm the key is under **no-training** API terms.

### D. Vercel
1. Vercel (mysterynuggets25) → **Add New → Project → Import** `mysterynuggets25-ui/isabella-ai-tutor`.
2. **Environment Variables** — add all of these (from `.env.example`):
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY        (mark Sensitive)
   ANTHROPIC_API_KEY                (mark Sensitive)
   ```
3. Deploy. Open the URL, sign in as each user, and Isabella can "Add to Home Screen" to install it
   as a web app (no app store).

**Run it locally instead:** copy `.env.example` to `.env.local`, fill the same values, then
`npm install && npm run dev` → http://localhost:3000.

---

## 4. What's NOT built yet (roadmap from the spec)

| Phase | Scope | Status |
|---|---|---|
| 1 | Maths + English, text tutor, learner profile, parent console, settings, transcripts, safety | ✅ built |
| 2 | Voice in/out (STT + neural TTS), the audio-driven animated character, the timed session arc UI | ⛔ not started |
| 3 | All 8 subjects, calendar + coming-up, upload-and-feedback (photo/Word/PDF + OCR), cheat sheets, richer gamification | ⛔ not started (schema stubs for `assessments` exist) |
| 4 | Weekly parent note (auto-generated), hard usage cap enforcement, export/delete buttons, Year 11 rollover | ⛔ not started (`weekly_notes` table + overview slot exist) |

### Known gaps / decisions a maintainer should know
- **Chat is not streamed** in Phase 1 (one request → one reply). Streaming is a Phase 2 nicety.
- **Cost cap is stored, not enforced.** `settings.monthly_cap_usd` is saved but there is no usage
  meter or hard stop yet (Phase 4). Watch spend manually until then.
- **Safety screen is a regex first-pass**, deliberately high-recall. It backs up the model's own
  care, it does not replace it. Review real transcripts and tune `safety.ts`.
- **Character is a static placeholder** ("M" avatar). Isabella should name/choose it in Phase 2 —
  the code uses the constant `TUTOR_NAME = "Mia"` in `SessionChat.tsx` and the learner pages;
  change it there.
- **Curriculum reference is light** (two subjects, a paragraph each). Expand `curriculum/index.ts`
  when Phase 3 adds subjects.
- **Session arc is prompt-only** in Phase 1 (the tutor is told the 2/20/5/3 arc). The visible
  timer and stage UI is Phase 2.

---

## 5. Cost (spec estimate, not a quote)
Mode A (text) at ~7 sessions/week: **~$7–15 / month** (tutor model $3–7, STT $1–2, TTS $3–6 once
voice lands, hosting within Vercel/Supabase free-ish tiers). Realtime voice (Mode B) would be
$45–90. Controls designed in: session summarisation keeps the prompt small, the ad-hoc path uses
the cheap model, and the profile is a summary not a full history.

---

## 6. Backups
Git bundle snapshots live in `~/isabella-ai-tutor-backups/`, named
`isabella-ai-tutor-YYYYMMDD-HHMMSS.bundle` (same convention as `~/BelleFever/backups/`). Restore
with `git clone <bundle> <dir>`. Take a fresh one after any meaningful change:
```bash
cd ~/isabella-ai-tutor && git bundle create ~/isabella-ai-tutor-backups/isabella-ai-tutor-$(date +%Y%m%d-%H%M%S).bundle --all
```

---

*Prepared for Sarah on the mysterynuggets25 dev account. Phase 1 complete and building; account
wiring in Section 3 is the remaining step to go live.*
