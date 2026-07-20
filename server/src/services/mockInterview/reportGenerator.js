function average(items, selector) {
  if (!items.length) return 0;
  return Math.round(items.reduce((sum, item) => sum + selector(item), 0) / items.length);
}

function parseEvaluation(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function hiringRecommendation(score, skills) {
  const lowCritical = Math.min(skills.technicalSkills, skills.communication, skills.problemSolving);
  if (score >= 86 && lowCritical >= 75) return ["Strong Hire", "Consistently strong technical depth, communication, and problem-solving."];
  if (score >= 75 && lowCritical >= 65) return ["Hire", "Good role readiness with manageable improvement areas."];
  if (score >= 65) return ["Lean Hire", "Shows promise, but needs targeted preparation before stronger rounds."];
  if (score >= 52) return ["Borderline", "Performance is inconsistent across important interview dimensions."];
  if (score >= 40) return ["Lean No Hire", "Several core skills need improvement before interview readiness."];
  return ["No Hire", "Current answers do not demonstrate sufficient role readiness."];
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function label(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, char => char.toUpperCase());
}

function topicWeakness(evaluation) {
  const topic = evaluation.topic || "the asked concept";
  const missing = (evaluation.expectedKeywords || []).filter(keyword => !(evaluation.coveredKeywords || []).includes(keyword));
  if (missing.length) return `Needs improvement in ${topic}: missed ${missing.slice(0, 3).join(", ")}`;
  return `Needs deeper explanation of ${topic}`;
}

function recommendationsFor(weaknesses) {
  const joined = weaknesses.join(" ").toLowerCase();
  return unique([
    joined.includes("complexity") || joined.includes("coding") ? "Practice medium coding problems and always explain time and space complexity." : null,
    joined.includes("communication") || joined.includes("structure") ? "Practice STAR and problem-solution-impact answer structures." : null,
    joined.includes("sql") ? "Revise SQL joins, indexing, grouping, and query optimization." : null,
    joined.includes("react") ? "Review React Hooks, Context API, memoization, rendering behavior, and performance optimization." : null,
    joined.includes("authentication") || joined.includes("security") ? "Study authentication flows, JWT/OAuth, authorization, validation, and common security risks." : null,
    joined.includes("rag") || joined.includes("model") || joined.includes("evaluation") ? "Review model evaluation, embeddings, vector search, RAG architecture, and deployment monitoring." : null,
    "Use official documentation and build one role-specific project that demonstrates the weak areas.",
    "Record mock answers and improve clarity, confidence, and technical vocabulary."
  ]);
}

export function buildInterviewReport({ interview, turns }) {
  const evaluations = turns.map(turn => parseEvaluation(turn.evaluation_json));
  const scoreBy = key => average(evaluations, item => item.scores?.[key] || 0);
  const codingEvaluations = evaluations.filter((_, index) => turns[index]?.question_type === "Coding");
  const avgTime = average(turns, turn => turn.time_spent_seconds || 0);
  const allWarnings = evaluations.flatMap(item => item.warnings || []);

  const skills = {
    technicalSkills: scoreBy("technicalAccuracy"),
    communication: scoreBy("communication"),
    problemSolving: scoreBy("problemSolving"),
    codingSkills: codingEvaluations.length ? average(codingEvaluations, item => item.scores?.codingQuality || 0) : scoreBy("codingQuality"),
    confidence: scoreBy("confidence"),
    behavior: scoreBy("behavioral"),
    analyticalThinking: scoreBy("analyticalThinking"),
    roleReadiness: average(evaluations, item => item.score || 0),
    timeManagement: Math.max(0, Math.min(100, 100 - Math.max(0, avgTime - 90)))
  };

  const overallScore = Math.round(
    skills.technicalSkills * 0.22 +
    skills.problemSolving * 0.16 +
    skills.communication * 0.14 +
    skills.codingSkills * 0.14 +
    skills.confidence * 0.08 +
    skills.behavior * 0.08 +
    skills.analyticalThinking * 0.1 +
    skills.roleReadiness * 0.08
  );

  const demonstratedStrengths = unique(evaluations.flatMap(item => item.strengths || []));
  const observedWeaknesses = unique([
    ...evaluations.flatMap(item => item.weaknesses || []),
    ...evaluations.filter(item => (item.score || 0) < 60).map(topicWeakness),
    ...Object.entries(skills).filter(([, value]) => value < 60).map(([key]) => `${label(key)} is below interview-ready level`)
  ]);

  const [recommendation, recommendationReason] = hiringRecommendation(overallScore, skills);

  return {
    id: interview.id,
    role: interview.role,
    difficulty: interview.difficulty,
    durationMinutes: interview.duration_minutes,
    completedAt: new Date().toISOString(),
    overallScore,
    recommendation,
    recommendationReason,
    skills,
    strengths: demonstratedStrengths.length ? demonstratedStrengths : ["No strong area was consistently demonstrated."],
    weaknesses: observedWeaknesses.length ? observedWeaknesses : ["No major weakness was observed from the submitted answers."],
    improvementAreas: recommendationsFor(observedWeaknesses),
    summary: `Candidate answered ${turns.length} questions in a ${interview.difficulty} ${interview.role} mock interview. The report is calculated from answer-level technical, communication, problem-solving, coding, behavioral, and confidence scores.`,
    cheatingSignals: allWarnings,
    questionAnalysis: turns.map((turn, index) => ({
      questionNumber: index + 1,
      type: turn.question_type,
      topic: evaluations[index]?.topic,
      category: evaluations[index]?.category,
      question: turn.question,
      answer: turn.answer,
      score: evaluations[index]?.score || 0,
      scores: evaluations[index]?.scores || {},
      timeSpentSeconds: turn.time_spent_seconds,
      feedback: evaluations[index]?.feedback,
      strengths: evaluations[index]?.strengths || [],
      weaknesses: evaluations[index]?.weaknesses || [],
      warnings: evaluations[index]?.warnings || []
    }))
  };
}
