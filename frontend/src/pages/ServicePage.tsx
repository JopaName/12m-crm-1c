import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serviceAPI, clientsAPI, dealsAPI } from "../api";
import toast from "react-hot-toast";

export default function ServicePage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    dealId: "",
    type: "Warranty",
    description: "",
  });

  const { data: cases } = useQuery({
    queryKey: ["service"],
    queryFn: () => serviceAPI.getAll().then((r) => r.data),
  });
  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsAPI.getAll().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => serviceAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service"] });
      toast.success("Обращение создано");
      setShowForm(false);
      setForm({ clientId: "", dealId: "", type: "Warranty", description: "" });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) {
      toast.error("Выберите клиента");
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Сервис и гарантия</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Новое обращение
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
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            >
              <option value="">Выберите клиента</option>
              {clients?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="Warranty">Гарантия</option>
              <option value="Service">Сервис</option>
              <option value="Complaint">Претензия</option>
            </select>
            <textarea
              placeholder="Описание"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Тип
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Клиент
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Статус
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Дата
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cases?.map((c: any) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-800">{c.type}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {c.client?.name || "-"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      c.status === "Resolved" || c.status === "Closed"
                        ? "bg-green-100 text-green-700"
                        : c.status === "InProgress"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
