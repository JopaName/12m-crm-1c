import React, { useMemo, useNavigate, useState } from "react";;
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productionAPI, dealsAPI } from "../api";
import toast from "react-hot-toast";
import { cn } from "../components/cn";
import {  AlertCircle, ArrowRight, Briefcase, Calendar, ChevronDown, Factory, Icon, InboxDashboard, List, Package, Plus, ProductionFormModal, Search, X  } from "lucide-react";;;

const STATUSES = ["New", "MaterialsWrittenOff", "InProgress", "QualityCheck", "Completed"];
const STATUS_META: Record<string, { color: string; bg: string; lightBg: string; icon: any; label: string }> = {
  New: { color: "text-primary-600", bg: "bg-primary-500", lightBg: "bg-primary-50", icon: Plus, label: "Новый" },
  MaterialsWrittenOff: { color: "text-yellow-600", bg: "bg-yellow-500", lightBg: "bg-yellow-50", icon: Package, label: "Материалы" },
  InProgress: { color: "text-amber-600", bg: "bg-amber-500", lightBg: "bg-amber-50", icon: Factory, label: "В работе" },
  QualityCheck: { color: "text-violet-600", bg: "bg-violet-500", lightBg: "bg-violet-50", icon: AlertCircle, label: "Проверка" },
  Completed: { color: "text-emerald-600", bg: "bg-emerald-500", lightBg: "bg-emerald-50", icon: X, label: "Завершён" },
};

type ViewMode = "kanban" | "list";
const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("ru-RU") : "";

