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
    const clean: any = { ...data }; if (clean.dueDate && typeof clean.dueDate === "string" && clean.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) clean.dueDate = new Date(clean.dueDate + "T00:00:00.000Z"); return super.create(clean, userId, { createdById: userId, status: "New", type: clean.type || "General", priority: clean.priority || "Medium" });
  }

  async update(id: string, data: any, userId: string) {
    const updateData: any = { ...data };
    if (updateData.dueDate && typeof updateData.dueDate === "string" && updateData.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) updateData.dueDate = new Date(updateData.dueDate + "T00:00:00.000Z");
    if (data.status === "Completed") updateData.completedAt = new Date();
    return super.update(id, updateData, userId);
  }
}