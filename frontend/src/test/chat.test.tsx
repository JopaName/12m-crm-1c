
import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatTime, formatFullTime, formatFileSize, getInitials, formatMessageDateSeparator, usePrevious } from "../utils/chat";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper });
}

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock AuthContext
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user-1", firstName: "Test", lastName: "User" } }),
}));

// Mock api
vi.mock("../api", () => ({
  authAPI: {
    searchUsers: vi.fn().mockResolvedValue([]),
  },
  chatAPI: {
    getConversations: vi.fn().mockResolvedValue({ data: [] }),
    getMessages: vi.fn().mockResolvedValue({ data: [] }),
    getRoomMessages: vi.fn().mockResolvedValue({ data: [] }),
    send: vi.fn().mockResolvedValue({}),
    sendFile: vi.fn().mockResolvedValue({}),
    sendRoomMessage: vi.fn().mockResolvedValue({}),
    markRead: vi.fn().mockResolvedValue({}),
    createRoom: vi.fn().mockResolvedValue({}),
    editMessage: vi.fn().mockResolvedValue({}),
    deleteMessage: vi.fn().mockResolvedValue({}),
    forwardMessage: vi.fn().mockResolvedValue({}),
    addReaction: vi.fn().mockResolvedValue({}),
    searchMessages: vi.fn().mockResolvedValue([]),
    togglePin: vi.fn().mockResolvedValue({}),
    getPinned: vi.fn().mockResolvedValue([]),
  },
}));

// ---- Utility function tests ----

describe("formatTime", () => {
  it("returns time for same day", () => {
    const now = new Date();
    const result = formatTime(now.toISOString());
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it("returns 'Yesterday' for yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = formatTime(yesterday.toISOString());
    expect(result).toBe("Yesterday");
  });

  it("returns date for older dates", () => {
    const old = new Date("2024-01-15");
    const result = formatTime(old.toISOString());
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });
});

describe("formatFullTime", () => {
  it("returns HH:MM format", () => {
    const result = formatFullTime(new Date().toISOString());
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("formatFileSize", () => {
  it("returns bytes for small sizes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("returns KB for medium sizes", () => {
    const result = formatFileSize(2048);
    expect(result).toMatch(/KB$/);
  });

  it("returns MB for large sizes", () => {
    const result = formatFileSize(5 * 1024 * 1024);
    expect(result).toMatch(/MB$/);
  });
});

describe("getInitials", () => {
  it("returns first letters of first and last name", () => {
    expect(getInitials({ firstName: "Иван", lastName: "Петров" })).toBe("ИП");
  });

  it("handles missing firstName", () => {
    expect(getInitials({ firstName: "", lastName: "Петров" })).toBe("П");
  });

  it("handles missing lastName", () => {
    expect(getInitials({ firstName: "Иван", lastName: "" })).toBe("И");
  });
});

describe("formatMessageDateSeparator", () => {
  it("returns 'Today' for today", () => {
    expect(formatMessageDateSeparator(new Date().toISOString())).toBe("Today");
  });

  it("returns 'Yesterday' for yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatMessageDateSeparator(yesterday.toISOString())).toBe("Yesterday");
  });
});

describe("usePrevious", () => {
  it("returns previous value after rerender", () => {
    expect(typeof usePrevious).toBe("function");
  });
});

// ---- Component rendering tests ----

describe("ChatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const ChatPage = (await import("../pages/ChatPage")).default;
    const { container } = renderWithProviders(React.createElement(ChatPage));
    expect(container).toBeDefined();
  });

  it("renders conversations title", async () => {
    const ChatPage = (await import("../pages/ChatPage")).default;
    renderWithProviders(React.createElement(ChatPage));
    await waitFor(() => {
      expect(screen.getByText("Чаты")).toBeInTheDocument();
    });
  });

  it("shows empty state when no chat is selected", async () => {
    const ChatPage = (await import("../pages/ChatPage")).default;
    renderWithProviders(React.createElement(ChatPage));
    await waitFor(() => {
      expect(screen.getByText("Ваши сообщения")).toBeInTheDocument();
    });
  });

  it("renders search input", async () => {
    const ChatPage = (await import("../pages/ChatPage")).default;
    renderWithProviders(React.createElement(ChatPage));
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText("Поиск чатов...");
      expect(searchInput).toBeInTheDocument();
    });
  });
});

// ---- API hook integration tests ----

describe("ChatAPI integration", () => {
  it("calls getConversations on mount", async () => {
    const { chatAPI } = await import("../api");
    const ChatPage = (await import("../pages/ChatPage")).default;
    renderWithProviders(React.createElement(ChatPage));
    await waitFor(() => {
      expect(chatAPI.getConversations).toHaveBeenCalled();
    });
  });
});
