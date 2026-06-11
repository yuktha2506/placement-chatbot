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
import { detectIntent, shouldReturnDirectAnswer, shouldSkipRag, shouldProcessWithPersonalization, isComparison } from "../services/intentService.js";
import { findDirectAnswer, findComparisonAnswer } from "../services/knowledgeService.js";
import { getPersonalizedAnswer } from "../services/personalizationService.js";
import { getResumeContext, answerWithResumeContext } from "../services/resumeAnalysisService.js";

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
    try {
      await pool.execute(
        "INSERT INTO sessions (id, user_id, title) VALUES (?, ?, ?)",
        [sessionId, req.user.id, generateSessionTitle(message)]
      );
    } catch (error) {
      console.error("Failed to create session:", { error: error.message, userId: req.user.id });
      return res.status(500).json({ message: "Failed to create session." });
    }
  } else {
    try {
      const [sessions] = await pool.execute(
        "SELECT id, title FROM sessions WHERE id = ? AND user_id = ?",
        [sessionId, req.user.id]
      );

      if (!sessions.length) {
        return res.status(404).json({ message: "Session not found." });
      }
    } catch (error) {
      console.error("Failed to validate session:", { error: error.message, sessionId });
      return res.status(500).json({ message: "Failed to validate session." });
    }
  }

  let existingMessages = [];
  try {
    const [messages] = await pool.execute(
      `SELECT role, content FROM (
        SELECT role, content, timestamp FROM messages
        WHERE session_id = ?
        ORDER BY timestamp DESC
        LIMIT 80
      ) recent_messages
      ORDER BY timestamp ASC`,
      [sessionId]
    );
    existingMessages = messages;
  } catch (error) {
    console.error("Failed to retrieve message history:", { error: error.message, sessionId });
  }

  try {
    await pool.execute(
      "INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, 'user', ?)",
      [uuid(), sessionId, message]
    );
  } catch (error) {
    console.error("Failed to insert user message:", { error: error.message, sessionId });
  }

  let answer;
  let sources = [];

  try {
    if (isGreeting(message)) {
      answer = greetingResponse;
    } else {
      const intent = detectIntent(message);

      if (shouldReturnDirectAnswer(intent)) {
        const directAnswer = findDirectAnswer(message, intent);
        if (directAnswer) {
          answer = directAnswer;
        } else {
          sources = retrieveKnowledge(message);
          const context = formatKnowledgeContext(sources);
          answer = await generateAiAnswer({
            query: message,
            context,
            history: existingMessages,
            intent
          });
        }
      } else if (isComparison(intent)) {
        const comparisonAnswer = findComparisonAnswer(message);
        if (comparisonAnswer) {
          answer = comparisonAnswer;
        } else {
          sources = retrieveKnowledge(message);
          const context = formatKnowledgeContext(sources);
          answer = await generateAiAnswer({
            query: message,
            context,
            history: existingMessages,
            intent
          });
        }
      } else if (shouldProcessWithPersonalization(intent)) {
        const resumeContext = getResumeContext(existingMessages);
        const resumeAnswer = answerWithResumeContext(message, resumeContext);
        if (resumeAnswer) {
          answer = resumeAnswer;
        } else {
          const personalizedAnswer = getPersonalizedAnswer({ query: message, history: existingMessages });
          if (personalizedAnswer) {
            answer = personalizedAnswer;
          } else {
            sources = retrieveKnowledge(message);
            const context = formatKnowledgeContext(sources);
            answer = await generateAiAnswer({
              query: message,
              context,
              history: existingMessages,
              intent
            });
          }
        }
      } else {
        sources = retrieveKnowledge(message);
        const context = formatKnowledgeContext(sources);
        answer = await generateAiAnswer({
          query: message,
          context,
          history: existingMessages,
          intent
        });
      }
    }
  } catch (error) {
    console.error("Failed to generate answer:", {
      error: error.message,
      sessionId,
      message: message.substring(0, 100)
    });
    answer = "I encountered an error while processing your question. Please try again.";
  }

  try {
    await pool.execute(
      "INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, 'assistant', ?)",
      [uuid(), sessionId, answer]
    );
  } catch (error) {
    console.error("Failed to insert assistant message:", { error: error.message, sessionId });
  }

  try {
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
  } catch (error) {
    console.error("Failed to update session:", { error: error.message, sessionId });
  }

  res.json({
    sessionId,
    answer,
    sources: sources.map(({ id, title }) => ({ id, title }))
  });
}));
