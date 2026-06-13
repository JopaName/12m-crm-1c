import { BaseService } from "./BaseService";
import { prisma } from "../db";

export class IntegrationService extends BaseService {
  constructor() {
    super({
      entityName: "IntegrationLog",
      delegates: { IntegrationLog: prisma.integrationLog },
      audit: { create: false, update: false, delete: false, view: false, statusChange: false },
    });
  }

  async getLogs() {
    return prisma.integrationLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  }

  async createLog(data: any) {
    return prisma.integrationLog.create({ data });
  }
}