export default function ProductionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("kanban");
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { data: orders, isLoading } = useQuery({ queryKey: ["production"], queryFn: () => productionAPI.getAll().then((r) => r.data) });
  const { data: routes } = useQuery({ queryKey: ["production-routes"], queryFn: () => productionAPI.getRoutes().then((r) => r.data) });
  const { data: deals } = useQuery({ queryKey: ["deals"], queryFn: () => dealsAPI.getAll().then((r) => r.data) });

  const createMutation = useMutation({
    mutationFn: (d: any) => productionAPI.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["production"] }); toast.success("Заказ создан"); setShowForm(false); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => productionAPI.updateStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["production"] }); toast.success("Статус обновлён"); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const active = useMemo(() => {
    let items = orders || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((o: any) => (o.deal?.dealNumber || "").toLowerCase().includes(q) || (o.productionRoute?.name || "").toLowerCase().includes(q));
    }
    if (filterStatus) items = items.filter((o: any) => o.status === filterStatus);
    return items;
  }, [orders, searchQuery, filterStatus]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUSES.forEach((s) => (counts[s] = 0));
    (orders || []).forEach((o: any) => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return { total: (orders || []).length, counts };
  }, [orders]);

  if (isLoading) return (
    <div className="max-w-7xl mx-auto p-6"><div className="animate-pulse space-y-6"><div className="h-8 bg-gray-200 rounded-lg w-56" /><div className="grid grid-cols-5 gap-3">{[1,2,3,4,5].map(i => <div key={i} className="h-96 bg-gray-100 rounded-xl" />)}</div></div></div>
  );

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2.5"><Factory className="w-6 h-6 text-primary-500" />Производство</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        <div onClick={() => setFilterStatus("")}
          className={cn("bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm cursor-pointer transition-all hover:shadow-md", !filterStatus ? "ring-2 ring-offset-2 ring-primary-500 shadow-lg" : "")}>
          <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center"><Factory className="w-4 h-4 text-primary-600" /></div>
          <div><p className="text-lg font-bold text-gray-900">{stats.total}</p><p className="text-[11px] text-gray-500">Всего</p></div>
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
          <input placeholder="Поиск заказов..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex-1" />
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setView("kanban")} className={cn("p-1.5 rounded-md transition-all", view === "kanban" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")}><LayoutDashboard className="w-4 h-4" /></button>
          <button onClick={() => setView("list")} className={cn("p-1.5 rounded-md transition-all", view === "list" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")}><List className="w-4 h-4" /></button>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium shadow-sm"><Plus className="w-3.5 h-3.5" />Заказ</button>
      </div>

      {view === "kanban" && (
        <div className={cn("grid gap-3", filterStatus ? "grid-cols-1 max-w-xl mx-auto" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5")}>
          {STATUSES.map((status) => {
            const col = active.filter((o: any) => o.status === status);
            if (filterStatus && status !== filterStatus) return null;
            const Icon = STATUS_META[status].icon;
            return (
              <div key={status} className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
                <div className={cn("flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 rounded-t-xl", STATUS_META[status].lightBg)}>
                  <Icon className={cn("w-4 h-4", STATUS_META[status].color)} />
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex-1 truncate">{STATUS_META[status].label}</h3>
                  <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center text-white", STATUS_META[status].bg)}>{col.length}</span>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)]">
                  {col.length === 0 && <div className="flex flex-col items-center justify-center py-10 text-gray-300"><Inbox className="w-8 h-8 mb-2" /><p className="text-xs">Пусто</p></div>}
                  {col.map((o: any) => {
                    const nextIdx = STATUSES.indexOf(o.status);
                    const nextStatus = nextIdx >= 0 && nextIdx < STATUSES.length - 1 ? STATUSES[nextIdx + 1] : null;
                    return (
                      <div key={o.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all">
                        <div className="p-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-gray-900 text-[13px] cursor-pointer hover:text-primary-600 transition-colors" onClick={(e) => { e.stopPropagation(); if(o.deal?.dealNumber) navigate("/deals#" + encodeURIComponent(o.deal.dealNumber)); }}>{o.deal?.dealNumber || "Без сделки"}</p>
                            <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", STATUS_META[status].bg)} />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{o.productionRoute?.name || "Маршрут не указан"}</p>
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1.5"><Calendar className="w-3 h-3" />{fmtDate(o.createdAt)}</div>
                        </div>
                        {nextStatus && (
                          <div className="flex border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => statusMutation.mutate({ id: o.id, status: nextStatus })}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                              <ArrowRight className="w-3 h-3" />{STATUS_META[nextStatus].label}
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
          {active.length === 0 && <div className="flex flex-col items-center justify-center py-16 text-gray-300"><Search className="w-12 h-12 mb-3" /><p className="text-sm text-gray-400">{searchQuery ? "Ничего не найдено" : "Нет заказов"}</p></div>}
          <div className="divide-y divide-gray-100">
            {active.map((o: any) => (
              <div key={o.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group">
                <div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_META[o.status]?.bg || "bg-gray-400")} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm cursor-pointer hover:text-primary-600 transition-colors" onClick={() => { if(o.deal?.dealNumber) navigate("/deals#" + encodeURIComponent(o.deal.dealNumber)); }}>{o.deal?.dealNumber || "Без сделки"}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400 mt-0.5">
                    <span>{o.productionRoute?.name}</span>
                    <span><Calendar className="w-3 h-3 inline mr-1" />{fmtDate(o.createdAt)}</span>
                  </div>
                </div>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_META[o.status]?.lightBg, STATUS_META[o.status]?.color)}>{STATUS_META[o.status]?.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && <ProductionFormModal onClose={() => setShowForm(false)} deals={deals} routes={routes}
        onSubmit={(d) => createMutation.mutate(d)} isPending={createMutation.isPending} />}
    </div>
  );
}

function ProductionFormModal({ onClose, deals, routes, onSubmit, isPending }: {
  onClose: () => void; deals?: any[]; routes?: any[]; onSubmit: (d: any) => void; isPending: boolean;
}) {
  const [f, setF] = useState({ dealId: "", productionRouteId: "" });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Plus className="w-4 h-4 text-primary-500" />Заказ в производство</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Сделка</label>
            <select value={f.dealId} onChange={(e) => setF({ ...f, dealId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
              <option value="">Выберите сделку</option>{deals?.map((d: any) => <option key={d.id} value={d.id}>{d.dealNumber}</option>)}</select></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Маршрут</label>
            <select value={f.productionRouteId} onChange={(e) => setF({ ...f, productionRouteId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
              <option value="">Выберите маршрут</option>{(routes || []).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
        </div>
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
          <div className="flex-1" /><button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button>
          <button onClick={() => { if (!f.dealId) { toast.error("Выберите сделку"); return; } onSubmit(f); }} disabled={isPending}
            className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50 shadow-sm">{isPending ? "Создание..." : "Создать"}</button>
        </div>
      </div>
    </div>
  );
}
