"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface MerchantIcon {
  id: string;
  pattern: string;
  name: string;
  icon_path: string | null;
  icon_url: string | null;
  created_at: string;
}

interface UseMerchantIconsReturn {
  icons: MerchantIcon[];
  loading: boolean;
  error: string | null;
  addIcon: (pattern: string, name: string, file: File | null) => Promise<boolean>;
  updateIcon: (id: string, pattern: string, name: string, file: File | null) => Promise<boolean>;
  deleteIcon: (id: string, iconPath: string | null) => Promise<boolean>;
  getIconUrl: (iconPath: string | null) => string | null;
}

export function useMerchantIcons(): UseMerchantIconsReturn {
  const [icons, setIcons] = useState<MerchantIcon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const getIconUrl = useCallback((iconPath: string | null): string | null => {
    if (!iconPath) return null;
    const { data } = supabase.storage
      .from("merchant-icons")
      .getPublicUrl(iconPath);
    return data.publicUrl;
  }, [supabase]);

  const fetchIcons = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("merchant_icons")
        .select("*")
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;

      const withUrls = (data || []).map((icon) => ({
        ...icon,
        icon_url: getIconUrl(icon.icon_path),
      }));

      setIcons(withUrls);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch merchant icons";
      setError(message);
      console.error("Error fetching merchant icons:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, getIconUrl]);

  const uploadFile = async (file: File, pattern: string): Promise<string | null> => {
    const slug = pattern.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    const ext = file.name.split(".").pop() || "png";
    const path = `${slug}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("merchant-icons")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Kunne ikke laste opp ikon");
    }

    return path;
  };

  const addIcon = useCallback(async (pattern: string, name: string, file: File | null): Promise<boolean> => {
    try {
      let iconPath: string | null = null;
      if (file) {
        iconPath = await uploadFile(file, pattern);
      }

      const { data, error: insertError } = await supabase
        .from("merchant_icons")
        .insert({ pattern: pattern.trim(), name: name.trim(), icon_path: iconPath })
        .select()
        .single();

      if (insertError) throw insertError;

      setIcons((prev) => [...prev, { ...data, icon_url: getIconUrl(data.icon_path) }]);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add merchant icon";
      setError(message);
      console.error("Error adding merchant icon:", err);
      return false;
    }
  }, [supabase, getIconUrl]);

  const updateIcon = useCallback(async (id: string, pattern: string, name: string, file: File | null): Promise<boolean> => {
    try {
      const updates: Record<string, string> = {
        pattern: pattern.trim(),
        name: name.trim(),
      };

      if (file) {
        const iconPath = await uploadFile(file, pattern);
        if (iconPath) updates.icon_path = iconPath;
      }

      const { data, error: updateError } = await supabase
        .from("merchant_icons")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw updateError;

      setIcons((prev) =>
        prev.map((icon) => icon.id === id ? { ...data, icon_url: getIconUrl(data.icon_path) } : icon)
      );
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update merchant icon";
      setError(message);
      console.error("Error updating merchant icon:", err);
      return false;
    }
  }, [supabase, getIconUrl]);

  const deleteIcon = useCallback(async (id: string, iconPath: string | null): Promise<boolean> => {
    try {
      // Delete file from storage
      if (iconPath) {
        await supabase.storage.from("merchant-icons").remove([iconPath]);
      }

      const { error: deleteError } = await supabase
        .from("merchant_icons")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      setIcons((prev) => prev.filter((icon) => icon.id !== id));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete merchant icon";
      setError(message);
      console.error("Error deleting merchant icon:", err);
      return false;
    }
  }, [supabase]);

  useEffect(() => {
    fetchIcons();
  }, [fetchIcons]);

  return { icons, loading, error, addIcon, updateIcon, deleteIcon, getIconUrl };
}
