"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ReceiptItem, Category } from "@/types/database";

export interface ReceiptItemWithContext extends ReceiptItem {
  category?: Category;
  receipt?: {
    receipt_date: string;
    merchant: string;
  };
}

interface UseReceiptItemsReturn {
  items: ReceiptItemWithContext[];
  loading: boolean;
  error: string | null;
}

export function useReceiptItems(): UseReceiptItemsReturn {
  const [items, setItems] = useState<ReceiptItemWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("receipt_items")
        .select(`
          *,
          category:categories(*),
          receipt:receipts(receipt_date, merchant)
        `)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setItems(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch receipt items";
      setError(message);
      console.error("Error fetching receipt items:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, error };
}
