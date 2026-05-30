import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsAPI } from "../api";
import { useNavigate } from "react-router-dom";
import { useSort } from "../hooks/useSort";
import toast from "react-hot-toast";

export default function ClientsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    inn: "",
    source: "Direct",
    status: "New",
    notes: "",
  });

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsAPI.getAll().then((r) => r.data),
  });

  const { sorted: sortedClients, handleSort, sortKey, sortDir } = useSort(clients, "name");

  const createMutation = useMutation({
    mutationFn: (data: any) => clientsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Клиент создан");
      setShowForm(false);
      setForm({
        name: "",
        phone: "",
        email: "",
        inn: "",
        source: "Direct",
        status: "New",
        notes: "",
      });
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
        <h1 className="text-2xl font-bold text-gray-800">Клиенты</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Новый клиент
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              placeholder="Название *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              placeholder="Телефон"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              placeholder="ИНН"
              value={form.inn}
              onChange={(e) => setForm({ ...form, inn: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Direct">Прямое обращение</option>
              <option value="Agent">Личный поиск</option>
              <option value="Web-form">Сайт</option>
              <option value="Channel">Канал обращения</option>
              <option value="Import">Импорт</option>
            </select>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="New">Новый</option>
              <option value="Active">Активный</option>
              <option value="Inactive">Неактивный</option>
            </select>
            <input
              placeholder="Примечание"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
                onClick={() => handleSort("name")}
              >
                Название{sortKey === "name" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th
                className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
                onClick={() => handleSort("phone")}
              >
                Телефон{sortKey === "phone" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th
                className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
                onClick={() => handleSort("email")}
              >
                Email{sortKey === "email" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th
                className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
                onClick={() => handleSort("inn")}
              >
                ИНН{sortKey === "inn" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th
                className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
                onClick={() => handleSort("createdAt")}
              >
                Дата создания{sortKey === "createdAt" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th
                className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
                onClick={() => handleSort("source")}
              >
                Источник{sortKey === "source" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th
                className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
                onClick={() => handleSort("status")}
              >
                Статус{sortKey === "status" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th
                className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
                onClick={() => handleSort("createdBy.firstName")}
              >
                Ответственный{sortKey === "createdBy.firstName" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">
                  Загрузка...
                </td>
              </tr>
            ) : clients?.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">
                  Нет клиентов
                </td>
              </tr>
            ) : (
              sortedClients?.map((client: any) => (
                <tr
                  key={client.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    {client.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {client.phone || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {client.email || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {client.inn || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {client.source || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      client.status === "Active" ? "bg-green-100 text-green-700" :
                      client.status === "New" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {client.status || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {client.createdBy
                      ? `${client.createdBy.firstName} ${client.createdBy.lastName}`
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
