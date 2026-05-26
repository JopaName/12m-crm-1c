import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing imported data...");

  // Delete in reverse dependency order
  await prisma.chatMessage.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.defectRecord.deleteMany({});
  await prisma.reserve.deleteMany({});
  await prisma.warehouseMovement.deleteMany({});
  await prisma.installationCalendarEvent.deleteMany({});
  await prisma.installationTask.deleteMany({});
  await prisma.legalDocumentComment.deleteMany({});
  await prisma.legalDocument.deleteMany({});
  await prisma.serviceCase.deleteMany({});
  await prisma.billingRecord.deleteMany({});
  await prisma.telemetryReading.deleteMany({});
  await prisma.agentCommissionRecord.deleteMany({});
  await prisma.productionOrder.deleteMany({});
  await prisma.task.deleteMany({ where: { title: { contains: "Отгрузка" } } });
  await prisma.deal.deleteMany({
    where: { dealNumber: { startsWith: "IMP-" } },
  });
  await prisma.cashOrder.deleteMany({
    where: {
      category: {
        in: ["Зарплата", "Зарплата (внешний)", "Безнал", "Настройки"],
      },
    },
  });
  await prisma.inventoryBalance.deleteMany({});
  await prisma.productItem.deleteMany({});
  await prisma.product.deleteMany({ where: { category: "Сырьё и материалы" } });
  await prisma.user.deleteMany({ where: { role: { name: "Employee" } } });
  await prisma.role.deleteMany({ where: { name: "Employee" } });
  // Clients created by import
  const clients = await prisma.client.findMany({
    where: { notes: "Импортировано из Закупки 12М" },
  });
  for (const c of clients) {
    await prisma.lead.deleteMany({ where: { clientId: c.id } });
    await prisma.client.delete({ where: { id: c.id } });
  }

  console.log("Done clearing imported data.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
