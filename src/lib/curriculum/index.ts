// Light NESA Year 10 reference, injected per subject so the tutor teaches to
// what Isabella is assessed on and uses NSW exam phrasing. Kept short on
// purpose — the profile plus this is enough to ground a session, and a small
// prompt is what keeps the cost small. Expand per subject as Phase 3 lands.

const REFERENCE: Record<string, string> = {
  maths: `NSW Year 10 mathematics touchstones: number and algebra (indices, surds, linear and simple non-linear equations, algebraic techniques), measurement and geometry (area, surface area, volume, right-angled trigonometry incl. sine/cosine/tangent, Pythagoras), and statistics and probability (bivariate data, standard deviation intuition, probability of events). Use NSW phrasing: "find", "evaluate", "solve", "justify your answer", "show your working". Working must always be shown; the mark is in the method, not just the final number.`,
  english: `NSW Year 10 Standard English is assessed on writing Isabella produces, including under exam conditions. Common tasks: analytical responses to prescribed texts, imaginative and persuasive writing, and reflection. Marking looks at ideas, structure, control of language, and how well she responds to the specific question. Use NESA verbs: "analyse", "explain", "explore", "compose", "evaluate how". A thesis should answer the question directly; every paragraph should earn its place.`,
};

export function curriculumReference(subjectKey: string): string | undefined {
  return REFERENCE[subjectKey];
}
