import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksAPI, dealsAPI, authAPI } from "../api";
import toast from "react-hot-toast";
import { cn } from "../components/cn";
import { Plus, Search, LayoutDashboard, List, User, Building2, Calendar, AlertCircle, Edit3, Trash2, X, Check, ArrowUp, ArrowLeft, ArrowRight, Inbox, Clock, FileText, Briefcase, ChevronLeft, ChevronRight, Save, CheckSquare, Square } from "lucide-react";

const STATUSES = ["New", "InProgress", "Completed", "Cancelled"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const TYPES = ["General", "Legal", "Technical", "Service", "Procurement"];
const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const DAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

const STATUS_META: Record<string, { color: string; bg: string; lightBg: string; icon: any; label: string }> = {
  New: { color: "text-primary-600", bg: "bg-primary-500", lightBg: "bg-primary-50", icon: FileText, label: "Новая" },
  InProgress: { color: "text-amber-600", bg: "bg-amber-500", lightBg: "bg-amber-50", icon: Clock, label: "В работе" },
  Completed: { color: "text-emerald-600", bg: "bg-emerald-500", lightBg: "bg-emerald-50", icon: Check, label: "Выполнена" },
  Cancelled: { color: "text-gray-400", bg: "bg-gray-400", lightBg: "bg-gray-50", icon: X, label: "Отменена" },
};
const PRIORITY_META: Record<string, { color: string; lightBg: string; label: string }> = {
  Critical: { color: "text-red-600", lightBg: "bg-red-50", label: "Крит." }, High: { color: "text-orange-600", lightBg: "bg-orange-50", label: "Высокий" },
  Medium: { color: "text-yellow-600", lightBg: "bg-yellow-50", label: "Средний" }, Low: { color: "text-gray-500", lightBg: "bg-gray-50", label: "Низкий" },
};
const TYPE_LABELS: Record<string, string> = { General: "Общая", Legal: "Юрид.", Technical: "Техн.", Service: "Сервис", Procurement: "Закупки" };

const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("ru-RU") : "";
const isOverdue = (d: string | null) => d ? new Date(d) < new Date(new Date().toDateString()) : false;
const getWeekDay = (d: Date) => { let w = d.getDay(); return w === 0 ? 6 : w - 1; };
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

type ViewMode = "kanban" | "list" | "calendar";

export default function TasksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("kanban");
  const [showForm, setShowForm] = useState(false);
  const [detailTask, setDetailTask] = useState<any | null>(null);
  const [searchParams] = useSearchParams();
  const [editingTask, setEditingTask] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [quickDate, setQuickDate] = useState("");

  // Auto-open create form from URL params
  useEffect(() => {
    if (searchParams.get("openCreate") === "1") {
      const cid = searchParams.get("clientId");
      if (cid) { setShowForm(true); }
    }
  }, []);

  const { data: tasks, isLoading } = useQuery({ queryKey: ["tasks"], queryFn: () => tasksAPI.getAll().then(r => r.data) });
  const { data: deals } = useQuery({ queryKey: ["deals"], queryFn: () => dealsAPI.getAll().then(r => r.data) });
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => authAPI.getUsers().then(r => r.data) });

  const userMap = useMemo(() => { const m: Record<string, string> = {}; users?.forEach((u: any) => { m[u.id] = `${u.firstName} ${u.lastName}`; }); return m; }, [users]);
  const dealMap = useMemo(() => { const m: Record<string, string> = {}; deals?.forEach((d: any) => { m[d.id] = d.dealNumber; }); return m; }, [deals]);

  const allTasks = tasks || [];
  const active = useMemo(() => {
    let items = allTasks;
    if (searchQuery) { const q = searchQuery.toLowerCase(); items = items.filter((t: any) => (t.title || "").toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q)); }
    if (filterStatus) items = items.filter((t: any) => t.status === filterStatus);
    if (filterPriority) items = items.filter((t: any) => t.priority === filterPriority);
    if (filterType) items = items.filter((t: any) => t.type === filterType);
    if (filterUser) items = items.filter((t: any) => t.assigneeId === filterUser);
    return items;
  }, [allTasks, searchQuery, filterStatus, filterPriority, filterType, filterUser]);

  const createMutation = useMutation({
    mutationFn: (d: any) => tasksAPI.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Задача создана"); setShowForm(false); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tasksAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Обновлено"); setEditingTask(null); setShowForm(false); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => tasksAPI.update(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Статус обновлён"); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(id => tasksAPI.update(id, { isArchived: true }))),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); toast.success(`Удалено задач: ${selectedIds.size}`); setSelectedIds(new Set()); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksAPI.update(id, { isArchived: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Задача удалена"); setConfirmDelete(false); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const stats = useMemo(() => {
    const c: Record<string, number> = {}; STATUSES.forEach(s => { c[s] = 0; });
    let od = 0;
    allTasks.forEach((t: any) => { c[t.status] = (c[t.status] || 0) + 1; if (isOverdue(t.dueDate) && t.status !== "Completed" && t.status !== "Cancelled") od++; });
    return { total: allTasks.length, overdue: od, counts: c };
  }, [allTasks]);

  const kanbanColumns = STATUSES.map(s => ({ status: s, items: active.filter((t: any) => t.status === s), meta: STATUS_META[s] }));

  const getPrevStatus = (s: string) => { const i = STATUSES.indexOf(s); return i > 0 ? STATUSES[i - 1] : null; };
  const getNextStatus = (s: string) => { const i = STATUSES.indexOf(s); return i >= 0 && i < STATUSES.length - 2 ? STATUSES[i + 1] : null; };
  const toggleSelect = (id: string) => setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => { setSelectedIds(new Set(active.map((t: any) => t.id))); };
  const clearSelection = () => { setSelectedIds(new Set()); setSelectMode(false); };

  // Calendar data
  const calendarTasks = allTasks.filter((t: any) => t.dueDate && !t.isArchived);
  const dim = daysInMonth(calYear, calMonth);
  const firstDay = new Date(calYear, calMonth, 1);
  const startOffset = getWeekDay(firstDay);
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  const eventsByDay: Record<string, any[]> = {};
  calendarTasks.forEach((t: any) => {
    const d = new Date(t.dueDate);
    if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
      const k = d.getDate().toString();
      if (!eventsByDay[k]) eventsByDay[k] = [];
      eventsByDay[k].push(t);
    }
  });
  const todayStr = today.toDateString();
  const isToday = (d: number) => new Date(calYear, calMonth, d).toDateString() === todayStr;
  const upcoming = calendarTasks.filter((t: any) => {
    const diff = (new Date(t.dueDate).getTime() - today.getTime()) / 86400000;
    return diff >= -1 && diff <= 30 && t.status !== "Completed" && t.status !== "Cancelled";
  }).sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  if (isLoading) return <div className="max-w-7xl mx-auto p-6"><div className="animate-pulse space-y-6"><div className="h-8 bg-gray-200 rounded-lg w-48" /><div className="grid grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-96 bg-gray-100 rounded-xl" />)}</div></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2.5"><FileText className="w-6 h-6 text-primary-500" />Задачи</h1>
        <div className="flex bg-gray-100 rounded-lg p-0.5 text-sm">
          {(["kanban", "list", "calendar"] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)} className={cn("px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5", view === v ? "bg-white text-gray-900 shadow-sm font-medium" : "text-gray-500")}>
              {v === "kanban" && <LayoutDashboard className="w-3.5 h-3.5" />}{v === "list" && <List className="w-3.5 h-3.5" />}{v === "calendar" && <Calendar className="w-3.5 h-3.5" />}
              {v === "kanban" ? "Канбан" : v === "list" ? "Список" : "Календарь"}
            </button>))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        <div onClick={() => setFilterStatus("")} className={cn("bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm cursor-pointer hover:shadow-md", !filterStatus ? "ring-2 ring-offset-2 ring-primary-500 shadow-lg" : "")}>
          <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center"><FileText className="w-4 h-4 text-primary-600" /></div>
          <div><p className="text-lg font-bold text-gray-900">{stats.total}</p><p className="text-[11px] text-gray-500">Всего</p></div></div>
        <div className="rounded-xl border p-3 flex items-center gap-2.5 shadow-sm bg-red-50 cursor-pointer">
          <AlertCircle className="w-4 h-4 text-red-600" /><div><p className="text-sm font-bold text-gray-900">{stats.overdue}</p><p className="text-[10px] text-gray-500">Просрочено</p></div></div>
        {STATUSES.map(s => { const Icon = STATUS_META[s].icon; return (
          <div key={s} onClick={() => setFilterStatus(filterStatus === s ? "" : s)} className={cn("rounded-xl border p-3 flex items-center gap-2.5 shadow-sm cursor-pointer hover:shadow-md", STATUS_META[s].lightBg, filterStatus === s ? "ring-2 ring-offset-2 ring-gray-900 shadow-lg" : filterStatus ? "opacity-40 grayscale" : "")}>
            <Icon className={cn("w-4 h-4", STATUS_META[s].color)} /><div><p className="text-sm font-bold text-gray-900">{stats.counts[s] || 0}</p><p className="text-[10px] text-gray-500">{STATUS_META[s].label}</p></div></div>);})}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input placeholder="Поиск задач..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-8 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-3.5 h-3.5" /></button>}</div>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="appearance-none px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none cursor-pointer">
          <option value="">Все приоритеты</option>{PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}</select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="appearance-none px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none cursor-pointer">
          <option value="">Все типы</option>{TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select>
        <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="appearance-none px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none cursor-pointer">
          <option value="">Все сотрудники</option>{users?.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}</select>
        <div className="flex-1" />
        <button onClick={() => { clearSelection(); setSelectMode(!selectMode); }}
          className={cn("flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all font-medium", selectMode ? "bg-gray-800 text-white shadow-sm" : "bg-white text-gray-500 border border-gray-200 hover:border-gray-400")}>
          {selectMode ? <X className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
          {selectMode ? "Отмена" : "Выбрать"}
        </button>
        <button onClick={() => { setEditingTask(null); setQuickDate(""); setShowForm(true); }} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-sm"><Plus className="w-3.5 h-3.5" />Задача</button>
      </div>

      {/* Kanban/List/Calendar content */}
      {/* Select all bar */}
      {selectMode && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-white rounded-xl border border-gray-200 shadow-sm animate-slide-up">
          <button onClick={() => selectedIds.size === active.length ? clearSelection() : selectAll()}
            className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
            {selectedIds.size === active.length ? <Square className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
            {selectedIds.size === active.length ? "Снять всё" : "Выбрать все"}
          </button>
          <div className="flex-1" />
          <span className="text-sm text-gray-500">{selectedIds.size > 0 ? `Выбрано: ${selectedIds.size}` : "Нажмите на задачи чтобы выбрать"}</span>
        </div>
      )}
      
      {/* Kanban */}
      {view === "kanban" && (
        <div className={cn("grid gap-3", filterStatus ? "grid-cols-1 max-w-xl mx-auto" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4")}>
          {kanbanColumns.filter(col => !filterStatus || col.status === filterStatus).map(col => {
            const Icon = col.meta.icon;
            return (
              <div key={col.status} className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
                <div className={cn("flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 rounded-t-xl", col.meta.lightBg)}>
                  <Icon className={cn("w-4 h-4", col.meta.color)} /><h3 className="text-xs font-semibold text-gray-700 uppercase flex-1 truncate">{col.meta.label}</h3>
                  <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full text-white", col.meta.bg)}>{col.items.length}</span></div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)]">
                  {col.items.length === 0 && <div className="flex flex-col items-center justify-center py-10 text-gray-300"><Inbox className="w-8 h-8 mb-2" /><p className="text-xs">Пусто</p></div>}
                  {col.items.map((t: any) => {
                    const overdue = isOverdue(t.dueDate) && t.status !== "Completed" && t.status !== "Cancelled";
                    const prev = getPrevStatus(t.status);
                    const next = getNextStatus(t.status);
                    return (
                      <div key={t.id} className={cn("bg-white rounded-lg border shadow-sm hover:shadow-md transition-all",
                        selectedIds.has(t.id) && selectMode ? "ring-2 ring-primary-500 border-primary-500 shadow-glow" : "",
                        overdue ? "border-l-4 border-l-red-500" : "border-gray-200")}>
                        <div className="p-2.5 cursor-pointer relative" onClick={() => { if (selectMode) toggleSelect(t.id); else { setDetailTask(t); } }}>
                          {/* Selection checkbox - visible in selectMode */}
                          {selectMode && (
                            <div className="absolute top-2 right-2 z-10" onClick={e => e.stopPropagation()}>
                              <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer", selectedIds.has(t.id) ? "bg-primary-500 border-primary-500" : "border-gray-300 bg-white hover:border-primary-400")}
                                onClick={() => toggleSelect(t.id)}>
                                {selectedIds.has(t.id) && <Check className="w-3 h-3 text-white" />}
                              </div></div>)}
                          <div className="flex items-start justify-between gap-2"><p className="font-semibold text-gray-900 text-[13px] line-clamp-2 flex-1">{t.title}</p>
                            {t.priority && <span className={cn("text-[10px] font-bold px-1 py-0.5 rounded shrink-0", PRIORITY_META[t.priority]?.color)}>{PRIORITY_META[t.priority]?.label}</span>}</div>
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1"><Calendar className="w-3 h-3" /><span>{fmtDate(t.createdAt)}</span>
                            {t.dueDate && <span className={overdue ? "text-red-600 ml-2" : "text-gray-400"}>— {fmtDate(t.dueDate)}</span>}</div>
                          {t.assigneeId && <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5"><User className="w-3 h-3" /><button onClick={e => { e.stopPropagation(); setViewUserId(t.assigneeId); }} className="hover:text-primary-600 hover:underline transition-colors">{userMap[t.assigneeId] || "—"}</button></div>}
                          {t.type && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mt-1.5 inline-block">{TYPE_LABELS[t.type] || t.type}</span>}
                          {t.dealId && dealMap[t.dealId] && <span className="text-[10px] text-primary-500 cursor-pointer hover:text-primary-700 ml-1 bg-primary-50 px-1.5 py-0.5 rounded inline-block" onClick={e => { e.stopPropagation(); navigate("/deals#" + encodeURIComponent(dealMap[t.dealId])); }}>{dealMap[t.dealId]}</span>}
                        </div>
                        {(prev || next) && (
                          <div className="flex border-t border-gray-100" onClick={e => e.stopPropagation()}>
                            {prev && <button onClick={() => statusMutation.mutate({ id: t.id, status: prev })} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] text-gray-400 hover:text-gray-600 hover:bg-gray-50 border-r border-gray-100"><ArrowLeft className="w-3 h-3" />{STATUS_META[prev]?.label}</button>}
                            {next && <button onClick={() => statusMutation.mutate({ id: t.id, status: next })} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-primary-600 hover:bg-gray-50">{STATUS_META[next]?.label}<ArrowUp className="w-3 h-3" /></button>}
                          </div>)}
                      </div>);})}
                </div></div>);})}
        </div>)}

      {/* List */}
      {view === "list" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {active.length === 0 && <div className="py-16 text-center text-gray-400"><Search className="w-12 h-12 mx-auto mb-3" /><p className="text-sm">{searchQuery ? "Ничего не найдено" : "Нет задач"}</p></div>}
          <div className="divide-y divide-gray-100">{active.map((t: any) => {
            const overdue = isOverdue(t.dueDate) && t.status !== "Completed" && t.status !== "Cancelled";
            const prev = getPrevStatus(t.status);
            const next = getNextStatus(t.status);
            return (
              <div key={t.id} className={cn("flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group cursor-pointer transition-all",
                overdue && "bg-red-50/30", selectedIds.has(t.id) && selectMode && "bg-primary-50 ring-1 ring-primary-300")}
                onClick={() => { if (selectMode) toggleSelect(t.id); else { setDetailTask(t); } }}>
                {selectMode && (
                  <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer", selectedIds.has(t.id) ? "bg-primary-500 border-primary-500" : "border-gray-300 hover:border-primary-400")}
                    onClick={e => { e.stopPropagation(); toggleSelect(t.id); }}>
                    {selectedIds.has(t.id) && <Check className="w-3 h-3 text-white" />}
                  </div>)}
                <div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_META[t.status]?.bg || "bg-gray-400")} />
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="font-medium text-gray-900 text-sm truncate">{t.title}</p>
                  {overdue && <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Просрочено</span>}
                  {t.priority && <span className={cn("text-[10px] font-bold px-1 py-0.5 rounded", PRIORITY_META[t.priority]?.lightBg, PRIORITY_META[t.priority]?.color)}>{PRIORITY_META[t.priority]?.label}</span>}</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400 mt-0.5">
                    {t.type && <span>{TYPE_LABELS[t.type]}</span>}
                    {t.dealId && dealMap[t.dealId] && <span className="text-primary-500 cursor-pointer hover:text-primary-700" onClick={e => { e.stopPropagation(); navigate("/deals#" + encodeURIComponent(dealMap[t.dealId])); }}>{dealMap[t.dealId]}</span>}
                    {t.assigneeId && <button onClick={e => { e.stopPropagation(); setViewUserId(t.assigneeId); }} className="hover:text-primary-600 hover:underline"><User className="w-3 h-3 inline mr-1" />{userMap[t.assigneeId]}</button>}
                    <span><Calendar className="w-3 h-3 inline mr-1" />{fmtDate(t.createdAt)}</span>
                    {t.dueDate && <span className={overdue ? "text-red-600" : ""}>{fmtDate(t.dueDate)}</span>}</div></div>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_META[t.status]?.lightBg, STATUS_META[t.status]?.color)}>{STATUS_META[t.status]?.label}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 items-center" onClick={e => e.stopPropagation()}>
                  {prev && <button onClick={() => statusMutation.mutate({ id: t.id, status: prev })} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded" title={STATUS_META[prev]?.label}><ArrowLeft className="w-3 h-3" /></button>}
                  {next && <button onClick={() => statusMutation.mutate({ id: t.id, status: next })} className="p-1 text-primary-400 hover:text-primary-600 hover:bg-primary-50 rounded" title={STATUS_META[next]?.label}><ArrowUp className="w-3 h-3" /></button>}
                  <button onClick={() => { setDetailTask(t); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { if (confirm("Удалить задачу?")) deleteMutation.mutate(t.id); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button></div></div>);})}
          </div></div>)}

      {/* Calendar */}
      {view === "calendar" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-5 h-5 text-gray-500" /></button>
              <h2 className="text-lg font-bold text-gray-800">{MONTHS[calMonth]} {calYear}</h2>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="grid grid-cols-7 border-b border-gray-100">{DAYS.map(d => <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase">{d}</div>)}</div>
            <div className="grid grid-cols-7">
              {cells.map((d, i) => {
                const evts = d ? (eventsByDay[d.toString()] || []) : [];
                return (
                  <div key={i} onClick={() => { if (d) { setQuickDate(`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`); setShowForm(true); } }}
                    className={cn("min-h-[80px] border-b border-r border-gray-50 p-1.5 transition-colors cursor-pointer", d && isToday(d) ? "bg-primary-50/50" : "hover:bg-gray-50", !d ? "bg-gray-50/30" : "")}>
                    {d && <span className={cn("text-xs font-semibold inline-block w-6 h-6 rounded-full text-center leading-6", isToday(d) ? "bg-primary-600 text-white" : "text-gray-600")}>{d}</span>}
                    <div className="space-y-0.5 mt-0.5">{evts.slice(0, 3).map((t: any) => (
                      <div key={t.id} onClick={ev => { ev.stopPropagation(); setDetailTask(t); }}
                        className={cn("flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-medium truncate", t.status === "Completed" ? "bg-emerald-500 text-white" : t.status === "InProgress" ? "bg-amber-500 text-white" : "bg-primary-500 text-white")}>
                        {t.title}</div>))}
                      {evts.length > 3 && <span className="text-[9px] text-gray-400 px-1">+{evts.length - 3}</span>}</div></div>);})}
            </div>
          </div>
          {/* Upcoming timeline */}
          {upcoming.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /><h3 className="text-sm font-semibold text-gray-700">Ближайшие ({upcoming.length})</h3></div>
              <div className="divide-y divide-gray-50">{upcoming.slice(0, 8).map((t: any) => {
                const d = new Date(t.dueDate); const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
                return (
                  <div key={t.id} onClick={() => { setDetailTask(t); }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer group">
                    <div className="w-10 text-center shrink-0"><div className={cn("text-sm font-bold", diff < 0 ? "text-red-500" : "text-gray-800")}>{d.getDate()}</div>
                      <div className={cn("text-[9px] uppercase", diff < 0 ? "text-red-400" : "text-gray-400")}>{MONTHS[d.getMonth()].substring(0, 3)}</div></div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                      <p className="text-[10px] text-gray-400">{TYPE_LABELS[t.type] || t.type} • {STATUS_META[t.status]?.label} {diff === 0 ? "• Сегодня" : diff < 0 ? `• ${-diff} дн.` : `• Через ${diff} дн.`}</p></div>
                    <div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_META[t.status]?.bg)} /></div>);})}
              </div></div>)}
        </div>)}

      {/* Floating delete bar */}
      {selectedIds.size > 0 && selectMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 bg-gray-900 text-white rounded-2xl shadow-2xl animate-slide-up">
          <span className="text-sm font-medium">{selectedIds.size} задач выбрано</span>
          <div className="w-px h-5 bg-white/20" />
          <button onClick={() => { if (confirm(`Удалить ${selectedIds.size} задач?`)) { bulkDeleteMutation.mutate(Array.from(selectedIds)); clearSelection(); } }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors">
            <Trash2 className="w-4 h-4" />Удалить</button>
          <button onClick={clearSelection} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Task Detail Modal */}
      {detailTask && (() => {
        const t = detailTask;
        const overdue = isOverdue(t.dueDate) && t.status !== "Completed" && t.status !== "Cancelled";
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDetailTask(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-primary-500" />{t.title}</h3>
                <button onClick={() => setDetailTask(null)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
              <div className="px-5 py-3 space-y-2 text-sm">
                {t.description && <p className="text-gray-600">{t.description}</p>}
                <div className="flex flex-wrap items-center gap-3">
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_META[t.status]?.lightBg, STATUS_META[t.status]?.color)}>{STATUS_META[t.status]?.label}</span>
                  {t.priority && <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", PRIORITY_META[t.priority]?.lightBg, PRIORITY_META[t.priority]?.color)}>{PRIORITY_META[t.priority]?.label}</span>}
                  {t.type && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{TYPE_LABELS[t.type] || t.type}</span>}
                  {overdue && <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Просрочено</span>}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {t.createdAt && <span><Calendar className="w-3.5 h-3.5 inline mr-1" />Создана: {fmtDate(t.createdAt)}</span>}
                  {t.dueDate && <span className={overdue ? "text-red-600" : ""}>Срок: {fmtDate(t.dueDate)}</span>}
                </div>
                {t.assigneeId && userMap[t.assigneeId] && (
                  <div className="flex items-center gap-1.5 text-xs text-primary-500 cursor-pointer hover:text-primary-700" onClick={() => { setDetailTask(null); setViewUserId(t.assigneeId); }}>
                    <User className="w-3.5 h-3.5 inline" />{userMap[t.assigneeId]}
                  </div>
                )}
                {t.dealId && dealMap[t.dealId] && (
                  <div className="flex items-center gap-1.5 text-xs text-primary-500 cursor-pointer hover:text-primary-700" onClick={() => { setDetailTask(null); navigate("/deals#" + encodeURIComponent(dealMap[t.dealId])); }}>
                    <Briefcase className="w-3.5 h-3.5 inline" />Сделка: {dealMap[t.dealId]}
                  </div>
                )}
                {(() => {
                  if (!t.dealId) return null;
                  const linkedDeal = deals?.find((d: any) => d.id === t.dealId);
                  const clientName = linkedDeal?.client?.name;
                  const clientId = linkedDeal?.clientId;
                  if (!clientName) return null;
                  return (
                    <div className="flex items-center gap-1.5 text-xs text-primary-500 cursor-pointer hover:text-primary-700" onClick={() => { setDetailTask(null); navigate("/clients#" + encodeURIComponent(clientName)); }}>
                      <Building2 className="w-3.5 h-3.5 inline" />Клиент: {clientName}
                    </div>
                  );
                })()}
              </div>
              {/* Edit/Delete bar — same style as client modal */}
              <div className="flex items-center gap-2 px-5 py-2.5 border-t border-gray-100 bg-gray-50/50">
                <button onClick={() => { setDetailTask(null); setEditingTask(t); setShowForm(true); }} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors">
                  <Edit3 className="w-3.5 h-3.5" />Редактировать</button>
                <button onClick={() => { if (confirm("Удалить задачу \"" + t.title + "\"?")) { deleteMutation.mutate(t.id); setDetailTask(null); } }} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />Удалить</button>
                <div className="flex-1" />
              </div>
              {/* Status movement */}
              <div className="flex items-center gap-2 px-5 py-2.5 border-t border-gray-100 bg-gray-50/50">
                {getPrevStatus(t.status) && (
                  <button onClick={() => { statusMutation.mutate({ id: t.id, status: getPrevStatus(t.status)! }); setDetailTask(null); }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <ArrowLeft className="w-3 h-3" />{STATUS_META[getPrevStatus(t.status)!]?.label}</button>
                )}
                <div className="flex-1" />
                {getNextStatus(t.status) && (
                  <button onClick={() => { statusMutation.mutate({ id: t.id, status: getNextStatus(t.status)! }); setDetailTask(null); }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                    {STATUS_META[getNextStatus(t.status)!]?.label}<ArrowRight className="w-3 h-3" /></button>
                )}
              </div>
              <div className="flex items-center justify-end px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                <button onClick={() => setDetailTask(null)} className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors">Закрыть</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Form Modal */}
      {showForm && <TaskFormModal task={editingTask} onClose={() => { setShowForm(false); setEditingTask(null); }} users={users} deals={deals}
        quickDate={quickDate}
        onSubmit={(d) => editingTask ? updateMutation.mutate({ id: editingTask.id, data: d }) : createMutation.mutate(d)}
        isPending={createMutation.isPending || updateMutation.isPending} />}
      {viewUserId && <ProfileModal user={null} profileUserId={viewUserId} onClose={() => setViewUserId(null)} />}
    </div>
  );
}

function TaskFormModal({ task, onClose, users, deals, onSubmit, isPending, quickDate }: any) {
  const [f, setF] = useState(task ? {
    title: task.title || "", description: task.description || "", type: task.type || "General", priority: task.priority || "Medium",
    assigneeId: task.assigneeId || "", dealId: task.dealId || "", dueDate: task.dueDate ? task.dueDate.split("T")[0] : ""
  } : { title: "", description: "", type: "General", priority: "Medium", assigneeId: "", dealId: "", dueDate: quickDate || "" });

  const handleSubmit = () => {
    if (!f.title.trim()) { toast.error("Введите название"); return; }
    onSubmit({ title: f.title, description: f.description, type: f.type, assigneeId: f.assigneeId || undefined, priority: f.priority, dueDate: f.dueDate || undefined, dealId: f.dealId || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-primary-500" />{task ? "Редактировать" : "Новая"} задача</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button></div>
        <div className="px-5 py-4 space-y-3">
          <input placeholder="Название *" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <select value={f.type} onChange={e => setF({ ...f, type: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">{TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select>
            <select value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">{PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}</select></div>
          <select value={f.assigneeId} onChange={e => setF({ ...f, assigneeId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"><option value="">Не назначен</option>{users?.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}</select>
          <select value={f.dealId} onChange={e => setF({ ...f, dealId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"><option value="">Не привязана</option>{deals?.map((d: any) => <option key={d.id} value={d.id}>{d.dealNumber}</option>)}</select>
          <input type="date" value={f.dueDate} onChange={e => setF({ ...f, dueDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
          <textarea placeholder="Описание" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none resize-none" />
        </div>
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
          <div className="flex-1" /><button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Отмена</button>
          <button onClick={handleSubmit} disabled={isPending} className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm"><Save className="w-3.5 h-3.5 mr-1 inline" />{task ? "Сохранить" : "Создать"}</button></div>
      </div></div>);
}
