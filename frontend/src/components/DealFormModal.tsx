import React, { useState, useEffect } from "react";
import { Plus, X, User, Phone, FileText, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";

export default function DealFormModal({ onClose, currentUser }: {
  onClose: () => void; currentUser?: any; onSubmit?: (d: any) => void; isPending?: boolean;
}) {
  const today = new Date().toLocaleDateString("ru-RU");
  const [f, setF] = useState({ name: "", phone: "", description: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!f.name.trim()) { toast.error("Введите имя"); return; }
    if (!f.phone.trim()) { toast.error("Введите телефон"); return; }
    setLoading(true);
    try {
      // Get first pipeline stage
      var firstStage = "Lead_Created";
      try {
        var cached = localStorage.getItem("crm_pipeline_cache");
        if (cached) {
          var stages = JSON.parse(cached);
          if (Array.isArray(stages) && stages.length > 0) {
            firstStage = stages[0].key;
          }
        }
      } catch(e) {}
      
      await api.post("/deals", {
        name: f.name.trim(),
        phone: f.phone.trim(),
        description: f.description.trim(),
        responsibleAgentId: currentUser?.id,
        status: firstStage,
      });
      toast.success("Лид создан");
      onClose();
      // Reload to refresh kanban
      setTimeout(() => window.location.reload(), 500);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Ошибка создания");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Plus className="w-4 h-4 text-primary-500" />Новый лид</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">Имя <span className="text-red-500">*</span></label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })}
              placeholder="Иван Иванов" autoFocus
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" />
          </div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Телефон <span className="text-red-500">*</span></label>
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })}
              placeholder="+7 900 123-45-67"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" />
          </div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Описание</label>
          <div className="relative">
            <FileText className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })}
              placeholder="Опишите потребность..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all resize-none" rows={2} />
          </div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Ответственный</label>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
            <User className="w-4 h-4 text-primary-500" />
            <span>{currentUser?.firstName} {currentUser?.lastName}</span>
            <span className="text-[10px] text-gray-400 ml-auto">авто</span>
          </div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Дата создания</label>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{today}</span>
            <span className="text-[10px] text-gray-400 ml-auto">авто</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Отмена</button>
          <button onClick={handleSubmit} disabled={loading}
            className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50 shadow-sm">
            {loading ? "Создание..." : "Создать"}</button>
        </div>
      </div>
    </div>
  );
}