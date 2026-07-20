const roleBlueprints = {
  "Software Engineer": {
    topics: ["DSA", "OOP", "DBMS", "Operating Systems", "APIs", "Debugging", "System Design", "Testing", "Performance", "Security"],
    keywords: ["algorithm", "complexity", "class", "index", "transaction", "thread", "api", "test", "edge case", "scalable"]
  },
  "Frontend Developer": {
    topics: ["HTML", "CSS", "JavaScript", "TypeScript", "React", "DOM", "Browser Rendering", "Performance", "APIs", "Responsive Design", "Accessibility", "Debugging", "Frontend System Design"],
    keywords: ["semantic", "css", "javascript", "typescript", "react", "hooks", "dom", "render", "memo", "accessibility", "api", "responsive"]
  },
  "Backend Developer": {
    topics: ["Node.js", "Express", "REST APIs", "Authentication", "Databases", "SQL", "MongoDB", "Security", "Caching", "Performance", "Microservices", "Error Handling"],
    keywords: ["node", "express", "rest", "jwt", "auth", "sql", "index", "mongodb", "cache", "security", "microservice"]
  },
  "Full Stack Developer": {
    topics: ["React", "Node.js", "API Integration", "Databases", "Authentication", "State Management", "Deployment", "Testing", "Performance", "System Design"],
    keywords: ["react", "node", "api", "database", "auth", "state", "deploy", "test", "performance", "scalable"]
  },
  "AI Engineer": {
    topics: ["Python", "NumPy", "Pandas", "Machine Learning", "Deep Learning", "Transformers", "LLMs", "Prompt Engineering", "Vector Databases", "RAG", "Model Evaluation", "Deployment"],
    keywords: ["python", "numpy", "pandas", "model", "training", "inference", "transformer", "embedding", "rag", "evaluation", "deployment"]
  },
  "ML Engineer": {
    topics: ["Python", "Feature Engineering", "Supervised Learning", "Unsupervised Learning", "Deep Learning", "Model Validation", "Metrics", "MLOps", "Deployment", "Monitoring"],
    keywords: ["python", "feature", "model", "validation", "precision", "recall", "overfitting", "pipeline", "mlops", "monitoring"]
  },
  "Data Analyst": {
    topics: ["SQL", "Statistics", "Excel", "Dashboards", "Data Cleaning", "Visualization", "Business Metrics", "Hypothesis Testing", "Communication", "Insights"],
    keywords: ["sql", "join", "aggregate", "statistics", "dashboard", "cleaning", "metric", "visualization", "insight"]
  },
  "QA Engineer": {
    topics: ["Test Cases", "Automation", "Regression Testing", "Bug Reporting", "API Testing", "Selenium", "Performance Testing", "Quality Strategy", "Edge Cases", "CI/CD"],
    keywords: ["test", "automation", "regression", "bug", "api", "selenium", "edge case", "quality", "ci"]
  },
  "Product Manager": {
    topics: ["User Research", "Prioritization", "Roadmaps", "Metrics", "Stakeholders", "Experimentation", "PRDs", "Launch Planning", "Trade-offs", "Product Strategy"],
    keywords: ["user", "metric", "priority", "roadmap", "stakeholder", "experiment", "trade-off", "impact", "requirement"]
  }
};

const coveragePlan = [
  "Introduction",
  "Basic role foundation",
  "Practical implementation",
  "Scenario",
  "Debugging",
  "Best practices",
  "Optimization",
  "Advanced concept",
  "Real-world application",
  "Trade-offs",
  "Ownership and reflection"
];

const durationCounts = { 10: 5, 20: 8, 30: 10 };

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function questionSimilarity(a, b) {
  const left = new Set(normalize(a).split(" ").filter(word => word.length > 3));
  const right = new Set(normalize(b).split(" ").filter(word => word.length > 3));
  if (!left.size || !right.size) return 0;
  const overlap = [...left].filter(word => right.has(word)).length;
  return overlap / Math.min(left.size, right.size);
}

function expectedKeywordsFor(blueprint, topic) {
  const topicWords = normalize(topic).split(" ").filter(Boolean);
  return [...new Set([...topicWords, ...blueprint.keywords])].slice(0, 8);
}

