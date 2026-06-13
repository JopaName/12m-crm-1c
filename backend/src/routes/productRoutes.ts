import { Router, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { ProductService } from "../services/ProductService";
import { createProductSchema } from "../validators";

const router = Router();
const service = new ProductService();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const products = await service.getAll("", "");
    res.json(products);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createProductSchema.parse(req.body);
    const product = await service.create(data, req.user!.id);
    res.status(201).json(product);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(500).json({ error: "Failed to create product" });
  }
});

router.get("/items", async (_req: AuthRequest, res: Response) => {
  try {
    const items = await service.getItems();
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch product items" });
  }
});

router.post("/items", async (req: AuthRequest, res: Response) => {
  try {
    const item = await service.createItem(req.body);
    res.status(201).json(item);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to create product item" });
  }
});

router.put("/items/:id/status", async (req: AuthRequest, res: Response) => {
  try {
    const item = await service.updateItemStatus(req.params.id, req.body.status);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to update item status" });
  }
});

export default router;