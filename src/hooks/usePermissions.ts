"use client";

import { useState, useEffect } from "react";

interface CanView {
  overview: boolean;
  receipts: boolean;
  transactions: boolean;
  budget: boolean;
  analytics: boolean;
  portfolio: boolean;
}

interface UsePermissionsReturn {
  canView: CanView;
  isOwner: boolean;
  loading: boolean;
}

const NO_ACCESS: CanView = {
  overview: false,
  receipts: false,
  transactions: false,
  budget: false,
  analytics: false,
  portfolio: false,
};

export function usePermissions(): UsePermissionsReturn {
  const [canView, setCanView] = useState<CanView>(NO_ACCESS);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchPermissions = async () => {
      try {
        const res = await fetch("/api/household/permissions");
        if (!res.ok) {
          if (!cancelled) {
            setIsOwner(false);
            setCanView(NO_ACCESS);
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setIsOwner(data.isOwner === true);
          setCanView(data.canView ?? NO_ACCESS);
        }
      } catch {
        if (!cancelled) {
          setIsOwner(false);
          setCanView(NO_ACCESS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPermissions();
    return () => { cancelled = true; };
  }, []);

  return { canView, isOwner, loading };
}
