export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export const ALL_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "search_client",
      description: "Search clients by name, phone, email or INN (fuzzy search across all fields)",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" }
        },
        required: ["query"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_client",
      description: "Get full client info with deals, invoices, payments, actions",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "Client ID" }
        },
        required: ["client_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_client",
      description: "Create a new client",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Company name or full name" },
          phone: { type: "string", description: "Phone number" },
          email: { type: "string", description: "Email address" },
          inn: { type: "string", description: "INN (tax ID)" },
          kpp: { type: "string", description: "KPP" },
          ogrn: { type: "string", description: "OGRN" },
          legalAddress: { type: "string", description: "Legal address" },
          actualAddress: { type: "string", description: "Actual address" },
          contactPerson: { type: "string", description: "Contact person name" },
          source: { type: "string", description: "Lead source (call, website, referral, etc.)" },
          notes: { type: "string", description: "Additional notes" }
        },
        required: ["name"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_client",
      description: "Update client info. Requires Director role or being the original creator.",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "Client ID" },
          name: { type: "string", description: "Company name" },
          phone: { type: "string", description: "Phone" },
          email: { type: "string", description: "Email" },
          inn: { type: "string", description: "INN" },
          kpp: { type: "string", description: "KPP" },
          ogrn: { type: "string", description: "OGRN" },
          legalAddress: { type: "string", description: "Legal address" },
          actualAddress: { type: "string", description: "Actual address" },
          contactPerson: { type: "string", description: "Contact person" },
          status: { type: "string", description: "Status" },
          notes: { type: "string", description: "Notes" }
        },
        required: ["client_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "archive_client",
      description: "Archive (soft-delete) a client. Director role required.",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "Client ID" }
        },
        required: ["client_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_deal",
      description: "Create a new deal with auto-generated deal number. Auto-assigns current user as responsible agent.",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "Client ID" },
          dealType: { type: "string", description: "Deal type (Sale, Rent, Service, etc.)" },
          expectedAmount: { type: "number", description: "Expected amount" },
          description: { type: "string", description: "Description" }
        },
        required: ["client_id", "dealType", "expectedAmount"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_deal",
      description: "Get full deal info with client, tasks, invoices, payments, agent",
      parameters: {
        type: "object",
        properties: {
          deal_id: { type: "string", description: "Deal ID" }
        },
        required: ["deal_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_deal_status",
      description: "Update deal status. Triggers notifications for relevant users.",
      parameters: {
        type: "object",
        properties: {
          deal_id: { type: "string", description: "Deal ID" },
          status: { type: "string", description: "New status (New, InProgress, AT_Engineering, Project_Approval, Production, Installation, Completed, Cancelled)" }
        },
        required: ["deal_id", "status"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_deals",
      description: "List deals. Agents see only their own deals.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status (optional)" },
          limit: { type: "number", description: "Max results" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task. Sends notification to assignee.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Task description" },
          assignee_id: { type: "string", description: "Assignee user ID" },
          priority: { type: "string", description: "Priority", enum: ['Low', 'Medium', 'High', 'Critical'] },
          deadline: { type: "string", description: "Date in YYYY-MM-DD format" },
          deal_id: { type: "string", description: "Related deal ID (optional)" }
        },
        required: ["title"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Update task (status, assignee, priority, etc.)",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "Task ID" },
          title: { type: "string", description: "Title" },
          description: { type: "string", description: "Description" },
          status: { type: "string", description: "Status (New, InProgress, Completed, Cancelled)" },
          priority: { type: "string", description: "Priority", enum: ['Low', 'Medium', 'High', 'Critical'] },
          assignee_id: { type: "string", description: "Assignee user ID" },
          dueDate: { type: "string", description: "Deadline YYYY-MM-DD" }
        },
        required: ["task_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List tasks. Agents see only their assigned tasks.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status" },
          assignee_id: { type: "string", description: "Filter by assignee" },
          limit: { type: "number", description: "Max results" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_product",
      description: "Create a new product in catalog",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Product name" },
          sku: { type: "string", description: "SKU (unique)" },
          description: { type: "string", description: "Description" },
          category: { type: "string", description: "Category" },
          unit: { type: "string", description: "Unit (pcs, m, sqm, etc.)" },
          purchasePrice: { type: "number", description: "Purchase price" },
          salePrice: { type: "number", description: "Sale price" },
          rentPrice: { type: "number", description: "Rent price per month" }
        },
        required: ["name", "sku", "unit"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_product",
      description: "Update product info",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "Product ID" },
          name: { type: "string", description: "Name" },
          description: { type: "string", description: "Description" },
          category: { type: "string", description: "Category" },
          unit: { type: "string", description: "Unit" },
          purchasePrice: { type: "number", description: "Purchase price" },
          salePrice: { type: "number", description: "Sale price" },
          rentPrice: { type: "number", description: "Rent price" }
        },
        required: ["product_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_products",
      description: "List products in catalog",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Filter by category" },
          limit: { type: "number", description: "Max results" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_warehouse_stock",
      description: "Get warehouse stock balances by category",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Category name filter" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_stock_item",
      description: "Add new item to warehouse stock",
      parameters: {
        type: "object",
        properties: {
          categoryId: { type: "string", description: "Warehouse category ID" },
          productName: { type: "string", description: "Product name" },
          quantity: { type: "number", description: "Quantity" },
          unit: { type: "string", description: "Unit of measure" },
          sku: { type: "string", description: "SKU" },
          purchasePrice: { type: "number", description: "Purchase price" },
          salePrice: { type: "number", description: "Sale price" },
          note: { type: "string", description: "Note" }
        },
        required: ["categoryId", "productName", "quantity", "unit"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "transfer_stock",
      description: "Transfer stock between warehouse categories",
      parameters: {
        type: "object",
        properties: {
          item_id: { type: "string", description: "Stock item ID" },
          from_category_id: { type: "string", description: "Source category ID" },
          to_category_id: { type: "string", description: "Destination category ID" },
          quantity: { type: "number", description: "Quantity to transfer" },
          note: { type: "string", description: "Transfer note" }
        },
        required: ["item_id", "from_category_id", "to_category_id", "quantity"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_warehouse_categories",
      description: "List all warehouse categories",
      parameters: {
        type: "object",
        properties: {

        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_warehouse_category",
      description: "Create a warehouse category",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Category name" },
          parentId: { type: "string", description: "Parent category ID (optional)" }
        },
        required: ["name"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_warehouse_cells",
      description: "List all warehouse cells/zones",
      parameters: {
        type: "object",
        properties: {
          zone: { type: "string", description: "Filter by zone" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_warehouse_cell",
      description: "Create a warehouse storage cell",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Cell name/number" },
          zone: { type: "string", description: "Zone" }
        },
        required: ["name"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_warehouse_movements",
      description: "List warehouse movement history",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", description: "Filter by movement type" },
          limit: { type: "number", description: "Max results" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_employees",
      description: "List employees with role filter",
      parameters: {
        type: "object",
        properties: {
          role: { type: "string", description: "Filter by role name (Director, Agent, etc.)" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_employee_salary",
      description: "Get employee salary details. Administrators/Directors only.",
      parameters: {
        type: "object",
        properties: {
          employee_id: { type: "string", description: "Employee user ID" }
        },
        required: ["employee_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_user",
      description: "Create a new employee/user with password hashing",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "Email (login)" },
          password: { type: "string", description: "Password" },
          firstName: { type: "string", description: "First name" },
          lastName: { type: "string", description: "Last name" },
          phone: { type: "string", description: "Phone number" },
          roleName: { type: "string", description: "Role name (Director, Agent, Installer, etc.)" }
        },
        required: ["email", "password", "firstName", "lastName", "roleName"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_user",
      description: "Update employee/user info",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string", description: "User ID" },
          email: { type: "string", description: "Email" },
          firstName: { type: "string", description: "First name" },
          lastName: { type: "string", description: "Last name" },
          phone: { type: "string", description: "Phone" },
          isActive: { type: "boolean", description: "Active status" }
        },
        required: ["user_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "archive_user",
      description: "Archive/deactivate an employee user",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string", description: "User ID" }
        },
        required: ["user_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_roles",
      description: "List all roles with permissions",
      parameters: {
        type: "object",
        properties: {

        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_role",
      description: "Create a new role",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Role name" },
          description: { type: "string", description: "Description" },
          permissions: { type: "array", description: "Array of permission strings" }
        },
        required: ["name"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_leads",
      description: "List leads with optional status filter",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status" },
          limit: { type: "number", description: "Max results" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_lead",
      description: "Create a new lead",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string", description: "Client name" },
          clientPhone: { type: "string", description: "Client phone" },
          clientEmail: { type: "string", description: "Client email" },
          source: { type: "string", description: "Source" },
          status: { type: "string", description: "Status" }
        },
        required: ["clientName", "clientPhone", "source"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_lead",
      description: "Update lead info, status, or convert to client",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "Lead ID" },
          status: { type: "string", description: "Status" },
          clientName: { type: "string", description: "Client name" },
          clientPhone: { type: "string", description: "Client phone" },
          clientEmail: { type: "string", description: "Client email" },
          notes: { type: "string", description: "Notes" }
        },
        required: ["lead_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_invoices",
      description: "List invoices with optional filters",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status" },
          client_id: { type: "string", description: "Filter by client" },
          limit: { type: "number", description: "Max results" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_invoice",
      description: "Create an invoice",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "Client ID" },
          deal_id: { type: "string", description: "Deal ID (optional)" },
          amount: { type: "number", description: "Amount" },
          dueDate: { type: "string", description: "Due date YYYY-MM-DD" },
          status: { type: "string", description: "Status" }
        },
        required: ["client_id", "amount"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_invoice",
      description: "Update invoice status (Paid, Overdue, Cancelled, etc.)",
      parameters: {
        type: "object",
        properties: {
          invoice_id: { type: "string", description: "Invoice ID" },
          status: { type: "string", description: "Status" },
          paidAt: { type: "string", description: "Paid date YYYY-MM-DD" }
        },
        required: ["invoice_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_payments",
      description: "List payments with optional filters",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status" },
          client_id: { type: "string", description: "Filter by client" },
          limit: { type: "number", description: "Max results" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_payment",
      description: "Record a payment",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "Client ID" },
          invoice_id: { type: "string", description: "Invoice ID (optional)" },
          deal_id: { type: "string", description: "Deal ID (optional)" },
          amount: { type: "number", description: "Amount" },
          method: { type: "string", description: "Payment method (Cash, BankTransfer, Card, etc.)" },
          status: { type: "string", description: "Status" }
        },
        required: ["client_id", "amount", "method"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "confirm_payment",
      description: "Confirm/reconcile a payment. Updates invoice status automatically. Directors only.",
      parameters: {
        type: "object",
        properties: {
          payment_id: { type: "string", description: "Payment ID" }
        },
        required: ["payment_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_cash_order",
      description: "Create a cash order (incoming/outgoing)",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", description: "Type (Income, Expense)" },
          amount: { type: "number", description: "Amount" },
          category: { type: "string", description: "Category" },
          description: { type: "string", description: "Description" },
          deal_id: { type: "string", description: "Deal ID (optional)" }
        },
        required: ["type", "amount", "category"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_cash_orders",
      description: "List cash orders with type filter",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", description: "Filter by type (Income, Expense)" },
          limit: { type: "number", description: "Max results" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_production_orders",
      description: "List production orders",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status" },
          limit: { type: "number", description: "Max results" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_production_order",
      description: "Create a production order linked to a deal",
      parameters: {
        type: "object",
        properties: {
          deal_id: { type: "string", description: "Deal ID" },
          specificationId: { type: "string", description: "Specification ID (optional)" },
          productionRouteId: { type: "string", description: "Production route ID (optional)" }
        },
        required: ["deal_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_production_status",
      description: "Update production order status (auto-calculates labor cost on completion)",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "string", description: "Production order ID" },
          status: { type: "string", description: "New status" }
        },
        required: ["order_id", "status"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_production_route",
      description: "Create a production route with steps",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Route name" },
          description: { type: "string", description: "Description" }
        },
        required: ["name"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_production_routes",
      description: "List production routes and steps",
      parameters: {
        type: "object",
        properties: {

        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Create a project for a deal",
      parameters: {
        type: "object",
        properties: {
          deal_id: { type: "string", description: "Deal ID (must be unique, one project per deal)" },
          installTimeDays: { type: "number", description: "Installation time in days" },
          workersCount: { type: "number", description: "Number of workers needed" },
          installCost: { type: "number", description: "Installation cost" },
          gpsCoordinates: { type: "string", description: "GPS coordinates" },
          photoBefore: { type: "string", description: "Photo before URL" }
        },
        required: ["deal_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_project",
      description: "Update project info",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          installTimeDays: { type: "number", description: "Installation time in days" },
          workersCount: { type: "number", description: "Number of workers" },
          installCost: { type: "number", description: "Installation cost" },
          chiefEngineerApproval: { type: "string", description: "Approval status" },
          gpsCoordinates: { type: "string", description: "GPS coordinates" }
        },
        required: ["project_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_installations",
      description: "List installation tasks",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status" },
          limit: { type: "number", description: "Max results" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_installation_task",
      description: "Schedule an installation task",
      parameters: {
        type: "object",
        properties: {
          deal_id: { type: "string", description: "Deal ID" },
          installer_id: { type: "string", description: "Installer user ID" },
          installDate: { type: "string", description: "Install date YYYY-MM-DD" },
          plannedEndDate: { type: "string", description: "Planned end date" },
          notes: { type: "string", description: "Notes" }
        },
        required: ["deal_id", "installer_id", "installDate"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_installation_task",
      description: "Update installation task (status, dates, photos, signature)",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "Task ID" },
          status: { type: "string", description: "Status" },
          installDate: { type: "string", description: "New date" },
          notes: { type: "string", description: "Notes" }
        },
        required: ["task_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_installation_calendar",
      description: "Get installation calendar events",
      parameters: {
        type: "object",
        properties: {
          installer_id: { type: "string", description: "Filter by installer" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_installation_event",
      description: "Create a calendar event for installation",
      parameters: {
        type: "object",
        properties: {
          installationTaskId: { type: "string", description: "Installation task ID" },
          title: { type: "string", description: "Event title" },
          startDate: { type: "string", description: "Start date YYYY-MM-DD" },
          endDate: { type: "string", description: "End date YYYY-MM-DD" },
          installerId: { type: "string", description: "Installer ID" }
        },
        required: ["installationTaskId", "title", "startDate", "endDate", "installerId"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_legal_documents",
      description: "List legal documents",
      parameters: {
        type: "object",
        properties: {
          documentType: { type: "string", description: "Filter by document type" },
          status: { type: "string", description: "Filter by status" },
          limit: { type: "number", description: "Max results" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_legal_document",
      description: "Create a legal document",
      parameters: {
        type: "object",
        properties: {
          documentType: { type: "string", description: "Document type (Contract, Invoice, Act, etc.)" },
          deal_id: { type: "string", description: "Deal ID" },
          client_id: { type: "string", description: "Client ID" },
          responsibleLawyerId: { type: "string", description: "Responsible lawyer ID" },
          documentNumber: { type: "string", description: "Document number" },
          fileDraft: { type: "string", description: "Draft file URL" }
        },
        required: ["documentType"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_legal_document",
      description: "Update legal document status, approve, sign",
      parameters: {
        type: "object",
        properties: {
          document_id: { type: "string", description: "Document ID" },
          status: { type: "string", description: "Status (Draft, Approved, Signed, etc.)" },
          documentNumber: { type: "string", description: "Document number" },
          fileSigned: { type: "string", description: "Signed file URL" }
        },
        required: ["document_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_legal_comment",
      description: "Add a comment to a legal document",
      parameters: {
        type: "object",
        properties: {
          document_id: { type: "string", description: "Legal document ID" },
          content: { type: "string", description: "Comment text" }
        },
        required: ["document_id", "content"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_service_cases",
      description: "List service/maintenance cases",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status" },
          limit: { type: "number", description: "Max results" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_service_case",
      description: "Create a service/maintenance case",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "Client ID" },
          deal_id: { type: "string", description: "Deal ID (optional)" },
          type: { type: "string", description: "Type (Warranty, Repair, Maintenance, etc.)" },
          description: { type: "string", description: "Description of issue" }
        },
        required: ["client_id", "type"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_service_case",
      description: "Update service case status and resolution",
      parameters: {
        type: "object",
        properties: {
          case_id: { type: "string", description: "Service case ID" },
          status: { type: "string", description: "Status (New, InProgress, Resolved, Closed)" },
          resolution: { type: "string", description: "Resolution description" }
        },
        required: ["case_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_defect_record",
      description: "Record a defect found during production or service",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Defect description" },
          severity: { type: "string", description: "Severity (Critical, Major, Minor)" },
          productionOrderId: { type: "string", description: "Production order ID (optional)" },
          serviceCaseId: { type: "string", description: "Service case ID (optional)" }
        },
        required: ["description", "severity"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_rent_contracts",
      description: "List rent contracts",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status" },
          limit: { type: "number", description: "Max results" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_rent_contract",
      description: "Create a rent contract with auto-generated contract number",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "Client ID" },
          deal_id: { type: "string", description: "Deal ID (optional)" },
          startDate: { type: "string", description: "Start date YYYY-MM-DD" },
          endDate: { type: "string", description: "End date YYYY-MM-DD" },
          monthlyPayment: { type: "number", description: "Monthly payment" },
          billingFormula: { type: "string", description: "Billing formula (JSON)" }
        },
        required: ["client_id", "startDate"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_rent_contract",
      description: "Update rent contract",
      parameters: {
        type: "object",
        properties: {
          contract_id: { type: "string", description: "Contract ID" },
          status: { type: "string", description: "Status" },
          monthlyPayment: { type: "number", description: "Monthly payment" },
          endDate: { type: "string", description: "End date" }
        },
        required: ["contract_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_billing_record",
      description: "Create a billing record for a rent contract period",
      parameters: {
        type: "object",
        properties: {
          rentContractId: { type: "string", description: "Rent contract ID" },
          period: { type: "string", description: "Period (e.g. 2026-06)" },
          amount: { type: "number", description: "Amount" },
          energyProduced: { type: "number", description: "Energy produced kWh" },
          status: { type: "string", description: "Status" }
        },
        required: ["rentContractId", "period", "amount"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_suppliers",
      description: "List suppliers",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max results" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_supplier",
      description: "Create a new supplier",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Supplier name" },
          contactPerson: { type: "string", description: "Contact person" },
          phone: { type: "string", description: "Phone" },
          email: { type: "string", description: "Email" },
          inn: { type: "string", description: "INN" },
          address: { type: "string", description: "Address" }
        },
        required: ["name"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_supplier",
      description: "Update supplier info",
      parameters: {
        type: "object",
        properties: {
          supplier_id: { type: "string", description: "Supplier ID" },
          name: { type: "string", description: "Name" },
          contactPerson: { type: "string", description: "Contact person" },
          phone: { type: "string", description: "Phone" },
          email: { type: "string", description: "Email" },
          address: { type: "string", description: "Address" }
        },
        required: ["supplier_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "archive_supplier",
      description: "Archive a supplier",
      parameters: {
        type: "object",
        properties: {
          supplier_id: { type: "string", description: "Supplier ID" }
        },
        required: ["supplier_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_purchase_requests",
      description: "List purchase requests",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status" },
          limit: { type: "number", description: "Max results" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_purchase_request",
      description: "Create a purchase request for materials",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "Product ID" },
          quantity: { type: "number", description: "Quantity" },
          deal_id: { type: "string", description: "Deal ID (optional)" },
          supplierId: { type: "string", description: "Supplier ID (optional)" }
        },
        required: ["productId", "quantity"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_purchase_request",
      description: "Update purchase request status/quantity",
      parameters: {
        type: "object",
        properties: {
          request_id: { type: "string", description: "Purchase request ID" },
          status: { type: "string", description: "Status" },
          quantity: { type: "number", description: "Quantity" }
        },
        required: ["request_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_supplier_order",
      description: "Create a supplier order with auto-generated order number",
      parameters: {
        type: "object",
        properties: {
          supplierId: { type: "string", description: "Supplier ID" },
          totalAmount: { type: "number", description: "Total amount" },
          expectedDate: { type: "string", description: "Expected delivery date YYYY-MM-DD" }
        },
        required: ["supplierId"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_supplier_order",
      description: "Update supplier order status",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "string", description: "Supplier order ID" },
          status: { type: "string", description: "Status (New, Confirmed, Shipped, Delivered, Cancelled)" }
        },
        required: ["order_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_client_actions",
      description: "List action plan items for a client",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "Client ID" }
        },
        required: ["client_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_client_action",
      description: "Create an action item for a client action plan",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "Client ID" },
          type: { type: "string", description: "Action type (Call, Meeting, SiteVisit, Document, Payment, etc.)" },
          title: { type: "string", description: "Action title" },
          description: { type: "string", description: "Description" },
          status: { type: "string", description: "Status (Pending, InProgress, Completed)" }
        },
        required: ["client_id", "type", "title"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_client_action",
      description: "Update a client action item (status, complete, reorder)",
      parameters: {
        type: "object",
        properties: {
          action_id: { type: "string", description: "Action ID" },
          status: { type: "string", description: "Status" },
          title: { type: "string", description: "Title" },
          description: { type: "string", description: "Description" },
          orderIndex: { type: "number", description: "Display order" }
        },
        required: ["action_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_action_message",
      description: "Add a message to a client action (communication log)",
      parameters: {
        type: "object",
        properties: {
          action_id: { type: "string", description: "Client action ID" },
          content: { type: "string", description: "Message text" }
        },
        required: ["action_id", "content"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_telemetry_devices",
      description: "List telemetry monitoring devices",
      parameters: {
        type: "object",
        properties: {

        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_telemetry_device",
      description: "Register a telemetry monitoring device",
      parameters: {
        type: "object",
        properties: {
          serialNumber: { type: "string", description: "Device serial number" },
          model: { type: "string", description: "Device model" },
          nominalCapacity: { type: "number", description: "Nominal capacity (kW)" }
        },
        required: ["serialNumber"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_telemetry_reading",
      description: "Record a telemetry reading from a monitoring device",
      parameters: {
        type: "object",
        properties: {
          deviceId: { type: "string", description: "Device ID" },
          clientId: { type: "string", description: "Client ID" },
          measurementPeriod: { type: "string", description: "Period (e.g. 2026-06)" },
          energyProduced: { type: "number", description: "Energy produced (kWh)" },
          uptime: { type: "number", description: "Uptime (hours)" }
        },
        required: ["deviceId", "measurementPeriod"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_telemetry_readings",
      description: "List telemetry readings with filters",
      parameters: {
        type: "object",
        properties: {
          deviceId: { type: "string", description: "Filter by device" },
          clientId: { type: "string", description: "Filter by client" },
          limit: { type: "number", description: "Max results" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_agent_commission",
      description: "Create an agent commission record for a deal",
      parameters: {
        type: "object",
        properties: {
          agentId: { type: "string", description: "Agent user ID" },
          dealId: { type: "string", description: "Deal ID" },
          amount: { type: "number", description: "Commission amount" },
          status: { type: "string", description: "Status (Pending, Paid, Cancelled)" }
        },
        required: ["agentId", "dealId", "amount"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_agent_commissions",
      description: "List agent commission records",
      parameters: {
        type: "object",
        properties: {
          agentId: { type: "string", description: "Filter by agent" },
          status: { type: "string", description: "Filter by status" },
          limit: { type: "number", description: "Max results" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tariff_rates",
      description: "List tariff rates for salary calculation",
      parameters: {
        type: "object",
        properties: {
          roleName: { type: "string", description: "Filter by role name" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_tariff_rate",
      description: "Create a tariff rate for salary calculation. Directors only.",
      parameters: {
        type: "object",
        properties: {
          roleName: { type: "string", description: "Role name" },
          taskType: { type: "string", description: "Task type (INSTALLATION, PRODUCTION, SERVICE)" },
          ratePerUnit: { type: "number", description: "Rate per unit amount" },
          unit: { type: "string", description: "Unit (task, hour, sqm)" }
        },
        required: ["roleName", "taskType", "ratePerUnit", "unit"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_notifications",
      description: "Get my notifications and unread count",
      parameters: {
        type: "object",
        properties: {

        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mark_notification_read",
      description: "Mark a notification as read",
      parameters: {
        type: "object",
        properties: {
          notification_id: { type: "string", description: "Notification ID" }
        },
        required: ["notification_id"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_dashboard_summary",
      description: "CRM dashboard summary with entity counts and recent data",
      parameters: {
        type: "object",
        properties: {

        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_dashboard_finance",
      description: "Finance KPIs: invoiced, paid, overdue totals",
      parameters: {
        type: "object",
        properties: {

        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_dashboard_pulse",
      description: "Live KPIs: orders in progress, cell occupancy, new leads today, overdue tasks",
      parameters: {
        type: "object",
        properties: {

        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_audit_log",
      description: "Get audit log for a specific entity. Directors and admins only.",
      parameters: {
        type: "object",
        properties: {
          entityType: { type: "string", description: "Entity type (Client, Deal, Task, etc.)" },
          entityId: { type: "string", description: "Entity ID" }
        },
        required: ["entityType", "entityId"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_chat_message",
      description: "Send internal chat message to another user",
      parameters: {
        type: "object",
        properties: {
          receiver_id: { type: "string", description: "Recipient user ID" },
          content: { type: "string", description: "Message text" }
        },
        required: ["receiver_id", "content"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_conversations",
      description: "List my chat conversations",
      parameters: {
        type: "object",
        properties: {

        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_integration_logs",
      description: "List integration sync logs",
      parameters: {
        type: "object",
        properties: {
          system: { type: "string", description: "Filter by system name (1C, FinanceTable, etc.)" },
          limit: { type: "number", description: "Max results" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_integration_log",
      description: "Create an integration log entry",
      parameters: {
        type: "object",
        properties: {
          direction: { type: "string", description: "Direction (inbound, outbound)" },
          system: { type: "string", description: "System name" },
          entityType: { type: "string", description: "Entity type" },
          entityId: { type: "string", description: "Entity ID" },
          status: { type: "string", description: "Status (success, error)" },
          request: { type: "string", description: "Request data (JSON)" },
          response: { type: "string", description: "Response data (JSON)" }
        },
        required: ["direction", "system", "status"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_product_items",
      description: "List serialized product items in warehouse",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status (InStock, Reserved, Installed, etc.)" },
          productId: { type: "string", description: "Filter by product" },
          limit: { type: "number", description: "Max results" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_product_item",
      description: "Create a serialized product item",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "Product ID" },
          serialNumber: { type: "string", description: "Serial number" },
          status: { type: "string", description: "Status (InStock, Reserved, Installed)" },
          warehouseCellId: { type: "string", description: "Warehouse cell ID (optional)" }
        },
        required: ["productId", "serialNumber"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_inventory_balance",
      description: "Set inventory balance for a product in a cell",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "Product ID" },
          quantity: { type: "number", description: "Quantity" },
          cellId: { type: "string", description: "Warehouse cell ID (optional)" }
        },
        required: ["productId", "quantity"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_inventory_balances",
      description: "List inventory balances",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "Filter by product" },
          cellId: { type: "string", description: "Filter by cell" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_reserve",
      description: "Reserve product items for a deal",
      parameters: {
        type: "object",
        properties: {
          productItemId: { type: "string", description: "Product item ID" },
          dealId: { type: "string", description: "Deal ID" },
          quantity: { type: "number", description: "Quantity to reserve" }
        },
        required: ["productItemId", "dealId", "quantity"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_reserves",
      description: "List current reserves",
      parameters: {
        type: "object",
        properties: {
          dealId: { type: "string", description: "Filter by deal" },
          status: { type: "string", description: "Filter by status" }
        }
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_specification",
      description: "Create a specification (BOM) for a project",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Specification name" }
        },
        required: ["name"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crud",
      description: "GENERIC CRUD — create, read, update, delete, or list ANY entity in the system. Use this for operations not covered by dedicated tools.",
      parameters: {
        type: "object",
        properties: {
          entity: { type: "string", description: "Entity name: Client, Lead, Deal, Task, User, Role, RolePermission, TariffRate, Product, ProductItem, WarehouseStockItem, WarehouseCategory, WarehouseTransfer, WarehouseMovement, ProductionOrder, ProductionRoute, ProductionStep, InstallationTask, InstallationCalendarEvent, RentContract, BillingRecord, Invoice, Payment, CashOrder, AgentCommissionRecord, ServiceCase, DefectRecord, Supplier, SupplierOrder, PurchaseRequest, LegalDocument, LegalDocumentComment, TelemetryDevice, TelemetryReading, ChatMessage, Notification, Project, Specification, ClientAction, ActionMessage, ActionFile, Reserve, InventoryBalance, WarehouseCell, IntegrationLog, AiChatSession, AiChatMessage, AiChatFile" },
          action: { type: "string", description: "Action: list (with filters), get (by id), create (with data), update (by id + data), delete (archive by id)", enum: ['list', 'get', 'create', 'update', 'delete'] },
          id: { type: "string", description: "Entity ID — required for get/update/delete" },
          data: { type: "object", description: "JSON object with fields for create/update. Use entity field names as keys." },
          filters: { type: "object", description: "Filter object for list action. Use field names as keys (e.g., {status:'Active', isArchived:false})" },
          limit: { type: "number", description: "Max results for list action (default 20)" }
        },
        required: ["entity", "action"]
      },
    },
  }
];
