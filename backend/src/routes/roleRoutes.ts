import { Router, Response } from "express";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { RoleService } from "../services/RoleService";
import { createRoleSchema, updateRoleSchema } from "../validators";

const router = Router();
router.use(authMiddleware);
const service = new RoleService();

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const roles = await service.getAll(req.user!.id, req.user!.roleName);
    res.json(roles);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const role = await service.getById(req.params.id);
    res.json(role);
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to fetch role" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createRoleSchema.parse(req.body);
    const role = await service.create(data, req.user!.id);
    res.status(201).json(role);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to create role" });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateRoleSchema.parse(req.body);
    const role = await service.update(req.params.id, data, req.user!.id);
    res.json(role);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to update role" });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    await service.archive(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to archive role" });
  }
});

export default router;