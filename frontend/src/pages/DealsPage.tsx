import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dealsAPI, clientsAPI, authAPI } from "../api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { cn } from "../components/cn";
import { Plus, Search, LayoutDashboard, List, User, Building2, Calendar, AlertCircle, ChevronDown, Edit3, X, DollarSign, ArrowRight, ArrowLeft, Phone, Mail, Briefcase, Inbox, Trash2, Save, Eye, Shield, CreditCard } from "lucide-react";

const STATUSES = [
  "Lead_Created",
  "Invoice_Generation",
  "Legal_Review",
  "Doc_Sending",
  "Waiting_Payment",
  "Paid_And_Reserved",
  "Issuing_Goods",
  "Deal_Closed",
];

const STATUS_META: Record<string, { color: string; bg: string; lightBg: string; icon: any; label: string }> = {
  Lead_Created: { color: "text-primary-600", bg: "bg-primary-500", lightBg: "bg-primary-50", icon: Plus, label: "Лид" },
  Invoice_Generation: { color: "text-yellow-600", bg: "bg-yellow-500", lightBg: "bg-yellow-50", icon: DollarSign, label: "Счёт" },
  Legal_Review: { color: "text-purple-600", bg: "bg-purple-500", lightBg: "bg-purple-50", icon: Briefcase, label: "Юристы" },
  Doc_Sending: { color: "text-indigo-600", bg: "bg-indigo-500", lightBg: "bg-indigo-50", icon: ArrowRight, label: "Доки" },
  Waiting_Payment: { color: "text-orange-600", bg: "bg-orange-500", lightBg: "bg-orange-50", icon: DollarSign, label: "Оплата" },
  Paid_And_Reserved: { color: "text-teal-600", bg: "bg-teal-500", lightBg: "bg-teal-50", icon: Building2, label: "Резерв" },
  Issuing_Goods: { color: "text-cyan-600", bg: "bg-cyan-500", lightBg: "bg-cyan-50", icon: ArrowRight, label: "Отгрузка" },
  Deal_Closed: { color: "text-emerald-600", bg: "bg-emerald-500", lightBg: "bg-emerald-50", icon: X, label: "Закрыто" },
};

type ViewMode = "kanban" | "list";

const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("ru-RU") : "";

