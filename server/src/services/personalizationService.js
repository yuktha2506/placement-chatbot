const profileFields = [
  ["name", "Name"],
  ["degree", "Degree / Program"],
  ["branch", "Branch / Specialization"],
  ["cgpa", "Current CGPA"],
  ["graduationYear", "Graduation Year"],
  ["preferredRoles", "Preferred Role(s)"],
  ["technicalSkills", "Technical Skills"],
  ["certifications", "Certifications"],
  ["projects", "Projects"],
  ["internshipExperience", "Internship Experience"],
  ["codingPlatforms", "Coding Platforms"],
  ["problemSolvingLevel", "Problem Solving Level"],
  ["preferredCompanies", "Preferred Companies"]
];

const resumeFields = [
  "Personal Details",
  "Education",
  "Skills",
  "Projects",
  "Internships",
  "Certifications",
  "Achievements",
  "Leadership Experience",
  "Links (GitHub, LinkedIn)"
];

const roleExpectations = {
  "software engineer": {
    skills: ["DSA", "OOPs", "DBMS", "OS", "CN", "Git", "REST APIs"],
    tools: ["GitHub", "VS Code", "Postman", "Linux basics"],
    projects: ["Full-stack app", "API-based project", "Database-backed project"],
    certifications: ["Cloud fundamentals", "Java/Python programming", "SQL"],
    interviews: ["DSA", "OOPs", "DBMS", "OS", "Project explanation"],
    companies: ["TCS", "Infosys", "Wipro", "Accenture", "Cognizant", "Zoho"]
  },
  "data analyst": {
    skills: ["SQL", "Excel", "Python", "Statistics", "Data visualization"],
    tools: ["Power BI", "Tableau", "Pandas", "Jupyter"],
    projects: ["Dashboard project", "EDA project", "Business insights case study"],
    certifications: ["Google Data Analytics", "Microsoft Power BI", "SQL certification"],
    interviews: ["SQL queries", "Excel cases", "Statistics basics", "Dashboard explanation"],
    companies: ["Accenture", "Deloitte", "TCS", "Infosys", "Mu Sigma", "Fractal"]
  },
  "data scientist": {
    skills: ["Python", "Statistics", "Machine Learning", "SQL", "EDA"],
    tools: ["Scikit-learn", "Pandas", "NumPy", "Jupyter", "Matplotlib"],
    projects: ["ML prediction project", "NLP/CV project", "End-to-end model deployment"],
    certifications: ["Machine Learning", "Deep Learning", "Data Science specialization"],
    interviews: ["Statistics", "ML algorithms", "Python", "Project deployment"],
    companies: ["Fractal", "Tiger Analytics", "ZS", "Accenture", "Deloitte"]
  },
  "data engineer": {
    skills: ["SQL", "Python", "ETL", "Data modeling", "Cloud basics"],
    tools: ["Spark", "Airflow", "Kafka", "AWS/Azure/GCP", "Docker"],
    projects: ["ETL pipeline", "Data warehouse model", "Streaming data pipeline"],
    certifications: ["AWS Cloud Practitioner", "Azure Data Fundamentals", "Databricks basics"],
    interviews: ["SQL", "Pipelines", "Data modeling", "Cloud storage"],
    companies: ["Accenture", "Cognizant", "Deloitte", "Amazon", "TCS"]
  },
  "ai/ml engineer": {
    skills: ["Python", "Machine Learning", "Deep Learning", "MLOps basics", "DSA"],
    tools: ["TensorFlow/PyTorch", "Scikit-learn", "Docker", "FastAPI", "MLflow"],
    projects: ["Model deployment", "NLP project", "Computer vision project"],
    certifications: ["Machine Learning", "Deep Learning", "Cloud ML fundamentals"],
    interviews: ["ML algorithms", "Model evaluation", "Python", "Deployment"],
    companies: ["Microsoft", "Amazon", "Adobe", "Fractal", "TCS AI"]
  },
  "full stack developer": {
    skills: ["HTML", "CSS", "JavaScript", "React", "Node.js", "SQL/NoSQL", "REST APIs"],
    tools: ["Git", "Postman", "Docker basics", "Vercel/Netlify"],
    projects: ["MERN app", "Auth-based dashboard", "Payment/API integration"],
    certifications: ["Full-stack development", "JavaScript", "Cloud basics"],
    interviews: ["JavaScript", "React", "Node.js", "Databases", "Projects"],
    companies: ["Zoho", "Freshworks", "Accenture", "Cognizant", "Startups"]
  },
  "backend developer": {
    skills: ["Node.js/Java/Python", "APIs", "Databases", "Authentication", "System design basics"],
    tools: ["Postman", "Docker", "Git", "Linux", "Redis basics"],
    projects: ["REST API", "Auth service", "Database-heavy app"],
    certifications: ["Backend development", "SQL", "Cloud fundamentals"],
    interviews: ["APIs", "DBMS", "OOPs", "System design basics"],
    companies: ["Amazon", "Zoho", "Oracle", "Accenture", "TCS Digital"]
  },
  "frontend developer": {
    skills: ["HTML", "CSS", "JavaScript", "React", "Responsive UI", "Accessibility"],
    tools: ["Git", "Figma basics", "Vite", "Chrome DevTools"],
    projects: ["Responsive dashboard", "Portfolio", "API-integrated web app"],
    certifications: ["React", "JavaScript", "Web accessibility"],
    interviews: ["JavaScript", "React", "CSS layout", "Browser basics"],
    companies: ["Zoho", "Freshworks", "Atlassian", "Accenture", "Startups"]
  },
  "cloud engineer": {
    skills: ["Linux", "Networking", "Cloud fundamentals", "Scripting", "Security basics"],
    tools: ["AWS/Azure/GCP", "Docker", "Terraform basics", "Git"],
    projects: ["Cloud deployment", "CI/CD pipeline", "Monitoring setup"],
    certifications: ["AWS Cloud Practitioner", "Azure Fundamentals", "Google Cloud Digital Leader"],
    interviews: ["Networking", "Linux", "Cloud services", "Security basics"],
    companies: ["Accenture", "TCS", "HCLTech", "Amazon", "Microsoft"]
  },
  "devops engineer": {
    skills: ["Linux", "CI/CD", "Docker", "Cloud", "Scripting", "Monitoring"],
    tools: ["Jenkins/GitHub Actions", "Docker", "Kubernetes basics", "Terraform", "Prometheus"],
    projects: ["CI/CD pipeline", "Containerized app deployment", "Infrastructure automation"],
    certifications: ["AWS/Azure fundamentals", "Docker", "Kubernetes basics"],
    interviews: ["Linux", "CI/CD", "Containers", "Cloud deployment"],
    companies: ["Accenture", "HCLTech", "TCS", "Cognizant", "Cloud startups"]
  }
};

