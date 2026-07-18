import FilePreviewModal from "./FilePreviewModal";
import React, { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { dealsAPI, dealItemsAPI, procurementAPI, auditAPI, tasksAPI, dealActionsAPI } from "../api";
import { cn } from "./cn";
import toast from "react-hot-toast";
import DocumentFormModal from "./DocumentFormModal";
import { Briefcase, X, ArrowLeft, ArrowRight, FileText, Shield, Edit3, Trash2, Paperclip, Upload, Save, Building2, Calendar, DollarSign, User, Phone, Mail, CreditCard, FileDown, ChevronRight, Download, Eye, Banknote, Wallet, Package, ShoppingCart, Clock, Plus } from "lucide-react";
import { STATUS_META } from "../constants/deals";


const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("ru-RU") : "";
import DealProgress from "./DealProgress";
import DealChatPanel from "./DealChatPanel";
import ProfileModal from "./ProfileModal";
import { ActionsWorkflow } from "./ActionsWorkflow";

export default function DealDetailPanel({ deal, agent, canEdit, canDelete, editDealData, confirmDelete, onClose, onEdit, onSaveEdit, onDelete, onCancelEdit, onCancelDelete, isPending, nextStatuses, prevStatus, onStatusChange, users }: {
  deal: any; agent: string; canEdit: boolean; canDelete: boolean;
  editDealData: any; confirmDelete: boolean;
  onClose: () => void; onEdit: () => void;
  onSaveEdit: (d: any) => void; onDelete: () => void;
  onCancelEdit: () => void; onCancelDelete: () => void;
  isPending: boolean;
  nextStatuses: string[]; prevStatus: string | null;
  onStatusChange: (s: string) => void;
  users?: any[];
}) {
  const [edit, setEdit] = useState(editDealData || null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [docPreview, setDocPreview] = useState<{template: string; label: string} | null>(null);
  const [showDocDrawer, setShowDocDrawer] = useState(false);
  const [viewAgentId, setViewAgentId] = useState<string | null>(null);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [currentOrder, setCurrentOrder] = useState<any | null>(null);
  const [newOrderNote, setNewOrderNote] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState<number | "">("");
  const [whItems, setWhItems] = useState<any[]>([]);
  const [newWhItemId, setNewWhItemId] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemQty, setEditItemQty] = useState(1);
  const [editItemPrice, setEditItemPrice] = useState<number | "">("");
  const [checklistData, setChecklistData] = useState<Record<string, any>>({});
  const [filesOpen, setFilesOpen] = useState(false);
  const [dealFiles, setDealFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: fullDeal } = useQuery({
    queryKey: ["deal-detail", deal.id],
    queryFn: () => dealsAPI.getById(deal.id).then((r) => r.data),
    enabled: !!deal.id,
  });

  const linked = fullDeal || deal;


  const { data: auditLogs } = useQuery({
    queryKey: ["deal-audit", deal.id],
    queryFn: () => auditAPI.getByEntity("Deal", deal.id).then((r) => r.data),
    enabled: !!deal.id,
  });

  const _token = () => localStorage.getItem("token") || "";
  const _fetch = async (method: string, url: string, body?: any) => {
    const opts: any = { method, headers: { "Content-Type": "application/json", Authorization: "Bearer " + _token() } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(url, opts);
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw { response: { data: e } }; }
    return r.json();
  };

  // Load orders for this deal
  const loadOrders = async () => {
    try {
      const data = await _fetch("GET", "/api/orders/deal/" + deal.id);
      setOrdersList(Array.isArray(data) ? data : []);
    } catch {}
  };
  useEffect(() => { loadOrders(); }, [deal.id]);
  const loadWhItems = useCallback(async () => { const token = localStorage.getItem("token"); try { const r = await fetch("/api/warehouse/stock-items", { headers: { Authorization: "Bearer " + token } }); const items = await r.json(); setWhItems(Array.isArray(items) ? items : []); } catch {}; }, []);
  useEffect(() => { loadWhItems(); }, [ordersOpen, orderModalOpen]);

  const createOrder = async () => {
    setOrdersLoading(true); setOrdersError("");
    try {
      const order = await _fetch("POST", "/api/orders", { dealId: deal.id, note: newOrderNote || undefined });
      setNewOrderNote("");
      await loadOrders();
      setCurrentOrder(order);
    } catch (e: any) { setOrdersError(e?.response?.data?.error || "Ошибка создания"); }
    setOrdersLoading(false);
  };

  const addOrderItem = async (orderId: string) => {
    const selected = whItems.find((i: any) => i.id === newWhItemId);
    const pName = selected ? selected.productName + " (" + selected.unit + ")" : newItemName.trim();
    if (!newWhItemId && !newItemName.trim()) return;
    setOrdersError("");
    try {
      await _fetch("POST", "/api/orders/" + orderId + "/items", {
        productName: newWhItemId ? pName : newItemName.trim(),
        quantity: newItemQty,
        price: newItemPrice === "" ? undefined : (selected ? (selected.salePrice || undefined) : undefined),
        note: newItemName.trim() || undefined,
        warehouseItemId: newWhItemId || undefined,
      });
      setNewWhItemId(""); setNewItemName(""); setNewItemQty(1); setNewItemPrice("");
      await loadOrders();
      const updated = await _fetch("GET", "/api/orders/" + orderId);
      setCurrentOrder(updated);
    } catch (e: any) { const msg = e?.response?.data?.error || "Ошибка добавления"; setOrdersError(msg); toast.error(msg); }
  };

  const removeOrderItem = async (orderId: string, itemId: string) => {
    try {
      await _fetch("DELETE", "/api/orders/items/" + itemId);
      await loadOrders();
      const updated = await _fetch("GET", "/api/orders/" + orderId);
      setCurrentOrder(updated);
    } catch {}
  };

  const startEditItem = (item: any) => {
    setEditingItemId(item.id);
    setEditItemName(item.productName);
    setEditItemQty(item.quantity);
    setEditItemPrice(item.price ?? "");
  };

  const saveEditItem = async () => {
    if (!editingItemId) return;
    try {
      await _fetch("PUT", "/api/orders/items/" + editingItemId, {
        productName: editItemName,
        quantity: editItemQty,
        price: editItemPrice === "" ? undefined : editItemPrice,
      });
      setEditingItemId(null);
      await loadOrders();
      if (currentOrder) {
        const updated = await _fetch("GET", "/api/orders/" + currentOrder.id);
        setCurrentOrder(updated);
      }
    } catch {}
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await _fetch("PUT", "/api/orders/" + orderId, { status });
      await loadOrders();
      const updated = await _fetch("GET", "/api/orders/" + orderId);
      setCurrentOrder(updated);
    } catch {}
  };

  const deleteOrder = async (orderId: string) => {
    try {
      await _fetch("DELETE", "/api/orders/" + orderId);
      if (currentOrder?.id === orderId) setCurrentOrder(null);
      loadOrders();
    } catch {}
  };

  const toggleChecklist = async (order: any) => {
    try {
      let cl = checklistData[order.id];
      if (!cl) {
        cl = await _fetch("POST", "/api/orders/" + order.id + "/checklist");
        setChecklistData((prev: any) => ({ ...prev, [order.id]: cl }));
      } else {
        setChecklistData((prev: any) => ({ ...prev, [order.id]: undefined }));
      }
    } catch (e: any) { setOrdersError(e?.response?.data?.error || "Ошибка"); }
  };

  const toggleChecklistItem = async (itemId: string, checked: boolean) => {
    try {
      await _fetch("PUT", "/api/orders/checklist/items/" + itemId, { checked });
      // Refresh checklist for current order
      if (currentOrder) {
        const cl = await _fetch("GET", "/api/orders/" + currentOrder.id + "/checklist");
        if (cl) setChecklistData((prev: any) => ({ ...prev, [currentOrder.id]: cl }));
      }
    } catch {}
  };

  const completeChecklist = async (checklistId: string) => {
    try {
      await _fetch("PUT", "/api/orders/checklist/" + checklistId, { status: "completed", completedAt: new Date().toISOString() });
      if (currentOrder) {
        const cl = await _fetch("GET", "/api/orders/" + currentOrder.id + "/checklist");
        if (cl) setChecklistData((prev: any) => ({ ...prev, [currentOrder.id]: cl }));
      }
    } catch {}
  };

  const loadFiles = async () => {
    setFilesLoading(true);
    try {
      const data = await _fetch("GET", "/api/deals/" + deal.id + "/files");
      setDealFiles(Array.isArray(data?.files) ? data.files : Array.isArray(data) ? data : []);
    } catch {}
    setFilesLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      try {
        const fd = new FormData();
        fd.append("file", files[i]);
        const token = _token();
        const r = await fetch("/api/deals/" + deal.id + "/files", { method: "POST", headers: { Authorization: "Bearer " + token }, body: fd });
        if (r.ok) toast.success("Файл загружен: " + files[i].name);
        else { const err = await r.json().catch(() => ({})); toast.error(err.error || "Ошибка загрузки"); }
      } catch { toast.error("Ошибка загрузки: " + files[i].name); }
    }
    e.target.value = "";
    loadFiles();
  };

  const deleteFile = async (fileId: string) => {
    try {
      await _fetch("DELETE", "/api/deals/" + deal.id + "/files/" + fileId);
      toast.success("Файл удалён");
      loadFiles();
    } catch {}
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (!e.dataTransfer.files.length) return;
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
      try {
        const fd = new FormData();
        fd.append("file", e.dataTransfer.files[i]);
        const token = _token();
        const r = await fetch("/api/deals/" + deal.id + "/files", { method: "POST", headers: { Authorization: "Bearer " + token }, body: fd });
        if (r.ok) toast.success("Файл загружен: " + e.dataTransfer.files[i].name);
      } catch {}
    }
    loadFiles();
  };

  const fmtSize = (b: number) => b < 1024 ? b + " B" : b < 1024*1024 ? (b/1024).toFixed(1) + " KB" : (b/1024/1024).toFixed(1) + " MB";
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
          <div className="relative bg-gradient-to-br from-primary-600 to-primary-800 px-5 py-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">{linked.dealNumber}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", STATUS_META[linked.status]?.lightBg, STATUS_META[linked.status]?.color)}>
                      {STATUS_META[linked.status]?.label}
                    </span>
                    {linked.clientName && <span className="text-[10px] text-white/70">{linked.clientName}</span>}
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

            {/* ===== ZONE 1: Deal Information ===== */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-primary-500 rounded-full" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Информация о сделке</h3>
              </div>
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

            {/* ===== Orders / Заявки Panel ===== */}
            {!edit && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setOrdersOpen(!ordersOpen)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-800"
                  >
                    <Package className="w-3.5 h-3.5" />
                    Заявки на товары
                    <span className="text-[10px] text-gray-400 font-normal">({ordersList.length})</span>
                    <ChevronRight className={`w-3 h-3 transition-transform ${ordersOpen ? "rotate-90" : ""}`} />
                  </button>
                  {!ordersOpen && (
                    <button onClick={() => { setCurrentOrder(null); setOrdersError(""); loadOrders(); setOrderModalOpen(true); }} className="text-[10px] text-primary-600 hover:underline">Создать заявку</button>
                  )}
                </div>

                {ordersOpen && (
                  <div className="space-y-2">

                    {/* Orders list */}
                    {ordersList.length > 0 ? (
                      <div className="space-y-1.5">
                        {ordersList.map((o: any) => (
                          <div key={o.id}>
                            {currentOrder?.id === o.id ? (
                              /* Expanded order detail */
                              <div className="bg-white border border-primary-200 rounded-lg p-2.5 space-y-2">
                                {/* Order header */}
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-xs font-semibold text-gray-800">{o.orderNumber}</span>
                                    <span className="ml-2 text-[10px] text-gray-400">{o.items?.length || 0} поз.</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                      o.status === "draft" ? "bg-gray-100 text-gray-600" :
                                      o.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                                      o.status === "assembly" ? "bg-amber-100 text-amber-700" :
                                      o.status === "ready" ? "bg-purple-100 text-purple-700" :
                                      o.status === "shipped" ? "bg-emerald-100 text-emerald-700" :
                                      "bg-gray-100 text-gray-500"
                                    }`}>
                                      {o.status === "draft" ? "Черновик" :
                                       o.status === "confirmed" ? "Подтверждён" :
                                       o.status === "assembly" ? "В сборке" :
                                       o.status === "ready" ? "Готов к отгрузке" :
                                       o.status === "shipped" ? "Отгружено" : o.status}
                                    </span>
                                    <button onClick={() => { setCurrentOrder(null); loadOrders(); }} className="text-[10px] text-gray-400 hover:text-gray-600 p-0.5">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Status controls */}
                                <div className="flex flex-wrap gap-1">
                                  {o.status === "draft" && (
                                    <button onClick={() => updateOrderStatus(o.id, "confirmed")}
                                      className="px-2 py-1 text-[10px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded">Подтвердить</button>
                                  )}
                                  {o.status === "confirmed" && (
                                    <button onClick={() => updateOrderStatus(o.id, "assembly")}
                                      className="px-2 py-1 text-[10px] font-medium text-white bg-amber-600 hover:bg-amber-700 rounded">Начать сборку</button>
                                  )}
                                  {o.status === "assembly" && (
                                    <button onClick={() => updateOrderStatus(o.id, "ready")}
                                      className="px-2 py-1 text-[10px] font-medium text-white bg-purple-600 hover:bg-purple-700 rounded">Готов к отгрузке</button>
                                  )}
                                  {o.status === "ready" && (
                                    <button onClick={() => updateOrderStatus(o.id, "shipped")}
                                      className="px-2 py-1 text-[10px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded">Отгрузить</button>
                                  )}
                                  {o.status !== "shipped" && o.status !== "draft" && (
                                    <button onClick={() => updateOrderStatus(o.id, "draft")}
                                      className="px-2 py-1 text-[10px] font-medium text-gray-500 border border-gray-200 rounded hover:bg-gray-50">В черновик</button>
                                  )}
                                  <button onClick={() => { if (confirm("Удалить заявку?")) deleteOrder(o.id); }}
                                    className="px-2 py-1 text-[10px] font-medium text-red-500 border border-red-200 rounded hover:bg-red-50">Удалить</button>
                                </div>

                                {/* Items table */}
                                <div className="space-y-1">
                                  {(o.items || []).map((item: any, idx: number) => (
                                    <div key={item.id} className="flex items-center gap-1.5 text-[11px]">
                                      <span className="text-gray-400 w-4">{idx + 1}.</span>
                                      {editingItemId === item.id ? (
                                        <>
                                          <input value={editItemName} onChange={e => setEditItemName(e.target.value)}
                                            className="flex-1 px-1.5 py-0.5 border border-gray-200 rounded text-[11px] outline-none" />
                                          <input type="number" value={editItemQty} onChange={e => setEditItemQty(Math.max(1, +e.target.value))}
                                            className="w-14 px-1.5 py-0.5 border border-gray-200 rounded text-[11px] outline-none text-center" />
                                          <input type="number" value={editItemPrice} onChange={e => setEditItemPrice(+e.target.value)}
                                            className="w-20 px-1.5 py-0.5 border border-gray-200 rounded text-[11px] outline-none text-center" />
                                          <button onClick={saveEditItem} className="text-green-600 hover:text-green-700 p-0.5"><Save className="w-3 h-3" /></button>
                                          <button onClick={() => setEditingItemId(null)} className="text-gray-400 hover:text-gray-600 p-0.5"><X className="w-3 h-3" /></button>
                                        </>
                                      ) : (
                                        <>
                                          <span className="flex-1 text-gray-800">{item.productName}</span>
                                          <span className="text-gray-500 w-12 text-right">{item.quantity} шт.</span>
                                          <span className="text-gray-500 w-20 text-right">{item.price ? item.price.toLocaleString() + " ₽" : "—"}</span>
                                          <span className="text-gray-700 w-20 text-right font-medium">{item.total ? item.total.toLocaleString() + " ₽" : (item.price ? (item.price * item.quantity).toLocaleString() + " ₽" : "—")}</span>
                                          <button onClick={() => startEditItem(item)} className="text-blue-500 hover:text-blue-700 p-0.5"><Edit3 className="w-3 h-3" /></button>
                                          <button onClick={() => { removeOrderItem(o.id, item.id); }} className="text-red-400 hover:text-red-600 p-0.5"><X className="w-3 h-3" /></button>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {/* Add item form */}
                                <div className="flex items-center gap-1.5">
                                  <select value={newWhItemId} onChange={e => { setNewWhItemId(e.target.value); const sel = whItems.find((w: any) => w.id === e.target.value); if (sel) { setNewItemPrice(sel.salePrice || ""); setNewItemName(""); } }}
                                    className="px-2 py-1 border border-gray-200 rounded text-[11px] outline-none focus:ring-1 focus:ring-primary-500" style={{minWidth:'130px'}}>
                                    <option value="">Товар со склада</option>
                                    {whItems.map((w: any) => (
                                      <option key={w.id} value={w.id}>{w.productName} ({w.quantity} {w.unit})</option>
                                    ))}
                                  </select>
                                  <input type="number" min={1} value={newItemQty} onChange={e => setNewItemQty(Math.max(1, +e.target.value))}
                                    className="w-16 px-2 py-1 border border-gray-200 rounded text-[11px] outline-none text-center" />
                                  <input type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value === "" ? "" : +e.target.value)}
                                    placeholder="Цена"
                                    className="w-20 px-2 py-1 border border-gray-200 rounded text-[11px] outline-none text-center" />
                                  <input value={newItemName} onChange={e => setNewItemName(e.target.value)}
                                    placeholder="Примечание"
                                    className="w-24 px-2 py-1 border border-gray-200 rounded text-[11px] outline-none focus:ring-1 focus:ring-primary-500" />
                                  <button onClick={() => addOrderItem(o.id)}
                                    disabled={!newWhItemId}
                                    className="px-2 py-1 bg-primary-600 text-white rounded text-[10px] font-medium hover:bg-primary-700 disabled:opacity-50">+</button>
                                </div>

                                {/* Actions: Checklist & Print */}
                                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100">
                                  <button onClick={() => toggleChecklist(o)}
                                    className="px-2 py-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100">
                                    {checklistData?.[o.id] ? "Чек-лист сборки" : "Сформировать чек-лист"}
                                  </button>
                                  <button onClick={() => window.open("/api/orders/" + o.id + "/invoice", "_blank")}
                                    className="px-2 py-1 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100">
                                    <FileText className="w-3 h-3 inline mr-1" />Накладная
                                  </button>
                                  {checklistData?.[o.id] && (
                                    <button onClick={() => window.open("/api/orders/" + o.id + "/checklist/print", "_blank")}
                                      className="px-2 py-1 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100">
                                      <FileText className="w-3 h-3 inline mr-1" />Чек-лист (печать)
                                    </button>
                                  )}
                                </div>

                                {/* Checklist display */}
                                {checklistData?.[o.id] && (
                                  <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-2.5 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">
                                        {checklistData[o.id].title}
                                      </span>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                        checklistData[o.id].status === "completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                      }`}>
                                        {checklistData[o.id].status === "completed" ? "✓ Выполнен" : "В работе"}
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      {(checklistData[o.id].items || []).map((ci: any) => (
                                        <label key={ci.id} className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-amber-50/50 rounded px-1 py-0.5">
                                          <input type="checkbox" checked={ci.checked} onChange={() => toggleChecklistItem(ci.id, !ci.checked)}
                                            className="w-3 h-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                          <span className={`flex-1 ${ci.checked ? "line-through text-gray-400" : "text-gray-700"}`}>
                                            {ci.productName}
                                          </span>
                                          <span className="text-gray-400">{ci.quantity} шт.</span>
                                        </label>
                                      ))}
                                    </div>
                                    {checklistData[o.id].status !== "completed" && (
                                      <button onClick={() => completeChecklist(checklistData[o.id].id)}
                                        className="w-full py-1 text-[10px] font-medium text-white bg-amber-600 hover:bg-amber-700 rounded">
                                        Завершить сборку
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              /* Collapsed order card */
                              <div
                                onClick={() => setCurrentOrder(o)}
                                className="bg-white border border-gray-100 rounded-lg p-2.5 flex items-center justify-between hover:border-gray-200 transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-xs font-medium text-gray-800 truncate">{o.orderNumber}</span>
                                  <span className="text-[10px] text-gray-400 whitespace-nowrap">({o.items?.length || 0} поз.)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                    o.status === "draft" ? "bg-gray-100 text-gray-600" :
                                    o.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                                    o.status === "assembly" ? "bg-amber-100 text-amber-700" :
                                    o.status === "ready" ? "bg-purple-100 text-purple-700" :
                                    o.status === "shipped" ? "bg-emerald-100 text-emerald-700" :
                                    "bg-gray-100 text-gray-500"
                                  }`}>
                                    {o.status === "draft" ? "Черновик" :
                                     o.status === "confirmed" ? "Подтверждён" :
                                     o.status === "assembly" ? "В сборке" :
                                     o.status === "ready" ? "Готов" :
                                     o.status === "shipped" ? "Отгружено" : o.status}
                                  </span>
                                  <ChevronRight className="w-3 h-3 text-gray-300" />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-3">
                      <p className="text-[10px] text-gray-400 mb-2">Нет заявок.</p>
                      <button onClick={() => { setCurrentOrder(null); setOrdersError(""); loadOrders(); setOrderModalOpen(true); }} className="px-3 py-1.5 bg-primary-600 text-white rounded text-xs font-medium hover:bg-primary-700">+ Создать заявку</button>
                    </div>
                    )}
                  </div>
                )}
              </div>
            )}


            {/* ===== Files ===== */}
            {!edit && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <button onClick={() => { setFilesOpen(!filesOpen); if (!filesOpen) loadFiles(); }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-800">
                    <Paperclip className="w-3.5 h-3.5" />
                    Файлы
                    <span className="text-[10px] text-gray-400 font-normal">({dealFiles.length})</span>
                    <ChevronRight className={`w-3 h-3 transition-transform ${filesOpen ? "rotate-90" : ""}`} />
                  </button>
                </div>
                {filesOpen && (
                  <div className="space-y-2">
                    {/* Drop zone */}
                    <label
                      className={`flex flex-col items-center justify-center gap-1 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all text-center ${
                        dragOver ? "border-primary-400 bg-primary-50/50" : "border-gray-200 hover:border-primary-300 hover:bg-gray-50"
                      }`}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                    >
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-[10px] text-gray-500">Перетащите файлы сюда или кликните</span>
                      <span className="text-[9px] text-gray-400">до 100 МБ</span>
                      <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                    </label>

                    {/* File list */}
                    {filesLoading ? (
                      <p className="text-[10px] text-gray-400 text-center py-2">Загрузка...</p>
                    ) : dealFiles.length > 0 ? (
                      <div className="space-y-1">
                        {dealFiles.map((f: any) => (
                          <div key={f.id} className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg p-2 hover:border-gray-200 transition-colors group">
                            <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center shrink-0">
                              <FileText className="w-3.5 h-3.5 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-gray-700 truncate font-medium">{f.originalName}</p>
                              <p className="text-[9px] text-gray-400">{fmtSize(f.sizeBytes)} • {new Date(f.createdAt).toLocaleDateString("ru-RU")}</p>
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setPreviewFile({ id: f.id, fileName: f.originalName, downloadUrl: "/api/deals/" + deal.id + "/files/" + f.id + "/download?token=" + _token() })} 
                                className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded" title="Просмотр">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <a href={"/api/deals/" + deal.id + "/files/" + f.id + "/download?token=" + _token()} target="_blank" rel="noopener"
                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Скачать">
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button onClick={() => { if (confirm("Удалить файл?")) deleteFile(f.id); }}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Удалить">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-400 text-center py-2">Нет файлов</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {edit ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Номер лиды</label>
                    <input value={edit.dealNumber || ""} onChange={(e) => setEdit({ ...edit, dealNumber: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/30" /></div>
                  <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Клиент</label>
                    <input value={edit.clientName || ""} onChange={(e) => setEdit({ ...edit, clientName: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/30" /></div>
                  <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Телефон</label>
                    <input value={edit.clientPhone || ""} onChange={(e) => setEdit({ ...edit, clientPhone: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/30" /></div>
                  <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">ИНН</label>
                    <input value={edit.clientInn || ""} onChange={(e) => setEdit({ ...edit, clientInn: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/30" /></div>
                  <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Тип</label>
                    <select value={edit.dealType || "Sale"} onChange={(e) => setEdit({ ...edit, dealType: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/30"><option value="Sale">Продажа</option></select></div>
                  <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Сумма</label>
                    <input type="number" value={edit.expectedAmount || 0} onChange={(e) => setEdit({ ...edit, expectedAmount: +e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/30" /></div>
                  <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Оплата</label>
                    <select value={edit.paymentType || ""} onChange={(e) => setEdit({ ...edit, paymentType: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/30"><option value="">Не указан</option><option value="безналичный">Безналичный</option><option value="наличный">Наличный</option></select></div>
                </div>
                <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Агент</label>
                  <select value={edit.responsibleAgentId || ""} onChange={(e) => setEdit({ ...edit, responsibleAgentId: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/30"><option value="">Не назначен</option>{users?.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}</select></div>
                <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Описание</label>
                  <textarea value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} onInput={(e) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }} className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/30 resize-none overflow-hidden" rows={2} /></div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => onSaveEdit({ ...edit })} disabled={isPending}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all disabled:opacity-50 shadow-sm"><Save className="w-3.5 h-3.5" />{isPending ? "Сохранение..." : "Сохранить"}</button>
                  <button onClick={onCancelEdit} className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Отмена</button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Сумма</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{(linked.expectedAmount?.toLocaleString() || 0)} ₽</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Тип</p>
                    <p className="text-sm font-semibold text-gray-800 mt-1">{linked.dealType || "Не указан"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Оплата</p>
                    <p className="text-sm font-semibold text-gray-800 mt-1">{linked.paymentType || "—"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    {linked.responsibleAgentId ? (
                      <button onClick={() => setViewAgentId(linked.responsibleAgentId)} className="text-gray-600 hover:text-primary-600 hover:underline">{agent || "Агент не назначен"}</button>
                    ) : (
                      <span className="text-gray-600">{agent || "Агент не назначен"}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{fmtDate(linked.createdAt)}</span>
                  </div>
                </div>

                {linked.clientName && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 border-t border-gray-100 pt-3">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-700">{linked.clientName}</span>
                  </div>
                )}
                {linked.clientPhone && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <a href={"tel:" + linked.clientPhone} className="text-gray-700 hover:text-primary-600 hover:underline">{linked.clientPhone}</a>
                  </div>
                )}

                {linked.description && (
                  <div className="relative bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-4 border border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Описание</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{linked.description}</p>
                  </div>
                )}

                {hasAnyLinked && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Связанные данные</p>
                    <div className="grid grid-cols-2 gap-2">
                      {hasProduction && (
                        <button onClick={() => { onClose(); navigate("/production#" + encodeURIComponent(linked.dealNumber)); }}
                          className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/50 transition-all text-left group shadow-sm hover:shadow">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 shadow-sm">
                            <Briefcase className="w-4 h-4 text-white" /></div>
                          <div className="min-w-0"><p className="text-xs font-semibold text-gray-900">Производство</p><p className="text-[10px] text-gray-400">{(linked.productionOrders || []).length} заказов</p></div>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto shrink-0" />
                        </button>
                      )}
                      {hasInstallation && (
                        <button onClick={() => { onClose(); navigate("/installation#" + encodeURIComponent(linked.dealNumber)); }}
                          className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all text-left group shadow-sm hover:shadow">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                            <Briefcase className="w-4 h-4 text-white" /></div>
                          <div className="min-w-0"><p className="text-xs font-semibold text-gray-900">Монтаж</p><p className="text-[10px] text-gray-400">{(linked.installationTasks || []).length} задач</p></div>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto shrink-0" />
                        </button>
                      )}
                      {hasService && (
                        <button onClick={() => { onClose(); navigate("/service"); }}
                          className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 hover:border-green-200 hover:bg-green-50/50 transition-all text-left group shadow-sm hover:shadow">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shrink-0 shadow-sm">
                            <Briefcase className="w-4 h-4 text-white" /></div>
                          <div className="min-w-0"><p className="text-xs font-semibold text-gray-900">Сервис</p><p className="text-[10px] text-gray-400">{(linked.serviceCases || []).length} обращений</p></div>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto shrink-0" />
                        </button>
                      )}
                      {hasLegal && (
                        <button onClick={() => { onClose(); navigate("/legal"); }}
                          className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all text-left group shadow-sm hover:shadow">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                            <FileText className="w-4 h-4 text-white" /></div>
                          <div className="min-w-0"><p className="text-xs font-semibold text-gray-900">Документы</p><p className="text-[10px] text-gray-400">{(linked.legalDocuments || []).length} док.</p></div>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto shrink-0" />
                        </button>
                      )}
                      {hasRent && (
                        <button onClick={() => { onClose(); navigate("/rent"); }}
                          className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 hover:border-teal-200 hover:bg-teal-50/50 transition-all text-left group shadow-sm hover:shadow">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shrink-0 shadow-sm">
                            <Briefcase className="w-4 h-4 text-white" /></div>
                          <div className="min-w-0"><p className="text-xs font-semibold text-gray-900">Аренда</p><p className="text-[10px] text-gray-400">Договор</p></div>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto shrink-0" />
                        </button>
                      )}
                      {hasCommissions && (
                        <button className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 hover:border-pink-200 hover:bg-pink-50/50 transition-all text-left shadow-sm hover:shadow">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center shrink-0 shadow-sm">
                            <DollarSign className="w-4 h-4 text-white" /></div>
                          <div className="min-w-0"><p className="text-xs font-semibold text-gray-900">Комиссии</p><p className="text-[10px] text-gray-400">{(linked.commissions || []).length} записей</p></div>
                        </button>
                      )}
                      {hasInvoices && (
                        <button className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 transition-all text-left shadow-sm hover:shadow">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shrink-0 shadow-sm">
                            <FileText className="w-4 h-4 text-white" /></div>
                          <div className="min-w-0"><p className="text-xs font-semibold text-gray-900">Счета</p><p className="text-[10px] text-gray-400">{(linked.invoices || []).length} шт.</p></div>
                        </button>
                      )}
                      {hasPayments && (
                        <button className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all text-left shadow-sm hover:shadow">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                            <DollarSign className="w-4 h-4 text-white" /></div>
                          <div className="min-w-0"><p className="text-xs font-semibold text-gray-900">Платежи</p><p className="text-[10px] text-gray-400">{(linked.payments || []).length} шт.</p></div>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}</div>

            {/* ===== ZONE 2: Activity Feed ===== */}
            <div className="bg-gray-50/80 rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-amber-500 rounded-full" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Активность</h3>
              </div>
              {!edit && deal && deal.id && (
                <ActionsWorkflow dealId={deal.id} />
              )}
            </div>

          </div>

{/* Edit/Delete bar */}
          {!edit && (
            <div className="flex items-center gap-2 px-5 py-2.5 border-t border-gray-100 bg-gray-50/50 shrink-0">
              <button onClick={onEdit} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors">
                <Edit3 className="w-3.5 h-3.5" />Редактировать</button>
              {confirmDelete ? (
                <>
                  <span className="text-xs text-red-600 font-medium">Удалить лиду?</span>
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
          <DealChatPanel dealId={deal.id} dealNumber={linked.dealNumber} /></div>
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
                    { key: "1_специф��кация", label: "Спецификация", desc: "Перечень товаров и услуг", color: "teal" },
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
          clientName={linked.clientName || ""}
          clientInn={linked.clientInn || ""}
          clientPhone={linked.clientPhone || ""}
          clientEmail={""}
          dealNumber={linked.dealNumber}
          amount={linked.expectedAmount || 0}
          onClose={() => setDocPreview(null)}
        />
      )}

      {/* Order creation modal */}
      {orderModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOrderModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Создание заявки</h3>
              <button onClick={() => setOrderModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {!currentOrder ? (
                <div className="text-center py-10">
                  <button onClick={createOrder} disabled={ordersLoading}
                    className="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                    {ordersLoading ? "..." : "Создать заявку"}
                  </button>
                  {ordersError && <p className="text-xs text-red-500 mt-2">{ordersError}</p>}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-gray-800">{currentOrder.orderNumber}</span>
                      <span className="ml-2 text-xs text-gray-400">{currentOrder.items?.length || 0} поз.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        currentOrder.status === "draft" ? "bg-gray-100 text-gray-600" :
                        currentOrder.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                        currentOrder.status === "assembly" ? "bg-amber-100 text-amber-700" :
                        currentOrder.status === "ready" ? "bg-purple-100 text-purple-700" :
                        currentOrder.status === "shipped" ? "bg-emerald-100 text-emerald-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {currentOrder.status === "draft" ? "Черновик" :
                         currentOrder.status === "confirmed" ? "Подтверждён" :
                         currentOrder.status === "assembly" ? "В сборке" :
                         currentOrder.status === "ready" ? "Готов к отгрузке" :
                         currentOrder.status === "shipped" ? "Отгружено" : currentOrder.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentOrder.status === "draft" && (
                      <button onClick={() => updateOrderStatus(currentOrder.id, "confirmed")}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded">Подтвердить</button>
                    )}
                    {currentOrder.status === "confirmed" && (
                      <button onClick={() => updateOrderStatus(currentOrder.id, "assembly")}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded">Начать сборку</button>
                    )}
                    {currentOrder.status === "assembly" && (
                      <button onClick={() => updateOrderStatus(currentOrder.id, "ready")}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded">Готов к отгрузке</button>
                    )}
                    {currentOrder.status === "ready" && (
                      <button onClick={() => updateOrderStatus(currentOrder.id, "shipped")}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded">Отгрузить</button>
                    )}
                    {currentOrder.status !== "shipped" && currentOrder.status !== "draft" && (
                      <button onClick={() => updateOrderStatus(currentOrder.id, "draft")}
                        className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded hover:bg-gray-50">В черновик</button>
                    )}
                    <button onClick={() => { if (confirm("Удалить заявку?")) { deleteOrder(currentOrder.id); setOrderModalOpen(false); } }}
                      className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded hover:bg-red-50">Удалить</button>
                  </div>
                  <div className="space-y-1.5">
                    {(currentOrder.items || []).map((item: any, idx: number) => (
                      <div key={item.id} className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400 w-4">{idx + 1}.</span>
                        {editingItemId === item.id ? (
                          <>
                            <input value={editItemName} onChange={e => setEditItemName(e.target.value)}
                              className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs outline-none" />
                            <input type="number" value={editItemQty} onChange={e => setEditItemQty(Math.max(1, +e.target.value))}
                              className="w-16 px-2 py-1 border border-gray-200 rounded text-xs outline-none text-center" />
                            <input type="number" value={editItemPrice} onChange={e => setEditItemPrice(+e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-200 rounded text-xs outline-none text-center" />
                            <button onClick={saveEditItem} className="text-green-600 hover:text-green-700 p-1"><Save className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditingItemId(null)} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-3.5 h-3.5" /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-gray-800">{item.productName}</span>
                            <span className="text-gray-500 w-14 text-right">{item.quantity} шт.</span>
                            <span className="text-gray-500 w-24 text-right">{item.price ? item.price.toLocaleString() + " ₽" : "—"}</span>
                            <span className="text-gray-700 w-24 text-right font-medium">{item.total ? item.total.toLocaleString() + " ₽" : (item.price ? (item.price * item.quantity).toLocaleString() + " ₽" : "—")}</span>
                            <button onClick={() => startEditItem(item)} className="text-blue-500 hover:text-blue-700 p-1"><Edit3 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => { removeOrderItem(currentOrder.id, item.id); }} className="text-red-400 hover:text-red-600 p-1"><X className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={newWhItemId} onChange={e => { setNewWhItemId(e.target.value); const sel = whItems.find((w: any) => w.id === e.target.value); if (sel) { setNewItemPrice(sel.salePrice || ""); setNewItemName(""); } }}
                      className="px-2 py-1.5 border border-gray-200 rounded text-xs outline-none focus:ring-1 focus:ring-primary-500 flex-1">
                      <option value="">Товар со склада</option>
                      {whItems.map((w: any) => (
                        <option key={w.id} value={w.id}>{w.productName} ({w.quantity} {w.unit})</option>
                      ))}
                    </select>
                    <input type="number" min={1} value={newItemQty} onChange={e => setNewItemQty(Math.max(1, +e.target.value))}
                      className="w-16 px-2 py-1.5 border border-gray-200 rounded text-xs outline-none text-center" />
                    <input type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value === "" ? "" : +e.target.value)}
                      placeholder="Цена"
                      className="w-24 px-2 py-1.5 border border-gray-200 rounded text-xs outline-none text-center" />
                    <input value={newItemName} onChange={e => setNewItemName(e.target.value)}
                      placeholder="Примечание"
                      className="w-28 px-2 py-1.5 border border-gray-200 rounded text-xs outline-none focus:ring-1 focus:ring-primary-500" />
                    <button onClick={() => addOrderItem(currentOrder.id)}
                      disabled={!newWhItemId}
                      className="px-3 py-1.5 bg-primary-600 text-white rounded text-xs font-medium hover:bg-primary-700 disabled:opacity-50">+</button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <button onClick={() => toggleChecklist(currentOrder)}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50">
                      {checklistData[currentOrder.id] ? "✓ Чек-лист" : "□ Чек-лист"}
                    </button>
                    <button onClick={() => printOrder(currentOrder)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50">
                      Печать
                    </button>
                  </div>
                  {checklistData[currentOrder.id] && (
                    <div className="text-xs text-gray-600 bg-blue-50 rounded-lg p-3">
                      {JSON.stringify(checklistData[currentOrder.id], null, 2)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          token={_token()}
        />
      )}
    </div>
  );
}
