import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";

const execFileAsync = promisify(execFile);
const contextMarker = "RESUME_CONTEXT_JSON:";

export const roleRequirements = {
  "software engineer": ["DSA", "OOPs", "DBMS", "OS", "CN", "Git", "REST APIs", "Java", "Python"],
  "data analyst": ["SQL", "Excel", "Python", "Statistics", "Power BI", "Tableau", "Data Visualization"],
  "data scientist": ["Python", "SQL", "Statistics", "Machine Learning", "Pandas", "Scikit-learn", "Model Evaluation"],
  "data engineer": ["SQL", "Python", "Spark", "Airflow", "AWS", "Data Warehousing", "ETL", "Kafka"],
  "ai/ml engineer": ["Python", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "MLOps", "Docker"],
  "full stack developer": ["HTML", "CSS", "JavaScript", "React", "Node.js", "SQL", "REST APIs", "Git"],
  "backend developer": ["Node.js", "Java", "Python", "REST APIs", "Databases", "Authentication", "System Design"],
  "frontend developer": ["HTML", "CSS", "JavaScript", "React", "Responsive Design", "Accessibility", "Git"],
  "cloud engineer": ["Linux", "Networking", "AWS", "Azure", "Docker", "Cloud Security", "Scripting"],
  "devops engineer": ["Linux", "CI/CD", "Docker", "Kubernetes", "AWS", "Terraform", "Monitoring"]
};

const knownSkills = [
  "Java", "Python", "C", "C++", "JavaScript", "TypeScript", "SQL", "HTML", "CSS",
  "React", "Angular", "Vue", "Node.js", "Express", "Django", "Spring", "Flask",
  "MySQL", "MongoDB", "PostgreSQL", "Firebase", "Oracle", "Redis",
  "Git", "GitHub", "Docker", "Kubernetes", "Jenkins", "GitHub Actions", "Postman",
  "AWS", "Azure", "GCP", "Linux", "Terraform", "Airflow", "Spark", "Kafka",
  "Pandas", "NumPy", "Scikit-learn", "TensorFlow", "PyTorch", "Power BI", "Tableau",
  "DSA", "OOPs", "DBMS", "OS", "CN", "REST APIs", "Machine Learning", "Deep Learning",
  "Data Warehousing", "ETL", "Statistics", "System Design"
];

export function resumeContextToSystemMessage(context) {
  return `${contextMarker}${JSON.stringify(context)}`;
}

export function getResumeContext(history = []) {
  const systemMessage = [...history].reverse().find((message) => (
    message.role === "system" && message.content?.startsWith(contextMarker)
  ));

  if (!systemMessage) return null;

  try {
    return JSON.parse(systemMessage.content.slice(contextMarker.length));
  } catch (error) {
    console.error("[resume-context] Failed to parse session resume context", error);
    return null;
  }
}