const aliases = {
  "sde": "software engineer",
  "software developer": "software engineer",
  "fullstack developer": "full stack developer",
  "machine learning engineer": "ai/ml engineer",
  "ml engineer": "ai/ml engineer"
};

export function getPersonalizedAnswer({ query, history = [] }) {
  const transcript = [...history.map((message) => message.content), query].join("\n\n");

  if (isResumeUpload(query)) {
    return analyzeResume(extractUploadedResume(query));
  }

  if (isResumeGenerationIntent(query)) {
    const profile = extractProfile(transcript);
    if (!hasResumeGenerationData(profile, transcript)) {
      return resumeCollectionPrompt();
    }

    return generateAtsResume(profile, transcript);
  }

  if (isPlacementGuidanceIntent(query) || shouldAnalyzeProfile(transcript)) {
    const profile = extractProfile(transcript);
    const missing = missingProfileFields(profile);

    if (missing.length > 0) {
      return profileCollectionPrompt(missing);
    }

    return buildPlacementAnalysis(profile);
  }

  const profile = extractProfile(transcript);
  if (Object.keys(profile).length >= 4 && isCareerQuestion(query)) {
    return contextualCareerAnswer(query, profile);
  }

  return null;
}

export function extractProfile(text) {
  const profile = {};
  const normalized = text.replace(/\r/g, "");

  for (const [key, label] of profileFields) {
    const value = findLabeledValue(normalized, label) || findLabeledValue(normalized, key);
    if (value) profile[key] = value;
  }

  if (!profile.preferredRoles) {
    const roleMatch = normalized.match(/(?:role|target role|preferred role|job role)\s*(?:is|:|-)?\s*([^\n.]+)/i);
    if (roleMatch) profile.preferredRoles = roleMatch[1].trim();
  }

  if (!profile.technicalSkills) {
    const skillMatch = normalized.match(/(?:skills|technical skills)\s*(?:are|:|-)?\s*([^\n.]+)/i);
    if (skillMatch) profile.technicalSkills = skillMatch[1].trim();
  }

  return profile;
}

