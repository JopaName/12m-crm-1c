import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { BaseService } from "./BaseService";
import { prisma } from "../db";
import { config } from "../config";

export class UserService extends BaseService {
  constructor() {
    super({
      entityName: "User",
      delegates: { User: prisma.user },
      defaultInclude: { role: true },
      audit: { create: true, update: true, delete: true, view: false, statusChange: false },
    });
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email }, include: { role: { include: { permissions: true } } } });
    if (!user || !user.isActive) {
      const err = new Error("Invalid credentials");
      (err as any).statusCode = 401;
      throw err;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const err = new Error("Invalid credentials");
      (err as any).statusCode = 401;
      throw err;
    }
    const token = jwt.sign(
      { userId: user.id, role: user.role.name },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any },
    );
    return {
      token,
      user: {
        id: user.id, email: user.email,
        firstName: user.firstName, lastName: user.lastName,
        role: { name: user.role.name, permissions: user.role.permissions || [] },
        permissions: (user.role.permissions || []).map((p: any) => p.permission),
      },
    };
  }

  async register(data: {
    email: string; password: string; firstName: string;
    lastName: string; phone?: string; roleId: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      const err = new Error("Email already exists");
      (err as any).statusCode = 400;
      throw err;
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    return prisma.user.create({
      data: { email: data.email, passwordHash, firstName: data.firstName, lastName: data.lastName, phone: data.phone, roleId: data.roleId },
      include: { role: true },
    });
  }

  async updateUser(id: string, data: any) {
    const updateData: any = { ...data };
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
      delete updateData.password;
    }
    return prisma.user.update({ where: { id }, data: updateData, include: { role: true } });
  }
}