const stopWords = new Set(["what", "is", "are", "the", "a", "an", "to", "for", "in", "of", "and", "how", "do", "i"]);

export function generateSessionTitle(text) {
  const cleaned = text
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 9);

  const meaningful = cleaned.filter((word) => !stopWords.has(word.toLowerCase()));
  const words = meaningful.length >= 3 ? meaningful : cleaned;

  const title = words
    .slice(0, 7)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return title || "Placement Chat";
}
