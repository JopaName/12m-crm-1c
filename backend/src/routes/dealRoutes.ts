import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";
import { createAuditLog } from "../utils/helpers";

const router = Router();

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const filter: any = { isArchived: false };
    if (req.user!.roleName === "Agent") {
      filter.responsibleAgentId = req.user!.id;
    }
    const deals = await prisma.deal.findMany({
      where: filter,
      include: {
        client: true,
        responsibleAgent: {
          select: { id: true, firstName: true, lastName: true },
        },
        project: true,
        rentContract: true,
        invoices: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(deals);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch deals" });
  }
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        responsibleAgent: true,
        project: {
          include: { specification: { include: { products: true } } },
        },
        rentContract: true,
        legalDocuments: true,
        invoices: true,
        payments: true,
        productionOrders: true,
        installationTasks: { include: { calendarEvents: true } },
        serviceCases: true,
        commissions: true,
      },
    });
    if (!deal) return res.status(404).json({ error: "Deal not found" });
    res.json(deal);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch deal" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, clientInn, dealType, expectedAmount, description } =
      req.body;
    if (!clientInn) {
      return res.status(400).json({ error: "Client INN is required" });
    }
    const deal = await prisma.deal.create({
      data: {
        dealNumber: `D-${Date.now()}`,
        dealType,
        status: "Lead_Created",
        clientId,
        clientInn,
        responsibleAgentId: req.user!.id,
        expectedAmount,
        description,
      },
    });
    res.status(201).json(deal);
  } catch (error) {
    res.status(500).json({ error: "Failed to create deal" });
  }
});

router.put("/:id/status", async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const old = await prisma.deal.findUnique({ where: { id: req.params.id } });
    if (!old) return res.status(404).json({ error: "Deal not found" });

    const deal = await prisma.deal.update({
      where: { id: req.params.id },
      data: { status },
    });

    await createAuditLog({
      entityType: "Deal",
      entityId: deal.id,
      action: "STATUS_CHANGE",
      userId: req.user!.id,
      oldValue: { status: old.status },
      newValue: { status },
    });

    res.json(deal);
  } catch (error) {
    res.status(500).json({ error: "Failed to update deal status" });
  }
});

export default router;
