import { prisma } from "../index";

export async function calculateLaborCost(
  roleId: string,
  taskType: string,
): Promise<number | null> {
  const rate = await prisma.tariffRate.findUnique({
    where: { roleId_taskType: { roleId, taskType } },
  });
  return rate?.ratePerUnit ?? null;
}

export async function autoCalculateInstallationCost(
  taskId: string,
): Promise<void> {
  const task = await prisma.installationTask.findUnique({
    where: { id: taskId },
    include: { installer: true },
  });
  if (!task || task.laborCost != null) return;

  const rate = await prisma.tariffRate.findUnique({
    where: {
      roleId_taskType: {
        roleId: task.installer.roleId,
        taskType: "INSTALLATION",
      },
    },
  });
  if (!rate) return;

  await prisma.installationTask.update({
    where: { id: taskId },
    data: { laborCost: rate.ratePerUnit },
  });
}

export async function autoCalculateProductionCost(
  orderId: string,
): Promise<void> {
  const order = await prisma.productionOrder.findUnique({
    where: { id: orderId },
    include: {
      deal: { include: { responsibleAgent: true } },
      productionRoute: { include: { steps: true } },
    },
  });
  if (!order || order.laborCost != null) return;

  const stepsCount = order.productionRoute?.steps?.length ?? 1;

  const rate = await prisma.tariffRate.findUnique({
    where: {
      roleId_taskType: {
        roleId: order.deal.responsibleAgent.roleId,
        taskType: "PRODUCTION",
      },
    },
  });

  if (!rate) return;

  const total = rate.ratePerUnit * stepsCount;
  await prisma.productionOrder.update({
    where: { id: orderId },
    data: { laborCost: total },
  });
}

export async function calculateMonthlyAgentCommissions(
  year: number,
  month: number,
): Promise<void> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const agents = await prisma.user.findMany({
    where: { isActive: true, isArchived: false },
    include: { role: true },
  });

  for (const agent of agents) {
    const closedDeals = await prisma.deal.count({
      where: {
        responsibleAgentId: agent.id,
        status: "Completed",
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    if (closedDeals === 0) continue;

    const fixedRate = await prisma.tariffRate.findUnique({
      where: {
        roleId_taskType: { roleId: agent.roleId, taskType: "SERVICE" },
      },
    });

    const bonusPerDeal = fixedRate?.ratePerUnit ?? 0;
    const totalBonus = bonusPerDeal * closedDeals;

    const existing = await prisma.agentCommissionRecord.findFirst({
      where: {
        agentId: agent.id,
        createdAt: { gte: startDate, lte: endDate },
        status: "Calculated",
      },
    });

    if (!existing) {
      await prisma.agentCommissionRecord.create({
        data: {
          agentId: agent.id,
          dealId:
            (
              await prisma.deal.findFirst({
                where: { responsibleAgentId: agent.id },
                orderBy: { createdAt: "desc" },
              })
            )?.id ?? "",
          amount: totalBonus,
          status: "Calculated",
        },
      });
    }
  }
}
