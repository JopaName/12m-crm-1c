import { Router, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { InvoiceService } from "../services/InvoiceService";
import { createInvoiceSchema } from "../validators";

const router = Router();
const service = new InvoiceService();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const invoices = await service.getAll("", "");
    res.json(invoices);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createInvoiceSchema.parse(req.body);
    const invoice = await service.create(data, req.user!.id);
    res.status(201).json(invoice);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

export default router;