function findLabeledValue(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s*\/\s*/g, "\\s*(?:/|or)\\s*");
  const regex = new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?${escaped}\\s*[:\\-]\\s*(.+)`, "i");
  const match = text.match(regex);
  return match?.[1]?.trim();
}

function missingProfileFields(profile) {
  return profileFields
    .filter(([key]) => !profile[key])
    .map(([, label]) => label);
}

function profileCollectionPrompt(missing) {
  return `## Personalized Placement Guidance

I can create a skill gap analysis and placement roadmap for you. Please share the following details in one message:

${profileFields.map(([, label]) => `- ${label}:`).join("\n")}

## Missing Details

${missing.map((field) => `- ${field}`).join("\n")}

## Example Format

Name: Rahul Sharma  
Degree / Program: B.Tech  
Branch / Specialization: Computer Science  
Current CGPA: 8.1  
Graduation Year: 2026  
Preferred Role(s): Full Stack Developer  
Technical Skills: JavaScript, React, Node.js, SQL  
Certifications: AWS Cloud Practitioner  
Projects: Placement chatbot, ecommerce web app  
Internship Experience: 2-month web development internship  
Coding Platforms: LeetCode 150 problems  
Problem Solving Level: Intermediate  
Preferred Companies: Zoho, TCS Digital, Accenture`;
}

function buildPlacementAnalysis(profile) {
  const role = resolveRole(profile.preferredRoles);
  const expectations = roleExpectations[role] || roleExpectations["software engineer"];
  const candidateSkills = splitValues(profile.technicalSkills);
  const candidateCertifications = splitValues(profile.certifications);
  const candidateProjects = splitValues(profile.projects);
  const internships = normalize(profile.internshipExperience);
  const problemSolving = normalize(profile.problemSolvingLevel);

  const missingSkills = missingItems(expectations.skills, candidateSkills);
  const missingTools = missingItems(expectations.tools, candidateSkills);
  const missingCertifications = missingItems(expectations.certifications, candidateCertifications);
  const missingProjects = expectations.projects.filter((project) => !containsAny(candidateProjects.join(" "), project.split(" ")));
  const missingInterviewAreas = expectations.interviews.filter((area) => !containsAny(`${profile.technicalSkills} ${profile.projects}`, area.split(" ")));
  const missingCoding = codingGaps(profile.codingPlatforms, problemSolving);
  const score = readinessScore({
    skills: candidateSkills,
    missingSkills,
    projects: candidateProjects,
    internships,
    certifications: candidateCertifications,
    problemSolving,
    resumeQuality: 65
  });

  return `## Personalized Skill Gap Analysis - ${profile.name}

**Target Role:** ${toTitleCase(role)}  
**Degree:** ${profile.degree}, ${profile.branch}  
**CGPA:** ${profile.cgpa}  
**Graduation Year:** ${profile.graduationYear}

## Strengths

${strengths(profile, expectations).map((item) => `- ${item}`).join("\n")}

## Skill Gaps

