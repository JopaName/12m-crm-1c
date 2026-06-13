import { BaseService } from "./BaseService";
import { prisma } from "../db";

export class PaymentService extends BaseService {
  constructor() {
    super({
      entityName: "Payment",
      delegates: { Payment: prisma.payment },
      defaultInclude: { client: true, invoice: true, deal: true },
      audit: { create: true, update: false, delete: false, view: false, statusChange: false },
    });
  }

  async create(data: any, _userId: string) {
    return prisma.payment.create({
      data: { ...data, paymentNumber: `PAY-${Date.now()}`, status: "Pending" },
    });
  }

  async confirm(id: string, userId: string) {
    return prisma.payment.update({
      where: { id },
      data: { status: "Confirmed", confirmedById: userId, paidAt: new Date() },
    });
  }
}