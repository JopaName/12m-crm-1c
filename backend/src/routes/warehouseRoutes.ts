import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";

const router = Router();

// === Categories ===
router.get("/categories", async (_req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.warehouseCategory.findMany({
      include: { children: true, _count: { select: { items: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.post("/categories", async (req: AuthRequest, res: Response) => {
  try {
    const { name, parentId } = req.body;
    const category = await prisma.warehouseCategory.create({
      data: { name, parentId: parentId || null },
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: "Failed to create category" });
  }
});

router.put("/categories/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { name, parentId } = req.body;
    const category = await prisma.warehouseCategory.update({
      where: { id: req.params.id },
      data: { name, parentId: parentId || null },
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: "Failed to update category" });
  }
});

router.delete("/categories/:id", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.warehouseStockItem.deleteMany({ where: { categoryId: req.params.id } });
    await prisma.warehouseCategory.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// === Stock Items ===
router.get("/categories/:categoryId/items", async (req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.warehouseStockItem.findMany({
      where: { categoryId: req.params.categoryId },
      orderBy: { productName: "asc" },
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

router.post("/categories/:categoryId/items", async (req: AuthRequest, res: Response) => {
  try {
    const { productName, quantity, unit, note } = req.body;
    const item = await prisma.warehouseStockItem.create({
      data: {
        categoryId: req.params.categoryId,
        productName,
        quantity: parseFloat(quantity) || 0,
        unit: unit || "шт",
        note,
      },
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: "Failed to create item" });
  }
});

router.put("/items/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { productName, quantity, unit, note } = req.body;
    const item = await prisma.warehouseStockItem.update({
      where: { id: req.params.id },
      data: {
        productName,
        quantity: parseFloat(quantity) || 0,
        unit,
        note,
      },
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: "Failed to update item" });
  }
});

router.delete("/items/:id", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.warehouseStockItem.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete item" });
  }
});

// Legacy routes
router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const [movements, cells, balance] = await Promise.all([
      prisma.warehouseMovement.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          productItem: { include: { product: true } },
          createdBy: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.warehouseCell.findMany({ where: { isArchived: false } }),
      prisma.inventoryBalance.findMany({ include: { product: true } }),
    ]);
    res.json({ movements, cells, balance });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch warehouse data" });
  }
});

router.post("/movement", async (req: AuthRequest, res: Response) => {
  try {
    const movement = await prisma.warehouseMovement.create({
      data: { ...req.body, createdById: req.user!.id },
    });
    res.status(201).json(movement);
  } catch (error) {
    res.status(500).json({ error: "Failed to create movement" });
  }
});

export default router;
