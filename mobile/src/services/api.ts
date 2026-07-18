const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export class ApiError extends Error {
  code?: string;
  status?: number;
  data?: Record<string, unknown>;

  constructor(message: string, status?: number, data?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.data = data;
    this.code = data?.code as string | undefined;
  }
}

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

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError('Network error — check your connection', 0);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(
        data.message || `Request failed (${response.status})`,
        response.status,
        data
      );
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

  patch<T>(path: string, body: unknown) {
    return this.request<T>('PATCH', path, body);
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
    accountId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams({ format: 'json' });
    if (filters.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters.category) params.append('category', filters.category);
    if (filters.accountId) params.append('accountId', filters.accountId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    return this.get<{ transactions: Transaction[] }>(`/transactions/export?${params}`);
  }
}

export const api = new ApiClient();

export interface Account {
  _id: string;
  name: string;
  icon: string;
  color: string;
  currency: string;
  fxGroup?: 'crypto' | 'bank' | 'local';
  openingBalance?: number;
  balance: number;
  convertedBalance?: number;
  displayCurrency?: string;
  isArchived?: boolean;
  sortOrder?: number;
}

export interface FxSettings {
  displayCurrency: 'ETB' | 'USD';
  cryptoUsdToEtb: number;
  bankUsdToEtb: number;
}

export interface AccountsSummary {
  totalsByCurrency: { currency: string; total: number }[];
  accounts: Account[];
  legacyTransactionCount: number;
  fx: FxSettings;
  displayCurrency: 'ETB' | 'USD';
  totalConverted: number;
  availableNow?: number;
  landingSoonIncoming?: number;
  landingSoonOutgoing?: number;
  projectedTotal?: number;
  scheduledWindowDays?: number;
  overdueScheduled?: ScheduledItem[];
  landingSoonItems?: ScheduledItem[];
}

export interface ScheduledItem {
  _id: string;
  title: string;
  amount: number;
  direction: 'incoming' | 'outgoing';
  expectedDate: string;
  accountId: string | { _id: string; name: string; currency?: string; color?: string; icon?: string };
  account?: { _id: string; name: string; currency?: string; color?: string; icon?: string };
  status: 'pending' | 'landed' | 'overdue' | 'cancelled';
  recurring?: boolean;
  note?: string;
  currency?: string;
  convertedAmount?: number;
  transactionId?: string;
}

export interface DetectedItem {
  _id: string;
  source: 'binance' | 'grey' | 'cbe' | 'boa' | 'telebirr' | 'other';
  amount: number;
  currency: string;
  direction: 'incoming' | 'outgoing';
  date: string;
  accountHint?: string;
  suggestedAccountId?: string | Account;
  rawReference?: string;
  fee?: number;
  vat?: number;
  reportedBalance?: number;
  rawSnippet?: string;
  status: 'needs_review' | 'approved' | 'dismissed' | 'duplicate';
  externalRef?: string;
}

export interface UserPreferences {
  scheduledWindowDays: 7 | 14 | 30;
  pushAlertsEnabled?: boolean;
  ingest: {
    gmailConnected: boolean;
    gmailBinance: boolean;
    gmailGrey: boolean;
    androidNotifications: boolean;
    androidSms: boolean;
    gmailEmail?: string | null;
    senderAllowlist?: string[];
  };
}

export interface GmailSyncResult {
  scanned: number;
  queued: number;
  parseFailed: number;
  duplicates: number;
  alreadyQueued: number;
  skippedOther?: number;
  needsReviewCount?: number;
  samples?: Array<{
    reason: string;
    from?: string;
    subject?: string;
    snippet?: string;
  }>;
  items?: DetectedItem[];
}

export interface Transaction {
  _id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  accountId?: string;
  toAccountId?: string;
  category: string;
  source?: string;
  date: string;
  note?: string;
  isRecurring?: boolean;
  externalRef?: string;
  sourceChannel?: string;
  fee?: number;
  vat?: number;
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
  accountsSummary: {
    totalsByCurrency: { currency: string; total: number }[];
    accounts: Account[];
  };
  legacy: { income: number; expenses: number; balance: number };
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

export interface OverdraftError {
  code: 'OVERDRAFT';
  message: string;
  balance: number;
  amount: number;
  projectedBalance: number;
  accountName?: string;
}
