import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

(async () => {
  console.log("Roles:", await p.role.count());
  console.log("Users:", await p.user.count());
  console.log("Products:", await p.product.count());
  console.log("Clients:", await p.client.count());
  console.log("Deals:", await p.deal.count());

  const admin = await p.user.findFirst({ where: { email: "director@12m.ru" } });
  console.log("Director found:", !!admin, admin?.firstName, admin?.lastName);

  if (admin) {
    console.log("PasswordHash length:", admin.passwordHash.length);
    const bcrypt = require("bcryptjs");
    const valid = await bcrypt.compare("admin123", admin.passwordHash);
    console.log("Password valid:", valid);
  }
})();
