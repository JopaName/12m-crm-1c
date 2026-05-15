import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest, authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

function parsePermissions(role: any): string[] {
  return (role.permissions || []).map((p: any) => p.permission);
}

router.get("/", async (_req: AuthRequest, res: Response) => {
  const roles = await prisma.role.findMany({
    where: { isArchived: false },
    include: { _count: { select: { users: true } }, permissions: true },
    orderBy: { name: "asc" },
  });
  const mapped = roles.map((r) => ({
    ...r,
    permissions: parsePermissions(r),
  }));
  res.json(mapped);
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const role = await prisma.role.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { users: true } }, permissions: true },
  });
  if (!role || role.isArchived) {
    return res.status(404).json({ error: "Role not found" });
  }
  res.json({
    ...role,
    permissions: parsePermissions(role),
  });
});

async function setRolePermissions(roleId: string, permissions: string[]) {
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  if (permissions.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId, permission: p })),
    });
  }
}

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
      data: { name, description },
    });
    if (permissions) {
      await setRolePermissions(role.id, permissions);
    }
    const updated = await prisma.role.findUnique({
      where: { id: role.id },
      include: { permissions: true },
    });
    res.status(201).json({
      ...updated,
      permissions: parsePermissions(updated),
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

    await prisma.role.update({
      where: { id: req.params.id },
      data,
    });

    if (permissions) {
      await setRolePermissions(req.params.id, permissions);
    }

    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
      include: { permissions: true },
    });
    res.json({
      ...role,
      permissions: parsePermissions(role),
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
