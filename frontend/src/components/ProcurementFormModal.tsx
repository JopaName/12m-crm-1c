import React, { useState } from "react";
import { X, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

function FormModal({ data: initial, onClose, users, suppliers, isEdit, onSubmit, onUpdate, onDelete, isPending }: {
  data?: any; onClose: () => void; users?: any[]; suppliers?: any[]; isEdit?: boolean;
  onSubmit?: (d: any) => void; onUpdate?: (id: string, d: any) => void; onDelete?: (id: string) => void; isPending?: boolean;
}) {
  const [f, setF] = useState(initial ? {
    productName: initial.productName || initial.product?.name || "",
    quantity: initial.quantity,
    responsibleUserId: initial.responsibleUserId || "",
    supplierId: initial.supplierId || "",
    dueDate: initial.dueDate ? initial.dueDate.split("T")[0] : "",
    dueDateIndefinite: !initial.dueDate,
    note: initial.note || "",
    fileUrl: initial.fileUrl || "",
    fileName: initial.fileName || "",
  } : {
    productName: "",
    quantity: 1,
    responsibleUserId: "",
    supplierId: "",
    dueDate: "",
    dueDateIndefinite: true,
    note: "",
    fileUrl: "",
    fileName: "",
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await procurementAPI.uploadFile(file);
      const data = res.data;
      setF({ ...f, fileUrl: data.fileUrl, fileName: data.fileName });
      toast.success("Файл загружен");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Ошибка загрузки файла");
    }
    setUploading(false);
  };

  const handleSubmit = () => {
    if (!f.productName.trim()) { toast.error("Введите название товара"); return; }
    const cleaned = cleanData({ ...f, status: isEdit ? initial.status : "Не прочитано" });
    if (isEdit && onUpdate) onUpdate(initial.id, cleaned);
    else if (onSubmit) onSubmit(cleaned);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            {isEdit ? <><Edit3 className="w-4 h-4 text-primary-500" />Редактировать заявку</> : <><Plus className="w-4 h-4 text-primary-500" />Новая заявка</>}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Название товара <span className="text-red-500">*</span></label>
            <input type="text" placeholder="Введите название товара" value={f.productName}
              onChange={(e) => setF({ ...f, productName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Поставщик</label>
            <select value={f.supplierId} onChange={(e) => setF({ ...f, supplierId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all">
              <option value="">Не выбран</option>
              {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Количество</label>
              <input type="number" min={1} value={f.quantity}
                onChange={(e) => setF({ ...f, quantity: Math.max(1, +e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Прикрепить файл</label>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-all">
                {uploading ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : <Paperclip className="w-4 h-4" />}
                {f.fileName ? f.fileName : "Выбрать файл"}
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ответственный</label>
            <select value={f.responsibleUserId} onChange={(e) => setF({ ...f, responsibleUserId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all">
              <option value="">Не назначен</option>
              {users?.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Срок</label>
            <div className="flex items-center gap-3">
              <input type="date" value={f.dueDate} disabled={f.dueDateIndefinite}
                onChange={(e) => setF({ ...f, dueDate: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed" />
              <label className="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap cursor-pointer select-none">
                <input type="checkbox" checked={f.dueDateIndefinite}
                  onChange={(e) => setF({ ...f, dueDateIndefinite: e.target.checked, dueDate: e.target.checked ? "" : f.dueDate })} className="rounded" />
                Бессрочно</label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Примечание</label>
            <textarea placeholder="Дополнительная информация..." value={f.note}
              onChange={(e) => setF({ ...f, note: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all resize-none" rows={2} />
          </div>
          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Статус</label>
              <select value={initial.status} onChange={(e) => { initial.status = e.target.value; }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
          {isEdit && onDelete && (
            confirmDelete ? (
              <>
                <button onClick={() => { onDelete(initial.id); onClose(); }}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors">Подтвердить</button>
                <button onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-300 transition-colors">Отмена</button>
              </>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-3 h-3" />В архив</button>
            )
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Отмена</button>
          <button onClick={handleSubmit} disabled={isPending || uploading}
            className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
            {isPending ? (
              <span className="flex items-center gap-1.5"><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Сохранение...</span>
            ) : isEdit ? "Сохранить" : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======== SuppliersPanel ======== */

export default FormModal;
