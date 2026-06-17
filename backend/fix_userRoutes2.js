const fs = require('fs');
const path = '/root/12m-crm-1c/backend/src/routes/userRoutes.ts';
let content = fs.readFileSync(path, 'utf-8');

if (!content.includes('authLimiter')) {
  content = content.replace(
    'import { AuthRequest, authMiddleware } from "../middleware/auth";',
    'import { AuthRequest, authMiddleware } from "../middleware/auth";\nimport { authLimiter } from "../middleware/rateLimiter";'
  );
  fs.writeFileSync(path, content);
  console.log('Added authLimiter import');
} else {
  console.log('authLimiter already imported');
}
