import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { isArchived: false },
      include: { client: true, deal: true, payments: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await prisma.invoice.create({
      data: {
        ...req.body,
        invoiceNumber: `INV-${Date.now()}`,
        status: "Draft",
      },
    });
    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

export default router;
