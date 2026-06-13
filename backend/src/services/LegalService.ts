import { BaseService } from "./BaseService";
import { prisma } from "../db";

export class LegalService extends BaseService {
  constructor() {
    super({
      entityName: "LegalDocument",
      delegates: { LegalDocument: prisma.legalDocument },
      defaultInclude: { deal: { include: { client: true } }, responsibleLawyer: { select: { firstName: true, lastName: true } } },
    });
  }

  async create(data: any, _userId: string) {
    return prisma.legalDocument.create({ data: { ...data, status: "Draft", versionNumber: 1 } });
  }

  async update(id: string, data: any, userId: string) {
    const old = await this.getById(id);
    return prisma.legalDocument.update({
      where: { id },
      data: { ...data, versionNumber: data.fileDraft ? old.versionNumber + 1 : old.versionNumber },
    });
  }
}