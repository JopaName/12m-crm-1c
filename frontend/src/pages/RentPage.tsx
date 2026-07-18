import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rentAPI } from "../api";
import toast from "react-hot-toast";
import { cn } from "../components/cn";
import { Plus, Search, LayoutDashboard, List, Building2, User, Calendar, DollarSign, X, Inbox, CreditCard, ArrowRight } from "lucide-react";

const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("ru-RU") : "";
const isActive = (start: string, end?: string | null) => {
  if (!start) return false;
  const now = new Date();
  return new Date(start) <= now && (!end || new Date(end) >= now);
};

type ViewMode = "kanban" | "list";

export default function RentPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("kanban");
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [filterClient, setFilterClient] = useState("");

  const { data: contracts, isLoading } = useQuery({ queryKey: ["rent"], queryFn: () => rentAPI.getAll().then((r) => r.data) });
  const { data: billing } = useQuery({ queryKey: ["rent-billing"], queryFn: () => rentAPI.getBilling().then((r) => r.data) });
  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: () => Promise.resolve([]) });

  const createMutation = useMutation({
    mutationFn: (d: any) => rentAPI.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["rent"] }); toast.success("Договор создан"); setShowForm(false); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const clientMap = useMemo(() => { const m: Record<string, any> = {}; clients?.forEach((c: any) => { m[c.id] = c; }); return m; }, [clients]);

  const active = useMemo(() => {
    let items = contracts || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((c: any) => (c.contractNumber || "").toLowerCase().includes(q) || (clientMap[c.clientId]?.name || "").toLowerCase().includes(q));
    }
    if (filterActive !== null) items = items.filter((c: any) => isActive(c.startDate, c.endDate) === filterActive);
    if (filterClient) items = items.filter((c: any) => c.clientId === filterClient);
    return items;
  }, [contracts, searchQuery, filterActive, filterClient, clientMap]);

  const stats = useMemo(() => {
    let activeCount = 0, totalPayment = 0, overduePayment = 0;
    (contracts || []).forEach((c: any) => { if (isActive(c.startDate, c.endDate)) activeCount++; totalPayment += c.monthlyPayment || 0; });
    (billing || []).forEach((b: any) => { if (b.status === "Overdue") overduePayment += b.amount || 0; });
    return { total: (contracts || []).length, active: activeCount, totalPayment, overduePayment };
  }, [contracts, billing]);

  if (isLoading) return <div className="max-w-7xl mx-auto p-6"><div className="animate-pulse space-y-6"><div className="h-8 bg-gray-200 rounded-lg w-48" /><div className="h-64 bg-gray-200 rounded-xl" /></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2.5"><CreditCard className="w-6 h-6 text-primary-500" />Аренда</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div onClick={() => { setFilterActive(null); setFilterClient(""); }}
          className={cn("bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm cursor-pointer transition-all hover:shadow-md", filterActive === null && !filterClient ? "ring-2 ring-offset-2 ring-primary-500 shadow-lg" : "")}>
          <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center"><CreditCard className="w-4 h-4 text-primary-600" /></div>
          <div><p className="text-lg font-bold text-gray-900">{stats.total}</p><p className="text-[11px] text-gray-500">Договоров</p></div>
        </div>
        <div onClick={() => setFilterActive(filterActive === true ? null : true)} className={cn("rounded-xl border p-3 flex items-center gap-2.5 shadow-sm cursor-pointer transition-all hover:shadow-md", "bg-green-50", filterActive === true ? "ring-2 ring-offset-2 ring-gray-900 shadow-lg" : "")}>
          <DollarSign className="w-4 h-4 text-green-600" /><div><p className="text-sm font-bold text-gray-900">{stats.active}</p><p className="text-[10px] text-gray-500">Активных</p></div>
        </div>
        <div className="rounded-xl border p-3 flex items-center gap-2.5 shadow-sm bg-blue-50">
          <DollarSign className="w-4 h-4 text-blue-600" /><div><p className="text-sm font-bold text-gray-900">{stats.totalPayment.toLocaleString()} ₽</p><p className="text-[10px] text-gray-500">Платежи/мес</p></div>
        </div>
        <div className={cn("rounded-xl border p-3 flex items-center gap-2.5 shadow-sm", stats.overduePayment > 0 ? "bg-red-50" : "bg-gray-50")}>
          <Calendar className={cn("w-4 h-4", stats.overduePayment > 0 ? "text-red-600" : "text-gray-400")} /><div><p className="text-sm font-bold text-gray-900">{stats.overduePayment.toLocaleString()} ₽</p><p className="text-[10px] text-gray-500">Просрочено</p></div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input placeholder="Поиск договоров..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
          className="appearance-none pl-8 pr-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer">
          <option value="">Все клиенты</option>{clients?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <div className="flex-1" />
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium shadow-sm"><Plus className="w-3.5 h-3.5" />Договор</button>
      </div>

      {active.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center text-gray-400"><Search className="w-12 h-12 mx-auto mb-3" /><p>{searchQuery ? "Ничего не найдено" : "Нет договоров"}</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {active.map((c: any) => {
            const client = clientMap[c.clientId];
            const active = isActive(c.startDate, c.endDate);
            const billingItems = (billing || []).filter((b: any) => b.contractId === c.id && b.status === "Overdue");
            return (
              <div key={c.id} className={cn("bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-4", active ? "border-l-4 border-l-green-500" : "border-gray-200 opacity-60")}>
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-gray-900 text-sm">{c.contractNumber || "Без номера"}</p>
                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>{active ? "Активен" : "Неактивен"}</span>
                </div>
                {client && <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1"><Building2 className="w-3 h-3" />{client.name}</div>}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{(c.monthlyPayment || 0).toLocaleString()} ₽/мес</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(c.startDate)}</span>
                </div>
                {billingItems.length > 0 && <div className="mt-2 text-[10px] font-medium text-red-600 bg-red-50 px-2 py-1 rounded">{billingItems.length} просроч. платежей</div>}
              </div>
            );
          })}
        </div>
      )}

      {showForm && <RentFormModal onClose={() => setShowForm(false)} clients={clients}
        onSubmit={(d) => createMutation.mutate(d)} isPending={createMutation.isPending} />}
    </div>
  );
}

function RentFormModal({ onClose, clients, onSubmit, isPending }: { onClose: () => void; clients?: any[]; onSubmit: (d: any) => void; isPending: boolean }) {
  const [f, setF] = useState({ contractNumber: "", clientId: "", dealId: "", monthlyPayment: 0, startDate: "" });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100"><h3 className="font-semibold text-gray-900 flex items-center gap-2"><Plus className="w-4 h-4 text-primary-500" />Договор аренды</h3><button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button></div>
        <div className="px-5 py-4 space-y-3">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Номер</label><input value={f.contractNumber} onChange={(e) => setF({ ...f, contractNumber: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" autoFocus /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Клиент</label><select value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"><option value="">Выберите клиента</option>{clients?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Платёж/мес</label><input type="number" value={f.monthlyPayment} onChange={(e) => setF({ ...f, monthlyPayment: +e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Дата начала</label><input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50"><div className="flex-1" /><button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button><button onClick={() => { if (!f.contractNumber.trim()) { toast.error("Введите номер"); return; } onSubmit(f); }} disabled={isPending} className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50 shadow-sm">{isPending ? "Создание..." : "Создать"}</button></div>
      </div>
    </div>
  );
}
