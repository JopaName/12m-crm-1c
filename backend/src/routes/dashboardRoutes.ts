import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/summary", async (_req: AuthRequest, res: Response) => {
  try {
    const [
      totalClients,
      totalLeads,
      totalDeals,
      totalProducts,
      activeRentals,
      pendingTasks,
      activeInstallations,
      dealsByStatus,
      monthlyRevenue,
    ] = await Promise.all([
      prisma.client.count({ where: { isArchived: false } }),
      prisma.lead.count({
        where: { isArchived: false, status: { not: "Converted" } },
      }),
      prisma.deal.count({ where: { isArchived: false } }),
      prisma.product.count({ where: { isArchived: false } }),
      prisma.rentContract.count({
        where: { status: "Active", isArchived: false },
      }),
      prisma.task.count({
        where: { status: { in: ["New", "InProgress"] }, isArchived: false },
      }),
      prisma.installationTask.count({
        where: { status: { in: ["Scheduled", "InProgress"] } },
      }),
      prisma.deal.groupBy({ by: ["status"], _count: true }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: "Confirmed",
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    res.json({
      totalClients,
      totalLeads,
      totalDeals,
      totalProducts,
      activeRentals,
      pendingTasks,
      activeInstallations,
      dealsByStatus,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

router.get("/pipeline", async (_req: AuthRequest, res: Response) => {
  try {
    const deals = await prisma.deal.findMany({
      where: { isArchived: false },
      include: {
        client: true,
        responsibleAgent: { select: { firstName: true, lastName: true } },
      },
      orderBy: { expectedAmount: "desc" },
    });
    res.json(deals);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pipeline" });
  }
});

router.get("/finance", async (_req: AuthRequest, res: Response) => {
  try {
    const [totalInvoiced, totalPaid, totalOverdue] = await Promise.all([
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: { not: "Cancelled" } },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "Confirmed" },
      }),
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: "Sent", dueDate: { lt: new Date() } },
      }),
    ]);

    res.json({
      totalInvoiced: totalInvoiced._sum.amount || 0,
      totalPaid: totalPaid._sum.amount || 0,
      totalOverdue: totalOverdue._sum.amount || 0,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch finance data" });
  }
});

export default router;
