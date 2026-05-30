import axios from "axios";

const AI_BASE_URL = "https://opencode.ai/zen/v1";
const AI_MODEL = "qwen3.5-plus";
const DEFAULT_API_KEY = "sk-cdLb8Z2vT2ob7i5Dh7PL8InaOvoCIx8wyqdgBE4Onanbvj9TpoCMzpKunl15V1gm";

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
  apiKey?: string,
  temperature: number = 0.3,
  maxTokens: number = 300
): Promise<string> {
  const key = apiKey || DEFAULT_API_KEY;
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
          "x-api-key": key,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );
    const data = res.data;
    if (data.type === "error") {
      throw new Error(data.error?.message || "AI API error");
    }
    if (data.content && Array.isArray(data.content)) {
      const textBlock = data.content.find((b: any) => b.type === "text");
      return textBlock?.text || "";
    }
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message?.content || "";
    }
    return "";
  } catch (err: any) {
    console.error("AI API Error:", err.response?.data || err.message);
    if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
      throw new Error("AI отвечает слишком долго. Попробуйте позже.");
    }
    throw new Error("Ошибка обращения к AI");
  }
}

export async function detectIntent(
  userMessage: string,
  apiKey?: string,
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
- SEARCH: user asks for info (status, client details, inventory, warehouse, склад).
- ACTION: user wants to create/update/delete something.
- CHAT: user asks for advice, greetings, or general help.
- If ACTION, extract all possible fields into payload.
- If SEARCH, extract entities to help backend query.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: contextSummary ? `${contextSummary}\n\nUser: ${userMessage}` : userMessage },
  ];

  const raw = await callAI(messages, apiKey, 0.1, 200);
  try {
    const jsonStr = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch {
    return { intent: "CHAT", response: raw };
  }
}
