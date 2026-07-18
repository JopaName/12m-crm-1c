import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../db";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { WarehouseService } from "../services/WarehouseService";

const router = Router();
const service = new WarehouseService();

router.get("/", requirePermission("warehouse:view"), async (_req: AuthRequest, res: Response) => {
  try {
    const cells = await service.getAllCells();
    res.json(cells);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch warehouse data" });
  }
});

router.post("/movement", requirePermission("warehouse:create"), async (req: AuthRequest, res: Response) => {
  try {
    const movement = await service.createMovement(req.body);
    res.status(201).json(movement);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to create movement" });
  }
});


router.get("/categories", requirePermission("warehouse:view"), async (_req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.warehouseCategory.findMany({ where: { parentId: null }, include: { children: true } });
    res.json(categories);
  } catch (e: any) { res.status(500).json({ error: "Failed to fetch categories" }); }
});

router.post("/categories", requirePermission("warehouse:create"), async (req: AuthRequest, res: Response) => {
  try {
    const data: any = { ...req.body };
    if (!data.parentId) delete data.parentId;
    const cat = await prisma.warehouseCategory.create({ data });
    res.status(201).json(cat);
  } catch (e: any) { res.status(500).json({ error: "Failed to create category" }); }
});

router.put("/categories/:id", requirePermission("warehouse:edit"), async (req: AuthRequest, res: Response) => {
  try {
    const data: any = { ...req.body };
    if (data.parentId === "" || data.parentId === null || data.parentId === undefined) delete data.parentId;
    const cat = await prisma.warehouseCategory.update({ where: { id: req.params.id }, data });
    res.json(cat);
  } catch (e: any) { res.status(500).json({ error: "Failed to update category" }); }
});

router.delete("/categories/:id", requirePermission("warehouse:delete"), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.warehouseCategory.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: "Failed to delete category" }); }
});

router.get("/categories/:categoryId/items", requirePermission("warehouse:view"), async (req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.warehouseStockItem.findMany({ where: { categoryId: req.params.categoryId } });
    res.json(items);
  } catch (e: any) { res.status(500).json({ error: "Failed to fetch items" }); }
});

router.post("/categories/:categoryId/items", requirePermission("warehouse:create"), async (req: AuthRequest, res: Response) => {
  try {
    const data: any = { ...req.body, categoryId: req.params.categoryId };
    if (data.quantity !== undefined) data.quantity = Number(data.quantity);
    if (data.purchasePrice) data.purchasePrice = Number(data.purchasePrice);
    if (data.salePrice) data.salePrice = Number(data.salePrice);
    const item = await prisma.warehouseStockItem.create({ data });
    res.status(201).json(item);
  } catch (e: any) { res.status(500).json({ error: "Failed to create item" }); }
});

router.put("/items/:id", requirePermission("warehouse:edit"), async (req: AuthRequest, res: Response) => {
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

router.delete("/items/:id", requirePermission("warehouse:delete"), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.warehouseStockItem.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: "Failed to delete item" }); }
});

router.get("/stock-items", requirePermission("warehouse:view"), async (_req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.warehouseStockItem.findMany({
      where: { quantity: { gt: 0 } },
      include: { category: true },
      orderBy: { productName: "asc" },
    });
    res.json(items);
  } catch (e: any) { res.status(500).json({ error: "Failed to fetch stock items" }); }
});

router.get("/transfers", requirePermission("warehouse:view"), async (_req: any, res: Response) => {
  try {
    const transfers = await prisma.warehouseTransfer.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(transfers);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to fetch transfers" });
  }
});

// === Deal issuance (write-off) history ===
router.get("/issuance", requirePermission("warehouse:view"), async (_req: any, res: Response) => {
  try {
    const items = await prisma.dealOrderItem.findMany({
      where: { warehouseItemId: { not: null } },
      include: {
        order: { include: { deal: { select: { id: true, dealNumber: true, clientName: true, description: true } } } },
        warehouseItem: { select: { categoryId: true, productName: true, unit: true } },
      },
      orderBy: { order: { createdAt: "desc" } },
    });
    const result = items.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      dealNumber: item.order.deal?.dealNumber || "—",
      dealId: item.order.deal?.id,
      clientName: item.order.deal?.clientName || item.order.deal?.description || "—",
      createdAt: item.order.createdAt,
    }));
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to fetch issuance" });
  }
});

// === Receipt upload setup ===
const receiptsDir = path.join(__dirname, "../../uploads/receipts");
if (!fs.existsSync(receiptsDir)) { fs.mkdirSync(receiptsDir, { recursive: true }); }
const receiptUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, receiptsDir),
    filename: (_req, file, cb) => {
      const safeName = Buffer.from(file.originalname, "latin1").toString("utf8").replace(/[^a-zA-Z0-9а-яА-ЯёЁ._ -]/g, "_");
      cb(null, Date.now() + "-" + safeName);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Get receipt history for an item
router.get("/items/:id/receipts", requirePermission("warehouse:view"), async (req: AuthRequest, res: Response) => {
  try {
    const receipts = await prisma.warehouseReceipt.findMany({
      where: { itemId: req.params.id },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    res.json(receipts);
  } catch (e: any) { res.status(500).json({ error: "Failed to fetch receipts" }); }
});

// Create receipt (accept goods)
router.post("/items/:id/receipts", requirePermission("warehouse:create"), receiptUpload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    const quantity = parseFloat(req.body.quantity) || 0;
    if (quantity <= 0) return res.status(400).json({ error: "Quantity must be positive" });

    const item = await prisma.warehouseStockItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "Item not found" });

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    if (req.file) {
      fileName = Buffer.from(req.file.originalname, "latin1").toString("utf8");
      fileUrl = "/uploads/receipts/" + req.file.filename;
    }

    const receipt = await prisma.warehouseReceipt.create({
      data: {
        itemId: req.params.id,
        quantity,
        comment: req.body.comment || null,
        fileUrl,
        fileName,
        createdById: req.user!.id,
      },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    // Update item quantity
    await prisma.warehouseStockItem.update({
      where: { id: req.params.id },
      data: { quantity: { increment: quantity } },
    });

    res.status(201).json(receipt);
  } catch (e: any) { res.status(500).json({ error: e.message || "Failed to create receipt" }); }
});

// Get all receipts with item info
router.get("/receipts", requirePermission("warehouse:view"), async (req: AuthRequest, res: Response) => {
  try {
    const receipts = await prisma.warehouseReceipt.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        item: { select: { productName: true, unit: true, category: { select: { name: true } } } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      take: 100,
    });
    res.json(receipts);
  } catch (e: any) { res.status(500).json({ error: "Failed to fetch receipts" }); }
});

export default router;