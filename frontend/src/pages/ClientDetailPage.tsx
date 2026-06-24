import React, { useNavigate, useParams, useState } from "react";;
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { clientsAPI } from "../api";
import ClientActions from "../components/ClientActions";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", inn: "", address: "", source: "", status: "", notes: "" });

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: () => clientsAPI.getById(id!).then((r) => r.data),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => clientsAPI.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client", id] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Клиент обновлён");
      setEditing(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const canEdit = client && currentUser && (
    client.createdById === currentUser.id ||
    currentUser.role?.name === "Director" ||
    currentUser.role?.name === "Owner"
  );

  const handleEdit = () => {
    setForm({
      name: client.name || "",
      phone: client.phone || "",
      email: client.email || "",
      inn: client.inn || "",
      address: client.address || "",
      source: client.source || "",
      status: client.status || "",
      notes: client.notes || "",
    });
    setEditing(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  if (isLoading)
    return <div className="text-center py-8 text-gray-400">Загрузка...</div>;
  if (!client)
    return (
      <div className="text-center py-8 text-gray-400">Клиент не найден</div>
    );

  if (editing) {
    return (
      <div>
        <button
          onClick={() => setEditing(false)}
          className="text-primary-600 text-sm mb-4 hover:underline"
        >
          ← Назад
        </button>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Редактирование клиента</h1>
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 max-w-xl"
        >
          <div className="space-y-4">
            <input
              placeholder="Название *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
            <input
              placeholder="Телефон"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
            />
            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
            />
            <input
              placeholder="ИНН"
              value={form.inn}
              onChange={(e) => setForm({ ...form, inn: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
            />
            <input
              placeholder="Адрес"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
            />
            <select
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">—</option>
              <option value="Direct">Прямое обращение</option>
              <option value="Agent">Личный поиск</option>
              <option value="Web-form">Сайт</option>
              <option value="Channel">Канал обращения</option>
              <option value="Import">Импорт</option>
            </select>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">—</option>
              <option value="New">Новый</option>
              <option value="Active">Активный</option>
              <option value="Inactive">Неактивный</option>
            </select>
            <textarea
              placeholder="Примечание"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate("/clients")}
        className="text-primary-600 text-sm mb-4 hover:underline"
      >
        ← Назад к клиентам
      </button>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{client.name}</h1>
        {canEdit && (
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
          >
            Редактировать
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Информация</h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-500">Телефон:</span>{" "}
              <span className="text-gray-800">{client.phone || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500">Email:</span>{" "}
              <span className="text-gray-800">{client.email || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500">ИНН:</span>{" "}
              <span className="text-gray-800">{client.inn || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500">Примечание:</span>{" "}
              <span className="text-gray-800">{client.notes || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500">Источник:</span>{" "}
              <span className="text-gray-800">{client.source || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500">Статус:</span>{" "}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                client.status === "Active" ? "bg-green-100 text-green-700" :
                client.status === "New" ? "bg-primary-100 text-primary-700" :
                "bg-gray-100 text-gray-500"
              }`}>
                {client.status || "-"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Дата создания:</span>{" "}
              <span className="text-gray-800">
                {new Date(client.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm">
              <span className="text-gray-500">Ответственный:</span>{" "}
              <span className="font-medium text-gray-800">
                {client.createdBy
                  ? `${client.createdBy.firstName} ${client.createdBy.lastName}`
                  : "-"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">
            Сделки ({client.deals?.length || 0})
          </h2>
          <div className="space-y-2">
            {client.deals?.map((deal: any) => (
              <div key={deal.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium text-gray-800">{deal.dealNumber}</p>
                <p className="text-gray-500">
                  {deal.status} · {deal.expectedAmount?.toLocaleString()} ₽
                </p>
              </div>
            )) || <p className="text-gray-400 text-sm">Нет сделок</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">
            Документы ({client.legalDocuments?.length || 0})
          </h2>
          <div className="space-y-2">
            {client.legalDocuments?.map((doc: any) => (
              <div key={doc.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium text-gray-800">{doc.documentType}</p>
                <p className="text-gray-500">{doc.status}</p>
              </div>
            )) || <p className="text-gray-400 text-sm">Нет документов</p>}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <ClientActions clientId={client.id} />
      </div>
    </div>
  );
}
