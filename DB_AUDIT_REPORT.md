# Database Audit Report вЂ” 12M CRM

**Date:** 24.06.2026  
**Schema:** 53 models, 148 indexes, 104 relations  
**Database:** SQLite 3.5 MB, 40 users, 70 deals, 62 clients

---

## Critical Issues

### 1. Duplicate Commission Models
**Models:** `AgentCommissionRecord` + `ReferralEarning`  
**Problem:** Two separate models track commissions. `AgentCommissionRecord` has 0 rows. `ReferralEarning` has 0 rows.  
**Fix:** Consolidate into one `CommissionRecord` model with a `type` discriminator (`SALES` / `REFERRAL`). Remove `AgentCommissionRecord`.  
**Impact:** Confusion for developers, double maintenance.

### 2. Duplicate File Storage
**Models:** `FileRecord` + `File`  
**Problem:** Two competing file storage systems. `FileRecord` (2 rows) uses cuid + deleted flag. `File` (3 rows) uses uuid + deletedAt.  
**Fix:** Consolidate into one `File` model. `File` is better designed (uuid, checksum, deletedAt).  
**Impact:** Frontend has to support both APIs.

### 3. Inconsistent Soft-Delete Pattern
**Problem:** 15 models use `isArchived Boolean`, 2 models use `deleted` / `deletedAt`, some have no soft-delete at all.  
**Fix:** Standardize: all entities use `deletedAt DateTime?` with `@@index([deletedAt])`.  
**Impact:** Queries inconsistently filter archived records.

### 4. ReferralEarning Hook Gap
**Problem:** Auto-earnings hook only fires on `PUT /deals/:id/status`, not on `POST /deals` with `status=Deal_Closed`. 60 deals in `Lead_Created`, but when closed via API they won't trigger commissions.  
**Fix:** Move hook logic to a shared function, call from both create and status-update routes.

### 5. Static Data Scattered as Models
**Problem:** `TariffRate` (4 rows), `ProductionStep` (7 rows), `ReferralCommissionConfig` (2 rows) are configuration data living in main tables.  
**Fix:** Consider storing in a single `AppConfig` JSON table or keeping as-is вЂ” acceptable at current scale.

---

## Structural Issues

### 6. Redundant String-to-Relation Pattern
**Example:** `WarehouseTransfer` stores `fromCategoryId String` and `toCategoryId String` without proper foreign keys.  
**Problem:** No referential integrity. Typo in category ID = orphaned record.  
**Fix:** Add `@relation` fields or at minimum `@@index` on these columns.

### 7. JSON Stored as String
**Locations:** `RentContract.billingFormula`, `BillingRecord.formulaSnapshot`  
**Problem:** Commented as `// JSON (change to Json type for PostgreSQL)` вЂ” but never changed.  
**Fix:** SQLite doesn't have native JSON, but Prisma supports `String` with JSON validation through middleware. No action needed for SQLite.

### 8. Missing `@updatedAt` on 9 Models
**Models:** `WarehouseMovement`, `DefectRecord`, `CashOrder`, `ActionMessage`, `ActionFile`, `AiChatMessage`, `AiChatFile`, `ChatMessage`, `LegalDocumentComment`  
**Problem:** These tables track creation time but not modification time.  
**Fix:** Add `updatedAt DateTime @updatedAt` to all models that could be modified.

### 9. Potentially Over-Indexed Tables
**Models:** `Deal` (6 indexes), `User` (1 index), `Invoice` (5 indexes), `Task` (8 indexes), `Lead` (5 indexes)  
**Problem:** SQLite performance is I/O bound, not index-bound. 8 indexes on `Task` (32 rows) is excessive.  
**Fix:** Keep indexes that match actual query patterns. Remove unused composite indexes.

### 10. Mixed ID Strategies
**Problem:** Most models use `@default(cuid())`, but `File` uses `@default(uuid())`.  
**Fix:** Standardize on `cuid()` for consistency.

---

## Data Quality Issues

### 11. Deal Status Typos
**Sample:** 1 deal has status `closed` (lowercase) instead of `Deal_Closed`.  
**Fix:** Add Prisma `@default` or enum validation to prevent bad statuses.

### 12. 24 Empty Tables (45% of Models)
**Tables:** InstallationTask, ProductionOrder, Project, ServiceCase, Payment, Invoice, BillingRecord, TelemetryDevice, etc.  
**Assessment:** NOT a bug вЂ” many modules are built for future use.  
**Recommendation:** Consider flagging unused models with `@unused` comment for cleanup in v2.

---

## Index Analysis

### Missing Indexes
| Table | Column(s) | Reason |
|-------|----------|--------|
| `User` | `referralCode` | Lookup during referral registration |
| `User` | `roleId` | User listing by role |
| `Notification` | `createdAt` | Cleanup old notifications |
| `ChatMessage` | `(senderId, receiverId, createdAt)` | Chat history queries |
| `ReferralEarning` | `status` | Filter by paid/pending |
| `Deal` | `createdAt` | Dashboard "recent deals" |
| `Client` | `createdAt` | Dashboard "new clients" |

### Redundant Indexes
| Table | Index | Reason |
|-------|-------|--------|
| `Task` | `@@index([assigneeId, status])` + `@@index([isArchived, assigneeId, status])` | Second covers first |
| `Lead` | `@@index([status])` + `@@index([status, assignedAgentId])` | Second covers first |
| `Deal` | `@@index([status])` + `@@index([clientId, status])` | Second does not cover standalone status query |

---

## Recommendations by Priority

### P0 вЂ” Immediate
1. Fix `closed` в†’ `Deal_Closed` deal status typo
2. Add index on `User.referralCode`

### P1 вЂ” This Week
3. Consolidate `AgentCommissionRecord` + `ReferralEarning`
4. Consolidate `FileRecord` + `File`
5. Standardize soft-delete to `deletedAt`
6. Move earnings hook to shared function

### P2 вЂ” Next Sprint
7. Add `@updatedAt` to 9 models
8. Remove redundant composite indexes
9. Standardize ID generation on `cuid()`
10. Add `createdAt` indexes for dashboard queries

### P3 вЂ” Future
11. Consider PostgreSQL migration for JSON, enums, cascading deletes
12. Flag unused models for v2 cleanup
