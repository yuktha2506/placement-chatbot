const technicalKeywords = [
  "because", "trade-off", "complexity", "edge", "test", "scalable", "optimize",
  "database", "api", "state", "algorithm", "metric", "user", "requirement"
];

function clampScore(value) {
  return Math.max(0, Math.min(10, Math.round(value)));
}

function wordCount(answer) {
  return answer.trim().split(/\s+/).filter(Boolean).length;
}

function uniqueRatio(answer) {
  const words = answer.toLowerCase().match(/[a-z0-9]+/g) || [];
  if (!words.length) return 0;
  return new Set(words).size / words.length;
}

export function evaluateAnswer({ question, answer, difficulty, timeSpentSeconds = 0, previousAnswers = [] }) {
  const trimmed = answer.trim();
  const words = wordCount(trimmed);
  const lower = trimmed.toLowerCase();
  const keywordHits = technicalKeywords.filter(keyword => lower.includes(keyword)).length;
  const hasExample = /for example|in my project|i built|i used|scenario|case/i.test(trimmed);
  const hasCode = /function|class|const|let|def |return|select |for \(|while \(|=>/i.test(trimmed);
  const repeated = previousAnswers.some(previous => previous.trim().toLowerCase() === lower && lower.length > 20);
  const vague = words < 18 || /^(yes|no|maybe|i don't know|not sure|ok)$/i.test(trimmed);
  const irrelevant = words > 0 && keywordHits === 0 && !hasExample && !hasCode && question.type !== "HR";
  const inactivity = timeSpentSeconds > 180;

  const difficultyBoost = difficulty === "Advanced" ? -1 : difficulty === "Beginner" ? 1 : 0;
  const base = Math.min(10, Math.max(2, words / 12 + keywordHits + (hasExample ? 1.5 : 0) + (hasCode ? 1.5 : 0) + difficultyBoost));

  const scores = {
    accuracy: clampScore(base - (irrelevant ? 3 : 0)),
    completeness: clampScore(words / 10 + (hasExample ? 2 : 0)),
    confidence: clampScore(uniqueRatio(trimmed) * 10 - (vague ? 2 : 0)),
    technicalCorrectness: clampScore(base + (question.type === "Coding" && hasCode ? 1 : 0)),
    communication: clampScore(Math.min(10, words / 14 + 4) - (trimmed.length > 1200 ? 1 : 0)),
    clarity: clampScore(Math.min(10, keywordHits + (hasExample ? 2 : 0) + 4)),
    depth: clampScore(base - (vague ? 3 : 0))
  };

  const average = Math.round(Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length * 10);
  const warnings = [
    repeated ? "Repeated answer detected. Try to answer each question specifically." : null,
    vague ? "Answer is very short or vague. Add examples and reasoning." : null,
    irrelevant ? "Answer may be off-topic. Connect it to the question and role." : null,
    inactivity ? "Long inactivity detected. Practice answering within interview time limits." : null
  ].filter(Boolean);

  return {
    score: average,
    scores,
    needsFollowUp: vague || irrelevant,
    warnings,
    feedback: {
      summary: average >= 75 ? "Strong answer with useful detail." : average >= 55 ? "Acceptable answer, but it needs more depth." : "Needs clearer structure, accuracy, and examples.",
      correctAnswer: `A strong answer should directly address "${question.prompt}", explain the reasoning, include a concrete example, and mention trade-offs or edge cases.`,
      explanation: "Interviewers look for structured thinking, role-specific knowledge, and evidence that you can apply concepts in practical situations.",
      bestPractice: "Use a concise STAR or problem-solution-impact structure. For coding, mention logic, complexity, edge cases, and tests.",
      resources: ["Role-specific interview questions", "DSA and CS fundamentals", "Project explanation practice", "Mock interview drills"]
    }
  };
}
