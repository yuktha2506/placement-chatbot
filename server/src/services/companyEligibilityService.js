import { pool } from "../db/pool.js";
import { sampleCompanies } from "../data/companyEligibilityData.js";

const categories = ["Service-based", "Product-based", "Core", "Startup"];

const branchAliases = {
  "computer science": "CSE",
  "computer science engineering": "CSE",
  cse: "CSE",
  ise: "ISE",
  "information science": "ISE",
  it: "IT",
  "information technology": "IT",
  ece: "ECE",
  "electronics and communication": "ECE",
  eee: "EEE",
  "electrical and electronics": "EEE",
  me: "ME",
  mechanical: "ME",
  civil: "Civil"
};

function parseJson(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeCompany(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    minCgpa: Number(row.min_cgpa ?? row.minCgpa),
    eligibleBranches: parseJson(row.eligible_branches ?? row.eligibleBranches),
    maxBacklogs: Number(row.max_backlogs ?? row.maxBacklogs),
    requiredSkills: parseJson(row.required_skills ?? row.requiredSkills),
    preferredSkills: parseJson(row.preferred_skills ?? row.preferredSkills),
    role: row.role,
    notes: row.notes
  };
}

export async function getCompanyDataset() {
  try {
    const [rows] = await pool.execute("SELECT * FROM company_eligibility ORDER BY category, name");
    return rows.map(normalizeCompany);
  } catch (error) {
    if (error.code !== "ER_NO_SUCH_TABLE") {
      console.warn("[eligibility] Falling back to sample company dataset", { error: error.message });
    }
    return sampleCompanies;
  }
}

export function normalizeBranch(value = "") {
  const clean = String(value).trim();
  const key = clean.toLowerCase();
  return branchAliases[key] || clean.toUpperCase();
}

export function parseSkills(value) {
  if (Array.isArray(value)) return value.map(skill => String(skill).trim()).filter(Boolean);
  return String(value || "")
    .split(/[,;/\n]+|\band\b/i)
    .map(skill => skill.trim())
    .filter(Boolean);
}

