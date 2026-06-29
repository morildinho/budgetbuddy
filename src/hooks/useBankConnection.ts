"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BankConnection } from "@/types/database";

interface UseBankConnectionReturn {
  connection: BankConnection | null;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  isExpired: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<boolean>;
  syncTransactions: () => Promise<{ imported: number; skipped: number; total: number } | null>;
  syncing: boolean;
}

export function useBankConnection(): UseBankConnectionReturn {
  const [connection, setConnection] = useState<BankConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const supabase = createClient();

  const fetchConnection = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("bank_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", "sparebank1")
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      setConnection(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch bank connection";
      setError(message);
      console.error("Error fetching bank connection:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/bank/connect");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate connection");
      }

      // Redirect to BankID login
      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect bank";
      setError(message);
      console.error("Error connecting bank:", err);
    }
  }, []);

  const disconnect = useCallback(async (): Promise<boolean> => {
    if (!connection) return false;

    try {
      const { error: deleteError } = await supabase
        .from("bank_connections")
        .delete()
        .eq("id", connection.id);

      if (deleteError) {
        throw deleteError;
      }

      setConnection(null);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to disconnect bank";
      setError(message);
      console.error("Error disconnecting bank:", err);
      return false;
    }
  }, [supabase, connection]);

  const syncTransactions = useCallback(async () => {
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/bank/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync transactions");
      }

      // Refresh connection to get updated last_synced_at
      await fetchConnection();

      return {
        imported: data.imported,
        skipped: data.skipped,
        total: data.total,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sync transactions";
      setError(message);
      console.error("Error syncing transactions:", err);
      return null;
    } finally {
      setSyncing(false);
    }
  }, [fetchConnection]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  const isConnected = connection?.status === "active";
  const isExpired = connection?.status === "expired";

  return {
    connection,
    loading,
    error,
    isConnected,
    isExpired,
    connect,
    disconnect,
    syncTransactions,
    syncing,
  };
}
