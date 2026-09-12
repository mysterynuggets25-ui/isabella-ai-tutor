// Escalation detection. The spec makes this explicit rather than leaving it to
// the model's defaults: if Isabella raises self-harm, abuse, bullying or
// serious distress, the tutor gives a brief safe response, surfaces AU support
// lines, and her parent is flagged.
//
// This is a lightweight first-pass signal on the learner's own words. It is
// deliberately high-recall (better to over-flag to a parent than miss). It is
// NOT a substitute for the model's own care in the reply, and it is NOT a
// crisis service. Tune with real use.

export type SafetyHit = { category: string; excerpt: string } | null;

const PATTERNS: { category: string; re: RegExp }[] = [
  {
    category: "self_harm",
    re: /\b(kill myself|end (it|my life)|want to die|suicid\w*|self[-\s]?harm|hurt myself|cut myself|no reason to live|better off dead)\b/i,
  },
  {
    category: "abuse",
    re: /\b(abus\w*|hit me|hurts me|touched me|not safe at home|scared of (him|her|them|my))\b/i,
  },
  {
    category: "bullying",
    re: /\b(bull(y|ied|ying)|everyone hates me|being picked on|they threatened)\b/i,
  },
  {
    category: "distress",
    re: /\b(can'?t cope|can'?t do this any\s?more|hopeless|worthless|so alone|hate myself)\b/i,
  },
];

export function screenLearnerMessage(text: string): SafetyHit {
  for (const p of PATTERNS) {
    const m = text.match(p.re);
    if (m) {
      const idx = Math.max(0, (m.index ?? 0) - 30);
      return { category: p.category, excerpt: text.slice(idx, idx + 120).trim() };
    }
  }
  return null;
}

export const SAFE_RESPONSE = `That sounds really hard, and I'm glad you said it. I'm just a study helper, so I'm not the right one to carry this on my own. Please talk to your mum or a teacher you trust. If you need to talk to someone right now, you can call Kids Helpline on 1800 55 1800 or Lifeline on 13 11 14, any time. I've let your mum know you might want a chat. We can pick up the schoolwork whenever you're ready.`;
