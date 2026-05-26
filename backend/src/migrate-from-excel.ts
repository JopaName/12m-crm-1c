import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

const EXCEL_PATH = "A:\\download\\Закупки 12М.xlsx";
const SALARY_PATH =
  "A:\\download\\table-efbf12fb-968c-4621-859c-7891af22d3d7.xlsx";

async function main() {
  console.log("=== Starting Excel → CRM Migration ===\n");

  const director = await prisma.user.findFirst({
    where: { email: "director@12m.ru" },
  });
  const adminRole = await prisma.role.findUnique({
    where: { name: "Director" },
  });
  const agentRole = await prisma.role.findUnique({ where: { name: "Agent" } });

  if (!director || !adminRole || !agentRole) {
    console.log("Please run seed first: npx ts-node src/seed.ts");
    return;
  }

  // ═══════════════════════════════════════════════
  // 1. Импорт товаров/материалов (Справочник)
  // ═══════════════════════════════════════════════
  console.log("\n--- 1. Importing Products (Справочник) ---");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const refSheet = wb.getWorksheet("Справочник");

  let productCount = 0;
  for (let row = 2; row <= refSheet.rowCount; row++) {
    const name = refSheet.getCell(row, 1).text?.trim();
    const priceStr = refSheet.getCell(row, 4).text?.trim();
    if (!name || !priceStr || priceStr === "#N/A") continue;

    const sku = `MAT-${Date.now()}-${row}`;
    const purchasePrice = parseFloat(priceStr.replace(/,/g, ".")) || 0;

    const exists = await prisma.product.findFirst({ where: { name } });
    if (!exists) {
      await prisma.product.create({
        data: {
          name,
          sku,
          category: "Сырьё и материалы",
          unit: "шт",
          purchasePrice,
          isArchived: false,
        },
      });
      productCount++;
      console.log(
        `  + ${name} — ${purchasePrice} ${refSheet.getCell(row, 3).text || ""}`,
      );
    } else {
      console.log(`  • ${name} — already exists, skipped`);
    }
  }
  console.log(`  Imported ${productCount} new products`);

  // ═══════════════════════════════════════════════
  // 2. Импорт заказов → Клиенты + Сделки
  // ═══════════════════════════════════════════════
  console.log("\n--- 2. Importing Orders (Заказы) ---");
  const ordersSheet = wb.getWorksheet("Заказы");

  let dealCount = 0;
  let clientCache = new Map<string, string>();
  let lastCustomer = "";

  for (let row = 2; row <= ordersSheet.rowCount; row++) {
    const rawCustomer = ordersSheet.getCell(row, 1).text?.trim();
    const customer = rawCustomer || lastCustomer;
    const product = ordersSheet.getCell(row, 2).text?.trim();
    const qtyStr = ordersSheet.getCell(row, 3).text?.trim();
    const dateStr = ordersSheet.getCell(row, 4).text?.trim();
    const status = ordersSheet.getCell(row, 5).text?.trim();

    if (!customer || !product) continue;
    if (rawCustomer) lastCustomer = rawCustomer;

    const quantity = parseFloat(qtyStr) || 1;
    let deliveryDate: Date | null = null;
    if (dateStr && dateStr !== "#N/A") {
      deliveryDate = new Date(dateStr);
      if (isNaN(deliveryDate.getTime())) deliveryDate = null;
    }

    const dealStatus = status === "отгружено" ? "Completed" : "InProgress";

    // Find or create client
    let clientId = clientCache.get(customer);
    if (!clientId) {
      const existingClient = await prisma.client.findFirst({
        where: { name: customer },
      });
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const newClient = await prisma.client.create({
          data: {
            name: customer,
            notes: `Импортировано из Закупки 12М`,
            createdById: director.id,
          },
        });
        clientId = newClient.id;
      }
      clientCache.set(customer, clientId);
    }

    // Create deal
    const dealNumber = `IMP-${Date.now()}-${row}`;
    const productName = product || "Оборудование";

    const deal = await prisma.deal.create({
      data: {
        dealNumber,
        dealType: productName.includes("инвертор") ? "ProjectSale" : "Sale",
        status: dealStatus,
        clientId,
        responsibleAgentId: director.id,
        expectedAmount: quantity * 1000,
        description: `${productName} — ${quantity} шт. Срок: ${deliveryDate ? deliveryDate.toISOString().split("T")[0] : "не указан"}. Статус: ${status || "не указан"}`,
      },
    });

    // Create a task for delivery
    if (deliveryDate) {
      await prisma.task.create({
        data: {
          title: `Отгрузка: ${customer} — ${productName} (${quantity} шт.)`,
          description: `Срок поставки: ${deliveryDate.toISOString().split("T")[0]}`,
          type: "Delivery",
          status: dealStatus === "Completed" ? "Done" : "InProgress",
          priority: "High",
          dealId: deal.id,
          createdById: director.id,
          assigneeId: director.id,
          dueDate: deliveryDate,
          completedAt: dealStatus === "Completed" ? new Date() : undefined,
        },
      });
    }

    dealCount++;
    console.log(
      `  + Deal for ${customer}: ${productName} x${quantity} (${dealStatus})`,
    );
  }
  console.log(`  Created ${dealCount} deals`);

  // ═══════════════════════════════════════════════
  // 3. Импорт финансов
  // ═══════════════════════════════════════════════
  console.log("\n--- 3. Importing Finances (Финансы) ---");
  const financeSheet = wb.getWorksheet("Финансы");

  for (let row = 1; row <= 10; row++) {
    const key = financeSheet.getCell(row, 1).text?.trim();
    const value = financeSheet.getCell(row, 2).text?.trim();
    if (!key || !value || value === "#N/A") continue;

    const amount = parseFloat(value.replace(/\s/g, "").replace(/,/g, "."));
    if (isNaN(amount)) {
      console.log(`  • ${key}: ${value} (unparseable, stored as note)`);
      continue;
    }

    if (
      key.toLowerCase().includes("безнал") ||
      key.toLowerCase().includes("налич")
    ) {
      const existingCash = await prisma.cashOrder.findFirst({
        where: { category: key },
      });
      if (!existingCash) {
        await prisma.cashOrder.create({
          data: {
            type: "Income",
            amount,
            category: key,
            description: `Импортировано из Закупки 12М`,
            createdById: director.id,
          },
        });
        console.log(`  + ${key}: ${amount} ₽`);
      }
    } else if (key.includes("Курс") || key.includes("Тариф")) {
      console.log(`  • ${key}: ${value} (сохранено как CashOrder)`);
      await prisma.cashOrder.create({
        data: {
          type: "Info",
          amount: 0,
          category: "Настройки",
          description: `${key}: ${value}`,
          createdById: director.id,
        },
      });
    } else {
      console.log(`  • ${key}: ${value}`);
    }
  }

  // ═══════════════════════════════════════════════
  // 4. Импорт зарплат сотрудников
  // ═══════════════════════════════════════════════
  console.log("\n--- 4. Importing Employee Salaries ---");
  const salaryWb = new ExcelJS.Workbook();
  await salaryWb.xlsx.readFile(SALARY_PATH);
  const salarySheet = salaryWb.getWorksheet("Sheet1");

  // Create a special role for employees if not exists
  let employeeRole = await prisma.role.findUnique({
    where: { name: "Employee" },
  });
  if (!employeeRole) {
    employeeRole = await prisma.role.create({
      data: {
        name: "Employee",
        description: "Сотрудник производства",
      },
    });
  }

  let salaryUserCount = 0;
  const hash = await bcrypt.hash("employee123", 10);

  for (let row = 2; row <= salarySheet.rowCount; row++) {
    const name = salarySheet.getCell(row, 1).text?.trim();
    const totalStr = salarySheet.getCell(row, 2).text?.trim();
    if (!name || !totalStr) continue;

    const cleanName = name.replace(/\*\*/g, "").trim();
    const cleanTotal = totalStr.replace(/\*\*/g, "").replace(/\s/g, "").trim();
    const total = parseFloat(cleanTotal) || 0;

    // Find or create user by name
    let user = await prisma.user.findFirst({
      where: { firstName: cleanName },
    });

    if (!user) {
      const translitMap: Record<string, string> = {
        а: "a",
        б: "b",
        в: "v",
        г: "g",
        д: "d",
        е: "e",
        ё: "e",
        ж: "zh",
        з: "z",
        и: "i",
        й: "y",
        к: "k",
        л: "l",
        м: "m",
        н: "n",
        о: "o",
        п: "p",
        р: "r",
        с: "s",
        т: "t",
        у: "u",
        ф: "f",
        х: "kh",
        ц: "ts",
        ч: "ch",
        ш: "sh",
        щ: "shch",
        ъ: "",
        ы: "y",
        ь: "",
        э: "e",
        ю: "yu",
        я: "ya",
      };
      const emailLocal = cleanName
        .toLowerCase()
        .split("")
        .map((c) => translitMap[c] || c)
        .join("")
        .replace(/[^a-z]/g, "");
      user = await prisma.user.create({
        data: {
          email: `${emailLocal}@12m.ru`,
          passwordHash: hash,
          firstName: cleanName,
          lastName: "",
          roleId: employeeRole.id,
          isActive: true,
        },
      });
      salaryUserCount++;
      console.log(`  + Created user: ${cleanName}`);
    }

    // Create salary record as cash order
    await prisma.cashOrder.create({
      data: {
        type: "Expense",
        amount: total,
        category: "Зарплата",
        description: `Зарплата сотрудника ${cleanName} — ${total} ₽ (импорт из Закупки 12М)`,
        createdById: director.id,
      },
    });
    console.log(`  + Salary for ${cleanName}: ${total} ₽`);
  }
  console.log(`  Created ${salaryUserCount} new employee users`);

  console.log("\n=== Migration Complete! ===");
  console.log(`Summary:
  - Products imported: ${productCount}
  - Deals created: ${dealCount}
  - Clients cached: ${clientCache.size}
  - Finance records imported
  - Salary records imported`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