| Area | Missing / Needs Improvement |
| --- | --- |
| Technical Skills | ${listInline(missingSkills)} |
| Tools / Technologies | ${listInline(missingTools)} |
| Projects | ${listInline(missingProjects)} |
| Certifications | ${listInline(missingCertifications)} |
| Interview Preparation | ${listInline(missingInterviewAreas)} |
| Coding Skills | ${listInline(missingCoding)} |

## Placement Readiness Score

| Factor | Score |
| --- | ---: |
| Skills | ${score.breakdown.skills}/25 |
| Projects | ${score.breakdown.projects}/20 |
| Internships | ${score.breakdown.internships}/15 |
| Certifications | ${score.breakdown.certifications}/10 |
| Problem Solving | ${score.breakdown.problemSolving}/20 |
| Resume Quality | ${score.breakdown.resumeQuality}/10 |
| **Total** | **${score.total}/100** |

## Personalized Roadmap

### Immediate Improvements (1-2 Weeks)

- Revise ${expectations.interviews.slice(0, 3).join(", ")}.
- Update resume with measurable project outcomes and role-specific keywords.
- Solve 20-30 targeted coding problems for ${toTitleCase(role)} interviews.

### Short-Term Plan (1-2 Months)

- Build or improve one project: ${expectations.projects[0]}.
- Learn missing tools: ${listInline(missingTools.slice(0, 3))}.
- Practice mock interviews and explain each project in 2 minutes.

### Medium-Term Plan (3-6 Months)

- Complete a stronger portfolio project: ${expectations.projects[1] || expectations.projects[0]}.
- Apply to internships or entry-level roles aligned with ${toTitleCase(role)}.
- Prepare company-wise aptitude, technical, and HR rounds.

## Recommended Certifications

${expectations.certifications.map((item) => `- ${item}`).join("\n")}

## Recommended Projects

${expectations.projects.map((item) => `- ${item}`).join("\n")}

## Interview Preparation Strategy

${expectations.interviews.map((item) => `- ${item}`).join("\n")}

## Suitable Companies

**Current Profile:** ${currentFitCompanies(score.total, expectations.companies).join(", ")}  
**After Improvement:** ${improvedFitCompanies(role).join(", ")}

## Summary

Your current placement readiness is **${score.total}/100**. Focus first on the highest-impact gaps: ${listInline([...missingSkills, ...missingProjects].slice(0, 4))}.`;
}

function resumeCollectionPrompt() {
  return `## ATS-Friendly Resume Generation

Please share your resume details in this structure, and I will generate an ATS-friendly resume matching the required template:

${resumeFields.map((field) => `- ${field}:`).join("\n")}

## Required Resume Structure

1. Header - Name, LinkedIn, Email, Phone, GitHub
2. Education
3. Experience
4. Projects
5. Technical Skills - Languages, Frameworks, Databases, Tools, Platforms, Concepts
6. Certifications
7. Leadership & Volunteering`;
}

function generateAtsResume(profile, transcript) {
  const name = profile.name || findLabeledValue(transcript, "Name") || "Candidate Name";
  const email = findEmail(transcript) || "email@example.com";
  const phone = findPhone(transcript) || "+91 XXXXX XXXXX";
  const linkedin = findLink(transcript, "linkedin") || "LinkedIn URL";
  const github = findLink(transcript, "github") || "GitHub URL";
  const role = resolveRole(profile.preferredRoles || "software engineer");
  const expectations = roleExpectations[role] || roleExpectations["software engineer"];

  return `## ATS-Friendly Resume - ${name}

**${name}**  
LinkedIn: ${linkedin} | Email: ${email} | Phone: ${phone} | GitHub: ${github}

## Education

- ${profile.degree || "Degree / Program"}, ${profile.branch || "Branch / Specialization"}  
  CGPA: ${profile.cgpa || "Add CGPA"} | Graduation Year: ${profile.graduationYear || "Add Year"}

## Experience

${formatExperience(profile.internshipExperience)}

## Projects

${formatProjects(profile.projects, role)}

## Technical Skills

