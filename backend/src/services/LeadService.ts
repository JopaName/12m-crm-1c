import { BaseService } from "./BaseService";
import { prisma } from "../db";

export class LeadService extends BaseService {
  constructor() {
    super({
      entityName: "Lead",
      delegates: { Lead: prisma.lead },
      defaultInclude: {
        assignedAgent: { select: { id: true, firstName: true, lastName: true } },
        deal: true,
      },
      rowLevelFilter: (roleName, userId) =>
        roleName === "Agent" ? { assignedAgentId: userId } : {},
    });
  }

  async create(data: any, userId: string) {
    const lead = await super.create(data, userId);

    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
      const details = [];
      if (data.clientName) details.push(`имя: "${data.clientName}"`);
      if (data.clientPhone) details.push(`телефон: "${data.clientPhone}"`);
      if (data.notes) details.push(`описание: "${data.notes}"`);
      if (data.source) details.push(`источник: "${data.source}"`);
      const desc = details.length > 0 ? details.join(', ') : '';

      await prisma.dealAction.create({
        data: {
          dealId: lead.id,
          type: "AUTO",
          title: "Создание лида",
          description: desc,
          status: "COMPLETED",
          orderIndex: 0,
          completedAt: new Date(),
          createdById: userId,
        },
      });
    } catch (e) {
      // non-critical
    }

    return lead;
  }

  async update(id: string, data: any, userId: string) {
    const old = await this.getById(id);
    const lead = await super.update(id, data, userId);

    try {
      const changes: string[] = [];
      if (data.clientName !== undefined && data.clientName !== old.clientName) {
        changes.push(`имя: "${data.clientName}"`);
      }
      if (data.clientPhone !== undefined && data.clientPhone !== old.clientPhone) {
        changes.push(`телефон: "${data.clientPhone}"`);
      }
      if (data.notes !== undefined && data.notes !== old.notes) {
        changes.push(`описание: "${data.notes}"`);
      }
      if (data.source !== undefined && data.source !== old.source) {
        changes.push(`источник: "${data.source}"`);
      }
      if (data.status !== undefined && data.status !== old.status) {
        changes.push(`статус: "${data.status}"`);
      }

      if (changes.length > 0) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
        const maxOrder = await prisma.dealAction.aggregate({ where: { dealId: id }, _max: { orderIndex: true } });

        await prisma.dealAction.create({
          data: {
            dealId: id,
            type: "AUTO",
            title: "Редактирование лида",
            description: changes.join('; '),
            status: "COMPLETED",
            orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
            completedAt: new Date(),
            createdById: userId,
          },
        });
      }
    } catch (e) {
      // non-critical
    }

    return lead;
  }

  async convert(id: string, userId: string, body: { dealType?: string; expectedAmount?: number; clientInn?: string }) {
    const lead = await this.getById(id);
    let client = await prisma.client.findFirst({
      where: { phone: lead.clientPhone },
    });
    if (!client) {
      client = await prisma.client.create({
        data: { name: lead.clientName, phone: lead.clientPhone, email: lead.clientEmail, createdById: userId },
      });
    }
    const deal = await prisma.deal.create({
      data: {
        dealNumber: `D-${Date.now()}`,
        dealType: body.dealType || "Sale",
        status: "Lead_Created",
        clientId: client.id,
        responsibleAgentId: userId,
        expectedAmount: body.expectedAmount || 0,
        clientInn: body.clientInn,
      },
    });
    await prisma.lead.update({ where: { id }, data: { status: "Converted" } });

    try {
      await prisma.dealAction.create({
        data: {
          dealId: id,
          type: "AUTO",
          title: "Конвертация в сделку",
          description: `Создана сделка ${deal.dealNumber}`,
          status: "COMPLETED",
          orderIndex: 0,
          completedAt: new Date(),
          createdById: userId,
        },
      });
    } catch (e) {}

    return { client, deal };
  }
}
