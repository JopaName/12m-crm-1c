import { Router, Response } from "express";
import { prisma } from "../db";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "secret";
import { v4 as uuid } from "uuid";

const router = Router();

// ─── PUBLIC: Referral Registration ───
router.post("/register", async (req, res: Response) => {
  try {
    const { email, password, firstName, lastName, referralCode } = req.body;
    if (!email || !password || !firstName || !referralCode) {
      return res.status(400).json({ error: "email, password, firstName, referralCode required" });
    }

    // Validate referral code
    const referrer = await prisma.user.findFirst({ where: { referralCode, isActive: true, isArchived: false } });
    if (!referrer) {
      return res.status(400).json({ error: "Недействительная реферальная ссылка" });
    }

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email уже занят" });
    }

    // Find default role (or "Отдел продаж")
    let role = await prisma.role.findFirst({ where: { name: "Отдел продаж" } });
    if (!role) role = await prisma.role.findFirst();
    if (!role) return res.status(500).json({ error: "No roles configured" });

    const passwordHash = await bcrypt.hash(password, 10);
    const newCode = uuid().replace(/-/g, "").slice(0, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName: lastName || "",
        roleId: role.id,
        referrerId: referrer.id,
        referralCode: newCode,
        isActive: true,
      },
      select: { id: true, email: true, firstName: true, lastName: true, referralCode: true, referrerId: true, roleId: true },
    });

    const token = jwt.sign({ userId: user.id, email: user.email, roleId: user.roleId }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ token, user });
  } catch (e: any) {
    console.error("Referral register error:", e.message);
    res.status(500).json({ error: "Ошибка регистрации" });
  }
});

// ─── GET: Team Tree (3 levels down) ───
router.get("/tree", authMiddleware, requirePermission("users:view"), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Level 1: direct referrals
    const level1 = await prisma.user.findMany({
      where: { referrerId: userId, isArchived: false },
      select: { id: true, email: true, firstName: true, lastName: true, referralCode: true, isActive: true },
    });

    // Level 2: referrals of referrals
    const l1Ids = level1.map(u => u.id);
    const level2 = l1Ids.length > 0 ? await prisma.user.findMany({
      where: { referrerId: { in: l1Ids }, isArchived: false },
      select: { id: true, email: true, firstName: true, lastName: true, referralCode: true, referrerId: true, isActive: true },
    }) : [];

    // Level 3
    const l2Ids = level2.map(u => u.id);
    const level3 = l2Ids.length > 0 ? await prisma.user.findMany({
      where: { referrerId: { in: l2Ids }, isArchived: false },
      select: { id: true, email: true, firstName: true, lastName: true, referralCode: true, referrerId: true, isActive: true },
    }) : [];

    // Get sales stats for all users in tree
    const allIds = [userId, ...l1Ids, ...l2Ids, ...level3.map(u => u.id)];
    const deals = await prisma.deal.findMany({
      where: { responsibleAgentId: { in: allIds }, status: "Deal_Closed", isArchived: false },
      select: { responsibleAgentId: true, expectedAmount: true },
    });

    const salesByUser: Record<string, { count: number; total: number }> = {};
    deals.forEach(d => {
      if (!salesByUser[d.responsibleAgentId]) salesByUser[d.responsibleAgentId] = { count: 0, total: 0 };
      salesByUser[d.responsibleAgentId].count++;
      salesByUser[d.responsibleAgentId].total += d.expectedAmount || 0;
    });

    const buildNode = (u: any, children: any[]) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      active: u.isActive,
      sales: salesByUser[u.id] || { count: 0, total: 0 },
      children,
    });

    const tree = level1.map(u => {
      const l2Children = level2.filter(l2 => l2.referrerId === u.id);
      return buildNode(u, l2Children.map(l2 => {
        const l3Children = level3.filter(l3 => l3.referrerId === l2.id);
        return buildNode(l2, l3Children.map(l3 => buildNode(l3, [])));
      }));
    });

    // Get my own stats
    const mySales = salesByUser[userId] || { count: 0, total: 0 };
    const myReferrer = await prisma.user.findUnique({ where: { id: req.user!.referrerId || "" }, select: { firstName: true, lastName: true } }).catch(() => null);

    res.json({
      user: { id: userId, name: `${req.user!.firstName} ${req.user!.lastName}`, sales: mySales },
      referrer: myReferrer ? `${myReferrer.firstName} ${myReferrer.lastName}` : null,
      tree,
      totalReferrals: level1.length + level2.length + level3.length,
    });
  } catch (e: any) {
    console.error("Tree error:", e.message);
    res.status(500).json({ error: "Failed to fetch tree" });
  }
});

// ─── GET: My Sales ───
router.get("/my-sales", authMiddleware, requirePermission("users:view"), async (req: AuthRequest, res: Response) => {
  try {
    const deals = await prisma.deal.findMany({
      where: { responsibleAgentId: req.user!.id, isArchived: false },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, dealNumber: true, expectedAmount: true, status: true, createdAt: true, client: { select: { name: true } } },
    });
    const total = deals.reduce((s, d) => s + (d.expectedAmount || 0), 0);
    res.json({ deals, stats: { count: deals.length, total, avg: deals.length > 0 ? total / deals.length : 0 } });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

// ─── GET: Referral Earnings ───
router.get("/earnings", authMiddleware, requirePermission("users:view"), async (req: AuthRequest, res: Response) => {
  try {
    const earnings = await prisma.referralEarning.findMany({
      where: { earnerId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const total = earnings.reduce((s, e) => s + e.amount, 0);
    const byLevel: Record<number, number> = { 1: 0, 2: 0 };
    earnings.forEach(e => { byLevel[e.level] = (byLevel[e.level] || 0) + e.amount; });
    res.json({ earnings, total, byLevel });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch earnings" });
  }
});

// ─── GET: Invite Link ───
router.get("/invite-link", authMiddleware, requirePermission("users:view"), async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { referralCode: true } });
    if (!user?.referralCode) {
      // Generate if missing
      const code = uuid().replace(/-/g, "").slice(0, 12);
      await prisma.user.update({ where: { id: req.user!.id }, data: { referralCode: code } });
      return res.json({ referralCode: code, link: `${process.env.FRONTEND_URL || "http://95.81.114.106"}/register?ref=${code}` });
    }
    res.json({ referralCode: user.referralCode, link: `${process.env.FRONTEND_URL || "http://95.81.114.106"}/register?ref=${user.referralCode}` });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to get invite link" });
  }
});

// ─── GET: Commission Config (admin) ───
router.get("/config", authMiddleware, requirePermission("users:view"), async (req: AuthRequest, res: Response) => {
  try {
    const configs = await prisma.referralCommissionConfig.findMany({ orderBy: { level: "asc" } });
    res.json(configs);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch config" });
  }
});

// ─── PUT: Update Commission Config (admin) ───
router.put("/config", authMiddleware, requirePermission("users:edit"), async (req: AuthRequest, res: Response) => {
  try {
    const { level, percentage, isActive } = req.body;
    const existing = await prisma.referralCommissionConfig.findUnique({ where: { level } });
    if (existing) {
      const updated = await prisma.referralCommissionConfig.update({ where: { level }, data: { percentage, isActive } });
      return res.json(updated);
    }
    const created = await prisma.referralCommissionConfig.create({ data: { level, percentage, isActive } });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to update config" });
  }
});

export default router;