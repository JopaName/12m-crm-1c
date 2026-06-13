import { prisma } from "../db";

export class DashboardService {
  async getSummary() {
    const [totalClients, totalLeads, totalDeals, totalProducts, activeRentals, pendingTasks, activeInstallations, dealsByStatus, monthlyRevenue, totalProcurementRequests] = await Promise.all([
      prisma.client.count({ where: { isArchived: false } }),
      prisma.lead.count({ where: { isArchived: false, status: { not: "Converted" } } }),
      prisma.deal.count({ where: { isArchived: false } }),
      prisma.product.count({ where: { isArchived: false } }),
      prisma.rentContract.count({ where: { status: "Active", isArchived: false } }),
      prisma.task.count({ where: { status: { in: ["New", "InProgress"] }, isArchived: false } }),
      prisma.installationTask.count({ where: { status: { in: ["Scheduled", "InProgress"] } } }),
      prisma.deal.groupBy({ by: ["status"], _count: true }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "Confirmed", createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      }),
      prisma.purchaseRequest.count({ where: { isArchived: false } }),
    ]);
    return { totalClients, totalLeads, totalDeals, totalProducts, activeRentals, pendingTasks, activeInstallations, dealsByStatus, monthlyRevenue: monthlyRevenue._sum.amount || 0, totalProcurementRequests };
  }

  async getPipeline() {
    return prisma.deal.findMany({
      where: { isArchived: false },
      include: { client: true, responsibleAgent: { select: { firstName: true, lastName: true } } },
      orderBy: { expectedAmount: "desc" },
    });
  }

  async getFinance() {
    const [totalInvoiced, totalPaid, totalOverdue] = await Promise.all([
      prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: { not: "Cancelled" } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "Confirmed" } }),
      prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: "Sent", dueDate: { lt: new Date() } } }),
    ]);
    return { totalInvoiced: totalInvoiced._sum.amount || 0, totalPaid: totalPaid._sum.amount || 0, totalOverdue: totalOverdue._sum.amount || 0 };
  }

  async getPulse() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [ordersInProgress, totalCells, filledCells, newLeadsToday, overdueTasks] = await Promise.all([
      prisma.productionOrder.count({ where: { status: "InProgress", isArchived: false } }),
      prisma.warehouseCell.count({ where: { isArchived: false } }),
      prisma.productItem.count({ where: { warehouseCellId: { not: null }, isArchived: false } }),
      prisma.lead.count({ where: { createdAt: { gte: todayStart }, isArchived: false } }),
      prisma.task.count({ where: { status: { not: "Completed" }, dueDate: { lt: now }, isArchived: false } }),
    ]);
    return { ordersInProgress, cellOccupancy: totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0, totalCells, filledCells, newLeadsToday, overdueTasks };
  }
}