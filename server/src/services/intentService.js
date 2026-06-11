export function detectIntent(query) {
  const normalizedQuery = query.toLowerCase().trim();

  if (isSimpleFactualQuestion(normalizedQuery)) {
    return { type: "simple-factual", confidence: 0.95, shouldSkipRag: true };
  }

  if (isComparisonQuestion(normalizedQuery)) {
    return { type: "comparison", confidence: 0.85, shouldSkipRag: false };
  }

  if (isResumeWorkflowIntent(normalizedQuery)) {
    return { type: "resume-workflow", confidence: 0.9, shouldSkipRag: true };
  }

  if (isPlacementWorkflowIntent(normalizedQuery)) {
    return { type: "placement-workflow", confidence: 0.85, shouldSkipRag: true };
  }

  return { type: null, confidence: 0, shouldSkipRag: false };
}

function isSimpleFactualQuestion(query) {
  const exclude = [
    "difference between",
    "what's the difference",
    "what's my",
    "what should i",
    "what should you",
    "how should i",
    "how can i"
  ];

  const includePatterns = [
    /^what\s+is\s+/,
    /^who\s+(are|is)\s+/,
    /^what\s*'?s\s+(?!the)/,
    /^define\s+/,
    /^explain\s+(?:the\s+)?(?:concept\s+of\s+)?/,
    /^tell\s+me\s+about\s+/
  ];

  const hasExclude = exclude.some(phrase => query.includes(phrase));
  if (hasExclude) return false;

  return includePatterns.some(pattern => pattern.test(query));
}

function isComparisonQuestion(query) {
  const comparisonKeywords = [
    "difference between",
    "compare",
    " vs ",
    "versus",
    "vs.",
    "advantages vs",
    "benefits of",
    "which is better"
  ];

  const hasComparison = comparisonKeywords.some(keyword => query.includes(keyword));
  if (!hasComparison) return false;

  const serviceProductPatterns = [
    /service.*product|product.*service/i,
    /service-based.*product-based|product-based.*service-based/i
  ];

  const hasBothItems = serviceProductPatterns.some(pattern => pattern.test(query));

  return hasComparison && (hasBothItems || !isSingleItemQuestion(query));
}

function isSingleItemQuestion(query) {
  const singleItems = [
    "what is service based",
    "what is product based",
    "what is a service",
    "what is a product",
    "tell me about service",
    "tell me about product"
  ];

  return singleItems.some(item => query.includes(item));
}

function isResumeWorkflowIntent(query) {
  const resumePatterns = [
    /generate.*resume|create.*resume/i,
    /build.*resume|make.*resume/i,
    /write.*resume|draft.*resume/i,
    /analyze.*resume|review.*resume/i,
    /check.*resume|ats.*resume/i,
    /resume.*feedback|improve.*resume/i
  ];

  return resumePatterns.some(pattern => pattern.test(query));
}

function isPlacementWorkflowIntent(query) {
  const placementPatterns = [
    /placement.*guid|career.*guid|prepare.*placement/i,
    /interview.*prep|coding.*prep|dsa.*prep/i,
    /company.*recommend|which.*company|target.*role/i,
    /skill.*gap|missing.*skill|what.*should.*learn/i,
    /30.*60.*90|roadmap|learning.*path/i,
    /placement.*ready|eligib|company.*fit/i
  ];

  return placementPatterns.some(pattern => pattern.test(query));
}

export function shouldReturnDirectAnswer(intent) {
  return intent.type === "simple-factual";
}

export function shouldSkipRag(intent) {
  return intent.shouldSkipRag;
}

export function shouldProcessWithPersonalization(intent) {
  return intent.type === "placement-workflow" || intent.type === "resume-workflow";
}

export function isComparison(intent) {
  return intent.type === "comparison";
}
