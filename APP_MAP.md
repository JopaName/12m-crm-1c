# 12M CRM — Application Map

## Pages (23)
```
/login          — Login
/register?ref=  — Referral registration (public)
/               — Dashboard
/clients        — Clients (cards/table)
/clients/:id    — Client detail
/deals          — Deals (kanban/table/cards + modal with DealProgress)
/products       — Products catalog
/warehouse      — Warehouse (items/receipts/transfers, 1C-style)
/production     — Production orders (kanban)
/procurement    — Procurement (requests/suppliers)
/rent           — Rent contracts
/installation   — Installation tasks
/legal          — Legal documents (approval workflow)
/service        — Service cases
/tasks          — Tasks (kanban/cards)
/referrals      — Referral tree
/referrals/workflow — n8n-style visual tree
/referrals/sales    — My sales
/referrals/earnings — Referral earnings
/referrals/invite   — Invite link
/referrals/config   — Commission config (admin)
/users          — Users
/roles          — Roles & permissions
/chat           — Internal chat
/knowledge      — Knowledge base
```

## API Routes (20+)
```
/auth/*         — Login, register, users, me
/clients/*      — Full CRUD + actions
/deals/*        — Full CRUD + items + generate documents
/products/*     — Full CRUD + items
/warehouse/*    — Categories, items, movements, transfers
/production/*   — Orders, routes
/procurement/*  — Requests, suppliers, orders
/rent/*         — Contracts, billing
/installation/* — Tasks
/legal/*        — Documents, approve/reject
/service/*      — Cases
/tasks/*        — Full CRUD
/referrals/*    — Register (public), tree, earnings, invite-link, config
/notifications/*— List, mark-read, unread-count
/chat/*         — Messages, conversations
/files/*        — Upload, download, preview
/roles/*        — Full CRUD
/dashboard/*    — Summary, finance, pulse
/ai/*           — AI coordinator
```

## Components (20)
```
Layout              — Sidebar + header + Breadcrumbs
DealProgress        — 8-stage pipeline bar
NotificationBell    — Bell icon + slide-in panel
ReferralWorkflow    — n8n-style visual referral tree
EntityCard          — Unified card component
RelationBadge       — Clickable relation badge
Breadcrumbs         — Auto-generated from URL
KanbanView          — Kanban board
GlobalSearch        — Global search
FilePreviewModal    — File preview with Monaco
AiChatInterface     — AI chat widget
AiFloatPanel        — Floating AI panel
ClientActions       — Client action panel (17KB, complex)
StatsBar            — Stats display
PageToolbar         — Page toolbar
ActionConfirmationCard — Delete confirmation
ActionContextPanel  — Context panel
OnBoardingGuide     — Onboarding
```

## Database (53 models)
Key models: User, Client, Deal, DealItem, Product, Task, LegalDocument, Handover, ReferralEarning, ReferralCommissionConfig, WarehouseCategory, ProductionRoute, PurchaseRequest, RentContract, InstallationTask, ServiceCase, Notification, Role, RolePermission, File, ChatMessage