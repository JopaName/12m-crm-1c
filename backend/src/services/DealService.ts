import { BaseService } from "./BaseService";
import { prisma } from "../db";

export class DealService extends BaseService {

  private async resolveStageLabel(statusKey: string): Promise<string> {
    try {
      const config = await prisma.pipelineConfig.findFirst({ orderBy: { updatedAt: "desc" } });
      if (config) {
        const stages = JSON.parse(config.configJson) as { key: string; label: string }[];
        const stage = stages.find(s => s.key === statusKey);
        if (stage) return stage.label;
      }
    } catch {}
    return statusKey;
  }

  constructor() {
    super({
      entityName: "Deal",
      delegates: { Deal: prisma.deal },
      defaultInclude: {
        responsibleAgent: { select: { id: true, firstName: true, lastName: true } },
        project: true, rentContract: true, invoices: true, payments: true,
      },
      rowLevelFilter: (roleName, userId) =>
        roleName === "Agent" ? { responsibleAgentId: userId } : {},
    });
  }

  async getFullDetails(id: string) {
    return this.getById(id, undefined, {
      responsibleAgent: true,
      project: { include: { specification: { include: { products: true } } } },
      rentContract: true, legalDocuments: true, invoices: true, payments: true,
      productionOrders: true,
      installationTasks: { include: { calendarEvents: true } },
      serviceCases: true, commissions: true,
      tasks: { include: { createdBy: { select: { firstName: true, lastName: true } }, assignee: { select: { firstName: true, lastName: true } } } },
    });
  }

  async create(data: any, userId: string) {
    const deal = await super.create(data, userId);

    try {
      const details = [];
      if (data.clientName) details.push(`имя: "${data.clientName}"`);
      if (data.clientPhone) details.push(`телефон: "${data.clientPhone}"`);
      if (data.notes || data.description) details.push(`описание: "${data.notes || data.description}"`);
      if (data.source) details.push(`источник: "${data.source}"`);

      await prisma.dealAction.create({
        data: {
          dealId: deal.id,
          type: "AUTO",
          title: "Создание лида",
          description: details.length > 0 ? details.join(', ') : '',
          status: "COMPLETED",
          orderIndex: 0,
          completedAt: new Date(),
          createdById: userId,
        },
      });
    } catch (e) {}

    return deal;
  }

  async update(id: string, data: any, userId: string) {
    const old = await this.getById(id);
    const { notes: _notes, source: _src, clientEmail: _cemail, ...dealData } = data;
    const deal = await super.update(id, dealData, userId);

    try {
      const changes = [];
      if (data.clientName !== undefined && data.clientName !== old.clientName) {
        changes.push(`имя: "${data.clientName}"`);
      }
      if (data.clientPhone !== undefined && data.clientPhone !== old.clientPhone) {
        changes.push(`телефон: "${data.clientPhone}"`);
      }
      if ((data.description !== undefined || data.notes !== undefined) && (data.description ?? data.notes) !== old.description) {
        changes.push(`описание: "${data.description ?? data.notes}"`);
      }
      if (data.source !== undefined && data.source !== old.source) {
        changes.push(`источник: "${data.source}"`);
      }
      if (data.status !== undefined && data.status !== old.status) {
        changes.push(`статус: "${data.status}"`);
      }
      if (data.dealType !== undefined && data.dealType !== old.dealType) {
        changes.push(`тип: "${data.dealType}"`);
      }
      if (data.expectedAmount !== undefined && data.expectedAmount !== old.expectedAmount) {
        changes.push(`сумма: "${data.expectedAmount}"`);
      }

      if (changes.length > 0) {
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
    } catch (e) {}

    return deal;
  }

  async updateStatus(id: string, status: string, userId: string, extraData?: Record<string, any>) {
    const deal = await super.updateStatus(id, status, userId, extraData);

    try {
      const maxOrder = await prisma.dealAction.aggregate({ where: { dealId: id }, _max: { orderIndex: true } });
      await prisma.dealAction.create({
        data: {
          dealId: id,
          type: "AUTO",
          title: "Смена статуса",
          description: `статус: "${await this.resolveStageLabel(status)}"`,
          status: "COMPLETED",
          orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
          completedAt: new Date(),
          createdById: userId,
        },
      });
    } catch (e) {}

    return deal;
  }
}
