const conceptSignals = [
  "because", "therefore", "trade-off", "edge case", "complexity", "test", "debug",
  "optimize", "scalable", "security", "performance", "maintain", "monitor", "metric"
];

const incorrectSignals = [
  "not sure", "don't know", "no idea", "maybe", "guess", "i have never", "cannot explain"
];

const structureSignals = ["first", "then", "finally", "for example", "in my project", "i used", "impact", "result"];

const codingSignals = ["function", "class", "return", "for ", "while ", "if ", "map", "filter", "select", "join", "def ", "try", "catch", "complexity", "o("];

function clamp100(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function includesAny(text, signals) {
  return signals.filter(signal => text.includes(signal)).length;
}

function uniqueRatio(text) {
  const words = text.toLowerCase().match(/[a-z0-9]+/g) || [];
  if (!words.length) return 0;
  return new Set(words).size / words.length;
}

function keywordCoverage(answer, keywords = []) {
  if (!keywords.length) return 0.5;
  const lower = answer.toLowerCase();
  const hits = keywords.filter(keyword => lower.includes(keyword.toLowerCase())).length;
  return hits / keywords.length;
}

function repeatedAnswer(answer, previousAnswers) {
  const normalized = answer.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  return previousAnswers.some(previous => {
    const other = previous.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    if (normalized.length < 25 || other.length < 25) return false;
    const words = new Set(normalized.split(" ").filter(word => word.length > 3));
    const overlap = other.split(" ").filter(word => words.has(word)).length;
    return overlap / Math.max(1, Math.min(words.size, other.split(" ").length)) > 0.75;
  });
}

function observedStrengths({ question, lower, scores }) {
  return [
    scores.technicalAccuracy >= 75 ? `Good understanding of ${question.topic || question.category}` : null,
    scores.communication >= 75 ? "Clear and structured communication" : null,
    scores.problemSolving >= 75 ? "Strong trade-off and problem-solving reasoning" : null,
    question.type === "Coding" && scores.codingQuality >= 75 ? "Good coding approach with complexity or edge-case awareness" : null,
    lower.includes("example") || lower.includes("project") ? "Used examples to support the answer" : null
  ].filter(Boolean);
}

function observedWeaknesses({ question, lower, words, scores }) {
  return [
    scores.technicalAccuracy < 55 ? `Needs improvement in ${question.topic || question.category}` : null,
    scores.completeness < 55 ? "Answer missed examples, edge cases, or important details" : null,
    scores.communication < 55 ? "Communication needs clearer structure and confidence" : null,
    question.type === "Coding" && !/(complexity|o\(|edge|test)/i.test(lower) ? "Coding answer missed complexity, tests, or edge cases" : null,
    words < 20 ? "Answer was too short for an interview setting" : null
  ].filter(Boolean);
}

export function evaluateAnswer({ question, answer, difficulty, timeSpentSeconds = 0, previousAnswers = [] }) {
  const trimmed = answer.trim();
  const lower = trimmed.toLowerCase();
  const words = wordCount(trimmed);
  const coverage = keywordCoverage(lower, question.expectedKeywords || []);
  const conceptHits = includesAny(lower, conceptSignals);
  const structureHits = includesAny(lower, structureSignals);
  const codingHits = includesAny(lower, codingSignals);
  const incorrectHits = includesAny(lower, incorrectSignals);
  const repeated = repeatedAnswer(trimmed, previousAnswers);
  const vague = words < 18 || incorrectHits > 0;
  const hasExample = /for example|in my project|i built|i used|scenario|case|impact|result/i.test(trimmed);
  const hasTradeOff = /trade-off|alternative|pros|cons|because|choose|chosen|compared/i.test(trimmed);
  const hasEdgeCase = /edge|failure|error|exception|fallback|validation|test/i.test(trimmed);
  const inactivity = timeSpentSeconds > 180;
  const difficultyPenalty = difficulty === "Advanced" ? 6 : difficulty === "Intermediate" ? 3 : 0;

  const scores = {
    technicalAccuracy: clamp100(35 + coverage * 35 + conceptHits * 5 + (incorrectHits ? -28 : 0) - difficultyPenalty),
    completeness: clamp100(20 + Math.min(words, 120) * 0.45 + (hasExample ? 12 : 0) + (hasEdgeCase ? 10 : 0)),
    communication: clamp100(35 + structureHits * 8 + uniqueRatio(trimmed) * 20 + (words >= 35 ? 10 : 0) - (words > 900 ? 10 : 0)),
    problemSolving: clamp100(30 + conceptHits * 6 + (hasTradeOff ? 18 : 0) + (hasEdgeCase ? 12 : 0)),
    codingQuality: question.type === "Coding"
      ? clamp100(20 + codingHits * 8 + (lower.includes("complexity") || lower.includes("o(") ? 15 : 0) + (hasEdgeCase ? 12 : 0))
      : clamp100(45 + coverage * 25 + conceptHits * 4),
    confidence: clamp100(40 + Math.min(words, 90) * 0.35 + structureHits * 5 - (incorrectHits ? 25 : 0)),
    behavioral: question.type === "Behavioral" || question.type === "HR"
      ? clamp100(30 + structureHits * 10 + (hasExample ? 18 : 0) + (lower.includes("learn") || lower.includes("improve") ? 10 : 0))
      : clamp100(45 + structureHits * 5),
    analyticalThinking: clamp100(30 + conceptHits * 6 + (hasTradeOff ? 16 : 0) + coverage * 20)
  };

  if (vague || repeated) {
    Object.keys(scores).forEach(key => {
      scores[key] = clamp100(scores[key] - (vague ? 18 : 0) - (repeated ? 15 : 0));
    });
  }

  const weights = question.type === "Coding"
    ? { technicalAccuracy: 0.22, completeness: 0.12, communication: 0.1, problemSolving: 0.16, codingQuality: 0.24, confidence: 0.06, behavioral: 0.02, analyticalThinking: 0.08 }
    : { technicalAccuracy: 0.24, completeness: 0.16, communication: 0.18, problemSolving: 0.16, codingQuality: 0.04, confidence: 0.08, behavioral: 0.06, analyticalThinking: 0.08 };

  const score = clamp100(Object.entries(weights).reduce((sum, [key, weight]) => sum + scores[key] * weight, 0));
  const warnings = [
    repeated ? "Repeated or highly similar answer detected." : null,
    vague ? "Answer is too short, uncertain, or incomplete." : null,
    coverage < 0.25 ? `Answer did not cover enough expected ${question.topic || "role"} concepts.` : null,
    question.type === "Coding" && codingHits < 2 ? "Coding answer lacks enough implementation detail." : null,
    inactivity ? "Long inactivity detected." : null
  ].filter(Boolean);

  const strengths = observedStrengths({ question, lower, scores });
  const weaknesses = observedWeaknesses({ question, lower, words, scores });

  return {
    score,
    scores,
    topic: question.topic,
    category: question.category,
    expectedKeywords: question.expectedKeywords || [],
    coveredKeywords: (question.expectedKeywords || []).filter(keyword => lower.includes(keyword.toLowerCase())),
    needsFollowUp: score < 62 || warnings.length > 0,
    warnings,
    strengths,
    weaknesses,
    feedback: {
      summary: score >= 78 ? "Strong answer with relevant technical depth." : score >= 60 ? "Partially correct answer, but it needs more depth and evidence." : "Weak answer. It missed important concepts or lacked clear reasoning.",
      correctAnswer: `A strong answer should explain ${question.topic || question.category}, connect it to the question, mention ${question.expectedKeywords?.slice(0, 4).join(", ") || "key concepts"}, and include examples or trade-offs.`,
      explanation: "The score is based on expected topic coverage, answer completeness, communication structure, problem-solving depth, and role-specific evidence.",
      bestPractice: question.type === "Coding"
        ? "State the approach, write readable logic, discuss time and space complexity, handle edge cases, and mention tests."
        : "Use a structured answer: concept, example, decision, trade-off, and measurable impact.",
      resources: [
        `${question.topic || "Role"} official documentation`,
        "Practice interview explanations with STAR or problem-solution-impact structure",
        question.type === "Coding" ? "Medium-level coding problems with complexity analysis" : "Role-specific scenario questions"
      ]
    }
  };
}
