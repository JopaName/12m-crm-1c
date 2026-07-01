import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { clientsAPI, dealsAPI, tasksAPI } from "../api";

const ROUTE_LABELS: Record<string, string> = {
  clients: "Клиенты", deals: "Лиды", products: "Номенклатура",
  tasks: "Задачи", warehouse: "Склад", production: "Производство",
  procurement: "Закупки", legal: "Договоры", service: "Сервис",
  installation: "Монтажи", rent: "Аренда", users: "Пользователи",
  roles: "Роли", chat: "Чат", referrals: "Рефералы",
  workflow: "Воркфлоу", sales: "Продажи", earnings: "Доход",
  invite: "Пригласить", config: "Комиссии",
};

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // ALL hooks MUST be called unconditionally — before any early returns.
  // Compute segment info from pathname (always available, no hooks).
  const segments = pathname.split("/").filter(Boolean);

  // Resolve entity ID if the second segment looks like an ID (not a known sub-route label)
  const clientId = segments[0] === "clients" && segments[1] && !ROUTE_LABELS[segments[1]] ? segments[1] : null;
  const dealId = segments[0] === "deals" && segments[1] && !ROUTE_LABELS[segments[1]] ? segments[1] : null;
  const taskId = segments[0] === "tasks" && segments[1] && !ROUTE_LABELS[segments[1]] ? segments[1] : null;

  // ALWAYS call these hooks — stable count on every render
  const { data: client } = useQuery({
    queryKey: ["client-name", clientId],
    queryFn: () => clientsAPI.getById(clientId!).then(r => r.data),
    enabled: !!clientId,
  });

  const { data: deal } = useQuery({
    queryKey: ["deal-name", dealId],
    queryFn: () => dealsAPI.getById(dealId!).then(r => r.data),
    enabled: !!dealId,
  });

  const { data: task } = useQuery({
    queryKey: ["task-name", taskId],
    queryFn: () => tasksAPI.getAll().then(r => { const list = r.data || r; return Array.isArray(list) ? list.find((t: any) => t.id === taskId) : null; }),
    enabled: !!taskId,
  });

  // Now decide whether to show breadcrumbs (JSX-level, no hooks below)
  if (pathname === "/" || pathname === "/login") return null;
  if (segments.length === 0) return null;

  // Build breadcrumb items from segments — uses ROUTE_LABELS and resolved entity names
  const items = segments.map((seg, i) => {
    const target = "/" + segments.slice(0, i + 1).join("/");
    const isLast = i === segments.length - 1;

    let label = ROUTE_LABELS[seg] || seg;
    if (i > 0 && !ROUTE_LABELS[seg]) {
      const prev = segments[i - 1];
      if (prev === "clients" && client) label = client.name || seg;
      else if (prev === "deals" && deal) label = deal.dealNumber || seg;
      else if (prev === "tasks" && task) label = task.title || seg;
      else if (seg.length > 20) label = seg.slice(0, 8) + "...";
    }

    return { label, target, isLast };
  });

  return (
    <nav className="flex items-center gap-1 text-xs text-gray-400 mb-4 overflow-x-auto whitespace-nowrap">
      <button onClick={() => navigate("/")} className="hover:text-primary-600 transition-colors">
        <Home className="w-3.5 h-3.5" />
      </button>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <ChevronRight className="w-3 h-3 shrink-0" />
          {item.isLast ? (
            <span className="text-gray-600 font-medium truncate max-w-[200px]">{item.label}</span>
          ) : (
            <button onClick={() => navigate(item.target)} className="hover:text-primary-600 transition-colors truncate max-w-[150px]">
              {item.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
