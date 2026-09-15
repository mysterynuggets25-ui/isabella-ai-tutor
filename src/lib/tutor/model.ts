import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase/service";

// Model adapter — provider-agnostic. Uses OpenAI when OPENAI_API_KEY is set
// (cheapest: gpt-4o-mini, and it does vision), otherwise Anthropic (Claude
// Haiku). The rest of the app never needs to know which is in use.
//
// The "session" tier is used for live tutoring and marking; the "adhoc" tier
// for quick questions, summaries and cheat sheets.

const USE_OPENAI = !!process.env.OPENAI_API_KEY;

const OPENAI_SESSION = process.env.OPENAI_SESSION_MODEL ?? "gpt-4o-mini";
const OPENAI_ADHOC = process.env.OPENAI_ADHOC_MODEL ?? "gpt-4o-mini";
const ANTHROPIC_SESSION = process.env.TUTOR_SESSION_MODEL ?? "claude-haiku-4-5-20251001";
const ANTHROPIC_ADHOC = process.env.TUTOR_ADHOC_MODEL ?? "claude-haiku-4-5-20251001";

export type ChatTurn = { role: "learner" | "tutor"; content: string };
type Msg = { role: "user" | "assistant"; text: string; image?: { mediaType: string; data: string } };

// Rough per-1M-token prices (USD) for cost tracking. Approximate on purpose.
const PRICING: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4o": { in: 2.5, out: 10 },
  "claude-haiku": { in: 1, out: 5 },
  "claude-sonnet": { in: 3, out: 15 },
};
function priceFor(model: string) {
  const k = Object.keys(PRICING).find((p) => model.includes(p));
  return k ? PRICING[k] : { in: 0.5, out: 1.5 };
}
function monthKey(): string {
  // Current month in Sydney, "YYYY-MM".
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit" }).format(new Date());
  return parts.slice(0, 7);
}
// Accumulate this month's usage. Fire-and-forget; read-modify-write is fine at
// single-family volume.
async function recordUsage(model: string, inTok: number, outTok: number) {
  try {
    const svc = createServiceClient();
    const month = monthKey();
    const price = priceFor(model);
    const cost = (inTok / 1e6) * price.in + (outTok / 1e6) * price.out;
    const { data } = await svc.from("usage_monthly").select("*").eq("month", month).maybeSingle();
    await svc.from("usage_monthly").upsert({
      month,
      calls: (data?.calls ?? 0) + 1,
      input_tokens: (data?.input_tokens ?? 0) + inTok,
      output_tokens: (data?.output_tokens ?? 0) + outTok,
      cost_usd: Number(((data?.cost_usd ?? 0) + cost).toFixed(4)),
      updated_at: new Date().toISOString(),
    });
  } catch {
    // usage_monthly may not exist yet (migration 0004) — never block a session.
  }
}

// This month's spend so far (USD). Used to enforce the cap.
export async function monthlyCostUsd(): Promise<number> {
  try {
    const svc = createServiceClient();
    const { data } = await svc.from("usage_monthly").select("cost_usd").eq("month", monthKey()).maybeSingle();
    return Number(data?.cost_usd ?? 0);
  } catch {
    return 0;
  }
}

