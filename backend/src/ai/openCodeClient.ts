import axios from "axios";

const AI_BASE_URL = "https://opencode.ai/zen/v1";
const AI_MODEL = "qwen3.5-plus";
const DEFAULT_API_KEY = "sk-cdLb8Z2vT2ob7i5Dh7PL8InaOvoCIx8wyqdgBE4Onanbvj9TpoCMzpKunl15V1gm";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callAI(
  messages: ChatMessage[],
  apiKey?: string,
  temperature: number = 0.3,
  maxTokens: number = 300
): Promise<string> {
  const key = apiKey || DEFAULT_API_KEY;
  try {
    const systemMsg = messages.find(m => m.role === "system")?.content || "";
    const convMessages = messages.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content }));

    const body: any = {
      model: AI_MODEL,
      max_tokens: maxTokens,
      messages: convMessages,
    };
    if (systemMsg) body.system = systemMsg;
    if (temperature !== undefined) body.temperature = temperature;

    const res = await axios.post(
      AI_BASE_URL + "/messages",
      body,
      {
        headers: {
          "x-api-key": key,
          "Content-Type": "application/json",
        },
        timeout: 120000,
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
      throw new Error("AI request timeout");
    }
    throw new Error("AI connection error");
  }
}
