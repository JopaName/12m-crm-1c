import { BaseService } from "./BaseService";
import { prisma } from "../db";
import { autoCalculateProductionCost } from "./salaryService";

export class ProductionService extends BaseService {
  constructor() {
    super({
      entityName: "ProductionOrder",
      delegates: { ProductionOrder: prisma.productionOrder },
      defaultInclude: { deal: { include: { client: true, responsibleAgent: true } }, productionRoute: { include: { steps: { orderBy: { orderIndex: "asc" } } } }, defectRecords: true },
    });
  }

  async create(data: any, _userId: string) {
    return prisma.productionOrder.create({ data: { dealId: data.dealId, productionRouteId: data.productionRouteId || null, status: "New" } });
  }

  async updateStatus(id: string, status: string, _userId: string) {
    await prisma.productionOrder.update({ where: { id }, data: { status } });
    if (status === "Completed") await autoCalculateProductionCost(id).catch(() => {});
    return prisma.productionOrder.findUnique({ where: { id }, include: { productionRoute: true } });
  }

  async getRoutes() {
    return prisma.productionRoute.findMany({ where: { isArchived: false } });
  }
}