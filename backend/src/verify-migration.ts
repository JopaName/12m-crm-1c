import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { category: "Сырьё и материалы" },
  });
  console.log("Products:", products.length);
  for (const p of products) console.log("  -", p.name, p.purchasePrice);

  const deals = await prisma.deal.findMany({
    where: { dealNumber: { startsWith: "IMP-" } },
    include: { client: true },
  });
  console.log("\nDeals:", deals.length);
  for (const d of deals)
    console.log(
      "  -",
      d.dealNumber,
      d.client.name,
      d.description?.slice(0, 60),
    );

  const cash = await prisma.cashOrder.findMany({
    where: { category: { in: ["Безнал", "Зарплата", "Настройки"] } },
  });
  console.log("\nCash orders:", cash.length);
  for (const c of cash)
    console.log("  -", c.category, c.amount, c.description?.slice(0, 50));

  const empUsers = await prisma.user.findMany({
    where: { role: { name: "Employee" } },
  });
  console.log("\nEmployee users:", empUsers.length);
  for (const u of empUsers) console.log("  -", u.firstName, u.email);

  const clients = await prisma.client.findMany({
    where: { notes: "Импортировано из Закупки 12М" },
  });
  console.log("\nImported clients:", clients.length);
  for (const c of clients) console.log("  -", c.name);

  await prisma.$disconnect();
}

main().catch(console.error);
