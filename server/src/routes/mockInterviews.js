import Joi from "joi";
import { Router } from "express";
import { v4 as uuid } from "uuid";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildFollowUpQuestion, buildQuestionPlan, questionSimilarity } from "../services/mockInterview/questionGenerator.js";
import { evaluateAnswer } from "../services/mockInterview/answerEvaluator.js";
import { buildInterviewReport } from "../services/mockInterview/reportGenerator.js";

export const mockInterviewsRouter = Router();

const roles = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "AI Engineer",
  "ML Engineer",
  "Data Analyst",
  "QA Engineer",
  "Product Manager"
];

const startSchema = Joi.object({
  role: Joi.string().valid(...roles).required(),
  difficulty: Joi.string().valid("Beginner", "Intermediate", "Advanced").required(),
  duration: Joi.number().valid(10, 20, 30).required()
});

const answerSchema = Joi.object({
  answer: Joi.string().min(1).max(8000).required(),
  timeSpentSeconds: Joi.number().integer().min(0).max(3600).default(0)
});

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function getInterviewForUser(interviewId, userId) {
  const [rows] = await pool.execute(
    "SELECT * FROM mock_interviews WHERE id = ? AND user_id = ?",
    [interviewId, userId]
  );
  return rows[0] || null;
}

async function getTurns(interviewId) {
  const [turns] = await pool.execute(
    "SELECT * FROM mock_interview_turns WHERE interview_id = ? ORDER BY question_index ASC, created_at ASC",
    [interviewId]
  );
  return turns;
}

mockInterviewsRouter.use(requireAuth);

mockInterviewsRouter.post("/start", validate(startSchema), asyncHandler(async (req, res) => {
  const id = uuid();
  const questionPlan = buildQuestionPlan(req.body);
  await pool.execute(
    `INSERT INTO mock_interviews
      (id, user_id, role, difficulty, duration_minutes, question_plan_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, req.user.id, req.body.role, req.body.difficulty, req.body.duration, JSON.stringify(questionPlan)]
  );

  res.status(201).json({
    interview: {
      id,
      role: req.body.role,
      difficulty: req.body.difficulty,
      durationMinutes: req.body.duration,
      status: "active",
      totalQuestions: questionPlan.length
    },
    question: questionPlan[0]
  });
}));

mockInterviewsRouter.post("/:id/answer", validate(answerSchema), asyncHandler(async (req, res) => {
  const interview = await getInterviewForUser(req.params.id, req.user.id);
  if (!interview) return res.status(404).json({ message: "Interview not found." });
  if (interview.status === "completed") return res.status(409).json({ message: "Interview is already completed." });

  const questionPlan = parseJson(interview.question_plan_json, []);
  const question = questionPlan[interview.current_question_index];
  if (!question) return res.status(400).json({ message: "No active question found." });

  const previousTurns = await getTurns(interview.id);
  const previousAnswers = previousTurns.map(turn => turn.answer);
  const evaluation = evaluateAnswer({
    question,
    answer: req.body.answer,
    difficulty: interview.difficulty,
    timeSpentSeconds: req.body.timeSpentSeconds,
    previousAnswers
  });

  await pool.execute(
    `INSERT INTO mock_interview_turns
      (id, interview_id, question_index, question_type, question, answer, evaluation_json, time_spent_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuid(),
      interview.id,
      interview.current_question_index,
      question.type,
      question.prompt,
      req.body.answer,
      JSON.stringify(evaluation),
      req.body.timeSpentSeconds
    ]
  );

  let nextIndex = interview.current_question_index + 1;
  let nextQuestion = questionPlan[nextIndex] || null;

  if (evaluation.needsFollowUp && question.type !== "Follow-up") {
    const followUp = buildFollowUpQuestion(question, req.body.answer);
    const askedPrompts = previousTurns.map(turn => turn.question);
    const duplicateFollowUp = askedPrompts.some(prompt => questionSimilarity(prompt, followUp.prompt) >= 0.72);
    if (!duplicateFollowUp) {
      nextQuestion = followUp;
      questionPlan.splice(nextIndex, 0, nextQuestion);
    }
  }

  if (!nextQuestion) {
    const turns = await getTurns(interview.id);
    const report = buildInterviewReport({ interview, turns });
    await pool.execute(
      "UPDATE mock_interviews SET status = 'completed', completed_at = CURRENT_TIMESTAMP, report_json = ?, overall_score = ? WHERE id = ?",
      [JSON.stringify(report), report.overallScore, interview.id]
    );
    return res.json({ completed: true, evaluation, report });
  }

  await pool.execute(
    "UPDATE mock_interviews SET current_question_index = ?, question_plan_json = ? WHERE id = ?",
    [nextIndex, JSON.stringify(questionPlan), interview.id]
  );

  res.json({ completed: false, evaluation, question: nextQuestion, progress: { answered: nextIndex, total: questionPlan.length } });
}));

mockInterviewsRouter.post("/:id/finish", asyncHandler(async (req, res) => {
  const interview = await getInterviewForUser(req.params.id, req.user.id);
  if (!interview) return res.status(404).json({ message: "Interview not found." });

  const turns = await getTurns(interview.id);
  const report = buildInterviewReport({ interview, turns });
  await pool.execute(
    "UPDATE mock_interviews SET status = 'completed', completed_at = CURRENT_TIMESTAMP, report_json = ?, overall_score = ? WHERE id = ?",
    [JSON.stringify(report), report.overallScore, interview.id]
  );
  res.json({ completed: true, report });
}));

mockInterviewsRouter.get("/", asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT id, role, difficulty, duration_minutes AS durationMinutes, status,
            overall_score AS score, started_at AS startedAt, completed_at AS completedAt
       FROM mock_interviews
      WHERE user_id = ?
      ORDER BY started_at DESC
      LIMIT 50`,
    [req.user.id]
  );
  res.json({ interviews: rows });
}));

mockInterviewsRouter.get("/:id", asyncHandler(async (req, res) => {
  const interview = await getInterviewForUser(req.params.id, req.user.id);
  if (!interview) return res.status(404).json({ message: "Interview not found." });
  const turns = await getTurns(interview.id);
  res.json({
    interview: {
      id: interview.id,
      role: interview.role,
      difficulty: interview.difficulty,
      durationMinutes: interview.duration_minutes,
      status: interview.status,
      score: interview.overall_score,
      startedAt: interview.started_at,
      completedAt: interview.completed_at
    },
    turns: turns.map(turn => ({
      question: turn.question,
      questionType: turn.question_type,
      answer: turn.answer,
      evaluation: parseJson(turn.evaluation_json, {}),
      timeSpentSeconds: turn.time_spent_seconds
    })),
    report: parseJson(interview.report_json, null)
  });
}));