export async function extractResumeTextFromUpload({ fileName, mimeType, base64 }) {
  console.info("[resume-upload] Starting extraction", { fileName, mimeType });
  const extension = normalizeExtension(fileName, mimeType);
  const buffer = Buffer.from(base64, "base64");

  if (extension === ".txt" || mimeType?.startsWith("text/")) {
    const text = buffer.toString("utf8");
    console.info("[resume-upload] TXT extraction complete", { chars: text.length });
    return { text, extractionMethod: "txt", ocrAttempted: false, ocrAvailable: false };
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "placement-resume-"));
  const filePath = path.join(tmpDir, `resume${extension}`);

  try {
    await fs.writeFile(filePath, buffer);
    const result = await runPythonExtractor(filePath, extension);
    console.info("[resume-upload] Extraction complete", {
      method: result.extractionMethod,
      chars: result.text.length,
      ocrAttempted: result.ocrAttempted,
      ocrAvailable: result.ocrAvailable
    });
    return result;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function runPythonExtractor(filePath, extension) {
  const pythonPath = env.pythonPath || "python";
  const scriptPath = fileURLToPath(new URL("../utils/resume_extract.py", import.meta.url));
  const { stdout, stderr } = await execFileAsync(pythonPath, [scriptPath, filePath, extension], {
    maxBuffer: 1024 * 1024 * 8
  });

  if (stderr.trim()) {
    console.warn("[resume-upload] Extractor stderr", stderr.trim());
  }

  return JSON.parse(stdout);
}

function normalizeExtension(fileName = "", mimeType = "") {
  const extension = path.extname(fileName).toLowerCase();
  if (extension) return extension;
  if (mimeType.includes("pdf")) return ".pdf";
  if (mimeType.includes("word")) return ".docx";
  return ".txt";
}

export function analyzeResumeText(text, targetRoleInput = "") {
  const resumeText = normalizeText(text);
  console.info("[resume-analysis] Parsing resume", { chars: resumeText.length });
  const parsedResume = parseResume(resumeText);
  const targetRoles = inferTargetRoles(resumeText, targetRoleInput);
  const primaryRole = targetRoles[0] || "software engineer";
  const ats = calculateAtsScore(parsedResume, resumeText);
  const skillGap = calculateSkillGap(parsedResume.skills, primaryRole);
  const placementReadinessScore = calculatePlacementReadiness(ats.total, parsedResume, skillGap);

  const resumeContext = {
    parsedResume,
    atsScore: ats,
    missingSkills: skillGap.missingSkills,
    targetRoles,
    placementReadinessScore,
    analyzedAt: new Date().toISOString()
  };

  console.info("[resume-analysis] Analysis complete", {
    atsScore: ats.total,
    placementReadinessScore,
    targetRoles,
    missingSkills: skillGap.missingSkills
  });

  return {
    parsedResume,
    atsScore: ats,
    skillGap,
    targetRoles,
    placementReadinessScore,
    resumeContext,
    answer: formatResumeAnalysis({ parsedResume, ats, skillGap, targetRoles, placementReadinessScore })
  };
}

export function answerWithResumeContext(query, resumeContext) {
  if (!resumeContext) return null;

  const normalized = query.toLowerCase();
  const role = inferTargetRoles(query, resumeContext.targetRoles?.[0])[0] || resumeContext.targetRoles?.[0] || "software engineer";
  const gap = calculateSkillGap(resumeContext.parsedResume.skills || [], role);

  if (/eligible|eligibility|placements?/.test(normalized)) {
    return `## Placement Eligibility Analysis

Based on your uploaded resume, your current placement readiness score is **${resumeContext.placementReadinessScore}/100** and ATS score is **${resumeContext.atsScore.total}/100**.

| Area | Status |
| --- | --- |
| Skills Match for ${toTitleCase(role)} | ${gap.matchedSkills.length}/${gap.requiredSkills.length} required skills found |
| ATS Readiness | ${resumeContext.atsScore.total >= 75 ? "Strong" : resumeContext.atsScore.total >= 60 ? "Moderate" : "Needs improvement"} |
| Projects | ${resumeContext.parsedResume.projects.length ? "Present" : "Needs stronger project section"} |
| Experience / Internship | ${resumeContext.parsedResume.experience.length ? "Present" : "Add internship or practical experience if possible"} |

## Missing Skills

${gap.missingSkills.map((skill) => `- ${skill}`).join("\n") || "- No major role-specific missing skill detected."}

## Recommendation

You can apply for placements now, but prioritize the missing skills and ATS weaknesses before targeting more selective companies.`;
  }

  if (/prepare|roadmap|how should i/.test(normalized)) {
    return formatRoadmap(gap, role, resumeContext);
  }

  if (/compan|target/.test(normalized)) {
    return `## Companies You Can Target

Based on your resume skills and readiness score:

**Current-fit companies**
- TCS
- Infosys
- Wipro
- Accenture
- Cognizant

**After improving ${gap.missingSkills.slice(0, 3).join(", ") || "project depth"}**
- Zoho
- Oracle
- Salesforce
- Amazon entry-level roles
- Microsoft internships or early-career roles

## Why

Your resume currently shows: ${resumeContext.parsedResume.skills.slice(0, 8).join(", ") || "limited extracted skills"}. For **${toTitleCase(role)}**, close these gaps first: ${gap.missingSkills.join(", ") || "continue strengthening projects and interview prep"}.`;
  }

  if (/data engineer|data analyst|data scientist|full stack|backend|frontend|cloud|devops|ai\/ml|ml engineer|software engineer/.test(normalized)) {
    return `## Role Fit: ${toTitleCase(role)}

| Requirement | Resume Match |
| --- | --- |
| Required Skills | ${gap.requiredSkills.join(", ")} |
| Found Skills | ${gap.matchedSkills.join(", ") || "No direct matches found"} |
| Missing Skills | ${gap.missingSkills.join(", ") || "No major skill gap detected"} |

## Can You Get This Role?

${gap.missingSkills.length <= 2 ? "Yes, you are reasonably aligned for this role." : "You can target this role, but you should close the listed gaps first."}

${formatRoadmap(gap, role, resumeContext)}`;
  }

  return null;
}

function parseResume(text) {
  const sections = splitSections(text);
  return {
    name: extractName(text),
    email: text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "",
    phone: text.match(/(?:\+91[\s-]?)?[6-9]\d{9}|\+?\d[\d\s().-]{8,}\d/)?.[0]?.trim() || "",
    linkedin: text.match(/https?:\/\/[^\s]*linkedin[^\s]*/i)?.[0] || "",
    github: text.match(/https?:\/\/[^\s]*github[^\s]*/i)?.[0] || "",
    education: extractSectionItems(sections, ["education"]),
    skills: extractSkills(text),
    projects: extractSectionItems(sections, ["projects", "project"]),
    experience: extractSectionItems(sections, ["experience", "internship", "internships", "work experience"]),
    certifications: extractSectionItems(sections, ["certifications", "certification", "certificates"]),
    achievements: extractSectionItems(sections, ["achievements", "awards", "honors", "competitive programming"])
  };
}

function splitSections(text) {
  const headings = ["education", "experience", "internships", "projects", "technical skills", "skills", "certifications", "achievements", "leadership", "volunteering"];
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const sections = {};
  let current = "header";
  sections[current] = [];

  for (const line of lines) {
    const normalized = line.toLowerCase().replace(/[:\-]+$/, "");
    const heading = headings.find((item) => normalized === item || normalized.includes(item));
    if (heading && line.length < 45) {
      current = heading;
      sections[current] = [];
    } else {
      sections[current].push(line);
    }
  }

  return sections;
}

function extractSectionItems(sections, names) {
  const lines = names.flatMap((name) => sections[name] || []);
  return lines
    .join("\n")
    .split(/\n|•|(?:^|\s)-\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 3)
    .slice(0, 12);
}

function extractName(text) {
  const firstLines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 5);
  return firstLines.find((line) => (
    /^[A-Za-z][A-Za-z\s.]{2,60}$/.test(line) &&
    !/resume|curriculum|email|phone|linkedin|github/i.test(line)
  )) || "";
}

