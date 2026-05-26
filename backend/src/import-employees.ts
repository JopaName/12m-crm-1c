import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

interface Employee {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const employees: Employee[] = [
  {
    email: "i.zueva@nik12m.ru",
    password: "DoF#oYoYre34",
    firstName: "Ирина",
    lastName: "Зуева",
  },
  {
    email: "21@nik12m.ru",
    password: "aI$n9oHyoTO1",
    firstName: "Сотрудник",
    lastName: "21",
  },
  {
    email: "i.solodilova@nik12m.ru",
    password: "^1tnCFi1lpRT",
    firstName: "Ирина",
    lastName: "Солодилова",
  },
  {
    email: "s.ergunov@nik12m.ru",
    password: "TUVrU3aaui4(",
    firstName: "Сергей",
    lastName: "Ергунов",
  },
  {
    email: "director@nik12m.ru",
    password: "Tprt$IuOnT33",
    firstName: "Директор",
    lastName: "НИК12М",
  },
  {
    email: "admin@nik12m.ru",
    password: "yiAoRGP_px34",
    firstName: "Администратор",
    lastName: "НИК12М",
  },
  {
    email: "buh@nik12m.ru",
    password: "Eyri|IHuYo31",
    firstName: "Бухгалтер",
    lastName: "НИК12М",
  },
  {
    email: "buyer@nik12m.ru",
    password: "so1OiHyUpZ2=",
    firstName: "Снабженец",
    lastName: "НИК12М",
  },
];

async function main() {
  const roles = await prisma.role.findMany({
    select: { id: true, name: true },
  });
  console.log("Available roles:", roles.map((r) => r.name).join(", "));

  if (roles.length === 0) {
    console.log("No roles found. Aborting.");
    return;
  }

  const defaultRole = roles[0]; // first available role
  console.log("Using role:", defaultRole.name);

  let created = 0;
  let skipped = 0;

  for (const emp of employees) {
    const existing = await prisma.user.findUnique({
      where: { email: emp.email },
    });
    if (existing) {
      console.log(
        `Skipping ${emp.email} (already exists as ${existing.firstName})`,
      );
      skipped++;
      continue;
    }

    const hash = await bcrypt.hash(emp.password, 10);
    const user = await prisma.user.create({
      data: {
        email: emp.email,
        passwordHash: hash,
        firstName: emp.firstName,
        lastName: emp.lastName,
        roleId: defaultRole.id,
        isActive: true,
      },
    });
    console.log(`Created: ${emp.firstName} ${emp.lastName} (${emp.email})`);
    created++;
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
