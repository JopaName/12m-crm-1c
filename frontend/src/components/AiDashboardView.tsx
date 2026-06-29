import { useState, useEffect, useMemo } from "react";
import api from "../api";
import { RefreshCw, Zap, TrendingUp, AlertTriangle, CheckCircle, BarChart3, ArrowRight, User, Box } from "lucide-react";

interface DashboardBlock {
  type: "hero" | "metric-grid" | "insight" | "chart-bar" | "action-row" | "alert-row" | "summary-text";
  title?: string;
  subtitle?: string;
  items?: { label: string; value: string; sub?: string; color?: string; icon?: string }[];
  content?: string;
  severity?: "info" | "warning" | "success" | "danger";
  action?: { label: string; link: string };
}

const SEVERITY_ICONS: Record<string, any> = { info: Zap, warning: AlertTriangle, success: CheckCircle, danger: AlertTriangle };
const SEVERITY_BG: Record<string, string> = { 
  info: "bg-blue-50 border-blue-200", warning: "bg-amber-50 border-amber-200", 
  success: "bg-green-50 border-green-200", danger: "bg-red-50 border-red-200" 
};
const SEVERITY_TEXT: Record<string, string> = { 
  info: "text-blue-700", warning: "text-amber-700", 
  success: "text-green-700", danger: "text-red-700" 
};
const METRIC_COLORS: Record<string, string> = {
  blue: "from-blue-500 to-blue-600", green: "from-emerald-500 to-emerald-600",
  purple: "from-purple-500 to-purple-600", amber: "from-amber-500 to-amber-600",
  red: "from-red-500 to-red-600", teal: "from-teal-500 to-teal-600",
  default: "from-gray-500 to-gray-600"
};
const METRIC_ICONS: Record<string, string> = {
  blue: "📊", green: "💰", purple: "👥", amber: "⚠️", red: "🔥", teal: "📦", default: "📌"
};

