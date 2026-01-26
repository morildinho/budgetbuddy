"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LearnedCategory, Category } from "@/types/database";

interface UseLearnedCategoriesReturn {
  learnedCategories: LearnedCategory[];
  loading: boolean;
  error: string | null;
  learnCategory: (itemName: string, categoryId: string) => Promise<void>;
  getCategoryForItem: (itemName: string) => string | null;
  findBestCategory: (itemName: string, suggestedCategory: string, categories: Category[]) => string | null;
}

// Normalize item name for matching
function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, ""); // Remove special characters
}

export function useLearnedCategories(): UseLearnedCategoriesReturn {
  const [learnedCategories, setLearnedCategories] = useState<LearnedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchLearnedCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("learned_categories")
        .select(`
          *,
          category:categories(*)
        `)
        .order("use_count", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setLearnedCategories(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch learned categories";
      setError(message);
      console.error("Error fetching learned categories:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Learn a new category mapping or update existing one
  const learnCategory = useCallback(async (itemName: string, categoryId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const pattern = normalizeItemName(itemName);

      // Skip very short patterns (less than 3 chars) - too generic
      if (pattern.length < 3) {
        return;
      }

      // First, check if the pattern already exists
      const { data: existing } = await supabase
        .from("learned_categories")
        .select("id, use_count")
        .eq("user_id", user.id)
        .eq("item_pattern", pattern)
        .single();

      if (existing) {
        // Update existing: increment use_count and update category_id
        const { error: updateError } = await supabase
          .from("learned_categories")
          .update({
            category_id: categoryId,
            use_count: existing.use_count + 1,
          })
          .eq("id", existing.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Insert new learned category
        const { error: insertError } = await supabase
          .from("learned_categories")
          .insert({
            user_id: user.id,
            item_pattern: pattern,
            category_id: categoryId,
            use_count: 1,
          });

        if (insertError) {
          throw insertError;
        }
      }

      // Refresh the learned categories
      await fetchLearnedCategories();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to learn category";
      console.error("Error learning category:", err);
      setError(message);
    }
  }, [supabase, fetchLearnedCategories]);

  // Get the learned category for an item
  const getCategoryForItem = useCallback((itemName: string): string | null => {
    const pattern = normalizeItemName(itemName);

    // Exact match first (highest priority)
    const exactMatch = learnedCategories.find(
      (lc) => lc.item_pattern === pattern
    );
    if (exactMatch) {
      return exactMatch.category_id;
    }

    // Partial match - only for patterns that are substantial (5+ chars)
    // and must be a word boundary match (starts with the pattern or pattern is a distinct word)
    const words = pattern.split(" ");

    // Check if any learned pattern matches a complete word in the item
    const wordMatch = learnedCategories.find((lc) => {
      // Pattern must be at least 5 chars to be used for partial matching
      if (lc.item_pattern.length < 5) return false;

      // Check if the learned pattern matches any complete word in the item
      return words.some(word => word === lc.item_pattern);
    });
    if (wordMatch) {
      return wordMatch.category_id;
    }

    // Check if item starts with a learned pattern (e.g., "melk" matches "melk lettere")
    const startsWithMatch = learnedCategories.find((lc) => {
      if (lc.item_pattern.length < 4) return false;
      return pattern.startsWith(lc.item_pattern + " ") || pattern === lc.item_pattern;
    });
    if (startsWithMatch) {
      return startsWithMatch.category_id;
    }

    return null;
  }, [learnedCategories]);

  // Find the best category for an item (combining learned + AI suggestion)
  const findBestCategory = useCallback((
    itemName: string,
    suggestedCategory: string,
    categories: Category[]
  ): string | null => {
    // First check if we have a learned category for this item
    const learnedCategoryId = getCategoryForItem(itemName);
    if (learnedCategoryId) {
      return learnedCategoryId;
    }

    // Fall back to AI suggestion - find matching category by name
    const matchingCategory = categories.find(
      (c) => c.name.toLowerCase() === suggestedCategory.toLowerCase()
    );
    if (matchingCategory) {
      return matchingCategory.id;
    }

    // Try partial match on category name
    const partialMatch = categories.find(
      (c) => c.name.toLowerCase().includes(suggestedCategory.toLowerCase()) ||
             suggestedCategory.toLowerCase().includes(c.name.toLowerCase())
    );
    if (partialMatch) {
      return partialMatch.id;
    }

    return null;
  }, [getCategoryForItem]);

  useEffect(() => {
    fetchLearnedCategories();
  }, [fetchLearnedCategories]);

  return {
    learnedCategories,
    loading,
    error,
    learnCategory,
    getCategoryForItem,
    findBestCategory,
  };
}
