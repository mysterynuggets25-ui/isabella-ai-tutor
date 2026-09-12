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
export async function summariseSession(opts: {
  subjectName: string;
  transcript: ChatTurn[];
}): Promise<{ note: string; summary: string; level_estimate: string }> {
  const anthropic = client();
  const transcript = opts.transcript
    .map((t) => `${t.role === "learner" ? "Isabella" : "Tutor"}: ${t.content}`)
    .join("\n");

  const res = await anthropic.messages.create({
    model: ADHOC_MODEL,
    max_tokens: 512,
    system: `You summarise a tutoring session into a short profile note for ${opts.subjectName}.
Return strict JSON with keys: note, summary, level_estimate.
- note: one or two sentences of specifics, in the style "needed two hints on equivalent ratios, disengaged around minute nine, re-engaged when the example switched to netball scoring".
- summary: a one-line rolling summary of where she is in this subject.
- level_estimate: a short phrase for her current working level.
No prose outside the JSON.`,
    messages: [{ role: "user", content: transcript || "No conversation took place." }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  try {
    const json = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
    return {
      note: String(json.note ?? ""),
      summary: String(json.summary ?? ""),
      level_estimate: String(json.level_estimate ?? ""),
    };
  } catch {
    return { note: text.slice(0, 400), summary: "", level_estimate: "" };
  }
}
