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

function sanitizePdfText(value = "") {
  return String(value)
    .normalize("NFKC")
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00A0/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function isBulletLine(line = "") {
  return /^[\s]*(?:[-*]|\u2022|â€¢)\s+/.test(line);
}

function stripBulletMarker(line = "") {
  return line.replace(/^[\s]*(?:[-*]|\u2022|â€¢)\s+/, "");
}

function addBulletPoint(doc, text) {
  doc.fontSize(9).font("Helvetica").text(`- ${sanitizePdfText(text)}`, {
    indent: 10,
    width: 500,
    lineGap: 1
  });
}

function getPdfLayout({ experience, projects, skills, certifications, leadership }) {
  const lineCount = [experience, projects, skills, certifications, leadership]
    .flatMap(value => String(value || "").split("\n"))
    .filter(line => line.trim()).length;

  if (lineCount <= 10) {
    return {
      margin: 44,
      nameSize: 21,
      contactSize: 9.5,
      headingSize: 11.5,
      bodySize: 9.8,
      headerGap: 16,
      sectionGap: 15,
      itemGap: 5,
      lineGap: 2.2,
      bulletGap: 4
    };
  }

  if (lineCount >= 28) {
    return {
      margin: 34,
      nameSize: 18,
      contactSize: 8.6,
      headingSize: 10.6,
      bodySize: 8.8,
      headerGap: 8,
      sectionGap: 7,
      itemGap: 2.5,
      lineGap: 0.8,
      bulletGap: 1.5
    };
  }

  return {
    margin: 38,
    nameSize: 20,
    contactSize: 9,
    headingSize: 11,
    bodySize: 9.3,
    headerGap: 11,
    sectionGap: 10,
    itemGap: 3.5,
    lineGap: 1.3,
    bulletGap: 2.5
  };
}

function ensurePageSpace(doc, height, layout) {
  const bottom = doc.page.height - layout.margin;
  if (doc.y + height > bottom) {
    doc.addPage();
    doc.y = layout.margin;
  }
}

function addStyledSection(doc, title, layout) {
  ensurePageSpace(doc, layout.headingSize + 14, layout);
  doc.moveDown(layout.sectionGap / 12);
  doc.fontSize(layout.headingSize).font("Helvetica-Bold").text(title, {
    characterSpacing: 0.2
  });

  const dividerY = doc.y + 2;
  doc.save()
    .moveTo(layout.margin, dividerY)
    .lineTo(doc.page.width - layout.margin, dividerY)
    .lineWidth(0.6)
    .strokeColor("#9ca3af")
    .stroke()
    .restore();
  doc.y = dividerY + 8;
  doc.fontSize(layout.bodySize).font("Helvetica");
}

function addStyledBodyLine(doc, text, layout, options = {}) {
  const clean = sanitizePdfText(text);
  const width = doc.page.width - (layout.margin * 2) - (options.indent || 0);
  doc.font(options.bold ? "Helvetica-Bold" : "Helvetica").fontSize(options.size || layout.bodySize);
  const height = doc.heightOfString(clean, { width, lineGap: layout.lineGap });
  ensurePageSpace(doc, height + layout.itemGap, layout);
  doc.text(clean, layout.margin + (options.indent || 0), doc.y, {
    width,
    lineGap: layout.lineGap
  });
  doc.y += layout.itemGap;
}

function addStyledBulletPoint(doc, text, layout) {
  const clean = sanitizePdfText(text);
  const bulletX = layout.margin + 8;
  const textX = layout.margin + 22;
  const width = doc.page.width - layout.margin - textX;

  doc.font("Helvetica").fontSize(layout.bodySize);
  const height = doc.heightOfString(clean, { width, lineGap: layout.lineGap });
  ensurePageSpace(doc, height + layout.bulletGap, layout);

  const y = doc.y;
  doc.text("-", bulletX, y, { width: 8 });
  doc.text(clean, textX, y, { width, lineGap: layout.lineGap });
  doc.y = y + height + layout.bulletGap;
}

resumeRouter.post("/generate", validate(generateResumeSchema), asyncHandler(async (req, res) => {
  console.info("[resume-generate] request received", {
    fullName: req.body.fullName,
    email: req.body.email
  });

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

  const safeFullName = sanitizePdfText(fullName);
  const layout = getPdfLayout({ experience, projects, skills, certifications, leadership });
  const doc = new PDFDocument({ margin: layout.margin, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${safeFullName.replace(/\s+/g, "_")}_Resume.pdf"`);
  console.info("[resume-generate] pdf stream starting", { fullName: safeFullName });

  doc.pipe(res);

  // HEADER
  doc.fontSize(layout.nameSize).font("Helvetica-Bold").text(safeFullName, {
    align: "center",
    characterSpacing: 0.2
  });

  const contactInfo = [email, phone, linkedin, github].filter(Boolean).map(sanitizePdfText).join(" | ");
  doc.fontSize(layout.contactSize).font("Helvetica").text(contactInfo, {
    align: "center",
    lineGap: layout.lineGap
  });
  doc.moveDown(layout.headerGap / 12);

  // EDUCATION
  addStyledSection(doc, "EDUCATION", layout);
  addStyledBodyLine(doc, sanitizePdfText(college), layout, { bold: true, size: layout.bodySize + 0.4 });
  addStyledBodyLine(doc, `${sanitizePdfText(branch)} - CGPA: ${cgpa}/10 | Graduated: ${graduationYear}`, layout);

  // EXPERIENCE
  if (experience.trim()) {
    addStyledSection(doc, "EXPERIENCE", layout);
    const expLines = experience.split("\n").filter(line => line.trim());
    let currentRole = null;

    for (const line of expLines) {
      if (line.includes("|") && !isBulletLine(line)) {
        if (currentRole) doc.y += layout.itemGap;
        const [role, company, dates] = line.split("|").map(s => sanitizePdfText(s.trim()));
        addStyledBodyLine(doc, `${role} | ${company}`, layout, { bold: true, size: layout.bodySize + 0.3 });
        if (dates) addStyledBodyLine(doc, dates, layout);
        currentRole = true;
      } else if (isBulletLine(line)) {
        addStyledBulletPoint(doc, stripBulletMarker(line), layout);
      } else {
        addStyledBulletPoint(doc, line, layout);
      }
    }
  }

  // PROJECTS
  if (projects.trim()) {
    addStyledSection(doc, "PROJECTS", layout);
    const projLines = projects.split("\n").filter(line => line.trim());

    for (const line of projLines) {
      if (line.includes("|") && !isBulletLine(line)) {
        addStyledBodyLine(doc, sanitizePdfText(line), layout, { bold: true, size: layout.bodySize + 0.3 });
      } else if (isBulletLine(line)) {
        addStyledBulletPoint(doc, stripBulletMarker(line), layout);
      } else {
        addStyledBulletPoint(doc, line, layout);
      }
    }
  }

  // TECHNICAL SKILLS
  addStyledSection(doc, "TECHNICAL SKILLS", layout);
  const skillLines = skills.split("\n").filter(line => line.trim());
  for (const line of skillLines) {
    if (line.includes(":")) {
      const [category, ...rest] = line.split(":");
      const skillList = rest.join(":").trim();
      addStyledBodyLine(doc, `${sanitizePdfText(category.trim())}: ${sanitizePdfText(skillList)}`, layout, {
        bold: true,
        size: layout.bodySize
      });
    } else {
      addStyledBodyLine(doc, sanitizePdfText(line), layout);
    }
  }

  // CERTIFICATIONS
  if (certifications.trim()) {
    addStyledSection(doc, "CERTIFICATIONS", layout);
    const certLines = certifications.split("\n").filter(line => line.trim());
    for (const cert of certLines) {
      addStyledBulletPoint(doc, stripBulletMarker(cert), layout);
    }
  }

  // LEADERSHIP & VOLUNTEERING
  if (leadership.trim()) {
    addStyledSection(doc, "LEADERSHIP & VOLUNTEERING", layout);
    const leadLines = leadership.split("\n").filter(line => line.trim());
    let currentPos = null;

    for (const line of leadLines) {
      if (line.includes("|") && !isBulletLine(line)) {
        if (currentPos) doc.y += layout.itemGap;
        addStyledBodyLine(doc, sanitizePdfText(line), layout, { bold: true, size: layout.bodySize + 0.3 });
        currentPos = true;
      } else if (isBulletLine(line)) {
        addStyledBulletPoint(doc, stripBulletMarker(line), layout);
      } else {
        addStyledBulletPoint(doc, line, layout);
      }
    }
  }

  doc.end();
  console.info("[resume-generate] response sent", { fullName: safeFullName });
}));