function normalizedSet(values) {
  return new Set(values.map(value => String(value).toLowerCase().replace(/[^a-z0-9+#.]/g, "")));
}

function skillMatches(studentSkills, companySkills) {
  const student = normalizedSet(studentSkills);
  return companySkills.filter(skill => student.has(String(skill).toLowerCase().replace(/[^a-z0-9+#.]/g, "")));
}

export function validateProfile(profile) {
  const missing = [];
  if (profile.cgpa === undefined || profile.cgpa === null || profile.cgpa === "") missing.push("CGPA");
  if (!profile.branch) missing.push("Branch/Department");
  if (profile.backlogs === undefined || profile.backlogs === null || profile.backlogs === "") missing.push("Number of backlogs");
  if (!parseSkills(profile.skills).length) missing.push("Technical/Programming skills");

  const cgpa = Number(profile.cgpa);
  const backlogs = Number(profile.backlogs);
  const errors = [];
  if (!missing.includes("CGPA") && (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10)) errors.push("CGPA must be between 0 and 10.");
  if (!missing.includes("Number of backlogs") && (!Number.isInteger(backlogs) || backlogs < 0)) errors.push("Backlogs must be a non-negative whole number.");

  return { missing, errors };
}

export function evaluateCompanies(profile, companies) {
  const validation = validateProfile(profile);
  if (validation.missing.length || validation.errors.length) {
    return {
      validation,
      profile: null,
      companies: [],
      eligible: [],
      summary: { totalEligible: 0, byCategory: Object.fromEntries(categories.map(category => [category, 0])) }
    };
  }

  const normalizedProfile = {
    cgpa: Number(profile.cgpa),
    branch: normalizeBranch(profile.branch),
    backlogs: Number(profile.backlogs),
    skills: parseSkills(profile.skills),
    preferredCompanyType: profile.preferredCompanyType || profile.category || ""
  };

  const results = companies.map(company => {
    const requiredMatches = skillMatches(normalizedProfile.skills, company.requiredSkills);
    const preferredMatches = skillMatches(normalizedProfile.skills, company.preferredSkills);
    const reasons = [];
    if (normalizedProfile.cgpa < company.minCgpa) reasons.push(`CGPA ${normalizedProfile.cgpa} is below minimum ${company.minCgpa}.`);
    if (!company.eligibleBranches.map(normalizeBranch).includes(normalizedProfile.branch)) reasons.push(`${normalizedProfile.branch} is not listed as an eligible branch.`);
    if (normalizedProfile.backlogs > company.maxBacklogs) reasons.push(`${normalizedProfile.backlogs} backlog(s) exceeds allowed limit of ${company.maxBacklogs}.`);
    if (requiredMatches.length < company.requiredSkills.length) {
      const missing = company.requiredSkills.filter(skill => !requiredMatches.includes(skill));
      reasons.push(`Missing required skill area(s): ${missing.join(", ")}.`);
    }

    return {
      ...company,
      matchingSkills: [...new Set([...requiredMatches, ...preferredMatches])],
      missingRequiredSkills: company.requiredSkills.filter(skill => !requiredMatches.includes(skill)),
      eligible: reasons.length === 0,
      reasons
    };
  });

  const filtered = normalizedProfile.preferredCompanyType
    ? results.filter(company => company.category.toLowerCase() === normalizedProfile.preferredCompanyType.toLowerCase())
    : results;
  const eligible = filtered.filter(company => company.eligible);
  const byCategory = Object.fromEntries(categories.map(category => [
    category,
    eligible.filter(company => company.category === category).length
  ]));

  return {
    validation,
    profile: normalizedProfile,
    companies: filtered,
    eligible,
    summary: { totalEligible: eligible.length, byCategory }
  };
}

function formatSummary(result) {
  const parts = Object.entries(result.summary.byCategory)
    .filter(([, count]) => count > 0)
    .map(([category, count]) => `${count} ${category}`);
  return `You are eligible for ${result.summary.totalEligible} companies${parts.length ? `: ${parts.join(", ")}.` : "."}`;
}

export function formatEligibilityMarkdown(result) {
  if (result.validation.missing.length || result.validation.errors.length) {
    return `## Company Eligibility Checker\n\nI need complete placement details before claiming eligibility.\n\n${result.validation.missing.length ? `### Missing Details\n${result.validation.missing.map(item => `- ${item}`).join("\n")}\n\n` : ""}${result.validation.errors.length ? `### Invalid Details\n${result.validation.errors.map(item => `- ${item}`).join("\n")}` : ""}`;
  }

  const eligibleRows = result.eligible.slice(0, 12).map(company =>
    `| ${company.name} | ${company.category} | ${company.role} | ${company.minCgpa} | ${company.matchingSkills.join(", ") || "Criteria met"} |`
  ).join("\n");

  const ineligible = result.companies.filter(company => !company.eligible).slice(0, 6);

  return `## Company Eligibility Results\n\n> Dataset note: These are sample/demo eligibility criteria. Always verify the official campus notification.\n\n**${formatSummary(result)}**\n\n### Eligible Companies\n\n${eligibleRows ? `| Company | Category | Role | Min CGPA | Matching Skills |\n|---|---|---|---:|---|\n${eligibleRows}` : "No eligible companies matched the provided filters."}\n\n### Not Eligible / Gaps\n\n${ineligible.length ? ineligible.map(company => `- **${company.name}**: ${company.reasons.join(" ")}`).join("\n") : "- No major gaps among the filtered companies."}`;
}

export function parseEligibilityQuery(message) {
  const text = message.toLowerCase();
  if (!/(eligible|eligibility|apply|companies|company|require|requires)/i.test(message)) return null;

  const cgpa = message.match(/(\d(?:\.\d{1,2})?)\s*(?:cgpa|gpa)/i)?.[1] || message.match(/cgpa\s*(?:is|:)?\s*(\d(?:\.\d{1,2})?)/i)?.[1];
  const noBacklogs = /\b(no|zero|0)\s+backlogs?\b/i.test(message);
  const backlogs = noBacklogs ? 0 : message.match(/(\d+)\s+backlogs?/i)?.[1];
  const branch = Object.keys(branchAliases).find(alias => new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(message));
  const category = categories.find(item => text.includes(item.toLowerCase().replace("-based", "")) || text.includes(item.toLowerCase()));
  const skillMatch = message.match(/(?:know|knows|skills? are|with|require|requires)\s+([a-z0-9+#.,\s/]+?)(?:\.|\?|$)/i)?.[1];
  const companyName = message.match(/(?:why.*not eligible for|not eligible for|eligible for)\s+([a-zA-Z&.\s]+?)(?:\?|$)/i)?.[1]?.trim();

  return {
    profile: { cgpa, branch: branch ? normalizeBranch(branch) : "", backlogs, skills: skillMatch || "", preferredCompanyType: category || "" },
    companyName,
    category,
    skillQuery: /require|requires/i.test(message) ? skillMatch?.trim() : ""
  };
}

export async function answerEligibilityQuery(message) {
  const parsed = parseEligibilityQuery(message);
  if (!parsed) return null;
  const companies = await getCompanyDataset();

  if (parsed.skillQuery && !parsed.profile.cgpa) {
    const skill = parsed.skillQuery.toLowerCase();
    const matches = companies.filter(company =>
      [...company.requiredSkills, ...company.preferredSkills].some(item => item.toLowerCase().includes(skill))
    );
    return `## Companies Requiring ${parsed.skillQuery}\n\n> Dataset note: Sample/demo criteria.\n\n${matches.length ? matches.map(company => `- **${company.name}** (${company.category}) - ${company.role}; skills: ${[...company.requiredSkills, ...company.preferredSkills].join(", ")}`).join("\n") : "No companies in the sample dataset matched that skill."}`;
  }

  const result = evaluateCompanies(parsed.profile, companies);
  if (parsed.companyName && result.profile) {
    const company = result.companies.find(item => item.name.toLowerCase().includes(parsed.companyName.toLowerCase()));
    if (!company) return `## Company Eligibility\n\nI could not find **${parsed.companyName}** in the sample eligibility dataset.`;
    return `## ${company.name} Eligibility\n\n**Status:** ${company.eligible ? "Eligible" : "Not eligible"}\n\n${company.eligible ? `You meet the sample criteria for ${company.role}. Matching skills: ${company.matchingSkills.join(", ") || "criteria met"}.` : company.reasons.map(reason => `- ${reason}`).join("\n")}\n\n> Dataset note: Sample/demo criteria. Verify official campus notification.`;
  }

  return formatEligibilityMarkdown(result);
}

export { categories as companyCategories };
