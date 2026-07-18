import { Router, Response } from "express";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { ProductService } from "../services/ProductService";
import { createProductSchema } from "../validators";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
const service = new ProductService();

router.get("/", requirePermission("products:view"), asyncHandler(async (_req, res) => {
    const products = await service.getAll("", "");
    res.json(products);
}));

router.post("/", requirePermission("products:create"), asyncHandler(async (req, res) => {
    const data = createProductSchema.parse(req.body);
    const product = await service.create(data, req.user!.id);
    res.status(201).json(product);
}));

router.get("/items", requirePermission("products:view"), asyncHandler(async (_req, res) => {
    const items = await service.getItems();
    res.json(items);
}));

router.post("/items", requirePermission("products:create"), asyncHandler(async (req, res) => {
    const item = await service.createItem(req.body);
    res.status(201).json(item);
}));

router.put("/items/:id/status", requirePermission("products:edit"), asyncHandler(async (req, res) => {
    const item = await service.updateItemStatus(req.params.id, req.body.status);
    res.json(item);
}));

export default router;