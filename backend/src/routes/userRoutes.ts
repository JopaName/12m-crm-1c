import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../index";
import { AuthRequest, authMiddleware } from "../middleware/auth";

const router = Router();

router.post("/login", async (req, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role.name },
      process.env.JWT_SECRET || "secret",
      { expiresIn: (process.env.JWT_EXPIRES_IN || "24h") as any },
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { role: true },
  });
  res.json(user);
});

router.get(
  "/users",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const users = await prisma.user.findMany({
      where: { isArchived: false },
      include: { role: true },
    });
    res.json(users);
  },
);

router.get(
  "/roles",
  authMiddleware,
  async (_req: AuthRequest, res: Response) => {
    const roles = await prisma.role.findMany({
      where: { isArchived: false },
    });
    res.json(roles);
  },
);

router.post(
  "/register",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { email, password, firstName, lastName, phone, roleId } = req.body;
      if (!email || !password || !firstName || !lastName || !roleId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, passwordHash, firstName, lastName, phone, roleId },
        include: { role: true },
      });

      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  },
);

router.put(
  "/users/:id",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { email, firstName, lastName, phone, roleId, password, isActive } =
        req.body;

      const data: any = {};
      if (email) data.email = email;
      if (firstName) data.firstName = firstName;
      if (lastName) data.lastName = lastName;
      if (phone !== undefined) data.phone = phone;
      if (roleId) data.roleId = roleId;
      if (isActive !== undefined) data.isActive = isActive;
      if (password) data.passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.update({
        where: { id },
        data,
        include: { role: true },
      });

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  },
);

router.delete(
  "/users/:id",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await prisma.user.update({
        where: { id },
        data: { isArchived: true, isActive: false },
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to archive user" });
    }
  },
);

export default router;
