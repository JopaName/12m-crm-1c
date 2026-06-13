import { BaseService } from "./BaseService";
import { prisma } from "../db";

export class DealService extends BaseService {
  constructor() {
    super({
      entityName: "Deal",
      delegates: { Deal: prisma.deal },
      defaultInclude: {
        client: true,
        responsibleAgent: { select: { id: true, firstName: true, lastName: true } },
        project: true, rentContract: true, invoices: true, payments: true,
      },
      rowLevelFilter: (roleName, userId) =>
        roleName === "Agent" ? { responsibleAgentId: userId } : {},
    });
  }

  async getFullDetails(id: string) {
    return this.getById(id, undefined, {
      client: true, responsibleAgent: true,
      project: { include: { specification: { include: { products: true } } } },
      rentContract: true, legalDocuments: true, invoices: true, payments: true,
      productionOrders: true,
      installationTasks: { include: { calendarEvents: true } },
      serviceCases: true, commissions: true,
    });
  }
}