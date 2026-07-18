import { Router, Response } from "express";
import { prisma } from "../db";
import { AuthRequest, requirePermission } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// ─── PRODUCTS ────────────────────────────────────
router.get("/products/:id", requirePermission("deals:view"), asyncHandler(async (req, res) => {
    const data = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { items: true, specifications: true },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
}));

router.put("/products/:id", requirePermission("deals:edit"), asyncHandler(async (req, res) => {
    const data = await prisma.product.update({ where: { id: req.params.id }, data: req.body });
    res.json(data);
}));

router.delete("/products/:id", requirePermission("deals:delete"), asyncHandler(async (req, res) => {
    await prisma.product.update({ where: { id: req.params.id }, data: { isArchived: true } });
    res.json({ ok: true });
}));

// ─── PRODUCTION ──────────────────────────────────
router.get("/production/:id", requirePermission("deals:view"), asyncHandler(async (req, res) => {
    const data = await prisma.productionOrder.findUnique({
      where: { id: req.params.id },
      include: { deal: { include: { client: true } }, productionRoute: { include: { steps: true } }, defectRecords: true },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
}));

router.put("/production/:id", requirePermission("deals:edit"), asyncHandler(async (req, res) => {
    const data = await prisma.productionOrder.update({ where: { id: req.params.id }, data: req.body });
    res.json(data);
}));

router.delete("/production/:id", requirePermission("deals:delete"), asyncHandler(async (req, res) => {
    await prisma.productionOrder.update({ where: { id: req.params.id }, data: { isArchived: true } });
    res.json({ ok: true });
}));

// ─── INSTALLATION ────────────────────────────────
router.get("/installation/:id", requirePermission("deals:view"), asyncHandler(async (req, res) => {
    const data = await prisma.installationTask.findUnique({
      where: { id: req.params.id },
      include: { deal: { include: { client: true } }, installer: true, calendarEvents: true },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
}));

// ─── RENT ────────────────────────────────────────
router.get("/rent/:id", requirePermission("deals:view"), asyncHandler(async (req, res) => {
    const data = await prisma.rentContract.findUnique({
      where: { id: req.params.id },
      include: { client: true, equipment: { include: { product: true } }, billingRecords: { orderBy: { period: "desc" } } },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
}));

router.put("/rent/:id", requirePermission("deals:edit"), asyncHandler(async (req, res) => {
    const { equipmentIds, ...fields } = req.body;
    const data = await prisma.rentContract.update({
      where: { id: req.params.id },
      data: { ...fields, equipment: equipmentIds ? { set: equipmentIds.map((id: string) => ({ id })) } : undefined },
    });
    res.json(data);
}));

// ─── INVOICES ────────────────────────────────────
router.get("/invoices/:id", requirePermission("deals:view"), asyncHandler(async (req, res) => {
    const data = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { client: true, deal: true, payments: true },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
}));

router.put("/invoices/:id", requirePermission("deals:edit"), asyncHandler(async (req, res) => {
    const data = await prisma.invoice.update({ where: { id: req.params.id }, data: req.body });
    res.json(data);
}));

// ─── PAYMENTS ────────────────────────────────────
router.get("/payments/:id", requirePermission("deals:view"), asyncHandler(async (req, res) => {
    const data = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { client: true, invoice: true, deal: true },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
}));

// ─── SERVICE ─────────────────────────────────────
router.get("/service/:id", requirePermission("deals:view"), asyncHandler(async (req, res) => {
    const data = await prisma.serviceCase.findUnique({
      where: { id: req.params.id },
      include: { client: true, deal: true, defectRecords: true },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
}));

router.put("/service/:id", requirePermission("deals:edit"), asyncHandler(async (req, res) => {
    const data = await prisma.serviceCase.update({ where: { id: req.params.id }, data: req.body });
    res.json(data);
}));

// ─── TELEMETRY ───────────────────────────────────
router.get("/telemetry/devices/:id", requirePermission("deals:view"), asyncHandler(async (req, res) => {
    const data = await prisma.telemetryDevice.findUnique({
      where: { id: req.params.id },
      include: { readings: { take: 10, orderBy: { createdAt: "desc" } } },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
}));

// ─── TASKS ───────────────────────────────────────
router.get("/tasks/:id", requirePermission("deals:view"), asyncHandler(async (req, res) => {
    const data = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { createdBy: { select: { firstName: true, lastName: true } }, assignee: { select: { firstName: true, lastName: true } }, deal: { select: { dealNumber: true } } },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
}));

// ─── USERS ───────────────────────────────────────
router.get("/users/:id", requirePermission("deals:view"), asyncHandler(async (req, res) => {
    const data = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { role: { include: { permissions: true } } },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    const { passwordHash, apiKey, ...safe } = data;
    res.json(safe);
}));

// ─── DEALS ───────────────────────────────────────
router.delete("/deals/:id", requirePermission("deals:delete"), asyncHandler(async (req, res) => {
    await prisma.deal.update({ where: { id: req.params.id }, data: { isArchived: true } });
    res.json({ ok: true });
}));

// ─── LEADS ───────────────────────────────────────
router.get("/leads/:id", requirePermission("deals:view"), asyncHandler(async (req, res) => {
    const data = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: { assignedAgent: true, client: true, deal: true },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
}));

router.put("/leads/:id", requirePermission("deals:edit"), asyncHandler(async (req, res) => {
    const data = await prisma.lead.update({ where: { id: req.params.id }, data: req.body });
    res.json(data);
}));

// ─── LEGAL DOCUMENTS ─────────────────────────────
router.delete("/legal/:id", requirePermission("deals:delete"), asyncHandler(async (req, res) => {
    await prisma.legalDocument.update({ where: { id: req.params.id }, data: { isArchived: true } });
    res.json({ ok: true });
}));

// ─── SUPPLIERS ───────────────────────────────────
router.get("/suppliers/:id", requirePermission("deals:view"), asyncHandler(async (req, res) => {
    const data = await prisma.supplier.findUnique({
      where: { id: req.params.id },
      include: { orders: true, purchaseRequests: true },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
}));

// ─── WAREHOUSE ───────────────────────────────────
router.get("/warehouse/items/:id", requirePermission("deals:view"), asyncHandler(async (req, res) => {
    const data = await prisma.warehouseStockItem.findUnique({
      where: { id: req.params.id },
      include: { category: true },
    });
    if (!data) return res.status(404).json({ error: "Not found" });
    res.json(data);
}));

// ─── NOTIFICATIONS ───────────────────────────────
router.get("/notifications/:id", requirePermission("deals:view"), asyncHandler(async (req, res) => {
    const data = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!data || data.userId !== req.user!.id) return res.status(404).json({ error: "Not found" });
    res.json(data);
}));

export default router;
