import React, { useState, useRef, useEffect } from "react";
import { X, Save, Trash2, Plus, Edit3, Paperclip, CreditCard, Banknote, Package, Check, Truck, AlertTriangle, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { procurementAPI } from "../api";

const PIPELINE_STAGES = [
  { key: "new", label: "Новая", icon: "doc" },
  { key: "payment_pending", label: "Оплата", icon: "clock" },
  { key: "processing", label: "Обработка", icon: "gear" },
  { key: "in_progress", label: "Сборка", icon: "package" },
  { key: "ready_for_pickup", label: "Готово", icon: "check" },
  { key: "shipped", label: "Отгружено", icon: "truck" },
];

const STATUS_ACTIONS: Record<string, { label: string; action: string; color: string; role?: string[] }[]> = {
  payment_pending: [
    { label: "Оплачено (безнал)", action: "confirm-payment", color: "bg-green-600 hover:bg-green-700" },
  ],
  processing: [
    { label: "Взять в работу", action: "take-work", color: "bg-purple-600 hover:bg-purple-700", role: ["Director","WarehouseManager"] },
  ],
  in_progress: [
    { label: "Готово к отгрузке", action: "ready", color: "bg-blue-600 hover:bg-blue-700", role: ["Director","WarehouseManager"] },
    { label: "Оплачено (нал)", action: "cash-paid", color: "bg-green-600 hover:bg-green-700" },
    { label: "Отгрузить", action: "ship", color: "bg-amber-600 hover:bg-amber-700", role: ["Director","WarehouseManager"] },
  ],
  ready_for_pickup: [
    { label: "Оплачено (нал)", action: "cash-paid", color: "bg-green-600 hover:bg-green-700" },
    { label: "Отгрузить", action: "ship", color: "bg-amber-600 hover:bg-amber-700", role: ["Director","WarehouseManager"] },
  ],
  for_production: [
    { label: "Произведено", action: "production-ready", color: "bg-orange-600 hover:bg-orange-700", role: ["Director","ProductionManager"] },
  ],
  awaiting_production: [
    { label: "Произведено", action: "production-ready", color: "bg-orange-600 hover:bg-orange-700", role: ["Director","ProductionManager"] },
  ],
};

const CAN_CANCEL = ["new", "payment_pending", "processing", "for_production", "awaiting_production"];
const CAN_EDIT = ["new", "payment_pending", "processing", "for_production", "awaiting_production"];

const cleanData = (d: Record<string, any>) => {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(d)) {
    if (v === "" || v === undefined || v === null || k === "dueDateIndefinite") continue;
    out[k] = v;
  }
  return out;
};

