const roleTopics = {
  "Software Engineer": ["DSA", "OOP", "DBMS", "API design", "debugging"],
  "Frontend Developer": ["React", "JavaScript", "accessibility", "state management", "performance"],
  "Backend Developer": ["REST APIs", "databases", "authentication", "scalability", "caching"],
  "Full Stack Developer": ["React", "Node.js", "databases", "system integration", "deployment"],
  "AI Engineer": ["machine learning", "model deployment", "Python", "data pipelines", "evaluation"],
  "ML Engineer": ["ML algorithms", "feature engineering", "model validation", "MLOps", "Python"],
  "Data Analyst": ["SQL", "statistics", "dashboards", "business insights", "data cleaning"],
  "QA Engineer": ["test cases", "automation", "bug reports", "regression testing", "quality strategy"],
  "Product Manager": ["prioritization", "roadmaps", "metrics", "stakeholders", "user research"]
};

const durationCounts = {
  10: 5,
  20: 8,
  30: 10
};

function codingQuestion(role, difficulty, topic) {
  if (["Product Manager", "QA Engineer", "Data Analyst"].includes(role)) {
    return {
      type: "Problem-solving",
      prompt: `Walk me through how you would solve a ${topic.toLowerCase()} problem for a real product team.`
    };
  }

  const level = difficulty === "Advanced" ? "optimized" : difficulty === "Intermediate" ? "production-ready" : "clear";
  return {
    type: "Coding",
    prompt: `Write or explain a ${level} approach for a ${topic} problem. Include logic, edge cases, and time complexity.`
  };
}

export function buildQuestionPlan({ role, difficulty, duration }) {
  const topics = roleTopics[role] || roleTopics["Software Engineer"];
  const count = durationCounts[duration] || 5;
  const base = [
    { type: "HR", prompt: `Tell me about yourself and why you are interested in the ${role} role.` },
    { type: "Technical", prompt: `Explain a core ${topics[0]} concept you have used in a project.` },
    codingQuestion(role, difficulty, topics[1] || topics[0]),
    { type: "Scenario-based", prompt: `Imagine a production issue occurs in ${topics[2] || "your module"}. How would you investigate and resolve it?` },
    { type: "Behavioral", prompt: "Describe a time you handled feedback, conflict, or pressure during a project." },
    { type: "Problem-solving", prompt: `How would you improve the performance or reliability of a system involving ${topics[3] || topics[0]}?` },
    { type: "Technical", prompt: `What are the trade-offs of using ${topics[4] || topics[0]} in a real-world application?` },
    codingQuestion(role, difficulty, topics[0]),
    { type: "Scenario-based", prompt: `You have limited time before release. How do you prioritize quality, scope, and delivery for a ${role} task?` },
    { type: "HR", prompt: "Why should we hire you for this role, and what will you improve in the next 90 days?" }
  ];

  return base.slice(0, count).map((question, index) => ({
    id: `q-${index + 1}`,
    index,
    ...question
  }));
}

export function buildFollowUpQuestion(previousQuestion) {
  return {
    id: `${previousQuestion.id}-follow-up`,
    index: previousQuestion.index,
    type: "Follow-up",
    prompt: "Can you explain more clearly with a specific example, trade-off, or reason for your approach?"
  };
}
