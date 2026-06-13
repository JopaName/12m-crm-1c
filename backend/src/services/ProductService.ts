import { BaseService } from "./BaseService";
import { prisma } from "../db";

export class ProductService extends BaseService {
  constructor() {
    super({
      entityName: "Product",
      delegates: { Product: prisma.product },
      defaultInclude: { _count: { select: { items: true } } },
    });
  }

  async getItems() {
    return prisma.productItem.findMany({
      where: { isArchived: false },
      include: { product: true, warehouseCell: true },
    });
  }

  async createItem(data: any) {
    return prisma.productItem.create({ data: { ...data, status: "Stock" } });
  }

  async updateItemStatus(id: string, status: string) {
    return prisma.productItem.update({ where: { id }, data: { status } });
  }
}