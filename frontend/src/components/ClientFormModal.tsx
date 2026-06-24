import React, { useState, useEffect } from "react";
import { X, Plus, Edit3 } from "lucide-react";

function ClientFormModal({ onClose, onSubmit, isPending, editing }: { onClose: () => void; onSubmit: (d: any) => void; isPending: boolean; editing?: any }) {
  const [f, setF] = useState(editing ? { name: editing.name || "", phone: editing.phone || "", email: editing.email || "", inn: editing.inn || "", source: editing.source || "Direct", status: editing.status || "New", address: editing.address || "", notes: editing.notes || "" } : { name: "", phone: "", email: "", inn: "", source: "Direct", status: "New", address: "", notes: "" });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          {editing ? <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Edit3 className="w-4 h-4 text-primary-500" />Редактировать клиента</h3> : <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Plus className="w-4 h-4 text-primary-500" />Новый клиент</h3>}
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Название <span className="text-red-500">*</span></label>
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Телефон</label>
              <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">ИНН</label>
            <input value={f.inn} onChange={(e) => setF({ ...f, inn: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Источник</label>
              <select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Статус</label>
              <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Адрес</label>
            <input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Заметки</label>
            <textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none" rows={2} /></div>
        </div>
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
          <div className="flex-1" /><button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button>
          <button onClick={() => { if (!f.name.trim()) { toast.error("Введите название"); return; } onSubmit(f); }} disabled={isPending}
            className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50 shadow-sm">{isPending ? (editing ? "Сохранение..." : "Создание...") : (editing ? "Сохранить" : "Создать")}</button>
        </div>
      </div>
    </div>
  );
}

export default ClientFormModal;
