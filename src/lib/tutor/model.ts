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

// Summarise a finished session into a short structured note for the learner
// profile. Uses the cheap model — this keeps the profile (and therefore every
// future prompt) small.
export type SessionLearning = {
  note: string;
  summary: string;
  level_estimate: string;
  dimensions: Record<string, string>;
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
Return STRICT JSON only, with keys: note, summary, level_estimate, dimensions.
- note: one or two sentences of specifics from THIS session, e.g. "needed two hints on equivalent ratios, re-engaged when the example switched to netball scoring, asked to stop six minutes early".
- summary: a one-line rolling summary of where she is in this subject overall.
- level_estimate: a short phrase for her current working level.
- dimensions: an object refining how she learns. Use short string values. Suggested keys (only include what you have evidence for): hint_need, entry_point, engages_with, struggles_with, pace, interests, recovery, confidence. Prefer updating an existing belief over inventing new ones. Do not contradict prior beliefs without evidence from this session.
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
    };
  } catch {
    return { note: text.slice(0, 400), summary: "", level_estimate: "", dimensions: {} };
  }
}
