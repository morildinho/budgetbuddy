"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Receipt, ReceiptInsert, ReceiptUpdate } from "@/types/database";

interface UseReceiptsOptions {
  limit?: number;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
}

interface UseReceiptsReturn {
  receipts: Receipt[];
  allReceipts: Receipt[];
  loading: boolean;
  error: string | null;
  fetchReceipts: () => Promise<void>;
  createReceipt: (receipt: Omit<ReceiptInsert, "user_id">) => Promise<Receipt | null>;
  updateReceipt: (id: string, updates: ReceiptUpdate) => Promise<Receipt | null>;
  deleteReceipt: (id: string) => Promise<boolean>;
  stats: {
    totalThisWeek: number;
    totalThisMonth: number;
    receiptCount: number;
    averageReceipt: number;
  };
}

export function useReceipts(options: UseReceiptsOptions = {}): UseReceiptsReturn {
  const { limit, startDate, endDate, categoryId } = options;
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Calculate stats from ALL receipts (not limited)
  const stats = {
    totalThisWeek: calculateWeekTotal(allReceipts),
    totalThisMonth: calculateMonthTotal(allReceipts),
    receiptCount: allReceipts.length,
    averageReceipt: allReceipts.length > 0
      ? allReceipts.reduce((sum, r) => sum + Number(r.total_amount), 0) / allReceipts.length
      : 0,
  };

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Always fetch all receipts for stats calculation
      const { data: allData, error: allError } = await supabase
        .from("receipts")
        .select(`
          *,
          category:categories(*)
        `)
        .order("receipt_date", { ascending: false });

      if (allError) {
        throw allError;
      }

      setAllReceipts(allData || []);

      // Apply filters for the displayed receipts
      let filteredData = allData || [];

      if (startDate) {
        filteredData = filteredData.filter(r => r.receipt_date >= startDate);
      }

      if (endDate) {
        filteredData = filteredData.filter(r => r.receipt_date <= endDate);
      }

      if (categoryId) {
        filteredData = filteredData.filter(r => r.category_id === categoryId);
      }

      if (limit) {
        filteredData = filteredData.slice(0, limit);
      }

      setReceipts(filteredData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch receipts";
      setError(message);
      console.error("Error fetching receipts:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, limit, startDate, endDate, categoryId]);

  const createReceipt = useCallback(async (
    receiptData: Omit<ReceiptInsert, "user_id">
  ): Promise<Receipt | null> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error: insertError } = await supabase
        .from("receipts")
        .insert({
          ...receiptData,
          user_id: user.id,
        })
        .select(`
          *,
          category:categories(*)
        `)
        .single();

      if (insertError) {
        throw insertError;
      }

      // Add to local state
      setReceipts((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create receipt";
      setError(message);
      console.error("Error creating receipt:", err);
      return null;
    }
  }, [supabase]);

  const updateReceipt = useCallback(async (
    id: string,
    updates: ReceiptUpdate
  ): Promise<Receipt | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from("receipts")
        .update(updates)
        .eq("id", id)
        .select(`
          *,
          category:categories(*)
        `)
        .single();

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setReceipts((prev) =>
        prev.map((r) => (r.id === id ? data : r))
      );
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update receipt";
      setError(message);
      console.error("Error updating receipt:", err);
      return null;
    }
  }, [supabase]);

  const deleteReceipt = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from("receipts")
        .delete()
        .eq("id", id);

      if (deleteError) {
        throw deleteError;
      }

      // Remove from local state
      setReceipts((prev) => prev.filter((r) => r.id !== id));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete receipt";
      setError(message);
      console.error("Error deleting receipt:", err);
      return false;
    }
  }, [supabase]);

  // Fetch receipts on mount and when options change
  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  return {
    receipts,
    allReceipts,
    loading,
    error,
    fetchReceipts,
    createReceipt,
    updateReceipt,
    deleteReceipt,
    stats,
  };
}

// Helper function to calculate week total
function calculateWeekTotal(receipts: Receipt[]): number {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  return receipts
    .filter((r) => new Date(r.receipt_date) >= startOfWeek)
    .reduce((sum, r) => sum + Number(r.total_amount), 0);
}

// Helper function to calculate month total
function calculateMonthTotal(receipts: Receipt[]): number {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return receipts
    .filter((r) => new Date(r.receipt_date) >= startOfMonth)
    .reduce((sum, r) => sum + Number(r.total_amount), 0);
}

// Hook for fetching a single receipt with items
export function useReceipt(id: string) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchReceipt = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("receipts")
        .select(`
          *,
          category:categories(*),
          items:receipt_items(
            *,
            category:categories(*)
          )
        `)
        .eq("id", id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      setReceipt(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch receipt";
      setError(message);
      console.error("Error fetching receipt:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, id]);

  useEffect(() => {
    fetchReceipt();
  }, [fetchReceipt]);

  return { receipt, loading, error, refetch: fetchReceipt };
}
