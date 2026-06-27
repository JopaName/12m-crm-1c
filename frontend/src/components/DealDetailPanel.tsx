import React, { useEffect, useNavigate, useState } from "react";;
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { dealsAPI, dealItemsAPI } from "../api";
import { cn } from "./cn";
import DocumentFormModal from "./DocumentFormModal";
import { Briefcase, X, ArrowLeft, ArrowRight, FileText, Shield, Edit3, Trash2, Save, Building2, Calendar, DollarSign, User, Phone, Mail, CreditCard } from "lucide-react";
import { STATUS_META } from "../constants/deals";

const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("ru-RU") : "";
import { Briefcase, X, ArrowLeft, ArrowRight, FileText, Shield, Edit3, Trash2, Save, Eye } from "lucide-react";
import DealProgress from "./DealProgress";
import DealChatPanel from "./DealChatPanel";

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
  const navigate = useNavigate();

  const { data: fullDeal } = useQuery({
    queryKey: ["deal-detail", deal.id],
    queryFn: () => dealsAPI.getById(deal.id).then((r) => r.data),
    enabled: !!deal.id,
  });

  const linked = fullDeal || deal;
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
            {/* Status movement */}
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl shrink-0">
              {prevStatus && (
                <button onClick={() => onStatusChange(prevStatus)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                  <ArrowLeft className="w-3 h-3" />{STATUS_META[prevStatus]?.label}
                </button>
              )}
              <div className="flex-1" />
              {nextStatuses.length > 0 && (
                <button onClick={() => onStatusChange(nextStatuses[0])} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  {STATUS_META[nextStatuses[0]]?.label}<ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Document generation */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 uppercase font-medium">Документы:</span>
                <span className="text-[10px] text-gray-300">клик для автозаполнения</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: "kp", label: "Коммерческое предложение (КП)", color: "blue" },
                  { key: "dogovor", label: "Договор поставки", color: "purple" },
                  { key: "schet", label: "Счёт на оплату", color: "green" },
                  { key: "commercial_offer", label: "КП (расширенное)", color: "orange" },
                  { key: "1_спецификация", label: "Спецификация", color: "teal" },
                  { key: "10_журнал", label: "Журнал", color: "cyan" },
                  { key: "2_-_акт_осмотра_кровли", label: "Акт осмотра кровли", color: "amber" },
                  { key: "2_схема_установки", label: "Схема установки", color: "indigo" },
                ].map(t => {
                  const colorMap: Record<string, string> = { blue: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100", purple: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100", green: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100", orange: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100", teal: "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100", cyan: "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100", amber: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100", indigo: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" };
                  return (
                    <button key={t.key} onClick={() => setDocPreview({template: t.key, label: t.label})}
                      className={"flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors " + (colorMap[t.color] || colorMap.blue)}>
                      <FileText className="w-3.5 h-3.5" />{t.label}
                    </button>
                  );
                })}
                <button onClick={() => { onClose(); navigate("/legal"); }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors ml-auto">
                  <Shield className="w-3.5 h-3.5" />Все договоры
                </button>
              </div>
            </div>

            {/* Deal info cards */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-50 rounded-lg p-2.5"><span className="text-gray-400">Сумма</span><p className="font-semibold text-gray-800">{(linked.expectedAmount || 0).toLocaleString()} ₽</p></div>
              <div className="bg-gray-50 rounded-lg p-2.5"><span className="text-gray-400">Клиент</span><p className="font-semibold text-gray-800 truncate">{client?.name || "—"}</p></div>
              <div className="bg-gray-50 rounded-lg p-2.5"><span className="text-gray-400">Тип</span><p className="font-semibold text-gray-800">{linked.dealType}</p></div>
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
                  <span className="text-gray-600">{agent || "Агент не назначен"}</span>
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
