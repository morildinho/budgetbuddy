"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/types/database";

interface UseCategoriesReturn {
  categories: Category[];
  loading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  getCategoryById: (id: string) => Category | undefined;
  getCategoryByName: (name: string) => Category | undefined;
  createCategory: (name: string) => Promise<Category | null>;
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setCategories(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch categories";
      setError(message);
      console.error("Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const getCategoryById = useCallback((id: string): Category | undefined => {
    return categories.find((c) => c.id === id);
  }, [categories]);

  const getCategoryByName = useCallback((name: string): Category | undefined => {
    return categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  }, [categories]);

  const createCategory = useCallback(async (name: string): Promise<Category | null> => {
    try {
      // Get the highest sort_order and add 1
      const maxSortOrder = categories.length > 0
        ? Math.max(...categories.map(c => c.sort_order))
        : 0;

      const { data, error: insertError } = await supabase
        .from("categories")
        .insert({
          name: name.trim(),
          color: "#64748b",
          icon: "tag",
          sort_order: maxSortOrder + 1,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Add to local state
      setCategories((prev) => [...prev, data]);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create category";
      console.error("Error creating category:", err);
      setError(message);
      return null;
    }
  }, [supabase, categories]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    fetchCategories,
    getCategoryById,
    getCategoryByName,
    createCategory,
  };
}
