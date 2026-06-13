import { BaseService } from "./BaseService";
import { prisma } from "../db";

export class WarehouseService extends BaseService {
  constructor() {
    super({
      entityName: "WarehouseCell",
      delegates: { WarehouseCell: prisma.warehouseCell },
      audit: { create: false, update: false, delete: false, view: false, statusChange: false },
    });
  }

  async getAllCells() {
    return prisma.warehouseCell.findMany({
      where: { isArchived: false },
      include: { items: { where: { isArchived: false }, include: { product: true } } },
    });
  }

  async createMovement(data: any) {
    return prisma.warehouseMovement.create({ data });
  }
}