import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BudgetEntryType } from "@/types/database";

export interface BudgetCategory {
  id: string;
  user_id: string;
  name: string;
  parent_type: BudgetEntryType;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useBudgetCategories(parentType?: BudgetEntryType) {
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [parentType]);

  async function fetchCategories() {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("budget_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (parentType) {
      query = query.eq("parent_type", parentType);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching budget categories:", error);
      setError(error.message);
    } else {
      setCategories(data || []);
    }

    setLoading(false);
  }

  async function createCategory(category: Omit<BudgetCategory, "id" | "user_id" | "created_at" | "updated_at">) {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("budget_categories")
      .insert([category])
      .select()
      .single();

    if (error) {
      console.error("Error creating budget category:", error);
      throw error;
    }

    setCategories((prev) => [...prev, data]);
    return data;
  }

  async function updateCategory(id: string, updates: Partial<BudgetCategory>) {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("budget_categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating budget category:", error);
      throw error;
    }

    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? data : cat))
    );
    return data;
  }

  async function deleteCategory(id: string) {
    const supabase = createClient();

    const { error } = await supabase
      .from("budget_categories")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting budget category:", error);
      throw error;
    }

    setCategories((prev) => prev.filter((cat) => cat.id !== id));
  }

  return {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    refetch: fetchCategories,
  };
}
