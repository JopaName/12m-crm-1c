p = '/root/12m-crm-1c/frontend/src/api/index.ts'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

old = '''  getPinnedMessages: (userId: string) => api.get(`/chat/pinned/${userId}`).then(r => r.data),
};

export const knowledgeAPI ='''

new = '''  getPinnedMessages: (userId: string) => api.get(`/chat/pinned/${userId}`).then(r => r.data),
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
      return api.post("/chat/upload", fd);
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
      return api.post("/chat/upload", fd);
    }
    return api.post("/chat/room/send", { roomId, content: data.content, replyToId: data.replyToId });
  },
};

export const knowledgeAPI ='''

if old in c:
    c = c.replace(old, new)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Methods added successfully")
else:
    print("Target string not found!")
    # Debug - show what's around
    idx = c.find('getPinnedMessages')
    if idx >= 0:
        print(c[idx:idx+200])
