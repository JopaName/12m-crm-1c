import { BaseService } from "./BaseService";
import { prisma } from "../db";

export class TelemetryService extends BaseService {
  constructor() {
    super({
      entityName: "TelemetryDevice",
      delegates: { TelemetryDevice: prisma.telemetryDevice, TelemetryReading: prisma.telemetryReading },
      audit: { create: false, update: false, delete: false, view: false, statusChange: false },
    });
  }

  async getDevices() {
    return prisma.telemetryDevice.findMany({
      where: { isArchived: false },
      include: { readings: { take: 1, orderBy: { createdAt: "desc" } } },
    });
  }

  async getReadings() {
    return prisma.telemetryReading.findMany({
      orderBy: { createdAt: "desc" }, take: 500,
      include: { rentContract: { include: { client: true } }, device: true },
    });
  }

  async createReading(data: any) {
    return prisma.telemetryReading.create({ data: { ...data, verificationStatus: "Unverified" } });
  }
}