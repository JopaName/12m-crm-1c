import { Router, Response } from "express";
import { prisma } from "../db";
import { AuthRequest } from "../middleware/auth";
import { WarehouseService } from "../services/WarehouseService";

const router = Router();
const service = new WarehouseService();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const cells = await service.getAllCells();
    res.json(cells);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch warehouse data" });
  }
});

router.post("/movement", async (req: AuthRequest, res: Response) => {
  try {
    const movement = await service.createMovement(req.body);
    res.status(201).json(movement);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to create movement" });
  }
});


router.get("/categories", async (_req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.warehouseCategory.findMany({ where: { parentId: null }, include: { children: true } });
    res.json(categories);
  } catch (e: any) { res.status(500).json({ error: "Failed to fetch categories" }); }
});

router.post("/categories", async (req: AuthRequest, res: Response) => {
  try {
    const data: any = { ...req.body };
    if (!data.parentId) delete data.parentId;
    const cat = await prisma.warehouseCategory.create({ data });
    res.status(201).json(cat);
  } catch (e: any) { res.status(500).json({ error: "Failed to create category" }); }
});

router.put("/categories/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data: any = { ...req.body };
    if (data.parentId === "" || data.parentId === null || data.parentId === undefined) delete data.parentId;
    const cat = await prisma.warehouseCategory.update({ where: { id: req.params.id }, data });
    res.json(cat);
  } catch (e: any) { res.status(500).json({ error: "Failed to update category" }); }
});

router.delete("/categories/:id", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.warehouseCategory.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: "Failed to delete category" }); }
});

router.get("/categories/:categoryId/items", async (req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.warehouseStockItem.findMany({ where: { categoryId: req.params.categoryId } });
    res.json(items);
  } catch (e: any) { res.status(500).json({ error: "Failed to fetch items" }); }
});

router.post("/categories/:categoryId/items", async (req: AuthRequest, res: Response) => {
  try {
    const data: any = { ...req.body, categoryId: req.params.categoryId };
    if (data.quantity !== undefined) data.quantity = Number(data.quantity);
    if (data.purchasePrice) data.purchasePrice = Number(data.purchasePrice);
    if (data.salePrice) data.salePrice = Number(data.salePrice);
    const item = await prisma.warehouseStockItem.create({ data });
    res.status(201).json(item);
  } catch (e: any) { res.status(500).json({ error: "Failed to create item" }); }
});

router.put("/items/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data: any = { ...req.body };
    // Coerce numeric fields from string to number
    if (data.quantity !== undefined) data.quantity = Number(data.quantity);
    if (data.purchasePrice !== undefined && data.purchasePrice !== "") data.purchasePrice = Number(data.purchasePrice);
    if (data.salePrice !== undefined && data.salePrice !== "") data.salePrice = Number(data.salePrice);
    // Remove categoryId — relation field shouldn't be updated directly
    delete data.categoryId;
    const item = await prisma.warehouseStockItem.update({ where: { id: req.params.id }, data });
    res.json(item);
  } catch (e: any) { res.status(500).json({ error: "Failed to update item" }); }
});

router.delete("/items/:id", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.warehouseStockItem.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: "Failed to delete item" }); }
});

router.get("/transfers", async (_req: any, res: Response) => {
  try {
    const transfers = await prisma.warehouseTransfer.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(transfers);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to fetch transfers" });
  }
});

export default router;