import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { logError } from "../utils/logger";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    roleId: string;
    roleName: string;
    firstName: string;
    lastName: string;
    apiKey: string | null;
  };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "") || (req.query.token as string);
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secret",
    ) as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User not found or inactive" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
      firstName: user.firstName,
      lastName: user.lastName,
      apiKey: user.apiKey || null,
    };

    next();
  } catch (error) {
    logError("Auth middleware error", { stack: (error as any)?.stack, source: "auth" });
    res.status(401).json({ error: "Invalid token" });
  }
}

// Permission-based access control
const PERMISSION_CACHE = new Map<string, string[]>();
const PERMISSION_CACHE_TTL = 30_000;

async function getCachedPermissions(roleId: string): Promise<string[]> {
  const cached = PERMISSION_CACHE.get(roleId);
  if (cached) return cached;
  const { prisma } = await import("../db");
  const rolePerms = await prisma.rolePermission.findMany({
    where: { roleId },
    select: { permission: true },
  });
  const perms = rolePerms.map((p: any) => p.permission);
  PERMISSION_CACHE.set(roleId, perms);
  setTimeout(() => PERMISSION_CACHE.delete(roleId), PERMISSION_CACHE_TTL);
  return perms;
}

export function requirePermission(...requiredPerms: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });
      const userPerms = await getCachedPermissions(req.user.roleId);
      const hasPermission = requiredPerms.some((p) => userPerms.includes(p));
      if (!hasPermission) {
        return res.status(403).json({
          error: "Insufficient permissions",
          required: requiredPerms,
        });
      }
      next();
    } catch (error) {
      res.status(500).json({ error: "Permission check failed" });
    }
  };
}

export function requireAllPermissions(...requiredPerms: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });
      const userPerms = await getCachedPermissions(req.user.roleId);
      const missing = requiredPerms.filter((p) => !userPerms.includes(p));
      if (missing.length > 0) {
        return res.status(403).json({
          error: "Insufficient permissions",
          missing,
        });
      }
      next();
    } catch (error) {
      res.status(500).json({ error: "Permission check failed" });
    }
  };
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.roleName)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}