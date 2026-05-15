import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { installationAPI, dealsAPI, authAPI } from "../api";
import toast from "react-hot-toast";

export default function InstallationPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    dealId: "",
    installerId: "",
    installDate: "",
    notes: "",
  });

  const { data: tasks } = useQuery({
    queryKey: ["installation"],
    queryFn: () => installationAPI.getAll().then((r) => r.data),
  });
  const { data: calendar } = useQuery({
    queryKey: ["installation-calendar"],
    queryFn: () => installationAPI.getCalendar().then((r) => r.data),
  });
  const { data: deals } = useQuery({
    queryKey: ["deals"],
    queryFn: () => dealsAPI.getAll().then((r) => r.data),
  });
  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => authAPI.getUsers().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => installationAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installation"] });
      toast.success("Монтаж добавлен");
      setShowForm(false);
      setForm({ dealId: "", installerId: "", installDate: "", notes: "" });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      installationAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installation"] });
      toast.success("Статус обновлён");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dealId || !form.installerId || !form.installDate) {
      toast.error("Заполните обязательные поля");
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Монтажи и календарь
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Новый монтаж
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
              value={form.installerId}
              onChange={(e) =>
                setForm({ ...form, installerId: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            >
              <option value="">Назначить монтажника</option>
              {users?.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={form.installDate}
              onChange={(e) =>
                setForm({ ...form, installDate: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            <textarea
              placeholder="Примечание"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm col-span-3"
              rows={2}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Создать
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 font-semibold">
            Задачи на монтаж
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Сделка
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Монтажник
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Дата
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Статус
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks?.map((t: any) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-sm text-gray-800">
                    {t.deal?.dealNumber || "-"}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-600">
                    {t.installer?.firstName} {t.installer?.lastName}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500">
                    {new Date(t.installDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.status === "Completed"
                          ? "bg-green-100 text-green-700"
                          : t.status === "InProgress"
                            ? "bg-blue-100 text-blue-700"
                            : t.status === "Scheduled"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {t.status === "Scheduled" && (
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            id: t.id,
                            data: { status: "InProgress" },
                          })
                        }
                        className="text-blue-600 text-xs hover:underline"
                      >
                        Начать
                      </button>
                    )}
                    {t.status === "InProgress" && (
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            id: t.id,
                            data: { status: "Completed" },
                          })
                        }
                        className="text-green-600 text-xs hover:underline"
                      >
                        Завершить
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 font-semibold">
            Календарь монтажей
          </div>
          <div className="p-4 space-y-2">
            {calendar?.map((e: any) => (
              <div
                key={e.id}
                className="p-3 bg-gray-50 rounded-lg text-sm flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-gray-500 text-xs">
                    {new Date(e.startDate).toLocaleDateString()} -{" "}
                    {new Date(e.endDate).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    e.status === "Completed"
                      ? "bg-green-100 text-green-700"
                      : e.status === "Missed"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
