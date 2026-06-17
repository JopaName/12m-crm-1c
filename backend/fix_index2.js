const fs = require('fs');
const path = '/root/12m-crm-1c/backend/src/index.ts';
let content = fs.readFileSync(path, 'utf-8');

// Move health endpoint before crudRoutes to keep it public
content = content.replace(
  'app.use("/api", authMiddleware, crudRoutes);\napp.use("/api/chat", authMiddleware, chatRoutes);\n\napp.get("/api/health", (_req, res) => {\n  res.json({ status: "ok", timestamp: new Date().toISOString() });\n});',
  'app.get("/api/health", (_req, res) => {\n  res.json({ status: "ok", timestamp: new Date().toISOString() });\n});\n\napp.use("/api", authMiddleware, crudRoutes);\napp.use("/api/chat", authMiddleware, chatRoutes);'
);

fs.writeFileSync(path, content);
console.log('Fixed health endpoint ordering');
