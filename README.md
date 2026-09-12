# Isabella AI Tutor

A private AI tutor for Isabella (NSW, Year 10) and a parent console for Sarah.
Next.js 16 + React 19 + Tailwind v4 + Supabase + Anthropic, on Vercel. Built to
`Isabella AI Tutor - Build Specification v1.1.pdf`.

- **Learner app** (`/`): one card, one action. Today, subjects, the live text session, a
  showing-up-not-scores Me screen.
- **Parent console** (`/console`): overview, full transcripts, all settings, safety flags.
- **The learner profile is the product** — read before every session, written back after.

## Run locally
```bash
cp .env.example .env.local   # fill in Supabase + Anthropic values
npm install
npm run dev                  # http://localhost:3000
```

## Setup + deploy
See **HANDOVER.md** section 3 for the four account steps (GitHub, Supabase, Anthropic, Vercel)
and section 4 for the Phase 2–4 roadmap.

## The important files
- `src/lib/tutor/prompt.ts` — the system prompt and all boundaries (never writes her work,
  effort not correctness, scope-lock, escalation, Christian Studies framing).
- `src/lib/tutor/safety.ts` — escalation screen + safe response.
- `supabase/migrations/` — schema + RLS + seed.

Roles: `parent` sees everything; `learner` sees only her own work (enforced by RLS).
