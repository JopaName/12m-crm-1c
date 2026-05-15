import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { warehouseAPI, productsAPI } from "../api";
import toast from "react-hot-toast";

export default function WarehousePage() {
  const queryClient = useQueryClient();
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [moveForm, setMoveForm] = useState({
    type: "Transfer",
    productItemId: "",
    fromCellId: "",
    toCellId: "",
    quantity: 1,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["warehouse"],
    queryFn: () => warehouseAPI.getAll().then((r) => r.data),
  });
  const { data: items } = useQuery({
    queryKey: ["product-items"],
    queryFn: () => productsAPI.getItems().then((r) => r.data),
  });

  const cells = data?.cells || [];
  const movements = data?.movements || [];

  const createMovement = useMutation({
    mutationFn: (d: any) => warehouseAPI.createMovement(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse"] });
      toast.success("Перемещение выполнено");
      setShowMovementForm(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Склад</h1>
        <button
          onClick={() => setShowMovementForm(!showMovementForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Перемещение
        </button>
      </div>

      {showMovementForm && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={() => setShowMovementForm(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Перемещение товара</h3>
            <div className="space-y-3">
              <select
                value={moveForm.type}
                onChange={(e) =>
                  setMoveForm({ ...moveForm, type: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="Receipt">Поступление</option>
                <option value="WriteOff">Списание</option>
                <option value="Transfer">Перемещение</option>
              </select>
              <select
                value={moveForm.productItemId}
                onChange={(e) =>
                  setMoveForm({ ...moveForm, productItemId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Выберите единицу</option>
                {items?.map((i: any) => (
                  <option key={i.id} value={i.id}>
                    {i.serialNumber || i.id.slice(0, 8)}
                  </option>
                ))}
              </select>
              {moveForm.type !== "Receipt" && (
                <select
                  value={moveForm.fromCellId}
                  onChange={(e) =>
                    setMoveForm({ ...moveForm, fromCellId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Откуда</option>
                  {(Array.isArray(cells) ? cells : []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              {moveForm.type !== "WriteOff" && (
                <select
                  value={moveForm.toCellId}
                  onChange={(e) =>
                    setMoveForm({ ...moveForm, toCellId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Куда</option>
                  {(Array.isArray(cells) ? cells : []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => createMovement.mutate(moveForm)}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Выполнить
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 font-semibold">
            Ячейки хранения
          </div>
          <div className="p-4">
            {(Array.isArray(cells) ? cells : []).map((cell: any) => (
              <div
                key={cell.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2"
              >
                <span className="font-medium text-sm">{cell.name}</span>
                <span className="text-xs text-gray-500">{cell.zone}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 font-semibold">
            Последние движения
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Тип
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Товар
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Дата
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements?.map((m: any) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-sm">{m.type}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600">
                    {m.productItem?.product?.name || "-"}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-400">
                    {new Date(m.createdAt).toLocaleDateString()}
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
