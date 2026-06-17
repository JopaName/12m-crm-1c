const fs = require('fs');
const path = '/root/12m-crm-1c/backend/src/routes/userRoutes.ts';
let content = fs.readFileSync(path, 'utf-8');

// Check if import already exists
if (!content.includes('import { authLimiter }')) {
  // Find the last import line and add after it
  const lines = content.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) lastImportIdx = i;
  }
  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, 'import { authLimiter } from "../middleware/rateLimiter";');
    content = lines.join('\n');
    fs.writeFileSync(path, content);
    console.log('Added authLimiter import at line ' + (lastImportIdx + 2));
  } else {
    console.log('No import lines found');
  }
} else {
  console.log('authLimiter import already exists');
}
