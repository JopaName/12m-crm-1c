import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PERMISSIONS: Record<string, string[]> = {
  admin: [
    "dashboard:view",
    "clients:view", "clients:create", "clients:edit", "clients:delete",
    "leads:view", "leads:create", "leads:edit", "leads:delete", "leads:convert",
    "deals:view", "deals:create", "deals:edit", "deals:delete",
    "products:view", "products:create", "products:edit", "products:delete",
    "warehouse:view", "warehouse:create", "warehouse:edit", "warehouse:delete",
    "production:view", "production:create", "production:edit", "production:delete",
    "procurement:view", "procurement:create", "procurement:edit", "procurement:delete",
    "rent:view", "rent:create", "rent:edit", "rent:delete",
    "installation:view", "installation:create", "installation:edit", "installation:delete",
    "legal:view", "legal:create", "legal:edit", "legal:delete",
    "service:view", "service:create", "service:edit", "service:delete",
    "tasks:view", "tasks:create", "tasks:edit", "tasks:delete",
    "users:view", "users:create", "users:edit", "users:delete",
    "roles:view", "roles:create", "roles:edit", "roles:delete",
    "audit:view",
    "integrations:view", "integrations:create", "integrations:edit", "integrations:delete",
    "chat:view",
    "finance:view", "finance:create", "finance:edit", "finance:delete",
    "knowledge:view", "knowledge:create", "knowledge:edit", "knowledge:delete",
  ],
  manager: [
    "dashboard:view",
    "clients:view", "clients:create", "clients:edit",
    "leads:view", "leads:create", "leads:edit", "leads:convert",
    "deals:view", "deals:create", "deals:edit",
    "products:view",
    "warehouse:view",
    "tasks:view", "tasks:create", "tasks:edit",
    "chat:view",
    "knowledge:view",
  ],
  warehouse: [
    "dashboard:view",
    "products:view", "products:create", "products:edit",
    "warehouse:view", "warehouse:create", "warehouse:edit", "warehouse:delete",
    "tasks:view",
    "chat:view",
  ],
  installer: [
    "dashboard:view",
    "installation:view", "installation:edit",
    "tasks:view", "tasks:edit",
    "warehouse:view",
    "chat:view",
  ],
  production: [
    "dashboard:view",
    "production:view", "production:create", "production:edit",
    "products:view",
    "warehouse:view",
    "tasks:view",
    "chat:view",
  ],
  procurement: [
    "dashboard:view",
    "procurement:view", "procurement:create", "procurement:edit",
    "products:view",
    "warehouse:view",
    "tasks:view",
    "chat:view",
  ],
  accountant: [
    "dashboard:view",
    "clients:view",
    "deals:view",
    "finance:view", "finance:create", "finance:edit",
    "legal:view", "legal:create", "legal:edit",
    "chat:view",
  ],
  lawyer: [
    "dashboard:view",
    "clients:view",
    "deals:view",
    "legal:view", "legal:create", "legal:edit", "legal:delete",
    "chat:view",
  ],
  viewer: [
    "dashboard:view",
    "clients:view",
    "leads:view",
    "deals:view",
    "products:view",
    "warehouse:view",
    "production:view",
    "procurement:view",
    "rent:view",
    "installation:view",
    "legal:view",
    "service:view",
    "tasks:view",
    "chat:view",
    "knowledge:view",
  ],
};

