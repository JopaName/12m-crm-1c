import { useQuery } from "@tanstack/react-query";
import { dashboardAPI } from "../api";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: summary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => dashboardAPI.getSummary().then((r) => r.data),
  });

  const { data: finance } = useQuery({
    queryKey: ["dashboard-finance"],
    queryFn: () => dashboardAPI.getFinance().then((r) => r.data),
  });

  const { data: pulse } = useQuery({
    queryKey: ["dashboard-pulse"],
    queryFn: () => dashboardAPI.getPulse().then((r) => r.data),
    refetchInterval: 30000,
  });

  const cards = [
    {
      label: "Клиенты",
      value: summary?.totalClients || 0,
      color: "bg-blue-500",
      link: "/clients",
    },
    {
      label: "Лиды",
      value: summary?.totalLeads || 0,
      color: "bg-green-500",
      link: "/leads",
    },
    {
      label: "Сделки",
      value: summary?.totalDeals || 0,
      color: "bg-purple-500",
      link: "/deals",
    },
    {
      label: "Аренда",
      value: summary?.activeRentals || 0,
      color: "bg-orange-500",
      link: "/rent",
    },
    {
      label: "Задачи",
      value: summary?.pendingTasks || 0,
      color: "bg-red-500",
      link: "/tasks",
    },
    {
      label: "Монтажи",
      value: summary?.activeInstallations || 0,
      color: "bg-teal-500",
      link: "/installation",
    },
    {
      label: "Товары",
      value: summary?.totalProducts || 0,
      color: "bg-indigo-500",
      link: "/products",
    },
  ];

  const pulseWidgets = [
    {
      label: "Заказы в работе",
      value: pulse?.ordersInProgress ?? "...",
      icon: "⚙️",
      color: "text-blue-700",
      bg: "bg-blue-50",
      link: "/production",
    },
    {
      label: "Занятость ячеек",
      value: pulse ? `${pulse.cellOccupancy}%` : "...",
      sub: pulse ? `${pulse.filledCells}/${pulse.totalCells}` : undefined,
      icon: "🏭",
      color: "text-amber-700",
      bg: "bg-amber-50",
      link: "/warehouse",
    },
    {
      label: "Новые лиды сегодня",
      value: pulse?.newLeadsToday ?? "...",
      icon: "📋",
      color: "text-green-700",
      bg: "bg-green-50",
      link: "/leads",
    },
    {
      label: "Просроченные задачи",
      value: pulse?.overdueTasks ?? "...",
      icon: "⚠️",
      color: "text-red-700",
      bg: "bg-red-50",
      link: "/tasks",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Дашборд директора
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div
            key={card.label}
            onClick={() => navigate(card.link)}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
          >
            <p className="text-sm text-gray-500 mb-1">{card.label}</p>
            <p className="text-3xl font-bold text-gray-800">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {pulseWidgets.map((w) => (
          <div
            key={w.label}
            onClick={() => navigate(w.link)}
            className={`${w.bg} rounded-xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">{w.icon}</span>
              <span className={`text-2xl font-bold ${w.color}`}>{w.value}</span>
            </div>
            <p className="text-sm text-gray-700">{w.label}</p>
            {w.sub && <p className="text-xs text-gray-500 mt-0.5">{w.sub}</p>}
          </div>
        ))}
      </div>

      {finance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Выставлено счетов</p>
            <p className="text-2xl font-bold text-blue-600">
              {finance.totalInvoiced.toLocaleString()} ₽
            </p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Оплачено</p>
            <p className="text-2xl font-bold text-green-600">
              {finance.totalPaid.toLocaleString()} ₽
            </p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Просрочено</p>
            <p className="text-2xl font-bold text-red-600">
              {finance.totalOverdue.toLocaleString()} ₽
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Модули системы
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { name: "Клиенты", path: "/clients", icon: "👥" },
            { name: "Лиды", path: "/leads", icon: "📋" },
            { name: "Сделки", path: "/deals", icon: "🤝" },
            { name: "Товары", path: "/products", icon: "📦" },
            { name: "Склад", path: "/warehouse", icon: "🏭" },
            { name: "Производство", path: "/production", icon: "⚙️" },
            { name: "Закупки", path: "/procurement", icon: "📥" },
            { name: "Аренда", path: "/rent", icon: "🔑" },
            { name: "Монтажи", path: "/installation", icon: "🔧" },
            { name: "Монтаж (моб.)", path: "/installer-mobile", icon: "📱" },
            { name: "Договоры", path: "/legal", icon: "📄" },
            { name: "Сервис", path: "/service", icon: "🛠️" },
            { name: "Задачи", path: "/tasks", icon: "✅" },
          ].map((mod) => (
            <div
              key={mod.path}
              onClick={() => navigate(mod.path)}
              className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100 text-sm"
            >
              <span>{mod.icon}</span>
              <span className="text-gray-700">{mod.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
