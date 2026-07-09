import { useState } from "react";
import { FileText, X, Save } from "lucide-react";
import toast from "react-hot-toast";

const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const TYPES = ["General", "Legal", "Technical", "Service", "Procurement"];
const PRIORITY_META: Record<string, { color: string; lightBg: string; label: string }> = {
  Critical: { color: "text-red-600", lightBg: "bg-red-50", label: "Критический" },
  High: { color: "text-amber-600", lightBg: "bg-amber-50", label: "Высокий" },
  Medium: { color: "text-blue-600", lightBg: "bg-blue-50", label: "Средний" },
  Low: { color: "text-gray-600", lightBg: "bg-gray-50", label: "Низкий" },
};
const TYPE_LABELS: Record<string, string> = { General: "Общая", Legal: "Юрид.", Technical: "Техн.", Service: "Сервис", Procurement: "Закупки" };

export default function TaskFormModal({ task, onClose, users, onSubmit, isPending, presetDealId }: {
  task?: any; onClose: () => void; users?: any[]; onSubmit: (d: any) => void; isPending: boolean; presetDealId?: string;
}) {
  const [f, setF] = useState(task ? {
    title: task.title || "", description: task.description || "", type: task.type || "General", priority: task.priority || "Medium",
    assigneeId: task.assigneeId || "", dealId: task.dealId || "", dueDate: task.dueDate ? task.dueDate.split("T")[0] : ""
  } : { title: "", description: "", type: "General", priority: "Medium", assigneeId: "", dealId: presetDealId || "", dueDate: "" });

  const handleSubmit = () => {
    if (!f.title.trim()) { toast.error("Введите название"); return; }
    onSubmit({ title: f.title, description: f.description, type: f.type, assigneeId: f.assigneeId || undefined, priority: f.priority, dueDate: f.dueDate || undefined, dealId: f.dealId || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-primary-500" />{task ? "Редактировать" : "Новая"} задача</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button></div>
        <div className="px-5 py-4 space-y-3">
          <input placeholder="Название *" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <select value={f.type} onChange={e => setF({ ...f, type: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">{TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select>
            <select value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">{PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}</select></div>
          <select value={f.assigneeId} onChange={e => setF({ ...f, assigneeId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"><option value="">Не назначен</option>{users?.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}</select>
          <input type="date" value={f.dueDate} onChange={e => setF({ ...f, dueDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
          <textarea placeholder="Описание" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none resize-none" />
        </div>
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
          <div className="flex-1" /><button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Отмена</button>
          <button onClick={handleSubmit} disabled={isPending} className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm"><Save className="w-3.5 h-3.5 mr-1 inline" />{task ? "Сохранить" : "Создать"}</button></div>
      </div></div>
  );
}