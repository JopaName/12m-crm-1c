import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksAPI, dealsAPI, authAPI } from "../api";
import toast from "react-hot-toast";

const typeLabels: Record<string, string> = {
  General: "Общая",
  Legal: "Юридическая",
  Technical: "Техническая",
  Service: "Сервисная",
  Procurement: "Закупочная",
};
const statusLabels: Record<string, string> = {
  New: "Новая",
  InProgress: "В работе",
  Completed: "Выполнена",
  Cancelled: "Отменена",
};
const priorityLabels: Record<string, string> = {
  Low: "Низкий",
  Medium: "Средний",
  High: "Высокий",
  Critical: "Критический",
};

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "General",
    priority: "Medium",
    dealId: "",
    assigneeId: "",
    dueDate: "",
  });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksAPI.getAll().then((r) => r.data),
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
    mutationFn: (data: any) => tasksAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Задача создана");
      setShowForm(false);
      setForm({
        title: "",
        description: "",
        type: "General",
        priority: "Medium",
        dealId: "",
        assigneeId: "",
        dueDate: "",
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      tasksAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Статус обновлён");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      toast.error("Введите название задачи");
      return;
    }
    createMutation.mutate({
      ...form,
      dueDate: form.dueDate || undefined,
      dealId: form.dealId || undefined,
      assigneeId: form.assigneeId || undefined,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Поручения и задачи</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Новая задача
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
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {Object.entries(priorityLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={form.assigneeId}
              onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Назначить исполнителя</option>
              {users?.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
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
                  {d.dealNumber} - {d.client?.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
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
            Сохранить
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Название
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Тип
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Приоритет
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Статус
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Исполнитель
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Срок
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
            ) : tasks?.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  Нет задач
                </td>
              </tr>
            ) : (
              tasks?.map((task: any) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    {task.title}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {typeLabels[task.type] || task.type}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        task.priority === "Critical"
                          ? "bg-red-100 text-red-700"
                          : task.priority === "High"
                            ? "bg-orange-100 text-orange-700"
                            : task.priority === "Medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {priorityLabels[task.priority] || task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        task.status === "Completed"
                          ? "bg-green-100 text-green-700"
                          : task.status === "InProgress"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {statusLabels[task.status] || task.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {task.assignee
                      ? `${task.assignee.firstName} ${task.assignee.lastName}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 flex gap-1">
                    {task.status === "New" && (
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            id: task.id,
                            data: { status: "InProgress" },
                          })
                        }
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        В работу
                      </button>
                    )}
                    {task.status === "InProgress" && (
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            id: task.id,
                            data: { status: "Completed" },
                          })
                        }
                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Завершить
                      </button>
                    )}
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
