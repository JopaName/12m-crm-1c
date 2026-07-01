import React, { useEffect, useNavigate, useState } from "react";;
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { dealsAPI, dealItemsAPI, procurementAPI } from "../api";
import { cn } from "./cn";
import DocumentFormModal from "./DocumentFormModal";
import { Briefcase, X, ArrowLeft, ArrowRight, FileText, Shield, Edit3, Trash2, Save, Building2, Calendar, DollarSign, User, Phone, Mail, CreditCard, FileDown, ChevronRight, Download, AlertTriangle, Banknote, Wallet, Package, ShoppingCart, Clock } from "lucide-react";
import { STATUS_META } from "../constants/deals";


const PIPELINE_STAGES = [
  { key: "Lead_Created", label: "Лид", icon: "📋" },
  { key: "Invoice_Generation", label: "Счёт", icon: "📄" },
  { key: "Legal_Review", label: "Юристы", icon: "⚖️" },
  { key: "Doc_Sending", label: "Доки", icon: "📨" },
  { key: "Waiting_Payment", label: "Оплата", icon: "💰" },
  { key: "Paid_And_Reserved", label: "Резерв", icon: "📦" },
  { key: "Issuing_Goods", label: "Отгрузка", icon: "🚚" },
  { key: "Deal_Closed", label: "Закрыто", icon: "✅" },
];


const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("ru-RU") : "";
import { Briefcase, X, ArrowLeft, ArrowRight, FileText, Shield, Edit3, Trash2, Save, Eye } from "lucide-react";
import DealProgress from "./DealProgress";
import DealChatPanel from "./DealChatPanel";
import ProfileModal from "./ProfileModal";

