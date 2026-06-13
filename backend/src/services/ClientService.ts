import { BaseService } from "./BaseService";
import { prisma } from "../db";

export class ClientService extends BaseService {
  constructor() {
    super({
      entityName: "Client",
      delegates: { Client: prisma.client },
      defaultInclude: {
        leads: true, deals: true, rentContracts: true,
        invoices: { take: 5, orderBy: { createdAt: "desc" } },
      },
      rowLevelFilter: (roleName, _userId) =>
        roleName === "Agent" ? { createdById: _userId } : {},
    });
  }

  async getFullProfile(id: string, userId: string) {
    return this.getById(id, userId, {
      leads: { orderBy: { createdAt: "desc" } },
      deals: {
        include: { project: true, rentContract: true, invoices: true, installationTasks: true },
        orderBy: { createdAt: "desc" },
      },
      rentContracts: { orderBy: { createdAt: "desc" } },
      legalDocuments: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      payments: { orderBy: { createdAt: "desc" } },
      serviceCases: { orderBy: { createdAt: "desc" } },
    });
  }
}