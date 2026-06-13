import { Router, Response } from "express";
import { prisma } from "../db";
import { AuthRequest } from "../middleware/auth";

const router = Router();

// ─── PRODUCTS ────────────────────────────────────
router.get("/products/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { items: true, specifications: true },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to fetch product" }); }
});

router.put("/products/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.product.update({ where: { id: req.params.id }, data: req.body });
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to update product" }); }
});

router.delete("/products/:id", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.product.update({ where: { id: req.params.id }, data: { isArchived: true } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to archive product" }); }
});

// ─── PRODUCTION ──────────────────────────────────
router.get("/production/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.productionOrder.findUnique({
      where: { id: req.params.id },
      include: { deal: { include: { client: true } }, productionRoute: { include: { steps: true } }, defectRecords: true },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to fetch production order" }); }
});

router.put("/production/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.productionOrder.update({ where: { id: req.params.id }, data: req.body });
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to update production order" }); }
});

router.delete("/production/:id", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.productionOrder.update({ where: { id: req.params.id }, data: { isArchived: true } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to archive production order" }); }
});

// ─── INSTALLATION ────────────────────────────────
router.get("/installation/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.installationTask.findUnique({
      where: { id: req.params.id },
      include: { deal: { include: { client: true } }, installer: true, calendarEvents: true },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to fetch installation" }); }
});

// ─── RENT ────────────────────────────────────────
router.get("/rent/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.rentContract.findUnique({
      where: { id: req.params.id },
      include: { client: true, equipment: { include: { product: true } }, billingRecords: { orderBy: { period: "desc" } } },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to fetch rent contract" }); }
});

router.put("/rent/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { equipmentIds, ...fields } = req.body;
    const data = await prisma.rentContract.update({
      where: { id: req.params.id },
      data: { ...fields, equipment: equipmentIds ? { set: equipmentIds.map((id: string) => ({ id })) } : undefined },
    });
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to update rent contract" }); }
});

// ─── INVOICES ────────────────────────────────────
router.get("/invoices/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { client: true, deal: true, payments: true },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to fetch invoice" }); }
});

router.put("/invoices/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.invoice.update({ where: { id: req.params.id }, data: req.body });
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to update invoice" }); }
});

// ─── PAYMENTS ────────────────────────────────────
router.get("/payments/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { client: true, invoice: true, deal: true },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to fetch payment" }); }
});

// ─── SERVICE ─────────────────────────────────────
router.get("/service/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.serviceCase.findUnique({
      where: { id: req.params.id },
      include: { client: true, deal: true, defectRecords: true },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to fetch service case" }); }
});

router.put("/service/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.serviceCase.update({ where: { id: req.params.id }, data: req.body });
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to update service case" }); }
});

// ─── TELEMETRY ───────────────────────────────────
router.get("/telemetry/devices/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.telemetryDevice.findUnique({
      where: { id: req.params.id },
      include: { readings: { take: 10, orderBy: { createdAt: "desc" } } },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to fetch device" }); }
});

// ─── TASKS ───────────────────────────────────────
router.get("/tasks/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { createdBy: { select: { firstName: true, lastName: true } }, assignee: { select: { firstName: true, lastName: true } }, deal: { select: { dealNumber: true } } },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to fetch task" }); }
});

// ─── USERS ───────────────────────────────────────
router.get("/users/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { role: { include: { permissions: true } } },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    const { passwordHash, apiKey, ...safe } = data;
    res.json(safe);
  } catch { res.status(500).json({ error: "Failed to fetch user" }); }
});

// ─── DEALS ───────────────────────────────────────
router.delete("/deals/:id", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.deal.update({ where: { id: req.params.id }, data: { isArchived: true } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to archive deal" }); }
});

// ─── LEADS ───────────────────────────────────────
router.get("/leads/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: { assignedAgent: true, client: true, deal: true },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to fetch lead" }); }
});

router.put("/leads/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.lead.update({ where: { id: req.params.id }, data: req.body });
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to update lead" }); }
});

// ─── LEGAL DOCUMENTS ─────────────────────────────
router.delete("/legal/:id", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.legalDocument.update({ where: { id: req.params.id }, data: { isArchived: true } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to archive document" }); }
});

// ─── SUPPLIERS ───────────────────────────────────
router.get("/suppliers/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.supplier.findUnique({
      where: { id: req.params.id },
      include: { orders: true, purchaseRequests: true },
    });
    if (!data || data.isArchived) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to fetch supplier" }); }
});

// ─── WAREHOUSE ───────────────────────────────────
router.get("/warehouse/items/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.warehouseStockItem.findUnique({
      where: { id: req.params.id },
      include: { category: true },
    });
    if (!data) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to fetch item" }); }
});

// ─── NOTIFICATIONS ───────────────────────────────
router.get("/notifications/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!data || data.userId !== req.user!.id) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to fetch notification" }); }
});

export default router;
