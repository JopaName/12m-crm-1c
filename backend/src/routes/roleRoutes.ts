import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest, authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/", async (_req: AuthRequest, res: Response) => {
  const roles = await prisma.role.findMany({
    where: { isArchived: false },
    include: { _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });
  const mapped = roles.map((r) => ({
    ...r,
    permissions: r.permissions ? JSON.parse(r.permissions) : [],
  }));
  res.json(mapped);
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const role = await prisma.role.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { users: true } } },
  });
  if (!role || role.isArchived) {
    return res.status(404).json({ error: "Role not found" });
  }
  res.json({
    ...role,
    permissions: role.permissions ? JSON.parse(role.permissions) : [],
  });
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: "Role already exists" });
    }
    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissions: permissions ? JSON.stringify(permissions) : "[]",
      },
    });
    res.status(201).json({
      ...role,
      permissions: JSON.parse(role.permissions || "[]"),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create role" });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, permissions } = req.body;
    const data: any = {};
    if (name) data.name = name;
    if (description !== undefined) data.description = description;
    if (permissions) data.permissions = JSON.stringify(permissions);

    const role = await prisma.role.update({
      where: { id: req.params.id },
      data,
    });
    res.json({
      ...role,
      permissions: JSON.parse(role.permissions || "[]"),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update role" });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userCount = await prisma.user.count({
      where: { roleId: req.params.id, isArchived: false },
    });
    if (userCount > 0) {
      return res.status(400).json({
        error: `Cannot archive role: ${userCount} user(s) still assigned`,
      });
    }
    await prisma.role.update({
      where: { id: req.params.id },
      data: { isArchived: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to archive role" });
  }
});

export default router;
