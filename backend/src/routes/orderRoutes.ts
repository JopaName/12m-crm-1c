import { Router, Response } from "express";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { orderService } from "../services/OrderService";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// Get all orders for a deal
router.get("/deal/:dealId", requirePermission("deals:view"), asyncHandler(async (req, res) => {
    const orders = await orderService.getOrders(req.params.dealId);
    res.json(orders);
}));

// Get single order
router.get("/:id", requirePermission("deals:view"), asyncHandler(async (req, res) => {
    const order = await orderService.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
}));

// Create order
router.post("/", requirePermission("deals:create"), asyncHandler(async (req, res) => {
    const order = await orderService.createOrder(req.body, req.user!.id);
    res.status(201).json(order);
}));

// Update order
router.put("/:id", requirePermission("deals:edit"), asyncHandler(async (req, res) => {
    const order = await orderService.updateOrder(req.params.id, req.body);
    res.json(order);
}));

// Delete order
router.delete("/:id", requirePermission("deals:delete"), asyncHandler(async (req, res) => {
    await orderService.deleteOrder(req.params.id);
    res.json({ success: true });
}));

// Add item to order
router.post("/:id/items", requirePermission("deals:create"), asyncHandler(async (req, res) => {
    const items = await orderService.addItem(req.params.id, req.body);
    res.status(201).json(items);
}));

// Update item
router.put("/items/:itemId", requirePermission("deals:edit"), asyncHandler(async (req, res) => {
    const item = await orderService.updateItem(req.params.itemId, req.body);
    res.json(item);
}));

// Delete item
router.delete("/items/:itemId", requirePermission("deals:delete"), asyncHandler(async (req, res) => {
    await orderService.removeItem(req.params.itemId);
    res.json({ success: true });
}));

// Generate checklist for order
router.post("/:id/checklist", requirePermission("deals:create"), asyncHandler(async (req, res) => {
    const checklist = await orderService.generateChecklist(req.params.id);
    res.status(201).json(checklist);
}));

// Get checklist for order
router.get("/:id/checklist", requirePermission("deals:view"), asyncHandler(async (req, res) => {
    const checklist = await orderService.getChecklist(req.params.id);
    res.json(checklist || { items: [] });
}));

// Update checklist
router.put("/checklist/:checklistId", requirePermission("deals:edit"), asyncHandler(async (req, res) => {
    const checklist = await orderService.updateChecklist(req.params.checklistId, req.body);
    res.json(checklist);
}));

// Update checklist item
router.put("/checklist/items/:itemId", requirePermission("deals:edit"), asyncHandler(async (req, res) => {
    const item = await orderService.updateChecklistItem(req.params.itemId, req.body);
    res.json(item);
}));

// Generate shipping invoice HTML
router.get("/:id/invoice", requirePermission("deals:view"), asyncHandler(async (req, res) => {
    const order = await orderService.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    const html = generateShippingInvoice(order);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
}));

// Generate checklist HTML
router.get("/:id/checklist/print", requirePermission("deals:view"), asyncHandler(async (req, res) => {
    const order = await orderService.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    const checklist = order.checklists?.[0];
    if (!checklist) return res.status(404).json({ error: "Checklist not found" });
    const html = generateChecklistHtml(order, checklist);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
}));

function generateShippingInvoice(order: any): string {
  const now = new Date().toLocaleDateString("ru-RU");
  const items = order.items || [];
  const total = items.reduce((s: number, it: any) => s + (it.total || it.price * it.quantity || 0), 0);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Накладная на отгрузку</title>
<style>
  body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 12px; color: #222; margin: 40px; }
  h1 { text-align: center; font-size: 18px; margin-bottom: 4px; }
  .subtitle { text-align: center; font-size: 13px; color: #555; margin-bottom: 24px; }
  .header-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .header-info div { font-size: 11px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; font-size: 11px; }
  th { background: #eef2f7; font-weight: 600; }
  .total-row td { font-weight: 700; background: #f9fafb; }
  .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; }
  .footer div { width: 45%; }
  .footer .line { border-bottom: 1px solid #333; height: 20px; margin-bottom: 4px; }
  .print-btn { text-align: center; margin-bottom: 20px; }
  .print-btn button { padding: 8px 24px; font-size: 14px; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style></head><body>
<div class="print-btn"><button onclick="window.print()">Печать</button></div>
<h1>Накладная на отгрузку</h1>
<div class="subtitle">№ ${order.orderNumber} от ${now}</div>
<div class="header-info">
  <div><strong>Заказ:</strong> №${order.orderNumber}</div>
  <div><strong>Статус:</strong> ${order.status}</div>
</div>
<table>
  <thead><tr><th>#</th><th>Товар</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead>
  <tbody>
    ${items.map((it: any, i: number) => `<tr>
      <td>${i + 1}</td>
      <td>${it.productName}</td>
      <td>${it.quantity}</td>
      <td>${it.price != null ? it.price.toLocaleString() + " ₽" : "—"}</td>
      <td>${it.total != null ? it.total.toLocaleString() + " ₽" : (it.price ? (it.price * it.quantity).toLocaleString() + " ₽" : "—")}</td>
    </tr>`).join("")}
    <tr class="total-row"><td colspan="4" style="text-align:right">Итого:</td><td>${total.toLocaleString()} ₽</td></tr>
  </tbody>
</table>
<div class="footer">
  <div><div class="line"></div>Отпустил(а) _______________</div>
  <div><div class="line"></div>Получил(а) ________________</div>
</div>
</body></html>`;
}

function generateChecklistHtml(order: any, checklist: any): string {
  const items = checklist.items || [];
  const allChecked = items.every((it: any) => it.checked);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Чек-лист сборки</title>
<style>
  body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 13px; color: #222; margin: 40px; }
  h1 { text-align: center; font-size: 18px; margin-bottom: 4px; }
  .subtitle { text-align: center; font-size: 13px; color: #555; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th, td { border: 1px solid #333; padding: 8px 10px; text-align: left; font-size: 12px; }
  th { background: #eef2f7; font-weight: 600; }
  .checked { background: #f0fdf4; }
  .status-badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .status-done { background: #d1fae5; color: #065f46; }
  .status-pending { background: #fef3c7; color: #92400e; }
  .print-btn { text-align: center; margin-bottom: 20px; }
  .print-btn button { padding: 8px 24px; font-size: 14px; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style></head><body>
<div class="print-btn"><button onclick="window.print()">Печать</button></div>
<h1>${checklist.title}</h1>
<div class="subtitle">Заказ №${order.orderNumber} • ${allChecked ? "✅ Выполнен" : "⏳ В работе"}</div>
<table>
  <thead><tr><th>#</th><th>Товар</th><th>Кол-во</th><th>Статус</th><th>Примечание</th></tr></thead>
  <tbody>
    ${items.map((it: any, i: number) => `<tr class="${it.checked ? "checked" : ""}">
      <td>${i + 1}</td>
      <td>${it.productName}</td>
      <td>${it.quantity}</td>
      <td><span class="status-badge ${it.checked ? "status-done" : "status-pending"}">${it.checked ? "Собрано" : "Ожидает"}</span></td>
      <td>${it.note || ""}</td>
    </tr>`).join("")}
  </tbody>
</table>
<div class="footer" style="margin-top:40px;display:flex;justify-content:space-between;font-size:11px">
  <div style="border-top:1px solid #333;padding-top:4px;width:200px">Сборщик _______________</div>
  <div style="border-top:1px solid #333;padding-top:4px;width:200px">Проверил _______________</div>
</div>
</body></html>`;
}

export default router;
