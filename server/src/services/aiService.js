import OpenAI from "openai";
import { env } from "../config/env.js";
import { getPersonalizedAnswer } from "./personalizationService.js";
import { answerWithResumeContext, getResumeContext } from "./resumeAnalysisService.js";

const openaiClient = env.openaiApiKey
  ? new OpenAI({ apiKey: env.openaiApiKey })
  : null;

const huggingFaceClient = env.huggingFaceToken
  ? new OpenAI({
    baseURL: "https://router.huggingface.co/v1",
    apiKey: env.huggingFaceToken
  })
  : null;

export const systemPrompt = `You are a professional Placement Guidance Assistant.

Your role is to help students with placements, internships, career guidance, interviews, aptitude, coding preparation, resumes, and company information.

Guidelines:
1. Be professional and encouraging.
2. Provide structured answers.
3. Use bullet points and tables when useful.
4. Give examples whenever possible.
5. If unsure, clearly state limitations.
6. Maintain conversation context.
7. Keep answers student-friendly.
8. Focus only on placement and career-related guidance.

Formatting:
- Use markdown.
- Prefer this shape when suitable: Title, Short Explanation, Key Points, Example, Summary.
- For comparisons, use markdown tables.
- Keep markdown tables clean: one row per line, with a blank line before and after the table.
- Do not invent current salary, placement percentage, or hiring statistics. Ask the student to verify current figures from official sources when exact freshness matters.`;

export async function generateAiAnswer({ query, context, history }) {
  const resumeContext = getResumeContext(history);
  const resumeAwareAnswer = answerWithResumeContext(query, resumeContext);
  if (resumeAwareAnswer) {
    return resumeAwareAnswer;
  }

  const personalizedAnswer = getPersonalizedAnswer({ query, history });
  if (personalizedAnswer) {
    return personalizedAnswer;
  }

  if (isServiceProductComparison(query, context)) {
    return serviceProductComparisonAnswer();
  }

  const messages = buildMessages({ query, context, history, resumeContext });

  try {
    if (env.aiProvider === "huggingface") {
      return await generateWithHuggingFace(messages, query, context);
    }

    if (env.aiProvider === "openai") {
      return await generateWithOpenAi(messages, query, context);
    }

    if (env.aiProvider === "auto") {
      if (huggingFaceClient) {
        return await generateWithHuggingFace(messages, query, context);
      }

      if (openaiClient) {
        return await generateWithOpenAi(messages, query, context);
      }
    }
  } catch (error) {
    console.error("AI provider failed. Falling back to knowledge base answer.", {
      provider: env.aiProvider,
      status: error.status,
      message: error.message
    });
  }

  return fallbackAnswer(query, context);
}

function buildMessages({ query, context, history, resumeContext }) {
  return [
    { role: "system", content: systemPrompt },
    ...(resumeContext ? [{
      role: "system",
      content: `Use this uploaded resume context when relevant. Do not ask the user to upload the resume again.\n\n${JSON.stringify(resumeContext)}`
    }] : []),
    {
      role: "system",
      content: `Use the knowledge base context first. If the answer is not available there, answer cautiously from general placement knowledge and clearly state limitations.\n\nKnowledge Base Context:\n${context}`
    },
    ...history.slice(-10).map((message) => ({
      role: message.role === "system" ? "system" : message.role,
      content: message.content
    })).filter((message) => !message.content?.startsWith("RESUME_CONTEXT_JSON:")),
    { role: "user", content: query }
  ];
}

async function generateWithHuggingFace(messages, query, context) {
  if (!huggingFaceClient) {
    return fallbackAnswer(query, context);
  }

  const completion = await huggingFaceClient.chat.completions.create({
    model: env.huggingFaceModel,
    messages,
    temperature: 0.35,
    max_tokens: 900,
    stream: false
  });

  return completion.choices[0]?.message?.content?.trim() || fallbackAnswer(query, context);
}

async function generateWithOpenAi(messages, query, context) {
  if (!openaiClient) {
    return fallbackAnswer(query, context);
  }

  const completion = await openaiClient.chat.completions.create({
    model: env.openaiModel,
    messages,
    temperature: 0.35,
    max_tokens: 900
  });

  return completion.choices[0]?.message?.content?.trim() || fallbackAnswer(query, context);
}

function fallbackAnswer(query, context) {
  if (context.startsWith("No directly matching")) {
    return `## I Need a Little More Context

I could not find a confident match in the placement knowledge base for your question.

**What I can help with**
• Placement preparation  
• Service-based and product-based companies  
• Resume, aptitude, DSA, and interview guidance  
• Career paths and internship preparation  

**Summary**
Please rephrase your question with a placement, interview, company, resume, aptitude, or career focus.`;
  }

  return `## Placement Guidance

Here is the most relevant information from the placement knowledge base for: **${query}**

${context
  .split("---")
  .slice(0, 2)
  .join("\n\n")
  .replace(/Source \d+:/g, "###")}

## Summary

Use this as a starting point and verify current company-specific criteria, salary packages, and hiring numbers from official placement notices or company career pages.`;
}

function isServiceProductComparison(query, context) {
  const normalizedQuery = query.toLowerCase();

  // Only trigger for explicit comparison requests
  const hasServiceAndProduct = normalizedQuery.includes("service") && normalizedQuery.includes("product");
  
  // Check for explicit comparison keywords
  const isExplicitComparison = 
    normalizedQuery.includes("difference between") ||
    normalizedQuery.includes("compare") ||
    normalizedQuery.includes(" vs ") ||
    normalizedQuery.includes("versus") ||
    normalizedQuery.includes("service vs product") ||
    normalizedQuery.includes("product vs service");

  // Don't trigger for "what is" questions
  const isWhatIsQuestion = normalizedQuery.startsWith("what is");

  return hasServiceAndProduct && isExplicitComparison && !isWhatIsQuestion;
}

function serviceProductComparisonAnswer() {
  return `## Service-Based vs Product-Based Companies

Service-based companies mainly deliver software, consulting, and IT services for clients. Product-based companies build, own, and improve their own products or platforms.

| Feature | Service-Based Companies | Product-Based Companies |
| --- | --- | --- |
| Main Focus | Client projects and services | Own products and platforms |
| Work Type | Development, maintenance, support, testing, consulting | Product engineering, feature development, scaling, platform reliability |
| Examples | TCS, Infosys, Wipro, HCLTech, Accenture, Cognizant | Google, Microsoft, Amazon, Adobe, Oracle, Salesforce, Atlassian |
| Hiring Volume | Usually higher fresher hiring volume | Usually more selective hiring |
| Skills Tested | Aptitude, communication, coding basics, CS fundamentals | DSA, problem solving, projects, CS fundamentals, coding depth |
| Salary Trend | Usually moderate and stable for freshers | Often higher, but varies by role, company, location, and market |
| Growth Pattern | Stable, process-oriented, client exposure | Fast learning in product, engineering, and ownership-focused roles |

## Summary

Choose service-based companies for structured training, stable hiring, and client exposure. Choose product-based companies if you want deeper product engineering work and are prepared for stronger DSA and technical interview expectations.`;
}
