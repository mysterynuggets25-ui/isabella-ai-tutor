-- Parent-managed memory.
-- The tutor's "brain" (learner_profile + profile_notes) is auto-managed after
-- each session. This lets the parent manage it too: a standing instruction to
-- the tutor per subject that auto-sessions never overwrite, and parent notes
-- that sit alongside the tutor's own, marked so both the UI and the tutor can
-- tell who wrote them.

-- A standing note from the parent for this subject, always given to the tutor,
-- never touched by the auto-summariser. Example: "Go gently on the exam, she's
-- anxious" or "Focus on essay structure this term."
alter table learner_profile add column if not exists parent_guidance text;

-- Who wrote a note: 'tutor' (the auto-summariser, default) or 'parent'.
alter table profile_notes add column if not exists source text not null default 'tutor';
