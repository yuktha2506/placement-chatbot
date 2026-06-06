export const greetingResponse = `Hi! 👋

Welcome to the Placement Guidance Assistant.

I can help you with:

• Placement preparation
• Top hiring companies
• Service vs Product companies
• Resume reviews
• Interview preparation
• Aptitude and coding guidance
• Career advice

How can I assist you today?`;

const greetings = [
  "hi",
  "hello",
  "hey",
  "good morning",
  "good afternoon",
  "good evening"
];

export function isGreeting(message) {
  const normalized = message.trim().toLowerCase().replace(/[!.,\s]+$/g, "");
  return greetings.includes(normalized);
}
