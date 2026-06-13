import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { warehouseAPI } from "../api";
import toast from "react-hot-toast";

export default function WarehousePage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", parentId: "" });
  const [itemForm, setItemForm] = useState({ productName: "", sku: "", description: "", quantity: "0", unit: "шт", purchasePrice: "", salePrice: "", categoryTag: "", note: "" });
  const [transferForm, setTransferForm] = useState({ productItemId: "", quantity: "1", toCategoryId: "", note: "" });

  const { data: categories } = useQuery({
    queryKey: ["warehouse-categories"],
    queryFn: () => warehouseAPI.getCategories().then((r: any) => r.data),
  });

  const { data: items } = useQuery({
    queryKey: ["warehouse-items", selectedCategory],
    queryFn: () => selectedCategory ? warehouseAPI.getCategoryItems(selectedCategory).then((r: any) => r.data) : Promise.resolve([]),
    enabled: !!selectedCategory,
  });

  const { data: transfers } = useQuery({
    queryKey: ["warehouse-transfers"],
    queryFn: () => warehouseAPI.getTransfers().then((r: any) => r.data),
  });

  const createCategory = useMutation({
    mutationFn: (d: any) => warehouseAPI.createCategory(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-categories"] });
      toast.success("Каталог создан");
      setShowCategoryForm(false);
      setCategoryForm({ name: "", parentId: "" });
    },
    onError: () => toast.error("Ошибка создания"),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => warehouseAPI.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-categories"] });
      setSelectedCategory(null);
      toast.success("Каталог удалён");
    },
    onError: () => toast.error("Ошибка удаления"),
  });

  const createItem = useMutation({
    mutationFn: ({ categoryId, data }: { categoryId: string; data: any }) =>
      warehouseAPI.createItem(categoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-items", selectedCategory] });
      toast.success("Товар добавлен");
      setShowItemForm(false);
      resetItemForm();
    },
    onError: () => toast.error("Ошибка добавления"),
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      warehouseAPI.updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-items", selectedCategory] });
      toast.success("Товар обновлён");
      setEditingItem(null);
      setShowItemForm(false);
    },
    onError: () => toast.error("Ошибка обновления"),
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => warehouseAPI.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-items", selectedCategory] });
      toast.success("Товар удалён");
    },
    onError: () => toast.error("Ошибка удаления"),
  });

  const transfer = useMutation({
    mutationFn: (d: any) => warehouseAPI.transfer(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-items", selectedCategory] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-transfers"] });
      toast.success("Перемещение выполнено");
      setShowTransferForm(false);
      setTransferForm({ productItemId: "", quantity: "1", toCategoryId: "", note: "" });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка перемещения"),
  });

  const resetItemForm = () => setItemForm({ productName: "", sku: "", description: "", quantity: "0", unit: "шт", purchasePrice: "", salePrice: "", categoryTag: "", note: "" });

  const handleTransfer = () => {
    if (!transferForm.productItemId) { toast.error("Выберите товар"); return; }
    if (!transferForm.toCategoryId) { toast.error("Выберите склад назначения"); return; }
    if (!transferForm.quantity || Number(transferForm.quantity) <= 0) { toast.error("Укажите количество"); return; }
    transfer.mutate({ ...transferForm, fromCategoryId: selectedCategory });
  };

  const rootCategories = (categories || []).filter((c: any) => !c.parentId);
  const selectedCat = categories?.find((c: any) => c.id === selectedCategory);
  const otherCategories = (categories || []).filter((c: any) => c.id !== selectedCategory);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Склад</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTransferForm(!showTransferForm)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
          >
            ⟷ Переместить
          </button>
          <button
            onClick={() => setShowCategoryForm(!showCategoryForm)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
          >
            + Каталог
          </button>
        </div>
      </div>

      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowCategoryForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Новый каталог</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Название каталога" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400" />
              <select value={categoryForm.parentId} onChange={(e) => setCategoryForm({ ...categoryForm, parentId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500">
                <option value="">Без родителя (корневой каталог)</option>
                {rootCategories.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
              <button onClick={() => { if (!categoryForm.name) { toast.error("Введите название"); return; } createCategory.mutate(categoryForm); }} className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">Создать</button>
            </div>
          </div>
        </div>
      )}

      {showItemForm && selectedCategory && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => { setShowItemForm(false); setEditingItem(null); }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{editingItem ? "Редактировать товар" : "Новый товар"}</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Название товара (обязательно)" value={itemForm.productName} onChange={(e) => setItemForm({ ...itemForm, productName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Артикул / SKU" value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400" />
                <input type="text" placeholder="Категория товара" value={itemForm.categoryTag} onChange={(e) => setItemForm({ ...itemForm, categoryTag: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400" />
              </div>
              <input type="text" placeholder="Описание товара" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400" />
              <div className="grid grid-cols-3 gap-2">
                <input type="number" placeholder="Количество" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400" />
                <input type="text" placeholder="Ед. измерения (шт, кг)" value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400" />
                <input type="text" placeholder="Примечание" value={itemForm.note} onChange={(e) => setItemForm({ ...itemForm, note: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" step="0.01" placeholder="Цена закупки (₽)" value={itemForm.purchasePrice} onChange={(e) => setItemForm({ ...itemForm, purchasePrice: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400" />
                <input type="number" step="0.01" placeholder="Цена продажи (₽)" value={itemForm.salePrice} onChange={(e) => setItemForm({ ...itemForm, salePrice: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400" />
              </div>
              <button onClick={() => {
                if (!itemForm.productName) { toast.error("Введите название товара"); return; }
                if (editingItem) { updateItem.mutate({ id: editingItem.id, data: itemForm }); }
                else { createItem.mutate({ categoryId: selectedCategory, data: itemForm }); }
              }} className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">{editingItem ? "Сохранить" : "Добавить"}</button>
            </div>
          </div>
        </div>
      )}

      {showTransferForm && selectedCategory && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowTransferForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Перемещение товара</h3>
            <div className="space-y-3">
              <select value={transferForm.productItemId} onChange={(e) => setTransferForm({ ...transferForm, productItemId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500">
                <option value="">Выберите товар для перемещения</option>
                {items?.map((i: any) => (<option key={i.id} value={i.id}>{i.productName} (доступно: {i.quantity} {i.unit})</option>))}
              </select>
              <input type="number" placeholder="Количество для перемещения" value={transferForm.quantity} onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400" />
              <select value={transferForm.toCategoryId} onChange={(e) => setTransferForm({ ...transferForm, toCategoryId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500">
                <option value="">Куда переместить (обязательно)</option>
                {otherCategories.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
              <input type="text" placeholder="Примечание к перемещению" value={transferForm.note} onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400" />
              <button onClick={handleTransfer} className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">Переместить</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories sidebar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 font-semibold">Каталоги</div>
          <div className="p-2">
            {rootCategories.map((cat: any) => (
              <CategoryNode key={cat.id} category={cat} allCategories={categories || []} selectedId={selectedCategory} onSelect={setSelectedCategory} onDelete={(id) => { if (confirm("Удалить каталог и все товары?")) deleteCategory.mutate(id); }} />
            ))}
            {(!categories || categories.length === 0) && (<p className="text-sm text-gray-400 text-center py-4">Нет каталогов</p>)}
          </div>
        </div>

        {/* Items list */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <span className="font-semibold">{selectedCat?.name || "Выберите каталог"}</span>
              {selectedCat && (<span className="text-sm text-gray-400 ml-2">({items?.length || 0} товаров)</span>)}
            </div>
            {selectedCategory && (
              <button onClick={() => { setEditingItem(null); resetItemForm(); setShowItemForm(true); }} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs">+ Товар</button>
            )}
          </div>
          <div className="p-4">
            {!selectedCategory ? (
              <p className="text-sm text-gray-400 text-center py-8">Выберите каталог слева</p>
            ) : !items || items.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Нет товаров</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Товар</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Артикул</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Кол-во</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Закупка</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Продажа</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5">
                        <div className="text-sm font-medium">{item.productName}</div>
                        {item.categoryTag && <div className="text-xs text-gray-400">{item.categoryTag}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-500">{item.sku || "-"}</td>
                      <td className="px-3 py-2.5 text-sm">{item.quantity} {item.unit}</td>
                      <td className="px-3 py-2.5 text-sm">{item.purchasePrice ? `${item.purchasePrice} ₽` : "-"}</td>
                      <td className="px-3 py-2.5 text-sm">{item.salePrice ? `${item.salePrice} ₽` : "-"}</td>
                      <td className="px-3 py-2.5 text-right">
                        <button onClick={() => { setEditingItem(item); setItemForm({ productName: item.productName, sku: item.sku || "", description: item.description || "", quantity: String(item.quantity), unit: item.unit, purchasePrice: item.purchasePrice ? String(item.purchasePrice) : "", salePrice: item.salePrice ? String(item.salePrice) : "", categoryTag: item.categoryTag || "", note: item.note || "" }); setShowItemForm(true); }} className="p-1 hover:bg-primary-100 rounded text-primary-500 mr-1">✏️</button>
                        <button onClick={() => { if (confirm("Удалить товар?")) deleteItem.mutate(item.id); }} className="p-1 hover:bg-red-100 rounded text-red-500">🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Transfer history */}
          {transfers && transfers.length > 0 && (
            <div className="border-t border-gray-100">
              <div className="p-4 border-b border-gray-100 font-semibold text-sm">История перемещений</div>
              <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
                {transfers.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{t.productName}</span>
                      <span className="text-gray-400 mx-2">→</span>
                      <span className="text-gray-600">{t.quantity} {t.note || ""}</span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryNode({ category, allCategories, selectedId, onSelect, onDelete }: { category: any; allCategories: any[]; selectedId: string | null; onSelect: (id: string) => void; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(true);
  const children = allCategories.filter((c) => c.parentId === category.id);
  const isSelected = selectedId === category.id;

  return (
    <div>
      <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer mb-1 ${isSelected ? "bg-primary-100 text-primary-700" : "hover:bg-gray-50"}`} onClick={() => onSelect(category.id)}>
        <div className="flex items-center gap-2">
          {children.length > 0 && (<button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="text-xs text-gray-400">{expanded ? "▼" : "▶"}</button>)}
          <span className="text-sm font-medium">{category.name}</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(category.id); }} className="p-1 hover:bg-red-100 rounded text-red-400 opacity-0 hover:opacity-100 text-xs">✕</button>
      </div>
      {expanded && children.length > 0 && (<div className="ml-4">{children.map((child) => (<CategoryNode key={child.id} category={child} allCategories={allCategories} selectedId={selectedId} onSelect={onSelect} onDelete={onDelete} />))}</div>)}
    </div>
  );
}
