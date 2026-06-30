"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BankTransaction, BankTransactionUpdate } from "@/types/database";

interface UseBankTransactionsOptions {
  limit?: number;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  accountId?: string;
  unmatched?: boolean;
}

interface UseBankTransactionsReturn {
  transactions: BankTransaction[];
  loading: boolean;
  error: string | null;
  fetchTransactions: () => Promise<void>;
  updateTransaction: (id: string, updates: BankTransactionUpdate) => Promise<BankTransaction | null>;
  linkReceipt: (transactionId: string, receiptId: string) => Promise<boolean>;
  unlinkReceipt: (transactionId: string) => Promise<boolean>;
  linkBudgetEntry: (transactionId: string, budgetEntryId: string) => Promise<boolean>;
  unlinkBudgetEntry: (transactionId: string) => Promise<boolean>;
  stats: {
    totalExpenses: number;
    totalIncome: number;
    transactionCount: number;
    matchedCount: number;
    budgetLinkedCount: number;
  };
}

export function useBankTransactions(options: UseBankTransactionsOptions = {}): UseBankTransactionsReturn {
  const { limit, startDate, endDate, categoryId, accountId, unmatched } = options;
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const stats = {
    totalExpenses: transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0),
    totalIncome: transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0),
    transactionCount: transactions.length,
    matchedCount: transactions.filter((t) => t.receipt_id).length,
    budgetLinkedCount: transactions.filter((t) => t.budget_entry_id).length,
  };

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("bank_transactions")
        .select(`
          *,
          category:categories(*),
          receipt:receipts(id, merchant, receipt_date, total_amount),
          budget_entry:budget_entries(id, description, amount, entry_type)
        `)
        .order("date", { ascending: false });

      if (startDate) {
        query = query.gte("date", startDate);
      }
      if (endDate) {
        query = query.lte("date", endDate);
      }
      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }
      if (accountId) {
        query = query.eq("bank_account_id", accountId);
      }
      if (unmatched) {
        query = query.is("receipt_id", null);
      }
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setTransactions(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch transactions";
      setError(message);
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, limit, startDate, endDate, categoryId, accountId, unmatched]);

  const updateTransaction = useCallback(async (
    id: string,
    updates: BankTransactionUpdate
  ): Promise<BankTransaction | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from("bank_transactions")
        .update(updates)
        .eq("id", id)
        .select(`
          *,
          category:categories(*),
          receipt:receipts(id, merchant, receipt_date, total_amount),
          budget_entry:budget_entries(id, description, amount, entry_type)
        `)
        .single();

      if (updateError) {
        throw updateError;
      }

      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? data : t))
      );
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update transaction";
      setError(message);
      console.error("Error updating transaction:", err);
      return null;
    }
  }, [supabase]);

  const linkReceipt = useCallback(async (
    transactionId: string,
    receiptId: string
  ): Promise<boolean> => {
    const result = await updateTransaction(transactionId, { receipt_id: receiptId });
    return result !== null;
  }, [updateTransaction]);

  const unlinkReceipt = useCallback(async (
    transactionId: string
  ): Promise<boolean> => {
    const result = await updateTransaction(transactionId, { receipt_id: null });
    return result !== null;
  }, [updateTransaction]);

  const linkBudgetEntry = useCallback(async (
    transactionId: string,
    budgetEntryId: string
  ): Promise<boolean> => {
    const result = await updateTransaction(transactionId, { budget_entry_id: budgetEntryId });
    return result !== null;
  }, [updateTransaction]);

  const unlinkBudgetEntry = useCallback(async (
    transactionId: string
  ): Promise<boolean> => {
    const result = await updateTransaction(transactionId, { budget_entry_id: null });
    return result !== null;
  }, [updateTransaction]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    fetchTransactions,
    updateTransaction,
    linkReceipt,
    unlinkReceipt,
    linkBudgetEntry,
    unlinkBudgetEntry,
    stats,
  };
}

// Hook to get SpareBank 1 accounts
export interface BankAccount {
  id: string;
  name: string;
  accountNumber: string | null;
  balance: number | null;
  source: "sb1";
}

export function useBankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/bank/accounts");
      if (!response.ok) {
        setAccounts([]);
        return;
      }

      const data = await response.json();
      const sb1Accounts = (data.accounts || []).map(
        (acc: { id: string; name: string; accountNumber?: string | null; balance?: number | null }) => ({
          id: acc.id,
          name: acc.name,
          accountNumber: acc.accountNumber || null,
          balance: acc.balance ?? null,
          source: "sb1" as const,
        })
      );
      setAccounts(sb1Accounts);
    } catch (err) {
      console.error("Error fetching bank accounts:", err);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return { accounts, loading, refetch: fetchAccounts };
}