- **Languages:** ${pickKnownSkills(profile.technicalSkills, ["Java", "Python", "C", "C++", "JavaScript", "SQL"]).join(", ") || "Add programming languages"}
- **Frameworks:** ${pickKnownSkills(profile.technicalSkills, ["React", "Node.js", "Express", "Django", "Spring", "TensorFlow", "PyTorch"]).join(", ") || "Add frameworks"}
- **Databases:** ${pickKnownSkills(profile.technicalSkills, ["MySQL", "MongoDB", "PostgreSQL", "Firebase"]).join(", ") || "Add databases"}
- **Tools:** ${pickKnownSkills(profile.technicalSkills, ["Git", "GitHub", "Docker", "Postman", "Power BI", "Tableau"]).join(", ") || expectations.tools.slice(0, 4).join(", ")}
- **Platforms:** ${pickKnownSkills(profile.technicalSkills, ["AWS", "Azure", "GCP", "Linux", "Vercel", "Netlify"]).join(", ") || "Add platforms"}
- **Concepts:** ${expectations.skills.join(", ")}

## Certifications

${formatList(profile.certifications, "Add role-relevant certifications with issuer and completion year.")}

## Leadership & Volunteering

- Add leadership, club, event, mentoring, volunteering, or team coordination experience with measurable impact.

## ATS Optimization Notes

- Keywords included for ${toTitleCase(role)}: ${expectations.skills.join(", ")}.
- Keep this resume to one page if you are a fresher.
- Quantify project outcomes using metrics such as users, accuracy, latency, performance, or team size.`;
}

function analyzeResume(resumeText) {
  const profile = extractProfile(resumeText);
  const role = resolveRole(profile.preferredRoles || inferRoleFromResume(resumeText));
  const expectations = roleExpectations[role] || roleExpectations["software engineer"];
  const text = resumeText.toLowerCase();
  const foundSkills = expectations.skills.filter((skill) => text.includes(skill.toLowerCase()));
  const missingSkills = expectations.skills.filter((skill) => !text.includes(skill.toLowerCase()));
  const hasProjects = /project/i.test(resumeText);
  const hasInternship = /intern|experience/i.test(resumeText);
  const hasCertifications = /certification|certificate/i.test(resumeText);
  const hasLinks = /github|linkedin/i.test(resumeText);
  const atsScore = Math.min(100, 35 + foundSkills.length * 6 + (hasProjects ? 15 : 0) + (hasInternship ? 12 : 0) + (hasCertifications ? 8 : 0) + (hasLinks ? 6 : 0));
  const readiness = Math.min(100, atsScore - 5 + (hasInternship ? 5 : 0));

  return `## Resume-Based Placement Analysis

**Detected Target Role:** ${toTitleCase(role)}

## Extracted Profile Signals

| Area | Observation |
| --- | --- |
| Skills Found | ${listInline(foundSkills)} |
| Projects | ${hasProjects ? "Present" : "Not clearly visible"} |
| Internship / Experience | ${hasInternship ? "Present" : "Not clearly visible"} |
| Certifications | ${hasCertifications ? "Present" : "Not clearly visible"} |
| GitHub / LinkedIn Links | ${hasLinks ? "Present" : "Missing or not visible"} |

## Scores

| Score Type | Score |
| --- | ---: |
| Resume Score | ${Math.max(0, atsScore - 8)}/100 |
| ATS Score | ${atsScore}/100 |
| Placement Readiness Score | ${readiness}/100 |

## Missing Skills

${missingSkills.map((skill) => `- ${skill}`).join("\n") || "- No major role-specific skill gap detected from the resume text."}

## Weak Sections / ATS Issues

${[
  !hasLinks && "Add GitHub and LinkedIn links in the header.",
  !hasProjects && "Add 2-3 strong projects with tech stack, features, and measurable outcomes.",
  !hasInternship && "Add internship, freelance, open-source, or practical experience if available.",
  !hasCertifications && "Add relevant certifications for the target role.",
  "Use standard headings: Education, Experience, Projects, Technical Skills, Certifications, Leadership & Volunteering.",
  "Use action verbs and quantify impact wherever possible."
].filter(Boolean).map((item) => `- ${item}`).join("\n")}

