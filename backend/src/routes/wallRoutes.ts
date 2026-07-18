import { Router, Response } from "express";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", requirePermission("chat:view"), asyncHandler(async (req, res) => {
    const posts = await prisma.wallPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true, position: true } } }
    });
    res.json(posts);
}));

router.post("/", requirePermission("chat:create"), asyncHandler(async (req, res) => {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Content is required" });
    }
    const post = await prisma.wallPost.create({
      data: { userId: req.user!.id, content: content.trim() },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true, position: true } } }
    });
    res.status(201).json(post);
}));

export default router;
