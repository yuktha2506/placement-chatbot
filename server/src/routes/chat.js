import Joi from "joi";
import { Router } from "express";
import { v4 as uuid } from "uuid";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isGreeting, greetingResponse } from "../utils/greeting.js";
import { generateSessionTitle } from "../utils/title.js";
import { retrieveKnowledge, formatKnowledgeContext } from "../services/ragService.js";
import { generateAiAnswer } from "../services/aiService.js";

export const chatRouter = Router();

chatRouter.use(requireAuth);

const chatSchema = Joi.object({
  sessionId: Joi.string().guid({ version: "uuidv4" }).allow(null),
  message: Joi.string().min(1).max(25000).required()
});

chatRouter.post("/", validate(chatSchema), asyncHandler(async (req, res) => {
  const { message } = req.body;
  let { sessionId } = req.body;

  if (!sessionId) {
    sessionId = uuid();
    await pool.execute(
      "INSERT INTO sessions (id, user_id, title) VALUES (?, ?, ?)",
      [sessionId, req.user.id, generateSessionTitle(message)]
    );
  } else {
    const [sessions] = await pool.execute(
      "SELECT id, title FROM sessions WHERE id = ? AND user_id = ?",
      [sessionId, req.user.id]
    );

    if (!sessions.length) {
      return res.status(404).json({ message: "Session not found." });
    }
  }

  const [existingMessages] = await pool.execute(
    "SELECT role, content FROM messages WHERE session_id = ? ORDER BY timestamp ASC LIMIT 20",
    [sessionId]
  );

  await pool.execute(
    "INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, 'user', ?)",
    [uuid(), sessionId, message]
  );

  let answer;
  let sources = [];

  if (isGreeting(message)) {
    answer = greetingResponse;
  } else {
    sources = retrieveKnowledge(message);
    const context = formatKnowledgeContext(sources);
    answer = await generateAiAnswer({
      query: message,
      context,
      history: existingMessages
    });
  }

  await pool.execute(
    "INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, 'assistant', ?)",
    [uuid(), sessionId, answer]
  );

  const [countRows] = await pool.execute(
    "SELECT COUNT(*) AS count FROM messages WHERE session_id = ?",
    [sessionId]
  );

  if (countRows[0].count <= 2) {
    await pool.execute(
      "UPDATE sessions SET title = ? WHERE id = ?",
      [generateSessionTitle(message), sessionId]
    );
  } else {
    await pool.execute("UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [sessionId]);
  }

  res.json({
    sessionId,
    answer,
    sources: sources.map(({ id, title }) => ({ id, title }))
  });
}));
