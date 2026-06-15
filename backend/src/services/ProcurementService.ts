import { BaseService } from "./BaseService";
import { prisma } from "../db";

export class ProcurementService extends BaseService {
  constructor() {
    super({
      entityName: "PurchaseRequest",
      delegates: {
        PurchaseRequest: prisma.purchaseRequest,
        Supplier: prisma.supplier,
        SupplierOrder: prisma.supplierOrder,
      },
      defaultInclude: {
        product: true, supplier: true,
        createdBy: { select: { firstName: true, lastName: true } },
      },
      audit: { create: true, update: false, delete: false, view: false, statusChange: false },
    });
  }

  async getProcurementDashboard() {
    const [requests, suppliers, orders] = await Promise.all([
      prisma.purchaseRequest.findMany({
        where: { isArchived: false },
        include: { product: true, supplier: true, createdBy: { select: { firstName: true, lastName: true } } },
      }),
      prisma.supplier.findMany({ where: { isArchived: false } }),
      prisma.supplierOrder.findMany({ where: { isArchived: false }, include: { supplier: true } }),
    ]);
    return { requests, suppliers, orders };
  }

  async create(data: any, userId: string) {
    return super.create({ ...data, status: data.status || "Не прочитано" }, userId, { createdById: userId });
  }

  async createSupplier(data: any) {
    return prisma.supplier.create({ data });
  }

  async createOrder(data: any, userId: string) {
    return prisma.supplierOrder.create({
      data: { ...data, orderNumber: `PO-${Date.now()}`, createdById: userId },
    });
  }
}