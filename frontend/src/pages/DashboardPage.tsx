import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api, { dashboardAPI, dealsAPI, referralAPI } from "../api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import AiDashboardView from "../components/AiDashboardView";
import { AlertCircle } from "lucide-react";

const WIDGETS = [
  { key: "summary", label: "Сводка", icon: "\u{1F4CA}" },
  { key: "finances", label: "Финансы", icon: "\u{1F4B0}" },
  { key: "pulse", label: "Пульс", icon: "\u2764\uFE0F" },
  { key: "actions", label: "Быстрые действия", icon: "\u26A1" },
  { key: "sales", label: "Мои метрики", icon: "\u{1F4C8}" },
  { key: "pipeline", label: "Воронка сделок", icon: "\u{1F3AF}" },
  { key: "ai_insights", label: "AI Инсайты", icon: "\u{1F9E0}" },
];

function getStorageKey(userId: string) {
  return `dash_widgets_${userId}`;
}

function loadWidgets(userId: string): string[] {
  const defaults = WIDGETS.map((w) => w.key);
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (raw) {
      const saved = JSON.parse(raw);
      const missing = defaults.filter((k: string) => !saved.includes(k));
      return missing.length > 0 ? [...saved, ...missing] : saved;
    }
  } catch {}
  return defaults;
}

interface SummaryData {
  totalClients: number;
  totalLeads: number;
  totalDeals: number;
  totalProducts: number;
  activeRentals: number;
  pendingTasks: number;
  monthlyRevenue: number;
  totalProcurementRequests: number;
}

interface FinanceData {
  totalInvoiced: number;
  totalPaid: number;
  totalOverdue: number;
}

interface PulseData {
  ordersInProgress: number;
  cellOccupancy: number;
  totalCells: number;
  filledCells: number;
  newLeadsToday: number;
  overdueTasks: number;
}

