import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const employeeRole = await prisma.role.findFirst({
    where: { name: "Employee" },
  });
  if (!employeeRole) {
    console.log("Employee role not found. Available roles:");
    const roles = await prisma.role.findMany({ select: { name: true } });
    console.log(roles.map((r) => r.name).join(", "));
    await prisma.$disconnect();
    return;
  }

  // Emails from the import
  const emails = [
    "i.zueva@nik12m.ru",
    "21@nik12m.ru",
    "i.solodilova@nik12m.ru",
    "s.ergunov@nik12m.ru",
    "director@nik12m.ru",
    "admin@nik12m.ru",
    "buh@nik12m.ru",
    "buyer@nik12m.ru",
  ];

  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { roleId: employeeRole.id },
      });
      console.log(`Updated ${email} -> Employee role`);
    } else {
      console.log(`User ${email} not found`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
