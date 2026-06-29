import { useState, useEffect, useRef, useCallback } from "react";
import api from "../api";
import { RefreshCw, Zap, AlertTriangle, CheckCircle, ArrowRight, Sparkles, ThumbsUp, TrendingUp, Target, Lightbulb, Shield, X, ChevronDown, BarChart3, DollarSign, Users, Package } from "lucide-react";

interface FeedCard {
  type: "fact" | "insight" | "idea" | "metric" | "alert" | "quote" | "action";
  title?: string; content?: string; value?: string; label?: string;
  sub?: string; severity?: "info" | "warning" | "success" | "danger";
  color?: string; link?: string; id: string;
}

const TABS = [
  { key: "ideas", label: "💡 Идеи", prompt: "Создай 3 креативные бизнес-идеи. Каждая с заголовком, развернутым описанием и ссылкой. Формат: [{\"type\":\"idea\",\"title\":\"...\",\"content\":\"...\",\"sub\":\"Выгода: ...\",\"link\":\"/путь\"}]" },
  { key: "facts", label: "📊 Факты", prompt: "На основе данных CRM создай 4 коротких факта/наблюдения. Формат JSON: [{\"type\":\"fact\",\"title\":\"...\",\"content\":\"...\"}]" },
  { key: "metrics", label: "📈 Метрики", prompt: "Выдели 3-4 метрики. Крупное значение + название + пояснение + ссылка на раздел CRM. Формат: [{\"type\":\"metric\",\"label\":\"...\",\"value\":\"...\",\"sub\":\"...\",\"color\":\"blue|green|purple|amber|red|teal\",\"link\":\"/путь\"}]" },
  { key: "alerts", label: "⚠️ Риски", prompt: "Найди 3 риска или проблемы в данных CRM. Формат JSON: [{\"type\":\"alert\",\"title\":\"...\",\"content\":\"...\",\"severity\":\"warning|danger\"}]"},
  { key: "quotes", label: "💬 Советы", prompt: "Создай 3 мотивационных совета для команды на основе метрик CRM. Формат JSON: [{\"type\":\"quote\",\"title\":\"...\",\"content\":\"...\"}]" },
];

const ICONS: Record<string, any> = { fact: Sparkles, insight: Lightbulb, idea: Target, metric: TrendingUp, alert: AlertTriangle, quote: CheckCircle, action: ArrowRight };
const BG: Record<string, string> = { fact: "from-violet-50 to-violet-50/30 border-violet-200", idea: "from-teal-50 to-teal-50/30 border-teal-200", metric: "from-blue-50 to-blue-50/30 border-blue-200", alert: "from-amber-50 to-amber-50/30 border-amber-200", quote: "from-green-50 to-green-50/30 border-green-200", action: "from-indigo-50 to-indigo-50/30 border-indigo-200" };
const ICON_BG: Record<string, string> = { fact: "bg-violet-100 text-violet-600", insight: "bg-amber-100 text-amber-600", idea: "bg-teal-100 text-teal-600", metric: "bg-blue-100 text-blue-600", alert: "bg-red-100 text-red-600", quote: "bg-green-100 text-green-600", action: "bg-indigo-100 text-indigo-600" };
const GRADIENT: Record<string, string> = { blue: "from-blue-500 to-indigo-600", green: "from-emerald-500 to-teal-600", purple: "from-purple-500 to-pink-600", amber: "from-amber-500 to-orange-600", red: "from-red-500 to-rose-600", teal: "from-teal-500 to-cyan-600", default: "from-blue-500 to-indigo-600" };
const TYPE_LABEL: Record<string, string> = { fact: "Факт", idea: "Идея", metric: "Метрика", alert: "Риск", quote: "Совет", insight: "Инсайт", action: "Действие" };