function questionTypeFor(category, role) {
  if (category === "Introduction") return "HR";
  if (category === "Basic role foundation") return "Technical";
  if (category === "Ownership and reflection") return "Behavioral";
  if (category === "Scenario" || category === "Real-world application") return "Scenario-based";
  if (["Optimization", "Trade-offs", "Debugging"].includes(category)) return "Problem-solving";
  if (!["Product Manager", "QA Engineer", "Data Analyst"].includes(role) && ["Practical implementation", "Advanced concept"].includes(category)) return "Coding";
  return "Technical";
}

function promptFor({ role, difficulty, topic, category, type }) {
  const advanced = difficulty === "Advanced";
  const intermediate = difficulty === "Intermediate";
  const depth = advanced ? "include architectural trade-offs and failure modes" : intermediate ? "include implementation details and trade-offs" : "keep the explanation clear and practical";

  const templates = {
    Introduction: `Tell me about yourself, your background, your key skills, and why you are interested in the ${role} role.`,
    "Basic role foundation": `Let's start with a basic question: what is ${topic}, and why is it important for a ${role}?`,
    Fundamentals: `Explain ${topic} for a ${role} role and mention where you have used it. ${depth}.`,
    "Practical implementation": type === "Coding"
      ? `Write or describe an implementation involving ${topic}. Include logic, edge cases, time complexity, and space complexity.`
      : `How would you implement ${topic} in a real ${role} project? ${depth}.`,
    Scenario: `A project using ${topic} fails in production. How would you investigate, fix, and prevent it from happening again?`,
    Debugging: `How would you debug an issue related to ${topic}? Walk me through the exact steps and tools you would use.`,
    "Best practices": `What best practices do you follow for ${topic}, and why do they matter in a team environment?`,
    Optimization: `How would you optimize ${topic} for performance, reliability, or maintainability? Discuss trade-offs.`,
    "Advanced concept": type === "Coding"
      ? `Solve a ${topic}-based coding/design problem at ${difficulty} level. Explain correctness, complexity, and edge cases.`
      : `Explain an advanced concept in ${topic} and how you would apply it in production.`,
    "Real-world application": `Describe a real-world use case for ${topic}. What decisions would you make and how would you measure success?`,
    "Trade-offs": `Compare two approaches for handling ${topic}. Which would you choose and why?`,
    "Ownership and reflection": `Tell me about a time you improved or learned ${topic}. What was your impact and what would you do differently?`
  };

  return templates[category];
}

export function buildQuestionPlan({ role, difficulty, duration }) {
  const blueprint = roleBlueprints[role] || roleBlueprints["Software Engineer"];
  const count = durationCounts[duration] || 5;
  const asked = [];
  const usedTopics = new Set();

  return coveragePlan.slice(0, count).map((category, index) => {
    const topic = blueprint.topics.find(item => !usedTopics.has(item)) || blueprint.topics[index % blueprint.topics.length];
    usedTopics.add(topic);
    const type = questionTypeFor(category, role);
    let prompt = promptFor({ role, difficulty, topic, category, type });

    if (asked.some(previous => questionSimilarity(previous, prompt) >= 0.62)) {
      const fallbackTopic = blueprint.topics.find(item => !prompt.includes(item)) || `${topic} in production`;
      prompt = promptFor({ role, difficulty, topic: fallbackTopic, category: "Real-world application", type: "Scenario-based" });
    }

    asked.push(prompt);
    return {
      id: `q-${index + 1}`,
      index,
      type,
      category,
      topic,
      expectedKeywords: expectedKeywordsFor(blueprint, topic),
      prompt
    };
  });
}

export function buildFollowUpQuestion(previousQuestion, answer = "") {
  const lower = answer.toLowerCase();
  const mentionedHook = lower.match(/\b(react hooks|hooks|useeffect|usestate|usememo|usecallback|useref|uselayouteffect)\b/)?.[1];
  const mentionedApi = lower.match(/\b(rest|graphql|jwt|oauth|cache|sql|mongodb|index)\b/)?.[1];
  const mentionedMl = lower.match(/\b(model|embedding|transformer|rag|vector|training|validation)\b/)?.[1];
  const anchor = mentionedHook || mentionedApi || mentionedMl || previousQuestion.topic || "that approach";

  return {
    id: `${previousQuestion.id}-follow-up`,
    index: previousQuestion.index,
    type: "Follow-up",
    category: "Follow-up",
    topic: previousQuestion.topic,
    expectedKeywords: previousQuestion.expectedKeywords || [],
    prompt: `You mentioned ${anchor}. Why did you choose it, what alternatives did you consider, and what edge cases or trade-offs would you handle?`
  };
}
