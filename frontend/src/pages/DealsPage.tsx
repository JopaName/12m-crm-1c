import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dealsAPI, clientsAPI, authAPI } from "../api";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { STATUSES, STATUS_META } from "../constants/deals";
import PipelineEditor, { getPipelineConfig } from "../components/PipelineEditor";
import DealFormModal from "../components/DealFormModal";
import DealDetailPanel from "../components/DealDetailPanel";
import ProfileModal from "../components/ProfileModal";
import toast from "react-hot-toast";
import { cn } from "../components/cn";
import { Plus, Search, LayoutDashboard, List, User, Building2, Calendar, AlertCircle, ChevronDown, Edit3, X, DollarSign, ArrowRight, ArrowLeft, Phone, Mail, Briefcase, Inbox, Trash2, Save, Eye, Shield, CreditCard, FileText } from "lucide-react";

const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("ru-RU") : "";

export default function DealsPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("kanban");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailDeal, setDetailDeal] = useState<any | null>(null);
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const [showPipelineEditor, setShowPipelineEditor] = useState(false);
  const [pipelineStages, setPipelineStages] = useState(getPipelineConfig);
  const { user } = useAuth();
  const canEdit = user?.permissions?.includes("deals.edit") ?? true;
  const canDelete = user?.permissions?.includes("deals.delete") ?? true;
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [searchParams] = useSearchParams();
  const [newDealClientId, setNewDealClientId] = useState("");
  const [editDealData, setEditDealData] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    PST.forEach((s) => (counts[s] = 0));
    (deals || []).forEach((d: any) => { counts[d.status] = (counts[d.status] || 0) + 1; });
    return { total: (deals || []).length, counts };
  }, [deals]);

  const kanbanColumns = PST.map((status) => ({
    status,
    items: active.filter((d: any) => d.status === status),
    meta: STATUS_META[status],
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
        {PST.map((s) => {
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
              <div key={col.status} className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col" onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragDealId) { statusMutation.mutate({ id: dragDealId, status: col.status }); setDragDealId(null); } }}>
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
                      <div key={d.id} draggable onDragStart={() => setDragDealId(d.id)} className="bg-white rounded-lg border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md cursor-grab active:cursor-grabbing" onClick={() => setDetailDeal(d)}>
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
                              <User className="w-3 h-3 shrink-0" /><button onClick={(e) => { e.stopPropagation(); setViewUserId(d.responsibleAgentId); }} className="truncate hover:text-primary-600 hover:underline transition-colors">{agent}</button>
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
                      {agent && <button onClick={(e) => { e.stopPropagation(); setViewUserId(d.responsibleAgentId); }} className="flex items-center gap-1 hover:text-primary-600 hover:underline"><User className="w-3 h-3" />{agent}</button>}
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
          onSaveEdit={(data: any) => updateMutation.mutate({ id: detailDeal.id, data: { dealNumber: data.dealNumber, dealType: data.dealType, clientId: data.clientId || undefined, clientInn: data.clientInn, expectedAmount: data.expectedAmount, responsibleAgentId: data.responsibleAgentId || undefined, description: data.description } })}
          onDelete={() => { if (confirmDelete) deleteMutation.mutate(detailDeal.id); else setConfirmDelete(true); }}
          onCancelEdit={() => setEditDealData(null)}
          onCancelDelete={() => setConfirmDelete(false)}
          isPending={updateMutation.isPending || deleteMutation.isPending}
          nextStatuses={getNextStatuses(detailDeal.status)}
          prevStatus={getPrevStatus(detailDeal.status)}
          onStatusChange={(s: string) => { statusMutation.mutate({ id: detailDeal.id, status: s }); setDetailDeal((prev: any) => prev ? { ...prev, status: s } : prev); }}
          users={users}
          clients={clients}
        />
      )}

      {showForm && <DealFormModal onClose={() => { setShowForm(false); setNewDealClientId(""); }} clients={clients} users={users} initialClientId={newDealClientId}
        onSubmit={(d) => createMutation.mutate(d)} isPending={createMutation.isPending} />}

          {viewUserId && <ProfileModal user={null} profileUserId={viewUserId} onClose={() => setViewUserId(null)} />}
      {showPipelineEditor && <PipelineEditor onClose={() => { setShowPipelineEditor(false); setPipelineStages(getPipelineConfig()); }} />}
    </div>
  );
}

/* Components extracted to DealFormModal.tsx and DealDetailPanel.tsx */
