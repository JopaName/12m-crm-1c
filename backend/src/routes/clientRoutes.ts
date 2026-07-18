import { Router, Response } from "express";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { ClientService } from "../services/ClientService";
import { createClientSchema, updateClientSchema } from "../validators";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
const service = new ClientService();

router.get("/", requirePermission("clients:view"), asyncHandler(async (req, res) => {
    const clients = await service.getAll(req.user!.id, req.user!.roleName);
    res.json(clients);
}));

router.get("/:id", requirePermission("clients:view"), asyncHandler(async (req, res) => {
    const client = await service.getFullProfile(req.params.id, req.user!.id);
    res.json(client);
}));

router.post("/", requirePermission("clients:create"), asyncHandler(async (req, res) => {
    const data = createClientSchema.parse(req.body);
    const client = await service.create(data, req.user!.id);
    res.status(201).json(client);
}));

router.put("/:id", requirePermission("clients:edit"), asyncHandler(async (req, res) => {
    const data = updateClientSchema.parse(req.body);
    const client = await service.update(req.params.id, data, req.user!.id);
    res.json(client);
}));

router.delete("/:id", requirePermission("clients:delete"), asyncHandler(async (req, res) => {
    if (req.user!.roleName !== "Director" && req.user!.roleName !== "Owner") {
      return res.status(403).json({ error: "Only Director can delete clients" });
    }
    await service.archive(req.params.id, req.user!.id);
    res.json({ message: "Client archived" });
}));

export default router;