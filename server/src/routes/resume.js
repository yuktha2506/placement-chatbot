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

const resumeSchema = Joi.object({
  sessionId: Joi.string().guid({ version: "uuidv4" }).allow(null),
  fileName: Joi.string().min(1).max(260).required(),
  mimeType: Joi.string().allow("").max(120),
  base64: Joi.string().min(1).required(),
  targetRole: Joi.string().allow("").max(120)
});

resumeRouter.post("/analyze", requireAuth, validate(resumeSchema), asyncHandler(async (req, res) => {
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
  phone: Joi.string().max(20).allow(""),
  linkedin: Joi.string().max(200).allow(""),
  github: Joi.string().max(200).allow(""),
  college: Joi.string().min(2).max(150).required(),
  branch: Joi.string().min(2).max(100).required(),
  cgpa: Joi.number().min(0).max(10).required(),
  graduationYear: Joi.number().min(2020).max(2030).required(),
  experience: Joi.string().max(2000).allow(""),
  projects: Joi.string().max(2000).allow(""),
  skills: Joi.string().max(1000).required(),
  certifications: Joi.string().max(500).allow(""),
  leadership: Joi.string().max(1000).allow("")
});

function addSection(doc, title) {
  doc.fontSize(11).font("Helvetica-Bold").text(title, { underline: true });
  doc.fontSize(10).font("Helvetica");
}

function addBulletPoint(doc, text) {
  const lines = doc.splitTextToSize(`• ${text}`, 500);
  doc.text(lines, { indent: 10 });
}

resumeRouter.post("/generate", validate(generateResumeSchema), asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    phone,
    linkedin,
    github,
    college,
    branch,
    cgpa,
    graduationYear,
    experience,
    projects,
    skills,
    certifications,
    leadership
  } = req.body;

  const doc = new PDFDocument({ margin: 36, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fullName.replace(/\s+/g, "_")}_Resume.pdf"`);

  doc.pipe(res);

  // HEADER
  doc.fontSize(16).font("Helvetica-Bold").text(fullName, { align: "left" });

  const contactInfo = [email, phone, linkedin, github].filter(Boolean).join(" | ");
  doc.fontSize(9).font("Helvetica").text(contactInfo, { align: "left" });
  doc.moveDown(0.4);

  // EDUCATION
  addSection(doc, "EDUCATION");
  doc.fontSize(10).text(`${college}`, { continued: false });
  doc.fontSize(9).text(`${branch} — CGPA: ${cgpa}/10 | Graduated: ${graduationYear}`, { indent: 0 });
  doc.moveDown(0.4);

  // EXPERIENCE
  if (experience.trim()) {
    addSection(doc, "EXPERIENCE");
    const expLines = experience.split("\n").filter(line => line.trim());
    let currentRole = null;

    for (const line of expLines) {
      if (line.includes("|") && !line.trim().startsWith("•")) {
        if (currentRole) doc.moveDown(0.2);
        const [role, company, dates] = line.split("|").map(s => s.trim());
        doc.fontSize(10).font("Helvetica-Bold").text(`${role} | ${company}`);
        doc.fontSize(9).font("Helvetica").text(dates);
        currentRole = true;
      } else if (line.trim().startsWith("•")) {
        addBulletPoint(doc, line.replace(/^•\s*/, ""));
      }
    }
    doc.moveDown(0.4);
  }

  // PROJECTS
  if (projects.trim()) {
    addSection(doc, "PROJECTS");
    const projLines = projects.split("\n").filter(line => line.trim());

    for (const line of projLines) {
      if (line.includes("|") && !line.trim().startsWith("•")) {
        doc.fontSize(10).font("Helvetica-Bold").text(line);
      } else if (line.trim().startsWith("•")) {
        addBulletPoint(doc, line.replace(/^•\s*/, ""));
      }
    }
    doc.moveDown(0.4);
  }

  // TECHNICAL SKILLS
  addSection(doc, "TECHNICAL SKILLS");
  const skillLines = skills.split("\n").filter(line => line.trim());
  for (const line of skillLines) {
    if (line.includes(":")) {
      const [category, skillList] = line.split(":").map(s => s.trim());
      doc.fontSize(10).font("Helvetica-Bold").text(category + ":", { continued: true });
      doc.fontSize(9).font("Helvetica").text(` ${skillList}`);
    } else {
      doc.fontSize(9).text(line);
    }
  }
  doc.moveDown(0.4);

  // CERTIFICATIONS
  if (certifications.trim()) {
    addSection(doc, "CERTIFICATIONS");
    const certLines = certifications.split("\n").filter(line => line.trim());
    for (const cert of certLines) {
      doc.fontSize(9).text(`• ${cert}`);
    }
    doc.moveDown(0.4);
  }

  // LEADERSHIP & VOLUNTEERING
  if (leadership.trim()) {
    addSection(doc, "LEADERSHIP & VOLUNTEERING");
    const leadLines = leadership.split("\n").filter(line => line.trim());
    let currentPos = null;

    for (const line of leadLines) {
      if (line.includes("|") && !line.trim().startsWith("•")) {
        if (currentPos) doc.moveDown(0.2);
        doc.fontSize(10).font("Helvetica-Bold").text(line);
        currentPos = true;
      } else if (line.trim().startsWith("•")) {
        addBulletPoint(doc, line.replace(/^•\s*/, ""));
      }
    }
  }

  doc.end();
}));
