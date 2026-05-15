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

  const agentRole = roles[0];
  const engineerRole = roles[1];
  const directorRole = roles[8];

  const agents = await prisma.user.findMany({
    where: { roleId: agentRole.id },
  });
  const engineers = await prisma.user.findMany({
    where: { roleId: engineerRole.id },
  });
  const director = await prisma.user.findUnique({
    where: { email: "director@12m.ru" },
  });

  const existingClients = await prisma.client.findFirst();
  if (!existingClients) {
    const clientsData = [
      {
        name: "ООО «ЭнергоСтрой»",
        phone: "+7 (495) 123-45-67",
        email: "info@energostroy.ru",
        inn: "7701123456",
        kpp: "770101001",
        ogrn: "1027701234567",
        legalAddress: "г. Москва, ул. Строителей, д. 10",
        actualAddress: "г. Москва, ул. Строителей, д. 10",
        contactPerson: "Николаев Пётр Андреевич",
        createdById: director?.id,
      },
      {
        name: "ИП «Солнечный свет»",
        phone: "+7 (926) 555-34-21",
        email: "ivanov@sol-svet.ru",
        inn: "7728123456",
        kpp: "",
        contactPerson: "Иванов Сергей Викторович",
        createdById: director?.id,
      },
      {
        name: "АО «ПромАльтернатива»",
        phone: "+7 (499) 234-56-78",
        email: "info@promalt.ru",
        inn: "7744123456",
        kpp: "774401001",
        ogrn: "1037701234567",
        legalAddress: "г. Москва, ул. Промышленная, д. 5",
        actualAddress: "г. Москва, ул. Промышленная, д. 5",
        contactPerson: "Козлов Дмитрий Алексеевич",
        createdById: director?.id,
      },
    ];

    for (const c of clientsData) {
      await prisma.client.create({ data: c });
    }
  }

  const clients = await prisma.client.findMany();

  const existingLeads = await prisma.lead.findFirst();
  if (!existingLeads && agents.length > 0) {
    const leadsData = [
      {
        clientName: "ООО «ЭнергоСтрой»",
        clientPhone: "+7 (495) 123-45-67",
        clientEmail: "info@energostroy.ru",
        source: "Web-form",
        status: "Converted",
        assignedAgentId: agents[0].id,
        clientId: clients[0]?.id,
      },
      {
        clientName: "ИП Петров А.С.",
        clientPhone: "+7 (903) 777-88-99",
        clientEmail: "petrov@mail.ru",
        source: "Channel",
        status: "New",
        assignedAgentId: agents[0].id,
      },
      {
        clientName: "ООО «ТехноИнвест»",
        clientPhone: "+7 (495) 333-22-11",
        source: "Agent",
        status: "Contacted",
        assignedAgentId: agents[1 % agents.length].id,
      },
    ];

    for (const l of leadsData) {
      await prisma.lead.create({ data: l });
    }
  }

  const existingDeals = await prisma.deal.findFirst();
  if (!existingDeals && clients.length > 0 && agents.length > 0) {
    const deal1 = await prisma.deal.create({
      data: {
        dealNumber: "D-2025-001",
        dealType: "Sale",
        status: "InProgress",
        clientId: clients[0].id,
        responsibleAgentId: agents[0].id,
        expectedAmount: 1250000,
        actualAmount: null,
        description:
          "Поставка оборудования для АЗС — 30 солнечных панелей 550W + 5 инверторов 6.2kW + 10 АКБ 5kWh",
      },
    });

    const deal2 = await prisma.deal.create({
      data: {
        dealNumber: "D-2025-002",
        dealType: "ProjectSale",
        status: "New",
        clientId: clients[1 % clients.length].id,
        responsibleAgentId: agents[0].id,
        expectedAmount: 450000,
        description: "Монтаж солнечной станции 15kW для частного дома",
      },
    });

    const solarPanel = await prisma.product.findUnique({
      where: { sku: "SP-550-M" },
    });
    const inverter = await prisma.product.findUnique({
      where: { sku: "INV-6.2-H" },
    });
    const battery = await prisma.product.findUnique({
      where: { sku: "BAT-NI-5" },
    });

    if (solarPanel && director) {
      const panels = await prisma.productItem.findMany({
        where: { productId: solarPanel.id, status: "Stock" },
        take: 5,
      });
      for (const item of panels) {
        await prisma.warehouseMovement.create({
          data: {
            type: "Reserve",
            productItemId: item.id,
            dealId: deal1.id,
            fromCellId: null,
            toCellId: null,
            quantity: 1,
            createdById: director.id,
            notes: "Резерв под сделку D-2025-001",
          },
        });
        await prisma.reserve.create({
          data: {
            productItemId: item.id,
            dealId: deal1.id,
            quantity: 1,
            status: "Active",
            createdById: director.id,
          },
        });
      }
    }

    if (engineers.length > 0) {
      for (let i = 0; i < 3; i++) {
        const task = await prisma.task.findFirst({
          where: { dealId: deal1.id, type: "Technical" },
        });
        if (!task) {
          await prisma.task.create({
            data: {
              title: `Этап ${i + 1}: ${["Разработка КД", "Закупка материалов", "Подготовка производства"][i]}`,
              description: `Автоматически созданная задача по сделке D-2025-001`,
              type: "Technical",
              status: i === 0 ? "InProgress" : "New",
              priority: "High",
              dealId: deal1.id,
              createdById: director!.id,
              assigneeId: engineers[0].id,
            },
          });
        }
      }
    }

    if (inverter && battery && engineers.length > 0 && director) {
      const prodOrder = await prisma.productionOrder.findFirst({
        where: { dealId: deal2.id },
      });
      if (!prodOrder) {
        await prisma.productionOrder.create({
          data: {
            dealId: deal2.id,
            status: "New",
          },
        });
      }
    }
  }

  console.log("Seed completed successfully!");
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
