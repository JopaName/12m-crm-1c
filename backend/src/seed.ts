import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seed() {
  console.log("Seeding database...");

  // Create roles
  const roles = await Promise.all([
    prisma.role.create({
      data: { name: "Agent", description: "Sales agent / продажник" },
    }),
    prisma.role.create({
      data: { name: "AT_Engineer", description: "Project engineer" },
    }),
    prisma.role.create({
      data: { name: "Warehouse_Mgr", description: "Warehouse manager" },
    }),
    prisma.role.create({
      data: { name: "Production_Mgr", description: "Production manager" },
    }),
    prisma.role.create({
      data: { name: "Accountant", description: "Accountant" },
    }),
    prisma.role.create({
      data: { name: "Installer_IP", description: "Installation contractor" },
    }),
    prisma.role.create({
      data: { name: "Lawyer", description: "Legal department" },
    }),
    prisma.role.create({
      data: { name: "Procurement", description: "Procurement manager" },
    }),
    prisma.role.create({
      data: { name: "Director", description: "Director / Owner - full access" },
    }),
  ]);

  const hash = await bcrypt.hash("admin123", 10);

  // Create admin user
  await prisma.user.create({
    data: {
      email: "director@12m.ru",
      passwordHash: hash,
      firstName: "Директор",
      lastName: "12М",
      roleId: roles[8].id,
      isActive: true,
    },
  });

  // Create sample users
  const agentUsers = [
    {
      email: "agent1@12m.ru",
      firstName: "Иван",
      lastName: "Петров",
      roleIdx: 0,
    },
    {
      email: "agent2@12m.ru",
      firstName: "Мария",
      lastName: "Сидорова",
      roleIdx: 0,
    },
    {
      email: "engineer@12m.ru",
      firstName: "Алексей",
      lastName: "Иванов",
      roleIdx: 1,
    },
    {
      email: "warehouse@12m.ru",
      firstName: "Сергей",
      lastName: "Кузнецов",
      roleIdx: 2,
    },
    {
      email: "production@12m.ru",
      firstName: "Дмитрий",
      lastName: "Соколов",
      roleIdx: 3,
    },
    {
      email: "accountant@12m.ru",
      firstName: "Елена",
      lastName: "Попова",
      roleIdx: 4,
    },
    {
      email: "lawyer@12m.ru",
      firstName: "Ольга",
      lastName: "Новикова",
      roleIdx: 6,
    },
    {
      email: "procurement@12m.ru",
      firstName: "Андрей",
      lastName: "Морозов",
      roleIdx: 7,
    },
  ];

  for (const u of agentUsers) {
    await prisma.user.create({
      data: {
        email: u.email,
        passwordHash: hash,
        firstName: u.firstName,
        lastName: u.lastName,
        roleId: roles[u.roleIdx].id,
        isActive: true,
      },
    });
  }

  // Create sample products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Солнечная панель 550W",
        sku: "SP-550-M",
        category: "Солнечные панели",
        unit: "шт",
        purchasePrice: 15000,
        salePrice: 25000,
        rentPrice: 500,
      },
    }),
    prisma.product.create({
      data: {
        name: "Инвертор Hybrid 6.2kW",
        sku: "INV-6.2-H",
        category: "Инверторы",
        unit: "шт",
        purchasePrice: 80000,
        salePrice: 120000,
        rentPrice: 2500,
      },
    }),
    prisma.product.create({
      data: {
        name: "АКБ натрий-ионная 5kWh",
        sku: "BAT-NI-5",
        category: "Аккумуляторы",
        unit: "шт",
        purchasePrice: 45000,
        salePrice: 75000,
        rentPrice: 1500,
      },
    }),
    prisma.product.create({
      data: {
        name: "Ветрогенератор 3kW",
        sku: "WT-3K",
        category: "Ветрогенераторы",
        unit: "шт",
        purchasePrice: 120000,
        salePrice: 200000,
        rentPrice: 4000,
      },
    }),
  ]);

  // Create sample items
  for (const product of products) {
    for (let i = 0; i < 5; i++) {
      await prisma.productItem.create({
        data: {
          productId: product.id,
          serialNumber: `${product.sku}-${1000 + i}`,
          status: "Stock",
        },
      });
    }
  }

  // Create warehouse cells
  await Promise.all([
    prisma.warehouseCell.create({
      data: { name: "A-01", zone: "Основной склад" },
    }),
    prisma.warehouseCell.create({
      data: { name: "A-02", zone: "Основной склад" },
    }),
    prisma.warehouseCell.create({
      data: { name: "B-01", zone: "Производственный цех" },
    }),
    prisma.warehouseCell.create({
      data: { name: "C-01", zone: "Готовая продукция" },
    }),
  ]);

  // Create production routes
  await prisma.productionRoute.create({
    data: {
      name: "Сборка солнечной панели",
      description: "Стандартный процесс сборки",
      steps: JSON.stringify([
        "Подготовка стекла",
        "Укладка фотоэлементов",
        "Пайка шин",
        "Ламинация",
        "Установка рамки",
        "Тестирование EL",
        "Маркировка",
      ]),
    },
  });

  console.log("Seed completed successfully!");
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
