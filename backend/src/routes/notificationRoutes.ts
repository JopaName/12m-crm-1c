import { Router, Response } from "express";
import { prisma } from "../db";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", requirePermission("chat:view"), asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: req.user!.id },
      }),
    ]);

    res.json({ notifications, total, page, limit });
}));



router.get("/preferences", requirePermission("chat:view"), asyncHandler(async (req, res) => {
    const prefs = await prisma.notificationPreference.findMany({
      where: { userId: req.user!.id },
    });
    res.json(prefs);
}));

router.put("/preferences", requirePermission("chat:edit"), asyncHandler(async (req, res) => {
    const { type, enabled } = req.body;
    const pref = await prisma.notificationPreference.upsert({
      where: { userId_type: { userId: req.user!.id, type } },
      update: { enabled },
      create: { userId: req.user!.id, type, enabled },
    });
    res.json(pref);
}));
router.get("/unread-count", requirePermission("chat:view"), asyncHandler(async (req, res) => {
    const count = await prisma.notification.count({
      where: { userId: req.user!.id, isRead: false },
    });
    res.json({ count });
}));

router.patch("/:id/read", requirePermission("chat:edit"), asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { isRead: true },
    });
    res.json({ success: true });
}));

router.patch("/read-all", requirePermission("chat:edit"), asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
}));

export default router;