## Skill Gap Analysis

| Gap Area | Recommendation |
| --- | --- |
| Technical Skills | Learn or highlight ${listInline(missingSkills.slice(0, 5))}. |
| Projects | Add ${expectations.projects[0]} and explain business impact. |
| Tools | Include ${expectations.tools.slice(0, 4).join(", ")} if you know them. |
| Interview Prep | Prepare ${expectations.interviews.join(", ")}. |

## Personalized Placement Roadmap

### Immediate Improvements (1-2 Weeks)

- Rewrite project bullets using action verbs and metrics.
- Add missing links, keywords, and standard ATS headings.
- Practice explaining each project clearly.

### Short-Term Plan (1-2 Months)

- Build one role-specific project: ${expectations.projects[0]}.
- Practice 50 targeted interview questions for ${toTitleCase(role)}.
- Add one certification: ${expectations.certifications[0]}.

### Medium-Term Plan (3-6 Months)

- Apply to current-fit companies while improving portfolio depth.
- Complete mock interviews and role-specific coding practice.
- Target improved-fit companies after closing the listed gaps.`;
}

function contextualCareerAnswer(query, profile) {
  const role = resolveRole(profile.preferredRoles || query);
  const expectations = roleExpectations[role] || roleExpectations["software engineer"];
  return `## Personalized Recommendation for ${profile.name || "Your Profile"}

Based on your saved profile and target role **${toTitleCase(role)}**, prioritize these areas:

| Area | Recommendation |
| --- | --- |
| Skills | ${expectations.skills.join(", ")} |
| Tools | ${expectations.tools.join(", ")} |
| Projects | ${expectations.projects.join(", ")} |
| Interview Focus | ${expectations.interviews.join(", ")} |

## Next Step

