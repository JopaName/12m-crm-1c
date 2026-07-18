import { prisma } from "../db";

export class OrderService {
  async getOrders(dealId: string) {
    return prisma.dealOrder.findMany({
      where: { dealId, isArchived: false },
      include: {
        items: true,
        checklists: { include: { items: true, assignedTo: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getOrder(id: string) {
    return prisma.dealOrder.findUnique({
      where: { id },
      include: {
        items: true,
        checklists: { include: { items: true, assignedTo: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
      },
    });
  }

  async createOrder(data: { dealId: string; note?: string }, userId: string) {
    const count = await prisma.dealOrder.count({ where: { dealId: data.dealId } });
    const orderNumber = `ORD-${data.dealId.slice(0, 8).toUpperCase()}-${count + 1}`;
    return prisma.dealOrder.create({
      data: {
        dealId: data.dealId,
        orderNumber,
        note: data.note,
      },
      include: { items: true },
    });
  }

  async addItem(orderId: string, data: { productId?: string; warehouseItemId?: string; productName: string; quantity: number; price?: number; total?: number; note?: string }) {
    if (data.warehouseItemId) {
      const whItem = await prisma.warehouseStockItem.findUnique({ where: { id: data.warehouseItemId } });
      if (!whItem) throw new Error("Товар не найден на складе");
      if (whItem.quantity < data.quantity) throw new Error(`Недостаточно на складе. В наличии: ${whItem.quantity} ${whItem.unit}`);
      await prisma.warehouseStockItem.update({
        where: { id: data.warehouseItemId },
        data: { quantity: whItem.quantity - data.quantity },
      });
    }
    const item = await prisma.dealOrderItem.create({
      data: {
        orderId,
        productId: data.productId,
        warehouseItemId: data.warehouseItemId,
        productName: data.productName,
        quantity: data.quantity,
        price: data.price,
        total: data.total,
        note: data.note,
      },
    });
    return this.recalcOrder(orderId);
  }

  async updateItem(itemId: string, data: { productName?: string; quantity?: number; price?: number; total?: number; note?: string }) {
    await prisma.dealOrderItem.update({ where: { id: itemId }, data });
    const item = await prisma.dealOrderItem.findUnique({ where: { id: itemId } });
    if (item) await this.recalcOrder(item.orderId);
    return prisma.dealOrderItem.findUnique({ where: { id: itemId } });
  }

  async removeItem(itemId: string) {
    const item = await prisma.dealOrderItem.findUnique({ where: { id: itemId } });
    await prisma.dealOrderItem.delete({ where: { id: itemId } });
    if (item) await this.recalcOrder(item.orderId);
    return true;
  }

  async updateOrder(id: string, data: { status?: string; note?: string }) {
    return prisma.dealOrder.update({
      where: { id },
      data,
      include: { items: true, checklists: { include: { items: true } } },
    });
  }

  async deleteOrder(id: string) {
    await prisma.dealOrderItem.deleteMany({ where: { orderId: id } });
    await prisma.assemblyChecklistItem.deleteMany({ where: { checklist: { orderId: id } } });
    await prisma.assemblyChecklist.deleteMany({ where: { orderId: id } });
    await prisma.dealOrder.delete({ where: { id } });
    return true;
  }

  async generateChecklist(orderId: string) {
    const order = await prisma.dealOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new Error("Order not found");

    const existing = await prisma.assemblyChecklist.findFirst({ where: { orderId } });
    if (existing) return existing;

    const checklist = await prisma.assemblyChecklist.create({
      data: {
        orderId,
        title: `Чек-лист сборки #${order.orderNumber}`,
        items: {
          create: order.items.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true, assignedTo: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });
    return checklist;
  }

  async getChecklist(orderId: string) {
    return prisma.assemblyChecklist.findFirst({
      where: { orderId },
      include: { items: true, assignedTo: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });
  }

  async updateChecklistItem(itemId: string, data: { checked?: boolean; note?: string }) {
    return prisma.assemblyChecklistItem.update({ where: { id: itemId }, data });
  }

  async updateChecklist(id: string, data: { status?: string; assignedToId?: string; note?: string; completedAt?: Date | null }) {
    return prisma.assemblyChecklist.update({
      where: { id },
      data,
      include: { items: true, assignedTo: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });
  }

  private async recalcOrder(orderId: string) {
    const items = await prisma.dealOrderItem.findMany({ where: { orderId } });
    const totals = items.map((item) => ({
      ...item,
      total: item.price != null ? item.price * item.quantity : item.total,
    }));
    for (const item of totals) {
      if (item.total !== undefined) {
        await prisma.dealOrderItem.update({ where: { id: item.id }, data: { total: item.total } });
      }
    }
    return totals;
  }
}

export const orderService = new OrderService();
