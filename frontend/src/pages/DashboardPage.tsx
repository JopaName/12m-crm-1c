import React, { useEffect, useNavigate, useState } from "react";;
import { useQuery } from "@tanstack/react-query";
import { dashboardAPI, dealsAPI, referralAPI } from "../api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const WIDGETS = [
  { key: "summary", label: "Сводка", icon: "\u{1F4CA}" },
  { key: "finances", label: "Финансы", icon: "\u{1F4B0}" },
  { key: "pulse", label: "Пульс", icon: "\u2764\uFE0F" },
  { key: "actions", label: "Быстрые действия", icon: "\u26A1" },
  { key: "sales", label: "Мои метрики", icon: "\u{1F4C8}" },
];

function getStorageKey(userId: string) {
  return `dash_widgets_${userId}`;
}

function loadWidgets(userId: string): string[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return WIDGETS.map((w) => w.key);
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

  useEffect(() => {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(activeWidgets));
  }, [activeWidgets, userId]);

  const { data: myDealsData } = useQuery({ queryKey: ["deals"], queryFn: () => dealsAPI.getAll().then(r => r.data || r) });
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
    sales: <SalesMetricsWidget deals={myDealsData} earnings={myEarnings} user={user} />,
  };

  const widgetBg: Record<string, string> = {
    summary: "bg-gradient-to-br from-blue-50 to-white border-blue-100",
    finances: "bg-gradient-to-br from-green-50 to-white border-green-100",
    pulse: "bg-gradient-to-br from-purple-50 to-white border-purple-100",
    actions: "bg-gradient-to-br from-yellow-50 to-white border-yellow-100",
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
