const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.role.findMany({ take: 10 }).then(r => {
  console.log(JSON.stringify(r.map(x => ({id: x.id, name: x.name})), null, 2));
  p.$disconnect();
});
