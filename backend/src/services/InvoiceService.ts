import { BaseService } from "./BaseService";
import { prisma } from "../db";

export class InvoiceService extends BaseService {
  constructor() {
    super({
      entityName: "Invoice",
      delegates: { Invoice: prisma.invoice },
      defaultInclude: { client: true, deal: true, payments: true },
      audit: { create: true, update: false, delete: false, view: false, statusChange: false },
    });
  }

  async create(data: any, _userId: string) {
    return prisma.invoice.create({
      data: { ...data, invoiceNumber: `INV-${Date.now()}`, status: "Draft" },
    });
  }
}