import { knowledgeBase } from "../data/knowledgeBase.js";
import { retrieveKnowledge } from "./ragService.js";

export function findDirectAnswer(query, intent) {
  if (intent.type !== "simple-factual") {
    return null;
  }

  const normalizedQuery = query.toLowerCase();

  // First, try exact title matching for common patterns
  for (const item of knowledgeBase) {
    const itemTitle = item.title.toLowerCase();
    const itemId = item.id.toLowerCase();

    if (normalizedQuery.includes("service") && normalizedQuery.includes("company") &&
        !normalizedQuery.includes("difference") && !normalizedQuery.includes("product")) {
      if (itemId === "service-companies") {
        return formatDirectAnswer(item);
      }
    }

    if (normalizedQuery.includes("product") && normalizedQuery.includes("company") &&
        !normalizedQuery.includes("difference") && !normalizedQuery.includes("service")) {
      if (itemId === "product-companies") {
        return formatDirectAnswer(item);
      }
    }
  }

  // Fall back to fuzzy matching
  const retrieved = retrieveKnowledge(query, 3);

  if (!retrieved.length) {
    return null;
  }

  const topResult = retrieved[0];
  // Require a high score for direct answers to avoid wrong matches
  if (topResult.score >= 8) {
    return formatDirectAnswer(topResult);
  }

  return null;
}

export function formatDirectAnswer(item) {
  return `## ${item.title}\n\n${item.content.trim()}`;
}

export function findComparisonAnswer(query) {
  const comparisonItem = knowledgeBase.find(
    item => item.id === "service-vs-product"
  );

  if (comparisonItem) {
    return formatDirectAnswer(comparisonItem);
  }

  return null;
}

