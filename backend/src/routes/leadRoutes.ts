import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";
import { createAuditLog } from "../utils/helpers";

const router = Router();

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const filter: any = { isArchived: false };
    if (req.user!.roleName === "Agent") {
      filter.assignedAgentId = req.user!.id;
    }
    const leads = await prisma.lead.findMany({
      where: filter,
      include: {
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true },
        },
        deal: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { clientName, clientPhone, clientEmail, source, notes } = req.body;
    const lead = await prisma.lead.create({
      data: {
        clientName,
        clientPhone,
        clientEmail,
        source,
        notes,
        assignedAgentId: req.user!.id,
        status: "New",
      },
    });

    await createAuditLog({
      entityType: "Lead",
      entityId: lead.id,
      action: "CREATE",
      userId: req.user!.id,
    });

    res.status(201).json(lead);
  } catch (error) {
    res.status(500).json({ error: "Failed to create lead" });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: req.body,
    });

    await createAuditLog({
      entityType: "Lead",
      entityId: lead.id,
      action: "UPDATE",
      userId: req.user!.id,
    });

    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: "Failed to update lead" });
  }
});

router.post("/:id/convert", async (req: AuthRequest, res: Response) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    let client = await prisma.client.findFirst({
      where: { phone: lead.clientPhone },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          name: lead.clientName,
          phone: lead.clientPhone,
          email: lead.clientEmail,
          createdById: req.user!.id,
        },
      });
    }

    const deal = await prisma.deal.create({
      data: {
        dealNumber: `D-${Date.now()}`,
        dealType: req.body.dealType || "Sale",
        status: "Lead_Created",
        clientId: client.id,
        responsibleAgentId: req.user!.id,
        expectedAmount: req.body.expectedAmount || 0,
        clientInn: req.body.clientInn,
      },
    });

    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "Converted" },
    });

    res.status(201).json({ client, deal });
  } catch (error) {
    res.status(500).json({ error: "Failed to convert lead" });
  }
});

export default router;
