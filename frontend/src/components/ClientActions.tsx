import React, { useState } from "react";
import ActionContextPanel from "./ActionContextPanel";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { actionsAPI } from "../api";
import toast from "react-hot-toast";

const ACTION_TYPES: Record<string, { icon: string; label: string }> = {
  CALL: { icon: "📞", label: "Звонок" },
  MEETING: { icon: "🤝", label: "Встреча" },
  EMAIL: { icon: "📧", label: "Email" },
  PROPOSAL: { icon: "📄", label: "Ком. предложение" },
  CONTRACT: { icon: "✍️", label: "Договор" },
  PAYMENT: { icon: "💰", label: "Оплата" },
  SERVICE: { icon: "🔧", label: "Сервис" },
  TASK: { icon: "✅", label: "Задача" },
  NOTE: { icon: "📝", label: "Заметка" },
  OTHER: { icon: "📌", label: "Другое" },
};

const STATUS_OPTIONS = [
  { value: "PLAN", label: "План", color: "bg-gray-100 text-gray-600" },
  { value: "IN_PROGRESS", label: "В работе", color: "bg-blue-100 text-blue-700" },
  { value: "COMPLETED", label: "Выполнено", color: "bg-green-100 text-green-700" },
  { value: "CANCELLED", label: "Отменено", color: "bg-red-100 text-red-600" },
];

function getStatusStyle(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
}

interface Props {
  clientId: string;
}

function ActionStep({
  action,
  index,
  isFirst,
  isLast,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
  onSelect,
  onStatusChange,
}: {
  action: any;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onSave: (id: string, data: any) => void;
  onDelete: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSelect?: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: action.title,
    description: action.description || "",
    type: action.type,
    status: action.status,
  });
  const typeInfo = ACTION_TYPES[action.type] || ACTION_TYPES.OTHER;
  const statusStyle = getStatusStyle(action.status);

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error("Название обязательно");
      return;
    }
    onSave(action.id, form);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="relative pb-4">
        {!isLast && (
          <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-gray-200" />
        )}
        <div className="flex gap-4">
          <div className="flex flex-col items-center pt-1">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg flex-shrink-0">
              ✏️
            </div>
          </div>
          <div className="flex-1 p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {Object.entries(ACTION_TYPES).map(([key, val]) => (
                  <option key={key} value={key}>{val.icon} {val.label}</option>
                ))}
              </select>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Название"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Описание / результат"
            />
            <div className="flex gap-2">
              <button onClick={handleSave} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs">Сохранить</button>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-xs">Отмена</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative pb-4">
      {!isLast && (
        <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-gray-200" />
      )}
      <div className="flex gap-4 group">
        <div className="flex flex-col items-center pt-1">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
            {typeInfo.icon}
          </div>
        </div>
        <div
          className="flex-1 bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow cursor-pointer"
          onClick={() => onSelect?.(action.id)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 font-mono">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {typeInfo.label}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.color}`}>
                  {statusStyle.label}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-800 mt-1">
                {action.title}
              </h3>
              {action.description && (
                <p className="text-sm text-gray-500 mt-1">{action.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span>
                  {action.createdBy
                    ? `${action.createdBy.firstName} ${action.createdBy.lastName}`
                    : "—"}
                </span>
                <span>{new Date(action.createdAt).toLocaleDateString()}</span>
                {action.completedAt && (
                  <span>
                    ✓ {new Date(action.completedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              {action.status !== "COMPLETED" && (
                <button
                  onClick={() => onStatusChange(action.id, "COMPLETED")}
                  className="p-1.5 hover:bg-green-100 rounded-lg text-green-600"
                  title="Выполнено"
                >
                  ✓
                </button>
              )}
              {action.status === "PLAN" && (
                <button
                  onClick={() => onStatusChange(action.id, "IN_PROGRESS")}
                  className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600"
                  title="В работу"
                >
                  ▶
                </button>
              )}
              {action.status === "IN_PROGRESS" && (
                <button
                  onClick={() => onStatusChange(action.id, "PLAN")}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
                  title="Вернуть в план"
                >
                  ↩
                </button>
              )}
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
                title="Редактировать"
              >
                ✏️
              </button>
              <button
                onClick={() => onDelete(action.id)}
                className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"
                title="Удалить"
              >
                🗑
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-20 text-gray-500"
            title="Выше"
          >
            ▲
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-20 text-gray-500"
            title="Ниже"
          >
            ▼
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientActions({ clientId }: Props) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [newAction, setNewAction] = useState({
    type: "CALL",
    title: "",
    description: "",
    status: "PLAN",
  });

  const { data: actions, isLoading } = useQuery({
    queryKey: ["client-actions", clientId],
    queryFn: () => actionsAPI.getByClient(clientId).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => actionsAPI.create(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-actions", clientId] });
      toast.success("Действие добавлено");
      setShowAddForm(false);
      setNewAction({ type: "CALL", title: "", description: "", status: "PLAN" });
    },
    onError: () => toast.error("Ошибка создания"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      actionsAPI.update(clientId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-actions", clientId] });
      toast.success("Действие обновлено");
    },
    onError: () => toast.error("Ошибка обновления"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => actionsAPI.delete(clientId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-actions", clientId] });
      toast.success("Действие удалено");
    },
    onError: () => toast.error("Ошибка удаления"),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => actionsAPI.reorder(clientId, orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-actions", clientId] });
    },
  });

  const handleMoveUp = (index: number) => {
    if (!actions || index === 0) return;
    const ids = actions.map((a: any) => a.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    reorderMutation.mutate(ids);
  };

  const handleMoveDown = (index: number) => {
    if (!actions || index === actions.length - 1) return;
    const ids = actions.map((a: any) => a.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    reorderMutation.mutate(ids);
  };

  const handleStatusChange = (id: string, status: string) => {
    updateMutation.mutate({ id, data: { status } });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAction.title.trim()) {
      toast.error("Укажите название действия");
      return;
    }
    createMutation.mutate(newAction);
  };

  return (
    <>
      {selectedActionId && actions && (
        <ActionContextPanel
          clientId={clientId}
          actionId={selectedActionId}
          actionTitle={actions.find((a: any) => a.id === selectedActionId)?.title || ""}
          onClose={() => setSelectedActionId(null)}
        />
      )}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Процесс взаимодействия
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Добавить действие
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleCreate}
          className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={newAction.type}
              onChange={(e) => setNewAction({ ...newAction, type: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(ACTION_TYPES).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.icon} {val.label}
                </option>
              ))}
            </select>
            <select
              value={newAction.status}
              onChange={(e) => setNewAction({ ...newAction, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <input
            placeholder="Название действия *"
            value={newAction.title}
            onChange={(e) => setNewAction({ ...newAction, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <textarea
            placeholder="Описание / результат"
            value={newAction.description}
            onChange={(e) => setNewAction({ ...newAction, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Загрузка...</div>
      ) : !actions || actions.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          Нет запланированных действий. Добавьте первое действие.
        </div>
      ) : (
        <div>
          {actions.map((action: any, index: number) => (
            <ActionStep
              key={action.id}
              action={action}
              index={index}
              isFirst={index === 0}
              isLast={index === actions.length - 1}
              onSave={(id, data) => updateMutation.mutate({ id, data })}
              onDelete={(id) => {
                if (confirm("Удалить это действие?")) deleteMutation.mutate(id);
              }}
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
              onSelect={(id) => setSelectedActionId(id)}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
    </>
  );
}
