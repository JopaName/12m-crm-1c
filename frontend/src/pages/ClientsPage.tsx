import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsAPI, dealsAPI, tasksAPI } from "../api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { cn } from "../components/cn";
import { Plus, Search, LayoutDashboard, List, User, Building2, Phone, Mail, CreditCard, ChevronDown, Edit3, X, ArrowRight, Inbox, Calendar, Briefcase, FileText, MapPin } from "lucide-react";

const SOURCE_LABELS: Record<string, string> = { Direct: "Прямой", Referral: "Реферал", Website: "Сайт", Exhibition: "Выставка", Call: "Звонок" };
const STATUS_LABELS: Record<string, string> = { New: "Новый", Active: "Активный", Inactive: "Неактивный", Blocked: "Заблокирован" };

type ViewMode = "kanban" | "list";
const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("ru-RU") : "";

export default function ClientsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("list");
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [detailClient, setDetailClient] = useState<any | null>(null);

  const { data: clients, isLoading } = useQuery({ queryKey: ["clients"], queryFn: () => clientsAPI.getAll().then((r) => r.data) });
  const { data: deals } = useQuery({ queryKey: ["deals"], queryFn: () => dealsAPI.getAll().then((r) => r.data) });

  const createMutation = useMutation({
    mutationFn: (d: any) => clientsAPI.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); toast.success("Клиент создан"); setShowForm(false); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const active = useMemo(() => {
    let items = clients || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((c: any) => (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q) || (c.email || "").toLowerCase().includes(q) || (c.inn || "").includes(q));
    }
    if (filterStatus) items = items.filter((c: any) => c.status === filterStatus);
    if (filterSource) items = items.filter((c: any) => c.source === filterSource);
    return items;
  }, [clients, searchQuery, filterStatus, filterSource]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(STATUS_LABELS).forEach((s) => (counts[s] = 0));
    (clients || []).forEach((c: any) => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return { total: (clients || []).length, counts };
  }, [clients]);

  // Client detail modal
  if (detailClient) {
    const clientDeals = (deals || []).filter((d: any) => d.clientId === detailClient.id);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDetailClient(null)}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Building2 className="w-4 h-4 text-primary-500" />{detailClient.name}</h3>
            <button onClick={() => setDetailClient(null)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
          </div>
          <div className="px-5 py-3 space-y-2 text-sm">
            {detailClient.phone && <div className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4 text-gray-400" />{detailClient.phone}</div>}
            {detailClient.email && <div className="flex items-center gap-2 text-gray-600"><Mail className="w-4 h-4 text-gray-400" />{detailClient.email}</div>}
            {detailClient.inn && <div className="flex items-center gap-2 text-gray-600"><CreditCard className="w-4 h-4 text-gray-400" />ИНН {detailClient.inn}</div>}
            {detailClient.address && <div className="flex items-center gap-2 text-gray-600"><MapPin className="w-4 h-4 text-gray-400" />{detailClient.address}</div>}
            <div className="flex items-center gap-4 pt-1">
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", detailClient.status === "Active" ? "bg-green-100 text-green-700" : detailClient.status === "Blocked" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600")}>{STATUS_LABELS[detailClient.status] || detailClient.status}</span>
              <span className="text-xs text-gray-400">{SOURCE_LABELS[detailClient.source] || detailClient.source}</span>
            </div>
          </div>
          <div className="px-5 pb-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Сделки ({clientDeals.length})</h4>
            {clientDeals.length === 0 && <p className="text-xs text-gray-400 py-3 text-center">Нет сделок</p>}
            <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
              {clientDeals.map((d: any) => (
                <div key={d.id} className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50" onClick={() => { setDetailClient(null); navigate("/deals#" + encodeURIComponent(d.dealNumber)); }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{d.dealNumber}</p>
                    <p className="text-xs text-gray-400">{d.expectedAmount?.toLocaleString()} ₽ — {fmtDate(d.createdAt)}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
            <button onClick={() => navigate(`/clients/${detailClient.id}`)} className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors mr-2">Подробнее</button>
            <button onClick={() => setDetailClient(null)} className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors">Закрыть</button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="max-w-7xl mx-auto p-6"><div className="animate-pulse space-y-6"><div className="h-8 bg-gray-200 rounded-lg w-48" /><div className="h-64 bg-gray-200 rounded-xl" /></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2.5"><Building2 className="w-6 h-6 text-primary-500" />Клиенты</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        <div onClick={() => setFilterStatus("")}
          className={cn("bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm cursor-pointer transition-all hover:shadow-md", !filterStatus && !filterSource ? "ring-2 ring-offset-2 ring-primary-500 shadow-lg" : "")}>
          <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center"><Building2 className="w-4 h-4 text-primary-600" /></div>
          <div><p className="text-lg font-bold text-gray-900">{stats.total}</p><p className="text-[11px] text-gray-500">Всего</p></div>
        </div>
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <div key={k} onClick={() => setFilterStatus(filterStatus === k ? "" : k)}
            className={cn("rounded-xl border p-3 flex items-center gap-2.5 shadow-sm cursor-pointer transition-all hover:shadow-md",
              k === "Active" ? "bg-green-50" : k === "New" ? "bg-primary-50" : k === "Blocked" ? "bg-red-50" : "bg-gray-50",
              filterStatus === k ? "ring-2 ring-offset-2 ring-gray-900 shadow-lg" : filterStatus ? "opacity-40 grayscale" : "")}>
            <User className={cn("w-4 h-4", k === "Active" ? "text-green-600" : k === "New" ? "text-primary-600" : k === "Blocked" ? "text-red-600" : "text-gray-400")} />
            <div><p className="text-sm font-bold text-gray-900">{stats.counts[k] || 0}</p><p className="text-[10px] text-gray-500 leading-tight">{v}</p></div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input placeholder="Поиск по названию, телефону..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}
          className="appearance-none px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer">
          <option value="">Все источники</option>
          {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="flex-1" />
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium shadow-sm"><Plus className="w-3.5 h-3.5" />Клиент</button>
      </div>

      {active.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center text-gray-400"><Search className="w-12 h-12 mx-auto mb-3" /><p>{searchQuery ? "Ничего не найдено" : "Нет клиентов"}</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {active.map((c: any) => {
            const clientDeals = (deals || []).filter((d: any) => d.clientId === c.id);
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer p-4" onClick={() => setDetailClient(c)}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                    <div className="flex flex-col gap-0.5 mt-1.5">
                      {c.phone && <div className="flex items-center gap-1.5 text-xs text-gray-500"><Phone className="w-3 h-3" />{c.phone}</div>}
                      {c.email && <div className="flex items-center gap-1.5 text-xs text-gray-500"><Mail className="w-3 h-3" />{c.email}</div>}
                      {c.inn && <div className="flex items-center gap-1.5 text-xs text-gray-400"><CreditCard className="w-3 h-3" />ИНН {c.inn}</div>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", c.status === "Active" ? "bg-green-100 text-green-700" : c.status === "Blocked" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600")}>{STATUS_LABELS[c.status]}</span>
                    {clientDeals.length > 0 && <span className="text-[10px] text-primary-600 font-medium">{clientDeals.length} сделок</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400">{SOURCE_LABELS[c.source] || c.source} — {fmtDate(c.createdAt)}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && <ClientFormModal onClose={() => setShowForm(false)} onSubmit={(d) => createMutation.mutate(d)} isPending={createMutation.isPending} />}
    </div>
  );
}

function ClientFormModal({ onClose, onSubmit, isPending }: { onClose: () => void; onSubmit: (d: any) => void; isPending: boolean }) {
  const [f, setF] = useState({ name: "", phone: "", email: "", inn: "", source: "Direct", status: "New", address: "", notes: "" });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Plus className="w-4 h-4 text-primary-500" />Новый клиент</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Название <span className="text-red-500">*</span></label>
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Телефон</label>
              <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">ИНН</label>
            <input value={f.inn} onChange={(e) => setF({ ...f, inn: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Источник</label>
              <select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Статус</label>
              <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Адрес</label>
            <input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Заметки</label>
            <textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none" rows={2} /></div>
        </div>
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
          <div className="flex-1" /><button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button>
          <button onClick={() => { if (!f.name.trim()) { toast.error("Введите название"); return; } onSubmit(f); }} disabled={isPending}
            className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50 shadow-sm">{isPending ? "Создание..." : "Создать"}</button>
        </div>
      </div>
    </div>
  );
}
