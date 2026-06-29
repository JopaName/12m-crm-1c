import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { RefreshCw, Zap, AlertTriangle, CheckCircle, ArrowRight, Sparkles, ThumbsUp, TrendingUp, Target, Lightbulb, Shield, X, DollarSign, Users, Package, History, Copy, Check, Film } from "lucide-react";
import CinemaMode from "./CinemaMode";

interface FeedCard {
  type: "fact" | "insight" | "idea" | "metric" | "alert" | "quote" | "action";
  title?: string; content?: string; value?: string; label?: string;
  sub?: string; severity?: "info" | "warning" | "success" | "danger";
  color?: string; link?: string; id: string;
}

type TabState = { cards: FeedCard[]; page: number; loading: boolean; hasMore: boolean; dismissed: Set<string>; cacheTs: number };

const CACHE_KEY = "ai_dash_cache_v2";
const CACHE_TTL = 30 * 60 * 1000; // 30 min

function loadCache(): Record<string, TabState> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Check TTL
    if (Date.now() - (parsed._ts || 0) > CACHE_TTL) { localStorage.removeItem(CACHE_KEY); return null; }
    // Convert dismissed arrays back to Sets
    const result: Record<string, TabState> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (k === "_ts") continue;
      const tab = v as any;
      result[k] = { ...tab, dismissed: new Set<string>(tab._dismissed || []) };
    }
    return result;
  } catch { return null; }
}

function saveCache(tabs: Record<string, TabState>) {
  try {
    const toSave: any = { _ts: Date.now() };
    for (const [k, v] of Object.entries(tabs)) {
      toSave[k] = { ...v, dismissed: undefined, _dismissed: Array.from(v.dismissed || []) };
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(toSave));
  } catch {}
}

const TABS = [
  { key: "ideas", label: "💡 Идеи", prompt: 'Создай 3 креативные бизнес-идеи. Каждая с заголовком, развернутым описанием и ссылкой. Формат: [{"type":"idea","title":"...","content":"...","sub":"Выгода: ...","link":"/путь"}]' },
  { key: "facts", label: "📊 Факты", prompt: 'На основе данных CRM создай 4 коротких факта/наблюдения. Формат JSON: [{"type":"fact","title":"...","content":"..."}]' },
  { key: "metrics", label: "📈 Метрики", prompt: 'Выдели 3-4 метрики. Крупное значение + название + пояснение + ссылка. Формат: [{"type":"metric","label":"...","value":"...","sub":"...","color":"blue|green|purple|amber|red|teal","link":"/путь"}]' },
  { key: "alerts", label: "⚠️ Риски", prompt: 'Найди 3 риска или проблемы. Формат JSON: [{"type":"alert","title":"...","content":"...","severity":"warning|danger"}]'},
  { key: "quotes", label: "💬 Советы", prompt: 'Создай 3 мотивационных совета. Формат JSON: [{"type":"quote","title":"...","content":"..."}]' },
];

const ICONS: Record<string, any> = { fact: Sparkles, insight: Lightbulb, idea: Target, metric: TrendingUp, alert: AlertTriangle, quote: CheckCircle, action: ArrowRight };
const BG: Record<string, string> = { fact: "from-violet-50 to-violet-50/30 border-violet-200", idea: "from-teal-50 to-teal-50/30 border-teal-200", metric: "from-blue-50 to-blue-50/30 border-blue-200", alert: "from-amber-50 to-amber-50/30 border-amber-200", quote: "from-green-50 to-green-50/30 border-green-200" };
const ICON_BG: Record<string, string> = { fact: "bg-violet-100 text-violet-600", idea: "bg-teal-100 text-teal-600", metric: "bg-blue-100 text-blue-600", alert: "bg-red-100 text-red-600", quote: "bg-green-100 text-green-600" };
const GRADIENT: Record<string, string> = { blue: "from-blue-500 to-indigo-600", green: "from-emerald-500 to-teal-600", purple: "from-purple-500 to-pink-600", amber: "from-amber-500 to-orange-600", red: "from-red-500 to-rose-600", teal: "from-teal-500 to-cyan-600", default: "from-blue-500 to-indigo-600" };
const TYPE_LABEL: Record<string, string> = { fact: "Факт", idea: "Идея", metric: "Метрика", alert: "Риск", quote: "Совет" };

