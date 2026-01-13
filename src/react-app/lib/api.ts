/**
 * FinTrack API Client
 * Typed fetch wrapper for all backend endpoints
 */

// ============================================
// Types
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  currency: string;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: "checking" | "savings" | "credit" | "cash" | "investment";
  currency: string;
  initialBalance: number;
  currentBalance?: number;
  color?: string | null;
  icon?: string | null;
  isArchived: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: "income" | "expense";
  color?: string | null;
  icon?: string | null;
  parentId?: string | null;
  isArchived: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  categoryId?: string | null;
  type: "income" | "expense" | "transfer" | "debt_payment" | "goal_contribution" | "loan_payment";
  amount: number;
  currency: string;
  description?: string | null;
  date: string;
  isRecurring: boolean;
  recurrenceRule?: string | null;
  attachmentUrl?: string | null;
  createdAt: string;
  account?: Account;
  category?: Category | null;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline?: string | null;
  color?: string | null;
  icon?: string | null;
  isCompleted: boolean;
  createdAt: string;
}

export interface Debt {
  id: string;
  userId: string;
  name: string;
  type: "owed_to_me" | "i_owe";
  personName: string;
  originalAmount: number;
  remainingAmount: number;
  currency: string;
  dueDate?: string | null;
  notes?: string | null;
  isPaid: boolean;
  createdAt: string;
}

export interface ScheduledPayment {
  id: string;
  userId: string;
  accountId: string;
  categoryId?: string | null;
  name: string;
  amount: number;
  currency: string;
  type: "income" | "expense";
  frequency: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
  startDate: string;
  endDate?: string | null;
  nextDueDate: string;
  lastProcessedDate?: string | null;
  isActive: boolean;
  autoProcess: boolean;
  createdAt: string;
  account?: Account;
  category?: Category | null;
}

export interface UserSettings {
  userId: string;
  theme: "light" | "dark" | "system";
  language: string;
  dateFormat: string;
  startOfWeek: "sunday" | "monday";
  defaultAccountId?: string | null;
  budgetAlertThreshold: number;
  enableNotifications: boolean;
  enableEmailReports: boolean;
  reportFrequency: "daily" | "weekly" | "monthly" | "never";
}

// Dashboard response types matching the actual API structure
export interface DashboardData {
  data: {
    balance: {
      total: number;
      accounts: Array<{
        id: string;
        name: string;
        balance: number;
        currency: string;
      }>;
    };
    expenses: {
      total: number;
      count: number;
      period: string;
      dateRange: { start: string; end: string };
    };
    income: {
      total: number;
      count: number;
      period: string;
      dateRange: { start: string; end: string };
    };
    net: {
      amount: number;
      isPositive: boolean;
    };
    recentTransactions: Array<{
      id: string;
      type: string;
      amount: number;
      description: string | null;
      date: string;
      categoryName: string | null;
      categoryIcon: string | null;
      categoryColor: string | null;
      accountName: string | null;
    }>;
    goals: Array<{
      id: string;
      name: string;
      targetAmount: number;
      targetDate: string | null;
      icon: string | null;
      color: string | null;
      currentAmount: number;
      progress: number;
      remaining: number;
      daysRemaining: number | null;
    }>;
    scheduledPayments: {
      upcoming: Array<{
        id: string;
        name: string;
        amount: number;
        dueDate: string;
        status: string;
        priority: string;
        categoryName: string | null;
        daysUntilDue: number;
        isOverdue: boolean;
      }>;
    };
    debts: {
      total: number;
      active: number;
      totalOwed: number;
    };
    loans: {
      total: number;
      active: number;
      totalToReceive: number;
    };
    categoryBreakdown: Array<{
      categoryId: string | null;
      categoryName: string | null;
      categoryIcon: string | null;
      categoryColor: string | null;
      total: number;
      count: number;
      percentage: number;
    }>;
  };
}

// ============================================
// API Error
// ============================================

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ============================================
// Base fetch wrapper
// ============================================

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include", // Important for cookies
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      error.error || "Error de conexión",
      response.status,
      error.details
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ============================================
// Auth API
// ============================================

