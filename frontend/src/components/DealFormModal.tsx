import React, { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import toast from "react-hot-toast";

export default function DealFormModal({ onClose, clients, users, onSubmit, isPending, initialClientId }: {
  onClose: () => void; clients?: any[]; users?: any[]; onSubmit: (d: any) => void; isPending: boolean;
}) {
  const [f, setF] = useState({ clientId: initialClientId || "", clientInn: initialClientId ? (clients?.find((c: any) => c.id === initialClientId)?.inn || "") : "", dealType: "Sale", expectedAmount: 0, description: "", responsibleAgentId: "" });

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const handleSubmit = () => {
    if (!f.clientId) { toast.error("Выберите клиента"); return; }
    if (!f.clientInn) { toast.error("Введите ИНН"); return; }
    onSubmit(f);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Plus className="w-4 h-4 text-primary-500" />Новый лид</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Клиент <span className="text-red-500">*</span></label>
            <select value={f.clientId} onChange={(e) => {
              const c = clients?.find((x: any) => x.id === e.target.value);
              setF({ ...f, clientId: e.target.value, clientInn: c?.inn || "" });
            }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" autoFocus>
              <option value="">Выберите клиента</option>
              {clients?.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.inn || "—"})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">ИНН <span className="text-red-500">*</span></label>
            <input value={f.clientInn} onChange={(e) => setF({ ...f, clientInn: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Тип</label>
              <select value={f.dealType} onChange={(e) => setF({ ...f, dealType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                <option value="Sale">Продажа</option><option value="ProjectSale">Проект</option><option value="Rent">Аренда</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Сумма</label>
              <input type="number" value={f.expectedAmount} onChange={(e) => setF({ ...f, expectedAmount: +e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Агент</label>
            <select value={f.responsibleAgentId} onChange={(e) => setF({ ...f, responsibleAgentId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
              <option value="">Не назначен</option>
              {users?.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Описание</label>
            <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all resize-none" rows={2} />
          </div>
        </div>
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Отмена</button>
          <button onClick={handleSubmit} disabled={isPending}
            className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50 shadow-sm">
            {isPending ? "Создание..." : "Создать"}</button>
        </div>
      </div>
    </div>
  );
}

