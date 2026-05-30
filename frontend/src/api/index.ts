import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;

export const authAPI = {
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
  getUsers: () => api.get("/auth/users"),
  getRoles: () => api.get("/auth/roles"),
  createUser: (data: any) => api.post("/auth/register", data),
  updateUser: (id: string, data: any) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/auth/users/${id}`),
};

export const clientsAPI = {
  getAll: () => api.get("/clients"),
  getById: (id: string) => api.get(`/clients/${id}`),
  create: (data: any) => api.post("/clients", data),
  update: (id: string, data: any) => api.put(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};

export const actionsAPI = {
  getByClient: (clientId: string) => api.get(`/clients/${clientId}/actions`),
  create: (clientId: string, data: any) => api.post(`/clients/${clientId}/actions`, data),
  update: (clientId: string, actionId: string, data: any) => api.put(`/clients/${clientId}/actions/${actionId}`, data),
  delete: (clientId: string, actionId: string) => api.delete(`/clients/${clientId}/actions/${actionId}`),
  reorder: (clientId: string, orderedIds: string[]) => api.put(`/clients/${clientId}/actions/reorder`, { orderedIds }),
};

export const dealsAPI = {
  getAll: () => api.get("/deals"),
  getById: (id: string) => api.get(`/deals/${id}`),
  create: (data: any) => api.post("/deals", data),
  updateStatus: (id: string, status: string) =>
    api.put(`/deals/${id}/status`, { status }),
};

export const productsAPI = {
  getAll: () => api.get("/products"),
  create: (data: any) => api.post("/products", data),
  getItems: () => api.get("/products/items"),
  createItem: (data: any) => api.post("/products/items", data),
  updateItemStatus: (id: string, status: string) =>
    api.put(`/products/items/${id}/status`, { status }),
};

export const dashboardAPI = {
  getSummary: () => api.get("/dashboard/summary"),
  getPipeline: () => api.get("/dashboard/pipeline"),
  getFinance: () => api.get("/dashboard/finance"),
  getPulse: () => api.get("/dashboard/pulse"),
};

export const tasksAPI = {
  getAll: () => api.get("/tasks"),
  create: (data: any) => api.post("/tasks", data),
  update: (id: string, data: any) => api.put(`/tasks/${id}`, data),
};

export const warehouseAPI = {
  getAll: () => api.get("/warehouse"),
  createMovement: (data: any) => api.post("/warehouse/movement", data),
  getCategories: () => api.get("/warehouse/categories"),
  createCategory: (data: any) => api.post("/warehouse/categories", data),
  updateCategory: (id: string, data: any) => api.put(`/warehouse/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/warehouse/categories/${id}`),
  getCategoryItems: (categoryId: string) => api.get(`/warehouse/categories/${categoryId}/items`),
  createItem: (categoryId: string, data: any) => api.post(`/warehouse/categories/${categoryId}/items`, data),
  updateItem: (id: string, data: any) => api.put(`/warehouse/items/${id}`, data),
  deleteItem: (id: string) => api.delete(`/warehouse/items/${id}`),
};

export const installationAPI = {
  getAll: () => api.get("/installation"),
  create: (data: any) => api.post("/installation", data),
  update: (id: string, data: any) => api.put(`/installation/${id}`, data),
  getCalendar: () => api.get("/installation/calendar"),
};

export const rentAPI = {
  getAll: () => api.get("/rent"),
  create: (data: any) => api.post("/rent", data),
  getBilling: () => api.get("/rent/billing"),
};

export const legalAPI = {
  getAll: () => api.get("/legal"),
  create: (data: any) => api.post("/legal", data),
  update: (id: string, data: any) => api.put(`/legal/${id}`, data),
};

export const procurementAPI = {
  getAll: () => api.get("/procurement"),
  createRequest: (data: any) => api.post("/procurement/requests", data),
  createSupplier: (data: any) => api.post("/procurement/suppliers", data),
  updateSupplier: (id: string, data: any) => api.put(`/procurement/suppliers/${id}`, data),
  deleteSupplier: (id: string) => api.delete(`/procurement/suppliers/${id}`),
  createOrder: (data: any) => api.post("/procurement/orders", data),
};

export const productionAPI = {
  getAll: () => api.get("/production"),
  create: (data: any) => api.post("/production", data),
  updateStatus: (id: string, status: string) =>
    api.put(`/production/${id}/status`, { status }),
  getRoutes: () => api.get("/production/routes"),
};

export const auditAPI = {
  getAll: () => api.get("/audit"),
  getByEntity: (type: string, id: string) =>
    api.get(`/audit/entity/${type}/${id}`),
};

export const rolesAPI = {
  getAll: () => api.get("/roles"),
  getById: (id: string) => api.get(`/roles/${id}`),
  create: (data: any) => api.post("/roles", data),
  update: (id: string, data: any) => api.put(`/roles/${id}`, data),
  delete: (id: string) => api.delete(`/roles/${id}`),
};

export const serviceAPI = {
  getAll: () => api.get("/service"),
  create: (data: any) => api.post("/service", data),
};

export const actionMessagesAPI = {
  getByAction: (clientId: string, actionId: string) =>
    api.get(`/clients/${clientId}/actions/${actionId}/messages`),
  send: (clientId: string, actionId: string, content: string) =>
    api.post(`/clients/${clientId}/actions/${actionId}/messages`, { content }),
};

export const actionFilesAPI = {
  getByAction: (clientId: string, actionId: string) =>
    api.get(`/clients/${clientId}/actions/${actionId}/files`),
  upload: (clientId: string, actionId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/clients/${clientId}/actions/${actionId}/files`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  delete: (clientId: string, actionId: string, fileId: string) =>
    api.delete(`/clients/${clientId}/actions/${actionId}/files/${fileId}`),
};

export const chatAPI = {
  getConversations: () => api.get("/chat/conversations"),
  getMessages: (userId: string) => api.get(`/chat/messages/${userId}`),
  send: (data: { receiverId: string; content: string }) =>
    api.post("/chat/send", data),
  markRead: (userId: string) => api.put(`/chat/read/${userId}`),
};
