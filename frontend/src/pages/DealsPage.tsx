import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dealsAPI, clientsAPI } from "../api";
import toast from "react-hot-toast";

const statusColors: Record<string, string> = {
  Lead_Created: "bg-blue-100 text-blue-700",
  Invoice_Generation: "bg-yellow-100 text-yellow-700",
  Legal_Review: "bg-purple-100 text-purple-700",
  Doc_Sending: "bg-indigo-100 text-indigo-700",
  Waiting_Payment: "bg-orange-100 text-orange-700",
  Paid_And_Reserved: "bg-teal-100 text-teal-700",
  Issuing_Goods: "bg-cyan-100 text-cyan-700",
  Deal_Closed: "bg-green-100 text-green-700",
};

const statusLabels: Record<string, string> = {
  Lead_Created: "Лид создан",
  Invoice_Generation: "Выставление счета",
  Legal_Review: "Юридическая проверка",
  Doc_Sending: "Отправка документов",
  Waiting_Payment: "Ожидание оплаты",
  Paid_And_Reserved: "Оплачено и зарезервировано",
  Issuing_Goods: "Отгрузка товара",
  Deal_Closed: "Сделка закрыта",
};

const statusFlow: string[] = [
  "Lead_Created",
  "Invoice_Generation",
  "Legal_Review",
  "Doc_Sending",
  "Waiting_Payment",
  "Paid_And_Reserved",
  "Issuing_Goods",
  "Deal_Closed",
];

const funnelStages = [
  { key: "New", label: "Новые", color: "bg-blue-500" },
  { key: "Invoice_Generation", label: "Счет", color: "bg-yellow-500" },
  { key: "Legal_Review", label: "Юристы", color: "bg-purple-500" },
  { key: "Waiting_Payment", label: "Оплата", color: "bg-orange-500" },
  { key: "Issuing_Goods", label: "Отгрузка", color: "bg-cyan-500" },
  { key: "Deal_Closed", label: "Закрыто", color: "bg-green-500" },
];

export default function DealsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    clientInn: "",
    dealType: "Sale",
    expectedAmount: 0,
    description: "",
  });
  const [statusDealId, setStatusDealId] = useState<string | null>(null);

  const { data: deals, isLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: () => dealsAPI.getAll().then((r) => r.data),
  });

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsAPI.getAll().then((r) => r.data),
  });

  const groupedByStatus: Record<string, any[]> = {};
  funnelStages.forEach((s) => {
    groupedByStatus[s.key] = [];
  });
  deals?.forEach((d: any) => {
    const stage = d.status === "Lead_Created" ? "New" : d.status;
    const key = funnelStages.find((s) => s.key === stage)?.key || "New";
    if (!groupedByStatus[key]) groupedByStatus[key] = [];
    groupedByStatus[key].push(d);
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => dealsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Сделка создана");
      setShowForm(false);
      setForm({
        clientId: "",
        clientInn: "",
        dealType: "Sale",
        expectedAmount: 0,
        description: "",
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      dealsAPI.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Статус обновлён");
      setStatusDealId(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) {
      toast.error("Выберите клиента");
      return;
    }
    if (!form.clientInn) {
      toast.error("Введите ИНН клиента");
      return;
    }
    createMutation.mutate(form);
  };

  const getNextStatuses = (current: string): string[] => {
    const idx = statusFlow.indexOf(current);
    if (idx === -1 || idx >= statusFlow.length - 1) return [];
    return statusFlow.slice(idx + 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Сделки</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Новая сделка
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <select
              value={form.clientId}
              onChange={(e) => {
                const client = clients?.find(
                  (c: any) => c.id === e.target.value,
                );
                setForm({
                  ...form,
                  clientId: e.target.value,
                  clientInn: client?.inn || "",
                });
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            >
              <option value="">Выберите клиента</option>
              {clients?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.inn || "-"})
                </option>
              ))}
            </select>
            <input
              placeholder="ИНН *"
              value={form.clientInn}
              onChange={(e) => setForm({ ...form, clientInn: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            <select
              value={form.dealType}
              onChange={(e) => setForm({ ...form, dealType: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="Sale">Продажа</option>
              <option value="ProjectSale">Проектная продажа</option>
              <option value="Rent">Аренда</option>
            </select>
            <input
              placeholder="Сумма"
              type="number"
              value={form.expectedAmount}
              onChange={(e) =>
                setForm({ ...form, expectedAmount: +e.target.value })
              }
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

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 mb-8">
        {funnelStages.map((stage) => {
          const count = groupedByStatus[stage.key]?.length || 0;
          return (
            <div
              key={stage.key}
              className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 text-center"
            >
              <div
                className={`w-2 h-2 rounded-full ${stage.color} mx-auto mb-1`}
              />
              <p className="text-xs text-gray-500">{stage.label}</p>
              <p className="text-lg font-bold text-gray-800">{count}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Номер
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Клиент
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Тип
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Статус
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Сумма
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Агент
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  Загрузка...
                </td>
              </tr>
            ) : deals?.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  Нет сделок
                </td>
              </tr>
            ) : (
              deals?.map((deal: any) => (
                <tr key={deal.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    {deal.dealNumber}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {deal.client?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {deal.dealType}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[deal.status] || "bg-gray-100 text-gray-500"}`}
                    >
                      {statusLabels[deal.status] || deal.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {deal.expectedAmount?.toLocaleString()} ₽
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {deal.responsibleAgent?.firstName}{" "}
                    {deal.responsibleAgent?.lastName}
                  </td>
                  <td className="px-4 py-3">
                    {deal.status !== "Deal_Closed" && (
                      <button
                        onClick={() => setStatusDealId(deal.id)}
                        className="text-blue-600 text-xs hover:underline"
                      >
                        Сменить статус
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {statusDealId && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={() => setStatusDealId(null)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">
              Сменить статус сделки
            </h3>
            <div className="space-y-2">
              {(() => {
                const deal = deals?.find((d: any) => d.id === statusDealId);
                if (!deal) return null;
                const nextStatuses = getNextStatuses(deal.status);
                if (nextStatuses.length === 0) {
                  return (
                    <p className="text-gray-500 text-sm">Сделка уже закрыта</p>
                  );
                }
                return nextStatuses.map((s) => (
                  <button
                    key={s}
                    onClick={() =>
                      statusMutation.mutate({ id: statusDealId, status: s })
                    }
                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
                  >
                    <span className="font-medium">{statusLabels[s]}</span>
                    <span className="text-gray-400 text-xs ml-2">→</span>
                  </button>
                ));
              })()}
            </div>
            <button
              onClick={() => setStatusDealId(null)}
              className="mt-4 px-4 py-2 text-gray-500 text-sm hover:text-gray-700"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
