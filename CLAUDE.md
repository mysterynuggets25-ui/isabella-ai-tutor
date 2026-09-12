# Isabella AI Tutor — working notes for Claude

Private AI tutor for Isabella (NSW Year 10) + parent console for Sarah.
Next.js 16 + React 19 + Tailwind v4 + Supabase + Anthropic, on Vercel.
Dev account: mysterynuggets25 (org `mysterynuggets25-ui`), same pattern as ArborOS.

READ FIRST: `HANDOVER.md` (setup + roadmap), `docs/DECISIONS.md` (do not undo these).

Guardrails that must never regress (see `src/lib/tutor/prompt.ts` + `safety.ts`):
- Never writes work Isabella could submit — plan/coach only.
- Rewards effort, not correctness.
- Scope-locked to schoolwork. Escalation path points to humans + flags the parent.
- RLS: parent = all; learner = her own work only. Service role writes notes/flags.

After any meaningful change: `npm run build`, update `docs/PROGRESS.md`, take a backup
bundle (see HANDOVER.md §6), and push.
