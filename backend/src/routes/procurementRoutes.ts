import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const [requests, suppliers, orders] = await Promise.all([
      prisma.purchaseRequest.findMany({
        where: { isArchived: false },
        include: {
          product: true,
          supplier: true,
          createdBy: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.supplier.findMany({ where: { isArchived: false } }),
      prisma.supplierOrder.findMany({
        where: { isArchived: false },
        include: { supplier: true },
      }),
    ]);
    res.json({ requests, suppliers, orders });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch procurement data" });
  }
});

router.post("/requests", async (req: AuthRequest, res: Response) => {
  try {
    const request = await prisma.purchaseRequest.create({
      data: { ...req.body, createdById: req.user!.id },
    });
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: "Failed to create purchase request" });
  }
});

router.post("/suppliers", async (req: AuthRequest, res: Response) => {
  try {
    const supplier = await prisma.supplier.create({ data: req.body });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: "Failed to create supplier" });
  }
});

router.post("/orders", async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.supplierOrder.create({
      data: {
        ...req.body,
        orderNumber: `PO-${Date.now()}`,
        createdById: req.user!.id,
      },
    });
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: "Failed to create supplier order" });
  }
});

export default router;