function FormModal({ data: initial, onClose, users, suppliers, isEdit, onSubmit, onUpdate, onDelete, isPending, currentUser }: {
  data?: any; onClose: () => void; users?: any[]; suppliers?: any[]; isEdit?: boolean; currentUser?: any;
  onSubmit?: (d: any) => void; onUpdate?: (id: string, d: any) => void; onDelete?: (id: string) => void; isPending?: boolean;
}) {
  const [f, setF] = useState(initial ? {
    productName: initial.productName || initial.product?.name || "",
    quantity: initial.quantity || 1,
    responsibleUserId: initial.responsibleUserId || "",
    supplierId: initial.supplierId || "",
    dueDate: initial.dueDate ? initial.dueDate.split("T")[0] : "",
    dueDateIndefinite: !initial.dueDate,
    note: initial.note || "",
    fileUrl: initial.fileUrl || "",
    fileName: initial.fileName || "",
    paymentType: initial.paymentType || "cashless",
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
    paymentType: "cashless",
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cancelNote, setCancelNote] = useState("");
  const [showCancel, setShowCancel] = useState(false);
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
      toast.success("File uploaded");
    } catch (err: any) { toast.error(err.response?.data?.error || "Upload failed"); }
    setUploading(false);
  };

  const handleSubmit = () => {
    if (!f.productName.trim()) { toast.error("Enter product name"); return; }
    const cleaned = cleanData({ ...f, status: isEdit ? initial.status : "new" });
    if (isEdit && onUpdate) onUpdate(initial.id, cleaned);
    else if (onSubmit) onSubmit(cleaned);
  };

  const handleAction = async (action: string) => {
    try {
      const map: Record<string, () => Promise<any>> = {
        "confirm-payment": () => procurementAPI.confirmPayment(initial.id),
        "cash-paid": () => procurementAPI.markCashPaid(initial.id),
        "take-work": () => procurementAPI.takeInWork(initial.id),
        "ready": () => procurementAPI.markReady(initial.id),
        "ship": () => procurementAPI.ship(initial.id),
        "production-ready": () => procurementAPI.productionReady(initial.id),
      };
      if (map[action]) {
        await map[action]();
        toast.success("Status updated");
        onClose();
      }
    } catch (err: any) { toast.error(err.response?.data?.error || "Action failed"); }
  };

  const handleCancel = async () => {
    try {
      await procurementAPI.cancelRequest(initial.id, cancelNote || undefined);
      toast.success("Request cancelled");
      onClose();
    } catch (err: any) { toast.error(err.response?.data?.error || "Cancel failed"); }
  };

  const status = initial?.status || "new";
  const actions = STATUS_ACTIONS[status] || [];
  const canCancel = CAN_CANCEL.includes(status);
  const canEdit = CAN_EDIT.includes(status);
  const stageIndex = PIPELINE_STAGES.findIndex(s => s.key === status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            {isEdit ? <><Edit3 className="w-4 h-4 text-primary-500" />Редактировать заявку</> : <><Plus className="w-4 h-4 text-primary-500" />Новая заявка</>}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        {/* Pipeline progress bar (edit mode) */}
        {isEdit && (
          <div className="px-5 pt-4 pb-2">
            <div className="flex items-center gap-1">
              {PIPELINE_STAGES.map((s, i) => {
                const done = i < stageIndex;
                const current = s.key === status;
                const isCancelled = status === "cancelled";
                const isProduction = ["for_production", "awaiting_production"].includes(status);
                return (
                  <React.Fragment key={s.key}>
                    {i > 0 && <div className={`flex-1 h-0.5 rounded ${done ? "bg-green-500" : (current && !isCancelled ? "bg-primary-500" : "bg-gray-200")}`} />}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shrink-0 ${
                      isCancelled ? "bg-red-100 text-red-500" :
                      isProduction ? (i === 0 ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-400") :
                      done ? "bg-green-100 text-green-600" :
                      current ? "bg-primary-100 text-primary-600 ring-2 ring-primary-300" :
                      "bg-gray-100 text-gray-400"
                    }`}>
                      {i + 1}
                    </div>
                  </React.Fragment>
                );
              })}
              {(status === "cancelled" || status === "for_production" || status === "awaiting_production") && (
                <div className="ml-2 text-[10px] font-medium text-red-500">— {status === "cancelled" ? "Отменено" : "Производство"}</div>
              )}
            </div>
            <div className="flex justify-between mt-1">
              {PIPELINE_STAGES.map((s, i) => (
                <div key={s.key} className={`text-[9px] ${i <= stageIndex && status !== "cancelled" ? "text-gray-600 font-medium" : "text-gray-400"}`} style={{width: "14.28%"}}>
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-5 py-4 space-y-3">
          {/* Payment type (create mode only) */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Тип оплаты</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setF({...f, paymentType: "cashless"})}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                    f.paymentType === "cashless" ? "border-primary-500 bg-primary-50 text-primary-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  <CreditCard className="w-3.5 h-3.5" /> Безналичный</button>
                <button onClick={() => setF({...f, paymentType: "cash"})}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                    f.paymentType === "cash" ? "border-primary-500 bg-primary-50 text-primary-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  <Banknote className="w-3.5 h-3.5" /> Наличный</button>
              </div>
            </div>
          )}

          {/* Show payment type and status in edit mode */}
          {isEdit && (
            <div className="flex items-center gap-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              <span>Тип: <b className="text-gray-700">{initial.paymentType === "cash" ? "Наличный" : "Безналичный"}</b></span>
              <span className="text-gray-300">|</span>
              <span>Оплата: <b className={initial.paymentStatus === "paid" ? "text-green-600" : "text-amber-600"}>
                {initial.paymentStatus === "paid" ? "Оплачено" : "Не оплачено"}</b></span>
              <span className="text-gray-300">|</span>
              <span>Резерв: <b className={initial.reserved ? "text-green-600" : "text-gray-500"}>{initial.reserved ? "Да" : "Нет"}</b></span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Название товара <span className="text-red-500">*</span></label>
            <input type="text" placeholder="Введите название товара" value={f.productName}
              onChange={(e) => setF({ ...f, productName: e.target.value })}
              disabled={isEdit && !canEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all disabled:opacity-60 disabled:bg-gray-50" autoFocus />
            {isEdit && !canEdit && <p className="text-[10px] text-red-400 mt-0.5">Редактирование заблокировано — заявка в работе</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Поставщик</label>
              <select value={f.supplierId} onChange={(e) => setF({ ...f, supplierId: e.target.value })}
                disabled={isEdit && !canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all disabled:opacity-60">
                <option value="">Не выбран</option>
                {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Количество</label>
              <input type="number" min={1} value={f.quantity}
                onChange={(e) => setF({ ...f, quantity: Math.max(1, +e.target.value) })}
                disabled={isEdit && !canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all disabled:opacity-60 disabled:bg-gray-50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              <div className="flex items-center gap-2">
                <input type="date" value={f.dueDate} disabled={f.dueDateIndefinite}
                  onChange={(e) => setF({ ...f, dueDate: e.target.value })}
                  className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all disabled:opacity-40" />
                <label className="flex items-center gap-1 text-[10px] text-gray-500 whitespace-nowrap cursor-pointer">
                  <input type="checkbox" checked={f.dueDateIndefinite}
                    onChange={(e) => setF({ ...f, dueDateIndefinite: e.target.checked, dueDate: e.target.checked ? "" : f.dueDate })} />
                  —</label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Примечание</label>
            <textarea placeholder="Дополнительная информация..." value={f.note}
              onChange={(e) => setF({ ...f, note: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all resize-none" rows={2} />
          </div>

          {/* File upload */}
          <div>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-all">
              {uploading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : <Paperclip className="w-4 h-4" />}
              {f.fileName ? f.fileName : "Прикрепить файл"}
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
          </div>
        </div>

        {/* Action buttons (edit mode) */}
        {isEdit && actions.length > 0 && (
          <div className="px-5 pb-3 flex flex-wrap gap-2">
            {actions.map(a => (
              <button key={a.action} onClick={() => handleAction(a.action)}
                className={`px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-all shadow-sm ${a.color}`}>
                {a.label}
              </button>
            ))}
            {canCancel && (
              showCancel ? (
                <div className="flex items-center gap-2 w-full mt-1">
                  <input value={cancelNote} onChange={e => setCancelNote(e.target.value)} placeholder="Причина отмены" className="flex-1 px-2 py-1 border border-red-200 rounded text-xs" />
                  <button onClick={handleCancel} className="px-3 py-1 bg-red-600 text-white rounded text-xs">Отменить</button>
                  <button onClick={() => setShowCancel(false)} className="px-2 py-1 text-gray-500 text-xs">X</button>
                </div>
              ) : (
                <button onClick={() => setShowCancel(true)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Отменить</button>
              )
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
          {isEdit && onDelete && canEdit && (
            confirmDelete ? (
              <>
                <button onClick={() => { onDelete(initial.id); onClose(); }}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700">Подтвердить</button>
                <button onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-300">Отмена</button>
              </>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3 h-3" />Архив</button>
            )
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Закрыть</button>
          {(!isEdit || canEdit) && (
            <button onClick={handleSubmit} disabled={isPending || uploading}
              className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50 shadow-sm">
              {isPending ? "Сохранение..." : isEdit ? "Сохранить" : "Создать"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FormModal;