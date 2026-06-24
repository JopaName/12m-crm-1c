# 12M CRM — OpenCode Configuration

## Server
- **URL:** http://95.81.114.106
- **SSH:** root@95.81.114.106 (password auth)
- **Backend port:** 3000 (PM2: `12m-backend`)
- **Frontend:** Vite build → Nginx (`/opt/crm/frontend/dist/`)

## Commands

### Backend
```bash
cd /root/12m-crm-1c/backend
pm2 restart 12m-backend        # перезапуск
pm2 logs 12m-backend           # логи
npx prisma generate            # регенерация Prisma client
npx prisma db push             # применить schema изменения
sqlite3 prisma/dev.db          # прямой доступ к БД
```

### Frontend
```bash
cd /root/12m-crm-1c/frontend
npx vite build                 # сборка
rm -rf /opt/crm/frontend/dist/*
cp -r dist/* /opt/crm/frontend/dist/
```

### Git
```bash
cd /root/12m-crm-1c
git add -A && git commit -m "..." && git push origin master
```

## Architecture
- **53 Prisma models** (SQLite)
- **20+ API routes** in `backend/src/routes/`
- **23 pages** in `frontend/src/pages/`
- **17 components** in `frontend/src/components/`
- RBAC with role permissions
- JWT auth (auth middleware checks `decoded.userId`)

## Known Issues
- TypeScript compilation blocked: 6 errors in ChatService/chatRoutes/knowledgeRoutes
- Workaround: compile TS to JS manually into `backend/dist/`
- `prisma generate` must be run after schema changes