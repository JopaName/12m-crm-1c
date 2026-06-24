import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serviceAPI, clientsAPI } from "../api";
import toast from "react-hot-toast";
import { cn } from "../components/cn";
import { AlertCircle, ArrowRight, Building2, Calendar, Inbox, Plus, Search, ServiceFormModal, User, Wrench, X } from "lucide-react";;

const STATUS_META: Record<string, { color: string; bg: string; lightBg: string; label: string }> = {
  Open: { color: "text-primary-600", bg: "bg-primary-500", lightBg: "bg-primary-50", label: "Открыто" },
  InProgress: { color: "text-amber-600", bg: "bg-amber-500", lightBg: "bg-amber-50", label: "В работе" },
  Resolved: { color: "text-emerald-600", bg: "bg-emerald-500", lightBg: "bg-emerald-50", label: "Решено" },
  Closed: { color: "text-gray-400", bg: "bg-gray-400", lightBg: "bg-gray-50", label: "Закрыто" },
};
const TYPE_LABELS: Record<string, string> = { Warranty: "Гарантия", Repair: "Ремонт", Maintenance: "Обслуживание", Consultation: "Консультация" };
const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("ru-RU") : "";

export default function ServicePage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { data: cases, isLoading } = useQuery({ queryKey: ["service"], queryFn: () => serviceAPI.getAll().then((r) => r.data) });
  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: () => clientsAPI.getAll().then((r) => r.data) });

  const data = cases; // normalize the variable name

  const createMutation = useMutation({
    mutationFn: (d: any) => serviceAPI.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["service"] }); toast.success("Обращение создано"); setShowForm(false); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const clientMap = useMemo(() => { const m: Record<string, any> = {}; clients?.forEach((c: any) => { m[c.id] = c; }); return m; }, [clients]);

  const active = useMemo(() => {
    let items = data || [];
    if (searchQuery) { const q = searchQuery.toLowerCase(); items = items.filter((c: any) => (c.description || "").toLowerCase().includes(q) || (clientMap[c.clientId]?.name || "").toLowerCase().includes(q)); }
    if (filterStatus) items = items.filter((c: any) => c.status === filterStatus);
    return items;
  }, [data, searchQuery, filterStatus, clientMap]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(STATUS_META).forEach((s) => (counts[s] = 0));
    (data || []).forEach((c: any) => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return { total: (data || []).length, counts };
  }, [data]);

  if (isLoading) return <div className="max-w-7xl mx-auto p-6"><div className="animate-pulse space-y-6"><div className="h-8 bg-gray-200 rounded-lg w-48" /><div className="h-64 bg-gray-200 rounded-xl" /></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2.5"><Wrench className="w-6 h-6 text-primary-500" />Сервис</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
        <div onClick={() => setFilterStatus("")} className={cn("bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm cursor-pointer transition-all hover:shadow-md", !filterStatus ? "ring-2 ring-offset-2 ring-primary-500 shadow-lg" : "")}>
          <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center"><Wrench className="w-4 h-4 text-primary-600" /></div>
          <div><p className="text-lg font-bold text-gray-900">{stats.total}</p><p className="text-[11px] text-gray-500">Всего</p></div>
        </div>
        {Object.entries(STATUS_META).map(([k, m]) => (
          <div key={k} onClick={() => setFilterStatus(filterStatus === k ? "" : k)}
            className={cn("rounded-xl border p-3 flex items-center gap-2.5 shadow-sm cursor-pointer transition-all hover:shadow-md", m.lightBg,
              filterStatus === k ? "ring-2 ring-offset-2 ring-gray-900 shadow-lg" : filterStatus ? "opacity-40 grayscale" : "")}>
            <AlertCircle className={cn("w-4 h-4", m.color)} /><div><p className="text-sm font-bold text-gray-900">{stats.counts[k] || 0}</p><p className="text-[10px] text-gray-500 leading-tight">{m.label}</p></div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input placeholder="Поиск обращений..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium shadow-sm"><Plus className="w-3.5 h-3.5" />Обращение</button>
      </div>

      {active.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center text-gray-400"><Inbox className="w-12 h-12 mx-auto mb-3" /><p>{searchQuery ? "Ничего не найдено" : "Нет обращений"}</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {active.map((c: any) => {
            const client = clientMap[c.clientId];
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                <div className={cn("flex items-center gap-2 px-3 py-2.5 rounded-t-xl", STATUS_META[c.status]?.lightBg || "bg-gray-50")}>
                  <AlertCircle className={cn("w-4 h-4", STATUS_META[c.status]?.color)} />
                  <h3 className="text-xs font-semibold text-gray-700 flex-1">{TYPE_LABELS[c.type] || c.type || "Сервис"}</h3>
                  <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full text-white", STATUS_META[c.status]?.bg)}>{STATUS_META[c.status]?.label}</span>
                </div>
                <div className="p-2.5">
                  {client && <div className="flex items-center gap-1.5 text-xs text-gray-500"><Building2 className="w-3 h-3" />{client.name}</div>}
                  {c.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.description}</p>}
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1.5"><Calendar className="w-3 h-3" />{fmtDate(c.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && <ServiceFormModal onClose={() => setShowForm(false)} clients={clients} onSubmit={(d) => createMutation.mutate(d)} isPending={createMutation.isPending} />}
    </div>
  );
}

function ServiceFormModal({ onClose, clients, onSubmit, isPending }: { onClose: () => void; clients?: any[]; onSubmit: (d: any) => void; isPending: boolean }) {
  const [f, setF] = useState({ clientId: "", dealId: "", type: "Warranty", description: "" });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100"><h3 className="font-semibold text-gray-900 flex items-center gap-2"><Plus className="w-4 h-4 text-primary-500" />Новое обращение</h3><button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button></div>
        <div className="px-5 py-4 space-y-3">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Клиент</label><select value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"><option value="">Выберите клиента</option>{clients?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Тип</label><select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">{Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Описание</label><textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none" rows={3} /></div>
        </div>
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50"><div className="flex-1" /><button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button><button onClick={() => { if (!f.clientId) { toast.error("Выберите клиента"); return; } onSubmit(f); }} disabled={isPending} className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50 shadow-sm">{isPending ? "Создание..." : "Создать"}</button></div>
      </div>
    </div>
  );
}
