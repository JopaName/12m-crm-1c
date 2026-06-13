import { BaseService } from "./BaseService";
import { prisma } from "../db";

export class AuditService extends BaseService {
  constructor() {
    super({
      entityName: "AuditLog",
      delegates: { AuditLog: prisma.auditLog },
      defaultInclude: { user: { select: { firstName: true, lastName: true } } },
      defaultOrderBy: { createdAt: "desc" },
      audit: { create: false, update: false, delete: false, view: false, statusChange: false },
    });
  }


  async getAll(userId: string, roleName: string, additionalWhere: any = {}) {
    return this.delegate.findMany({
      where: additionalWhere,
      include: this.defaultInclude,
      orderBy: this.defaultOrderBy,
      take: 200,
    });
  }

  async getByEntity(entityType: string, entityId: string) {
    return prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { firstName: true, lastName: true } } },
      take: 500,
    });
  }
}