const defaultTab = (): TabState => ({ cards: [], page: 0, loading: false, hasMore: true, dismissed: new Set(), cacheTs: 0 });

export default function AiDashboardView({ crmData }: { crmData: any }) {
  const [activeTab, setActiveTab] = useState("ideas");
  const [tabs, setTabs] = useState<Record<string, TabState>>(() => loadCache() || {});
  const [cacheHit, setCacheHit] = useState(false);
  const [reactions, setReactions] = useState<Record<string, "liked" | "disliked">>(() => { try { return JSON.parse(localStorage.getItem("ai_dash_reactions") || "{}"); } catch { return {}; } });
  const [dataChanged, setDataChanged] = useState(false);
  const prevDataRef = useRef("");
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cinemaMode, setCinemaMode] = useState(false);
  const navigate = useNavigate();
  const loaderRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const preloadDone = useRef<Set<string>>(new Set());
  const crmRef = useRef(crmData);
  crmRef.current = crmData;
  const loadingRef = useRef<Set<string>>(new Set());
  const cooldownRef = useRef(0);

  const getTab = (key: string) => tabs[key] || defaultTab();
  const currentTab = getTab(activeTab);
  const updateTab = (key: string, fn: (prev: TabState) => TabState) => {
    setTabs(prev => { const next = { ...prev, [key]: fn(getTab(key)) }; if (prev[key]?.loading) saveCache(next); return next; });
  };

  useEffect(() => {
    const cached = loadCache();
    if (cached && Object.keys(cached).length > 0) {
      setTabs(cached);
      setCacheHit(true);
    }
  }, []);

  const generateCards = useCallback(async (tabKey: string, pageNum: number) => {
    // Guard: prevent concurrent calls for same tab
    if (loadingRef.current.has(tabKey)) return;
    const tab = getTab(tabKey);
    if (!tab.hasMore && pageNum > 0) return;
    
    // Cooldown: max 1 call per 2 seconds
    const now = Date.now();
    if (now - cooldownRef.current < 2000 && pageNum > 0) return;
    cooldownRef.current = now;
    
    loadingRef.current = new Set([...loadingRef.current, tabKey]);
    updateTab(tabKey, prev => ({ ...prev, loading: true }));
    
    // Small delay to allow UI to update
    await new Promise(r => setTimeout(r, 300));
    
    try {
      const data = crmRef.current;
      const context = JSON.stringify({ summary: data.summary, finances: data.finances, pulse: data.pulse, deals: data.deals }).substring(0, 4000);
      const tabConfig = TABS.find(t => t.key === tabKey) || TABS[0];
      const prompt = `${tabConfig.prompt}\n\nДанные CRM: ${context}\n\nТолько JSON массив. Числа точные. Суммы в ₽.`;
      const res = await api.post("/ai/coordinator", { content: prompt, skipTools: true, maxTokens: 2000 });
      const text = (res.data?.response || "").replace(/```json\n?|```/g, "").trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        updateTab(tabKey, prev => ({
          ...prev, cards: [...prev.cards, ...(parsed || []).map((c: any, i: number) => ({ ...c, id: `${tabKey}-${pageNum}-${i}-${Date.now()}`, type: c.type || "fact" }))],
          page: pageNum + 1, loading: false, hasMore: pageNum < 3, cacheTs: Date.now(),
        }));
      } else {
        updateTab(tabKey, prev => ({ ...prev, loading: false, hasMore: false }));
      }
    } catch (e: any) {
      updateTab(tabKey, prev => ({ ...prev, loading: false }));
    } finally {
      loadingRef.current = new Set([...loadingRef.current].filter(k => k !== tabKey));
    }
  }, []);

  // Initial load — use cache if available
  useEffect(() => {
    const tab = getTab(activeTab);
    if (tab.cards.length === 0 && !tab.loading) {
      generateCards(activeTab, 0);
    }
  }, [activeTab]);

  // Preload next tab silently (using ref to avoid dep on generateCards)
  useEffect(() => {
    const idx = TABS.findIndex(t => t.key === activeTab);
    const nextKey = TABS[(idx + 1) % TABS.length].key;
    if (!preloadDone.current.has(nextKey)) {
      const t = getTab(nextKey);
      if (t.cards.length === 0 && !t.loading) {
        preloadDone.current.add(nextKey);
        setTimeout(() => generateCards(nextKey, 0), 3000);
      }
    }
  }, [activeTab]); // removed generateCards from deps

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => { 
        if (entries[0].isIntersecting && !currentTab.loading && currentTab.hasMore) {
          if (Date.now() - cooldownRef.current > 2500) generateCards(activeTab, currentTab.page);
        }
      },
      { threshold: 0.3, rootMargin: "200px" }
    );
    if (loaderRef.current) observerRef.current.observe(loaderRef.current);
    return () => observerRef.current?.disconnect();
  }, [activeTab, currentTab.loading, currentTab.hasMore, currentTab.page]);

  const reactCard = (id: string, reaction: "liked" | "disliked") => {
    setReactions(prev => { const next = { ...prev }; if (next[id] === reaction) { delete next[id]; } else { next[id] = reaction; } localStorage.setItem("ai_dash_reactions", JSON.stringify(next)); return next; });
  };

  const copyCard = async (card: FeedCard) => {
    const text = [card.title, card.content, card.sub, card.label ? `${card.label}: ${card.value}` : "", card.value].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(text);
    setCopiedId(card.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const dismissCard = (tabKey: string, id: string) => updateTab(tabKey, prev => {
    const nd = new Set(prev.dismissed); nd.add(id);
    return { ...prev, dismissed: nd };
  });

  const resetTab = (tabKey: string) => {
    setTabs(prev => ({ ...prev, [tabKey]: defaultTab() }));
    saveCache(tabs);
    localStorage.setItem("ai_dash_reactions", JSON.stringify(reactions));
    generateCards(tabKey, 0);
  };

  const visibleCards = currentTab.cards.filter((c: FeedCard) => !currentTab.dismissed.has(c.id));

  return (
    <div>
      {/* Data changed banner */}
      {dataChanged && (
        <div className="flex items-center justify-between bg-violet-50 border border-violet-200 rounded-xl px-4 py-2.5 mb-3 text-xs">
          <div className="flex items-center gap-2 text-violet-700">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Данные CRM обновились</span>
          </div>
          <button onClick={() => { setDataChanged(false); resetTab(activeTab); }} className="px-3 py-1 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 transition-colors">
            Обновить карточки
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm border border-gray-100 sticky top-0 z-10">
        {TABS.map(tab => {
          const t = getTab(tab.key);
          const count = t.cards.filter(c => !t.dismissed.has(c.id)).length;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all relative cursor-pointer ${
                activeTab === tab.key ? "bg-violet-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}>
              {tab.label}
              {count > 0 && (
                <span className={`absolute -top-1 -right-0.5 min-w-[16px] h-[16px] text-[9px] font-bold rounded-full flex items-center justify-center ${activeTab === tab.key ? "bg-white text-violet-600" : "bg-violet-100 text-violet-600"}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-gray-700">{TABS.find(t => t.key === activeTab)?.label}</span>
          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{visibleCards.length}</span>
          {cacheHit && currentTab.cards.length > 0 && <History className="w-3 h-3 text-gray-300" />}
        </div>
        {visibleCards.length > 0 && (
            <button onClick={() => setCinemaMode(true)} className="flex items-center gap-1 px-2.5 py-1 text-[10px] bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all shadow-sm">
              <Film className="w-3 h-3" />Кино
            </button>
          )}
          <button onClick={() => resetTab(activeTab)} className="flex items-center gap-1 px-2.5 py-1 text-[10px] text-violet-600 hover:bg-violet-50 rounded-lg transition-colors cursor-pointer">
            <RefreshCw className="w-3 h-3" />Обновить
          </button>
      </div>

      {/* Cards feed */}
      <div className="space-y-4 min-h-[300px]">
        {currentTab.loading && visibleCards.length === 0 ? (
          <div className="space-y-4 animate-pulse">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 space-y-3 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2"><div className="w-8 h-8 bg-gray-200 rounded-xl" /><div className="h-3 bg-gray-200 rounded w-1/4" /></div>
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
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
          visibleCards.map(card => {
            const Icon = ICONS[card.type] || Sparkles;
            return (
              <div key={card.id} className={`relative bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group ${card.type === "metric" ? "p-0 overflow-hidden" : "p-5"}`}>
                {card.type !== "metric" && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button onClick={() => copyCard(card)} className="p-1 rounded-full hover:bg-gray-100 cursor-pointer" title="Копировать">
                      {copiedId === card.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                    </button>
                    <button onClick={() => dismissCard(activeTab, card.id)} className="p-1 rounded-full hover:bg-gray-100 cursor-pointer" title="Скрыть">
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                )}
                {/* Reaction buttons */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button onClick={(e) => { e.preventDefault(); reactCard(card.id, "liked"); }}
                    className={`p-1.5 rounded-full transition-all cursor-pointer ${reactions[card.id] === "liked" ? "bg-green-100 text-green-600 shadow-sm" : "bg-white/80 text-gray-400 hover:bg-green-50 hover:text-green-500"}`}
                    title="Нравится">
                    <svg className="w-3.5 h-3.5" fill={reactions[card.id] === "liked" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" /></svg>
                  </button>
                  <button onClick={(e) => { e.preventDefault(); reactCard(card.id, "disliked"); }}
                    className={`p-1.5 rounded-full transition-all cursor-pointer ${reactions[card.id] === "disliked" ? "bg-red-100 text-red-600 shadow-sm" : "bg-white/80 text-gray-400 hover:bg-red-50 hover:text-red-500"}`}
                    title="Не нравится">
                    <svg className="w-3.5 h-3.5" fill={reactions[card.id] === "disliked" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10zM17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" /></svg>
                  </button>
                </div>

                {card.type === "metric" ? (
                  <div className={`bg-gradient-to-br ${GRADIENT[card.color || "default"]} p-6 text-white relative overflow-hidden`}>
                    <button onClick={() => copyCard(card)} className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 opacity-0 group-hover:opacity-100 transition-all z-10 cursor-pointer" title="Копировать">
                      {copiedId === card.id ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-white/80" />}
                    </button>
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
                    <div className="relative z-10">
                      <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-2">{card.label}</p>
                      <p className="text-3xl font-bold">{card.value}</p>
                      {card.sub && <p className="text-sm text-white/70 mt-2 leading-relaxed">{card.sub}</p>}
                      {card.link ? (
                        <button onClick={(e) => { e.stopPropagation(); if (card.link) navigate(card.link); }} className="flex items-center gap-1 mt-3 text-xs text-white/60 hover:text-white transition-colors cursor-pointer">Подробнее <ArrowRight className="w-3 h-3" /></button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-9 h-9 rounded-xl ${ICON_BG[card.type] || ICON_BG.fact} flex items-center justify-center`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{TYPE_LABEL[card.type] || "Факт"}</span>
                        {card.severity && <span className={`ml-2 text-[10px] font-bold ${card.severity === "danger" ? "text-red-500" : "text-amber-500"}`}>{card.severity === "danger" ? "⚠" : "!"}</span>}
                      </div>
                    </div>
                    {card.title && <h3 className="text-sm font-bold text-gray-800 mb-2 leading-snug">{card.title}</h3>}
                    {card.content && <p className="text-xs text-gray-600 leading-relaxed mb-2">{card.content}</p>}
                    {card.sub && <p className="text-[11px] text-gray-500 bg-gray-50 rounded-lg p-2.5 leading-relaxed">{card.sub}</p>}
                    {card.link && (
                      <button onClick={(e) => { e.stopPropagation(); if (card.link) navigate(card.link); }} className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg text-xs font-medium hover:bg-violet-100 transition-colors cursor-pointer">
                        {card.type === "idea" ? "Открыть" : "Перейти"} <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}

        {/* Infinite scroll trigger */}
        <div ref={loaderRef} className="py-4 flex justify-center">
          {currentTab.loading && visibleCards.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-400 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Загружаем ещё...
            </div>
          )}
          {!currentTab.loading && !currentTab.hasMore && visibleCards.length > 0 && (
            <div className="text-xs text-gray-400 flex flex-col items-center gap-1 py-4">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span>Всё просмотрено</span>
              <button onClick={() => resetTab(activeTab)} className="text-violet-600 hover:underline text-xs">Обновить</button>
            </div>
          )}
        </div>
      </div>
          {cinemaMode && <CinemaMode cards={visibleCards} activeTab={activeTab} onClose={() => setCinemaMode(false)} />}
    </div>
  );
}
