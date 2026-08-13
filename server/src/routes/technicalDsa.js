import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { runPythonTests } from "../services/technicalDsa/codeExecutionService.js";
import { buildFeedback } from "../services/technicalDsa/interviewService.js";
import { getHint, getQuestionById, listQuestions, nextQuestion } from "../services/technicalDsa/questionService.js";

export const technicalDsaRouter = express.Router();

technicalDsaRouter.use(requireAuth);

technicalDsaRouter.get("/questions", (req, res) => {
  res.json({ questions: listQuestions(req.query.difficulty) });
});

technicalDsaRouter.post("/next-question", (req, res) => {
  const question = nextQuestion(req.body || {});
  if (!question) return res.status(404).json({ message: "No more questions available for this interview." });
  res.json({
    question,
    interviewerMessage: `Let's work on ${question.title}. Before coding, explain your approach, then implement ${question.functionName} in Python. Be ready to discuss ${question.expectedComplexity}.`
  });
});

technicalDsaRouter.post("/hint", (req, res) => {
  const hint = getHint(req.body.questionId, req.body.usedHints);
  if (!hint) return res.status(404).json({ message: "Question not found." });
  res.json(hint);
});

technicalDsaRouter.post("/run", async (req, res) => {
  const question = getQuestionById(req.body.questionId);
  if (!question) return res.status(404).json({ message: "Question not found." });
  const result = await runPythonTests({
    code: req.body.code || "",
    functionName: question.functionName,
    testCases: question.visibleTestCases,
    revealTests: true
  });
  res.json(result);
});

technicalDsaRouter.post("/submit", async (req, res) => {
  const question = getQuestionById(req.body.questionId);
  if (!question) return res.status(404).json({ message: "Question not found." });
  const result = await runPythonTests({
    code: req.body.code || "",
    functionName: question.functionName,
    testCases: [...question.visibleTestCases, ...question.hiddenTestCases],
    revealTests: false
  });
  const feedback = buildFeedback({ question, submission: result, elapsedSeconds: req.body.elapsedSeconds });
  res.json({
    ...result,
    feedback,
    interviewerMessage: result.status === "Accepted"
      ? `Good. Your solution passed. Now explain why the expected complexity is ${question.expectedComplexity}.`
      : "Let's review the failed cases conceptually. Think about edge cases and whether your function returns exactly the expected value."
  });
});
