import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isArchived: false },
      include: { _count: { select: { items: true } } },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.product.create({ data: req.body });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: "Failed to create product" });
  }
});

router.get("/items", async (_req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.productItem.findMany({
      where: { isArchived: false },
      include: { product: true, warehouseCell: true },
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch product items" });
  }
});

router.post("/items", async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.productItem.create({
      data: { ...req.body, status: "Stock" },
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: "Failed to create product item" });
  }
});

router.put("/items/:id/status", async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.productItem.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: "Failed to update item status" });
  }
});

export default router;
