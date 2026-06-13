import { Router, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { PaymentService } from "../services/PaymentService";
import { createPaymentSchema } from "../validators";

const router = Router();
const service = new PaymentService();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const payments = await service.getAll("", "");
    res.json(payments);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createPaymentSchema.parse(req.body);
    const payment = await service.create(data, req.user!.id);
    res.status(201).json(payment);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(500).json({ error: "Failed to create payment" });
  }
});

router.put("/:id/confirm", async (req: AuthRequest, res: Response) => {
  try {
    const payment = await service.confirm(req.params.id, req.user!.id);
    res.json(payment);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to confirm payment" });
  }
});

export default router;