function extractSkills(text) {
  return knownSkills.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = skill === "C"
      ? /(?:^|[\s,;|/(])C(?:$|[\s,;|/)])/i
      : new RegExp(`(?:^|[^A-Za-z0-9+.#])${escaped}(?:$|[^A-Za-z0-9+.#])`, "i");
    return pattern.test(text);
  });
}

function calculateAtsScore(parsed, text) {
  const structure = Math.min(20,
    (parsed.name ? 4 : 0) +
    (parsed.phone ? 4 : 0) +
    (parsed.email ? 4 : 0) +
    (parsed.linkedin ? 4 : 0) +
    (parsed.github ? 4 : 0)
  );
  const education = Math.min(10,
    (/b\.?tech|bachelor|degree|m\.?tech|master|bca|mca/i.test(text) ? 4 : 0) +
    (parsed.education.length ? 3 : 0) +
    (/(20\d{2})/.test(text) ? 3 : 0)
  );
  const technicalSkills = Math.min(20,
    Math.min(8, parsed.skills.filter((skill) => /java|python|sql|javascript|c\+\+|html|css/i.test(skill)).length * 2) +
    Math.min(5, parsed.skills.filter((skill) => /react|node|django|spring|tensorflow|pytorch/i.test(skill)).length * 2) +
    Math.min(4, parsed.skills.filter((skill) => /mysql|mongodb|postgres|oracle|firebase/i.test(skill)).length * 2) +
    Math.min(3, parsed.skills.filter((skill) => /git|docker|aws|azure|postman|linux/i.test(skill)).length)
  );
  const projects = Math.min(20,
    (parsed.projects.length ? 6 : 0) +
    (parsed.projects.length >= 2 ? 4 : 0) +
    (/technolog|stack|using|built|developed|implemented/i.test(parsed.projects.join(" ")) ? 5 : 0) +
    (/\d+%|\d+\+|users|accuracy|reduced|improved|optimized/i.test(parsed.projects.join(" ")) ? 5 : 0)
  );
  const experience = Math.min(10,
    (parsed.experience.length ? 4 : 0) +
    (/intern|developer|engineer|analyst/i.test(parsed.experience.join(" ")) ? 3 : 0) +
    (/\d+\s*(month|year)|contributed|developed|managed|built/i.test(parsed.experience.join(" ")) ? 3 : 0)
  );
  const achievements = Math.min(10,
    (parsed.certifications.length ? 4 : 0) +
    (parsed.achievements.length ? 3 : 0) +
    (/leetcode|hackerrank|codechef|codeforces|award|rank|certified/i.test(text) ? 3 : 0)
  );
  const keywords = Math.min(10,
    (/education/i.test(text) ? 1 : 0) +
    (/experience|internship/i.test(text) ? 1 : 0) +
    (/projects/i.test(text) ? 1 : 0) +
    (/technical skills|skills/i.test(text) ? 1 : 0) +
    (/certifications/i.test(text) ? 1 : 0) +
    Math.min(5, parsed.skills.length)
  );

  const breakdown = { structure, education, technicalSkills, projects, experience, achievements, keywords };
  const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  console.info("[ats] Deterministic score calculated", { breakdown, total });
  return { total, breakdown };
}

