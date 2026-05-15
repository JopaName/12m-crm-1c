# 12M ERP/CRM System

## Project structure

- A:\12m-crm\backend - Node.js/Express/TypeScript API with Prisma ORM
- A:\12m-crm\frontend - React/TypeScript with Vite and Tailwind CSS
- A:\12m-crm\database - Prisma schema (SQLite)

## Commands

- Backend: cd backend && npm install && npx prisma generate && npx ts-node src/seed.ts && npm run dev
- Frontend: cd frontend && npm install && npm run dev

## Architecture

- 34 entities defined in Prisma schema (database/schema.prisma)
- 9 roles with RBAC and row-level security
- 3 sales funnels: Warehouse sale, Project sale (turnkey), Rent (energy service)
- Integrations: 1C, Finance table, Telemetry (IoT), KEDO, Weather API
- Audit logging with immutable data constraints
- Lead-to-Cash lifecycle management
