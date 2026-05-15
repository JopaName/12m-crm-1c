import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsAPI, warehouseAPI } from "../api";
import toast from "react-hot-toast";

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "",
    unit: "pcs",
    purchasePrice: 0,
    salePrice: 0,
    rentPrice: 0,
    description: "",
  });
  const [itemForm, setItemForm] = useState({
    productId: "",
    serialNumber: "",
    warehouseCellId: "",
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => productsAPI.getAll().then((r) => r.data),
  });
  const { data: items } = useQuery({
    queryKey: ["product-items"],
    queryFn: () => productsAPI.getItems().then((r) => r.data),
  });
  const { data: warehouse } = useQuery({
    queryKey: ["warehouse"],
    queryFn: () => warehouseAPI.getAll().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => productsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Товар создан");
      setShowForm(false);
      setForm({
        name: "",
        sku: "",
        category: "",
        unit: "pcs",
        purchasePrice: 0,
        salePrice: 0,
        rentPrice: 0,
        description: "",
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const createItemMutation = useMutation({
    mutationFn: (data: any) => productsAPI.createItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-items"] });
      toast.success("Единица оборудования создана");
      setShowItemForm(false);
      setItemForm({ productId: "", serialNumber: "", warehouseCellId: "" });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const cells = warehouse?.cells || warehouse || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Номенклатура</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowItemForm(!showItemForm)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            + Единица оборудования
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            + Новый товар
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(form);
          }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <input
              placeholder="Название *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            <input
              placeholder="Артикул *"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            <input
              placeholder="Категория"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="pcs">шт</option>
              <option value="kg">кг</option>
              <option value="m">м</option>
            </select>
            <input
              placeholder="Цена закупки"
              type="number"
              value={form.purchasePrice}
              onChange={(e) =>
                setForm({ ...form, purchasePrice: +e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              placeholder="Цена продажи"
              type="number"
              value={form.salePrice}
              onChange={(e) => setForm({ ...form, salePrice: +e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              placeholder="Цена аренды"
              type="number"
              value={form.rentPrice}
              onChange={(e) => setForm({ ...form, rentPrice: +e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <textarea
              placeholder="Описание"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm col-span-2"
              rows={2}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Сохранить
          </button>
        </form>
      )}

      {showItemForm && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={() => setShowItemForm(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">
              Новая единица оборудования
            </h3>
            <div className="space-y-3">
              <select
                value={itemForm.productId}
                onChange={(e) =>
                  setItemForm({ ...itemForm, productId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Выберите товар</option>
                {products?.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                placeholder="Серийный номер"
                value={itemForm.serialNumber}
                onChange={(e) =>
                  setItemForm({ ...itemForm, serialNumber: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <select
                value={itemForm.warehouseCellId}
                onChange={(e) =>
                  setItemForm({ ...itemForm, warehouseCellId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Выберите ячейку</option>
                {(Array.isArray(cells) ? cells : []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.zone || "-"})
                  </option>
                ))}
              </select>
              <button
                onClick={() => createItemMutation.mutate(itemForm)}
                className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 font-semibold">
            Товары
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Название
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Артикул
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Цена
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products?.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-sm text-gray-800">
                    {p.name}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500">{p.sku}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-800">
                    {p.salePrice?.toLocaleString()} ₽
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 font-semibold">
            Единицы оборудования
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Серийный номер
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Статус
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Ячейка
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items?.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-sm text-gray-800">
                    {item.serialNumber || "-"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.status === "Stock"
                          ? "bg-green-100 text-green-700"
                          : item.status === "Sold"
                            ? "bg-gray-100 text-gray-500"
                            : item.status === "InRent"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500">
                    {item.warehouseCell?.name || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