export const authApi = {
  register: (data: {
    email: string;
    password: string;
    name: string;
    currency?: string;
  }) =>
    apiFetch<{ message: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    apiFetch<{ message: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  logout: () =>
    apiFetch<{ message: string }>("/auth/logout", {
      method: "POST",
    }),

  getMe: () => apiFetch<{ user: User }>("/auth/me"),

  updateProfile: (data: { name?: string; currency?: string }) =>
    apiFetch<{ message: string; user: User }>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await fetch("/api/auth/avatar", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(
        error.error || "Error al subir avatar",
        response.status
      );
    }

    return response.json() as Promise<{ message: string; avatarUrl: string }>;
  },

  deleteAvatar: () =>
    apiFetch<{ message: string }>("/auth/avatar", {
      method: "DELETE",
    }),
};

// ============================================
// Dashboard API
// ============================================

export const dashboardApi = {
  getSummary: (period?: string) =>
    apiFetch<DashboardData>(`/dashboard${period ? `?period=${period}` : ""}`),
};

// ============================================
// Accounts API
// ============================================

export const accountsApi = {
  getAll: () => apiFetch<{ accounts: Account[] }>("/accounts"),

  getById: (id: string) => apiFetch<{ account: Account }>(`/accounts/${id}`),

  create: (data: {
    name: string;
    type: Account["type"];
    currency?: string;
    initialBalance?: number;
    color?: string;
    icon?: string;
  }) =>
    apiFetch<{ message: string; account: Account }>("/accounts", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: Partial<{
      name: string;
      type: Account["type"];
      color: string;
      icon: string;
      isArchived: boolean;
    }>
  ) =>
    apiFetch<{ message: string; account: Account }>(`/accounts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/accounts/${id}`, {
      method: "DELETE",
    }),
};

// ============================================
// Categories API
// ============================================

export const categoriesApi = {
  getAll: (type?: "income" | "expense") =>
    apiFetch<{ categories: Category[] }>(
      `/categories${type ? `?type=${type}` : ""}`
    ),

  getById: (id: string) =>
    apiFetch<{ category: Category }>(`/categories/${id}`),

  create: (data: {
    name: string;
    type: "income" | "expense";
    color?: string;
    icon?: string;
    parentId?: string;
  }) =>
    apiFetch<{ message: string; category: Category }>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: Partial<{
      name: string;
      color: string;
      icon: string;
      isArchived: boolean;
    }>
  ) =>
    apiFetch<{ message: string; category: Category }>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/categories/${id}`, {
      method: "DELETE",
    }),
};

// ============================================
// Transactions API
// ============================================

export const transactionsApi = {
  getAll: (params?: {
    accountId?: string;
    categoryId?: string;
    type?: Transaction["type"];
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return apiFetch<{ transactions: Transaction[]; total: number }>(
      `/transactions${query ? `?${query}` : ""}`
    );
  },

  getById: (id: string) =>
    apiFetch<{ transaction: Transaction }>(`/transactions/${id}`),

  create: (data: {
    accountId: string;
    categoryId?: string;
    type: Transaction["type"];
    amount: number;
    currency?: string;
    description?: string;
    date?: string;
    destinationAccountId?: string; // For transfers
    goalId?: string; // For goal contributions
    debtId?: string; // For debt payments
    loanId?: string; // For loan payments
  }) =>
    apiFetch<{ message: string; transaction: Transaction }>("/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: Partial<{
      categoryId: string;
      amount: number;
      description: string;
      date: string;
    }>
  ) =>
    apiFetch<{ message: string; transaction: Transaction }>(
      `/transactions/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    ),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/transactions/${id}`, {
      method: "DELETE",
    }),
};

// ============================================
// Goals API
// ============================================

export const goalsApi = {
  getAll: () => apiFetch<{ goals: Goal[] }>("/goals"),

  getById: (id: string) => apiFetch<{ goal: Goal }>(`/goals/${id}`),

  create: (data: {
    name: string;
    targetAmount: number;
    currency?: string;
    deadline?: string;
    color?: string;
    icon?: string;
  }) =>
    apiFetch<{ message: string; goal: Goal }>("/goals", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: Partial<{
      name: string;
      targetAmount: number;
      deadline: string;
      color: string;
      icon: string;
    }>
  ) =>
    apiFetch<{ message: string; goal: Goal }>(`/goals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  contribute: (id: string, data: { amount: number; accountId: string }) =>
    apiFetch<{ message: string; goal: Goal }>(`/goals/${id}/contribute`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/goals/${id}`, {
      method: "DELETE",
    }),
};

// ============================================
// Debts API
// ============================================

export const debtsApi = {
  getAll: (type?: "owed_to_me" | "i_owe") =>
    apiFetch<{ debts: Debt[] }>(`/debts${type ? `?type=${type}` : ""}`),

  getById: (id: string) => apiFetch<{ debt: Debt }>(`/debts/${id}`),

  create: (data: {
    name: string;
    type: "owed_to_me" | "i_owe";
    personName: string;
    originalAmount: number;
    currency?: string;
    dueDate?: string;
    notes?: string;
  }) =>
    apiFetch<{ message: string; debt: Debt }>("/debts", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: Partial<{
      name: string;
      personName: string;
      dueDate: string;
      notes: string;
    }>
  ) =>
    apiFetch<{ message: string; debt: Debt }>(`/debts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  recordPayment: (id: string, data: { amount: number; accountId: string }) =>
    apiFetch<{ message: string; debt: Debt }>(`/debts/${id}/payment`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/debts/${id}`, {
      method: "DELETE",
    }),
};

// ============================================
// Scheduled Payments API
// ============================================

export const scheduledPaymentsApi = {
  getAll: () =>
    apiFetch<{ scheduledPayments: ScheduledPayment[] }>("/scheduled-payments"),

  getById: (id: string) =>
    apiFetch<{ scheduledPayment: ScheduledPayment }>(`/scheduled-payments/${id}`),

  create: (data: {
    accountId: string;
    categoryId?: string;
    name: string;
    amount: number;
    currency?: string;
    type: "income" | "expense";
    frequency: ScheduledPayment["frequency"];
    startDate: string;
    endDate?: string;
    autoProcess?: boolean;
  }) =>
    apiFetch<{ message: string; scheduledPayment: ScheduledPayment }>(
      "/scheduled-payments",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  update: (
    id: string,
    data: Partial<{
      name: string;
      amount: number;
      categoryId: string;
      frequency: ScheduledPayment["frequency"];
      endDate: string;
      isActive: boolean;
      autoProcess: boolean;
    }>
  ) =>
    apiFetch<{ message: string; scheduledPayment: ScheduledPayment }>(
      `/scheduled-payments/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    ),

  process: (id: string) =>
    apiFetch<{ message: string; transaction: Transaction }>(
      `/scheduled-payments/${id}/process`,
      {
        method: "POST",
      }
    ),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/scheduled-payments/${id}`, {
      method: "DELETE",
    }),
};

// ============================================
// Settings API
// ============================================

export const settingsApi = {
  get: () => apiFetch<{ settings: UserSettings }>("/settings"),

  update: (data: Partial<UserSettings>) =>
    apiFetch<{ message: string; settings: UserSettings }>("/settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};
