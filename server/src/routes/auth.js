import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Joi from "joi";
import { v4 as uuid } from "uuid";
import { Router } from "express";
import { pool } from "../db/pool.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../middleware/validate.js";

export const authRouter = Router();

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().max(180).required(),
  password: Joi.string().min(8).max(100).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    env.jwtSecret,
    { expiresIn: "7d" }
  );
}

authRouter.post("/register", validate(registerSchema), asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const [existing] = await pool.execute("SELECT id FROM users WHERE email = ?", [email]);

  if (existing.length) {
    return res.status(409).json({ message: "An account with this email already exists." });
  }

  const id = uuid();
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.execute(
    "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
    [id, name, email, passwordHash]
  );

  const user = { id, name, email };
  res.status(201).json({ user, token: signToken(user) });
}));

authRouter.post("/login", validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await pool.execute(
    "SELECT id, name, email, password_hash FROM users WHERE email = ?",
    [email]
  );

  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  res.json({
    user: { id: user.id, name: user.name, email: user.email },
    token: signToken(user)
  });
}));
