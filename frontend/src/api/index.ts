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
  getUserById: (id: string) => api.get(`/auth/users/${id}`).then(r => r.data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
  getUsers: () => api.get("/auth/users"),
  getRoles: () => api.get("/auth/roles"),
  createUser: (data: any) => api.post("/auth/register", data),
  createInvite: (data: any) => api.post("/auth/invites", data).then(r => r.data),
  getInvite: (token: string) => api.get(`/auth/invites/${token}`).then(r => r.data),
  registerWithInvite: (token: string, data: { login: string; password: string }) =>
    api.post(`/auth/invites/${token}/register`, data).then(r => r.data),
  updateUser: (id: string, data: any) => api.put(`/auth/users/${id}`, data),
  updateProfile: (data: any) => api.put("/auth/profile", data),
  uploadAvatar: (file: File) => { const fd = new FormData(); fd.append("avatar", file); return api.post("/auth/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } }); },
  deleteUser: (id: string) => api.delete(`/auth/users/${id}`),
  searchUsers: (q: string) => api.get(`/auth/users?q=${encodeURIComponent(q)}`).then(r => r.data),
};



export const dealsAPI = {
  getAll: () => api.get("/deals"),
  getById: (id: string) => api.get(`/deals/${id}`),
  create: (data: any) => api.post("/deals", data),
  updateStatus: (id: string, status: string) =>
    api.put(`/deals/${id}/status`, { status }),
  update: (id: string, data: any) => api.put(`/deals/${id}`, data),
  delete: (id: string) => api.delete(`/deals/${id}`),
  getFiles: (id: string) => api.get(`/deals/${id}/files`).then(r => r.data),
  uploadFile: (id: string, file: File, onProgress?: (pct: number) => void) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/deals/${id}/files`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e: any) => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
    }).then(r => r.data);
  },
  deleteFile: (dealId: string, fileId: string) => api.delete(`/deals/${dealId}/files/${fileId}`).then(r => r.data),
  downloadFileUrl: (dealId: string, fileId: string) => `/api/deals/${dealId}/files/${fileId}/download`,
  previewFileUrl: (dealId: string, fileId: string) => `/api/deals/${dealId}/files/${fileId}/preview`,
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
  transfer: (data: any) => api.post("/warehouse/transfer", data),
  getTransfers: () => api.get("/warehouse/transfers"),
  getIssuance: () => api.get("/warehouse/issuance"),
  getAllReceipts: () => api.get("/warehouse/receipts").then(r => r.data),
  getReceipts: (itemId: string) => api.get(`/warehouse/items/${itemId}/receipts`).then(r => r.data),
  createReceipt: (itemId: string, data: { quantity: number; comment?: string; file?: File }) => {
    const fd = new FormData();
    fd.append("quantity", String(data.quantity));
    if (data.comment) fd.append("comment", data.comment);
    if (data.file) fd.append("file", data.file);
    return api.post(`/warehouse/items/${itemId}/receipts`, fd, { headers: { "Content-Type": "multipart/form-data" } });
  },
};

export const logsAPI = {
  getLogs: (params?: any) => api.get("/logs", { params }),
  cleanLogs: (days: number) => api.delete("/logs", { params: { days } }),
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
  getAll: (category?: string) => api.get("/legal", { params: { category } }),
  getById: (id: string) => api.get(`/legal/${id}`),
  create: (data: any) => api.post("/legal", data),
  update: (id: string, data: any) => api.put(`/legal/${id}`, data),
  getCategories: () => api.get("/legal/categories"),
  getTypes: (category?: string) => api.get("/legal/types", { params: { category } }),
  addComment: (id: string, content: string) => api.post(`/legal/${id}/comments`, { content }),
};

export const procurementAPI = {
  getAll: () => api.get("/procurement"),
  createRequest: (data: any) => api.post("/procurement/requests", data),
  updateRequest: (id: string, data: any) => api.put(`/procurement/requests/${id}`, data),
  deleteRequest: (id: string) => api.delete(`/procurement/requests/${id}`),
  uploadFile: (file: File) => { const fd = new FormData(); fd.append("file", file); return api.post("/procurement/upload", fd, { headers: { "Content-Type": "multipart/form-data" } }); },
  getSuppliers: () => api.get("/procurement/suppliers"),
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


export const clientsAPI = {
  getActions: (clientId: string) => api.get(`/clients/${clientId}/actions`).then(r => r.data),
  createAction: (clientId: string, data: any) => api.post(`/clients/${clientId}/actions`, data).then(r => r.data),
  updateAction: (clientId: string, actionId: string, data: any) => api.put(`/clients/${clientId}/actions/${actionId}`, data).then(r => r.data),
  deleteAction: (clientId: string, actionId: string) => api.delete(`/clients/${clientId}/actions/${actionId}`).then(r => r.data),
  reorderActions: (clientId: string, orderedIds: string[]) => api.put(`/clients/${clientId}/actions/reorder`, { orderedIds }).then(r => r.data),
  getMessages: (clientId: string, actionId: string) => api.get(`/clients/${clientId}/actions/${actionId}/messages`).then(r => r.data),
  sendMessage: (clientId: string, actionId: string, content: string) => api.post(`/clients/${clientId}/actions/${actionId}/messages`, { content }).then(r => r.data),
  getFiles: (clientId: string, actionId: string) => api.get(`/clients/${clientId}/actions/${actionId}/files`).then(r => r.data),
  uploadFile: (clientId: string, actionId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post(`/clients/${clientId}/actions/${actionId}/files`, fd, { headers: { "Content-Type": "multipart/form-data" } }).then(r => r.data);
  },
  deleteFile: (clientId: string, actionId: string, fileId: string) => api.delete(`/clients/${clientId}/actions/${actionId}/files/${fileId}`).then(r => r.data),
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




export const filesAPI = {
  download: (id: string) => api.get(`/files/download/${id}`, { responseType: "blob" }),
  downloadByEntity: (entityType: string, entityId: string, fieldName?: string) =>
    api.get(`/files/download/${entityType}/${entityId}/${fieldName}`, { responseType: "blob" }),
  list: (entityType: string, entityId: string, fieldName?: string, page?: number, pageSize?: number) =>
    api.get(`/files/${entityType}/${entityId}`, { params: { field: fieldName, page, pageSize } }),
  upload: (entityType: string, entityId: string, fieldName: string, file: File) => {
    var fd = new FormData();
    fd.append("file", file);
    fd.append("fieldName", fieldName);
    return api.post(`/files/upload/${entityType}/${entityId}`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  delete: (id: string) => api.delete(`/files/${id}`),
};

export const referralAPI = {
  register: (data: any) => api.post("/referrals/register", data),
  getTree: () => api.get("/referrals/tree").then(r => r.data),
  getMySales: (startDate?: string, endDate?: string) => api.get("/referrals/my-sales", { params: { startDate, endDate } }).then(r => r.data),
  getEarnings: (startDate?: string, endDate?: string) => api.get("/referrals/earnings", { params: { startDate, endDate } }).then(r => r.data),
  getInviteLink: () => api.get("/referrals/invite-link").then(r => r.data),
  getConfig: () => api.get("/referrals/config").then(r => r.data),
  updateConfig: (data: any) => api.put("/referrals/config", data).then(r => r.data),
};

export const notificationAPI = {
  getAll: (page = 1) => api.get("/notifications", { params: { page, limit: 50 } }).then(r => r.data),
  getUnreadCount: () => api.get("/notifications/unread-count").then(r => r.data.count),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
  getPreferences: () => api.get("/notifications/preferences").then(r => r.data),
  updatePreference: (type: string, enabled: boolean) => api.put("/notifications/preferences", { type, enabled }),
};

export const chatAPI = {
  getConversations: () => api.get("/chat/conversations"),
  getMessages: (userId: string) => api.get(`/chat/messages/${userId}`),
  send: (data: { receiverId: string; content: string; replyToId?: string }) =>
    api.post("/chat/send", data),
  uploadFile: (file: File) => { const fd = new FormData(); fd.append("file", file); return api.post("/chat/upload", fd, { headers: { "Content-Type": "multipart/form-data" } }); },
  sendFile: (receiverId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("receiverId", receiverId);
    return api.post("/chat/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  markRead: (userId: string) => api.put(`/chat/read/${userId}`),
  createRoom: (name: string, memberIds: string[]) => api.post("/chat/rooms", { name, memberIds }),
  updateRoom: (roomId: string, name: string) => api.put(`/chat/rooms/${roomId}`, { name }),
  addRoomMembers: (roomId: string, memberIds: string[]) => api.post(`/chat/rooms/${roomId}/members`, { memberIds }),
  removeRoomMember: (roomId: string, userId: string) => api.delete(`/chat/rooms/${roomId}/members/${userId}`),
  getRoomMessages: (roomId: string) => api.get(`/chat/room/${roomId}/messages`),
  sendRoomMessageWithReply: (roomId: string, content: string, replyToId: string) => api.post("/chat/room/send", { roomId, content, replyToId }),
  editMessage: (messageId: string, content: string) => api.put(`/chat/${messageId}`, { content }),
  deleteMessage: (messageId: string) => api.delete(`/chat/${messageId}`),
  forwardMessage: (messageId: string, toUserId: string) => api.post(`/chat/forward/${messageId}`, { toUserId }),
  addReaction: (messageId: string, emoji: string) => api.post('/chat/react', { messageId, emoji }),
  getEntityMessages: (entityType: string, entityId: string) => api.get(`/chat/entity/${entityType}/${entityId}`).then(r => r.data),
  sendEntityMessage: (data: { entityType: string; entityId: string; content: string; entityTitle?: string; mentionedUserIds?: string[]; fileUrl?: string; fileName?: string }) => api.post("/chat/send", { receiverId: null, mentionedUserIds: data.mentionedUserIds || [], ...data }),
  searchMessages: (q: string) => api.get(`/chat/search?q=${encodeURIComponent(q)}`).then(r => r.data),
  getUser: (id: string) => api.get(`/auth/users/${id}`).then(r => r.data),
  getRoom: (id: string) => api.get(`/chat/rooms/${id}`).then(r => r.data),
  getPinned: (userId: string) => api.get(`/chat/pinned/${userId}`).then(r => r.data),
  getRoomPinned: (roomId: string) => api.get(`/chat/room/${roomId}/pinned`).then(r => r.data),
  togglePin: (messageId: string) => api.post(`/chat/pin/${messageId}`).then(r => r.data),
  sendMessage: (userId: string, data: { content?: string; replyToId?: number; file?: File }) => {
    if (data.file) {
      const fd = new FormData();
      fd.append("file", data.file);
      if (data.content) fd.append("content", data.content);
      if (data.replyToId) fd.append("replyToId", String(data.replyToId));
      fd.append("receiverId", userId);
      return api.post("/chat/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
    }
    return api.post("/chat/send", { receiverId: userId, content: data.content, replyToId: data.replyToId });
  },
  editRoomMessage: (messageId: string, content: string) => api.put(`/chat/room/messages/${messageId}`, { content }),
  sendRoomMessage: (roomId: string, data: { content?: string; replyToId?: number; file?: File }) => {
    if (data.file) {
      const fd = new FormData();
      fd.append("file", data.file);
      if (data.content) fd.append("content", data.content);
      if (data.replyToId) fd.append("replyToId", String(data.replyToId));
      fd.append("roomId", roomId);
      return api.post("/chat/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
    }
    return api.post("/chat/room/send", { roomId, content: data.content, replyToId: data.replyToId });
  },
};

export const knowledgeAPI = {
  getCategories: () => api.get("/knowledge/categories").then(r => r.data),
  createCategory: (data: any) => api.post("/knowledge/categories", data).then(r => r.data),
  updateCategory: (id: string, data: any) => api.put(`/knowledge/categories/${id}`, data).then(r => r.data),
  deleteCategory: (id: string) => api.delete(`/knowledge/categories/${id}`).then(r => r.data),
  getArticles: (params?: { categoryId?: string; search?: string; page?: number; limit?: number }) =>
    api.get("/knowledge/articles", { params }).then(r => r.data),
  getArticle: (id: string) => api.get(`/knowledge/articles/${id}`).then(r => r.data),
  createArticle: (data: any) => api.post("/knowledge/articles", data).then(r => r.data),
  updateArticle: (id: string, data: any) => api.put(`/knowledge/articles/${id}`, data).then(r => r.data),
  deleteArticle: (id: string) => api.delete(`/knowledge/articles/${id}`).then(r => r.data),
  search: (q: string) => api.get("/knowledge/search", { params: { q } }).then(r => r.data),
  getArticleFiles: (id: string) => api.get(`/knowledge/articles/${id}/files`).then(r => r.data),
  uploadArticleFile: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/knowledge/articles/${id}/files`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  deleteArticleFile: (articleId: string, fileId: string) =>
    api.delete(`/knowledge/articles/${articleId}/files/${fileId}`).then(r => r.data),
  getRelatedArticles: (id: string) => api.get(`/knowledge/articles/${id}/related`).then(r => r.data),
};

export const ordersAPI = {
  getByDeal: (dealId: string) => api.get(`/orders/deal/${dealId}`).then(r => r.data),
  get: (id: string) => api.get(`/orders/${id}`).then(r => r.data),
  create: (data: any) => api.post("/orders", data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/orders/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/orders/${id}`).then(r => r.data),
  addItem: (orderId: string, data: any) => api.post(`/orders/${orderId}/items`, data).then(r => r.data),
  updateItem: (itemId: string, data: any) => api.put(`/orders/items/${itemId}`, data).then(r => r.data),
  removeItem: (itemId: string) => api.delete(`/orders/items/${itemId}`).then(r => r.data),
  generateChecklist: (orderId: string) => api.post(`/orders/${orderId}/checklist`).then(r => r.data),
  getChecklist: (orderId: string) => api.get(`/orders/${orderId}/checklist`).then(r => r.data),
  updateChecklist: (checklistId: string, data: any) => api.put(`/orders/checklist/${checklistId}`, data).then(r => r.data),
  updateChecklistItem: (itemId: string, data: any) => api.put(`/orders/checklist/items/${itemId}`, data).then(r => r.data),
  invoiceUrl: (orderId: string) => `/api/orders/${orderId}/invoice`,
  checklistPrintUrl: (orderId: string) => `/api/orders/${orderId}/checklist/print`,
};
export const dealActionsAPI = {
  getByDeal: (dealId: string) => api.get("/deals/" + dealId + "/actions").then(r => r.data),
  create: (dealId: string, data: any) => api.post("/deals/" + dealId + "/actions", data).then(r => r.data),
  update: (dealId: string, actionId: string, data: any) => api.put("/deals/" + dealId + "/actions/" + actionId, data).then(r => r.data),
  delete: (dealId: string, actionId: string) => api.delete("/deals/" + dealId + "/actions/" + actionId).then(r => r.data),
  reorder: (dealId: string, orderedIds: string[]) => api.put("/deals/" + dealId + "/actions/reorder", { orderedIds }).then(r => r.data),
  getMessages: (dealId: string, actionId: string) => api.get("/deals/" + dealId + "/actions/" + actionId + "/messages").then(r => r.data),
  sendMessage: (dealId: string, actionId: string, content: string) => api.post("/deals/" + dealId + "/actions/" + actionId + "/messages", { content }).then(r => r.data),
  getFiles: (dealId: string, actionId: string) => api.get("/deals/" + dealId + "/actions/" + actionId + "/files").then(r => r.data),
  uploadFile: (dealId: string, actionId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post("/deals/" + dealId + "/actions/" + actionId + "/files", fd, { headers: { "Content-Type": "multipart/form-data" } }).then(r => r.data);
  },
  deleteFile: (dealId: string, actionId: string, fileId: string) => api.delete("/deals/" + dealId + "/actions/" + actionId + "/files/" + fileId).then(r => r.data),
};
