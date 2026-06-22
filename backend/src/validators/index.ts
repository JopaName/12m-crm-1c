import { z } from "zod";

export const idParam = z.object({ id: z.string().min(1) });

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const emailField = z.string().email().max(255);
export const phoneField = z.string().max(50).optional();
export const dateField = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/));

// --- Client ---
export const createClientSchema = z.object({
  name: z.string().min(1).max(500),
  phone: phoneField,
  email: z.string().email().max(255).optional().or(z.literal("")),
  inn: z.string().max(20).optional(),
  kpp: z.string().max(20).optional(),
  ogrn: z.string().max(30).optional(),
  legalAddress: z.string().max(1000).optional(),
  actualAddress: z.string().max(1000).optional(),
  contactPerson: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  source: z.string().max(50).optional(),
  status: z.string().max(50).optional(),
  address: z.string().max(1000).optional(),
  createdById: z.string().optional(),
});

export const updateClientSchema = createClientSchema.partial().extend({
  isArchived: z.boolean().optional(),
  source: z.string().max(50).optional(),
  status: z.string().max(50).optional(),
  address: z.string().max(1000).optional(),
  createdById: z.string().optional(),
});

// --- Lead ---
export const createLeadSchema = z.object({
  clientName: z.string().min(1).max(500),
  clientPhone: phoneField,
  clientEmail: z.string().email().max(255).optional().or(z.literal("")),
  source: z.string().max(200).optional(),
  notes: z.string().max(5000).optional(),
});

export const updateLeadSchema = z.object({
  clientName: z.string().min(1).max(500).optional(),
  clientPhone: phoneField.optional(),
  clientEmail: z.string().email().max(255).optional().or(z.literal("")),
  source: z.string().max(200).optional(),
  notes: z.string().max(5000).optional(),
  status: z.string().max(100).optional(),
});

export const convertLeadSchema = z.object({
  dealType: z.string().max(100).optional(),
  expectedAmount: z.number().nonnegative().optional(),
  clientInn: z.string().max(20).optional(),
});

// --- Deal ---
export const createDealSchema = z.object({
  clientId: z.string().min(1),
  clientInn: z.string().max(20).optional(),
  dealType: z.string().max(100),
  expectedAmount: z.number().nonnegative().optional(),
  description: z.string().max(5000).optional(),
});

export const updateDealStatusSchema = z.object({
  status: z.string().min(1).max(100),
});

// --- User ---
export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

export const createUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: phoneField,
  roleId: z.string().min(1),
});

export const updateUserSchema = z.object({
  email: z.string().email().max(255).optional(),
  password: z.string().min(6).max(128).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: phoneField.optional(),
  roleId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

// --- Product ---
export const createProductSchema = z.object({
  name: z.string().min(1).max(500),
  sku: z.string().max(100).optional(),
  category: z.string().max(200).optional(),
  unit: z.string().max(50).optional(),
  purchasePrice: z.number().nonnegative().optional(),
  sellingPrice: z.number().nonnegative().optional(),
  minStock: z.number().int().nonnegative().optional(),
  description: z.string().max(5000).optional(),
});

// --- Task ---
export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  type: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  assigneeId: z.string().min(1).optional(),
  dealId: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  dueDate: dateField.optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  assigneeId: z.string().min(1).optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  status: z.string().max(100).optional(),
  dueDate: dateField.optional(),
  isArchived: z.boolean().optional(),
});

// --- Invoice ---
export const createInvoiceSchema = z.object({
  clientId: z.string().min(1),
  dealId: z.string().optional(),
  amount: z.number().nonnegative(),
  description: z.string().max(5000).optional(),
  dueDate: dateField.optional(),
});

// --- Payment ---
export const createPaymentSchema = z.object({
  clientId: z.string().min(1),
  invoiceId: z.string().optional(),
  dealId: z.string().optional(),
  amount: z.number().positive(),
  method: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
});

// --- Procurement ---
export const createPurchaseRequestSchema = z.object({
  productId: z.string().optional(),
  productName: z.string().optional(),
  quantity: z.number().int().positive(),
  status: z.string().optional(),
  supplierId: z.string().optional(),
  responsibleUserId: z.string().optional(),
  dueDate: z.string().optional(),
  note: z.string().max(5000).optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  urgency: z.string().max(50).optional(),
  notes: z.string().max(5000).optional(),
});

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(500),
  contactPerson: z.string().max(500).optional(),
  phone: phoneField,
  email: z.string().email().max(255).optional().or(z.literal("")),
  inn: z.string().max(20).optional(),
  address: z.string().max(1000).optional(),
  paymentTerms: z.string().max(2000).optional(),
});

export const createSupplierOrderSchema = z.object({
  supplierId: z.string().min(1),
  items: z.array(z.object({
    productId: z.string().optional(),
    productName: z.string().optional(),
    quantity: z.number().int().positive(),
    price: z.number().nonnegative(),
  })).optional(),
  totalAmount: z.number().nonnegative().optional(),
  expectedDate: dateField.optional(),
  notes: z.string().max(5000).optional(),
});

// --- Role ---
export const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).optional(),
});

// --- Chat ---
export const sendMessageSchema = z.object({
  receiverId: z.string().min(1),
  content: z.string().min(1).max(10000),
});

// --- Legal ---
export const createLegalDocumentSchema = z.object({
  dealId: z.string().optional(),
  clientId: z.string().optional(),
  type: z.string().max(100),
  title: z.string().min(1).max(500),
  content: z.string().optional(),
  fileUrl: z.string().max(2000).optional(),
});

// --- Installation ---
export const createInstallationTaskSchema = z.object({
  dealId: z.string().min(1),
  installerId: z.string().optional(),
  installDate: dateField.optional(),
  address: z.string().max(1000).optional(),
  notes: z.string().max(5000).optional(),
});

// --- Rent ---
export const createRentContractSchema = z.object({
  clientId: z.string().min(1),
  equipmentIds: z.array(z.string()).optional(),
  startDate: dateField,
  endDate: dateField.optional(),
  monthlyPayment: z.number().nonnegative(),
  deposit: z.number().nonnegative().optional(),
  notes: z.string().max(5000).optional(),
});

// --- Service ---
export const createServiceCaseSchema = z.object({
  clientId: z.string().min(1),
  dealId: z.string().optional(),
  description: z.string().min(1).max(5000),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
});

// --- Production ---
export const createProductionOrderSchema = z.object({
  dealId: z.string().min(1),
  productionRouteId: z.string().optional(),
});

// --- Warehouse ---
export const createWarehouseMovementSchema = z.object({
  productItemId: z.string().min(1),
  fromCellId: z.string().optional(),
  toCellId: z.string().optional(),
  type: z.enum(["Incoming", "Outgoing", "Transfer"]),
  quantity: z.number().int().positive(),
  notes: z.string().max(5000).optional(),
});

// --- Telemetry ---
export const createTelemetryReadingSchema = z.object({
  deviceId: z.string().min(1),
  rentContractId: z.string().optional(),
  value: z.number(),
  unit: z.string().max(50).optional(),
  measuredAt: dateField.optional(),
});

// --- Integration ---
export const createIntegrationLogSchema = z.object({
  direction: z.enum(["Incoming", "Outgoing"]),
  system: z.string().max(100),
  request: z.string().optional(),
  response: z.string().optional(),
  status: z.string().max(50).optional(),
});
