import { useState } from "react";
import { FileText, X, Save, Calendar, User, Folders } from "lucide-react";
import toast from "react-hot-toast";

const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const PRIORITY_META: Record<string, { color: string; bg: string; lightBg: string; label: string; icon: string }> = {
  Critical: { color: "text-red-600", bg: "bg-red-500", lightBg: "bg-red-50", label: "Критический", icon: "🔴" },
  High: { color: "text-amber-600", bg: "bg-amber-500", lightBg: "bg-amber-50", label: "Высокий", icon: "🟠" },
  Medium: { color: "text-blue-600", bg: "bg-blue-500", lightBg: "bg-blue-50", label: "Средний", icon: "🔵" },
  Low: { color: "text-gray-500", bg: "bg-gray-400", lightBg: "bg-gray-50", label: "Низкий", icon: "⚪" },
};

export default function TaskFormModal({ task, onClose, users, onSubmit, isPending, presetDealId, deals }: {
  task?: any; onClose: () => void; users?: any[]; onSubmit: (d: any) => void; isPending: boolean; presetDealId?: string; deals?: any[];
}) {
  const [f, setF] = useState(task ? {
    title: task.title || "", description: task.description || "", priority: task.priority || "Medium",
    assigneeId: task.assigneeId || "", dealId: task.dealId || "", dueDate: task.dueDate ? task.dueDate.split("T")[0] : ""
  } : { title: "", description: "", priority: "Medium", assigneeId: "", dealId: presetDealId || "", dueDate: "" });

  const handleSubmit = () => {
    if (!f.title.trim()) { toast.error("Введите название задачи"); return; }
    onSubmit({ title: f.title.trim(), description: f.description.trim(), assigneeId: f.assigneeId || undefined, priority: f.priority, dueDate: f.dueDate || undefined, dealId: f.dealId || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary-600 to-primary-800 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base">{task ? "Редактирование задачи" : "Новая задача"}</h3>
                <p className="text-xs text-white/60">{presetDealId ? "Будет привязана к лиду" : task ? "Измените параметры" : "Заполните основные поля"}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Название задачи</label>
            <input
              placeholder="Что нужно сделать?"
              value={f.title}
              onChange={e => setF({ ...f, title: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/30 focus:bg-white transition-all placeholder:text-gray-400"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter" && f.title.trim()) handleSubmit(); }}
            />
          </div>

          {/* Linked deal */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              <Folders className="w-3 h-3 inline mr-1" />Связанный лид
            </label>
            {presetDealId ? (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-xl text-sm text-primary-700">
                <Folders className="w-4 h-4 shrink-0" />
                <span className="truncate">Автоматически привязан</span>
              </div>
            ) : (
              <select value={f.dealId} onChange={e => setF({ ...f, dealId: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/30 cursor-pointer">
                <option value="">Без лида</option>
                {deals?.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.dealNumber} — {d.client?.name || d.expectedAmount?.toLocaleString() + " ₽" || "—"}</option>
                ))}
              </select>
            )}
          </div>

          {/* Priority + Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Приоритет</label>
              <div className="grid grid-cols-2 gap-1">
                {PRIORITIES.map(p => (
                  <button key={p} type="button"
                    onClick={() => setF({ ...f, priority: p })}
                    className={`flex items-center gap-1.5 px-2 py-2 rounded-xl text-[11px] font-medium transition-all ${
                      f.priority === p ? `${PRIORITY_META[p].lightBg} ${PRIORITY_META[p].color} ring-2 ring-current/30` : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${PRIORITY_META[p].bg}`} />
                    {PRIORITY_META[p].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Assignee + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                <User className="w-3 h-3 inline mr-1" />Исполнитель
              </label>
              <select value={f.assigneeId} onChange={e => setF({ ...f, assigneeId: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/30 cursor-pointer">
                <option value="">Любой сотрудник</option>
                {users?.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />Срок
              </label>
              <div className="relative">
                <input type="date" value={f.dueDate} onChange={e => setF({ ...f, dueDate: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/30 cursor-pointer" />
                {f.dueDate && (
                  <button onClick={() => setF({ ...f, dueDate: "" })} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-red-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Описание</label>
            <textarea
              placeholder="Детали, заметки, ссылки..."
              value={f.description}
              onChange={e => setF({ ...f, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/30 focus:bg-white transition-all resize-none placeholder:text-gray-400"
            />
            {f.description.length > 0 && (
              <p className="text-[10px] text-gray-400 text-right mt-1">{f.description.length} символов</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/80">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all">
            Отмена
          </button>
          <button onClick={handleSubmit} disabled={isPending || !f.title.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-500/20 active:scale-95">
            {isPending ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : (
              <Save className="w-4 h-4" />
            )}
            {task ? "Сохранить" : "Создать задачу"}
          </button>
        </div>
      </div>
    </div>
  );
}