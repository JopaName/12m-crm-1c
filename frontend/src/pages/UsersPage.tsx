import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authAPI } from "../api";
import toast from "react-hot-toast";

const blankForm = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phone: "",
  roleId: "",
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => authAPI.getUsers().then((r) => r.data),
  });

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => authAPI.getRoles().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => authAPI.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Пользователь создан");
      closeModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      authAPI.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Пользователь обновлён");
      closeModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authAPI.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Пользователь архивирован");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(blankForm);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(blankForm);
    setShowModal(true);
  };

  const openEdit = (user: any) => {
    setEditingId(user.id);
    setForm({
      email: user.email,
      password: "",
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || "",
      roleId: user.roleId,
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.firstName || !form.lastName || !form.roleId) {
      toast.error("Заполните обязательные поля");
      return;
    }
    if (editingId) {
      const payload: any = { ...form };
      if (!payload.password) delete payload.password;
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      if (!form.password) {
        toast.error("Введите пароль");
        return;
      }
      createMutation.mutate(form);
    }
  };

  const handleDelete = (user: any) => {
    if (
      confirm(`Архивировать пользователя ${user.firstName} ${user.lastName}?`)
    )
      deleteMutation.mutate(user.id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Пользователи</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Новый пользователь
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? "Редактировать пользователя" : "Новый пользователь"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Имя *"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                />
                <input
                  placeholder="Фамилия *"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                />
              </div>
              <input
                type="email"
                placeholder="Email *"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full"
                required
              />
              <input
                type="password"
                placeholder={
                  editingId
                    ? "Новый пароль (оставьте пустым, чтобы не менять)"
                    : "Пароль *"
                }
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full"
                required={!editingId}
              />
              <input
                placeholder="Телефон"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full"
              />
              <select
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full"
                required
              >
                <option value="">Выберите роль *</option>
                {roles?.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  {editingId ? "Сохранить" : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Имя
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Email
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Роль
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Телефон
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
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Загрузка...
                </td>
              </tr>
            ) : users?.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Нет пользователей
                </td>
              </tr>
            ) : (
              users?.map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {user.role?.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {user.phone || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.isActive ? "Активен" : "Неактивен"}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-1">
                    <button
                      onClick={() => openEdit(user)}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Ред.
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Арх.
                    </button>
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
