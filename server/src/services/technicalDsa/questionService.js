import { difficultyOrder, dsaQuestions } from "../../data/technicalDsa/questions.js";

export function publicQuestion(question) {
  const { hiddenTestCases, ...safeQuestion } = question;
  return safeQuestion;
}

export function getQuestionById(id) {
  return dsaQuestions.find(question => question.id === id);
}

export function listQuestions(difficulty = "Beginner") {
  const selectedIndex = Math.max(0, difficultyOrder.indexOf(difficulty));
  const allowed = difficultyOrder.slice(0, selectedIndex + 1);
  return dsaQuestions
    .filter(question => allowed.includes(question.difficulty))
    .map(publicQuestion);
}

export function nextQuestion({ difficulty = "Beginner", askedIds = [], lastAccepted = false } = {}) {
  const selectedIndex = Math.max(0, difficultyOrder.indexOf(difficulty));
  const maxIndex = lastAccepted ? Math.min(difficultyOrder.length - 1, selectedIndex + 1) : selectedIndex;
  const allowed = lastAccepted
    ? difficultyOrder.slice(Math.max(0, selectedIndex), maxIndex + 1)
    : [difficultyOrder[selectedIndex]];
  const pool = dsaQuestions.filter(question => allowed.includes(question.difficulty) && !askedIds.includes(question.id));
  const fallback = dsaQuestions.filter(question => question.difficulty === difficulty && !askedIds.includes(question.id));
  const candidates = pool.length ? pool : fallback;
  if (!candidates.length) return null;
  const topicCounts = askedIds.reduce((acc, id) => {
    const asked = getQuestionById(id);
    if (asked) acc[asked.topic] = (acc[asked.topic] || 0) + 1;
    return acc;
  }, {});
  return publicQuestion([...candidates].sort((a, b) => {
    const exactA = a.difficulty === difficulty ? 0 : 1;
    const exactB = b.difficulty === difficulty ? 0 : 1;
    return exactA - exactB || (topicCounts[a.topic] || 0) - (topicCounts[b.topic] || 0);
  })[0]);
}

export function getHint(questionId, usedHints = 0) {
  const question = getQuestionById(questionId);
  if (!question) return null;
  const index = Math.min(Number(usedHints) || 0, question.hints.length - 1);
  return { hint: question.hints[index], hintNumber: index + 1, hasMore: index < question.hints.length - 1 };
}