export default function AiDashboardView({ crmData }: { crmData: any }) {
  const [activeTab, setActiveTab] = useState("ideas");
  // Per-tab state: { cards, page, loading, hasMore, dismissed }
  const [tabs, setTabs] = useState<Record<string, { cards: FeedCard[]; page: number; loading: boolean; hasMore: boolean; dismissed: Set<string> }>>({});
  const loaderRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const getTab = (key: string) => tabs[key] || { cards: [], page: 0, loading: false, hasMore: true, dismissed: new Set<string>() };
  const currentTab = getTab(activeTab);

  const updateTab = (key: string, fn: (prev: any) => any) => {
    setTabs(prev => ({ ...prev, [key]: fn(getTab(key)) }));
  };

  const generateCards = useCallback(async (tabKey: string, pageNum: number) => {
    const tab = getTab(tabKey);
    if (!tab.hasMore && pageNum > 0) return;
    updateTab(tabKey, (prev: any) => ({ ...prev, loading: true }));
    
    try {
      const context = JSON.stringify({ summary: crmData.summary, finances: crmData.finances, pulse: crmData.pulse, deals: crmData.deals }).substring(0, 4000);
      const tabConfig = TABS.find(t => t.key === tabKey) || TABS[0];
      
      const prompt = `${tabConfig.prompt}\n\nДанные CRM: ${context}\n\nТолько JSON массив. Числа точные из данных. Суммы в ₽ с разделителями.`;

      const res = await api.post("/ai/coordinator", { content: prompt, skipTools: true, maxTokens: 1500 });
      const text = res.data?.response || "";
      const cleanText = text.replace(/```json\n?|```/g, "").trim();
      const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const newCards = (parsed || []).map((c: any, i: number) => ({
          ...c, id: `${tabKey}-${pageNum}-${i}-${Date.now()}`, type: c.type || tabKey === "ideas" ? "idea" : tabKey === "facts" ? "fact" : tabKey === "metrics" ? "metric" : tabKey === "alerts" ? "alert" : "quote",
        }));
        updateTab(tabKey, (prev: any) => ({
          ...prev, cards: [...prev.cards, ...newCards], page: pageNum + 1, loading: false, hasMore: pageNum < 5,
        }));
      } else {
        updateTab(tabKey, (prev: any) => ({ ...prev, loading: false, hasMore: false }));
      }
    } catch (e: any) {
      updateTab(tabKey, (prev: any) => ({ ...prev, loading: false }));
    }
  }, [crmData]);

  // Initial load for active tab
  useEffect(() => {
    if (currentTab.cards.length === 0) generateCards(activeTab, 0);
  }, [activeTab]);

  // IntersectionObserver — only for active tab
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !currentTab.loading && currentTab.hasMore) {
          generateCards(activeTab, currentTab.page);
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );
    if (loaderRef.current) observerRef.current.observe(loaderRef.current);
    return () => observerRef.current?.disconnect();
  }, [activeTab, currentTab.loading, currentTab.hasMore, currentTab.page, generateCards]);

  const dismissCard = (tabKey: string, id: string) => {
    updateTab(tabKey, (prev: any) => {
      const newDismissed = new Set(prev.dismissed);
      newDismissed.add(id);
      return { ...prev, dismissed: newDismissed };
    });
  };

  const resetTab = (tabKey: string) => {
    setTabs(prev => ({
      ...prev,
      [tabKey]: { cards: [], page: 0, loading: false, hasMore: true, dismissed: new Set<string>() }
    }));
    if (tabKey === activeTab) generateCards(tabKey, 0);
  };

  const visibleCards = currentTab.cards.filter((c: FeedCard) => !currentTab.dismissed.has(c.id));

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm border border-gray-100 sticky top-0 z-10">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab.key
                ? "bg-violet-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab header with count + refresh */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-gray-700">{TABS.find(t => t.key === activeTab)?.label}</span>
          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{visibleCards.length} карточек</span>
        </div>
        <button onClick={() => resetTab(activeTab)}
          className="flex items-center gap-1 px-2.5 py-1 text-[10px] text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
          <RefreshCw className="w-3 h-3" />Обновить
        </button>
      </div>

      {/* Cards feed */}
      <div className="space-y-3 min-h-[300px]">
        {currentTab.loading && visibleCards.length === 0 ? (
          <div className="space-y-3 animate-pulse">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 space-y-3 shadow-sm border border-gray-100">
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : visibleCards.length === 0 && !currentTab.loading ? (
          <div className="text-center py-16 text-gray-400">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Пока пусто</p>
            <button onClick={() => resetTab(activeTab)} className="text-xs text-violet-600 hover:underline mt-1">Загрузить</button>
          </div>
        ) : (
          visibleCards.map((card) => {
            const Icon = ICONS[card.type] || Sparkles;
            return (
              <div key={card.id} className={`relative bg-gradient-to-br ${BG[card.type] || BG.fact} border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group`}>
                <button onClick={() => dismissCard(activeTab, card.id)}
                  className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-white/50 transition-all">
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-xl ${ICON_BG[card.type] || ICON_BG.fact} flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{TYPE_LABEL[card.type] || "Факт"}</span>
                </div>

                {card.type === "metric" ? (
                  <div className={`bg-gradient-to-br ${GRADIENT[card.color || "default"]} p-6 text-white relative overflow-hidden rounded-xl`}>
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
                    <div className="relative z-10">
                      <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-2">{card.label}</p>
                      <p className="text-3xl font-bold">{card.value}</p>
                      {card.sub && <p className="text-sm text-white/70 mt-2 leading-relaxed">{card.sub}</p>}
                      {card.link ? (
                        <a href={card.link} className="flex items-center gap-1 mt-3 text-xs text-white/60 hover:text-white transition-colors">
                          Подробнее <ArrowRight className="w-3 h-3" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <>
                    {card.title && <h3 className="text-sm font-semibold text-gray-800 mb-1">{card.title}</h3>}
                    {card.content && <p className="text-xs text-gray-600 leading-relaxed mb-2">{card.content}</p>}
                    {card.sub && <p className="text-[11px] text-gray-500 bg-gray-50 rounded-lg p-2.5 mb-2 leading-relaxed">{card.sub}</p>}
                  </>
                )}
                {card.link && (
                  <a href={card.link} className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-violet-600 hover:text-violet-700">
                    Перейти <ArrowRight className="w-3 h-3" />
                  </a>
                )}
              </div>
            );
          })
        )}

        {/* Infinite scroll trigger */}
        <div ref={loaderRef} className="py-4 flex justify-center">
          {currentTab.loading && visibleCards.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <RefreshCw className="w-4 h-4 animate-spin" />Загружаем ещё...
            </div>
          )}
          {!currentTab.loading && !currentTab.hasMore && visibleCards.length > 0 && (
            <div className="text-xs text-gray-400 flex flex-col items-center gap-1 py-4">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span>Всё просмотрено</span>
              <button onClick={() => resetTab(activeTab)} className="text-violet-600 hover:underline">Обновить</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
