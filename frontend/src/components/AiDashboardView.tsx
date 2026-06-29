import { useState, useEffect, useCallback } from "react";
import api from "../api";
import { RefreshCw, Zap, AlertTriangle, CheckCircle, ArrowRight, Sparkles, ThumbsUp, BarChart3, Lightbulb, Shield, Target } from "lucide-react";

interface DashboardBlock {
  type: "hero" | "metric-grid" | "insight" | "chart-bar" | "action-row" | "alert-row" | "summary-text";
  title?: string; subtitle?: string;
  items?: { label: string; value: string; sub?: string; color?: string; icon?: string }[];
  content?: string; severity?: "info" | "warning" | "success" | "danger";
}

const PERSONAS = [
  { key: "analyst", label: "Аналитик", icon: "🎯", desc: "Цифры, графики, тренды", color: "from-blue-600 to-indigo-600", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  { key: "visionary", label: "Визионер", icon: "🔮", desc: "Прогнозы, идеи, возможности", color: "from-purple-600 to-pink-600", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  { key: "coach", label: "Мотиватор", icon: "💪", desc: "Победы, рост, энергия", color: "from-emerald-600 to-teal-600", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  { key: "auditor", label: "Аудитор", icon: "🛡️", desc: "Риски, проблемы, контроль", color: "from-amber-600 to-red-600", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
];

const PERSONA_PROMPTS: Record<string, string> = {
  analyst: "Ты — Аналитик данных. Создай дашборд с ТОЧНЫМИ ЦИФРАМИ из данных. Фокус на метриках, графиках, сравнениях. Строгий деловой стиль. Никаких украшательств — только факты.",
  visionary: "Ты — Визионер. Создай ВДОХНОВЛЯЮЩИЙ дашборд. Покажи возможности роста, прогнозы, неочевидные связи. Креативные заголовки. Думай о будущем компании. Используй слова 'потенциал', 'возможность', 'прорыв'.",
  coach: "Ты — Мотиватор команды. Создай ЭНЕРГИЧНЫЙ дашборд. Отмечай достижения, хвали прогресс, вдохновляй на новые победы. Позитивный тон. Используй слова 'отлично', 'рост', 'победа', 'молодцы'. Смайлики приветствуются.",
  auditor: "Ты — Аудитор. Создай КРИТИЧЕСКИЙ дашборд. Найди слабые места, риски, просрочки, узкие горлышки. Честно предупреди о проблемах. Предложи конкретные шаги для исправления. Строгий тон. Используй слова 'риск', 'проблема', 'срочно', 'внимание'.",
};

const SEV_ICONS: Record<string, any> = { info: Zap, warning: AlertTriangle, success: CheckCircle, danger: AlertTriangle };
const SEV_BG: Record<string, string> = { info: "bg-blue-50 border-blue-200", warning: "bg-amber-50 border-amber-200", success: "bg-green-50 border-green-200", danger: "bg-red-50 border-red-200" };
const SEV_TEXT: Record<string, string> = { info: "text-blue-700", warning: "text-amber-700", success: "text-green-700", danger: "text-red-700" };
const M_COLORS: Record<string, string> = { blue: "from-blue-500 to-blue-600", green: "from-emerald-500 to-emerald-600", purple: "from-purple-500 to-purple-600", amber: "from-amber-500 to-amber-600", red: "from-red-500 to-red-600", teal: "from-teal-500 to-teal-600", default: "from-gray-500 to-gray-600" };

export default function AiDashboardView({ crmData }: { crmData: any }) {
  const [blocks, setBlocks] = useState<DashboardBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [variation, setVariation] = useState(0);
  const [liked, setLiked] = useState(false);
  const [persona, setPersona] = useState("analyst");

  const generateDashboard = useCallback(async () => {
    setLoading(true); setError(""); setLiked(false);
    setVariation(v => v + 1);
    
    try {
      const context = JSON.stringify({ summary: crmData.summary, finances: crmData.finances, pulse: crmData.pulse, deals: crmData.deals }).substring(0, 5000);

      const personaPrompt = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.analyst;
      const prompt = `${personaPrompt}

Данные CRM: ${context}

Верни ТОЛЬКО JSON-массив блоков (5-8 штук). Типы:
{"type":"hero","title":"...","subtitle":"..."}
{"type":"metric-grid","title":"...","items":[{"label":"...","value":"...","color":"blue|green|purple|amber|red|teal"}]}
{"type":"insight","title":"...","content":"...","severity":"info|warning|success|danger"}
{"type":"chart-bar","title":"...","items":[{"label":"...","value":"...","color":"blue|green|..."}]}
{"type":"action-row","title":"...","items":[{"label":"...","link":"/путь"}]}
{"type":"alert-row","items":[{"label":"...","severity":"warning|danger"}]}
{"type":"summary-text","content":"..."}

ВАЖНО: ТОЛЬКО JSON в ответе. Числа из данных используй точно. Суммы в ₽ с разделителями.`;

      const res = await api.post("/ai/coordinator", { content: prompt, skipTools: true, maxTokens: 2000 });
      const text = res.data?.response || "";
      const cleanText = text.replace(/```json\n?|```/g, "").trim();
      const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        setBlocks(JSON.parse(jsonMatch[0]).slice(0, 8));
      } else {
        setBlocks([{ type: "summary-text", content: text.substring(0, 500) }]);
      }
    } catch (e: any) {
      console.error("AI Dash error:", e);
      setError("Не удалось сгенерировать. Попробуйте другую персону или обновите.");
    }
    setLoading(false);
  }, [variation, persona, crmData]);

  useEffect(() => { generateDashboard(); }, [persona]);

  const currentPersona = PERSONAS.find(p => p.key === persona) || PERSONAS[0];

  return (
    <div>
      {/* Persona selector */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {PERSONAS.map(p => (
          <button
            key={p.key}
            onClick={() => { setPersona(p.key); setBlocks([]); setVariation(0); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              persona === p.key
                ? `${p.bg} ${p.text} ${p.border} border shadow-sm`
                : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"
            }`}
          >
            <span>{p.icon}</span> {p.label}
          </button>
        ))}
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between mb-5 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentPersona.color} flex items-center justify-center shadow-sm`}>
            <span className="text-lg">{currentPersona.icon}</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800">AI-дашборд #{variation || 1} · {currentPersona.label}</h2>
            <p className="text-[10px] text-gray-400">{currentPersona.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!loading && blocks.length > 0 && (
            <button onClick={() => setLiked(true)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${liked ? "bg-green-100 text-green-700 border border-green-200" : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-green-300 hover:text-green-600"}`}>
              <ThumbsUp className="w-3.5 h-3.5" />{liked ? "Оставлен!" : "Нравится"}
            </button>
          )}
          <button onClick={() => setVariation(v => v + 1)} disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-all shadow-sm hover:shadow-md active:scale-95 bg-gradient-to-r ${currentPersona.color}`}>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Генерация..." : "Сгенерировать"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setVariation(v => v + 1)} className="underline text-xs">Повторить</button>
        </div>
      )}

      {loading && blocks.length === 0 && (
        <div className="space-y-4 animate-pulse">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 space-y-3 shadow-sm border border-gray-100">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-100 rounded w-2/3"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {loading && blocks.length > 0 && (
        <div className="relative">
          <div className="absolute inset-0 bg-white/60 z-10 rounded-2xl flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
          <BlocksRenderer blocks={blocks} />
        </div>
      )}

      {!loading && <BlocksRenderer blocks={blocks} />}
    </div>
  );
}

function BlocksRenderer({ blocks }: { blocks: DashboardBlock[] }) {
  const maxVal = (items?: any[]) => Math.max(...(items || []).map(i => parseInt(String(i.value || "0").replace(/[^0-9]/g, "")) || 0), 1);

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "hero":
            return (
              <div key={i} className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
                <h2 className="text-2xl font-bold mb-1">{block.title}</h2>
                {block.subtitle && <p className="text-white/70 text-sm">{block.subtitle}</p>}
              </div>
            );
          case "metric-grid":
            return (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                {block.title && <h3 className="text-sm font-semibold text-gray-700 mb-3">{block.title}</h3>}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(block.items || []).map((item, j) => {
                    const c = item.color || "default";
                    return (
                      <div key={j} className={`bg-gradient-to-br ${M_COLORS[c] || M_COLORS.default} rounded-xl p-3 text-white`}>
                        <p className="text-[10px] opacity-80 uppercase font-medium">{item.label}</p>
                        <p className="text-lg font-bold mt-0.5">{item.value}</p>
                        {item.sub && <p className="text-[10px] opacity-70">{item.sub}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          case "insight":
            return (
              <div key={i} className={`${SEV_BG[block.severity || "info"]} border rounded-2xl p-4`}>
                <div className="flex items-start gap-3">
                  {(() => { const Icon = SEV_ICONS[block.severity || "info"]; return <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${SEV_TEXT[block.severity || "info"]}`} />; })()}
                  <div>
                    <h4 className={`text-sm font-semibold ${SEV_TEXT[block.severity || "info"]}`}>{block.title}</h4>
                    {block.content && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{block.content}</p>}
                  </div>
                </div>
              </div>
            );
          case "chart-bar": {
            const m = maxVal(block.items);
            return (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                {block.title && <h3 className="text-sm font-semibold text-gray-700 mb-3">{block.title}</h3>}
                <div className="space-y-2.5">
                  {(block.items || []).map((item, j) => {
                    const val = parseInt(String(item.value || "0").replace(/[^0-9]/g, "")) || 0;
                    const pct = Math.min((val / m) * 100, 100);
                    return (
                      <div key={j} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-24 truncate text-right">{item.label}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${M_COLORS[item.color || "blue"] || M_COLORS.default} rounded-full flex items-center justify-end pr-2`} style={{ width: `${pct}%` }}>
                            <span className="text-[10px] text-white font-medium">{item.value}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
          case "action-row":
            return (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                {block.title && <h3 className="text-sm font-semibold text-gray-700 mb-3">{block.title}</h3>}
                <div className="flex flex-wrap gap-2">
                  {(block.items || []).map((item, j) => (
                    <a key={j} href={item.link || "#"} className="flex items-center gap-1.5 px-4 py-2 bg-violet-50 text-violet-700 border border-violet-200 rounded-xl text-sm font-medium hover:bg-violet-100 transition-colors">
                      {item.label} <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  ))}
                </div>
              </div>
            );
          case "alert-row":
            return (
              <div key={i} className="flex flex-wrap gap-2">
                {(block.items || []).map((item, j) => {
                  const s = item.severity || "warning";
                  const Icon = SEV_ICONS[s];
                  return (
                    <div key={j} className={`flex items-center gap-2 ${SEV_BG[s]} border rounded-xl px-4 py-2`}>
                      <Icon className={`w-4 h-4 ${SEV_TEXT[s]}`} />
                      <span className={`text-xs font-medium ${SEV_TEXT[s]}`}>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            );
          case "summary-text":
            return (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{block.content}</p>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
