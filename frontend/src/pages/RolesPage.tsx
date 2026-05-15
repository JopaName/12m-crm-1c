import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rolesAPI } from "../api";
import toast from "react-hot-toast";

const PERMISSION_GROUPS = [
  {
    label: "Дашборд",
    key: "dashboard",
    perms: ["view"],
  },
  {
    label: "Клиенты",
    key: "clients",
    perms: ["view", "create", "edit", "delete"],
  },
  {
    label: "Лиды",
    key: "leads",
    perms: ["view", "create", "edit", "delete", "convert"],
  },
  {
    label: "Сделки",
    key: "deals",
    perms: ["view", "create", "edit", "delete"],
  },
  {
    label: "Товары",
    key: "products",
    perms: ["view", "create", "edit", "delete"],
  },
  {
    label: "Склад",
    key: "warehouse",
    perms: ["view", "create", "edit", "delete"],
  },
  {
    label: "Производство",
    key: "production",
    perms: ["view", "create", "edit", "delete"],
  },
  {
    label: "Закупки",
    key: "procurement",
    perms: ["view", "create", "edit", "delete"],
  },
  {
    label: "Аренда",
    key: "rent",
    perms: ["view", "create", "edit", "delete"],
  },
  {
    label: "Монтажи",
    key: "installation",
    perms: ["view", "create", "edit", "delete"],
  },
  {
    label: "Договоры",
    key: "legal",
    perms: ["view", "create", "edit", "delete"],
  },
  {
    label: "Сервис",
    key: "service",
    perms: ["view", "create", "edit", "delete"],
  },
  {
    label: "Задачи",
    key: "tasks",
    perms: ["view", "create", "edit", "delete"],
  },
  {
    label: "Пользователи",
    key: "users",
    perms: ["view", "create", "edit", "delete"],
  },
  {
    label: "Роли",
    key: "roles",
    perms: ["view", "create", "edit", "delete"],
  },
  {
    label: "Журнал аудита",
    key: "audit",
    perms: ["view"],
  },
  {
    label: "Интеграции",
    key: "integrations",
    perms: ["view", "create", "edit", "delete"],
  },
];

const PERM_LABELS: Record<string, string> = {
  view: "Просмотр",
  create: "Создание",
  edit: "Редактирование",
  delete: "Удаление",
  convert: "Конвертация",
};

function decodePermissions(json: any): string[] {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  return [];
}

const blankForm = {
  name: "",
  description: "",
  permissions: [] as string[],
};

export default function RolesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm);

  const { data: roles, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesAPI.getAll().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => rolesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Роль создана");
      closeModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      rolesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Роль обновлена");
      closeModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rolesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Роль архивирована");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || "Ошибка"),
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

  const openEdit = (role: any) => {
    setEditingId(role.id);
    setForm({
      name: role.name,
      description: role.description || "",
      permissions: decodePermissions(role.permissions),
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("Введите название роли");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (role: any) => {
    if (confirm(`Архивировать роль "${role.name}"?`))
      deleteMutation.mutate(role.id);
  };

  const togglePermission = (perm: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const toggleGroup = (groupKey: string, perms: string[], value: boolean) => {
    setForm((prev) => {
      const withoutGroup = prev.permissions.filter(
        (p) => !perms.map((pp) => `${groupKey}:${pp}`).includes(p),
      );
      return {
        ...prev,
        permissions: value
          ? [...withoutGroup, ...perms.map((p) => `${groupKey}:${p}`)]
          : withoutGroup,
      };
    });
  };

  const isGroupFull = (groupKey: string, perms: string[]) =>
    perms.every((p) => form.permissions.includes(`${groupKey}:${p}`));

  const isGroupPartial = (groupKey: string, perms: string[]) =>
    !isGroupFull(groupKey, perms) &&
    perms.some((p) => form.permissions.includes(`${groupKey}:${p}`));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Роли и права</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Новая роль
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? "Редактировать роль" : "Новая роль"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Название роли *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                />
                <input
                  placeholder="Описание"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Возможности (разрешения)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {PERMISSION_GROUPS.map((group) => {
                    const full = isGroupFull(group.key, group.perms);
                    const partial = isGroupPartial(group.key, group.perms);
                    return (
                      <div
                        key={group.key}
                        className="border border-gray-200 rounded-lg p-3"
                      >
                        <label className="flex items-center gap-2 mb-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={full}
                            ref={(el) => {
                              if (el) el.indeterminate = partial && !full;
                            }}
                            onChange={() =>
                              toggleGroup(
                                group.key,
                                group.perms,
                                !full,
                              )
                            }
                            className="rounded"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {group.label}
                          </span>
                        </label>
                        <div className="flex flex-wrap gap-1.5 ml-5">
                          {group.perms.map((perm) => {
                            const key = `${group.key}:${perm}`;
                            return (
                              <label
                                key={key}
                                className="flex items-center gap-1 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={form.permissions.includes(key)}
                                  onChange={() => togglePermission(key)}
                                  className="rounded text-xs"
                                />
                                <span className="text-xs text-gray-500">
                                  {PERM_LABELS[perm]}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

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
                Роль
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Описание
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Пользователей
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Возможности
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
            ) : roles?.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Нет ролей
                </td>
              </tr>
            ) : (
              roles?.map((role: any) => {
                const perms = decodePermissions(role.permissions);
                const permCount =
                  PERMISSION_GROUPS.filter((g) =>
                    g.perms.some((p) => perms.includes(`${g.key}:${p}`)),
                  ).length;
                return (
                  <tr key={role.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {role.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {role.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {role._count?.users ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {permCount} / {PERMISSION_GROUPS.length} разделов
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-1">
                      <button
                        onClick={() => openEdit(role)}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Ред.
                      </button>
                      <button
                        onClick={() => handleDelete(role)}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Арх.
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
