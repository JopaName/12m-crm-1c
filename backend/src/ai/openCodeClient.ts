import axios from "axios";

const AI_API_KEY = "sk-cdLb8Z2vT2ob7i5Dh7PL8InaOvoCIx8wyqdgBE4Onanbvj9TpoCMzpKunl15V1gm";
const AI_BASE_URL = "https://opencode.ai/zen/v1";
const AI_MODEL = "qwen3.5-plus";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface IntentResult {
  intent: "SEARCH" | "ACTION" | "CHAT";
  query?: string;
  entities?: Record<string, string>;
  action?: string;
  payload?: Record<string, any>;
  response?: string;
}

export async function callAI(
  messages: ChatMessage[],
  temperature: number = 0.3,
  maxTokens: number = 1000
): Promise<string> {
  try {
    const res = await axios.post(
      `${AI_BASE_URL}/messages`,
      {
        model: AI_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
      },
      {
        headers: {
          Authorization: `Bearer ${AI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return res.data?.choices?.[0]?.message?.content || "";
  } catch (err: any) {
    console.error("AI API Error:", err.response?.data || err.message);
    throw new Error("Ошибка обращения к AI");
  }
}

export async function detectIntent(
  userMessage: string,
  contextSummary?: string
): Promise<IntentResult> {
  const systemPrompt = `You are an AI Coordinator for a CRM system.
Classify user requests into: SEARCH, ACTION, or CHAT.
Return STRICT JSON only, no markdown, no extra text.

Format:
{"intent":"SEARCH","query":"...","entities":{"client":"...","deal":"..."}}
{"intent":"ACTION","action":"create_client|update_deal_status|create_task","payload":{...}}
{"intent":"CHAT","response":"..."}

Rules:
- SEARCH: user asks for info (status, client details, inventory).
- ACTION: user wants to create/update/delete something.
- CHAT: user asks for advice, greetings, or general help.
- If ACTION, extract all possible fields into payload.
- If SEARCH, extract entities to help backend query.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: contextSummary ? `${contextSummary}

User: ${userMessage}` : userMessage },
  ];

  const raw = await callAI(messages, 0.1, 500);
  try {
    const jsonStr = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch {
    return { intent: "CHAT", response: raw };
  }
}
