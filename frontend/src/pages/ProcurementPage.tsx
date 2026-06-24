import React, { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "./cn";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { procurementAPI, authAPI } from "../api";
import SuppliersPanel from "../components/SuppliersPanel";
import OrdersPanel from "../components/OrdersPanel";
import ProcurementFormModal from "../components/ProcurementFormModal";
import toast from "react-hot-toast";
import FilePreviewModal from "../components/FilePreviewModal";
import {      AlertCircle, Archive, ArrowLeft, ArrowRight, Ban, Building2, Calendar, Check, ChevronDown, ClipboardList, Clock, CreditCard, Download, Edit3, ExternalLink, Eye, EyeOff, FileText, Icon, InboxDashboard, Link, List, Mail, Package, Paperclip, Phone, Plus, RequestCard, RequestRow, Search, ShoppingCart, SortDesc, Trash2, Truck, User, Users, X      } from "lucide-react";;;;;;;

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
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
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
            <div onClick={() => setFilterStatus("")}
              className={cn("bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm cursor-pointer transition-all hover:shadow-md",
                !filterStatus ? "ring-2 ring-offset-2 ring-primary-500 shadow-lg" : ""
              )}>
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
                        <RequestCard key={r.id} request={r} userMap={userMap} supplierMap={supplierMap} onFileOpen={(url, name) => setPreviewFile({ url, name })}
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
                  <RequestRow key={r.id} request={r} userMap={userMap} supplierMap={supplierMap} onFileOpen={(url, name) => setPreviewFile({ url, name })}
                    onEdit={() => setEditId(r.id)} onStatusChange={handleStatusChange} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "suppliers" && <SuppliersPanel data={data} users={users} />}
      {tab === "orders" && <OrdersPanel data={data} />}

      {showForm && tab === "requests" && <ProcurementFormModal onClose={() => setShowForm(false)} users={users} suppliers={data?.suppliers || []}
        onSubmit={(d) => createReq.mutate(d)} isPending={createReq.isPending} />}

      {editId && <ProcurementFormModal data={active.find((r: any) => r.id === editId) || archived.find((r: any) => r.id === editId)}
        onClose={() => setEditId(null)} users={users} suppliers={data?.suppliers || []} isEdit
        onUpdate={(id, d) => updateReq.mutate({ id, data: d })} onDelete={(id) => deleteReq.mutate(id)}
        isPending={updateReq.isPending} />}
\n      {previewFile && (
        <FilePreviewModal
          file={{ fileUrl: previewFile.url, fileName: previewFile.name, downloadUrl: previewFile.url }}
          onClose={() => setPreviewFile(null)}
          token={typeof window !== 'undefined' ? localStorage.getItem('token') : undefined}
        />
      )}

    </div>
  );
}
function RequestCard({ request, userMap, supplierMap, onEdit, onStatusChange, onFileOpen }: {
  request: any; userMap: Record<string, string>; supplierMap: Record<string, any>; onEdit: () => void; onStatusChange: (id: string, status: string) => void; onFileOpen: (url: string, name: string) => void;
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
          <button onClick={(e) => { e.stopPropagation(); onFileOpen(`${API_BASE}/api/procurement/download/${r.id}`, r.fileName || "Файл"); }}
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
function RequestRow({ request, userMap, supplierMap, onEdit, onStatusChange, onFileOpen }: {
  request: any; userMap: Record<string, string>; supplierMap: Record<string, any>; onEdit: () => void; onStatusChange: (id: string, status: string) => void; onFileOpen: (url: string, name: string) => void;
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
            <button onClick={(e) => { e.stopPropagation(); onFileOpen(`${API_BASE}/api/procurement/download/${r.id}`, r.fileName || "Файл"); }}
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
