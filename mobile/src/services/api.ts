const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Request failed (${response.status})`);
    }

    return data as T;
  }

  get<T>(path: string) {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body: unknown) {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body: unknown) {
    return this.request<T>('PUT', path, body);
  }

  delete<T>(path: string) {
    return this.request<T>('DELETE', path);
  }

  getToken() {
    return this.token;
  }

  async exportTransactions(filters: {
    type?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams({ format: 'json' });
    if (filters.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters.category) params.append('category', filters.category);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    return this.get<{ transactions: Transaction[] }>(`/transactions/export?${params}`);
  }
}

export const api = new ApiClient();

export interface Transaction {
  _id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  source?: string;
  date: string;
  note?: string;
  isRecurring?: boolean;
}

export interface Budget {
  _id: string;
  category: string;
  monthlyLimit: number;
  spent?: number;
  percentage?: number;
  status?: 'ok' | 'warning' | 'over';
}

export interface Category {
  _id: string;
  name: string;
  type: 'expense' | 'income';
  icon?: string;
}

export interface DashboardSummary {
  balance: number;
  totalIncome: number;
  totalExpenses: number;
  thisMonth: { income: number; expenses: number; net: number };
  lastMonth: { income: number; expenses: number; net: number };
  spendingByCategory: { category: string; total: number }[];
  monthlyTrend: { month: string; income: number; expenses: number }[];
  budgetAlerts: {
    category: string;
    monthlyLimit: number;
    spent: number;
    percentage: number;
    status: string;
  }[];
}

export interface TransactionsResponse {
  transactions: Transaction[];
  pagination: { total: number; page: number; limit: number; pages: number };
}
