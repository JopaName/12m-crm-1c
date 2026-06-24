import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { procurementAPI } from "../api";
import { cn } from "./cn";
import toast from "react-hot-toast";
import { Plus, Edit3, Trash2, Search, Truck, Phone, Mail, Building2, X, CreditCard } from "lucide-react";

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

export default SuppliersPanel;
