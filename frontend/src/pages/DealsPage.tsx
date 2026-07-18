import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dealsAPI, authAPI, tasksAPI } from "../api";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { STATUSES, STATUS_META } from "../constants/deals";
import PipelineEditor, { getPipelineConfig, fetchPipeline } from "../components/PipelineEditor";
import DealFormModal from "../components/DealFormModal";
import DealDetailPanel from "../components/DealDetailPanel";
import ProfileModal from "../components/ProfileModal";
import TaskFormModal from "../components/TaskFormModal";
import toast from "react-hot-toast";
import { cn } from "../components/cn";
import { Plus, Search, LayoutDashboard, List, User, Building2, Calendar, AlertCircle, ChevronDown, Edit3, X, DollarSign, ArrowRight, ArrowLeft, Phone, Mail, Briefcase, Inbox, Trash2, Save, Eye, Shield, CreditCard, FileText, Circle } from "lucide-react";

const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("ru-RU") : "";

export default function DealsPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("kanban");
  const [showForm, setShowForm] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskDealId, setTaskDealId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [dealTasks, setDealTasks] = useState<Record<string, any[]>>({});
  const [taskLoading, setTaskLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailDeal, setDetailDeal] = useState<any | null>(null);
  const [viewUserId, setViewUserId] = useState<string | null>(null);

  const taskCreateMutation = useMutation({
    mutationFn: (d: any) => tasksAPI.create(d),
    onSuccess: () => {
      setShowTaskModal(false);
      setNewTaskTitle("");
      toast.success("Задача создана");
      // Refresh tasks for kanban
      const token = localStorage.getItem("token");
      fetch("/api/tasks", { headers: { Authorization: "Bearer " + token } })
        .then(r => r.json()).then(tasks => {
          const map: Record<string, any[]> = {};
          (Array.isArray(tasks) ? tasks : []).forEach((t: any) => {
            if (t.dealId) { if (!map[t.dealId]) map[t.dealId] = []; map[t.dealId].push(t); }
          });
          setDealTasks(map);
        }).catch(() => {});
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });
  const [showPipelineEditor, setShowPipelineEditor] = useState(false);
  const [pipelineStages, setPipelineStages] = useState(getPipelineConfig);
  const [pipelineReady, setPipelineReady] = useState(false);
  useEffect(() => { fetchPipeline().then(stages => { if (stages.length > 0) { setPipelineStages(stages); } setPipelineReady(true); }).catch(() => { setPipelineReady(true); }); }, []);
  const PST = pipelineStages.map(s => s.key);
  const PSL: Record<string, string> = Object.fromEntries(pipelineStages.map(s => [s.key, s.label]));
  const PSC: Record<string, string> = Object.fromEntries(pipelineStages.map(s => [s.key, `bg-${s.color}-500`]));
  // Dynamic STATUS_META from pipeline config + hardcoded defaults for backward compat
  const dynamicStatusMeta = useMemo(() => {
    const meta: Record<string, any> = {};
    pipelineStages.forEach(s => {
      meta[s.key] = {
        label: s.label,
        color: `text-${s.color}-600`,
        bg: `bg-${s.color}-500`,
        lightBg: `bg-${s.color}-50`,
        icon: Circle, // Default icon
      };
    });
    // Merge with original STATUS_META for backward compat
    Object.keys(STATUS_META).forEach(k => {
      if (!meta[k]) meta[k] = STATUS_META[k];
    });
    return meta;
  }, [pipelineStages]);
  const { user } = useAuth();
  const canEdit = user?.permissions?.includes("deals.edit") ?? true;
  const canDelete = user?.permissions?.includes("deals.delete") ?? true;
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [searchParams] = useSearchParams();
  const [newDealClientId, setNewDealClientId] = useState("");
  const [editDealData, setEditDealData] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dragDealId, setDragDealId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("openCreate") === "1") {
      const cid = searchParams.get("clientId");
      if (cid) { setNewDealClientId(cid); setShowForm(true); }
    }
  }, []);


  const { data: deals, isLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: () => dealsAPI.getAll().then((r) => r.data),
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => authAPI.getUsers().then((r) => r.data),
  });

  // Load tasks for all deals
  useEffect(() => {
    if (!deals || deals.length === 0) return;
    const token = localStorage.getItem("token");
    fetch("/api/tasks", { headers: { Authorization: "Bearer " + token } })
      .then(r => r.json()).then(tasks => {
        const map: Record<string, any[]> = {};
        (Array.isArray(tasks) ? tasks : (tasks?.data || tasks?.tasks || [])).forEach((t: any) => {
          if (t.dealId) {
            if (!map[t.dealId]) map[t.dealId] = [];
            map[t.dealId].push(t);
          }
        });
        setDealTasks(map);
      }).catch(() => {});
  }, [deals]);

  const createMutation = useMutation({
    mutationFn: (d: any) => dealsAPI.create({ ...d, status: (PST.length > 0 ? PST[0] : STATUSES[0]) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["deals"] }); toast.success("Лид создан"); setShowForm(false); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  // Read hash for cross-navigation from other pages
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) { setSearchQuery(decodeURIComponent(hash)); window.location.hash = ""; }
  }, []);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => dealsAPI.updateStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["deals"] }); toast.success("Статус обновлён"); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => dealsAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["deals"] }); toast.success("Лид обновлён"); setEditDealData(null); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dealsAPI.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["deals"] }); toast.success("Лид удалён"); setDetailDeal(null); setConfirmDelete(false); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const userMap = useMemo(() => {
    const m: Record<string, string> = {};
    users?.forEach((u: any) => { m[u.id] = `${u.firstName} ${u.lastName}`; });
    return m;
  }, [users]);



  const active = useMemo(() => {
    let items = deals || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((d: any) =>
        (d.dealNumber || "").toLowerCase().includes(q) ||
        
        (d.description || "").toLowerCase().includes(q)
      );
    }
    if (filterStatus) items = items.filter((d: any) => d.status === filterStatus);
    if (filterAgent) items = items.filter((d: any) => d.responsibleAgentId === filterAgent);
       return items;
  }, [deals, searchQuery, filterStatus, filterAgent]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    PST.forEach((s) => (counts[s] = 0));
    (deals || []).forEach((d: any) => { counts[d.status] = (counts[d.status] || 0) + 1; });
    return { total: (deals || []).length, counts };
  }, [deals]);

  const kanbanColumns = PST.map((status) => ({
    status,
    items: active.filter((d: any) => d.status === status),
    meta: dynamicStatusMeta[status] || { label: status, color: "text-gray-600", bg: "bg-gray-500", lightBg: "bg-gray-50", icon: Circle },
  }));

  const getPrevStatus = (current: string): string | null => {
    const idx = PST.indexOf(current);
    return idx > 0 ? PST[idx - 1] : null;
  };
  const getNextStatuses = (current: string): string[] => {
    const idx = STATUSES.indexOf(current);
    return idx >= 0 && idx < PST.length - 1 ? PST.slice(idx + 1) : [];
  };

  if (isLoading) return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded-lg w-48" />
        <div className="h-16 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (<div key={i} className="h-96 bg-gray-100 rounded-xl" />))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
          <Briefcase className="w-6 h-6 text-primary-500" />Лиды
        </h1>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2 mb-4">
        <div onClick={() => setFilterStatus("")}
          className={cn("bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm cursor-pointer transition-all hover:shadow-md",
            !filterStatus ? "ring-2 ring-offset-2 ring-primary-500 shadow-lg" : "")}>
          <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-primary-600" />
          </div>
          <div><p className="text-lg font-bold text-gray-900">{stats.total}</p><p className="text-[11px] text-gray-500">Всего</p></div>
        </div>
        {PST.map((s) => {
          const Icon = dynamicStatusMeta[s]?.icon || null;
          return (
            <div key={s} onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
              className={cn("rounded-xl border p-3 flex items-center gap-2.5 shadow-sm cursor-pointer transition-all hover:shadow-md",
                (dynamicStatusMeta[s]?.lightBg || "bg-gray-50"),
                filterStatus === s ? "ring-2 ring-offset-2 ring-gray-900 shadow-lg" : filterStatus ? "opacity-40 grayscale" : "")}>
              <Icon className={cn("w-4 h-4", (dynamicStatusMeta[s]?.color || "text-gray-600"))} />
              <div><p className="text-sm font-bold text-gray-900">{stats.counts[s] || 0}</p><p className="text-[10px] text-gray-500 leading-tight">{(dynamicStatusMeta[s]?.label || s)}</p></div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="Поиск по номеру, клиенту..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="relative">
          <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)}
            className="appearance-none pl-8 pr-7 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all cursor-pointer">
            <option value="">Все агенты</option>
            {users?.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
          </select>
          <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>

        <div className="flex-1" />
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setView("kanban")} className={cn("p-1.5 rounded-md transition-all", view === "kanban" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")} title="Канбан"><LayoutDashboard className="w-4 h-4" /></button>
          <button onClick={() => setView("list")} className={cn("p-1.5 rounded-md transition-all", view === "list" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")} title="Список"><List className="w-4 h-4" /></button>
        </div>
        <button onClick={() => setShowPipelineEditor(true)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-all font-medium shadow-sm mr-2">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Воронка
        </button>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium shadow-sm hover:shadow-md">
          <Plus className="w-3.5 h-3.5" />Новый лид</button>
      </div>

      {/* Kanban */}
      {view === "kanban" && (
        <div className={cn("grid gap-3", filterStatus ? "grid-cols-1 max-w-xl mx-auto" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4")}>
          {kanbanColumns.filter((col) => !filterStatus || col.status === filterStatus).map((col) => {
            const Icon = col.meta.icon;
            return (
              <div key={col.status}
                onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.status); }}
                onDragEnter={(e) => { e.preventDefault(); setDragOverColumn(col.status); }}
                onDragLeave={() => setDragOverColumn((prev) => prev === col.status ? null : prev)}
                onDrop={() => { if (dragDealId) { statusMutation.mutate({ id: dragDealId, status: col.status }); setDragDealId(null); setDragOverColumn(null); } }}
                className={cn("rounded-xl border bg-white shadow-sm flex flex-col transition-all duration-200", dragOverColumn === col.status ? "border-primary-400 bg-primary-50/30 shadow-lg ring-2 ring-primary-200 scale-[1.02]" : "border-gray-200")}>
                <div className={cn("flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 rounded-t-xl", col.meta.lightBg)}>
                  <Icon className={cn("w-4 h-4", col.meta.color)} />
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex-1 truncate">{col.meta.label}</h3>
                  <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center text-white", col.meta.bg)}>{col.items.length}</span>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
                  {col.items.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                      <Inbox className="w-8 h-8 mb-2" /><p className="text-xs">Пусто</p>
                    </div>
                  )}
                  {col.items.map((d: any) => {
                                       const agent = userMap[d.responsibleAgentId];
                    const nextStatuses = getNextStatuses(d.status);
                    const prevStatus = getPrevStatus(d.status);
                    const linkedTasks = dealTasks[d.id] || [];
                    return (
                      <div key={d.id} draggable
                        onDragStart={() => { setDragDealId(d.id); }}
                        onDragEnd={() => { setDragDealId(null); setDragOverColumn(null); }}
                        className={cn("bg-white rounded-xl border shadow-sm transition-all duration-200 cursor-pointer group", dragDealId === d.id ? "opacity-50 scale-95 rotate-[2deg] shadow-inner border-dashed border-gray-300" : "border-gray-200 hover:shadow-lg hover:border-primary-200 active:scale-[0.98]")}
                        onClick={() => setDetailDeal(d)}>
                        <div className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 text-sm leading-snug line-clamp-1">{d.clientName || d.description || "Без имени"}</p>
                              <p className="text-[10px] text-gray-400 font-mono mt-0.5">{d.dealNumber}</p>
                            </div>
                            <div className={cn("w-2.5 h-2.5 rounded-full shrink-0 mt-1", col.meta.bg)} />
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{d.expectedAmount?.toLocaleString() || 0} ₽</p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>{fmtDate(d.createdAt)}</span>
                            <span className="text-gray-300">·</span>
                            <span>изм. {fmtDate(d.updatedAt)}</span>
                          </div>
                          {agent && (
                            <div className="flex items-center gap-2 pt-0.5">
                              <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                                <span className="text-[8px] font-bold text-primary-600">{agent.split(' ').map((n: string) => n[0]).join('')}</span>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); setViewUserId(d.responsibleAgentId); }} className="text-[11px] text-gray-500 hover:text-primary-600 hover:underline transition-colors truncate">{agent}</button>
                            </div>
                          )}
                          <div className="border-t border-gray-100 pt-2 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                            {linkedTasks.length > 0 ? (
                              <button onClick={(e) => { e.stopPropagation(); if (linkedTasks[0]) window.location.href = '/tasks#' + linkedTasks[0].id; }}
                                className="text-[11px] font-medium text-gray-500 hover:text-primary-600 transition-colors">
                                📋 Задачи ({linkedTasks.length})
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">Нет задач</span>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); setTaskDealId(d.id); setNewTaskTitle(""); setShowTaskModal(true); }}
                              className="text-[11px] font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-2 py-0.5 rounded transition-colors">
                              + Создать
                            </button>
                          </div>
                        </div>
                        {/* Hover curtain — prev/next stage navigation */}
                        <div className="border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center">
                            {PST.findIndex(s => s === d.status) > 0 && (
                              <button onClick={() => statusMutation.mutate({ id: d.id, status: PST[PST.indexOf(d.status) - 1] })}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors rounded-bl-xl"
                                title={"← " + (PSL[PST[PST.indexOf(d.status) - 1]] || "Назад")}>
                                <ArrowLeft className="w-2.5 h-2.5" />{(PSL[PST[PST.indexOf(d.status) - 1]] || "Назад")}
                              </button>
                            )}
                            {PST.indexOf(d.status) < PST.length - 1 && (
                              <button onClick={() => statusMutation.mutate({ id: d.id, status: PST[PST.indexOf(d.status) + 1] })}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-primary-600 hover:bg-primary-50 transition-colors rounded-br-xl">
                                {(PSL[PST[PST.indexOf(d.status) + 1]] || "Вперёд")}<ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete drop zone - appears when dragging a card */}
      {dragDealId && (
        <div
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
          onDrop={(e) => { e.preventDefault(); if (dragDealId && window.confirm("Удалить лид?")) { deleteMutation.mutate(dragDealId); setDragDealId(null); setDragOverColumn(null); } else { setDragDealId(null); setDragOverColumn(null); } }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3.5 bg-red-50 border-2 border-dashed border-red-300 rounded-2xl shadow-xl cursor-pointer transition-all duration-200 hover:bg-red-100 hover:border-red-400 hover:shadow-red-200/50 hover:scale-105 active:scale-95"
        >
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-700">Удалить лид</p>
            <p className="text-[11px] text-red-500">Перетащите сюда для удаления</p>
          </div>
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {active.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <Search className="w-12 h-12 mb-3" /><p className="text-sm text-gray-400">{searchQuery ? "Ничего не найдено" : "Нет сделок"}</p>
            </div>
          )}
          <div className="divide-y divide-gray-100">
            {active.map((d: any) => {
                           const agent = userMap[d.responsibleAgentId];
              return (
                <div key={d.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", (dynamicStatusMeta[d.status]?.bg || "bg-gray-400"))} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="font-medium text-gray-900 text-sm">{d.clientName || d.description || "Без имени"}</p>
                      <span className="text-[10px] text-gray-400 font-mono">{d.dealNumber}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400 mt-0.5">
                      <span className="font-medium text-gray-500">{d.expectedAmount?.toLocaleString()} ₽</span>
                      {agent && <button onClick={(e) => { e.stopPropagation(); setViewUserId(d.responsibleAgentId); }} className="flex items-center gap-1 hover:text-primary-600 hover:underline"><User className="w-3 h-3" />{agent}</button>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(d.createdAt)}</span>
                    </div>
                  </div>
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", (dynamicStatusMeta[d.status]?.lightBg || "bg-gray-50"), (dynamicStatusMeta[d.status]?.color || "text-gray-600"))}>
                    {(dynamicStatusMeta[d.status]?.label || d.status)}
                  </span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <select value={d.status} onChange={(e) => { if (e.target.value !== d.status) statusMutation.mutate({ id: d.id, status: e.target.value }); }}
                      className="text-[11px] font-medium border border-gray-200 rounded-lg py-1 px-2 bg-white text-gray-600 outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer">
                      {PST.map(s => (
                        <option key={s} value={s} disabled={s === d.status}>{PSL[s] || s}{s === d.status ? " ●" : ""}</option>
                      ))}
                    </select>
                    <button onClick={(e) => { e.stopPropagation(); if (confirm("Удалить лид " + d.dealNumber + "?")) deleteMutation.mutate(d.id); }}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Удалить">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {detailDeal && (
        <DealDetailPanel
          deal={detailDeal}
                   agent={userMap[detailDeal.responsibleAgentId]}
          canEdit={canEdit}
          canDelete={canDelete}
          editDealData={editDealData}
          confirmDelete={confirmDelete}
          onClose={() => { setDetailDeal(null); setEditDealData(null); setConfirmDelete(false); }}
          onEdit={() => setEditDealData({ ...detailDeal })}
          onSaveEdit={(data: any) => updateMutation.mutate({ id: detailDeal.id, data: { dealNumber: data.dealNumber, dealType: data.dealType, clientName: data.clientName, clientPhone: data.clientPhone, clientInn: data.clientInn, expectedAmount: data.expectedAmount, paymentType: data.paymentType, responsibleAgentId: data.responsibleAgentId || undefined, description: data.description } })}
          onDelete={() => { if (confirmDelete) deleteMutation.mutate(detailDeal.id); else setConfirmDelete(true); }}
          onCancelEdit={() => setEditDealData(null)}
          onCancelDelete={() => setConfirmDelete(false)}
          isPending={updateMutation.isPending || deleteMutation.isPending}
          nextStatuses={getNextStatuses(detailDeal.status)}
          prevStatus={getPrevStatus(detailDeal.status)}
          onStatusChange={(s: string) => { statusMutation.mutate({ id: detailDeal.id, status: s }); setDetailDeal((prev: any) => prev ? { ...prev, status: s } : prev); }}
          users={users}
                 />
      )}

      {showForm && <DealFormModal onClose={() => { setShowForm(false); setNewDealClientId(""); }} currentUser={user} />}

          {viewUserId && <ProfileModal user={null} profileUserId={viewUserId} onClose={() => setViewUserId(null)} />}
      {showPipelineEditor && <PipelineEditor onClose={async () => { setShowPipelineEditor(false); const stages = await fetchPipeline(); setPipelineStages(stages); setPipelineReady(true); }} />}

      {/* Task creation modal — shared component */}
      {showTaskModal && (
        <TaskFormModal
          onClose={() => setShowTaskModal(false)}
          users={users}
          deals={deals}
          presetDealId={taskDealId || ""}
          onSubmit={(data: any) => taskCreateMutation.mutate(data)}
          isPending={taskCreateMutation.isPending}
        />
      )}
    </div>
  );
}

/* Components extracted to DealFormModal.tsx and DealDetailPanel.tsx */
