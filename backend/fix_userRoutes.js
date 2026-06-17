const fs = require('fs');
const path = '/root/12m-crm-1c/backend/src/routes/userRoutes.ts';
let content = fs.readFileSync(path, 'utf-8');

// Add authLimiter import if not present
if (!content.includes('authLimiter')) {
  content = content.replace(
    "import { AuthRequest, authMiddleware } from '../middleware/auth';",
    "import { AuthRequest, authMiddleware } from '../middleware/auth';\nimport { authLimiter } from '../middleware/rateLimiter';"
  );
}

// Add authLimiter to login route
content = content.replace(
  'router.post("/login", async (req, res: Response) => {',
  'router.post("/login", authLimiter, async (req, res: Response) => {'
);

fs.writeFileSync(path, content);
console.log('Fixed userRoutes.ts');
