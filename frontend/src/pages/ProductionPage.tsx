import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productionAPI, dealsAPI } from "../api";
import toast from "react-hot-toast";

const statusLabels: Record<string, string> = {
  New: "Новый",
  MaterialsWrittenOff: "Материалы списаны",
  InProgress: "В производстве",
  QualityCheck: "Контроль качества",
  Completed: "Завершён",
};

export default function ProductionPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ dealId: "", productionRouteId: "" });

  const { data: orders } = useQuery({
    queryKey: ["production"],
    queryFn: () => productionAPI.getAll().then((r) => r.data),
  });
  const { data: routes } = useQuery({
    queryKey: ["production-routes"],
    queryFn: () => productionAPI.getRoutes().then((r) => r.data),
  });
  const { data: deals } = useQuery({
    queryKey: ["deals"],
    queryFn: () => dealsAPI.getAll().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => productionAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production"] });
      toast.success("Производственный заказ создан");
      setShowForm(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      productionAPI.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production"] });
      toast.success("Статус обновлён");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dealId) {
      toast.error("Выберите сделку");
      return;
    }
    createMutation.mutate(form);
  };

  const statusFlow: Record<string, string> = {
    New: "InProgress",
    InProgress: "QualityCheck",
    QualityCheck: "Completed",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Производство</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Новый заказ
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <select
              value={form.dealId}
              onChange={(e) => setForm({ ...form, dealId: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            >
              <option value="">Выберите сделку</option>
              {deals?.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.dealNumber} - {d.client?.name}
                </option>
              ))}
            </select>
            <select
              value={form.productionRouteId}
              onChange={(e) =>
                setForm({ ...form, productionRouteId: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Маршрут производства</option>
              {routes?.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Создать
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Сделка
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Статус
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Дата
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders?.map((order: any) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-600">
                  {order.id.slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-800">
                  {order.deal?.dealNumber || "-"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === "Completed"
                        ? "bg-green-100 text-green-700"
                        : order.status === "InProgress" ||
                            order.status === "QualityCheck"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {statusLabels[order.status] || order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {statusFlow[order.status] && (
                    <button
                      onClick={() =>
                        statusMutation.mutate({
                          id: order.id,
                          status: statusFlow[order.status],
                        })
                      }
                      className="text-blue-600 text-xs hover:underline"
                    >
                      {order.status === "New"
                        ? "Запустить"
                        : order.status === "InProgress"
                          ? "На КК"
                          : "Завершить"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
