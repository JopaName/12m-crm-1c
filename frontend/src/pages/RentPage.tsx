import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rentAPI, clientsAPI, dealsAPI } from "../api";
import toast from "react-hot-toast";

export default function RentPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    contractNumber: "",
    clientId: "",
    dealId: "",
    monthlyPayment: 0,
    startDate: "",
  });

  const { data: contracts } = useQuery({
    queryKey: ["rent"],
    queryFn: () => rentAPI.getAll().then((r) => r.data),
  });
  const { data: billing } = useQuery({
    queryKey: ["rent-billing"],
    queryFn: () => rentAPI.getBilling().then((r) => r.data),
  });
  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsAPI.getAll().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => rentAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rent"] });
      toast.success("Договор аренды создан");
      setShowForm(false);
      setForm({
        contractNumber: "",
        clientId: "",
        dealId: "",
        monthlyPayment: 0,
        startDate: "",
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contractNumber || !form.clientId) {
      toast.error("Заполните обязательные поля");
      return;
    }
    createMutation.mutate({
      ...form,
      monthlyPayment: form.monthlyPayment || 0,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Аренда оборудования
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Новый договор
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              placeholder="Номер договора *"
              value={form.contractNumber}
              onChange={(e) =>
                setForm({ ...form, contractNumber: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
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
            <input
              placeholder="Ежемесячный платёж"
              type="number"
              value={form.monthlyPayment}
              onChange={(e) =>
                setForm({ ...form, monthlyPayment: +e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
            Договоры аренды
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Номер
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Клиент
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Статус
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contracts?.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-sm text-gray-800">
                    {c.contractNumber}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-600">
                    {c.client?.name}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 font-semibold">
            История биллинга
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Период
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Сумма
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Статус
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {billing?.map((b: any) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-sm text-gray-800">
                    {b.period}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-600">
                    {b.amount?.toLocaleString()} ₽
                  </td>
                  <td className="px-4 py-2.5 text-sm">{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
