const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  const existing = await p.user.findUnique({ where: { email: 'test@e2e.test' } });
  if (existing) {
    console.log('Test user already exists: ' + existing.id);
    await p.$disconnect();
    return;
  }
  const hash = bcrypt.hashSync('test123!', 10);
  const user = await p.user.create({
    data: {
      email: 'test@e2e.test',
      passwordHash: hash,
      firstName: 'E2E',
      lastName: 'Test',
      roleId: 'cmq71msp000058cxty1r3qo9x',
      isActive: true,
    },
  });
  console.log('Created test user: ' + user.id);
  await p.$disconnect();
}
main().catch(e => { console.error(e); p.$disconnect(); process.exit(1); });
