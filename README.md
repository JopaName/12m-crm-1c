# 12M CRM/ERP System

Production CRM for **NIK 12M LLC** — solar panel manufacturing, sales management, warehouse, production, and HR.

## Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js, Express, TypeScript, Prisma ORM, SQLite |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Query, React Router 6 |
| AI | qwen3.5-plus via OpenCode AI |
| Deploy | VDS (95.81.114.106), PM2, Nginx |

## Modules (23 pages)

| Module | Route | Description |
|--------|-------|-------------|
| Dashboard | `/` | Stats, active deals, today tasks |
| Clients | `/clients` | CRUD, cards/table view, search |
| Deals | `/deals` | Sales funnel, Kanban/table/cards, DealProgress (8 stages) |
| Products | `/products` | Catalog and equipment units |
| Warehouse | `/warehouse` | 1C-style: categories, items, receipts, transfers |
| Production | `/production` | Orders, routes, Kanban by status |
| Procurement | `/procurement` | Requests, suppliers, orders |
| Rent | `/rent` | Rent contracts, billing |
| Installation | `/installation` | Installation tasks, statuses |
| Legal | `/legal` | Legal docs, Director/Lawyer approval |
| Service | `/service` | Service cases, warranty |
| Tasks | `/tasks` | Kanban, cards by status |
| Referrals | `/referrals` | Referral tree, earnings, n8n-style workflow, invites |
| Users | `/users` | User management |
| Roles | `/roles` | RBAC, permissions |
| Chat | `/chat` | Internal chat |
| Knowledge | `/knowledge` | Company docs |

## Quick Start

```bash
# Backend
cd backend && npm install && npx prisma generate && npx prisma db push && npm run dev  # port 3000

# Frontend
cd frontend && npm install && npm run dev  # port 5173

# Production
cd frontend && npx vite build && cp -r dist/* /opt/crm/frontend/dist/
pm2 start backend/dist/index.js --name 12m-backend
```

## Key Features

- **Referral System**: multi-level tree, auto commission on deal close, n8n-style visual workflow, invite-link registration
- **DealProgress**: 8-stage pipeline bar (Client→Deal→Spec→Docs→Approval→Procurement→Receipt→Handover)
- **Document Generator**: HTML templates (Handlebars) — commercial offer, contract, invoice
- **Legal Workflow**: create → Director approve → Lawyer approve → sign
- **1C-style Warehouse**: category tree, item cards, receipts, transfers
- **Notifications**: bell icon with badge, slide-in panel, 20s polling
- **AI Assistant**: built-in chatbot (qwen3.5-plus)

## Test Users

| Email | Password | Role |
|-------|----------|------|
| admin@nik12m.ru | yiAoRGP_px34 | Director |
| director@nik12m.ru | yiAoRGP_px34 | Director |
| lawyer@nik12m.ru | yiAoRGP_px34 | Lawyer |

## API

Base: `http://95.81.114.106/api`

| Endpoint | Description |
|----------|-------------|
| `/auth/login` | Login |
| `/auth/register` | Create user (admin) |
| `/clients`, `/deals`, `/products`, `/tasks` | Full CRUD |
| `/deals/:id/items` | Deal specification |
| `/deals/:id/generate/:template` | Document generation (kp/dogovor/schet) |
| `/referrals/register` | Public referral registration |
| `/referrals/tree` | Referral tree (3 levels) |
| `/referrals/earnings` | Referral earnings |
| `/referrals/invite-link` | Generate invite link |
| `/referrals/config` | Commission config (GET/PUT) |
| `/warehouse`, `/production`, `/procurement`, `/rent`, `/installation`, `/legal`, `/service` | Full CRUD |
| `/notifications`, `/chat`, `/files`, `/roles`, `/users` | Additional modules |