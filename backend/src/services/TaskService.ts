import { BaseService } from "./BaseService";
import { prisma } from "../db";

export class TaskService extends BaseService {
  constructor() {
    super({
      entityName: "Task",
      delegates: { Task: prisma.task },
      defaultInclude: {
        createdBy: { select: { firstName: true, lastName: true } },
        assignee: { select: { firstName: true, lastName: true } },
        deal: { select: { dealNumber: true } },
      },
      rowLevelFilter: (roleName, userId) =>
        roleName === "Agent" ? { assigneeId: userId } : {},
    });
  }

  async create(data: any, userId: string) {
    return super.create(data, userId, { createdById: userId, status: "New" });
  }

  async update(id: string, data: any, userId: string) {
    const updateData: any = { ...data };
    if (data.status === "Completed") updateData.completedAt = new Date();
    return super.update(id, updateData, userId);
  }
}