export default function DealDetailPanel({ deal, client, agent, canEdit, canDelete, editDealData, confirmDelete, onClose, onEdit, onSaveEdit, onDelete, onCancelEdit, onCancelDelete, isPending, nextStatuses, prevStatus, onStatusChange, users, clients }: {
  deal: any; client: any; agent: string; canEdit: boolean; canDelete: boolean;
  editDealData: any; confirmDelete: boolean;
  onClose: () => void; onEdit: () => void;
  onSaveEdit: (d: any) => void; onDelete: () => void;
  onCancelEdit: () => void; onCancelDelete: () => void;
  isPending: boolean;
  nextStatuses: string[]; prevStatus: string | null;
  onStatusChange: (s: string) => void;
  users?: any[]; clients?: any[];
}) {
  const [edit, setEdit] = useState(editDealData || null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [docPreview, setDocPreview] = useState<{template: string; label: string} | null>(null);
  const [showDocDrawer, setShowDocDrawer] = useState(false);
  const [viewAgentId, setViewAgentId] = useState<string | null>(null);
  const [cancelNote, setCancelNote] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [showZayavka, setShowZayavka] = useState(false);
  const [zayavkaName, setZayavkaName] = useState("");
  const [zayavkaQty, setZayavkaQty] = useState(1);
  const [zayavkaPayment, setZayavkaPayment] = useState("наличный");
  const [zayavkaNote, setZayavkaNote] = useState("");
  const [zayavkaLoading, setZayavkaLoading] = useState(false);
  const [zayavkaList, setZayavkaList] = useState<any[]>([]);
  const [zayavkaError, setZayavkaError] = useState("");
  const navigate = useNavigate();

  const { data: fullDeal } = useQuery({
    queryKey: ["deal-detail", deal.id],
    queryFn: () => dealsAPI.getById(deal.id).then((r) => r.data),
    enabled: !!deal.id,
  });

  const linked = fullDeal || deal;

  // Load zayavka requests for this deal
  const loadZayavka = async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await fetch("/api/procurement/requests?dealId=" + deal.id, { headers: { Authorization: "Bearer " + token } });
      const data = await r.json();
      setZayavkaList(data.requests || []);
    } catch {}
  };
  useEffect(() => { loadZayavka(); }, [deal.id]);

  const createZayavka = async () => {
    if (!zayavkaName.trim()) { setZayavkaError("Введите название товара"); return; }
    setZayavkaLoading(true); setZayavkaError("");
    try {
      const token = localStorage.getItem("token");
      const r = await fetch("/api/procurement/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ productName: zayavkaName, quantity: zayavkaQty, paymentType: zayavkaPayment, note: zayavkaNote, dealId: deal.id })
      });
      if (!r.ok) { const e = await r.json(); setZayavkaError(e.error || "Ошибка"); return; }
      setZayavkaName(""); setZayavkaQty(1); setZayavkaNote("");
      await loadZayavka();
    } catch (e: any) { setZayavkaError(e.message); }
    setZayavkaLoading(false);
  };

  const doZayavkaAction = async (id: string, action: string) => {
    const token = localStorage.getItem("token");
    const map: Record<string, string> = {
      "confirm-payment": "confirm-payment",
      "cash-paid": "cash-paid", 
      "take-work": "take-work",
      "ready": "ready",
      "ship": "ship",
      "production-ready": "production-ready",
    };
    const endpoint = map[action];
    if (!endpoint) return;
    await fetch("/api/procurement/requests/" + id + "/" + endpoint, {
      method: "PUT",
      headers: { Authorization: "Bearer " + token }
    });
    loadZayavka();
  };

  const cancelZayavka = async (id: string, note: string) => {
    const token = localStorage.getItem("token");
    await fetch("/api/procurement/requests/" + id + "/cancel", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ note: note || "Отменена" })
    });
    loadZayavka();
  };
  const hasProduction = (linked.productionOrders || []).length > 0;
  const hasInstallation = (linked.installationTasks || []).length > 0;
  const hasService = (linked.serviceCases || []).length > 0;
  const hasLegal = (linked.legalDocuments || []).length > 0;
  const hasInvoices = (linked.invoices || []).length > 0;
  const hasPayments = (linked.payments || []).length > 0;
  const hasRent = !!linked.rentContract;
  const hasCommissions = (linked.commissions || []).length > 0;
  const hasAnyLinked = hasProduction || hasInstallation || hasService || hasLegal || hasInvoices || hasPayments || hasRent || hasCommissions;

  useEffect(() => { setEdit(editDealData); }, [editDealData]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 overflow-hidden max-h-[90vh] flex" onClick={(e) => e.stopPropagation()}>

        {/* ===== LEFT COLUMN: Deal details ===== */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-gray-100">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary-500" />
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{linked.dealNumber}</h3>
                <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", STATUS_META[linked.status]?.lightBg, STATUS_META[linked.status]?.color)}>
                  {STATUS_META[linked.status]?.label}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Status pipeline */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-medium">
                <span>Воронка сделки</span>
                <span className="text-gray-300">— нажмите на этап для перехода</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PIPELINE_STAGES.map((stage, i) => {
                  const isCurrent = linked.status === stage.key;
                  const isPast = PIPELINE_STAGES.findIndex(s => s.key === linked.status) > i;
                  const isNext = nextStatuses.includes(stage.key);
                  const isPrev = prevStatus === stage.key;
                  const canClick = isNext || isPrev;
                  
                  return (
                    <div key={stage.key} className="flex items-center gap-1.5">
                      <button
                        onClick={() => canClick && onStatusChange(stage.key)}
                        disabled={!canClick}
                        className={`relative flex flex-col items-center px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          isCurrent ? "bg-primary-600 text-white shadow-md scale-105 ring-2 ring-primary-200" :
                          isPast ? "bg-gray-200 text-gray-400" :
                          canClick ? "bg-white border-2 border-primary-300 text-primary-600 hover:bg-primary-50 hover:border-primary-400 cursor-pointer" :
                          "bg-gray-50 text-gray-400 border border-gray-100 cursor-not-allowed"
                        }`}
                        title={canClick ? (isNext ? "Перейти на этот этап" : "Вернуть на этот этап") : (isPast ? "Пройден" : "Недоступен")}
                      >
                        <span className="text-lg mb-0.5">{stage.icon}</span>
                        <span className="text-[10px] font-semibold leading-tight text-center">{stage.label}</span>
                        {isCurrent && (
                          <span className="absolute -bottom-1.5 w-2 h-2 bg-primary-600 rounded-full ring-2 ring-white" />
                        )}
                      </button>
                      {i < PIPELINE_STAGES.length - 1 && (
                        <div className={`w-4 h-0.5 ${isPast || isCurrent ? "bg-primary-300" : "bg-gray-200"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pipeline actions */}
            {!edit && linked.status !== "Deal_Closed" && linked.status !== "Lead_Created" && (
              <div className="space-y-2">
                {showCancel ? (
                  <div className="flex items-center gap-2">
                    <input value={cancelNote} onChange={e => setCancelNote(e.target.value)} placeholder="Причина отмены" className="flex-1 px-3 py-2 border border-red-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-red-200" />
                    <button onClick={async () => { try { const r = await fetch('/api/deals/' + linked.id + '/cancel', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') }, body: JSON.stringify({ note: cancelNote }) }); if (r.ok) { onClose(); } else { const e = await r.json(); alert(e.error || 'Ошибка'); } } catch {} }} className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700">Отменить сделку</button>
                    <button onClick={() => setShowCancel(false)} className="px-2 py-2 text-gray-500 text-xs">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setShowCancel(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all">
                    <AlertTriangle className="w-3 h-3" /> Отменить сделку
                  </button>
                )}
              </div>
            )}

            {/* Document generation */}
            <div className="space-y-2">
              <button
                onClick={() => setShowDocDrawer(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md"
              >
                <FileText className="w-4 h-4" />
                Составить договор
                <ChevronRight className="w-4 h-4 ml-auto" />
              </button>
            </div>

            {/* ===== Procurement Zayavka Panel ===== */}
            {!edit && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <button onClick={() => setShowZayavka(!showZayavka)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-800">
                    <Package className="w-3.5 h-3.5" />
                    Заявка на поставку
                    <span className="text-[10px] text-gray-400 font-normal">({zayavkaList.length})</span>
                    <ChevronRight className={`w-3 h-3 transition-transform ${showZayavka ? "rotate-90" : ""}`} />
                  </button>
                  {!showZayavka && (
                    <button onClick={() => setShowZayavka(true)} className="text-[10px] text-primary-600 hover:underline">Создать заявку</button>
                  )}
                </div>

                {showZayavka && (
                  <div className="space-y-2">
                    {/* Create form */}
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <input value={zayavkaName} onChange={e => setZayavkaName(e.target.value)} placeholder="Название товара" className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs outline-none focus:ring-1 focus:ring-primary-500" />
                        </div>
                        <input type="number" min={1} value={zayavkaQty} onChange={e => setZayavkaQty(Math.max(1, +e.target.value))} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs outline-none focus:ring-1 focus:ring-primary-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select value={zayavkaPayment} onChange={e => setZayavkaPayment(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs outline-none">
                          <option value="наличный">Наличный</option>
                          <option value="безналичный">Безналичный</option>
                        </select>
                        <input value={zayavkaNote} onChange={e => setZayavkaNote(e.target.value)} placeholder="Примечание" className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs outline-none" />
                      </div>
                      {zayavkaError && <p className="text-[10px] text-red-500">{zayavkaError}</p>}
                      <button onClick={createZayavka} disabled={zayavkaLoading}
                        className="w-full py-1.5 bg-primary-600 text-white rounded text-xs font-medium hover:bg-primary-700 disabled:opacity-50">
                        {zayavkaLoading ? "Создание..." : "Создать заявку"}
                      </button>
                    </div>

                    {/* Zayavka list */}
                    {zayavkaList.length > 0 ? (
                      <div className="space-y-1.5">
                        {zayavkaList.map((z: any) => {
                          const statusLabel: Record<string, string> = {
                            "new": "Новая", "payment_pending": "Ожидает оплаты", "processing": "В обработке",
                            "in_progress": "В работе", "ready_for_pickup": "Готово к отгрузке", "shipped": "Отгружено",
                            "cancelled": "Отменено", "for_production": "Под производство", "awaiting_production": "Ожидание производства"
                          };
                          const statusColor: Record<string, string> = {
                            "new": "bg-gray-100 text-gray-600", "payment_pending": "bg-amber-100 text-amber-700",
                            "processing": "bg-blue-100 text-blue-700", "in_progress": "bg-purple-100 text-purple-700",
                            "ready_for_pickup": "bg-green-100 text-green-700", "shipped": "bg-teal-100 text-teal-700",
                            "cancelled": "bg-red-100 text-red-700", "for_production": "bg-orange-100 text-orange-700",
                            "awaiting_production": "bg-yellow-100 text-yellow-700"
                          };
                          const actions: Record<string, {label: string; action: string; color: string}[]> = {
                            "payment_pending": [{label:"Оплачено",action:"confirm-payment",color:"bg-green-600 hover:bg-green-700"}],
                            "processing": [{label:"Взять в работу",action:"take-work",color:"bg-purple-600 hover:bg-purple-700"}],
                            "in_progress": [{label:"Собрано",action:"ready",color:"bg-blue-600 hover:bg-blue-700"},{label:"Наличными",action:"cash-paid",color:"bg-green-600 hover:bg-green-700"},{label:"Отгрузить",action:"ship",color:"bg-amber-600 hover:bg-amber-700"}],
                            "ready_for_pickup": [{label:"Наличными",action:"cash-paid",color:"bg-green-600 hover:bg-green-700"},{label:"Отгрузить",action:"ship",color:"bg-amber-600 hover:bg-amber-700"}],
                            "for_production": [{label:"Произведено",action:"production-ready",color:"bg-orange-600 hover:bg-orange-700"}],
                            "awaiting_production": [{label:"Произведено",action:"production-ready",color:"bg-orange-600 hover:bg-orange-700"}],
                          };
                          const canCancel = ["new","payment_pending","processing","for_production","awaiting_production"].includes(z.status);
                          return (
                            <div key={z.id} className="bg-white border border-gray-100 rounded-lg p-2.5 space-y-1.5 hover:border-gray-200 transition-colors">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-800">{z.productName}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor[z.status] || "bg-gray-100 text-gray-500"}`}>
                                  {statusLabel[z.status] || z.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                                <span>{z.quantity} шт.</span>
                                <span>Оплата: {z.paymentType === "наличный" ? "нал" : z.paymentType === "безналичный" ? "безнал" : "—"}</span>
                                {z.reserved && <span className="text-green-500">Зарезервировано</span>}
                              </div>
                              {/* Pipeline stages mini bar */}
                              {!["cancelled","shipped"].includes(z.status) && (
                                <div className="flex items-center gap-0.5">
                                  {["Ожидает оплаты","В обработке","В работе","Готово","Отгружено"].map((s,i) => {
                                    const keys = ["payment_pending","processing","in_progress","ready_for_pickup","shipped"];
                                    const zi = keys.indexOf(z.status);
                                    return (
                                      <React.Fragment key={s}>
                                        {i > 0 && <div className={`flex-1 h-0.5 rounded ${i <= zi ? "bg-green-400" : "bg-gray-200"}`} />}
                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${i < zi ? "bg-green-100 text-green-600" : i === zi ? "bg-primary-100 text-primary-600 ring-1 ring-primary-300" : "bg-gray-100 text-gray-300"}`}>
                                          {i + 1}
                                        </div>
                                      </React.Fragment>
                                    );
                                  })}
                                </div>
                              )}
                              {/* Action buttons */}
                              {actions[z.status] && actions[z.status].length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {actions[z.status].map(a => (
                                    <button key={a.action} onClick={() => doZayavkaAction(z.id, a.action)}
                                      className={`px-2 py-1 text-[10px] font-medium text-white rounded transition-all ${a.color}`}>
                                      {a.label}
                                    </button>
                                  ))}
                                  {canCancel && (
                                    <button onClick={() => cancelZayavka(z.id, "Отменена из сделки")}
                                      className="px-2 py-1 text-[10px] font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 transition-all">
                                      Отменить
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-400 text-center py-2">Нет заявок. Создайте первую заявку на поставку.</p>
                    )}
                  </div>
                )}
              </div>
            )}

{/* Deal info cards */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-50 rounded-lg p-2.5"><span className="text-gray-400">Сумма</span><p className="font-semibold text-gray-800">{(linked.expectedAmount || 0).toLocaleString()} ₽</p></div>
              <div className="bg-gray-50 rounded-lg p-2.5"><span className="text-gray-400">Клиент</span><p className="font-semibold text-gray-800 truncate">{client?.name || "—"}</p></div>
              <div className="bg-gray-50 rounded-lg p-2.5"><span className="text-gray-400">Тип</span><p className="font-semibold text-gray-800">{linked.dealType}</p></div>
              <div className="bg-gray-50 rounded-lg p-2.5"><span className="text-gray-400">Оплата</span><p className="font-semibold text-gray-800">{linked.paymentType || "—"}</p></div>
              <div className="bg-gray-50 rounded-lg p-2.5"><span className="text-gray-400">Менеджер</span><p className="font-semibold text-gray-800 truncate">{agent || "—"}</p></div>
            </div>

            {edit ? (
              <div className="space-y-3">
                <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Номер сделки</label>
                  <input value={edit.dealNumber || ""} onChange={(e) => setEdit({ ...edit, dealNumber: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" /></div>
                <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Клиент</label>
                  <select value={edit.clientId || ""} onChange={(e) => { const c = clients?.find((x: any) => x.id === e.target.value); setEdit({ ...edit, clientId: e.target.value, clientInn: c?.inn || "" }); setValidationError(null); }} className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 ${validationError === "clientId" ? "border-red-400 ring-2 ring-red-200" : "border-gray-300 focus:ring-primary-500/20"}`}>
                    <option value="">Выберите клиента</option>{clients?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                {validationError === "clientId" && <p className="text-red-500 text-xs mt-1">Клиент обязателен для сделки</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Тип</label>
                    <select value={edit.dealType || "Sale"} onChange={(e) => setEdit({ ...edit, dealType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20"><option value="Sale">Продажа</option><option value="ProjectSale">Проект</option><option value="Rent">Аренда</option></select></div>
                  <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Оплата</label>
                    <select value={edit.paymentType || ""} onChange={(e) => setEdit({ ...edit, paymentType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20"><option value="">Не указан</option><option value="безналичный">Безналичный</option><option value="наличный">Наличный</option></select></div>
                  <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Сумма</label>
                    <input type="number" value={edit.expectedAmount || 0} onChange={(e) => setEdit({ ...edit, expectedAmount: +e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" /></div>
                </div>
                <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Агент</label>
                  <select value={edit.responsibleAgentId || ""} onChange={(e) => setEdit({ ...edit, responsibleAgentId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20"><option value="">Не назначен</option>{users?.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}</select></div>
                <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">ИНН клиента</label>
                  <input value={edit.clientInn || ""} onChange={(e) => setEdit({ ...edit, clientInn: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" /></div>
                <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Описание</label>
                  <textarea value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 resize-none" rows={2} /></div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => onSaveEdit({ ...edit, clientId: edit.clientId || undefined })} disabled={isPending}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50"><Save className="w-3.5 h-3.5" />{isPending ? "Сохранение..." : "Сохранить"}</button>
                  <button onClick={onCancelEdit} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Отмена</button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-400 uppercase mb-0.5">Сумма</label>
                    <p className="text-sm font-semibold text-gray-900">{linked.expectedAmount?.toLocaleString() || 0} ₽</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-400 uppercase mb-0.5">Тип</label>
                    <p className="text-sm text-gray-700">{linked.dealType || "Не указан"}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-gray-700 font-medium">{client?.name || "Клиент не указан"}</span>
                  </div>
                  {client?.inn && <div className="flex items-center gap-2 text-sm"><CreditCard className="w-4 h-4 text-gray-400 shrink-0" /><span className="text-gray-600">ИНН {client.inn}</span></div>}
                  {client?.phone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-gray-400 shrink-0" /><span className="text-gray-600">{client.phone}</span></div>}
                  {client?.email && <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-gray-400 shrink-0" /><span className="text-gray-600">{client.email}</span></div>}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400 shrink-0" />
                  {linked.responsibleAgentId ? (
              <button onClick={() => setViewAgentId(linked.responsibleAgentId)} className="text-gray-600 hover:text-primary-600 hover:underline transition-colors">{agent || "Агент не назначен"}</button>
            ) : (
              <span className="text-gray-600">{agent || "Агент не назначен"}</span>
            )}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-600">Создана: {fmtDate(linked.createdAt)}</span>
                </div>

                {linked.description && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase mb-1">Описание</p>
                    <p className="text-sm text-gray-700">{linked.description}</p>
                  </div>
                )}

                {hasAnyLinked && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Связанные данные</p>
                    <div className="grid grid-cols-2 gap-2">
                      {hasProduction && (
                        <button onClick={() => { onClose(); navigate("/production#" + encodeURIComponent(linked.dealNumber)); }}
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-200 transition-colors">
                            <Briefcase className="w-3.5 h-3.5 text-amber-600" /></div>
                          <div className="min-w-0"><p className="text-xs font-medium text-gray-900">Производство</p><p className="text-[10px] text-gray-400">{(linked.productionOrders || []).length} заказов</p></div>
                          <ArrowRight className="w-3 h-3 text-gray-300 ml-auto shrink-0" />
                        </button>
                      )}
                      {hasInstallation && (
                        <button onClick={() => { onClose(); navigate("/installation#" + encodeURIComponent(linked.dealNumber)); }}
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                            <Briefcase className="w-3.5 h-3.5 text-blue-600" /></div>
                          <div className="min-w-0"><p className="text-xs font-medium text-gray-900">Монтаж</p><p className="text-[10px] text-gray-400">{(linked.installationTasks || []).length} задач</p></div>
                          <ArrowRight className="w-3 h-3 text-gray-300 ml-auto shrink-0" />
                        </button>
                      )}
                      {hasService && (
                        <button onClick={() => { onClose(); navigate("/service"); }}
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group">
                          <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center shrink-0 group-hover:bg-green-200 transition-colors">
                            <Briefcase className="w-3.5 h-3.5 text-green-600" /></div>
                          <div className="min-w-0"><p className="text-xs font-medium text-gray-900">Сервис</p><p className="text-[10px] text-gray-400">{(linked.serviceCases || []).length} обращений</p></div>
                          <ArrowRight className="w-3 h-3 text-gray-300 ml-auto shrink-0" />
                        </button>
                      )}
                      {hasLegal && (
                        <button onClick={() => { onClose(); navigate("/legal"); }}
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group">
                          <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 group-hover:bg-purple-200 transition-colors">
                            <Briefcase className="w-3.5 h-3.5 text-purple-600" /></div>
                          <div className="min-w-0"><p className="text-xs font-medium text-gray-900">Документы</p><p className="text-[10px] text-gray-400">{(linked.legalDocuments || []).length} док.</p></div>
                          <ArrowRight className="w-3 h-3 text-gray-300 ml-auto shrink-0" />
                        </button>
                      )}
                      {hasRent && (
                        <button onClick={() => { onClose(); navigate("/rent"); }}
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group">
                          <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center shrink-0 group-hover:bg-teal-200 transition-colors">
                            <DollarSign className="w-3.5 h-3.5 text-teal-600" /></div>
                          <div className="min-w-0"><p className="text-xs font-medium text-gray-900">Аренда</p><p className="text-[10px] text-gray-400">Договор</p></div>
                          <ArrowRight className="w-3 h-3 text-gray-300 ml-auto shrink-0" />
                        </button>
                      )}
                      {hasCommissions && (
                        <button className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group">
                          <div className="w-7 h-7 rounded-lg bg-pink-100 flex items-center justify-center shrink-0 group-hover:bg-pink-200 transition-colors">
                            <DollarSign className="w-3.5 h-3.5 text-pink-600" /></div>
                          <div className="min-w-0"><p className="text-xs font-medium text-gray-900">Комиссии</p><p className="text-[10px] text-gray-400">{(linked.commissions || []).length} записей</p></div>
                        </button>
                      )}
                      {hasInvoices && (
                        <button className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group">
                          <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 group-hover:bg-orange-200 transition-colors">
                            <DollarSign className="w-3.5 h-3.5 text-orange-600" /></div>
                          <div className="min-w-0"><p className="text-xs font-medium text-gray-900">Счета</p><p className="text-[10px] text-gray-400">{(linked.invoices || []).length} шт.</p></div>
                        </button>
                      )}
                      {hasPayments && (
                        <button className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" /></div>
                          <div className="min-w-0"><p className="text-xs font-medium text-gray-900">Платежи</p><p className="text-[10px] text-gray-400">{(linked.payments || []).length} шт.</p></div>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Edit/Delete bar */}
          {!edit && (
            <div className="flex items-center gap-2 px-5 py-2.5 border-t border-gray-100 bg-gray-50/50 shrink-0">
              <button onClick={onEdit} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors">
                <Edit3 className="w-3.5 h-3.5" />Редактировать</button>
              {confirmDelete ? (
                <>
                  <span className="text-xs text-red-600 font-medium">Удалить сделку?</span>
                  <button onClick={onDelete} disabled={isPending}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors">{isPending ? "Удаление..." : "Да, удалить"}</button>
                  <button onClick={onCancelDelete} className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-300 transition-colors">Нет</button>
                </>
              ) : (
                <button onClick={onDelete} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />Удалить</button>
              )}
              <div className="flex-1" />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 shrink-0">
            <div className="flex-1" />
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Закрыть</button>
          </div>
        </div>

        {/* ===== RIGHT COLUMN: Chat discussion ===== */}
        <div className="w-[380px] flex flex-col shrink-0 bg-gray-50/20">
          <DealChatPanel dealId={deal.id} dealNumber={linked.dealNumber} />
        </div>
      </div>

      {/* Document Templates Drawer */}
      {showDocDrawer && (
        <div className="fixed inset-0 z-[60]" onClick={() => setShowDocDrawer(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute right-0 top-0 bottom-0 w-[420px] bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Составить договор</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Выберите шаблон для автозаполнения</p>
              </div>
              <button onClick={() => setShowDocDrawer(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* HTML Templates */}
              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">HTML — автозаполнение</h4>
                <div className="space-y-1.5">
                  {[
                    { key: "kp", label: "Коммерческое предложение (КП)", desc: "Основной КП с таблицей товаров", color: "blue" },
                    { key: "dogovor", label: "Договор поставки", desc: "Договор с автоподстановкой данных", color: "purple" },
                    { key: "schet", label: "Счёт на оплату", desc: "Платёжный документ", color: "green" },
                    { key: "commercial_offer", label: "КП (расширенное)", desc: "Детальное предложение", color: "orange" },
                    { key: "1_спецификация", label: "Спецификация", desc: "Перечень товаров и услуг", color: "teal" },
                    { key: "10_журнал", label: "Журнал", desc: "Журнал учёта", color: "cyan" },
                    { key: "2_-_акт_осмотра_кровли", label: "Акт осмотра кровли", desc: "Технический акт", color: "amber" },
                    { key: "2_схема_установки", label: "Схема установки", desc: "Монтажная схема", color: "indigo" },
                  ].map(t => {
                    const colors: Record<string, string> = { blue: "border-l-blue-400 bg-blue-50/50", purple: "border-l-purple-400 bg-purple-50/50", green: "border-l-green-400 bg-green-50/50", orange: "border-l-orange-400 bg-orange-50/50", teal: "border-l-teal-400 bg-teal-50/50", cyan: "border-l-cyan-400 bg-cyan-50/50", amber: "border-l-amber-400 bg-amber-50/50", indigo: "border-l-indigo-400 bg-indigo-50/50" };
                    return (
                      <button key={t.key} onClick={() => { setShowDocDrawer(false); setDocPreview({template: t.key, label: t.label}); }}
                        className={`w-full text-left px-4 py-3 rounded-xl border border-gray-100 border-l-4 ${colors[t.color] || ""} hover:shadow-sm hover:border-gray-200 transition-all flex items-center gap-3`}>
                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{t.label}</p>
                          <p className="text-[10px] text-gray-400">{t.desc}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 ml-auto shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DOCX Templates */}
              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">DOCX — скачать и заполнить</h4>
                <div className="space-y-1.5">
                  {[
                    { key: "docx://templates/1_1docx_0.docx", label: "Спецификация" },
                    { key: "docx://templates/1_1docx_1.docx", label: "Договор" },
                    { key: "docx://templates/2___2docx_3.docx", label: "Договор (вар 2)" },
                    { key: "docx://templates/3___3docx_6.docx", label: "Договор-перевозка" },
                    { key: "docx://templates/2_2docx_4.docx", label: "Договор (вар 3)" },
                    { key: "docx://templates/2__22docx_5.docx", label: "Договор (вар 4)" },
                    { key: "docx://templates/3_3docx_7.docx", label: "Договор (вар 5)" },
                    { key: "docx://templates/4_4docx_8.docx", label: "Документ 8" },
                    { key: "docx://templates/4_4docx_9.docx", label: "Документ 9" },
                    { key: "docx://templates/4__41docx_10.docx", label: "Документ 10" },
                    { key: "docx://templates/5_5docx_11.docx", label: "Документ 11" },
                    { key: "docx://templates/6_6docx_12.docx", label: "Документ 12" },
                    { key: "docx://templates/6__61docx_13.docx", label: "Документ 13" },
                    { key: "docx://templates/7_7docx_14.docx", label: "Документ 14" },
                    { key: "docx://templates/8_8docx_15.docx", label: "Документ 15" },
                    { key: "docx://templates/9_9docx_16.docx", label: "Документ 16" },
                    { key: "docx://templates/10_10docx_2.docx", label: "Договор (вар 6)" },
                    { key: "docx://templates/t17_docx_17.docx", label: "Договор (основной)" },
                    { key: "docx://templates/t18_docx_18.docx", label: "Договор (вар 7)" },
                  ].map(t => (
                    <button key={t.key} onClick={() => { window.open("/" + t.key.replace("docx://", ""), "_blank"); }}
                      className="w-full text-left px-4 py-3 rounded-xl border border-gray-100 hover:shadow-sm hover:border-gray-200 transition-all flex items-center gap-3">
                      <Download className="w-4 h-4 text-gray-400 shrink-0" />
                      <p className="text-sm font-medium text-gray-800">{t.label}</p>
                      <FileDown className="w-3.5 h-3.5 text-gray-300 ml-auto shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Legal section link */}
              <button onClick={() => { setShowDocDrawer(false); onClose(); navigate("/legal"); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors">
                <Shield className="w-4 h-4" />Все договоры в реестре
              </button>
            </div>
          </div>
        </div>
      )}

      {docPreview && (
        <DocumentFormModal
          dealId={linked.id}
          template={docPreview.template}
          label={docPreview.label}
          clientName={linked.client?.name || client || ""}
          clientInn={linked.client?.inn || linked.clientInn || ""}
          clientPhone={linked.client?.phone || ""}
          clientEmail={linked.client?.email || ""}
          dealNumber={linked.dealNumber}
          amount={linked.expectedAmount || 0}
          onClose={() => setDocPreview(null)}
        />
      )}
    </div>
  );
}
