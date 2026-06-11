import Joi from "joi";
import { Router } from "express";
import { v4 as uuid } from "uuid";
import PDFDocument from "pdfkit";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateSessionTitle } from "../utils/title.js";
import {
  analyzeResumeText,
  extractResumeTextFromUpload,
  getResumeContext,
  resumeContextToSystemMessage
} from "../services/resumeAnalysisService.js";

export const resumeRouter = Router();

resumeRouter.use(requireAuth);

const resumeSchema = Joi.object({
  sessionId: Joi.string().guid({ version: "uuidv4" }).allow(null),
  fileName: Joi.string().min(1).max(260).required(),
  mimeType: Joi.string().allow("").max(120),
  base64: Joi.string().min(1).required(),
  targetRole: Joi.string().allow("").max(120)
});

resumeRouter.post("/analyze", validate(resumeSchema), asyncHandler(async (req, res) => {
  console.info("[resume-upload] Request received", {
    userId: req.user.id,
    fileName: req.body.fileName,
    mimeType: req.body.mimeType
  });

  let { sessionId } = req.body;

  if (!sessionId) {
    sessionId = uuid();
    await pool.execute(
      "INSERT INTO sessions (id, user_id, title) VALUES (?, ?, ?)",
      [sessionId, req.user.id, generateSessionTitle(`Resume ${req.body.fileName}`)]
    );
  } else {
    const [sessions] = await pool.execute(
      "SELECT id FROM sessions WHERE id = ? AND user_id = ?",
      [sessionId, req.user.id]
    );

    if (!sessions.length) {
      return res.status(404).json({ message: "Session not found." });
    }
  }

  const [history] = await pool.execute(
    "SELECT role, content FROM messages WHERE session_id = ? ORDER BY timestamp ASC",
    [sessionId]
  );
  const existingContext = getResumeContext(history);

  if (existingContext?.fileName === req.body.fileName) {
    console.info("[resume-upload] Reusing existing parsed resume context", { fileName: req.body.fileName });
    return res.json({
      sessionId,
      answer: existingContext.lastAnswer,
      parsedResume: existingContext.parsedResume,
      atsScore: existingContext.atsScore,
      missingSkills: existingContext.missingSkills,
      targetRoles: existingContext.targetRoles,
      reused: true
    });
  }

  const extraction = await extractResumeTextFromUpload(req.body);
  if (extraction.text.length < 100) {
    console.warn("[resume-upload] Extraction rejected after OCR/direct attempts", {
      chars: extraction.text.length,
      ocrAttempted: extraction.ocrAttempted,
      ocrAvailable: extraction.ocrAvailable,
      errors: extraction.errors
    });
    return res.status(422).json({ message: "Unable to extract text from the uploaded resume." });
  }

  const analysis = analyzeResumeText(extraction.text, req.body.targetRole);
  const context = {
    ...analysis.resumeContext,
    fileName: req.body.fileName,
    extraction: {
      method: extraction.extractionMethod,
      ocrAttempted: extraction.ocrAttempted,
      ocrAvailable: extraction.ocrAvailable,
      errors: extraction.errors || []
    },
    lastAnswer: analysis.answer
  };

  await pool.execute(
    "INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, 'user', ?)",
    [uuid(), sessionId, `Uploaded resume for analysis: ${req.body.fileName}`]
  );
  await pool.execute(
    "INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, 'assistant', ?)",
    [uuid(), sessionId, analysis.answer]
  );
  await pool.execute(
    "INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, 'system', ?)",
    [uuid(), sessionId, resumeContextToSystemMessage(context)]
  );
  await pool.execute("UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [sessionId]);

  res.json({
    sessionId,
    answer: analysis.answer,
    parsedResume: analysis.parsedResume,
    atsScore: analysis.atsScore,
    missingSkills: analysis.skillGap.missingSkills,
    targetRoles: analysis.targetRoles,
    reused: false
  });
}));

const generateResumeSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  college: Joi.string().min(2).max(150).required(),
  branch: Joi.string().min(2).max(100).required(),
  cgpa: Joi.number().min(0).max(10).required(),
  internships: Joi.number().min(0).max(20).required(),
  projects: Joi.number().min(0).max(30).required(),
  skills: Joi.string().max(500).required()
});

resumeRouter.post("/generate", validate(generateResumeSchema), asyncHandler(async (req, res) => {
  const { fullName, email, college, branch, cgpa, internships, projects, skills } = req.body;

  const doc = new PDFDocument({ margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fullName.replace(/\s+/g, "_")}_Resume.pdf"`);

  doc.pipe(res);

  doc.fontSize(20).font("Helvetica-Bold").text(fullName, { align: "center" });
  doc.fontSize(10).font("Helvetica").text(email, { align: "center" });
  doc.text(`College: ${college} | Branch: ${branch}`, { align: "center" });
  doc.moveDown(0.5);

  doc.fontSize(12).font("Helvetica-Bold").text("ACADEMIC INFORMATION", { underline: true });
  doc.fontSize(10).font("Helvetica");
  doc.text(`CGPA: ${cgpa}/10`);
  doc.text(`Branch: ${branch}`);
  doc.text(`College: ${college}`);
  doc.moveDown(0.5);

  doc.fontSize(12).font("Helvetica-Bold").text("EXPERIENCE", { underline: true });
  doc.fontSize(10).font("Helvetica");
  doc.text(`Internships: ${internships}`);
  doc.text(`Projects: ${projects}`);
  doc.moveDown(0.5);

  doc.fontSize(12).font("Helvetica-Bold").text("SKILLS", { underline: true });
  doc.fontSize(10).font("Helvetica").text(skills);
  doc.moveDown(0.5);

  doc.fontSize(9).fillColor("#666666").text("Generated by Placement Chatbot", { align: "center" });

  doc.end();
}));
