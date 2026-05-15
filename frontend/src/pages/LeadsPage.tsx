import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leadsAPI, clientsAPI } from "../api";
import toast from "react-hot-toast";

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    source: "Agent",
    notes: "",
  });
  const [convertForm, setConvertForm] = useState({
    dealType: "Sale",
    expectedAmount: 0,
    clientInn: "",
  });
  const [convertId, setConvertId] = useState<string | null>(null);

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => leadsAPI.getAll().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => leadsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Лид создан");
      setShowForm(false);
      setForm({
        clientName: "",
        clientPhone: "",
        clientEmail: "",
        source: "Agent",
        notes: "",
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      leadsAPI.convert(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Лид конвертирован в сделку");
      setConvertId(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Лиды</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
        >
          + Новый лид
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              placeholder="Имя клиента *"
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            <input
              placeholder="Телефон *"
              value={form.clientPhone}
              onChange={(e) =>
                setForm({ ...form, clientPhone: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            <input
              placeholder="Email"
              value={form.clientEmail}
              onChange={(e) =>
                setForm({ ...form, clientEmail: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <select
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="Agent">Личный поиск</option>
              <option value="Web-form">Сайт</option>
              <option value="Channel">Канал обращения</option>
              <option value="Import">Импорт</option>
            </select>
            <input
              placeholder="Примечание"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            Сохранить
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Клиент
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Телефон
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Источник
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Статус
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Загрузка...
                </td>
              </tr>
            ) : leads?.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Нет лидов
                </td>
              </tr>
            ) : (
              leads?.map((lead: any) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    {lead.clientName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {lead.clientPhone}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {lead.source}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        lead.status === "New"
                          ? "bg-blue-100 text-blue-700"
                          : lead.status === "Contacted"
                            ? "bg-yellow-100 text-yellow-700"
                            : lead.status === "Converted"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {lead.status !== "Converted" && (
                      <button
                        onClick={() => setConvertId(lead.id)}
                        className="text-blue-600 text-sm hover:underline"
                      >
                        Конвертировать
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {convertId && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={() => setConvertId(null)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">
              Конвертация лида в сделку
            </h3>
            <div className="space-y-3">
              <select
                value={convertForm.dealType}
                onChange={(e) =>
                  setConvertForm({ ...convertForm, dealType: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="Sale">Продажа</option>
                <option value="ProjectSale">Проектная продажа</option>
                <option value="Rent">Аренда</option>
              </select>
              <input
                placeholder="Сумма"
                type="number"
                value={convertForm.expectedAmount}
                onChange={(e) =>
                  setConvertForm({
                    ...convertForm,
                    expectedAmount: +e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                placeholder="ИНН клиента *"
                value={convertForm.clientInn}
                onChange={(e) =>
                  setConvertForm({ ...convertForm, clientInn: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
              <button
                onClick={() =>
                  convertMutation.mutate({ id: convertId, data: convertForm })
                }
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Конвертировать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