// One completion, either provider. Returns the assistant's text.
async function complete(opts: {
  system: string;
  messages: Msg[];
  tier: "session" | "adhoc";
  json?: boolean;
  maxTokens?: number;
}): Promise<string> {
  const maxTokens = opts.maxTokens ?? 700;

  if (USE_OPENAI) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = opts.tier === "adhoc" ? OPENAI_ADHOC : OPENAI_SESSION;
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: opts.system },
      ...opts.messages.map((m): OpenAI.Chat.ChatCompletionMessageParam =>
        m.image
          ? {
              role: "user",
              content: [
                { type: "text", text: m.text },
                { type: "image_url", image_url: { url: `data:${m.image.mediaType};base64,${m.image.data}` } },
              ],
            }
          : { role: m.role, content: m.text },
      ),
    ];
    const res = await openai.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages,
      ...(opts.json ? { response_format: { type: "json_object" as const } } : {}),
    });
    recordUsage(res.model || model, res.usage?.prompt_tokens ?? 0, res.usage?.completion_tokens ?? 0);
    return res.choices[0]?.message?.content ?? "";
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = opts.tier === "adhoc" ? ANTHROPIC_ADHOC : ANTHROPIC_SESSION;
  // Claude requires the first message to be from the user. After a proactive
  // opener the stored history starts with the tutor (assistant), so guard it.
  const src = opts.messages[0]?.role === "assistant" ? [{ role: "user" as const, text: "Let's carry on." }, ...opts.messages] : opts.messages;
  const messages: Anthropic.MessageParam[] = src.map((m) => ({
    role: m.role,
    content: m.image
      ? [
          { type: "image", source: { type: "base64", media_type: m.image.mediaType as "image/png", data: m.image.data } },
          { type: "text", text: m.text },
        ]
      : m.text,
  }));
  const res = await anthropic.messages.create({ model, max_tokens: maxTokens, system: opts.system, messages });
  recordUsage(model, res.usage?.input_tokens ?? 0, res.usage?.output_tokens ?? 0);
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "")) as T;
  } catch {
    return fallback;
  }
}

export async function runTutor(opts: { system: string; turns: ChatTurn[]; mode: "scheduled" | "adhoc" }): Promise<string> {
  return complete({
    system: opts.system,
    tier: opts.mode === "adhoc" ? "adhoc" : "session",
    maxTokens: 1024,
    messages: opts.turns.map((t) => ({ role: t.role === "learner" ? "user" : "assistant", text: t.content })),
  });
}

// Mark a piece of work she has already done. The hard rule holds: it says what
// is working and gives EXACTLY two things to fix, and it never rewrites her
// work. A photo is read directly (vision); text is marked as text.
export async function markWork(opts: {
  subjectName: string;
  criteria?: string;
  assessment?: string; // the real task this work is for (title, due, weighting, requirements)
  text?: string;
  image?: { mediaType: string; data: string };
}): Promise<{ working: string; fixes: string[]; checklist?: { item: string; done: boolean }[] }> {
  const userText = opts.text?.trim()
    ? `Here is my ${opts.subjectName} work:\n\n${opts.text.trim()}`
    : `Here is a photo of my ${opts.subjectName} work. Read it and mark it.`;

  // If this work is for a real assessment, check it against the actual brief —
  // separate what's required from what's optional, and name what's missing.
  const assessmentBlock = opts.assessment
    ? `\nTHIS WORK IS FOR A REAL ASSESSMENT. Check it against this actual task, not a generic rubric:
${opts.assessment}
- Work from the task wording above. Separate what is REQUIRED from what is recommended or optional.
- Compare her draft to each requirement and notice what is missing or thin. Do not invent requirements that are not stated.
- Return a "checklist": each stated requirement with done:true only if her work clearly meets it. This is how she sees what is left.
- Her two fixes should be the two highest-value gaps against THIS task.`
    : "";

  const checklistJson = opts.assessment ? `, "checklist": [{"item": string, "done": boolean}]` : "";

  const raw = await complete({
    tier: "session",
    json: true,
    maxTokens: 900,
    system: `You mark Isabella's Year 10 ${opts.subjectName} work against the NSW/NESA marking criteria.
THE ONE RULE: never rewrite her work, and never write sentences or a worked solution she could copy in. You point, you do not fix.
Return STRICT JSON only: {"working": string, "fixes": string[]${checklistJson}}.
- working: 2 to 3 warm, specific sentences on what is genuinely good and why (name the actual thing she did).
- fixes: EXACTLY TWO items. Each names one specific thing to improve and how to think about it, WITHOUT doing it for her. Two, never more — a page of corrections is why teenagers stop asking for feedback.
${opts.criteria ? `Mark against: ${opts.criteria}` : ""}${assessmentBlock}
No prose outside the JSON.`,
    messages: [{ role: "user", text: userText, image: opts.image }],
  });

  const j = parseJson<{ working?: string; fixes?: unknown; checklist?: unknown }>(raw, {});
  const checklist = Array.isArray(j.checklist)
    ? j.checklist
        .map((c) => (c && typeof c === "object" ? { item: String((c as Record<string, unknown>).item ?? ""), done: !!(c as Record<string, unknown>).done } : null))
        .filter((c): c is { item: string; done: boolean } => !!c && c.item.length > 0)
        .slice(0, 8)
    : undefined;
  return {
    working: String(j.working ?? raw.slice(0, 300)),
    fixes: Array.isArray(j.fixes) ? j.fixes.slice(0, 2).map(String) : [],
    ...(checklist && checklist.length ? { checklist } : {}),
  };
}

