import Joi from "joi";
import { Router } from "express";
import { v4 as uuid } from "uuid";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const sessionsRouter = Router();

sessionsRouter.use(requireAuth);

const updateSchema = Joi.object({
  title: Joi.string().min(1).max(180).required()
});

sessionsRouter.post("/", asyncHandler(async (req, res) => {
  const id = uuid();
  await pool.execute(
    "INSERT INTO sessions (id, user_id, title) VALUES (?, ?, ?)",
    [id, req.user.id, "New Chat"]
  );
  res.status(201).json({ id, title: "New Chat", created_at: new Date().toISOString() });
}));

sessionsRouter.get("/", asyncHandler(async (req, res) => {
  const [sessions] = await pool.execute(
    `SELECT s.id, s.title, s.created_at, s.updated_at,
      (SELECT content FROM messages WHERE session_id = s.id AND role <> 'system' ORDER BY timestamp DESC LIMIT 1) AS preview
     FROM sessions s
     WHERE s.user_id = ?
     ORDER BY s.updated_at DESC`,
    [req.user.id]
  );
  res.json(sessions);
}));

sessionsRouter.get("/:id", asyncHandler(async (req, res) => {
  const [sessions] = await pool.execute(
    "SELECT id, title, created_at, updated_at FROM sessions WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id]
  );

  if (!sessions.length) {
    return res.status(404).json({ message: "Session not found." });
  }

  const [messages] = await pool.execute(
    "SELECT id, role, content, timestamp FROM messages WHERE session_id = ? AND role <> 'system' ORDER BY timestamp ASC",
    [req.params.id]
  );

  res.json({ ...sessions[0], messages });
}));

sessionsRouter.put("/:id", validate(updateSchema), asyncHandler(async (req, res) => {
  const [result] = await pool.execute(
    "UPDATE sessions SET title = ? WHERE id = ? AND user_id = ?",
    [req.body.title, req.params.id, req.user.id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ message: "Session not found." });
  }

  res.json({ id: req.params.id, title: req.body.title });
}));

sessionsRouter.delete("/:id", asyncHandler(async (req, res) => {
  const [result] = await pool.execute(
    "DELETE FROM sessions WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ message: "Session not found." });
  }

  res.status(204).send();
}));