function calculateSkillGap(skills, role) {
  const requiredSkills = roleRequirements[role] || roleRequirements["software engineer"];
  const resumeSkillText = skills.join(" ").toLowerCase();
  const matchedSkills = requiredSkills.filter((skill) => resumeSkillText.includes(skill.toLowerCase()));
  const missingSkills = requiredSkills.filter((skill) => !resumeSkillText.includes(skill.toLowerCase()));
  return {
    targetRole: role,
    requiredSkills,
    resumeSkills: skills,
    matchedSkills,
    missingSkills,
    priority: missingSkills.map((skill, index) => ({ rank: index + 1, skill }))
  };
}

function calculatePlacementReadiness(atsScore, parsed, skillGap) {
  const skillFit = Math.round((skillGap.matchedSkills.length / Math.max(skillGap.requiredSkills.length, 1)) * 35);
  const projectFit = parsed.projects.length ? 20 : 6;
  const experienceFit = parsed.experience.length ? 15 : 5;
  const atsFit = Math.round(atsScore * 0.3);
  return Math.min(100, skillFit + projectFit + experienceFit + atsFit);
}

function inferTargetRoles(text, explicitRole = "") {
  const source = `${explicitRole} ${text}`.toLowerCase();
  const roles = Object.keys(roleRequirements).filter((role) => source.includes(role));
  if (/data engineer/.test(source)) return ["data engineer", ...roles.filter((role) => role !== "data engineer")];
  if (/full.?stack/.test(source)) return ["full stack developer", ...roles.filter((role) => role !== "full stack developer")];
  if (/ai|ml|machine learning/.test(source)) return ["ai/ml engineer", ...roles.filter((role) => role !== "ai/ml engineer")];
  return roles.length ? [...new Set(roles)] : ["software engineer"];
}

