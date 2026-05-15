import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { legalAPI, dealsAPI, clientsAPI } from "../api";
import toast from "react-hot-toast";

export default function LegalPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    documentType: "Contract",
    dealId: "",
    clientId: "",
    documentNumber: "",
  });

  const { data: documents } = useQuery({
    queryKey: ["legal"],
    queryFn: () => legalAPI.getAll().then((r) => r.data),
  });
  const { data: deals } = useQuery({
    queryKey: ["deals"],
    queryFn: () => dealsAPI.getAll().then((r) => r.data),
  });
  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsAPI.getAll().then((r) => r.data),
  });

  const docTypes = [
    "Contract",
    "InvoiceUFPS",
    "Act",
    "Deed",
    "Addendum",
    "Claim",
  ];

  const createMutation = useMutation({
    mutationFn: (data: any) => legalAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal"] });
      toast.success("Документ создан");
      setShowForm(false);
      setForm({
        documentType: "Contract",
        dealId: "",
        clientId: "",
        documentNumber: "",
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      legalAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal"] });
      toast.success("Статус обновлён");
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
        <h1 className="text-2xl font-bold text-gray-800">
          Договоры и юридические документы
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Новый документ
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <select
              value={form.documentType}
              onChange={(e) =>
                setForm({ ...form, documentType: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {docTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
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
              value={form.dealId}
              onChange={(e) => setForm({ ...form, dealId: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Связать со сделкой</option>
              {deals?.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.dealNumber}
                </option>
              ))}
            </select>
            <input
              placeholder="Номер документа"
              value={form.documentNumber}
              onChange={(e) =>
                setForm({ ...form, documentNumber: e.target.value })
              }
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Тип
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Номер
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Сделка
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Статус
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Версия
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {documents?.map((doc: any) => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-800">
                  {doc.documentType}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {doc.documentNumber || "-"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {doc.deal?.dealNumber || "-"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      doc.status === "Signed"
                        ? "bg-green-100 text-green-700"
                        : doc.status === "Sent"
                          ? "bg-blue-100 text-blue-700"
                          : doc.status === "Approved"
                            ? "bg-purple-100 text-purple-700"
                            : doc.status === "Draft"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {doc.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">
                  v{doc.versionNumber}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {doc.status === "Draft" && (
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            id: doc.id,
                            data: { status: "Approved" },
                          })
                        }
                        className="text-purple-600 text-xs hover:underline"
                      >
                        Утвердить
                      </button>
                    )}
                    {doc.status === "Approved" && (
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            id: doc.id,
                            data: { status: "Sent" },
                          })
                        }
                        className="text-blue-600 text-xs hover:underline"
                      >
                        Отправить
                      </button>
                    )}
                    {doc.status === "Sent" && (
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            id: doc.id,
                            data: { status: "Signed" },
                          })
                        }
                        className="text-green-600 text-xs hover:underline"
                      >
                        Подписать
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
