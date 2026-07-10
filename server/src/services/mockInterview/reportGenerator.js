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

function recommendation(score) {
  if (score >= 85) return "Excellent";
  if (score >= 72) return "Good";
  if (score >= 58) return "Average";
  if (score >= 42) return "Needs Improvement";
  return "Not Recommended";
}

export function buildInterviewReport({ interview, turns }) {
  const evaluations = turns.map(turn => parseEvaluation(turn.evaluation_json));
  const overallScore = average(evaluations, item => item.score);
  const scoreBy = key => average(evaluations, item => item.scores?.[key] * 10 || 0);
  const codingTurns = turns.filter(turn => turn.question_type === "Coding");
  const avgTime = average(turns, turn => turn.time_spent_seconds || 0);
  const allWarnings = evaluations.flatMap(item => item.warnings || []);

  const skills = {
    technicalSkills: scoreBy("technicalCorrectness"),
    problemSolving: scoreBy("depth"),
    communication: scoreBy("communication"),
    codingSkills: codingTurns.length ? average(codingTurns, turn => parseEvaluation(turn.evaluation_json).scores?.technicalCorrectness * 10 || 0) : scoreBy("technicalCorrectness"),
    confidence: scoreBy("confidence"),
    behavioralSkills: scoreBy("clarity"),
    timeManagement: Math.max(0, Math.min(100, 100 - Math.max(0, avgTime - 90))),
    analyticalThinking: scoreBy("accuracy")
  };

  const strengths = Object.entries(skills)
    .filter(([, value]) => value >= 70)
    .map(([key]) => key.replace(/([A-Z])/g, " $1").replace(/^./, char => char.toUpperCase()));
  const weaknesses = Object.entries(skills)
    .filter(([, value]) => value < 60)
    .map(([key]) => key.replace(/([A-Z])/g, " $1").replace(/^./, char => char.toUpperCase()));

  return {
    id: interview.id,
    role: interview.role,
    difficulty: interview.difficulty,
    durationMinutes: interview.duration_minutes,
    completedAt: new Date().toISOString(),
    overallScore,
    recommendation: recommendation(overallScore),
    skills,
    strengths: strengths.length ? strengths : ["Clear participation", "Completed the interview flow"],
    weaknesses: weaknesses.length ? weaknesses : ["No critical weakness detected"],
    improvementAreas: [
      "Use structured answers with examples and measurable impact.",
      "Mention trade-offs, edge cases, and complexity for technical answers.",
      "Practice concise communication under time limits."
    ],
    summary: `Candidate completed a ${interview.difficulty} ${interview.role} mock interview with ${turns.length} answered questions.`,
    cheatingSignals: allWarnings,
    questionAnalysis: turns.map((turn, index) => ({
      questionNumber: index + 1,
      type: turn.question_type,
      question: turn.question,
      answer: turn.answer,
      score: evaluations[index]?.score || 0,
      timeSpentSeconds: turn.time_spent_seconds,
      feedback: evaluations[index]?.feedback,
      warnings: evaluations[index]?.warnings || []
    }))
  };
}
