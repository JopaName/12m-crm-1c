import { BaseService } from "./BaseService";
import { prisma } from "../db";

export class ServiceCaseService extends BaseService {
  constructor() {
    super({
      entityName: "ServiceCase",
      delegates: { ServiceCase: prisma.serviceCase },
      defaultInclude: { client: true, deal: true },
    });
  }

  async create(data: any, _userId: string) {
    return prisma.serviceCase.create({ data: { ...data, status: "New" } });
  }
}