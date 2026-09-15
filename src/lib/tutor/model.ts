import Anthropic from "@anthropic-ai/sdk";

// Model adapter. Sessions use a mid-tier model for quality; the ad-hoc
// question path uses a small fast model for cost, mirroring the spec's
// "quality where it matters, cost control where it does not".
//
// Swappable via env so the provider is never hard-coded into the app logic.

const SESSION_MODEL = process.env.TUTOR_SESSION_MODEL ?? "claude-sonnet-5";
const ADHOC_MODEL = process.env.TUTOR_ADHOC_MODEL ?? "claude-haiku-4-5-20251001";

export type ChatTurn = { role: "learner" | "tutor"; content: string };

function client() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic({ apiKey: key });
}

export async function runTutor(opts: {
  system: string;
  turns: ChatTurn[];
  mode: "scheduled" | "adhoc";
}): Promise<string> {
  const anthropic = client();
  const model = opts.mode === "adhoc" ? ADHOC_MODEL : SESSION_MODEL;

  const messages = opts.turns.map((t) => ({
    role: t.role === "learner" ? ("user" as const) : ("assistant" as const),
    content: t.content,
  }));

  const res = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: opts.system,
    messages,
  });

  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// One printable cheat sheet per topic, built from HER own history (what she
// keeps missing comes from her real errors), grounded in NSW exam phrasing.
export async function generateCheatSheet(opts: {
  subjectName: string;
  topic?: string;
  criteria?: string;
  profileSummary?: string | null;
  dimensions?: Record<string, unknown>;
  notes?: string[];
}): Promise<{ title: string; facts: string[]; why: string; keepMissing: string; phrasing: string[] }> {
  const anthropic = client();
  const history = [
    opts.profileSummary ? `Summary: ${opts.profileSummary}` : "",
    Object.keys(opts.dimensions ?? {}).length ? `How she works: ${JSON.stringify(opts.dimensions)}` : "",
    opts.notes?.length ? `Recent session notes:\n- ${opts.notes.join("\n- ")}` : "",
  ].filter(Boolean).join("\n");

  const res = await anthropic.messages.create({
    model: ADHOC_MODEL,
    max_tokens: 700,
    system: `You make a single printable cheat sheet for Isabella's Year 10 ${opts.subjectName}${opts.topic ? ` on: ${opts.topic}` : ""}.
Build it from HER history so it is personal, not generic. Return STRICT JSON only:
{"title": string, "facts": string[], "why": string, "keepMissing": string, "phrasing": string[]}
- title: the topic, short.
- facts: 4 to 7 core facts/formulas she needs, each one line.
- why: one line on why it works / the intuition.
- keepMissing: the one thing SHE keeps getting wrong, drawn from her real errors in the notes (if none known, the most common trap for this topic).
- phrasing: 2 to 4 exact phrases / command words used in NSW exam questions for this topic.
${opts.criteria ? `Ground in: ${opts.criteria}` : ""}
No prose outside the JSON.`,
    messages: [{ role: "user", content: history || "No history yet; make a solid general cheat sheet for the topic." }],
  });

  const raw = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
  try {
    const j = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
    return {
      title: String(j.title ?? opts.subjectName),
      facts: Array.isArray(j.facts) ? j.facts.map(String) : [],
      why: String(j.why ?? ""),
      keepMissing: String(j.keepMissing ?? ""),
      phrasing: Array.isArray(j.phrasing) ? j.phrasing.map(String) : [],
    };
  } catch {
    return { title: opts.subjectName, facts: [], why: raw.slice(0, 200), keepMissing: "", phrasing: [] };
  }
}