// One printable cheat sheet per topic, built from HER own history.
export type CheatSheet = {
  title: string;
  coreIdea: string;
  facts: string[];
  why: string;
  answerFrame: string;
  keepMissing: string;
  phrasing: string[];
  selfTest: string[];
};

export async function generateCheatSheet(opts: {
  subjectName: string;
  topic?: string;
  criteria?: string;
  profileSummary?: string | null;
  dimensions?: Record<string, unknown>;
  notes?: string[];
}): Promise<CheatSheet> {
  const history = [
    opts.profileSummary ? `Summary: ${opts.profileSummary}` : "",
    Object.keys(opts.dimensions ?? {}).length ? `How she works: ${JSON.stringify(opts.dimensions)}` : "",
    opts.notes?.length ? `Recent session notes:\n- ${opts.notes.join("\n- ")}` : "",
  ].filter(Boolean).join("\n");

  const raw = await complete({
    tier: "adhoc",
    json: true,
    maxTokens: 900,
    system: `You make a single high-yield, printable cheat sheet for Isabella's Year 10 ${opts.subjectName}${opts.topic ? ` on: ${opts.topic}` : ""}.
Goal: compressed understanding, not paragraphs in tiny font. Build it from HER history so it is personal.
Return STRICT JSON only:
{"title": string, "coreIdea": string, "facts": string[], "why": string, "answerFrame": string, "keepMissing": string, "phrasing": string[], "selfTest": string[]}
- title: the topic, short.
- coreIdea: 1-2 sentences — the big idea in plain words.
- facts: 4 to 7 key facts / formulas / steps, each one line; show processes as arrows (A → B → C).
- why: one line on why it works / the intuition.
- answerFrame: how to structure an answer for this topic in an exam (e.g. "PEEL: point, explain, evidence, link", or "state pattern → give evidence → note what it can't prove").
- keepMissing: the ONE thing she keeps getting wrong, from her real errors in the notes (else the most common trap).
- phrasing: 2 to 4 exact command words / phrasings used in NSW exam questions for this topic.
- selfTest: exactly 3 quick recall questions she can test herself with (no answers).
${opts.criteria ? `Ground in: ${opts.criteria}` : ""}
No prose outside the JSON.`,
    messages: [{ role: "user", text: history || "No history yet; make a solid general cheat sheet for the topic." }],
  });

  const j = parseJson<{ title?: string; coreIdea?: string; facts?: unknown; why?: string; answerFrame?: string; keepMissing?: string; phrasing?: unknown; selfTest?: unknown }>(raw, {});
  return {
    title: String(j.title ?? opts.subjectName),
    coreIdea: String(j.coreIdea ?? ""),
    facts: Array.isArray(j.facts) ? j.facts.map(String) : [],
    why: String(j.why ?? ""),
    answerFrame: String(j.answerFrame ?? ""),
    keepMissing: String(j.keepMissing ?? ""),
    phrasing: Array.isArray(j.phrasing) ? j.phrasing.map(String) : [],
    selfTest: Array.isArray(j.selfTest) ? j.selfTest.map(String) : [],
  };
}

