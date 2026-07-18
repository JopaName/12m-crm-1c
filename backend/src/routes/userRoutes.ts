import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { UserService } from "../services/UserService";
import { loginSchema, createUserSchema, updateUserSchema } from "../validators";
import { authLimiter } from "../middleware/rateLimiter";

const router = Router();
const service = new UserService();

router.post("/login", authLimiter, async (req, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await service.login(email, password);
    res.json(result);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(e.statusCode || 500).json({ error: e.message || "Login failed" });
  }
});

router.get("/me", authMiddleware, requirePermission("users:view"), async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { role: { include: { permissions: true } } },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      ...user,
      permissions: user.role?.permissions?.map((p) => p.permission) || [],
      role: { name: user.role?.name, permissions: user.role?.permissions || [] },
    });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

router.get("/users", authMiddleware, requirePermission("users:view"), async (req: AuthRequest, res: Response) => {
  try {
    const q = req.query.q as string;
    const additionalWhere: any = {};
    if (q && q.trim()) {
      const query = q.trim();
      additionalWhere.OR = [
        { firstName: { contains: query } },
        { lastName: { contains: query } },
        { email: { contains: query } },
      ];
    }
    const users = await service.getAll(req.user!.id, req.user!.roleName, additionalWhere);
    res.json(users);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/users/:id", authMiddleware, requirePermission("users:view"), async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { role: { include: { permissions: true } } },
    });
    if (!user || user.isArchived) return res.status(404).json({ error: "User not found" });
    const { passwordHash, apiKey, ...safe } = user;
    res.json(safe);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

router.get("/roles", authMiddleware, requirePermission("users:view"), async (_req: AuthRequest, res: Response) => {
  try {
    const roles = await prisma.role.findMany({ where: { isArchived: false } });
    res.json(roles);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

router.post("/register", authMiddleware, requirePermission("users:create"), async (req: AuthRequest, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);
    const user = await service.register(data);
    res.status(201).json(user);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to create user" });
  }
});

router.put("/users/:id", authMiddleware, requirePermission("users:edit"), async (req: AuthRequest, res: Response) => {
  try {
    const data = updateUserSchema.parse(req.body);
    const user = await service.updateUser(req.params.id, data);
    res.json(user);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to update user" });
  }
});

router.delete("/users/:id", authMiddleware, requirePermission("users:delete"), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isArchived: true, isActive: false },
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to archive user" });
  }
});

export default router;