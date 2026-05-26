import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
  );
  console.log("Tables:", tables.map((t) => t.name).join(", "));

  // Check user columns
  const cols = await prisma.$queryRawUnsafe<{ name: string }[]>(
    "PRAGMA table_info(User)",
  );
  console.log("User columns:", cols.map((c: any) => c.name).join(", "));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
