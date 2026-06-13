import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { procurementAPI, authAPI } from "../api";
import toast from "react-hot-toast";
import { Plus, Search, LayoutDashboard, List, Archive, Clock, User, FileText, Package, ChevronDown, Calendar, AlertCircle, ArrowLeft, ArrowRight, Trash2, Edit3, X, Check, Inbox, ShoppingCart, Truck, Eye, EyeOff, Users, Building2, ClipboardList, Phone, Mail, CreditCard, Ban, SortDesc, Paperclip, Link, ExternalLink, Download } from "lucide-react";

const STATUSES = [
  "Не прочитано",
  "Прочитано",
  "Найдено но не оплачено",
  "Оплачено и ждем доставки",
  "Куплено/забрали",
];

const STATUS_META: Record<string, { color: string; bg: string; lightBg: string; icon: any; label: string }> = {
  "Не прочитано": { color: "text-rose-600", bg: "bg-rose-500", lightBg: "bg-rose-50", icon: Ban, label: "Не прочитано" },
  "Прочитано": { color: "text-slate-600", bg: "bg-slate-500", lightBg: "bg-slate-100", icon: Eye, label: "Прочитано" },
  "Найдено но не оплачено": { color: "text-amber-600", bg: "bg-amber-500", lightBg: "bg-amber-50", icon: ShoppingCart, label: "Найдено" },
  "Оплачено и ждем доставки": { color: "text-violet-600", bg: "bg-violet-500", lightBg: "bg-violet-50", icon: Truck, label: "Оплачено" },
  "Куплено/забрали": { color: "text-emerald-600", bg: "bg-emerald-500", lightBg: "bg-emerald-50", icon: Package, label: "Куплено" },
};

type ViewMode = "kanban" | "list";
type SortKey = "createdAt" | "-createdAt" | "dueDate" | "productName" | "status" | "responsible";

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("ru-RU") : "";

const isOverdue = (dueDate: string | null | undefined) => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
};

const daysUntil = (dueDate: string | null | undefined) => {
  if (!dueDate) return null;
  const diff = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

const getDueDateColor = (dueDate: string | null | undefined) => {
  const days = daysUntil(dueDate);
  if (days === null) return "";
  if (days < 0) return "text-red-600";
  if (days <= 3) return "text-amber-600";
  return "text-gray-400";
};

const cleanData = (d: Record<string, any>) => {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(d)) {
    if (v === "" || v === undefined || v === null || k === "dueDateIndefinite") continue;
    out[k] = v;
  }
  return out;
};

const API_BASE = "";

