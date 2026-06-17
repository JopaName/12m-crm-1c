import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { AuthRequest, authMiddleware } from "../middleware/auth";
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

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
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

router.get("/users", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const users = await service.getAll(req.user!.id, req.user!.roleName);
    res.json(users);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/roles", authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const roles = await prisma.role.findMany({ where: { isArchived: false } });
    res.json(roles);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

router.post("/register", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);
    const user = await service.register(data);
    res.status(201).json(user);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to create user" });
  }
});

router.put("/users/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = updateUserSchema.parse(req.body);
    const user = await service.updateUser(req.params.id, data);
    res.json(user);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to update user" });
  }
});

router.delete("/users/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
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