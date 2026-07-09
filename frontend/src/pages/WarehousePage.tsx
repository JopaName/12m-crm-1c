import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { warehouseAPI } from "../api";
import { cn } from "../components/cn";
import { Plus, Search, Package, Boxes, ArrowRightLeft, Truck, ShoppingCart, Clipboard, Edit3, Trash2, X, Save, Building2, Calendar, DollarSign, Hash, Ruler, ChevronDown, ChevronRight, AlertTriangle, TrendingUp, TrendingDown, Home } from "lucide-react";
import toast from "react-hot-toast";

type TabType = "items" | "receipts" | "transfers";

export default function WarehousePage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [tab, setTab] = useState<TabType>("items");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [form, setForm] = useState({ productName: "", sku: "", description: "", quantity: "0", unit: "шт", purchasePrice: "", salePrice: "", categoryTag: "", note: "" });
  const [categoryForm, setCategoryForm] = useState({ name: "", parentId: "" });
  const [showCatForm, setShowCatForm] = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  const [treeKey, setTreeKey] = useState(0);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: categories } = useQuery({ queryKey: ["warehouse-categories"], queryFn: () => warehouseAPI.getCategories().then((r: any) => r.data), refetchInterval: 10000 });
  const { data: items } = useQuery({ queryKey: ["warehouse-items", selectedCategory], queryFn: () => selectedCategory ? warehouseAPI.getCategoryItems(selectedCategory).then((r: any) => r.data) : Promise.resolve([]), enabled: !!selectedCategory, refetchInterval: 5000 });
  const { data: transfers } = useQuery({ queryKey: ["warehouse-transfers"], queryFn: () => warehouseAPI.getTransfers().then((r: any) => r.data) });

  const filteredItems = (items || []).filter((i: any) => !searchQuery || (i.productName || "").toLowerCase().includes(searchQuery.toLowerCase()) || (i.sku || "").toLowerCase().includes(searchQuery.toLowerCase()));

  const stats = { total: filteredItems.length, totalValue: filteredItems.reduce((s: number, i: any) => s + (Number(i.quantity || 0) * Number(i.purchasePrice || 0)), 0), lowStock: filteredItems.filter((i: any) => Number(i.quantity) < 5 && Number(i.quantity) > 0).length, zeroStock: filteredItems.filter((i: any) => Number(i.quantity) <= 0).length };

  const createItem = useMutation({ mutationFn: ({ categoryId, data }: { categoryId: string; data: any }) => warehouseAPI.createItem(categoryId, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["warehouse-items", selectedCategory] }); toast.success("Товар добавлен"); setShowForm(false); }, onError: () => toast.error("Ошибка") });
  const updateItem = useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => warehouseAPI.updateItem(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["warehouse-items", selectedCategory] }); toast.success("Обновлено"); setShowForm(false); setEditingItem(null); }, onError: () => toast.error("Ошибка") });
  const deleteItem = useMutation({ mutationFn: (id: string) => warehouseAPI.deleteItem(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["warehouse-items", selectedCategory] }); toast.success("Удалено"); setDetailItem(null); }, onError: () => toast.error("Ошибка") });
  const createCat = useMutation({ mutationFn: (d: any) => warehouseAPI.createCategory(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["warehouse-categories"] }); toast.success("Каталог создан"); setShowCatForm(false); setEditingCat(null); setCategoryForm({ name: "", parentId: "" }); }, onError: () => toast.error("Ошибка") });
  const updateCat = useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => warehouseAPI.updateCategory(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["warehouse-categories"] }); toast.success("Каталог обновлён"); setShowCatForm(false); setEditingCat(null); setCategoryForm({ name: "", parentId: "" }); }, onError: () => toast.error("Ошибка") });
  const deleteCat = useMutation({ mutationFn: (id: string) => warehouseAPI.deleteCategory(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["warehouse-categories"] }); setSelectedCategory(null); }, onError: () => toast.error("Ошибка") });
  const transfer = useMutation({ mutationFn: (d: any) => warehouseAPI.transfer(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["warehouse-items", selectedCategory] }); queryClient.invalidateQueries({ queryKey: ["warehouse-transfers"] }); toast.success("Перемещение выполнено"); setShowForm(false); }, onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка") });

  const rootCategories = (categories || []).filter((c: any) => !c.parentId);
  const selectedCat = categories?.find((c: any) => c.id === selectedCategory);

  // Breadcrumbs path
  const breadcrumbs = useMemo(() => {
    if (!selectedCategory || !categories) return [];
    const path: any[] = [];
    let current = categories.find((c: any) => c.id === selectedCategory);
    while (current) { path.unshift(current); current = categories.find((c: any) => c.id === current.parentId); }
    return path;
  }, [selectedCategory, categories]);

  // Get descendant IDs to exclude from parent selector
  const getDescendantIds = useCallback((parentId: string, allCats: any[]): string[] => {
    const ids: string[] = [];
    const children = allCats.filter((c: any) => c.parentId === parentId);
    children.forEach(child => {
      ids.push(child.id);
      ids.push(...getDescendantIds(child.id, allCats));
    });
    return ids;
  }, []);

  // Available parent categories for the form (exclude self + descendants)
  const availableParents = useMemo(() => {
    if (!categories) return [];
    const excludedIds = new Set<string>();
    if (editingCat) {
      excludedIds.add(editingCat.id);
      getDescendantIds(editingCat.id, categories).forEach(id => excludedIds.add(id));
    }
    return categories.filter((c: any) => !excludedIds.has(c.id));
  }, [categories, editingCat, getDescendantIds]);

  // Build hierarchy display for parent selector
  const parentOptions = useMemo(() => {
    const result: { id: string; name: string; depth: number }[] = [];
    const addChildren = (parentId: string | null, depth: number) => {
      const children = availableParents.filter((c: any) => (c.parentId || null) === parentId);
      children.forEach(c => {
        result.push({ id: c.id, name: c.name, depth });
        addChildren(c.id, depth + 1);
      });
    };
    addChildren(null, 0);
    return result;
  }, [availableParents]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2.5"><Package className="w-6 h-6 text-primary-500" />Склад</h1>
        <div className="flex bg-gray-100 rounded-lg p-0.5 text-sm">
          {([{ k: "items", l: "Товары" }, { k: "receipts", l: "Поступления" }, { k: "transfers", l: "Перемещения" }] as { k: TabType; l: string }[]).map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} className={cn("px-3.5 py-1.5 rounded-md transition-all font-medium", tab === t.k ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}>{t.l}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm"><p className="text-lg font-bold text-gray-900">{stats.total}</p><p className="text-[11px] text-gray-500">Позиций</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm"><p className="text-lg font-bold text-gray-900">{stats.totalValue.toLocaleString()} ₽</p><p className="text-[11px] text-gray-500">На сумму</p></div>
        <div className={cn("rounded-xl border p-3 shadow-sm", stats.lowStock > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200")}><p className={cn("text-lg font-bold", stats.lowStock > 0 ? "text-amber-700" : "text-gray-900")}>{stats.lowStock}</p><p className="text-[11px] text-gray-500">Мало (меньше 5)</p></div>
        <div className={cn("rounded-xl border p-3 shadow-sm", stats.zeroStock > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-200")}><p className={cn("text-lg font-bold", stats.zeroStock > 0 ? "text-red-700" : "text-gray-900")}>{stats.zeroStock}</p><p className="text-[11px] text-gray-500">Нет в наличии</p></div>
      </div>

      {/* ITEMS TAB */}
      {tab === "items" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Categories sidebar */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
              <span className="font-semibold text-sm text-gray-700">Каталоги</span>
              <div className="flex items-center gap-0.5">
                <button onClick={() => { setExpandAll(!expandAll); setTreeKey(k => k + 1); }} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors" title={expandAll ? "Свернуть все" : "Развернуть все"}>
                  {expandAll ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <button onClick={() => setShowCatForm(true)} className="p-1 hover:bg-primary-50 rounded text-primary-500" title="Новый каталог"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto" key={treeKey}>
              {rootCategories.map((cat: any) => <CatNode key={cat.id} c={cat} all={categories || []} sel={selectedCategory} onSel={setSelectedCategory} expandAll={expandAll} onDel={(id, name, childCount) => { if (confirm(`Удалить каталог «${name}»` + (childCount > 0 ? ` и ${childCount} вложенных` : "") + "?")) deleteCat.mutate(id); }} onEdit={(c: any) => { setEditingCat(c); setCategoryForm({ name: c.name, parentId: c.parentId || "" }); setShowCatForm(true); }} />)}
              {(!categories || categories.length === 0) && <p className="text-xs text-gray-400 text-center py-4">Нет каталогов</p>}
            </div>
          </div>

          {/* Items table */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-3 border-b border-gray-100 space-y-2">
              {/* Breadcrumbs */}
              <div className="flex items-center gap-1 text-xs flex-wrap">
                <button onClick={() => setSelectedCategory(null)} className={cn("flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-gray-100 transition-colors", !selectedCategory ? "bg-primary-100 text-primary-700 font-medium" : "text-gray-500")}>
                  <Home className="w-3 h-3" /> Все
                </button>
                {breadcrumbs.map((c, i) => (
                  <span key={c.id} className="flex items-center gap-1">
                    <ChevronRight className="w-3 h-3 text-gray-300" />
                    <button onClick={() => setSelectedCategory(c.id)} className={cn("px-2 py-0.5 rounded-lg hover:bg-gray-100 transition-colors", i === breadcrumbs.length - 1 ? "bg-primary-100 text-primary-700 font-medium" : "text-gray-500")}>
                      {c.name}
                    </button>
                  </span>
                ))}
                {selectedCategory && <span className="text-[10px] text-gray-400 ml-1">({filteredItems.length})</span>}
              </div>
              {/* Controls */}
              <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1" />
              <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" /><input placeholder="Поиск..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-40 pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20" /></div>
              {selectedCategory && <button onClick={() => { setEditingItem(null); setForm({ productName: "", sku: "", description: "", quantity: "0", unit: "шт", purchasePrice: "", salePrice: "", categoryTag: "", note: "" }); setShowForm(true); }} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700"><Plus className="w-3 h-3" />Товар</button>}
              </div>
            </div>
            <div className="overflow-x-auto">
              {!selectedCategory ? <p className="text-sm text-gray-400 text-center py-12">← Выберите каталог слева</p> : filteredItems.length === 0 ? <p className="text-sm text-gray-400 text-center py-12">{searchQuery ? "Ничего не найдено" : "Нет товаров"}</p> : (
                <table className="w-full">
                  <thead><tr className="bg-gray-50 text-left">{["Товар","Артикул","Кол-во","Закупка","Продажа",""].map((h, i) => <th key={i} className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredItems.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setDetailItem(item)}>
                        <td className="px-3 py-2.5"><div className="text-sm font-medium text-gray-900">{item.productName}</div>{item.categoryTag && <div className="text-[10px] text-gray-400">{item.categoryTag}</div>}</td>
                        <td className="px-3 py-2.5 text-sm text-gray-500 font-mono">{item.sku || "—"}</td>
                        <td className="px-3 py-2.5"><span className={cn("text-sm font-semibold", Number(item.quantity) <= 0 ? "text-red-600" : Number(item.quantity) < 5 ? "text-amber-600" : "text-gray-700")}>{item.quantity} <span className="text-gray-400 font-normal text-xs">{item.unit}</span></span></td>
                        <td className="px-3 py-2.5 text-sm text-gray-600">{item.purchasePrice ? `${Number(item.purchasePrice).toLocaleString()} ₽` : "—"}</td>
                        <td className="px-3 py-2.5 text-sm text-gray-600">{item.salePrice ? `${Number(item.salePrice).toLocaleString()} ₽` : "—"}</td>
                        <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}><button onClick={() => { setEditingItem(item); setForm({ productName: item.productName, sku: item.sku || "", description: item.description || "", quantity: String(item.quantity), unit: item.unit, purchasePrice: String(item.purchasePrice || ""), salePrice: String(item.salePrice || ""), categoryTag: item.categoryTag || "", note: item.note || "" }); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded mr-0.5"><Edit3 className="w-3.5 h-3.5" /></button><button onClick={() => { if (confirm("Удалить?")) deleteItem.mutate(item.id); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TRANSFERS TAB */}
      {tab === "transfers" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-sm text-gray-700">Перемещения товаров</h3></div>
          {(!transfers || transfers.length === 0) ? <p className="text-sm text-gray-400 text-center py-8">Нет перемещений</p> : (
            <table className="w-full"><thead><tr className="bg-gray-50 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{["Товар","Откуда","Куда","Кол-во","Дата"].map((h, i) => <th key={i} className="px-3 py-2.5">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">{transfers.map((t: any) => <tr key={t.id} className="text-sm"><td className="px-3 py-2.5 font-medium">{t.productName}</td><td className="px-3 py-2.5 text-gray-500">{categories?.find((c: any) => c.id === t.fromCategoryId)?.name || "—"}</td><td className="px-3 py-2.5 text-gray-500">{categories?.find((c: any) => c.id === t.toCategoryId)?.name || "—"}</td><td className="px-3 py-2.5">{t.quantity}</td><td className="px-3 py-2.5 text-gray-400 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table>
          )}
        </div>
      )}

      {/* RECEIPTS TAB — placeholder */}
      {tab === "receipts" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center text-gray-400 py-12">
          <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">Поступления будут доступны после интеграции с 1С</p>
        </div>
      )}

      {/* === ITEM DETAIL MODAL (1C-style) === */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDetailItem(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Package className="w-4 h-4 text-primary-500" />{detailItem.productName}</h3>
              <button onClick={() => setDetailItem(null)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-3 space-y-2 text-sm">
              {detailItem.description && <p className="text-gray-600">{detailItem.description}</p>}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div className="flex items-center gap-1.5 text-gray-500"><Hash className="w-3.5 h-3.5 text-gray-400" /><span className="font-mono text-xs">{detailItem.sku || "—"}</span><span className="text-[10px] text-gray-400 ml-1">артикул</span></div>
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-sm font-bold", Number(detailItem.quantity) <= 0 ? "text-red-600" : Number(detailItem.quantity) < 5 ? "text-amber-600" : "text-gray-700")}>{detailItem.quantity}</span>
                  <span className="text-gray-500 text-xs">{detailItem.unit}</span>
                  {Number(detailItem.quantity) <= 0 && <span className="text-[10px] text-red-500 font-medium">Нет в наличии</span>}
                  {Number(detailItem.quantity) > 0 && Number(detailItem.quantity) < 5 && <span className="text-[10px] text-amber-500 font-medium">Мало</span>}
                </div>
                <div className="flex items-center gap-1.5 text-gray-500"><TrendingDown className="w-3.5 h-3.5 text-gray-400" /><span>{detailItem.purchasePrice ? `${Number(detailItem.purchasePrice).toLocaleString()} ₽` : "—"}</span><span className="text-[10px] text-gray-400 ml-1">закупка</span></div>
                <div className="flex items-center gap-1.5 text-gray-500"><TrendingUp className="w-3.5 h-3.5 text-gray-400" /><span>{detailItem.salePrice ? `${Number(detailItem.salePrice).toLocaleString()} ₽` : "—"}</span><span className="text-[10px] text-gray-400 ml-1">продажа</span></div>
              </div>
              <div className="flex items-center gap-1.5 text-gray-500"><Boxes className="w-3.5 h-3.5 text-gray-400" /><span className="text-xs">{selectedCat?.name || "—"}</span><span className="text-[10px] text-gray-400 ml-1">каталог</span></div>
              {detailItem.note && <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-500">{detailItem.note}</div>}
              {/* Price delta */}
              {detailItem.purchasePrice && detailItem.salePrice && (
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-green-50 rounded-lg px-3 py-2">
                  <DollarSign className="w-3.5 h-3.5 text-green-600" />
                  <span>Маржа: <span className="font-bold text-green-700">{Number(detailItem.salePrice) - Number(detailItem.purchasePrice)} ₽</span> ({Math.round((Number(detailItem.salePrice) - Number(detailItem.purchasePrice)) / Number(detailItem.purchasePrice) * 100)}%)</span>
                </div>
              )}
            </div>
            {/* Edit/Delete bar */}
            <div className="flex items-center gap-2 px-5 py-2.5 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => { const i = detailItem; setDetailItem(null); setEditingItem(i); setForm({ productName: i.productName, sku: i.sku || "", description: i.description || "", quantity: String(i.quantity), unit: i.unit, purchasePrice: String(i.purchasePrice || ""), salePrice: String(i.salePrice || ""), categoryTag: i.categoryTag || "", note: i.note || "" }); setShowForm(true); }} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"><Edit3 className="w-3.5 h-3.5" />Редактировать</button>
              <button onClick={() => { if (confirm("Удалить товар \"" + detailItem.productName + "\"?")) deleteItem.mutate(detailItem.id); }} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" />Удалить</button>
              <div className="flex-1" />
            </div>
            <div className="flex items-center justify-end px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setDetailItem(null)} className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors">Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* === CREATE/EDIT ITEM MODAL === */}
      {showForm && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingItem(null); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Package className="w-4 h-4 text-primary-500" />{editingItem ? "Редактировать товар" : "Новый товар"}</h3>
              <button onClick={() => { setShowForm(false); setEditingItem(null); }} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <input placeholder="Название товара *" value={form.productName} onChange={e => setForm({ ...form, productName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" autoFocus />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Артикул / SKU" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
                <input placeholder="Категория" value={form.categoryTag} onChange={e => setForm({ ...form, categoryTag: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
              </div>
              <input placeholder="Описание" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
              <div className="grid grid-cols-3 gap-3">
                <input type="number" placeholder="Кол-во" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
                <input placeholder="Ед. изм." value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
                <input placeholder="Примечание" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.01" placeholder="Цена закупки (₽)" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
                <input type="number" step="0.01" placeholder="Цена продажи (₽)" value={form.salePrice} onChange={e => setForm({ ...form, salePrice: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
              </div>
            </div>
            <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
              <div className="flex-1" />
              <button onClick={() => { setShowForm(false); setEditingItem(null); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button>
              <button onClick={() => { if (!form.productName) { toast.error("Введите название"); return; } editingItem ? updateItem.mutate({ id: editingItem.id, data: form }) : createItem.mutate({ categoryId: selectedCategory, data: form }); }} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm"><Save className="w-3.5 h-3.5" />{editingItem ? "Сохранить" : "Добавить"}</button>
            </div>
          </div>
        </div>
      )}

      {/* === CATEGORY FORM === */}
      {showCatForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCatForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">{editingCat ? <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Edit3 className="w-4 h-4 text-primary-500" />Редактировать каталог</h3> : <h3 className="font-semibold text-gray-900">Новый каталог</h3>}<button onClick={() => { setShowCatForm(false); setEditingCat(null); }} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button></div>
            <div className="px-5 py-4 space-y-3">
              <input placeholder="Название" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" autoFocus />
              <select value={categoryForm.parentId} onChange={e => setCategoryForm({ ...categoryForm, parentId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20">
                <option value="">Корневой каталог (без родителя)</option>
                {parentOptions.map((c: any) => (
                  <option key={c.id} value={c.id} style={{ paddingLeft: c.depth * 16 + 'px' }}>
                    {'└─ '.repeat(Math.min(c.depth, 1))}{c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50"><div className="flex-1" /><button onClick={() => { setShowCatForm(false); setEditingCat(null); setCategoryForm({ name: "", parentId: "" }); }} className="px-4 py-2 text-sm text-gray-600">Отмена</button><button onClick={() => { if (!categoryForm.name) { toast.error("Введите название"); return; } editingCat ? updateCat.mutate({ id: editingCat.id, data: categoryForm }) : createCat.mutate(categoryForm); }} className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">{editingCat ? "Сохранить" : "Создать"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function CatNode({ c, all, sel, onSel, onDel, onEdit, expandAll, depth = 0 }: any) {
  // When tree key changes (expand/collapse all), use expandAll to set initial state
  const [open, setOpen] = useState(expandAll !== false);
  const kids = all.filter((x: any) => x.parentId === c.id);
  const isSel = sel === c.id;
  const hasKids = kids.length > 0;
  const indent = 12 + depth * 20;
  return (
    <div>
      <div className={cn(
        "flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer mb-0.5 text-sm group transition-all border",
        isSel ? "bg-primary-50 text-primary-700 font-medium border-primary-200 shadow-sm" : "hover:bg-gray-50 text-gray-700 border-transparent hover:border-gray-100"
      )} onClick={() => onSel(c.id)} style={{ paddingLeft: indent }}>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {hasKids ? (
            <button onClick={e => { e.stopPropagation(); setOpen(!open); }} className="shrink-0 text-gray-400 hover:text-gray-600 p-0.5">
              {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <span className="w-[22px] shrink-0" />
          )}
          <span className="shrink-0">{hasKids && open ? "📂" : hasKids ? "📁" : "📄"}</span>
          <span className="truncate">{c.name}</span>
          {hasKids && <span className="text-[10px] text-gray-400 shrink-0">({kids.length})</span>}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={e => { e.stopPropagation(); onEdit(c); }} className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors" title="Редактировать"><Edit3 className="w-3.5 h-3.5" /></button>
          <button onClick={e => { e.stopPropagation(); onDel(c.id, c.name, kids.length); }} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Удалить"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      {open && hasKids && (
        <div className="relative">
          {/* Vertical connector line */}
          {depth < 10 && <div className="absolute left-[12px] top-0 bottom-3 w-px bg-gray-200" style={{ left: indent + 11 }} />}
          {kids.map((k: any) => <CatNode key={k.id} c={k} all={all} sel={sel} onSel={onSel} onDel={onDel} onEdit={onEdit} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}