function SummaryWidget({ data }: { data?: SummaryData }) {
  const navigate = useNavigate();
  const items = [
    { label: "Закупки", value: data?.totalProcurementRequests ?? "-", color: "text-teal-600", path: "/procurement" },
    { label: "Лиды", value: data?.totalLeads ?? "-", color: "text-purple-600" },
    { label: "Сделки", value: data?.totalDeals ?? "-", color: "text-green-600" },
    { label: "Товары", value: data?.totalProducts ?? "-", color: "text-orange-600" },
    { label: "Аренда", value: data?.activeRentals ?? "-", color: "text-indigo-600" },
    { label: "Задачи", value: data?.pendingTasks ?? "-", color: "text-red-600" },
    { label: "Выручка", value: data?.monthlyRevenue ? `${(data.monthlyRevenue / 1000).toFixed(0)}k` : "0", color: "text-emerald-600" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {items.map((item) => (
        item.path ? (
          <div key={item.label} onClick={() => navigate(item.path)}
            className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm cursor-pointer hover:shadow-md hover:border-gray-300 transition-all">
            <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
            <div className="text-xs text-gray-400 mt-1">{item.label}</div>
          </div>
        ) : (
          <div key={item.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
            <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
            <div className="text-xs text-gray-400 mt-1">{item.label}</div>
          </div>
        )
      ))}
    </div>
  );
}

function FinanceWidget({ data }: { data?: FinanceData }) {
  const maxV = Math.max(data?.totalInvoiced ?? 1, 1);
  const bars = [
    { label: "Выставлено", value: data?.totalInvoiced ?? 0, color: "bg-blue-500" },
    { label: "Оплачено", value: data?.totalPaid ?? 0, color: "bg-green-500" },
    { label: "Просрочено", value: data?.totalOverdue ?? 0, color: "bg-red-500" },
  ];
  return (
    <div className="space-y-4">
      {bars.map((bar) => (
        <div key={bar.label}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">{bar.label}</span>
            <span className="font-semibold">{bar.value.toLocaleString()} {"\u20BD"}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className={`${bar.color} h-2.5 rounded-full transition-all duration-500`}
              style={{ width: `${Math.min((bar.value / maxV) * 100, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function PulseWidget({ data }: { data?: PulseData }) {
  const items = [
    { label: "Заказы в работе", value: data?.ordersInProgress ?? 0, icon: "\u{1F4E6}" },
    { label: "Ячейки склада", value: `${data?.filledCells ?? 0}/${data?.totalCells ?? 0}`, icon: "\u{1F3ED}" },
    { label: "Новых лидов сегодня", value: data?.newLeadsToday ?? 0, icon: "\u{1F4A1}" },
    { label: "Просроченных задач", value: data?.overdueTasks ?? 0, icon: "\u26A0\uFE0F" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
          <span className="text-2xl">{item.icon}</span>
          <div>
            <div className="text-lg font-bold text-gray-800">{item.value}</div>
            <div className="text-xs text-gray-400">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}


function AiInsightsWidget({ user }: { user: any }) {
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState<{label: string; action: string; icon: string}[]>([]);

  const prompts = [
    "Проанализируй текущее состояние CRM и дай 3 кратких инсайта. Формат: 'Инсайт: ...' каждый с новой строки. Добавь кликабельные действия: \"ДЕЙСТВИЕ: название | команда\" (например: \"ДЕЙСТВИЕ: Создать сделку | /deals\"). Будь креативным.",
    "Какие риски ты видишь в текущих данных CRM? Дай 2-3 предупреждения и предложи действия. Используй формат: 'Инсайт: ...' и 'ДЕЙСТВИЕ: название | команда'",
    "Предложи 3 нестандартных идеи для увеличения продаж на основе данных CRM. Формат: 'Инсайт: ...' и 'ДЕЙСТВИЕ: ...'",
    "Найди интересные закономерности в CRM и расскажи о них. Сделай это в стиле 'умного ассистента'. Формат: 'Инсайт: ...' и 'ДЕЙСТВИЕ: ...'",
    "Представь что ты AI-директор. Дай 2-3 стратегических совета на основе метрик CRM. Формат: 'Инсайт: ...' и 'ДЕЙСТВИЕ: ...'",
  ];

  const fetchInsight = async () => {
    setLoading(true);
    try {
      const prompt = prompts[Math.floor(Math.random() * prompts.length)];
      const res = await api.post("/ai/coordinator", { content: prompt });
      const text = res.data?.response || "";
      // Parse insights and actions
      const lines = text.split("\n").filter(Boolean);
      const parsedActions: {label: string; action: string; icon: string}[] = [];
      let displayText = "";
      lines.forEach((line: string) => {
        if (line.toUpperCase().startsWith("ДЕЙСТВИЕ:") || line.toUpperCase().startsWith("ДЕЙСТВИЕ ")) {
          const parts = line.replace(/^ДЕЙСТВИЕ:?\s*/i, "").split("|");
          if (parts.length >= 2) {
            parsedActions.push({ label: parts[0].trim(), action: parts[1].trim(), icon: "\u{1F449}" });
          }
        } else {
          displayText += line + "\n";
        }
      });
      setInsight(displayText.trim() || text.substring(0, 300));
      setActions(parsedActions);
    } catch (e) {
      setInsight("Не удалось загрузить инсайты. Попробуйте снова.");
    }
    setLoading(false);
  };

  useEffect(() => { fetchInsight(); }, []);

  const handleAction = (action: string) => {
    if (action.startsWith("/")) {
      window.location.href = action;
    } else {
      // For other commands, send to AI
      api.post("/ai/coordinator", { content: action }).then(r => {
        const resp = r.data?.response || "Выполнено";
        setInsight(prev => prev + "\n\n" + "Результат: " + resp.substring(0, 200));
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <span className="text-lg">{"\u{1F9E0}"}</span>AI Инсайты
        </h3>
        <button
          onClick={fetchInsight}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-white/50 transition-colors disabled:opacity-50 text-gray-400 hover:text-gray-600"
          title="Обновить"
        >
          {loading ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          )}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      ) : (
        <>
          <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
            {insight.split("\n").map((line, i) => {
              if (line.startsWith("Инсайт")) {
                return <p key={i} className="font-medium text-gray-800 mt-1.5 mb-0.5">{line}</p>;
              }
              return <p key={i} className="text-gray-600">{line}</p>;
            })}
          </div>
          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200">
              {actions.map((a, i) => (
                <button
                  key={i}
                  onClick={() => handleAction(a.action)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 rounded-lg text-xs font-medium text-primary-700 transition-all shadow-sm hover:shadow"
                >
                  <span>{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}


function SalesMetricsWidget({ deals, earnings, user }: { deals: any[]; earnings: any; user: any }) {
  const myDeals = (deals || []).filter((d) => d.responsibleAgentId === (user?.id || ""));
  const myActive = myDeals.filter((d) => d.status !== "Deal_Closed");
  const myClosed = myDeals.filter((d) => d.status === "Deal_Closed");
  const myAmount = myActive.reduce((s, d) => s + (d.expectedAmount || 0), 0);
  const myClosedAmount = myClosed.reduce((s, d) => s + (d.expectedAmount || 0), 0);
  const myCommission = (earnings?.total || 0);
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { label: "Мои сделки", value: myDeals.length, sub: myActive.length + " активных", color: "text-blue-600" },
        { label: "В работе", value: myAmount.toLocaleString() + " \u20bd", sub: myActive.length + " сделок", color: "text-amber-600" },
        { label: "Закрыто", value: myClosed.length, sub: myClosedAmount.toLocaleString() + " \u20bd", color: "text-green-600" },
        { label: "Комиссия", value: myCommission.toLocaleString() + " \u20bd", sub: "Реф. доход", color: "text-purple-600" },
      ].map((m, i) => (
        <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
          <p className={"text-lg font-bold " + m.color}>{m.value}</p>
          <p className="text-[10px] text-gray-500">{m.label}</p>
          <p className="text-[9px] text-gray-400">{m.sub}</p>
        </div>
      ))}
    </div>
  );
}

function PipelineWidget({ data, totalPipeline, maxCount, user }: { data: any[]; totalPipeline: number; maxCount: number; user: any }) {
  const navigate = useNavigate();
  const myId = user?.id || "";
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span>Воронка: <strong className="text-gray-700">{totalPipeline.toLocaleString()} ₽</strong></span>
        <span>{data.reduce((s, d) => s + d.count, 0)} сделок</span>
      </div>
      {data.map((stage) => {
        const pct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
        const isActive = stage.status !== "Deal_Closed";
        return (
          <div key={stage.status} className="group cursor-pointer" onClick={() => navigate("/deals")}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-gray-700">{stage.label}</span>
              <span className="text-gray-400">{stage.count} сделок · {stage.total.toLocaleString()} ₽</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div className={stage.color + " h-3 rounded-full transition-all duration-700"} style={{ width: Math.max(stage.count > 0 ? 3 : 0, pct) + "%" }} />
            </div>
            {stage.stuck > 0 && (
              <div className="flex items-center gap-1 mt-1 text-[10px] text-red-500">
                <AlertCircle className="w-3 h-3" />{stage.stuck} застряли (7+ дней)
              </div>
            )}
          </div>
        );
      })}
      <button onClick={() => navigate("/deals")} className="w-full mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium text-center">
        Открыть канбан →
      </button>
    </div>
  );
}

function ActionsWidget() {
  const navigate = useNavigate();
  const actions = [
    { label: "Новый клиент", path: "/clients", icon: "\u{1F465}" },
    { label: "Новая сделка", path: "/deals", icon: "\u{1F91D}" },
    { label: "Новая задача", path: "/tasks", icon: "\u2705" },
    { label: "Написать в чат", path: "/chat", icon: "\u{1F4AC}" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((a) => (
        <button
          key={a.path}
          onClick={() => navigate(a.path)}
          className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
        >
          <span className="text-xl">{a.icon}</span>
          <span className="text-sm font-medium text-gray-700">{a.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();


  const userId = user?.id || "anon";
  const [activeWidgets, setActiveWidgets] = useState<string[]>(() => loadWidgets(userId));
  const [editing, setEditing] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [aiMode, setAiMode] = useState(false);

  useEffect(() => {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(activeWidgets));
  }, [activeWidgets, userId]);

  const { data: myDealsData } = useQuery({ queryKey: ["deals"], queryFn: () => dealsAPI.getAll().then(r => r.data || r) });

  // Pipeline metrics (must be AFTER myDealsData declaration)
  const dealsList = Array.isArray(myDealsData) ? myDealsData : (myDealsData?.data || []);
  const PST = ["Lead_Created", "Invoice_Generation", "Legal_Review", "Doc_Sending", "Waiting_Payment", "Paid_And_Reserved", "Issuing_Goods", "Deal_Closed"];
  const PSL = { Lead_Created: "Лид", Invoice_Generation: "Счёт", Legal_Review: "Юристы", Doc_Sending: "Документы", Waiting_Payment: "Оплата", Paid_And_Reserved: "Резерв", Issuing_Goods: "Отгрузка", Deal_Closed: "Закрыто" };
  const PSC = { Lead_Created: "bg-blue-500", Invoice_Generation: "bg-yellow-500", Legal_Review: "bg-purple-500", Doc_Sending: "bg-indigo-500", Waiting_Payment: "bg-orange-500", Paid_And_Reserved: "bg-teal-500", Issuing_Goods: "bg-cyan-500", Deal_Closed: "bg-green-500" };
  const pipelineData = PST.map(s => {
    const stageDeals = dealsList.filter(d => d.status === s);
    const total = stageDeals.reduce((sum, d) => sum + (d.expectedAmount || 0), 0);
    const stuck = stageDeals.filter(d => new Date(d.createdAt).getTime() < Date.now() - 7 * 86400000).length;
    return { status: s, label: PSL[s], color: PSC[s], count: stageDeals.length, total, stuck };
  });
  const totalPipeline = dealsList.filter(d => d.status !== "Deal_Closed").reduce((s, d) => s + (d.expectedAmount || 0), 0);
  const maxCount = Math.max(...pipelineData.map(p => p.count), 1);
  const { data: myEarnings } = useQuery({ queryKey: ["referral-earnings"], queryFn: () => referralAPI.getEarnings() });
  const myDeals = Array.isArray(myDealsData) ? myDealsData : (myDealsData?.data || []);
  const myActive = myDeals.filter((d) => d.status !== "Deal_Closed" && d.responsibleAgentId === (user?.id || ""));
  const myClosed = myDeals.filter((d) => d.status === "Deal_Closed" && d.responsibleAgentId === (user?.id || ""));
  const myAmount = myActive.reduce((s, d) => s + (d.expectedAmount || 0), 0);
  const myClosedAmount = myClosed.reduce((s, d) => s + (d.expectedAmount || 0), 0);
  const myCommission = (myEarnings?.total || 0);

  const { data: summary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => dashboardAPI.getSummary().then((r) => r.data as SummaryData),
    refetchInterval: 30000,
  });

  const { data: finances } = useQuery({
    queryKey: ["dashboard-finance"],
    queryFn: () => dashboardAPI.getFinance().then((r) => r.data as FinanceData),
    refetchInterval: 30000,
  });

  const { data: pulse } = useQuery({
    queryKey: ["dashboard-pulse"],
    queryFn: () => dashboardAPI.getPulse().then((r) => r.data as PulseData),
    refetchInterval: 30000,
  });

  const crmDataForAI = {
    summary, finances, pulse,
    deals: dealsList?.slice(0, 10)?.map((d: any) => ({ dealNumber: d.dealNumber, status: d.status, expectedAmount: d.expectedAmount, client: d.client?.name })),
    pipeline: pipelineData, myActive: myActive?.length, myClosed: myClosed?.length, myAmount, myCommission,
  };

  const orderedWidgets = WIDGETS.filter((w) => activeWidgets.includes(w.key));
  const hiddenWidgets = WIDGETS.filter((w) => !activeWidgets.includes(w.key));

  const toggleWidget = (key: string) => {
    setActiveWidgets((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const newOrder = [...activeWidgets];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(targetIdx, 0, moved);
    setActiveWidgets(newOrder);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const widgetContent: Record<string, React.ReactNode> = {
    summary: <SummaryWidget data={summary} />,
    finances: <FinanceWidget data={finances} />,
    pulse: <PulseWidget data={pulse} />,
    actions: <ActionsWidget />,
    pipeline: <PipelineWidget data={pipelineData} totalPipeline={totalPipeline} maxCount={maxCount} user={user} />,
    sales: <SalesMetricsWidget deals={myDealsData} earnings={myEarnings} user={user} />,
    ai_insights: <AiInsightsWidget user={user} />,
  };

  const widgetBg: Record<string, string> = {
    summary: "bg-gradient-to-br from-blue-50 to-white border-blue-100",
    finances: "bg-gradient-to-br from-green-50 to-white border-green-100",
    pulse: "bg-gradient-to-br from-purple-50 to-white border-purple-100",
    actions: "bg-gradient-to-br from-yellow-50 to-white border-yellow-100",
    ai_insights: "bg-gradient-to-br from-violet-50 to-white border-violet-100",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {"\u{1F44B}"} {user?.firstName}, добро пожаловать!
          </h1>
          <p className="text-sm text-gray-400 mt-1">Панель управления CRM</p>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            editing
              ? "bg-primary-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {editing ? "\u2713 Готово" : "\u2699 Настроить"}
        </button>
      </div>

      {/* Widgets */}
      <div className="space-y-4">
        {orderedWidgets.map((widget, idx) => (
          <div
            key={widget.key}
            draggable={editing}
            onDragStart={() => editing && handleDragStart(idx)}
            onDragOver={(e) => editing && handleDragOver(e, idx)}
            onDrop={() => editing && handleDrop(idx)}
            onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
            className={`relative rounded-xl border p-4 ${widgetBg[widget.key] || "bg-white border-gray-100"} shadow-sm transition-all ${
              editing ? "cursor-grab active:cursor-grabbing ring-2 ring-blue-200" : ""
            } ${dragOverIdx === idx && editing ? "ring-2 ring-blue-400 scale-[1.01]" : ""}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                {editing && (
                  <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z" />
                  </svg>
                )}
                {widget.icon} {widget.label}
              </h3>
              {editing && (
                <button
                  onClick={() => toggleWidget(widget.key)}
                  className="text-xs text-red-400 hover:text-red-600 bg-red-50 px-2 py-0.5 rounded"
                >
                  Скрыть
                </button>
              )}
            </div>
            {widgetContent[widget.key]}
          </div>
        ))}
      </div>

      {/* Hidden widgets panel when editing */}
      {editing && hiddenWidgets.length > 0 && (
        <div className="mt-6 p-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
          <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">
            Скрытые виджеты
          </h4>
          <div className="flex flex-wrap gap-2">
            {hiddenWidgets.map((w) => (
              <button
                key={w.key}
                onClick={() => toggleWidget(w.key)}
                className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                + {w.icon} {w.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
