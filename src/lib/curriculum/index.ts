// Light NESA Year 10 (Stage 5) reference, injected per subject so the tutor
// teaches to what Isabella is assessed on and uses NSW exam phrasing. Kept
// short on purpose — the profile plus this is enough to ground a session, and a
// small prompt is what keeps the cost small. Expand per subject as needed.

const REFERENCE: Record<string, string> = {
  maths: `NSW Year 10 mathematics (Stage 5) touchstones: number and algebra (indices, surds, linear and simple non-linear equations, algebraic techniques), measurement and geometry (area, surface area, volume, right-angled trigonometry incl. sine/cosine/tangent, Pythagoras), and statistics and probability (bivariate data, standard deviation intuition, probability of events). Use NSW phrasing: "find", "evaluate", "solve", "justify your answer", "show your working". Working must always be shown; the mark is in the method, not just the final number.`,

  english: `NSW Year 10 Standard English (Stage 5) is assessed on writing Isabella produces, including under exam conditions. Common tasks: analytical responses to prescribed texts, imaginative and persuasive writing, and reflection. Marking looks at ideas, structure, control of language, and how well she responds to the specific question. Use NESA verbs: "analyse", "explain", "explore", "compose", "evaluate how". A thesis should answer the question directly; every paragraph should earn its place with evidence and analysis (technique, example, effect).`,

  science: `NSW Year 10 Science (Stage 5) covers the knowledge strands (physical world: motion and energy; chemical world: atoms, the periodic table, chemical reactions and reaction rates; earth and space: the universe, plate tectonics, global systems; living world: DNA and genetics, evolution, ecosystems) and Working Scientifically. Skills assessed: hypotheses, independent/dependent/controlled variables, reliability, validity and accuracy, and drawing conclusions from data. NESA verbs: "describe", "explain", "predict", "analyse", "assess". Depth studies and practical reports are common.`,

  hsie: `NSW Year 10 HSIE (Stage 5) is History and Geography. History: the modern world and Australia (WWII, rights and freedoms including Aboriginal and civil rights, the globalising world) with source analysis for reliability, usefulness and perspective. Geography: environmental change and management, and human wellbeing, using geographical tools, fieldwork and PQE (pattern, quantify, exception). NESA verbs: "explain", "assess", "evaluate", "account for", "to what extent". Answers must use specific evidence and sources.`,

  pdhpe: `NSW Year 10 PDHPE (Stage 5) covers health, wellbeing and relationships; movement skill and performance; and healthy, safe and active lifestyles. Topics include mental health and help-seeking, respectful relationships, drug/alcohol/road safety, nutrition, and the benefits of physical activity. Assessment often uses scenarios and health literacy: identifying risks, decision-making and where to get help. NESA verbs: "explain", "propose", "justify", "recommend". Answers should apply concepts to a real situation, not just define them.`,

  food_tech: `NSW Year 10 Food Technology (Stage 5): food selection and health, food quality, food service and catering, food product development, and food equity. Core knowledge: nutrients and the dietary guidelines, food safety and hygiene (the temperature danger zone 5–60°C, cross-contamination, safe handling), functional properties of food, sensory evaluation, and preparation techniques. Assessed through practical work and written responses. NESA verbs: "describe", "explain", "analyse", "evaluate".`,

  money: `Money Matters maps to financial mathematics in NSW Year 10 Maths (Stage 5): earning money (wages, salary, commission, overtime), taxation and net pay, budgeting, simple and compound interest, best buys and unit pricing, GST, and credit and loans. Treat it as applied maths: set up the calculation, show working, and interpret the result in context. NESA verbs: "calculate", "compare", "justify", "determine". Always show the steps, not just the final figure.`,

  christian: `Christian Studies here follows the school's own program, not a NESA syllabus, so ground in what she is actually being taught and assessed on: scripture references, set content, structure, and written responses within the school's Christian framing. Help her build and support arguments with scripture and reasoning. On a genuinely contested question, present the position she is studying, note that Christians differ, and point her to her parent and teacher rather than deciding it. Never argue her out of her family's faith. (If the school provides a set curriculum document, ground in that.)`,
};

export function curriculumReference(subjectKey: string): string | undefined {
  return REFERENCE[subjectKey];
}