export default function ProcurementPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("kanban");
  const [sortBy, setSortBy] = useState<SortKey>("-createdAt");
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterResponsible, setFilterResponsible] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [form, setForm] = useState({
    productName: "",
    quantity: 1,
    responsibleUserId: "",
    supplierId: "",
    dueDate: "",
    dueDateIndefinite: true,
    note: "",
    fileUrl: "",
    fileName: "",
  });
  const [tab, setTab] = useState<"requests" | "suppliers" | "orders">("requests");

  const { data, isLoading } = useQuery({
    queryKey: ["procurement"],
    queryFn: () => procurementAPI.getAll().then((r) => r.data),
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => authAPI.getUsers().then((r) => r.data),
  });

  const createReq = useMutation({
    mutationFn: (d: any) => procurementAPI.createRequest(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      toast.success("Запрос создан");
      setShowForm(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const updateReq = useMutation({
    mutationFn: ({ id, data: d }: { id: string; data: any }) =>
      procurementAPI.updateRequest(id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      toast.success("Запрос обновлён");
      setEditId(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const deleteReq = useMutation({
    mutationFn: (id: string) => procurementAPI.deleteRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      toast.success("Запрос архивирован");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const resetForm = () =>
    setForm({
      productName: "",
      quantity: 1,
      responsibleUserId: "",
      supplierId: "",
      dueDate: "",
      dueDateIndefinite: true,
      note: "",
      fileUrl: "",
      fileName: "",
    });

  const handleStatusChange = (id: string, newStatus: string) => {
    updateReq.mutate({ id, data: { status: newStatus } });
  };

  const userMap = useMemo(() => {
    const m: Record<string, string> = {};
    users?.forEach((u: any) => { m[u.id] = `${u.firstName} ${u.lastName}`; });
    return m;
  }, [users]);

  const supplierMap = useMemo(() => {
    const m: Record<string, any> = {};
    (data?.suppliers || []).forEach((s: any) => { m[s.id] = s; });
    return m;
  }, [data]);

  const allRequests = useMemo(() => data?.requests || [], [data]);

  const active = useMemo(() => {
    let items = allRequests.filter((r: any) => !r.isArchived);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((r: any) =>
        (r.productName || "").toLowerCase().includes(q) ||
        (r.product?.name || "").toLowerCase().includes(q) ||
        (r.note || "").toLowerCase().includes(q) ||
        (supplierMap[r.supplierId]?.name || "").toLowerCase().includes(q)
      );
    }
    if (filterResponsible) {
      items = items.filter((r: any) => r.responsibleUserId === filterResponsible);
    }
    if (filterStatus) {
      items = items.filter((r: any) => r.status === filterStatus);
    }
    const sortFns: Record<string, (a: any, b: any) => number> = {
      createdAt: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      "-createdAt": (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      dueDate: (a, b) => (a.dueDate || "Z").localeCompare(b.dueDate || "Z"),
      productName: (a, b) => (a.productName || a.product?.name || "").localeCompare(b.productName || b.product?.name || ""),
      status: (a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status),
      responsible: (a, b) => (userMap[a.responsibleUserId] || "").localeCompare(userMap[b.responsibleUserId] || ""),
    };
    if (sortFns[sortBy]) items.sort(sortFns[sortBy]);
    return items;
  }, [allRequests, searchQuery, filterResponsible, filterStatus, sortBy, userMap, supplierMap]);

  const archived = useMemo(() => allRequests.filter((r: any) => r.isArchived), [allRequests]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUSES.forEach((s) => (counts[s] = 0));
    let overdue = 0;
    allRequests.filter((r: any) => !r.isArchived).forEach((r: any) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
      if (isOverdue(r.dueDate)) overdue++;
    });
    return { total: allRequests.filter((r: any) => !r.isArchived).length, overdue, counts };
  }, [allRequests]);

  const kanbanColumns = STATUSES.map((status) => ({
    status,
    items: active.filter((r: any) => r.status === status),
    meta: STATUS_META[status],
  }));

  if (isLoading)
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded-lg w-48" />
          <div className="h-16 bg-gray-200 rounded-xl" />
          <div className="grid grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-96 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
          <ShoppingCart className="w-6 h-6 text-primary-500" />
          Закупки
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-gray-100 rounded-lg p-0.5 text-sm">
            {(["requests", "suppliers", "orders"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("px-3.5 py-1.5 rounded-md transition-all duration-200 flex items-center gap-1.5",
                  tab === t ? "bg-white text-gray-900 shadow-sm font-medium" : "text-gray-500 hover:text-gray-700"
                )}>
                {t === "requests" && <ClipboardList className="w-3.5 h-3.5" />}
                {t === "suppliers" && <Building2 className="w-3.5 h-3.5" />}
                {t === "orders" && <Truck className="w-3.5 h-3.5" />}
                {t === "requests" ? "Заявки" : t === "suppliers" ? "Поставщики" : "Заказы"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === "requests" && (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 mb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{stats.total}</p>
                <p className="text-[11px] text-gray-500">Всего</p>
              </div>
            </div>
            {STATUSES.map((s) => {
              const Icon = STATUS_META[s].icon;
              return (
                <div key={s}
                  className={cn("rounded-xl border p-3 flex items-center gap-2.5 shadow-sm cursor-pointer transition-all hover:shadow-md",
                    STATUS_META[s].lightBg,
                    filterStatus === s ? "ring-2 ring-offset-2 ring-gray-900 shadow-lg" : filterStatus ? "opacity-40 grayscale" : ""
                  )}
                  onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
                >
                  <Icon className={cn("w-4 h-4", STATUS_META[s].color)} />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{stats.counts[s] || 0}</p>
                    <p className="text-[10px] text-gray-500 leading-tight">{STATUS_META[s].label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Поиск по названию товара..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="relative">
              <select value={filterResponsible} onChange={(e) => setFilterResponsible(e.target.value)}
                className="appearance-none pl-8 pr-7 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all cursor-pointer min-w-[140px]">
                <option value="">Все сотрудники</option>
                {users?.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
              </select>
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="appearance-none pl-8 pr-7 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all cursor-pointer">
                <option value="-createdAt">Сначала новые</option>
                <option value="createdAt">Сначала старые</option>
                <option value="dueDate">По сроку</option>
                <option value="productName">По названию</option>
                <option value="status">По статусу</option>
                <option value="responsible">По сотруднику</option>
              </select>
              <SortDesc className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>

            <div className="flex-1" />

            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setView("kanban")}
                className={cn("p-1.5 rounded-md transition-all", view === "kanban" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                title="Канбан"><LayoutDashboard className="w-4 h-4" /></button>
              <button onClick={() => setView("list")}
                className={cn("p-1.5 rounded-md transition-all", view === "list" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                title="Список"><List className="w-4 h-4" /></button>
            </div>

            {archived.length > 0 && (
              <button onClick={() => setShowArchived(!showArchived)}
                className={cn("flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-lg border transition-all",
                  showArchived ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                )}><Archive className="w-3.5 h-3.5" />{archived.length}</button>
            )}

            <button onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium shadow-sm hover:shadow-md">
              <Plus className="w-3.5 h-3.5" />Новая заявка</button>
          </div>

          {/* Kanban */}
          {view === "kanban" && (
            <div className={cn("grid gap-3", filterStatus ? "grid-cols-1 max-w-xl mx-auto" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5")}>
              {kanbanColumns.filter((col) => !filterStatus || col.status === filterStatus).map((col) => {
                const Icon = col.meta.icon;
                return (
                  <div key={col.status} className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
                    <div className={cn("flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 rounded-t-xl", col.meta.lightBg)}>
                      <Icon className={cn("w-4 h-4", col.meta.color)} />
                      <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex-1 truncate">{col.status}</h3>
                      <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center text-white", col.meta.bg)}>{col.items.length}</span>
                    </div>
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)]">
                      {col.items.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                          <Inbox className="w-8 h-8 mb-2" />
                          <p className="text-xs">Пусто</p>
                        </div>
                      )}
                      {col.items.map((r: any) => (
                        <RequestCard key={r.id} request={r} userMap={userMap} supplierMap={supplierMap}
                          onEdit={() => setEditId(r.id)} onStatusChange={handleStatusChange} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* List */}
          {view === "list" && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {active.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                  <Search className="w-12 h-12 mb-3" />
                  <p className="text-sm text-gray-400">{searchQuery ? "Ничего не найдено" : "Нет активных заявок"}</p>
                </div>
              )}
              <div className="divide-y divide-gray-100">
                {(showArchived ? [...active, ...archived] : active).map((r: any) => (
                  <RequestRow key={r.id} request={r} userMap={userMap} supplierMap={supplierMap}
                    onEdit={() => setEditId(r.id)} onStatusChange={handleStatusChange} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "suppliers" && <SuppliersPanel data={data} users={users} />}
      {tab === "orders" && <OrdersPanel data={data} />}

      {showForm && tab === "requests" && <FormModal onClose={() => setShowForm(false)} users={users} suppliers={data?.suppliers || []}
        onSubmit={(d) => createReq.mutate(d)} isPending={createReq.isPending} />}

      {editId && <FormModal data={active.find((r: any) => r.id === editId) || archived.find((r: any) => r.id === editId)}
        onClose={() => setEditId(null)} users={users} suppliers={data?.suppliers || []} isEdit
        onUpdate={(id, d) => updateReq.mutate({ id, data: d })} onDelete={(id) => deleteReq.mutate(id)}
        isPending={updateReq.isPending} />}

      /* ======== RequestCard ======== */
    </div>
  );
}
function RequestCard({ request, userMap, supplierMap, onEdit, onStatusChange }: {
  request: any; userMap: Record<string, string>; supplierMap: Record<string, any>; onEdit: () => void; onStatusChange: (id: string, status: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const r = request;
  const name = r.productName || r.product?.name || "Без названия";
  const overdue = isOverdue(r.dueDate);
  const dueColor = getDueDateColor(r.dueDate);
  const days = daysUntil(r.dueDate);
  const supplier = supplierMap[r.supplierId];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const availableStatuses = STATUSES.filter((_, i) => i !== STATUSES.indexOf(r.status));

  return (
    <div className={cn("bg-white rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md group cursor-pointer",
      overdue ? "border-l-4 border-l-red-500" : "border-gray-200")} onClick={onEdit}>
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-gray-900 text-[13px] leading-snug line-clamp-2 flex-1">{name}</p>
          <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", STATUS_META[r.status]?.bg || "bg-gray-400")} />
        </div>
        <p className="text-xs text-gray-500 mt-1 font-medium">{r.quantity} шт.</p>
        {supplier && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-1">
            <Building2 className="w-3 h-3 shrink-0" />
            <span className="truncate">{supplier.name}</span>
          </div>
        )}
        <div className="flex flex-col gap-0.5 mt-1.5">
          {r.responsibleUserId && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <User className="w-3 h-3 shrink-0" />
              <span className="truncate">{userMap[r.responsibleUserId] || "—"}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>{fmtDate(r.createdAt)}</span>
          </div>
          {r.dueDate && (
            <div className={cn("flex items-center gap-1.5 text-[11px]", dueColor)}>
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{fmtDate(r.dueDate)}{days !== null && days > 0 && ` (осталось ${days} д.)`}</span>
            </div>
          )}
        </div>
        {r.note && <p className="text-[11px] text-gray-400 italic mt-1.5 line-clamp-2 border-l-2 border-gray-200 pl-2">{r.note}</p>}
        {r.fileUrl && (
          <button onClick={(e) => { e.stopPropagation(); window.open(`${API_BASE}/api/procurement/download/${r.id}`, "_blank"); }}
            className="mt-1.5 flex items-center gap-1 text-[10px] text-primary-600 hover:text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded cursor-pointer">
            <Paperclip className="w-3 h-3" />{r.fileName || "Файл"}</button>
        )}
        {overdue && (
          <div className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
            <AlertCircle className="w-3 h-3" />Просрочено</div>
        )}
      </div>
      <div className="flex items-center border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className="relative flex-1" ref={menuRef}>
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_META[r.status]?.bg || "bg-gray-400")} />
            {r.status}<ChevronDown className="w-2.5 h-2.5 text-gray-400" /></button>
          {menuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
              {availableStatuses.map((s) => {
                const Icon = STATUS_META[s].icon;
                return (
                  <button key={s} onClick={() => { onStatusChange(r.id, s); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors text-left">
                    <Icon className={cn("w-3 h-3", STATUS_META[s].color)} />{s}</button>
                );
              })}
            </div>
          )}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="px-2.5 py-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors" title="Редактировать">
          <Edit3 className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

/* ======== RequestRow ======== */
function RequestRow({ request, userMap, supplierMap, onEdit, onStatusChange }: {
  request: any; userMap: Record<string, string>; supplierMap: Record<string, any>; onEdit: () => void; onStatusChange: (id: string, status: string) => void;
}) {
  const r = request;
  const overdue = isOverdue(r.dueDate);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const supplier = supplierMap[r.supplierId];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const availableStatuses = STATUSES.filter((_, i) => i !== STATUSES.indexOf(r.status));

  return (
    <div className={cn("flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group",
      r.isArchived && "opacity-50", overdue && "bg-red-50/30")}>
      <div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_META[r.status]?.bg || "bg-gray-400")} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 text-sm truncate">{r.productName || r.product?.name || "?"}</p>
          {overdue && <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded whitespace-nowrap">Просрочено</span>}
          {r.isArchived && <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Архив</span>}
          {r.fileUrl && (
            <button onClick={(e) => { e.stopPropagation(); window.open(`${API_BASE}/api/procurement/download/${r.id}`, "_blank"); }}
              className="text-[10px] text-primary-500 hover:text-primary-700 flex items-center gap-0.5 whitespace-nowrap cursor-pointer"
              title={r.fileName || "Файл"}>
              <Paperclip className="w-3 h-3" /></button>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400 mt-0.5">
          <span className="font-medium text-gray-500">{r.quantity} шт.</span>
          {supplier && (
            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{supplier.name}</span>
          )}
          {r.responsibleUserId && (
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{userMap[r.responsibleUserId] || "—"}</span>
          )}
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(r.createdAt)}</span>
          {r.dueDate && <span className={cn("flex items-center gap-1", getDueDateColor(r.dueDate))}><AlertCircle className="w-3 h-3" />{fmtDate(r.dueDate)}</span>}
          {r.note && <span className="italic text-gray-300 truncate max-w-[200px]">«{r.note}»</span>}
        </div>
      </div>
      <div className="relative" ref={menuRef}>
        <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className={cn("flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all hover:shadow-sm", STATUS_META[r.status]?.lightBg, "border-gray-200")}>
          <div className={cn("w-1.5 h-1.5 rounded-full", STATUS_META[r.status]?.bg)} />
          {r.status}<ChevronDown className="w-3 h-3 text-gray-400" /></button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[180px]">
            {availableStatuses.map((s) => {
              const Icon = STATUS_META[s].icon;
              return (
                <button key={s} onClick={() => { onStatusChange(r.id, s); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors text-left">
                  <Icon className={cn("w-3.5 h-3.5", STATUS_META[s].color)} />{s}</button>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit()} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" title="Редактировать">
          <Edit3 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

/* ======== FormModal ======== */
function FormModal({ data: initial, onClose, users, suppliers, isEdit, onSubmit, onUpdate, onDelete, isPending }: {
  data?: any; onClose: () => void; users?: any[]; suppliers?: any[]; isEdit?: boolean;
  onSubmit?: (d: any) => void; onUpdate?: (id: string, d: any) => void; onDelete?: (id: string) => void; isPending?: boolean;
}) {
  const [f, setF] = useState(initial ? {
    productName: initial.productName || initial.product?.name || "",
    quantity: initial.quantity,
    responsibleUserId: initial.responsibleUserId || "",
    supplierId: initial.supplierId || "",
    dueDate: initial.dueDate ? initial.dueDate.split("T")[0] : "",
    dueDateIndefinite: !initial.dueDate,
    note: initial.note || "",
    fileUrl: initial.fileUrl || "",
    fileName: initial.fileName || "",
  } : {
    productName: "",
    quantity: 1,
    responsibleUserId: "",
    supplierId: "",
    dueDate: "",
    dueDateIndefinite: true,
    note: "",
    fileUrl: "",
    fileName: "",
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await procurementAPI.uploadFile(file);
      const data = res.data;
      setF({ ...f, fileUrl: data.fileUrl, fileName: data.fileName });
      toast.success("Файл загружен");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Ошибка загрузки файла");
    }
    setUploading(false);
  };

  const handleSubmit = () => {
    if (!f.productName.trim()) { toast.error("Введите название товара"); return; }
    const cleaned = cleanData({ ...f, status: isEdit ? initial.status : "Не прочитано" });
    if (isEdit && onUpdate) onUpdate(initial.id, cleaned);
    else if (onSubmit) onSubmit(cleaned);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            {isEdit ? <><Edit3 className="w-4 h-4 text-primary-500" />Редактировать заявку</> : <><Plus className="w-4 h-4 text-primary-500" />Новая заявка</>}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Название товара <span className="text-red-500">*</span></label>
            <input type="text" placeholder="Введите название товара" value={f.productName}
              onChange={(e) => setF({ ...f, productName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Поставщик</label>
            <select value={f.supplierId} onChange={(e) => setF({ ...f, supplierId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all">
              <option value="">Не выбран</option>
              {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Количество</label>
              <input type="number" min={1} value={f.quantity}
                onChange={(e) => setF({ ...f, quantity: Math.max(1, +e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Прикрепить файл</label>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-all">
                {uploading ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : <Paperclip className="w-4 h-4" />}
                {f.fileName ? f.fileName : "Выбрать файл"}
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ответственный</label>
            <select value={f.responsibleUserId} onChange={(e) => setF({ ...f, responsibleUserId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all">
              <option value="">Не назначен</option>
              {users?.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Срок</label>
            <div className="flex items-center gap-3">
              <input type="date" value={f.dueDate} disabled={f.dueDateIndefinite}
                onChange={(e) => setF({ ...f, dueDate: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed" />
              <label className="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap cursor-pointer select-none">
                <input type="checkbox" checked={f.dueDateIndefinite}
                  onChange={(e) => setF({ ...f, dueDateIndefinite: e.target.checked, dueDate: e.target.checked ? "" : f.dueDate })} className="rounded" />
                Бессрочно</label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Примечание</label>
            <textarea placeholder="Дополнительная информация..." value={f.note}
              onChange={(e) => setF({ ...f, note: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all resize-none" rows={2} />
          </div>
          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Статус</label>
              <select value={initial.status} onChange={(e) => { initial.status = e.target.value; }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
          {isEdit && onDelete && (
            confirmDelete ? (
              <>
                <button onClick={() => { onDelete(initial.id); onClose(); }}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors">Подтвердить</button>
                <button onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-300 transition-colors">Отмена</button>
              </>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-3 h-3" />В архив</button>
            )
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Отмена</button>
          <button onClick={handleSubmit} disabled={isPending || uploading}
            className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
            {isPending ? (
              <span className="flex items-center gap-1.5"><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Сохранение...</span>
            ) : isEdit ? "Сохранить" : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======== SuppliersPanel ======== */
function SuppliersPanel({ data, users }: { data: any; users?: any[] }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailSupplier, setDetailSupplier] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", inn: "" });

  const createSup = useMutation({
    mutationFn: (d: any) => procurementAPI.createSupplier(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["procurement"] }); toast.success("Поставщик добавлен"); setShowForm(false); setForm({ name: "", phone: "", email: "", inn: "" }); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });
  const updateSup = useMutation({
    mutationFn: ({ id, data: d }: any) => procurementAPI.updateSupplier(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["procurement"] }); toast.success("Поставщик обновлён"); setEditId(null); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });
  const deleteSup = useMutation({
    mutationFn: (id: string) => procurementAPI.deleteSupplier(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["procurement"] }); toast.success("Поставщик удалён"); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const filteredSuppliers = useMemo(() => {
    const items = data?.suppliers || [];
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((s: any) => s.name.toLowerCase().includes(q) || (s.phone || "").includes(q) || (s.email || "").toLowerCase().includes(q) || (s.inn || "").includes(q));
  }, [data, searchQuery]);

  // SupplierDetail modal
  if (detailSupplier) {
    const linkedRequests = (data?.requests || []).filter((r: any) => r.supplierId === detailSupplier.id && !r.isArchived);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDetailSupplier(null)}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-500" />{detailSupplier.name}
            </h3>
            <button onClick={() => setDetailSupplier(null)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <div className="px-5 py-3 space-y-2 text-sm">
            {detailSupplier.phone && <div className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4 text-gray-400" />{detailSupplier.phone}</div>}
            {detailSupplier.email && <div className="flex items-center gap-2 text-gray-600"><Mail className="w-4 h-4 text-gray-400" />{detailSupplier.email}</div>}
            {detailSupplier.inn && <div className="flex items-center gap-2 text-gray-600"><CreditCard className="w-4 h-4 text-gray-400" />ИНН {detailSupplier.inn}</div>}
          </div>
          <div className="px-5 pb-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Связанные заявки ({linkedRequests.length})</h4>
            {linkedRequests.length === 0 && (
              <p className="text-xs text-gray-400 py-3 text-center">Нет связанных заявок</p>
            )}
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {linkedRequests.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 py-2.5">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_META[r.status]?.bg || "bg-gray-400")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.productName || r.product?.name || "?"}</p>
                    <p className="text-xs text-gray-400">{r.quantity} шт. — {fmtDate(r.createdAt)}</p>
                  </div>
                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", STATUS_META[r.status]?.bg.replace("bg-", "text-"), "bg-gray-100")}
                    style={STATUS_META[r.status] ? { color: "inherit" } : {}}>
                    {STATUS_META[r.status]?.label || r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
            <button onClick={() => setDetailSupplier(null)}
              className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors">Закрыть</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-gray-100">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="Поиск поставщиков..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
        </div>
        <button onClick={() => { setForm({ name: "", phone: "", email: "", inn: "" }); setShowForm(!showForm); }}
          className={cn("flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all font-medium",
            showForm ? "bg-gray-200 text-gray-600" : "bg-primary-600 text-white hover:bg-primary-700 shadow-sm")}>
          {showForm ? <><X className="w-3.5 h-3.5" />Отмена</> : <><Plus className="w-3.5 h-3.5" />Поставщик</>}</button>
      </div>
      {showForm && (
        <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-2.5">
          <input placeholder="Название *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input placeholder="Телефон" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div>
            <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div>
          </div>
          <input placeholder="ИНН" value={form.inn} onChange={(e) => setForm({ ...form, inn: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" />
          <div className="flex gap-2 pt-1">
            <button onClick={() => { if (!form.name.trim()) { toast.error("Введите название"); return; } createSup.mutate(form); }}
              className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">{createSup.isPending ? "Добавление..." : "Добавить"}</button>
          </div>
        </div>
      )}
      {filteredSuppliers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-300">
          <Building2 className="w-10 h-10 mb-2" />
          <p className="text-sm text-gray-400">{searchQuery ? "Ничего не найдено" : "Нет поставщиков"}</p>
        </div>
      )}
      <div className="divide-y divide-gray-100">
        {filteredSuppliers.map((s: any) =>
          editId === s.id ? (
            <div key={s.id} className="p-4 bg-primary-50 space-y-2.5">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
              <div className="grid grid-cols-2 gap-2.5">
                <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" /></div>
                <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" /></div>
              </div>
              <input value={form.inn} onChange={(e) => setForm({ ...form, inn: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
              <div className="flex gap-2">
                <button onClick={() => updateSup.mutate({ id: s.id, data: form })}
                  className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">{updateSup.isPending ? "Сохранение..." : "Сохранить"}</button>
                <button onClick={() => setEditId(null)} className="px-4 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-300 transition-colors">Отмена</button>
              </div>
            </div>
          ) : (
            <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group cursor-pointer"
              onClick={() => setDetailSupplier(s)}>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-gray-900 flex items-center gap-2">
                  {s.name}
                  <span className="text-[10px] text-gray-400 font-normal bg-gray-100 px-1.5 py-0.5 rounded-full">
                    {(data?.requests || []).filter((r: any) => r.supplierId === s.id && !r.isArchived).length} заявок</span>
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                  {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                  {s.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>}
                  {s.inn && <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" />ИНН {s.inn}</span>}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => { setForm({ name: s.name, phone: s.phone || "", email: s.email || "", inn: s.inn || "" }); setEditId(s.id); }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" title="Редактировать"><Edit3 className="w-3.5 h-3.5" /></button>
                <button onClick={() => { if (confirm("Удалить поставщика?")) deleteSup.mutate(s.id); }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Удалить"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ======== OrdersPanel ======== */
function OrdersPanel({ data }: { data: any }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrders = useMemo(() => {
    const items = data?.orders || [];
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((o: any) => (o.orderNumber || "").toLowerCase().includes(q) || (o.supplier?.name || "").toLowerCase().includes(q) || (o.status || "").toLowerCase().includes(q));
  }, [data, searchQuery]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-3 border-b border-gray-100">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="Поиск заказов..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
        </div>
      </div>
      {filteredOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-300">
          <Truck className="w-10 h-10 mb-2" />
          <p className="text-sm text-gray-400">{searchQuery ? "Ничего не найдено" : "Нет заказов"}</p>
        </div>
      )}
      <div className="divide-y divide-gray-100">
        {filteredOrders.map((o: any) => (
          <div key={o.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-primary-600" /></div>
              <div className="min-w-0">
                <p className="font-medium text-sm text-gray-900">{o.orderNumber}</p>
                <p className="text-xs text-gray-500 truncate">{o.supplier?.name}{o.status ? ` — ${o.status}` : ""}{o.totalAmount ? ` — ${o.totalAmount.toLocaleString()} ₽` : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {o.createdAt && <span>{fmtDate(o.createdAt)}</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
