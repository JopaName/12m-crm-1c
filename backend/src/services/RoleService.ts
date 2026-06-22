import { BaseService } from "./BaseService";
import { prisma } from "../db";

export class RoleService extends BaseService {
  constructor() {
    super({
      entityName: "Role",
      delegates: { Role: prisma.role },
      defaultInclude: { _count: { select: { users: true } }, permissions: true },
      audit: { create: true, update: true, delete: true, view: false, statusChange: false },
    });
  }

  private parsePermissions(role: any) {
    return (role.permissions || []).map((p: any) => p.permission);
  }

  async getAll(_userId: string, _roleName: string) {
    const roles = await prisma.role.findMany({
      where: { isArchived: false },
      include: { _count: { select: { users: true } }, permissions: true },
      orderBy: { name: "asc" },
    });
    return roles.map((r: any) => ({ ...r, permissions: this.parsePermissions(r) }));
  }

  async getById(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } }, permissions: true },
    });
    if (!role || role.isArchived) {
      const err: any = new Error("Role not found");
      err.statusCode = 404;
      throw err;
    }
    return { ...role, permissions: this.parsePermissions(role) };
  }

  async create(data: any, userId: string) {
    const { name, description, permissions } = data;
    if (!name) {
      const err: any = new Error("Name is required");
      err.statusCode = 400;
      throw err;
    }
    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) {
      const err: any = new Error("Role already exists");
      err.statusCode = 400;
      throw err;
    }
    const role = await prisma.role.create({ data: { name, description } });
    if (permissions) {
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      await prisma.rolePermission.createMany({ data: permissions.map((p: string) => ({ roleId: role.id, permission: p })) });
    }
    const updated = await prisma.role.findUnique({ where: { id: role.id }, include: { permissions: true } });
    return { ...updated, permissions: this.parsePermissions(updated) };
  }

  async update(id: string, data: any, _userId: string) {
    const { name, description, permissions } = data;
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    await prisma.role.update({ where: { id }, data: updateData });
    if (permissions) {
      await prisma.rolePermission.deleteMany({ where: { roleId: id } });
      await prisma.rolePermission.createMany({ data: permissions.map((p: string) => ({ roleId: id, permission: p })) });
    }
    const role = await prisma.role.findUnique({ where: { id }, include: { permissions: true } });
    return { ...role, permissions: this.parsePermissions(role) };
  }

  async archive(id: string, _userId: string) {
    const userCount = await prisma.user.count({ where: { roleId: id, isArchived: false } });
    if (userCount > 0) {
      const err: any = new Error(`Cannot archive role: ${userCount} user(s) still assigned`);
      err.statusCode = 400;
      throw err;
    }
    return prisma.role.update({ where: { id }, data: { isArchived: true } });
  }
}