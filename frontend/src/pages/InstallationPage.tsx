import React, { useMemo, useNavigate, useState } from "react";;
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { installationAPI, dealsAPI, authAPI } from "../api";
import toast from "react-hot-toast";
import { cn } from "../components/cn";
import { AlertCircle, ArrowRight, Briefcase, Calendar, Check, Icon, Inbox, InstallFormModal, LayoutDashboard, List, Plus, Search, User, Wrench, X } from "lucide-react";;

const STATUS_META: Record<string, { color: string; bg: string; lightBg: string; icon: any; label: string }> = {
  Pending: { color: "text-primary-600", bg: "bg-primary-500", lightBg: "bg-primary-50", icon: AlertCircle, label: "Ожидает" },
  InProgress: { color: "text-amber-600", bg: "bg-amber-500", lightBg: "bg-amber-50", icon: Wrench, label: "В работе" },
  Completed: { color: "text-emerald-600", bg: "bg-emerald-500", lightBg: "bg-emerald-50", icon: Check, label: "Завершён" },
};

type ViewMode = "kanban" | "list";
const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("ru-RU") : "";

export default function InstallationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("kanban");
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { data: tasks, isLoading } = useQuery({ queryKey: ["installation"], queryFn: () => installationAPI.getAll().then((r) => r.data) });
  const { data: calendar } = useQuery({ queryKey: ["installation-calendar"], queryFn: () => installationAPI.getCalendar().then((r) => r.data) });
  const { data: deals } = useQuery({ queryKey: ["deals"], queryFn: () => dealsAPI.getAll().then((r) => r.data) });
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => authAPI.getUsers().then((r) => r.data) });

  const userMap = useMemo(() => { const m: Record<string, string> = {}; users?.forEach((u: any) => { m[u.id] = `${u.firstName} ${u.lastName}`; }); return m; }, [users]);

  const createMutation = useMutation({
    mutationFn: (d: any) => installationAPI.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["installation"] }); toast.success("Монтаж создан"); setShowForm(false); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => installationAPI.update(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["installation"] }); toast.success("Статус обновлён"); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const active = useMemo(() => {
    let items = tasks || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((t: any) => (t.deal?.dealNumber || "").toLowerCase().includes(q) || (t.notes || "").toLowerCase().includes(q));
    }
    if (filterStatus) items = items.filter((t: any) => t.status === filterStatus);
    return items;
  }, [tasks, searchQuery, filterStatus]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(STATUS_META).forEach((s) => (counts[s] = 0));
    (tasks || []).forEach((t: any) => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return { total: (tasks || []).length, counts };
  }, [tasks]);

  if (isLoading) return <div className="max-w-7xl mx-auto p-6"><div className="animate-pulse space-y-6"><div className="h-8 bg-gray-200 rounded-lg w-48" /><div className="grid grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i} className="h-64 bg-gray-100 rounded-xl" />)}</div></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2.5"><Wrench className="w-6 h-6 text-primary-500" />Монтаж</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
        <div onClick={() => setFilterStatus("")}
          className={cn("bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm cursor-pointer transition-all hover:shadow-md", !filterStatus ? "ring-2 ring-offset-2 ring-primary-500 shadow-lg" : "")}>
          <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center"><Wrench className="w-4 h-4 text-primary-600" /></div>
          <div><p className="text-lg font-bold text-gray-900">{stats.total}</p><p className="text-[11px] text-gray-500">Всего</p></div>
        </div>
        {Object.entries(STATUS_META).map(([k, m]) => {
          const Icon = m.icon;
          return (
            <div key={k} onClick={() => setFilterStatus(filterStatus === k ? "" : k)}
              className={cn("rounded-xl border p-3 flex items-center gap-2.5 shadow-sm cursor-pointer transition-all hover:shadow-md", m.lightBg,
                filterStatus === k ? "ring-2 ring-offset-2 ring-gray-900 shadow-lg" : filterStatus ? "opacity-40 grayscale" : "")}>
              <Icon className={cn("w-4 h-4", m.color)} />
              <div><p className="text-sm font-bold text-gray-900">{stats.counts[k] || 0}</p><p className="text-[10px] text-gray-500 leading-tight">{m.label}</p></div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input placeholder="Поиск по сделке..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex-1" />
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setView("kanban")} className={cn("p-1.5 rounded-md", view === "kanban" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500")}><LayoutDashboard className="w-4 h-4" /></button>
          <button onClick={() => setView("list")} className={cn("p-1.5 rounded-md", view === "list" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500")}><List className="w-4 h-4" /></button>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium shadow-sm"><Plus className="w-3.5 h-3.5" />Монтаж</button>
      </div>

      {view === "kanban" && (
        <div className={cn("grid gap-3", filterStatus ? "grid-cols-1 max-w-xl mx-auto" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
          {Object.entries(STATUS_META).map(([status, meta]) => {
            const col = active.filter((t: any) => t.status === status);
            if (filterStatus && status !== filterStatus) return null;
            const Icon = meta.icon;
            return (
              <div key={status} className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
                <div className={cn("flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 rounded-t-xl", meta.lightBg)}>
                  <Icon className={cn("w-4 h-4", meta.color)} />
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex-1 truncate">{meta.label}</h3>
                  <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center text-white", meta.bg)}>{col.length}</span>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
                  {col.length === 0 && <div className="flex flex-col items-center justify-center py-10 text-gray-300"><Inbox className="w-8 h-8 mb-2" /><p className="text-xs">Пусто</p></div>}
                  {col.map((t: any) => (
                    <div key={t.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-gray-900 text-[13px] cursor-pointer hover:text-primary-600 transition-colors" onClick={(e) => { e.stopPropagation(); if(t.deal?.dealNumber) navigate("/deals#" + encodeURIComponent(t.deal.dealNumber)); }}>{t.deal?.dealNumber || "Без сделки"}</p>
                        <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", meta.bg)} /></div>
                      {t.installerId && <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1"><User className="w-3 h-3" />{userMap[t.installerId] || "—"}</div>}
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5"><Calendar className="w-3 h-3" />{t.installDate ? fmtDate(t.installDate) : fmtDate(t.createdAt)}</div>
                      {t.notes && <p className="text-[11px] text-gray-400 italic mt-1 line-clamp-2">{t.notes}</p>}
                      {status !== "Completed" && (
                        <button onClick={() => statusMutation.mutate({ id: t.id, status: status === "Pending" ? "InProgress" : "Completed" })}
                          className="w-full mt-2 py-1 text-[11px] font-medium text-gray-500 border border-gray-200 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-1">
                          <ArrowRight className="w-3 h-3" />{status === "Pending" ? "В работу" : "Завершить"}</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "list" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {active.length === 0 && <div className="flex flex-col items-center justify-center py-16 text-gray-300"><Search className="w-12 h-12 mb-3" /><p className="text-sm text-gray-400">{searchQuery ? "Ничего не найдено" : "Нет монтажей"}</p></div>}
          <div className="divide-y divide-gray-100">
            {active.map((t: any) => (
              <div key={t.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_META[t.status]?.bg || "bg-gray-400")} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm cursor-pointer hover:text-primary-600 transition-colors" onClick={() => { if(t.deal?.dealNumber) navigate("/deals#" + encodeURIComponent(t.deal.dealNumber)); }}>{t.deal?.dealNumber || "Без сделки"}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400 mt-0.5">
                    {t.installerId && <span><User className="w-3 h-3 inline mr-1" />{userMap[t.installerId]}</span>}
                    <span><Calendar className="w-3 h-3 inline mr-1" />{t.installDate ? fmtDate(t.installDate) : "--.--"}</span>
                  </div>
                </div>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_META[t.status]?.lightBg, STATUS_META[t.status]?.color)}>{STATUS_META[t.status]?.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && <InstallFormModal onClose={() => setShowForm(false)} deals={deals} users={users}
        onSubmit={(d) => createMutation.mutate(d)} isPending={createMutation.isPending} />}
    </div>
  );
}

function InstallFormModal({ onClose, deals, users, onSubmit, isPending }: { onClose: () => void; deals?: any[]; users?: any[]; onSubmit: (d: any) => void; isPending: boolean }) {
  const [f, setF] = useState({ dealId: "", installerId: "", installDate: "", notes: "" });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100"><h3 className="font-semibold text-gray-900 flex items-center gap-2"><Plus className="w-4 h-4 text-primary-500" />Новый монтаж</h3><button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button></div>
        <div className="px-5 py-4 space-y-3">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Сделка</label><select value={f.dealId} onChange={(e) => setF({ ...f, dealId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"><option value="">Выберите сделку</option>{deals?.map((d: any) => <option key={d.id} value={d.id}>{d.dealNumber}</option>)}</select></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Монтажник</label><select value={f.installerId} onChange={(e) => setF({ ...f, installerId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"><option value="">Не назначен</option>{users?.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}</select></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Дата</label><input type="date" value={f.installDate} onChange={(e) => setF({ ...f, installDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Заметки</label><textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none" rows={2} /></div>
        </div>
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50"><div className="flex-1" /><button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button><button onClick={() => { if (!f.dealId) { toast.error("Выберите сделку"); return; } onSubmit(f); }} disabled={isPending} className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50 shadow-sm">{isPending ? "Создание..." : "Создать"}</button></div>
      </div>
    </div>
  );
}