function formatResumeAnalysis({ parsedResume, ats, skillGap, targetRoles, placementReadinessScore }) {
  return `## Resume-Based ATS & Placement Analysis

### Parsed Resume

| Field | Extracted Value |
| --- | --- |
| Name | ${parsedResume.name || "Not detected"} |
| Email | ${parsedResume.email || "Not detected"} |
| Phone | ${parsedResume.phone || "Not detected"} |
| LinkedIn | ${parsedResume.linkedin || "Not detected"} |
| GitHub | ${parsedResume.github || "Not detected"} |
| Target Role | ${toTitleCase(targetRoles[0])} |

### ATS Score: ${ats.total}/100

| Category | Score |
| --- | ---: |
| Structure | ${ats.breakdown.structure}/20 |
| Education | ${ats.breakdown.education}/10 |
| Technical Skills | ${ats.breakdown.technicalSkills}/20 |
| Projects | ${ats.breakdown.projects}/20 |
| Experience / Internships | ${ats.breakdown.experience}/10 |
| Achievements & Certifications | ${ats.breakdown.achievements}/10 |
| Keywords & ATS Formatting | ${ats.breakdown.keywords}/10 |
| **Total** | **${ats.total}/100** |

### Extracted Skills

${parsedResume.skills.map((skill) => `- ${skill}`).join("\n") || "- No clear technical skills detected."}

### Skill Gap Report - ${toTitleCase(skillGap.targetRole)}

| Area | Details |
| --- | --- |
| Required Skills | ${skillGap.requiredSkills.join(", ")} |
| Resume Skills Matched | ${skillGap.matchedSkills.join(", ") || "None detected"} |
| Missing Skills | ${skillGap.missingSkills.join(", ") || "No major missing skill detected"} |

### Missing Skills Priority

${skillGap.priority.map((item) => `${item.rank}. ${item.skill}`).join("\n") || "No priority gaps found."}

### Placement Readiness Score: ${placementReadinessScore}/100

### 30-60-90 Day Learning Roadmap

${formatRoadmap(skillGap, skillGap.targetRole, { parsedResume, atsScore: ats, placementReadinessScore })}

### Improvement Suggestions

- Add measurable outcomes to projects, such as users, accuracy, performance, or time saved.
- Keep standard ATS headings: Education, Experience, Projects, Technical Skills, Certifications, Leadership & Volunteering.
- Add missing role keywords naturally in projects and skills.
- Strengthen GitHub/LinkedIn visibility if links are missing.
- Prepare interview topics based on missing skills and project explanations.`;
}

function formatRoadmap(gap, role, resumeContext) {
  const missing = gap.missingSkills;
  return `**30 Days**
- Learn fundamentals of ${missing.slice(0, 2).join(" and ") || "core interview topics"}.
- Update resume keywords and strengthen project descriptions.
- Solve role-specific interview questions three times per week.

**60 Days**
- Build one ${toTitleCase(role)} project using ${missing.slice(0, 3).join(", ") || "your target stack"}.
- Add project outcomes and GitHub documentation.
- Complete one role-relevant certification or course.

**90 Days**
- Complete mock interviews and company-wise preparation.
- Apply to current-fit companies and track outcomes.
- Target higher-fit companies after closing gaps: ${missing.join(", ") || "continue improving portfolio depth"}.`;
}

function normalizeText(text) {
  return String(text || "").replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function toTitleCase(value = "") {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}