// Mark a piece of work she has already done. The hard rule holds: it says what
// is working and gives EXACTLY two things to fix, and it never rewrites her
// work. A photo is read directly (Claude vision); text is marked as text.
export async function markWork(opts: {
  subjectName: string;
  criteria?: string;
  text?: string;
  image?: { mediaType: string; data: string }; // base64 (no data: prefix)
}): Promise<{ working: string; fixes: string[] }> {
  const anthropic = client();

  const content: Anthropic.MessageParam["content"] = [];
  if (opts.image) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: opts.image.mediaType as "image/png", data: opts.image.data },
    });
  }
  content.push({
    type: "text",
    text: opts.text?.trim()
      ? `Here is my ${opts.subjectName} work:\n\n${opts.text.trim()}`
      : `Here is a photo of my ${opts.subjectName} work. Read it and mark it.`,
  });

  const res = await anthropic.messages.create({
    model: SESSION_MODEL,
    max_tokens: 700,
    system: `You mark Isabella's Year 10 ${opts.subjectName} work against the NSW/NESA marking criteria.
THE ONE RULE: never rewrite her work, and never write sentences or a worked solution she could copy in. You point, you do not fix.
Return STRICT JSON only: {"working": string, "fixes": string[]}.
- working: 2 to 3 warm, specific sentences on what is genuinely good and why (name the actual thing she did).
- fixes: EXACTLY TWO items. Each names one specific thing to improve and how to think about it, WITHOUT doing it for her. Two, never more — a page of corrections is why teenagers stop asking for feedback.
${opts.criteria ? `Mark against: ${opts.criteria}` : ""}
No prose outside the JSON.`,
    messages: [{ role: "user", content }],
  });

  const raw = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  try {
    const json = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
    const fixes = Array.isArray(json.fixes) ? json.fixes.slice(0, 2).map(String) : [];
    return { working: String(json.working ?? ""), fixes };
  } catch {
    return { working: raw.slice(0, 300), fixes: [] };
  }
}

// Summarise a finished session into a short structured note for the learner
// profile. Uses the cheap model — this keeps the profile (and therefore every
// future prompt) small.
export type SessionLearning = {
  note: string;
  summary: string;
  level_estimate: string;
  dimensions: Record<string, string>;
  next_focus: string; // what the tutor plans to teach next session in this subject
};

// Turn a finished session into what the tutor should remember. Beyond a one-line
// note, it extracts a structured model of HOW Isabella works — hint needs, what
// engages her, what trips her up, pace, interests — which is merged into her
// profile so the tutor gets steadily more tailored to her over a term.
export async function summariseSession(opts: {
  subjectName: string;
  transcript: ChatTurn[];
  priorDimensions?: Record<string, unknown>;
}): Promise<SessionLearning> {
  const anthropic = client();
  const transcript = opts.transcript
    .map((t) => `${t.role === "learner" ? "Isabella" : "Tutor"}: ${t.content}`)
    .join("\n");

  const res = await anthropic.messages.create({
    model: ADHOC_MODEL,
    max_tokens: 700,
    system: `You maintain the tutor's evolving memory of how Isabella (Year 10) learns ${opts.subjectName}.
You are given what the tutor already believed about her, plus the latest session. Update the memory.
Return STRICT JSON only, with keys: note, summary, level_estimate, dimensions, next_focus.
- note: one or two sentences of specifics from THIS session, e.g. "needed two hints on equivalent ratios, re-engaged when the example switched to netball scoring, asked to stop six minutes early".
- summary: a one-line rolling summary of where she is in this subject overall.
- level_estimate: a short phrase for her current working level.
- dimensions: an object refining how she learns. Use short string values. Suggested keys (only include what you have evidence for): hint_need, entry_point, engages_with, struggles_with, pace, interests, recovery, confidence. Prefer updating an existing belief over inventing new ones. Do not contradict prior beliefs without evidence from this session.
- next_focus: the ONE concept you plan to teach her NEXT session in this subject, as a short phrase a 15-year-old would understand (e.g. "using trig to find a missing side"). Choose the natural next step given where she is and what she found hard. This becomes the plan you open the next session with.
No prose outside the JSON.`,
    messages: [
      {
        role: "user",
        content: `WHAT THE TUTOR ALREADY BELIEVES:\n${JSON.stringify(opts.priorDimensions ?? {})}\n\nLATEST SESSION:\n${transcript || "No conversation took place."}`,
      },
    ],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  try {
    const json = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
    const dims = json.dimensions && typeof json.dimensions === "object" ? json.dimensions : {};
    const dimensions: Record<string, string> = {};
    for (const [k, v] of Object.entries(dims)) dimensions[k] = String(v);
    return {
      note: String(json.note ?? ""),
      summary: String(json.summary ?? ""),
      level_estimate: String(json.level_estimate ?? ""),
      dimensions,
      next_focus: String(json.next_focus ?? ""),
    };
  } catch {
    return { note: text.slice(0, 400), summary: "", level_estimate: "", dimensions: {}, next_focus: "" };
  }
}
