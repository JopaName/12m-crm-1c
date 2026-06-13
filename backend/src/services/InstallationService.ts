import { BaseService } from "./BaseService";
import { prisma } from "../db";
import { autoCalculateInstallationCost } from "./salaryService";

export class InstallationService extends BaseService {
  constructor() {
    super({
      entityName: "InstallationTask",
      delegates: { InstallationTask: prisma.installationTask },
      defaultInclude: { deal: { include: { client: true } }, installer: { select: { firstName: true, lastName: true, roleId: true } }, calendarEvents: true },
    });
  }

  async create(data: any, _userId: string) {
    return prisma.installationTask.create({ data: { ...data, status: "Scheduled" } });
  }

  async update(id: string, data: any, _userId: string) {
    await prisma.installationTask.update({ where: { id }, data });
    if (data.status === "Completed") await autoCalculateInstallationCost(id).catch(() => {});
    return prisma.installationTask.findUnique({ where: { id } });
  }

  async getCalendar() {
    return prisma.installationCalendarEvent.findMany({
      where: { isArchived: false },
      include: { installationTask: { include: { deal: { include: { client: true } } } } },
      orderBy: { startDate: "asc" },
    });
  }
}