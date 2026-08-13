export function buildFeedback({ question, submission, elapsedSeconds = 0 }) {
  const accuracy = submission.total ? Math.round((submission.passed / submission.total) * 100) : 0;
  const accepted = submission.status === "Accepted";
  return {
    status: submission.status,
    accuracy,
    correctness: accepted ? "All tests passed." : `${submission.passed}/${submission.total} tests passed.`,
    complexity: question.expectedComplexity,
    feedback: accepted
      ? `Good work. Your solution satisfies the test cases for ${question.title}. Be ready to explain ${question.expectedComplexity}.`
      : `Review edge cases for ${question.topic}. Focus on the expected behavior before optimizing.`,
    timeSpentSeconds: Number(elapsedSeconds) || 0
  };
}

export function buildSummary({ attempts = [], difficulty = "Beginner", totalSeconds = 0 }) {
  const solved = attempts.filter(item => item.status === "Accepted").length;
  const partial = attempts.filter(item => item.status === "Partially Correct").length;
  const accuracy = attempts.length ? Math.round((attempts.reduce((sum, item) => sum + item.accuracy, 0) / attempts.length)) : 0;
  const topicMap = attempts.reduce((acc, item) => {
    acc[item.topic] = acc[item.topic] || [];
    acc[item.topic].push(item.accuracy);
    return acc;
  }, {});
  const topics = Object.fromEntries(Object.entries(topicMap).map(([topic, scores]) => {
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return [topic, avg >= 85 ? "Excellent" : avg >= 65 ? "Good" : avg >= 40 ? "Needs Improvement" : "Weak"];
  }));
  return {
    difficulty,
    overallScore: accuracy,
    questionsAttempted: attempts.length,
    questionsSolved: solved,
    questionsPartiallySolved: partial,
    accuracy,
    problemSolving: accuracy >= 80 ? "Strong" : accuracy >= 55 ? "Developing" : "Needs practice",
    codeQuality: solved >= Math.ceil(attempts.length / 2) ? "Good" : "Needs cleaner, tested implementations",
    timeManagement: totalSeconds && attempts.length ? `${Math.round(totalSeconds / attempts.length)}s average per question` : "Not enough data",
    topics,
    recommendedTopics: Object.entries(topics).filter(([, rating]) => /Needs|Weak/.test(rating)).map(([topic]) => topic)
  };
}