export default function DealsPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("kanban");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailDeal, setDetailDeal] = useState<any | null>(null);
  const { user } = useAuth();
  const canEdit = user?.permissions?.includes("deals.edit") ?? true;
  const canDelete = user?.permissions?.includes("deals.delete") ?? true;
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [editDealData, setEditDealData] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: deals, isLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: () => dealsAPI.getAll().then((r) => r.data),
  });
  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsAPI.getAll().then((r) => r.data),
  });
  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => authAPI.getUsers().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => dealsAPI.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["deals"] }); toast.success("Сделка создана"); setShowForm(false); },
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["deals"] }); toast.success("Сделка обновлена"); setEditDealData(null); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dealsAPI.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["deals"] }); toast.success("Сделка удалена"); setDetailDeal(null); setConfirmDelete(false); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const userMap = useMemo(() => {
    const m: Record<string, string> = {};
    users?.forEach((u: any) => { m[u.id] = `${u.firstName} ${u.lastName}`; });
    return m;
  }, [users]);

  const clientMap = useMemo(() => {
    const m: Record<string, any> = {};
    clients?.forEach((c: any) => { m[c.id] = c; });
    return m;
  }, [clients]);

  const active = useMemo(() => {
    let items = deals || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((d: any) =>
        (d.dealNumber || "").toLowerCase().includes(q) ||
        (clientMap[d.clientId]?.name || "").toLowerCase().includes(q) ||
        (d.description || "").toLowerCase().includes(q)
      );
    }
    if (filterStatus) items = items.filter((d: any) => d.status === filterStatus);
    if (filterAgent) items = items.filter((d: any) => d.responsibleAgentId === filterAgent);
    if (filterClient) items = items.filter((d: any) => d.clientId === filterClient);
    return items;
  }, [deals, searchQuery, filterStatus, filterAgent, filterClient, clientMap]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUSES.forEach((s) => (counts[s] = 0));
    (deals || []).forEach((d: any) => { counts[d.status] = (counts[d.status] || 0) + 1; });
    return { total: (deals || []).length, counts };
  }, [deals]);

  const kanbanColumns = STATUSES.map((status) => ({
    status,
    items: active.filter((d: any) => d.status === status),
    meta: STATUS_META[status],
  }));

  const getPrevStatus = (current: string): string | null => {
    const idx = STATUSES.indexOf(current);
    return idx > 0 ? STATUSES[idx - 1] : null;
  };
  const getNextStatuses = (current: string): string[] => {
    const idx = STATUSES.indexOf(current);
    return idx >= 0 && idx < STATUSES.length - 1 ? STATUSES.slice(idx + 1) : [];
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
          <Briefcase className="w-6 h-6 text-primary-500" />Сделки
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
        {STATUSES.map((s) => {
          const Icon = STATUS_META[s].icon;
          return (
            <div key={s} onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
              className={cn("rounded-xl border p-3 flex items-center gap-2.5 shadow-sm cursor-pointer transition-all hover:shadow-md",
                STATUS_META[s].lightBg,
                filterStatus === s ? "ring-2 ring-offset-2 ring-gray-900 shadow-lg" : filterStatus ? "opacity-40 grayscale" : "")}>
              <Icon className={cn("w-4 h-4", STATUS_META[s].color)} />
              <div><p className="text-sm font-bold text-gray-900">{stats.counts[s] || 0}</p><p className="text-[10px] text-gray-500 leading-tight">{STATUS_META[s].label}</p></div>
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
        <div className="relative">
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
            className="appearance-none pl-8 pr-7 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all cursor-pointer max-w-[200px]">
            <option value="">Все клиенты</option>
            {clients?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>
        <div className="flex-1" />
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setView("kanban")} className={cn("p-1.5 rounded-md transition-all", view === "kanban" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")} title="Канбан"><LayoutDashboard className="w-4 h-4" /></button>
          <button onClick={() => setView("list")} className={cn("p-1.5 rounded-md transition-all", view === "list" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")} title="Список"><List className="w-4 h-4" /></button>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium shadow-sm hover:shadow-md">
          <Plus className="w-3.5 h-3.5" />Новая сделка</button>
      </div>

      {/* Kanban */}
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
                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
                  {col.items.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                      <Inbox className="w-8 h-8 mb-2" /><p className="text-xs">Пусто</p>
                    </div>
                  )}
                  {col.items.map((d: any) => {
                    const client = clientMap[d.clientId];
                    const agent = userMap[d.responsibleAgentId];
                    const nextStatuses = getNextStatuses(d.status);
                    const prevStatus = getPrevStatus(d.status);
                    return (
                      <div key={d.id} className="bg-white rounded-lg border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer" onClick={() => setDetailDeal(d)}>
                        <div className="p-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-gray-900 text-[13px] leading-snug line-clamp-2 flex-1">{d.dealNumber}</p>
                            <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", col.meta.bg)} />
                          </div>
                          <p className="text-xs text-gray-500 mt-1 font-medium">{d.expectedAmount?.toLocaleString()} ₽</p>
                          {client && (
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-1">
                              <Building2 className="w-3 h-3 shrink-0" /><span className="truncate">{client.name}</span>
                            </div>
                          )}
                          {agent && (
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                              <User className="w-3 h-3 shrink-0" /><span className="truncate">{agent}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                            <Calendar className="w-3 h-3 shrink-0" /><span>{fmtDate(d.createdAt)}</span>
                          </div>
                        </div>
                        {(nextStatuses.length > 0 || prevStatus) && (
                          <div className="flex border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                            {prevStatus && (
                              <button onClick={() => statusMutation.mutate({ id: d.id, status: prevStatus })}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-100">
                                <ArrowLeft className="w-3 h-3" />{STATUS_META[prevStatus]?.label}
                              </button>
                            )}
                            {nextStatuses.length > 0 && (
                              <button onClick={() => statusMutation.mutate({ id: d.id, status: nextStatuses[0] })}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-primary-600 hover:bg-gray-50 transition-colors">
                                {STATUS_META[nextStatuses[0]]?.label}<ArrowRight className="w-3 h-3" />
                              </button>
                            )}
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
              const client = clientMap[d.clientId];
              const agent = userMap[d.responsibleAgentId];
              const nextStatuses = getNextStatuses(d.status);
              const prevStatus = getPrevStatus(d.status);
              return (
                <div key={d.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_META[d.status]?.bg || "bg-gray-400")} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{d.dealNumber}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400 mt-0.5">
                      <span className="font-medium text-gray-500">{d.expectedAmount?.toLocaleString()} ₽</span>
                      {client && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{client.name}</span>}
                      {agent && <span className="flex items-center gap-1"><User className="w-3 h-3" />{agent}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(d.createdAt)}</span>
                    </div>
                  </div>
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_META[d.status]?.lightBg, STATUS_META[d.status]?.color)}>
                    {STATUS_META[d.status]?.label}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {prevStatus && (
                      <button onClick={() => statusMutation.mutate({ id: d.id, status: prevStatus })}
                        className="text-xs font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1">
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                    )}
                    {nextStatuses.length > 0 && (
                      <button onClick={() => statusMutation.mutate({ id: d.id, status: nextStatuses[0] })}
                        className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
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
          client={clientMap[detailDeal.clientId]}
          agent={userMap[detailDeal.responsibleAgentId]}
          canEdit={canEdit}
          canDelete={canDelete}
          editDealData={editDealData}
          confirmDelete={confirmDelete}
          onClose={() => { setDetailDeal(null); setEditDealData(null); setConfirmDelete(false); }}
          onEdit={() => setEditDealData({ ...detailDeal, clientInn: clientMap[detailDeal.clientId]?.inn || "" })}
          onSaveEdit={(data: any) => updateMutation.mutate({ id: detailDeal.id, data })}
          onDelete={() => { if (confirmDelete) deleteMutation.mutate(detailDeal.id); else setConfirmDelete(true); }}
          onCancelEdit={() => setEditDealData(null)}
          onCancelDelete={() => setConfirmDelete(false)}
          isPending={updateMutation.isPending || deleteMutation.isPending}
          nextStatuses={getNextStatuses(detailDeal.status)}
          prevStatus={getPrevStatus(detailDeal.status)}
          onStatusChange={(s: string) => statusMutation.mutate({ id: detailDeal.id, status: s })}
          users={users}
          clients={clients}
        />
      )}

      {showForm && <DealFormModal onClose={() => setShowForm(false)} clients={clients} users={users}
        onSubmit={(d) => createMutation.mutate(d)} isPending={createMutation.isPending} />}

    </div>
  );
}

function DealFormModal({ onClose, clients, users, onSubmit, isPending }: {
  onClose: () => void; clients?: any[]; users?: any[]; onSubmit: (d: any) => void; isPending: boolean;
}) {
  const [f, setF] = useState({ clientId: "", clientInn: "", dealType: "Sale", expectedAmount: 0, description: "", responsibleAgentId: "" });

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const handleSubmit = () => {
    if (!f.clientId) { toast.error("Выберите клиента"); return; }
    if (!f.clientInn) { toast.error("Введите ИНН"); return; }
    onSubmit(f);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Plus className="w-4 h-4 text-primary-500" />Новая сделка</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Клиент <span className="text-red-500">*</span></label>
            <select value={f.clientId} onChange={(e) => {
              const c = clients?.find((x: any) => x.id === e.target.value);
              setF({ ...f, clientId: e.target.value, clientInn: c?.inn || "" });
            }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" autoFocus>
              <option value="">Выберите клиента</option>
              {clients?.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.inn || "—"})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">ИНН <span className="text-red-500">*</span></label>
            <input value={f.clientInn} onChange={(e) => setF({ ...f, clientInn: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Тип</label>
              <select value={f.dealType} onChange={(e) => setF({ ...f, dealType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                <option value="Sale">Продажа</option><option value="ProjectSale">Проект</option><option value="Rent">Аренда</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Сумма</label>
              <input type="number" value={f.expectedAmount} onChange={(e) => setF({ ...f, expectedAmount: +e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Агент</label>
            <select value={f.responsibleAgentId} onChange={(e) => setF({ ...f, responsibleAgentId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
              <option value="">Не назначен</option>
              {users?.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Описание</label>
            <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all resize-none" rows={2} />
          </div>
        </div>
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Отмена</button>
          <button onClick={handleSubmit} disabled={isPending}
            className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50 shadow-sm">
            {isPending ? "Создание..." : "Создать"}</button>
        </div>
      </div>
    </div>
  );
}


/* ======== DealDetailPanel ======== */
function DealDetailPanel({ deal, client, agent, canEdit, canDelete, editDealData, confirmDelete, onClose, onEdit, onSaveEdit, onDelete, onCancelEdit, onCancelDelete, isPending, nextStatuses, prevStatus, onStatusChange, users, clients }: {
  deal: any; client: any; agent: string; canEdit: boolean; canDelete: boolean;
  editDealData: any; confirmDelete: boolean;
  onClose: () => void; onEdit: () => void;
  onSaveEdit: (d: any) => void; onDelete: () => void;
  onCancelEdit: () => void; onCancelDelete: () => void;
  isPending: boolean;
  nextStatuses: string[]; prevStatus: string | null;
  onStatusChange: (s: string) => void;
  users?: any[]; clients?: any[];
}) {
  const [edit, setEdit] = useState(editDealData || null);
  const navigate = useNavigate();

  // Fetch full deal details for cross-linked data
  const { data: fullDeal } = useQuery({
    queryKey: ["deal-detail", deal.id],
    queryFn: () => dealsAPI.getById(deal.id).then((r) => r.data),
    enabled: !!deal.id,
  });

  const linked = fullDeal || deal;
  const hasProduction = (linked.productionOrders || []).length > 0;
  const hasInstallation = (linked.installationTasks || []).length > 0;
  const hasService = (linked.serviceCases || []).length > 0;
  const hasLegal = (linked.legalDocuments || []).length > 0;
  const hasInvoices = (linked.invoices || []).length > 0;
  const hasPayments = (linked.payments || []).length > 0;
  const hasRent = !!linked.rentContract;
  const hasCommissions = (linked.commissions || []).length > 0;
  const hasAnyLinked = hasProduction || hasInstallation || hasService || hasLegal || hasInvoices || hasPayments || hasRent || hasCommissions;

  useEffect(() => { setEdit(editDealData); }, [editDealData]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-0 overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary-500" />
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{linked.dealNumber}</h3>
              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", STATUS_META[linked.status]?.lightBg, STATUS_META[linked.status]?.color)}>
                {STATUS_META[linked.status]?.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Status movement */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl shrink-0">
            {prevStatus && (
              <button onClick={() => onStatusChange(prevStatus)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                <ArrowLeft className="w-3 h-3" />{STATUS_META[prevStatus]?.label}
              </button>
            )}
            <div className="flex-1" />
            {nextStatuses.length > 0 && (
              <button onClick={() => onStatusChange(nextStatuses[0])} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                {STATUS_META[nextStatuses[0]]?.label}<ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {edit ? (
            <div className="space-y-3">
              <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Номер сделки</label>
                <input value={edit.dealNumber || ""} onChange={(e) => setEdit({ ...edit, dealNumber: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" /></div>
              <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Клиент</label>
                <select value={edit.clientId || ""} onChange={(e) => { const c = clients?.find((x: any) => x.id === e.target.value); setEdit({ ...edit, clientId: e.target.value, clientInn: c?.inn || "" }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20">
                  <option value="">Выберите клиента</option>{clients?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Тип</label>
                  <select value={edit.dealType || "Sale"} onChange={(e) => setEdit({ ...edit, dealType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20"><option value="Sale">Продажа</option><option value="ProjectSale">Проект</option><option value="Rent">Аренда</option></select></div>
                <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Сумма</label>
                  <input type="number" value={edit.expectedAmount || 0} onChange={(e) => setEdit({ ...edit, expectedAmount: +e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" /></div>
              </div>
              <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Агент</label>
                <select value={edit.responsibleAgentId || ""} onChange={(e) => setEdit({ ...edit, responsibleAgentId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20"><option value="">Не назначен</option>{users?.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}</select></div>
              <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">ИНН клиента</label>
                <input value={edit.clientInn || ""} onChange={(e) => setEdit({ ...edit, clientInn: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" /></div>
              <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Описание</label>
                <textarea value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 resize-none" rows={2} /></div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => onSaveEdit(edit)} disabled={isPending}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50"><Save className="w-3.5 h-3.5" />{isPending ? "Сохранение..." : "Сохранить"}</button>
                <button onClick={onCancelEdit} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Отмена</button>
              </div>
            </div>
          ) : (
            <>
              {/* View mode — main info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 uppercase mb-0.5">Сумма</label>
                  <p className="text-sm font-semibold text-gray-900">{linked.expectedAmount?.toLocaleString() || 0} ₽</p>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 uppercase mb-0.5">Тип</label>
                  <p className="text-sm text-gray-700">{linked.dealType || "Не указан"}</p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-700 font-medium">{client?.name || "Клиент не указан"}</span>
                </div>
                {client?.inn && <div className="flex items-center gap-2 text-sm"><CreditCard className="w-4 h-4 text-gray-400 shrink-0" /><span className="text-gray-600">ИНН {client.inn}</span></div>}
                {client?.phone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-gray-400 shrink-0" /><span className="text-gray-600">{client.phone}</span></div>}
                {client?.email && <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-gray-400 shrink-0" /><span className="text-gray-600">{client.email}</span></div>}
              </div>

              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-gray-600">{agent || "Агент не назначен"}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-gray-600">Создана: {fmtDate(linked.createdAt)}</span>
              </div>

              {linked.description && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase mb-1">Описание</p>
                  <p className="text-sm text-gray-700">{linked.description}</p>
                </div>
              )}

              {/* ===== CROSS-LINKED DATA ===== */}
              {hasAnyLinked && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Связанные данные</p>
                  <div className="grid grid-cols-2 gap-2">
                    {hasProduction && (
                      <button onClick={() => { onClose(); navigate("/production#" + encodeURIComponent(linked.dealNumber)); }}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-200 transition-colors">
                          <Briefcase className="w-3.5 h-3.5 text-amber-600" /></div>
                        <div className="min-w-0"><p className="text-xs font-medium text-gray-900">Производство</p><p className="text-[10px] text-gray-400">{(linked.productionOrders || []).length} заказов</p></div>
                        <ArrowRight className="w-3 h-3 text-gray-300 ml-auto shrink-0" />
                      </button>
                    )}
                    {hasInstallation && (
                      <button onClick={() => { onClose(); navigate("/installation#" + encodeURIComponent(linked.dealNumber)); }}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                          <Briefcase className="w-3.5 h-3.5 text-blue-600" /></div>
                        <div className="min-w-0"><p className="text-xs font-medium text-gray-900">Монтаж</p><p className="text-[10px] text-gray-400">{(linked.installationTasks || []).length} задач</p></div>
                        <ArrowRight className="w-3 h-3 text-gray-300 ml-auto shrink-0" />
                      </button>
                    )}
                    {hasService && (
                      <button onClick={() => { onClose(); navigate("/service"); }}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group">
                        <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center shrink-0 group-hover:bg-green-200 transition-colors">
                          <Briefcase className="w-3.5 h-3.5 text-green-600" /></div>
                        <div className="min-w-0"><p className="text-xs font-medium text-gray-900">Сервис</p><p className="text-[10px] text-gray-400">{(linked.serviceCases || []).length} обращений</p></div>
                        <ArrowRight className="w-3 h-3 text-gray-300 ml-auto shrink-0" />
                      </button>
                    )}
                    {hasLegal && (
                      <button onClick={() => { onClose(); navigate("/legal"); }}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group">
                        <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 group-hover:bg-purple-200 transition-colors">
                          <Briefcase className="w-3.5 h-3.5 text-purple-600" /></div>
                        <div className="min-w-0"><p className="text-xs font-medium text-gray-900">Документы</p><p className="text-[10px] text-gray-400">{(linked.legalDocuments || []).length} док.</p></div>
                        <ArrowRight className="w-3 h-3 text-gray-300 ml-auto shrink-0" />
                      </button>
                    )}
                    {hasRent && (
                      <button onClick={() => { onClose(); navigate("/rent"); }}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group">
                        <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center shrink-0 group-hover:bg-teal-200 transition-colors">
                          <DollarSign className="w-3.5 h-3.5 text-teal-600" /></div>
                        <div className="min-w-0"><p className="text-xs font-medium text-gray-900">Аренда</p><p className="text-[10px] text-gray-400">Договор</p></div>
                        <ArrowRight className="w-3 h-3 text-gray-300 ml-auto shrink-0" />
                      </button>
                    )}
                    {hasCommissions && (
                      <button className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group">
                        <div className="w-7 h-7 rounded-lg bg-pink-100 flex items-center justify-center shrink-0 group-hover:bg-pink-200 transition-colors">
                          <DollarSign className="w-3.5 h-3.5 text-pink-600" /></div>
                        <div className="min-w-0"><p className="text-xs font-medium text-gray-900">Комиссии</p><p className="text-[10px] text-gray-400">{(linked.commissions || []).length} записей</p></div>
                      </button>
                    )}
                    {hasInvoices && (
                      <button className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group">
                        <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 group-hover:bg-orange-200 transition-colors">
                          <DollarSign className="w-3.5 h-3.5 text-orange-600" /></div>
                        <div className="min-w-0"><p className="text-xs font-medium text-gray-900">Счета</p><p className="text-[10px] text-gray-400">{(linked.invoices || []).length} шт.</p></div>
                      </button>
                    )}
                    {hasPayments && (
                      <button className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" /></div>
                        <div className="min-w-0"><p className="text-xs font-medium text-gray-900">Платежи</p><p className="text-[10px] text-gray-400">{(linked.payments || []).length} шт.</p></div>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 shrink-0">
          {canDelete && !edit && (
            confirmDelete ? (
              <>
                <span className="text-xs text-red-600 font-medium">Удалить сделку?</span>
                <button onClick={onDelete} disabled={isPending}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors">{isPending ? "Удаление..." : "Да, удалить"}</button>
                <button onClick={onCancelDelete} className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-300 transition-colors">Нет</button>
              </>
            ) : (
              <button onClick={onDelete}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-3 h-3" />Удалить</button>
            )
          )}
          <div className="flex-1" />
          {canEdit && !edit && (
            <button onClick={onEdit}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all">
              <Edit3 className="w-3.5 h-3.5" />Редактировать</button>
          )}
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Закрыть</button>
        </div>
      </div>
    </div>
  );
}
