import { BaseService } from "./BaseService";
import { prisma } from "../db";

export class RentService extends BaseService {
  constructor() {
    super({
      entityName: "RentContract",
      delegates: { RentContract: prisma.rentContract },
      defaultInclude: { client: true, equipment: { include: { product: true } }, billingRecords: { orderBy: { period: "desc" } } },
    });
  }

  async create(data: any, _userId: string) {
    const { equipmentIds, ...contractData } = data;
    return prisma.rentContract.create({
      data: { ...contractData, contractNumber: `R-${Date.now()}`, status: "Active", equipment: { connect: equipmentIds?.map((id: string) => ({ id })) || [] } },
    });
  }

  async getBilling() {
    return prisma.billingRecord.findMany({ orderBy: { period: "desc" }, include: { rentContract: { include: { client: true } } } });
  }
}