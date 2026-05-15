import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seed() {
  console.log("Seeding database...");

  const ALL_PERMS = [
    "dashboard:view",
    "clients:view",
    "clients:create",
    "clients:edit",
    "clients:delete",
    "leads:view",
    "leads:create",
    "leads:edit",
    "leads:delete",
    "leads:convert",
    "deals:view",
    "deals:create",
    "deals:edit",
    "deals:delete",
    "products:view",
    "products:create",
    "products:edit",
    "products:delete",
    "warehouse:view",
    "warehouse:create",
    "warehouse:edit",
    "warehouse:delete",
    "production:view",
    "production:create",
    "production:edit",
    "production:delete",
    "procurement:view",
    "procurement:create",
    "procurement:edit",
    "procurement:delete",
    "rent:view",
    "rent:create",
    "rent:edit",
    "rent:delete",
    "installation:view",
    "installation:create",
    "installation:edit",
    "installation:delete",
    "legal:view",
    "legal:create",
    "legal:edit",
    "legal:delete",
    "service:view",
    "service:create",
    "service:edit",
    "service:delete",
    "tasks:view",
    "tasks:create",
    "tasks:edit",
    "tasks:delete",
    "users:view",
    "users:create",
    "users:edit",
    "users:delete",
    "roles:view",
    "roles:create",
    "roles:edit",
    "roles:delete",
    "audit:view",
    "integrations:view",
    "integrations:create",
    "integrations:edit",
    "integrations:delete",
  ];

  const rolePermissions: Record<string, string[]> = {
    Agent: [
      "dashboard:view",
      "clients:view",
      "clients:create",
      "clients:edit",
      "leads:view",
      "leads:create",
      "leads:edit",
      "leads:convert",
      "deals:view",
      "deals:create",
      "deals:edit",
      "products:view",
      "tasks:view",
      "tasks:create",
      "tasks:edit",
    ],
    AT_Engineer: [
      "dashboard:view",
      "clients:view",
      "deals:view",
      "products:view",
      "warehouse:view",
      "production:view",
      "production:create",
      "production:edit",
      "installation:view",
      "installation:create",
      "installation:edit",
      "tasks:view",
      "tasks:create",
      "tasks:edit",
    ],
    Warehouse_Mgr: [
      "dashboard:view",
      "products:view",
      "warehouse:view",
      "warehouse:create",
      "warehouse:edit",
      "warehouse:delete",
      "tasks:view",
      "tasks:edit",
    ],
    Production_Mgr: [
      "dashboard:view",
      "products:view",
      "production:view",
      "production:create",
      "production:edit",
      "production:delete",
      "tasks:view",
      "tasks:create",
      "tasks:edit",
    ],
    Accountant: [
      "dashboard:view",
      "clients:view",
      "deals:view",
      "products:view",
      "rent:view",
      "legal:view",
      "tasks:view",
    ],
    Installer_IP: [
      "installation:view",
      "installation:edit",
      "tasks:view",
      "tasks:edit",
    ],
    Lawyer: [
      "dashboard:view",
      "clients:view",
      "clients:edit",
      "deals:view",
      "legal:view",
      "legal:create",
      "legal:edit",
      "legal:delete",
      "tasks:view",
      "tasks:create",
      "tasks:edit",
    ],
    Procurement: [
      "dashboard:view",
      "products:view",
      "procurement:view",
      "procurement:create",
      "procurement:edit",
      "procurement:delete",
      "tasks:view",
      "tasks:create",
      "tasks:edit",
    ],
    Director: ALL_PERMS,
  };

  const rolesData = [
    { name: "Agent", description: "Sales agent / продажник" },
    { name: "AT_Engineer", description: "Project engineer" },
    { name: "Warehouse_Mgr", description: "Warehouse manager" },
    { name: "Production_Mgr", description: "Production manager" },
    { name: "Accountant", description: "Accountant" },
    { name: "Installer_IP", description: "Installation contractor" },
    { name: "Lawyer", description: "Legal department" },
    { name: "Procurement", description: "Procurement manager" },
    { name: "Director", description: "Director / Owner - full access" },
  ];

  const roles = await Promise.all(
    rolesData.map((r) =>
      prisma.role.upsert({
        where: { name: r.name },
        update: {
          description: r.description,
          permissions: JSON.stringify(rolePermissions[r.name] || []),
        },
        create: {
          name: r.name,
          description: r.description,
          permissions: JSON.stringify(rolePermissions[r.name] || []),
        },
      }),
    ),
  );

  const hash = await bcrypt.hash("admin123", 10);

  // Create admin user
  await prisma.user.upsert({
    where: { email: "director@12m.ru" },
    update: {
      passwordHash: hash,
      firstName: "Директор",
      lastName: "12М",
      roleId: roles[8].id,
      isActive: true,
    },
    create: {
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
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash: hash,
        firstName: u.firstName,
        lastName: u.lastName,
        roleId: roles[u.roleIdx].id,
        isActive: true,
      },
      create: {
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
  const productsData = [
    {
      name: "Солнечная панель 550W",
      sku: "SP-550-M",
      category: "Солнечные панели",
      unit: "шт",
      purchasePrice: 15000,
      salePrice: 25000,
      rentPrice: 500,
    },
    {
      name: "Инвертор Hybrid 6.2kW",
      sku: "INV-6.2-H",
      category: "Инверторы",
      unit: "шт",
      purchasePrice: 80000,
      salePrice: 120000,
      rentPrice: 2500,
    },
    {
      name: "АКБ натрий-ионная 5kWh",
      sku: "BAT-NI-5",
      category: "Аккумуляторы",
      unit: "шт",
      purchasePrice: 45000,
      salePrice: 75000,
      rentPrice: 1500,
    },
    {
      name: "Ветрогенератор 3kW",
      sku: "WT-3K",
      category: "Ветрогенераторы",
      unit: "шт",
      purchasePrice: 120000,
      salePrice: 200000,
      rentPrice: 4000,
    },
  ];

  const products = await Promise.all(
    productsData.map((p) =>
      prisma.product.upsert({
        where: { sku: p.sku },
        update: p,
        create: p,
      }),
    ),
  );

  // Create sample items (skip duplicates)
  for (const product of products) {
    for (let i = 0; i < 5; i++) {
      const sn = `${product.sku}-${1000 + i}`;
      const exists = await prisma.productItem.findUnique({
        where: { serialNumber: sn },
      });
      if (!exists) {
        await prisma.productItem.create({
          data: {
            productId: product.id,
            serialNumber: sn,
            status: "Stock",
          },
        });
      }
    }
  }

  // Create warehouse cells (skip if already exist)
  const existingCells = await prisma.warehouseCell.findMany({
    select: { name: true },
  });
  const existingCellNames = new Set(existingCells.map((c) => c.name));
  for (const cell of [
    { name: "A-01", zone: "Основной склад" },
    { name: "A-02", zone: "Основной склад" },
    { name: "B-01", zone: "Производственный цех" },
    { name: "C-01", zone: "Готовая продукция" },
  ]) {
    if (!existingCellNames.has(cell.name)) {
      await prisma.warehouseCell.create({ data: cell });
    }
  }

  // Create production routes (skip if already exist)
  const existingRoutes = await prisma.productionRoute.findFirst();
  if (!existingRoutes) {
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
  }

  console.log("Seed completed successfully!");
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