const ROLES = [
  { name: "\u0410\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440", description: "\u041f\u043e\u043b\u043d\u044b\u0439 \u0434\u043e\u0441\u0442\u0443\u043f \u043a\u043e \u0432\u0441\u0435\u043c \u0440\u0430\u0437\u0434\u0435\u043b\u0430\u043c \u0441\u0438\u0441\u0442\u0435\u043c\u044b", key: "admin" },
  { name: "\u041c\u0435\u043d\u0435\u0434\u0436\u0435\u0440", description: "\u0420\u0430\u0431\u043e\u0442\u0430 \u0441 \u043a\u043b\u0438\u0435\u043d\u0442\u0430\u043c\u0438, \u043b\u0438\u0434\u0430\u043c\u0438, \u0441\u0434\u0435\u043b\u043a\u0430\u043c\u0438 \u0438 \u0437\u0430\u0434\u0430\u0447\u0430\u043c\u0438", key: "manager" },
  { name: "\u041a\u043b\u0430\u0434\u043e\u0432\u0449\u0438\u043a", description: "\u0423\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u0441\u043a\u043b\u0430\u0434\u043e\u043c \u0438 \u0442\u043e\u0432\u0430\u0440\u0430\u043c\u0438", key: "warehouse" },
  { name: "\u041c\u043e\u043d\u0442\u0430\u0436\u043d\u0438\u043a", description: "\u0412\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u0435 \u043c\u043e\u043d\u0442\u0430\u0436\u043d\u044b\u0445 \u0437\u0430\u0434\u0430\u0447", key: "installer" },
  { name: "\u041f\u0440\u043e\u0438\u0437\u0432\u043e\u0434\u0441\u0442\u0432\u043e", description: "\u0423\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u043f\u0440\u043e\u0438\u0437\u0432\u043e\u0434\u0441\u0442\u0432\u0435\u043d\u043d\u044b\u043c\u0438 \u0437\u0430\u043a\u0430\u0437\u0430\u043c\u0438", key: "production" },
  { name: "\u0417\u0430\u043a\u0443\u043f\u043a\u0438", description: "\u0423\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u0437\u0430\u043a\u0443\u043f\u043a\u0430\u043c\u0438 \u0438 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0430\u043c\u0438", key: "procurement" },
  { name: "\u0411\u0443\u0445\u0433\u0430\u043b\u0442\u0435\u0440", description: "\u0424\u0438\u043d\u0430\u043d\u0441\u043e\u0432\u044b\u0435 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u0438 \u0438 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b", key: "accountant" },
  { name: "\u042e\u0440\u0438\u0441\u0442", description: "\u0414\u043e\u0433\u043e\u0432\u043e\u0440\u044b \u0438 \u044e\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043a\u0438\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b", key: "lawyer" },
  { name: "\u041d\u0430\u0431\u043b\u044e\u0434\u0430\u0442\u0435\u043b\u044c", description: "\u0422\u043e\u043b\u044c\u043a\u043e \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440 \u0434\u0430\u043d\u043d\u044b\u0445", key: "viewer" },
];

async function main() {
  console.log("Seeding roles...\n");

  for (const rc of ROLES) {
    const existing = await prisma.role.findUnique({ where: { name: rc.name } });
    if (existing) {
      console.log("Updating: " + rc.name);
      await prisma.rolePermission.deleteMany({ where: { roleId: existing.id } });
      const perms = PERMISSIONS[rc.key] || [];
      await prisma.rolePermission.createMany({
        data: perms.map((p: string) => ({ roleId: existing.id, permission: p })),
      });
      console.log("  -> " + perms.length + " permissions updated");
    } else {
      console.log("Creating: " + rc.name);
      const perms = PERMISSIONS[rc.key] || [];
      const role = await prisma.role.create({
        data: {
          name: rc.name,
          description: rc.description,
          permissions: {
            create: perms.map((p: string) => ({ permission: p })),
          },
        },
      });
      console.log("  -> id: " + role.id + " (" + perms.length + " permissions)");
    }
  }

  const roles = await prisma.role.findMany({
    where: { isArchived: false },
    include: { _count: { select: { users: true } }, permissions: true },
    orderBy: { name: "asc" },
  });

  console.log("\nTotal roles: " + roles.length);
  for (const r of roles) {
    console.log("  " + r.name + ": " + r._count.users + " users, " + r.permissions.length + " permissions");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
