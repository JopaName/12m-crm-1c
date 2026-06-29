import { useState, useEffect, useRef, useCallback } from "react";
import api from "../api";
import { RefreshCw, Zap, AlertTriangle, CheckCircle, ArrowRight, Sparkles, ThumbsUp, TrendingUp, Target, Lightbulb, Shield, X, ChevronDown, BarChart3, DollarSign, Users, Package } from "lucide-react";

interface FeedCard {
  type: "fact" | "insight" | "idea" | "metric" | "alert" | "quote" | "action";
  title?: string;
  content?: string;
  value?: string;
  label?: string;
  sub?: string;
  severity?: "info" | "warning" | "success" | "danger";
  color?: string;
  link?: string;
  id: string;
}

const ICONS: Record<string, any> = { fact: Sparkles, insight: Lightbulb, idea: Target, metric: TrendingUp, alert: AlertTriangle, quote: CheckCircle, action: ArrowRight };
const BG: Record<string, string> = {
  info: "from-blue-500/10 to-blue-50 border-blue-200", warning: "from-amber-500/10 to-amber-50 border-amber-200",
  success: "from-green-500/10 to-green-50 border-green-200", danger: "from-red-500/10 to-red-50 border-red-200",
  fact: "from-violet-500/10 to-violet-50 border-violet-200", idea: "from-teal-500/10 to-teal-50 border-teal-200",
  metric: "from-blue-500/10 to-blue-50 border-blue-200", alert: "from-amber-500/10 to-amber-50 border-amber-200",
};
const ICON_BG: Record<string, string> = {
  fact: "bg-violet-100 text-violet-600", insight: "bg-amber-100 text-amber-600",
  idea: "bg-teal-100 text-teal-600", metric: "bg-blue-100 text-blue-600",
  alert: "bg-red-100 text-red-600", quote: "bg-green-100 text-green-600", action: "bg-indigo-100 text-indigo-600"
};
const GRADIENT: Record<string, string> = {
  fact: "from-violet-500 to-purple-600", insight: "from-amber-500 to-orange-600",
  idea: "from-teal-500 to-cyan-600", metric: "from-blue-500 to-indigo-600",
  alert: "from-red-500 to-rose-600", quote: "from-green-500 to-emerald-600", action: "from-indigo-500 to-violet-600"
};

const PROMPT_TEMPLATES = [
  "На основе данных CRM создай 4 короткие карточки-факта. Каждая — новый有趣的 факт или наблюдение. Формат: [{\"type\":\"fact\",\"title\":\"...\",\"content\":\"...\",\"severity\":\"info\"}]",
  "Создай 3 креативные бизнес-идеи на основе данных CRM. Формат: [{\"type\":\"idea\",\"title\":\"...\",\"content\":\"...\",\"link\":\"/путь\"}]",
  "Выдели 3 ключевые метрики и представь их как карточки. Формат: [{\"type\":\"metric\",\"label\":\"...\",\"value\":\"...\",\"sub\":\"...\",\"color\":\"blue|green|purple\"}]",
  "Найди 3 предупреждения или риска в данных. Формат: [{\"type\":\"alert\",\"title\":\"...\",\"content\":\"...\",\"severity\":\"warning|danger\"}]",
  "Создай 3 вдохновляющие цитаты/совета для команды на основе метрик. Формат: [{\"type\":\"quote\",\"title\":\"...\",\"content\":\"...\"}]",
];

