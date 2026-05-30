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
    const { productName, sku, description, quantity, unit, purchasePrice, salePrice, categoryTag, note } = req.body;
    const item = await prisma.warehouseStockItem.create({
      data: {
        categoryId: req.params.categoryId,
        productName,
        sku,
        description,
        quantity: parseFloat(quantity) || 0,
        unit: unit || "шт",
        purchasePrice: parseFloat(purchasePrice) || null,
        salePrice: parseFloat(salePrice) || null,
        categoryTag,
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
    const { productName, sku, description, quantity, unit, purchasePrice, salePrice, categoryTag, note } = req.body;
    const item = await prisma.warehouseStockItem.update({
      where: { id: req.params.id },
      data: {
        productName,
        sku,
        description,
        quantity: parseFloat(quantity) || 0,
        unit,
        purchasePrice: parseFloat(purchasePrice) || null,
        salePrice: parseFloat(salePrice) || null,
        categoryTag,
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

// === Transfers ===
router.post("/transfer", async (req: AuthRequest, res: Response) => {
  try {
    const { productItemId, quantity, fromCategoryId, toCategoryId, note } = req.body;
    const qty = parseFloat(quantity);

    // Get item
    const item = await prisma.warehouseStockItem.findUnique({ where: { id: productItemId } });
    if (!item) return res.status(404).json({ error: "Item not found" });
    if (item.quantity < qty) return res.status(400).json({ error: "Недостаточно товара" });

    // Create transfer record and update quantities
    const [transfer] = await prisma.$transaction([
      prisma.warehouseTransfer.create({
        data: {
          productItemId,
          productName: item.productName,
          quantity: qty,
          fromCategoryId,
          toCategoryId,
          note,
        },
      }),
      prisma.warehouseStockItem.update({
        where: { id: productItemId },
        data: { quantity: { decrement: qty } },
      }),
    ]);

    // Create or find item in target category
    const existing = await prisma.warehouseStockItem.findFirst({
      where: { categoryId: toCategoryId, productName: item.productName },
    });

    if (existing) {
      await prisma.warehouseStockItem.update({
        where: { id: existing.id },
        data: { quantity: { increment: qty } },
      });
    } else {
      await prisma.warehouseStockItem.create({
        data: {
          categoryId: toCategoryId,
          productName: item.productName,
          sku: item.sku,
          description: item.description,
          quantity: qty,
          unit: item.unit,
          purchasePrice: item.purchasePrice,
          salePrice: item.salePrice,
          categoryTag: item.categoryTag,
        },
      });
    }

    res.status(201).json(transfer);
  } catch (error) {
    res.status(500).json({ error: "Failed to transfer" });
  }
});

router.get("/transfers", async (_req: AuthRequest, res: Response) => {
  try {
    const transfers = await prisma.warehouseTransfer.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch transfers" });
  }
});

// Legacy routes (keep for compatibility)
router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const [movements, cells, balance] = await Promise.all([
      prisma.warehouseMovement.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.warehouseCell.findMany({ where: { isArchived: false } }),
      prisma.inventoryBalance.findMany({ include: { product: true } }),
    ]);
    res.json({ movements, cells, balance });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch warehouse data" });
  }
});

export default router;
