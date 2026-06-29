// Database types for Receipt Tracker

export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  parent_category: string | null;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

export interface Receipt {
  id: string;
  user_id: string;
  image_url: string | null;
  merchant: string;
  receipt_date: string;
  total_amount: number;
  category_id: string | null;
  ocr_method: string | null;
  raw_ocr_text: string | null;
  confidence_score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: Category;
  items?: ReceiptItem[];
}

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  item_name: string;
  quantity: number;
  unit_price: number | null;
  total_price: number;
  category_id: string | null;
  line_number: number | null;
  created_at: string;
  // Joined data
  category?: Category;
}

// Insert types (without auto-generated fields)
export interface ReceiptInsert {
  user_id: string;
  image_url?: string | null;
  merchant: string;
  receipt_date: string;
  total_amount: number;
  category_id?: string | null;
  ocr_method?: string | null;
  raw_ocr_text?: string | null;
  confidence_score?: number | null;
  notes?: string | null;
}

export interface ReceiptItemInsert {
  receipt_id: string;
  item_name: string;
  quantity?: number;
  unit_price?: number | null;
  total_price: number;
  category_id?: string | null;
  line_number?: number | null;
}

// Update types (all fields optional except id)
export type ReceiptUpdate = Partial<Omit<Receipt, "id" | "user_id" | "created_at">>;
export type ReceiptItemUpdate = Partial<Omit<ReceiptItem, "id" | "receipt_id" | "created_at">>;

// Learned category mapping (for AI learning)
export interface LearnedCategory {
  id: string;
  user_id: string;
  item_pattern: string;
  category_id: string;
  use_count: number;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: Category;
}

// OCR Result from API
export interface OCRItem {
  name: string;
  quantity: number;
  unit_price: number | null;
  total_price: number;
  suggested_category: string;
  confidence: number;
}

export interface OCRResult {
  merchant: string;
  date: string;
  total: number;
  items: OCRItem[];
  raw_text: string;
  confidence: number;
}

// ============================================
// Budget Types
// ============================================

// Budget entry types
export type BudgetEntryType = 'fixed_expense' | 'variable_expense' | 'loan' | 'income';

// Budget (monthly container)
export interface Budget {
  id: string;
  user_id: string;
  month: string; // YYYY-MM-DD format (first of month)
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  entries?: BudgetEntry[];
}

export interface BudgetInsert {
  user_id: string;
  month: string;
  notes?: string | null;
}

export type BudgetUpdate = Partial<Omit<Budget, 'id' | 'user_id' | 'created_at'>>;

// Budget Entry (individual line item)
export interface BudgetEntry {
  id: string;
  budget_id: string;
  entry_type: BudgetEntryType;
  description: string;
  amount: number;
  is_recurring: boolean;
  sort_order: number;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetEntryInsert {
  budget_id: string;
  entry_type: BudgetEntryType;
  description: string;
  amount: number;
  is_recurring?: boolean;
  sort_order?: number;
  category_id?: string | null;
}

export type BudgetEntryUpdate = Partial<Omit<BudgetEntry, 'id' | 'budget_id' | 'created_at'>>;

// ============================================
// Bank Integration Types
// ============================================

export type BankConnectionStatus = 'active' | 'expired' | 'disconnected';

export interface BankConnection {
  id: string;
  user_id: string;
  provider: string;
  bank_name: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  status: BankConnectionStatus;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankConnectionInsert {
  user_id: string;
  provider?: string;
  bank_name?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  status?: BankConnectionStatus;
}

export type BankConnectionUpdate = Partial<Omit<BankConnection, 'id' | 'user_id' | 'created_at'>>;

export interface BankTransaction {
  id: string;
  user_id: string;
  bank_account_id: string | null;
  account_id: string | null;
  transaction_id: string | null;
  source: string;
  date: string;
  description: string;
  amount: number;
  category_id: string | null;
  receipt_id: string | null;
  budget_entry_id: string | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: Category;
  receipt?: Receipt;
  budget_entry?: BudgetEntry;
}

export interface BankTransactionInsert {
  user_id: string;
  bank_account_id?: string | null;
  transaction_id?: string | null;
  source?: string;
  date: string;
  description: string;
  amount: number;
  category_id?: string | null;
  receipt_id?: string | null;
  budget_entry_id?: string | null;
  raw_data?: Record<string, unknown> | null;
}

export type BankTransactionUpdate = Partial<Omit<BankTransaction, 'id' | 'user_id' | 'created_at'>>;

// Computed budget stats
export interface BudgetStats {
  totalFixedExpenses: number;
  totalVariableExpenses: number;
  totalLoans: number;
  totalIncome: number;
  balance: number; // income - (fixed + variable + loans)
  totalActualExpenses: number; // sum of linked bank transaction amounts
}