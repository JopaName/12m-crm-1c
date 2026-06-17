import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksAPI, dealsAPI, authAPI } from "../api";
import toast from "react-hot-toast";
import { cn } from "../components/cn";
import { Plus, Search, LayoutDashboard, List, User, Briefcase, Calendar, AlertCircle, ChevronDown, Edit3, X, Check, ArrowUp, ArrowDown, Inbox, Clock, Flag, FileText } from "lucide-react";

const STATUSES = ["New", "InProgress", "Completed", "Cancelled"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const TYPES = ["General", "Legal", "Technical", "Service", "Procurement"];

const STATUS_META: Record<string, { color: string; bg: string; lightBg: string; icon: any; label: string }> = {
  New: { color: "text-primary-600", bg: "bg-primary-500", lightBg: "bg-primary-50", icon: FileText, label: "Новая" },
  InProgress: { color: "text-amber-600", bg: "bg-amber-500", lightBg: "bg-amber-50", icon: Clock, label: "В работе" },
  Completed: { color: "text-emerald-600", bg: "bg-emerald-500", lightBg: "bg-emerald-50", icon: Check, label: "Выполнена" },
  Cancelled: { color: "text-gray-400", bg: "bg-gray-400", lightBg: "bg-gray-50", icon: X, label: "Отменена" },
};

const PRIORITY_META: Record<string, { color: string; lightBg: string; label: string }> = {
  Critical: { color: "text-red-600", lightBg: "bg-red-50", label: "Крит." },
  High: { color: "text-orange-600", lightBg: "bg-orange-50", label: "Высокий" },
  Medium: { color: "text-yellow-600", lightBg: "bg-yellow-50", label: "Средний" },
  Low: { color: "text-gray-500", lightBg: "bg-gray-50", label: "Низкий" },
};

const TYPE_LABELS: Record<string, string> = {
  General: "Общая", Legal: "Юрид.", Technical: "Техн.", Service: "Сервис", Procurement: "Закупки",
};

type ViewMode = "kanban" | "list";

const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("ru-RU") : "";
const isOverdue = (dueDate: string | null | undefined) => dueDate ? new Date(dueDate) < new Date(new Date().toDateString()) : false;

export default function TasksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("kanban");
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterUser, setFilterUser] = useState("");

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksAPI.getAll().then((r) => r.data),
  });
  const { data: deals } = useQuery({
    queryKey: ["deals"],
    queryFn: () => dealsAPI.getAll().then((r) => r.data),
  });
  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => authAPI.getUsers().then((r) => r.data),
  });

  const userMap = useMemo(() => {
    const m: Record<string, string> = {};
    users?.forEach((u: any) => { m[u.id] = `${u.firstName} ${u.lastName}`; });
    return m;
  }, [users]);
  const dealMap = useMemo(() => {
    const m: Record<string, string> = {};
    deals?.forEach((d: any) => { m[d.id] = d.dealNumber; });
    return m;
  }, [deals]);

  const active = useMemo(() => {
    let items = tasks || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((t: any) => (t.title || "").toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q));
    }
    if (filterStatus) items = items.filter((t: any) => t.status === filterStatus);
    if (filterPriority) items = items.filter((t: any) => t.priority === filterPriority);
    if (filterType) items = items.filter((t: any) => t.type === filterType);
    if (filterUser) items = items.filter((t: any) => t.assignedUserId === filterUser);
    return items;
  }, [tasks, searchQuery, filterStatus, filterPriority, filterType, filterUser]);

  const createMutation = useMutation({
    mutationFn: (d: any) => tasksAPI.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Задача создана"); setShowForm(false); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => tasksAPI.update(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Статус обновлён"); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUSES.forEach((s) => (counts[s] = 0));
    let overdue = 0;
    (tasks || []).forEach((t: any) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
      if (isOverdue(t.dueDate) && t.status !== "Completed" && t.status !== "Cancelled") overdue++;
    });
    return { total: (tasks || []).length, overdue, counts };
  }, [tasks]);

  const kanbanColumns = STATUSES.map((status) => ({
    status, items: active.filter((t: any) => t.status === status), meta: STATUS_META[status],
  }));

  if (isLoading) return (
    <div className="max-w-7xl mx-auto p-6"><div className="animate-pulse space-y-6"><div className="h-8 bg-gray-200 rounded-lg w-48" /><div className="grid grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-96 bg-gray-100 rounded-xl" />)}</div></div></div>
  );

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2.5"><FileText className="w-6 h-6 text-primary-500" />Задачи</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        <div onClick={() => setFilterStatus("")} className={cn("bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm cursor-pointer transition-all hover:shadow-md", !filterStatus ? "ring-2 ring-offset-2 ring-primary-500 shadow-lg" : "")}>
          <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center"><FileText className="w-4 h-4 text-primary-600" /></div>
          <div><p className="text-lg font-bold text-gray-900">{stats.total}</p><p className="text-[11px] text-gray-500">Всего</p></div>
        </div>
        <div className={cn("rounded-xl border p-3 flex items-center gap-2.5 shadow-sm cursor-pointer transition-all hover:shadow-md", "bg-red-50")}
          onClick={() => { /* filter overdue */ }}>
          <AlertCircle className="w-4 h-4 text-red-600" />
          <div><p className="text-sm font-bold text-gray-900">{stats.overdue}</p><p className="text-[10px] text-gray-500 leading-tight">Просрочено</p></div>
        </div>
        {STATUSES.map((s) => {
          const Icon = STATUS_META[s].icon;
          return (
            <div key={s} onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
              className={cn("rounded-xl border p-3 flex items-center gap-2.5 shadow-sm cursor-pointer transition-all hover:shadow-md", STATUS_META[s].lightBg,
                filterStatus === s ? "ring-2 ring-offset-2 ring-gray-900 shadow-lg" : filterStatus ? "opacity-40 grayscale" : "")}>
              <Icon className={cn("w-4 h-4", STATUS_META[s].color)} />
              <div><p className="text-sm font-bold text-gray-900">{stats.counts[s] || 0}</p><p className="text-[10px] text-gray-500 leading-tight">{STATUS_META[s].label}</p></div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input placeholder="Поиск задач..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
          className="appearance-none px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer">
          <option value="">Все приоритеты</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="appearance-none px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer">
          <option value="">Все типы</option>
          {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)}
          className="appearance-none pl-8 pr-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer">
          <option value="">Все сотрудники</option>
          {users?.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
        </select>
        <div className="flex-1" />
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setView("kanban")} className={cn("p-1.5 rounded-md transition-all", view === "kanban" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")}><LayoutDashboard className="w-4 h-4" /></button>
          <button onClick={() => setView("list")} className={cn("p-1.5 rounded-md transition-all", view === "list" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")}><List className="w-4 h-4" /></button>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium shadow-sm"><Plus className="w-3.5 h-3.5" />Задача</button>
      </div>

      {view === "kanban" && (
        <div className={cn("grid gap-3", filterStatus ? "grid-cols-1 max-w-xl mx-auto" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4")}>
          {kanbanColumns.filter((col) => !filterStatus || col.status === filterStatus).map((col) => {
            const Icon = col.meta.icon;
            return (
              <div key={col.status} className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
                <div className={cn("flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 rounded-t-xl", col.meta.lightBg)}>
                  <Icon className={cn("w-4 h-4", col.meta.color)} />
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex-1 truncate">{col.meta.label}</h3>
                  <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center text-white", col.meta.bg)}>{col.items.length}</span>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)]">
                  {col.items.length === 0 && <div className="flex flex-col items-center justify-center py-10 text-gray-300"><Inbox className="w-8 h-8 mb-2" /><p className="text-xs">Пусто</p></div>}
                  {col.items.map((t: any) => {
                    const overdue = isOverdue(t.dueDate) && t.status !== "Completed" && t.status !== "Cancelled";
                    return (
                      <div key={t.id} className={cn("bg-white rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md",
                        overdue ? "border-l-4 border-l-red-500" : "border-gray-200")}>
                        <div className="p-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-gray-900 text-[13px] leading-snug line-clamp-2 flex-1">{t.title}</p>
                            {t.priority && <span className={cn("text-[10px] font-bold px-1 py-0.5 rounded shrink-0", PRIORITY_META[t.priority]?.color)}>{PRIORITY_META[t.priority]?.label}</span>}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>{fmtDate(t.createdAt)}</span>
                            {t.dueDate && <span className={overdue ? "text-red-600 ml-2" : "text-gray-400"}>— {fmtDate(t.dueDate)}</span>}
                          </div>
                          {t.assignedUserId && <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5"><User className="w-3 h-3" /><span>{userMap[t.assignedUserId] || "—"}</span></div>}
                          {t.type && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mt-1.5 inline-block">{TYPE_LABELS[t.type] || t.type}</span>}
                          {t.dealId && dealMap[t.dealId] && <span className="text-[10px] text-primary-500 cursor-pointer hover:text-primary-700 ml-1 bg-primary-50 px-1.5 py-0.5 rounded inline-block" onClick={(e: any) => { e.stopPropagation(); navigate("/deals#" + encodeURIComponent(dealMap[t.dealId])); }}>{dealMap[t.dealId]}</span>}
                        </div>
                        {t.status !== "Completed" && t.status !== "Cancelled" && (
                          <div className="flex border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => statusMutation.mutate({ id: t.id, status: "InProgress" })}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                              {t.status === "New" ? <><ArrowUp className="w-3 h-3" />В работу</> : <><Check className="w-3 h-3" />Завершить</>}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "list" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {active.length === 0 && <div className="flex flex-col items-center justify-center py-16 text-gray-300"><Search className="w-12 h-12 mb-3" /><p className="text-sm text-gray-400">{searchQuery ? "Ничего не найдено" : "Нет задач"}</p></div>}
          <div className="divide-y divide-gray-100">
            {active.map((t: any) => {
              const overdue = isOverdue(t.dueDate) && t.status !== "Completed" && t.status !== "Cancelled";
              return (
                <div key={t.id} className={cn("flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group", overdue && "bg-red-50/30")}>
                  <div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_META[t.status]?.bg || "bg-gray-400")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 text-sm truncate">{t.title}</p>
                      {overdue && <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded whitespace-nowrap">Просрочено</span>}
                      {t.priority && <span className={cn("text-[10px] font-bold px-1 py-0.5 rounded", PRIORITY_META[t.priority]?.lightBg, PRIORITY_META[t.priority]?.color)}>{PRIORITY_META[t.priority]?.label}</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400 mt-0.5">
                      {t.type && <span>{TYPE_LABELS[t.type]}</span>}
                      {t.dealId && dealMap[t.dealId] && <span className="text-primary-500 cursor-pointer hover:text-primary-700" onClick={() => navigate("/deals#" + encodeURIComponent(dealMap[t.dealId]))}>{dealMap[t.dealId]}</span>}
                      {t.assignedUserId && <span><User className="w-3 h-3 inline mr-1" />{userMap[t.assignedUserId]}</span>}
                      <span><Calendar className="w-3 h-3 inline mr-1" />{fmtDate(t.createdAt)}</span>
                      {t.dueDate && <span className={overdue ? "text-red-600" : ""}>{fmtDate(t.dueDate)}</span>}
                    </div>
                  </div>
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_META[t.status]?.lightBg, STATUS_META[t.status]?.color)}>{STATUS_META[t.status]?.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showForm && <TaskFormModal onClose={() => setShowForm(false)} users={users} deals={deals}
        onSubmit={(d) => createMutation.mutate(d)} isPending={createMutation.isPending} />}
    </div>
  );
}

function TaskFormModal({ onClose, users, deals, onSubmit, isPending }: {
  onClose: () => void; users?: any[]; deals?: any[]; onSubmit: (d: any) => void; isPending: boolean;
}) {
  const [f, setF] = useState({ title: "", description: "", type: "General", priority: "Medium", assignedUserId: "", dealId: "", dueDate: "" });

  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Plus className="w-4 h-4 text-primary-500" />Новая задача</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Название <span className="text-red-500">*</span></label>
            <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Тип</label>
              <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Приоритет</label>
              <select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}</select></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Сотрудник</label>
            <select value={f.assignedUserId} onChange={(e) => setF({ ...f, assignedUserId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
              <option value="">Не назначен</option>{users?.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}</select></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Сделка</label>
            <select value={f.dealId} onChange={(e) => setF({ ...f, dealId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
              <option value="">Не привязана</option>{deals?.map((d: any) => <option key={d.id} value={d.id}>{d.dealNumber}</option>)}</select></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Срок</label>
            <input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Описание</label>
            <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none" rows={2} /></div>
        </div>
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
          <div className="flex-1" /><button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Отмена</button>
          <button onClick={() => { if (!f.title.trim()) { toast.error("Введите название"); return; } onSubmit(f); }} disabled={isPending}
            className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50 shadow-sm">{isPending ? "Создание..." : "Создать"}</button>
        </div>
      </div>
    </div>
  );
}