export type SessionLearning = {
  note: string;
  summary: string;
  level_estimate: string;
  dimensions: Record<string, string>;
  next_focus: string;
  concern: string;
};

// The weekly note to Sarah — plain language, patterns not grades.
export async function generateWeeklyNote(opts: {
  weekLabel: string;
  digest: string; // per-session lines: subject, how it went, note
}): Promise<string> {
  const raw = await complete({
    tier: "adhoc",
    maxTokens: 500,
    system: `You write a short weekly note for Isabella's mum about her tutoring (Year 10). Plain, warm,
honest, specific. Patterns, not grades. 5-7 sentences, no bullet points, no headings. Cover TWO things:
(1) her learning — what improved, where she stalled or resisted, what you'd do next week; and
(2) HER — her engagement, confidence and mood, whether she's opening up and starting to enjoy it more,
and gently raise anything about her wellbeing or social/emotional state that Mum would want to know
(from any concern notes provided). Be encouraging but honest. If there were no sessions, say so kindly.
Never invent detail.`,
    messages: [{ role: "user", text: `Week of ${opts.weekLabel}. Sessions this week:\n${opts.digest || "No sessions this week."}` }],
  });
  return raw.trim();
}

// Turn a finished session into what the tutor should remember + plan next.
export async function summariseSession(opts: {
  subjectName: string;
  transcript: ChatTurn[];
  priorDimensions?: Record<string, unknown>;
}): Promise<SessionLearning> {
  const transcript = opts.transcript
    .map((t) => `${t.role === "learner" ? "Isabella" : "Tutor"}: ${t.content}`)
    .join("\n");

  const raw = await complete({
    tier: "adhoc",
    json: true,
    maxTokens: 700,
    system: `You maintain the tutor's evolving memory of how Isabella (Year 10) learns ${opts.subjectName}.
You are given what the tutor already believed about her, plus the latest session. Update the memory.
Return STRICT JSON only, with keys: note, summary, level_estimate, dimensions, next_focus, concern.
- note: one or two sentences of specifics from THIS session, e.g. "needed two hints on equivalent ratios, re-engaged when the example switched to netball scoring".
- summary: a one-line rolling summary of where she is in this subject overall.
- level_estimate: a short phrase for her current working level.
- dimensions: an object refining how she learns. Short string values. Suggested keys (only what you have evidence for): hint_need, entry_point, engages_with, struggles_with, pace, interests, recovery, confidence. Prefer updating an existing belief over inventing new ones.
- next_focus: the ONE concept you plan to teach her NEXT session in this subject, as a short phrase a 15-year-old understands. Choose the natural next step given where she is and what she found hard.
- concern: a short, gentle note for her mum ONLY IF something about her wellbeing stood out this session — she seemed low, flat, anxious, withdrawn, unusually hard on herself, or mentioned friendship/social/home trouble. This is NOT about academics and NOT a crisis (safety is handled separately). Empty string "" if nothing of note (that is the normal case).
No prose outside the JSON.`,
    messages: [
      {
        role: "user",
        text: `WHAT THE TUTOR ALREADY BELIEVES:\n${JSON.stringify(opts.priorDimensions ?? {})}\n\nLATEST SESSION:\n${transcript || "No conversation took place."}`,
      },
    ],
  });

  const j = parseJson<{ note?: string; summary?: string; level_estimate?: string; dimensions?: unknown; next_focus?: string; concern?: string }>(raw, {});
  const dims = j.dimensions && typeof j.dimensions === "object" ? (j.dimensions as Record<string, unknown>) : {};
  const dimensions: Record<string, string> = {};
  for (const [k, v] of Object.entries(dims)) dimensions[k] = String(v);
  return {
    note: String(j.note ?? raw.slice(0, 400)),
    summary: String(j.summary ?? ""),
    level_estimate: String(j.level_estimate ?? ""),
    dimensions,
    next_focus: String(j.next_focus ?? ""),
    concern: String(j.concern ?? ""),
  };
}
