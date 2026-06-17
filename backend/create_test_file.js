const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const p = new PrismaClient();

async function main() {
  const content = 'Hello from E2E test! ' + Date.now();
  const storageName = crypto.randomUUID() + '.txt';
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, storageName), content);

  const file = await p.file.create({
    data: {
      originalName: 'e2e-test-file.txt',
      storageName,
      mimeType: 'text/plain',
      sizeBytes: Buffer.byteLength(content),
      checksum: crypto.createHash('sha256').update(content).digest('hex'),
      entityType: 'procurement',
      entityId: 'e2e-test-entity',
      fieldName: 'fileDraft',
      version: 1,
      uploadedById: 'cmqgbn29l0001oyi4n58kbjln',
    },
  });
  console.log('Created test file: ' + file.id);
  await p.$disconnect();
}
main().catch(e => { console.error(e); p.$disconnect(); process.exit(1); });
