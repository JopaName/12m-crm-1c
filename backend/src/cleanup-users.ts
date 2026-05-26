import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const newAdmin = await prisma.user.findUnique({
    where: { email: "admin@nik12m.ru" },
  });
  if (!newAdmin) {
    console.log("admin@nik12m.ru not found!");
    await prisma.$disconnect();
    return;
  }
  console.log("New admin:", newAdmin.firstName, newAdmin.lastName, newAdmin.id);

  const directorRole = await prisma.role.findFirst({
    where: { name: "Director" },
  });
  if (!directorRole) {
    console.log("Director role not found!");
    await prisma.$disconnect();
    return;
  }

  const keepEmails = [
    "i.zueva@nik12m.ru",
    "21@nik12m.ru",
    "i.solodilova@nik12m.ru",
    "s.ergunov@nik12m.ru",
    "director@nik12m.ru",
    "admin@nik12m.ru",
    "buh@nik12m.ru",
    "buyer@nik12m.ru",
  ];

  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  const toDelete = allUsers.filter((u) => !keepEmails.includes(u.email));
  const deleteIds = toDelete.map((u) => u.id);

  console.log(
    `Keeping ${keepEmails.length} users, removing ${toDelete.length} old users`,
  );

  if (toDelete.length === 0) {
    console.log("No users to delete.");
  } else {
    // Reassign records to new admin using raw SQL
    const reassign: { table: string; column: string }[] = [
      { table: "Client", column: "createdById" },
      { table: "Deal", column: "responsibleAgentId" },
      { table: "Task", column: "createdById" },
      { table: "Task", column: "assigneeId" },
      { table: "CashOrder", column: "createdById" },
      { table: "PurchaseRequest", column: "createdById" },
      { table: "SupplierOrder", column: "createdById" },
      { table: "WarehouseMovement", column: "createdById" },
      { table: "Product", column: "createdById" },
      { table: "Lead", column: "assignedAgentId" },
      { table: "AgentCommissionRecord", column: "userId" },
      { table: "AuditLog", column: "userId" },
      { table: "DefectRecord", column: "createdById" },
      { table: "Reserve", column: "createdById" },
      { table: "InstallationTask", column: "createdById" },
      { table: "Payment", column: "confirmedById" },
      { table: "IntegrationLog", column: "userId" },
      { table: "LegalDocument", column: "responsibleLawyerId" },
      { table: "InstallationCalendarEvent", column: "createdById" },
      { table: "ChatMessage", column: "senderId" },
    ];

    for (const { table, column } of reassign) {
      const ids = deleteIds.map((id) => `'${id}'`).join(",");
      if (!ids) continue;
      try {
        const result = await prisma.$executeRawUnsafe(
          `UPDATE "${table}" SET "${column}" = '${newAdmin.id}' WHERE "${column}" IN (${ids})`,
        );
        if (result > 0)
          console.log(`  ${table}.${column}: ${result} records reassigned`);
      } catch (e: any) {
        console.log(
          `  ${table}.${column}: error (may not exist) - ${e.message.substring(0, 80)}`,
        );
      }
    }

    // Delete old users
    for (const user of toDelete) {
      try {
        await prisma.user.delete({ where: { id: user.id } });
        console.log(
          `Deleted: ${user.firstName} ${user.lastName} (${user.email})`,
        );
      } catch (e: any) {
        console.log(
          `Cannot delete ${user.email}: ${e.message.substring(0, 80)}`,
        );
      }
    }
  }

  // Promote admin@nik12m.ru to Director
  await prisma.user.update({
    where: { id: newAdmin.id },
    data: { roleId: directorRole.id },
  });
  console.log("\nPromoted admin@nik12m.ru -> Director");

  const remaining = await prisma.user.count();
  console.log(`Total users: ${remaining}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
