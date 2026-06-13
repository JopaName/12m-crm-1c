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
    return { client, deal };
  }
}