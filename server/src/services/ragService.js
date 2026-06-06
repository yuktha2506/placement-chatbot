import { knowledgeBase } from "../data/knowledgeBase.js";

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

export function retrieveKnowledge(query, limit = 4) {
  const queryTokens = tokenize(query);
  const querySet = new Set(queryTokens);

  return knowledgeBase
    .map((item) => {
      const haystack = `${item.title} ${item.tags.join(" ")} ${item.content}`;
      const tokens = tokenize(haystack);
      const tagBoost = item.tags.some((tag) => query.toLowerCase().includes(tag)) ? 8 : 0;
      const score = tokens.reduce((sum, token) => sum + (querySet.has(token) ? 1 : 0), 0) + tagBoost;
      return { ...item, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function formatKnowledgeContext(items) {
  if (!items.length) return "No directly matching knowledge base article was found.";

  return items
    .map((item, index) => `Source ${index + 1}: ${item.title}\n${item.content.trim()}`)
    .join("\n\n---\n\n");
}