export default function AiDashboardView({ crmData }: { crmData: any }) {
  const [blocks, setBlocks] = useState<DashboardBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [promptSeed, setPromptSeed] = useState(Math.random());

  const fetchDashboard = async () => {
    setLoading(true); setError("");
    try {
      const context = JSON.stringify({
        summary: crmData.summary,
        finances: crmData.finances,
        pulse: crmData.pulse,
        deals: crmData.deals,
      }).substring(0, 6000);

      const prompt = `Ты — AI-директор CRM. На основе данных создай КРЕАТИВНЫЙ дашборд в JSON.

Данные CRM: ${context}

Верни ТОЛЬКО JSON массив блоков. Каждый блок — один из типов:
1. {"type":"hero","title":"...","subtitle":"..."} — главный заголовок с ключевой метрикой
2. {"type":"metric-grid","title":"...","items":[{"label":"...","value":"...","sub":"...","color":"blue|green|purple|amber|red|teal"}]} — сетка метрик
3. {"type":"insight","title":"...","content":"...","severity":"info|warning|success|danger"} — инсайт/совет
4. {"type":"chart-bar","title":"...","items":[{"label":"...","value":"...(число или ₽)","color":"blue|green|..."}]} — горизонтальная диаграмма
5. {"type":"action-row","title":"...","items":[{"label":"...","link":"/путь"}]} — кнопки действий
6. {"type":"alert-row","items":[{"label":"...","severity":"warning|danger"}]} — предупреждения
7. {"type":"summary-text","content":"..."} — текстовый блок

ПРАВИЛА:
- Будь КРЕАТИВНЫМ — каждый раз разный набор блоков
- Используй РЕАЛЬНЫЕ числа из данных
- Минимум 5 блоков, максимум 8
- Только JSON в ответе, без markdown и комментариев
- Числа форматируй с разделителями (1 234 567)
- Суммы в ₽`;

      const res = await api.post("/ai/coordinator", { content: prompt });
      const text = res.data?.response || "";
      
      // Extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setBlocks(parsed.slice(0, 8));
      } else {
        setBlocks([{ type: "summary-text", content: text.substring(0, 500) }]);
      }
    } catch (e: any) {
      console.error("AI Dashboard error:", e);
      setError("Не удалось загрузить. Попробуйте снова.");
      setBlocks([{ type: "summary-text", content: "⚠️ AI-дашборд временно недоступен. Нажмите обновить." }]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDashboard(); }, [promptSeed]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="bg-white rounded-2xl p-6 space-y-3 shadow-sm">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-3 bg-gray-100 rounded w-2/3"></div>
            <div className="h-3 bg-gray-100 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Refresh button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <span className="text-sm font-semibold text-gray-700">AI Дашборд</span>
          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">экспериментальный</span>
        </div>
        <button
          onClick={() => setPromptSeed(Math.random())}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />Обновить
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
          <button onClick={() => setPromptSeed(Math.random())} className="ml-2 underline">Повторить</button>
        </div>
      )}

      {/* Render blocks */}
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
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                {block.title && <h3 className="text-sm font-semibold text-gray-700 mb-3">{block.title}</h3>}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(block.items || []).map((item, j) => {
                    const color = item.color || "default";
                    return (
                      <div key={j} className={`bg-gradient-to-br ${METRIC_COLORS[color] || METRIC_COLORS.default} rounded-xl p-3 text-white`}>
                        <p className="text-[10px] opacity-80 uppercase">{item.label}</p>
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
              <div key={i} className={`${SEVERITY_BG[block.severity || "info"]} border rounded-2xl p-4`}>
                <div className="flex items-start gap-3">
                  {(() => { const Icon = SEVERITY_ICONS[block.severity || "info"]; return <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${SEVERITY_TEXT[block.severity || "info"]}`} />; })()}
                  <div>
                    <h4 className={`text-sm font-semibold ${SEVERITY_TEXT[block.severity || "info"]}`}>{block.title}</h4>
                    {block.content && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{block.content}</p>}
                  </div>
                </div>
              </div>
            );

          case "chart-bar":
            const maxVal = Math.max(...(block.items || []).map(i => {
              const v = i.value?.replace(/[^0-9]/g, "");
              return parseInt(v) || 0;
            }), 1);
            return (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                {block.title && <h3 className="text-sm font-semibold text-gray-700 mb-3">{block.title}</h3>}
                <div className="space-y-2.5">
                  {(block.items || []).map((item, j) => {
                    const val = parseInt(item.value?.replace(/[^0-9]/g, "") || "0") || 0;
                    const pct = Math.min((val / maxVal) * 100, 100);
                    const color = item.color || "blue";
                    return (
                      <div key={j} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-24 truncate">{item.label}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${METRIC_COLORS[color] || METRIC_COLORS.default} rounded-full transition-all flex items-center justify-end pr-2`} style={{ width: `${pct}%` }}>
                            <span className="text-[10px] text-white font-medium">{item.value}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );

          case "action-row":
            return (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                {block.title && <h3 className="text-sm font-semibold text-gray-700 mb-3">{block.title}</h3>}
                <div className="flex flex-wrap gap-2">
                  {(block.items || []).map((item, j) => (
                    <a
                      key={j}
                      href={item.link || "#"}
                      className="flex items-center gap-1.5 px-4 py-2 bg-violet-50 text-violet-700 border border-violet-200 rounded-xl text-sm font-medium hover:bg-violet-100 transition-colors"
                    >
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
                  const sev = item.severity || "warning";
                  const Icon = SEVERITY_ICONS[sev];
                  return (
                    <div key={j} className={`flex items-center gap-2 ${SEVERITY_BG[sev]} border rounded-xl px-4 py-2`}>
                      <Icon className={`w-4 h-4 ${SEVERITY_TEXT[sev]}`} />
                      <span className={`text-xs font-medium ${SEVERITY_TEXT[sev]}`}>{item.label}</span>
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