Share updated project, resume, or coding-platform details and I can recalculate your placement readiness score.`;
}

function isPlacementGuidanceIntent(query) {
  return /placement guidance|guide me|career guidance|placement roadmap|skill gap|readiness score|analyze my profile/i.test(query);
}

function isResumeGenerationIntent(query) {
  return /generate.*resume|create.*resume|ats.*resume|make.*resume/i.test(query);
}

function isResumeUpload(query) {
  return /uploaded resume content|resume uploaded|analyze my resume|resume content/i.test(query) && query.length > 250;
}

function isCareerQuestion(query) {
  return /company|role|career|placement|roadmap|skill|interview|resume|internship|prepare/i.test(query);
}

function shouldAnalyzeProfile(transcript) {
  const profile = extractProfile(transcript);
  return Object.keys(profile).length >= 10;
}

function hasResumeGenerationData(profile, transcript) {
  return Boolean(
    profile.name &&
    (profile.degree || /education/i.test(transcript)) &&
    (profile.technicalSkills || /skills/i.test(transcript)) &&
    (profile.projects || /projects/i.test(transcript))
  );
}

function resolveRole(value = "") {
  const normalized = value.toLowerCase();
  for (const [alias, role] of Object.entries(aliases)) {
    if (normalized.includes(alias)) return role;
  }
  return Object.keys(roleExpectations).find((role) => normalized.includes(role)) || "software engineer";
}

function splitValues(value = "") {
  return value
    .split(/,|\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalize(value = "") {
  return String(value || "").toLowerCase();
}

function missingItems(expected, actual) {
  const actualText = actual.join(" ").toLowerCase();
  return expected.filter((item) => !actualText.includes(item.toLowerCase()));
}

function containsAny(text, terms) {
  const normalized = text.toLowerCase();
  return terms.some((term) => term.length > 2 && normalized.includes(term.toLowerCase()));
}

function codingGaps(platforms = "", level = "") {
  const gaps = [];
  const combined = `${platforms} ${level}`.toLowerCase();
  if (!/leetcode|hackerrank|codechef|codeforces|gfg/.test(combined)) gaps.push("Add a coding platform profile");
  if (!/intermediate|advanced|200|300|400|500/.test(combined)) gaps.push("Reach intermediate DSA problem-solving level");
  if (!/dynamic programming|graph|tree/.test(combined)) gaps.push("Practice trees, graphs, and dynamic programming");
  return gaps;
}

function readinessScore({ skills, missingSkills, projects, internships, certifications, problemSolving, resumeQuality }) {
  const breakdown = {
    skills: Math.max(5, Math.min(25, 25 - missingSkills.length * 3)),
    projects: Math.min(20, projects.length * 7),
    internships: /none|no|na|not/.test(internships) ? 3 : 15,
    certifications: Math.min(10, certifications.length * 4),
    problemSolving: /advanced/.test(problemSolving) ? 20 : /intermediate/.test(problemSolving) ? 14 : /beginner/.test(problemSolving) ? 8 : skills.length > 5 ? 10 : 5,
    resumeQuality: Math.round(resumeQuality / 10)
  };
  return {
    breakdown,
    total: Object.values(breakdown).reduce((sum, score) => sum + score, 0)
  };
}

function strengths(profile, expectations) {
  const candidateText = `${profile.technicalSkills} ${profile.projects} ${profile.certifications} ${profile.internshipExperience}`.toLowerCase();
  const matched = [...expectations.skills, ...expectations.tools].filter((item) => candidateText.includes(item.toLowerCase()));
  const items = [];
  if (profile.cgpa) items.push(`Academic profile available with CGPA ${profile.cgpa}.`);
  if (profile.projects) items.push("Project experience is available and can be positioned strongly.");
  if (profile.internshipExperience && !/none|no|na|not/i.test(profile.internshipExperience)) items.push("Internship or practical exposure is available.");
  if (matched.length) items.push(`Relevant role skills found: ${matched.slice(0, 6).join(", ")}.`);
  return items.length ? items : ["Profile details are available for role-specific planning."];
}

function listInline(items) {
  return items?.length ? items.join(", ") : "No major gap detected";
}

function currentFitCompanies(score, companies) {
  return score >= 70 ? companies.slice(0, 5) : companies.slice(0, 4);
}

function improvedFitCompanies(role) {
  const productCompanies = ["Google", "Microsoft", "Amazon", "Adobe", "Oracle", "Salesforce", "Atlassian"];
  const roleCompanies = roleExpectations[role]?.companies || [];
  return [...new Set([...roleCompanies, ...productCompanies])].slice(0, 7);
}

function extractUploadedResume(query) {
  return query.replace(/^.*?uploaded resume content\s*[:\-]/is, "").trim();
}

function inferRoleFromResume(text) {
  const normalized = text.toLowerCase();
  return Object.keys(roleExpectations).find((role) => normalized.includes(role)) || "software engineer";
}

function findEmail(text) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
}

function findPhone(text) {
  return text.match(/(?:\+91[\s-]?)?[6-9]\d{9}/)?.[0];
}

function findLink(text, key) {
  return text.match(new RegExp(`https?://[^\\s]*${key}[^\\s]*`, "i"))?.[0];
}

function formatExperience(value = "") {
  if (!value || /none|no|na|not/i.test(value)) {
    return "- Add internship, freelance, open-source, or academic team experience relevant to the target role.";
  }
  return `- ${value}`;
}

function formatProjects(value = "", role) {
  const projects = splitValues(value);
  if (!projects.length) {
    return roleExpectations[role].projects.map((project) => `- ${project}: Build and document a role-specific implementation with measurable outcomes.`).join("\n");
  }
  return projects.map((project) => `- ${project}: Developed using relevant technologies; add measurable impact, features, and GitHub link.`).join("\n");
}

function formatList(value, fallback) {
  const items = splitValues(value);
  return items.length ? items.map((item) => `- ${item}`).join("\n") : `- ${fallback}`;
}

function pickKnownSkills(value = "", known = []) {
  const text = value.toLowerCase();
  return known.filter((skill) => text.includes(skill.toLowerCase()));
}

function toTitleCase(value) {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}
