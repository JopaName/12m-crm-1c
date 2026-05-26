import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count();
  console.log("Total users:", count);

  const director = await prisma.user.findFirst({
    where: { email: "director@12m.ru" },
  });

  if (!director) {
    console.log("Director not found!");
    const allUsers = await prisma.user.findMany({ take: 5 });
    console.log(
      "First 5 users:",
      allUsers.map((u) => u.email),
    );
    return;
  }

  console.log("Director:", director.firstName, director.lastName);
  console.log("Password hash:", director.passwordHash);
  console.log("Is active:", director.isActive);
  console.log("Role ID:", director.roleId);

  const valid = await bcrypt.compare("admin123", director.passwordHash);
  console.log("Password match:", valid);

  const role = await prisma.role.findUnique({ where: { id: director.roleId } });
  console.log("Role:", role?.name);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error:", e.message);
});
