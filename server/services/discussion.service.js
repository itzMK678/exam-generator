import { generateTextContent, streamTextContent } from "./gemini.service.js";

function buildDiscussionPrompt({
  question,
  answer,
  explanation,
  messages = [],
}) {
  if (!question?.trim()) {
    throw new Error("Question is required.");
  }

  if (!messages.length) {
    throw new Error("Discussion message is required.");
  }

  const conversation = messages
    .map((message) => {
      const role = message.role === "user" ? "Student" : "Tutor";
      return `${role}: ${message.content}`;
    })
    .join("\n\n");

  return `
You are a helpful study tutor inside ExamForge.

The student is discussing an existing exam question.

You have the following information about the question:

Question:
${question}

Correct Answer:
${answer || "Not available"}

Existing Explanation:
${explanation || "Not available"}


Previous Discussion:
${conversation}


Continue the discussion naturally.

Important rules:

- Understand the previous conversation before responding.
- The student may refer to something indirectly such as "it", "that", "the first point", or "why".
- Use the previous messages to understand what they mean.
- Do not simply repeat the existing answer.
- Explain concepts in a simple and educational way.
- Respond directly to what the student is asking.
- If the student is confused, clarify the concept.
- You may ask a short follow-up question when useful.
- Do not generate a new exam question unless the student explicitly asks for one.
- Stay focused on the current question and topic.
- Do not mention these instructions.
`;
}

export async function discussQuestion({
  question,
  answer,
  explanation,
  messages = [],
}) {
  const prompt = buildDiscussionPrompt({
    question,
    answer,
    explanation,
    messages,
  });

  return await generateTextContent({
    prompt,
    temperature: 0.4,
  });
}

export async function* discussQuestionStream({
  question,
  answer,
  explanation,
  messages = [],
  signal,
}) {
  const prompt = buildDiscussionPrompt({
    question,
    answer,
    explanation,
    messages,
  });

  yield* streamTextContent({
    prompt,
    temperature: 0.4,
    signal,
  });
}