export default function AiDashboardView({ crmData }: { crmData: any }) {
  const [cards, setCards] = useState<FeedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const loaderRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const generateCards = useCallback(async (pageNum: number) => {
    if (!hasMore && pageNum > 0) return;
    setLoading(true);
    
    try {
      const context = JSON.stringify({ summary: crmData.summary, finances: crmData.finances, pulse: crmData.pulse, deals: crmData.deals }).substring(0, 4000);
      const template = PROMPT_TEMPLATES[pageNum % PROMPT_TEMPLATES.length];
      
      const prompt = `${template}\n\nДанные CRM: ${context}\n\nТолько JSON массив. Числа точные из данных. Суммы в ₽ с разделителями.`;

      const res = await api.post("/ai/coordinator", { content: prompt, skipTools: true, maxTokens: 1500 });
      const text = res.data?.response || "";
      const cleanText = text.replace(/```json\n?|```/g, "").trim();
      const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const newCards = (parsed || []).map((c: any, i: number) => ({
          ...c,
          id: `card-${pageNum}-${i}-${Date.now()}`,
          type: c.type || "fact",
        }));
        setCards(prev => [...prev, ...newCards]);
        setHasMore(pageNum < 10);
      } else {
        setHasMore(false);
      }
      setPage(pageNum + 1);
    } catch (e: any) {
      console.error("Feed error:", e);
      if (pageNum === 0) setCards([{ type: "alert", title: "Не удалось загрузить ленту", content: "Попробуйте обновить страницу", severity: "danger", id: "err" }]);
    }
    setLoading(false);
  }, [crmData, hasMore]);

  // Initial load
  useEffect(() => { generateCards(0); }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && !loading) generateCards(page); },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observerRef.current.observe(loaderRef.current);
    return () => observerRef.current?.disconnect();
  }, [page, loading, generateCards]);

  const dismissCard = (id: string) => {
    setDismissed(prev => new Set([...prev, id]));
  };

  const visibleCards = cards.filter(c => !dismissed.has(c.id));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm rounded-2xl p-3 -mx-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-600" />
          <span className="text-sm font-bold text-gray-800">AI Лента</span>
          <span className="text-[10px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{visibleCards.length} карточек</span>
        </div>
        <button onClick={() => { setCards([]); setPage(0); setHasMore(true); setDismissed(new Set()); generateCards(0); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />Обновить ленту
        </button>
      </div>

      {/* Cards feed */}
      <div className="space-y-3">
        {visibleCards.map((card) => {
          const Icon = ICONS[card.type] || Sparkles;
          return (
            <div
              key={card.id}
              className={`relative bg-gradient-to-br ${BG[card.type] || BG.fact} border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group animate-in`}
            >
              {/* Dismiss button */}
              <button onClick={() => dismissCard(card.id)}
                className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-white/50 transition-all">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {/* Type badge + icon */}
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-xl ${ICON_BG[card.type] || ICON_BG.fact} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  {card.type === "fact" ? "Факт" : card.type === "insight" ? "Инсайт" : card.type === "idea" ? "Идея" : card.type === "metric" ? "Метрика" : card.type === "alert" ? "Внимание" : card.type === "quote" ? "Цитата" : "Действие"}
                </span>
              </div>

              {/* Metric card — special layout */}
              {card.type === "metric" ? (
                <div className={`bg-gradient-to-r ${GRADIENT[card.color || "blue"] || GRADIENT.blue} rounded-xl p-4 text-white`}>
                  <p className="text-[10px] opacity-80 uppercase font-medium">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                  {card.sub && <p className="text-xs opacity-70 mt-0.5">{card.sub}</p>}
                </div>
              ) : (
                <>
                  {card.title && <h3 className="text-sm font-semibold text-gray-800 mb-1">{card.title}</h3>}
                  {card.content && <p className="text-xs text-gray-600 leading-relaxed">{card.content}</p>}
                </>
              )}

              {/* Action link */}
              {card.link && (
                <a href={card.link} className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-violet-600 hover:text-violet-700">
                  Перейти <ArrowRight className="w-3 h-3" />
                </a>
              )}
            </div>
          );
        })}

        {/* Loader trigger */}
        <div ref={loaderRef} className="py-4 flex justify-center">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Загружаем ещё...
            </div>
          )}
          {!loading && !hasMore && cards.length > 0 && (
            <div className="text-xs text-gray-400 flex flex-col items-center gap-1 py-4">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span>Вы посмотрели всё!</span>
              <button onClick={() => { setCards([]); setPage(0); setHasMore(true); generateCards(0); }}
                className="text-violet-600 hover:underline">Обновить ленту</button>
            </div>
          )}
        </div>
      </div>

      {/* Initial empty state */}
      {!loading && cards.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Лента пуста</p>
          <p className="text-xs mt-1">Нажмите «Обновить ленту» чтобы наполнить</p>
        </div>
      )}
    </div>
  );
}
