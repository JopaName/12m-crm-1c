<div align="center">
  <h1>12M CRM / ERP</h1>
  <p><strong>Production management system for solar panel manufacturing</strong></p>
  <p>
    <img src="https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript" alt="TypeScript">
    <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React">
    <img src="https://img.shields.io/badge/Node.js-18-339933?logo=nodedotjs" alt="Node.js">
    <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma" alt="Prisma">
    <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss" alt="Tailwind">
    <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite" alt="Vite">
    <img src="https://img.shields.io/badge/SQLite-003B57?logo=sqlite" alt="SQLite">
  </p>
</div>

## Overview

12M CRM is a full-featured enterprise resource planning system built for **NIK 12M LLC**, a solar panel manufacturing company. It streamlines sales, production, warehouse, procurement, and HR operations in a single platform.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js 18, Express, TypeScript, Prisma ORM, SQLite |
| **Frontend** | React 18, TypeScript, Vite 6, Tailwind CSS 3, React Query, React Router 6 |
| **AI** | OpenCode AI integration |
| **Deployment** | PM2, Nginx |

## Project Structure

```
12m-crm-1c/
├── backend/                # Express API server
│   ├── src/
│   │   ├── routes/         # REST API routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/      # Auth, permissions, rate limiter
│   │   ├── config/         # App configuration
│   │   ├── utils/          # Helpers & logger
│   │   └── index.ts        # Entry point
│   ├── prisma/             # Schema & migrations
│   └── package.json
├── frontend/               # React SPA
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages (23 modules)
│   │   ├── api/            # API client
│   │   ├── hooks/          # Custom hooks
│   │   ├── context/        # Auth, chat providers
│   │   └── main.tsx        # Entry point
│   └── package.json
└── database/               # Shared schema reference
```

## Modules

| Module | Route | Description |
|--------|-------|-------------|
| Dashboard | `/` | KPIs, active deals, tasks |
| Clients | `/clients` | CRM with card/table views |
| Deals | `/deals` | Sales pipeline with Kanban board, 8-stage DealProgress bar |
| Products | `/products` | Catalog & equipment units |
| Warehouse | `/warehouse` | Category tree, stock items, receipts, transfers |
| Production | `/production` | Manufacturing orders, Kanban by status |
| Procurement | `/procurement` | Purchase requests, suppliers, orders |
| Rent | `/rent` | Rental contracts & billing |
| Installation | `/installation` | On-site installation tracking |
| Legal | `/legal` | Document workflow with Director/Lawyer approval |
| Service | `/service` | Warranty & service cases |
| Tasks | `/tasks` | Kanban board with deal-linked tasks |
| Referrals | `/referrals` | Multi-level tree, commissions, invite-link registration |
| Chat | `/chat` | Internal messaging with mentions |
| Knowledge | `/knowledge` | Company knowledge base |
| Users | `/users` | User management |
| Roles | `/roles` | RBAC with granular permissions |

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Development

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev          # http://localhost:3000

# Frontend
cd frontend
npm install
npm run dev          # http://localhost:5173
```

### Production Build

```bash
cd frontend
npx vite build
# Output: frontend/dist/
```

## API Overview

Base URL: `/api`

| Endpoint | Description |
|----------|-------------|
| `POST /auth/login` | Authentication |
| `/deals` | Sales pipeline (CRUD, items, documents, files, status transitions) |
| `/clients`, `/products`, `/tasks` | Core CRM entities (full CRUD) |
| `/warehouse`, `/production`, `/procurement` | Operations management |
| `/referrals` | Referral system (tree, earnings, config, invite links) |
| `/chat` | Internal messaging (direct, rooms, entity-linked) |
| `/notifications` | Real-time notifications (polling-based) |
| `/legal` | Legal document workflow |
| `/roles` | Role-based access control |

## Key Features

- **Sales Pipeline**: 8-stage Kanban board (Lead → Deal → Spec → Docs → Approval → Procurement → Receipt → Handover)
- **Referral System**: Multi-level commission tree with visual workflow builder
- **Document Generation**: Template-based (Handlebars) — commercial offers, contracts, invoices
- **RBAC**: Granular permission system with role-based access control
- **Entity-linked Chat**: Messages attached to deals with @-mentions
- **AI Assistant**: Context-aware chatbot integration

## License

Internal project — proprietary.
