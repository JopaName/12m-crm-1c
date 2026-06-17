const fs = require('fs');
const path = '/root/12m-crm-1c/backend/src/index.ts';
let content = fs.readFileSync(path, 'utf-8');

// Fix 1: Move crudRoutes and chatRoutes before health endpoint
content = content.replace(
  'app.get("/api/health", (_req, res) => {\n\napp.use("/api", authMiddleware, crudRoutes);\napp.use("/api/chat", authMiddleware, chatRoutes);\n  res.json({ status: "ok", timestamp: new Date().toISOString() });\n});',
  'app.use("/api", authMiddleware, crudRoutes);\napp.use("/api/chat", authMiddleware, chatRoutes);\n\napp.get("/api/health", (_req, res) => {\n  res.json({ status: "ok", timestamp: new Date().toISOString() });\n});'
);

// Fix 2: Move authLimiter from global /api/auth to only the login route
// Remove the global auth limiter
content = content.replace(
  'app.use("/api/auth", authLimiter);\napp.use("/api", apiLimiter);',
  'app.use("/api", apiLimiter);\n'
);

fs.writeFileSync(path, content);
console.log('Fixed index.ts');
