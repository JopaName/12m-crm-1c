import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../index";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    roleId: string;
    roleName: string;
  };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
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
    };

    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.roleName)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
