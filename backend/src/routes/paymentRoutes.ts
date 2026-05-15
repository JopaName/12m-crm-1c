import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { isArchived: false },
      include: { client: true, invoice: true, deal: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const payment = await prisma.payment.create({
      data: {
        ...req.body,
        paymentNumber: `PAY-${Date.now()}`,
        status: "Pending",
      },
    });
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: "Failed to create payment" });
  }
});

router.put("/:id/confirm", async (req: AuthRequest, res: Response) => {
  try {
    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        status: "Confirmed",
        confirmedById: req.user!.id,
        paidAt: new Date(),
      },
    });
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: "Failed to confirm payment" });
  }
});

export default router;
