"use client";

import { useState, useEffect, useCallback } from "react";

export interface Household {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  owner_id: string;
  member_user_id: string | null;
  invite_email: string | null;
  invite_token: string;
  invite_status: "pending" | "accepted" | "revoked";
  can_view_overview: boolean;
  can_view_receipts: boolean;
  can_view_transactions: boolean;
  can_view_budget: boolean;
  can_view_analytics: boolean;
  can_view_portfolio: boolean;
  allowed_bank_account_ids: string[] | null;
  created_at: string;
  accepted_at: string | null;
}

export interface Permissions {
  overview: boolean;
  receipts: boolean;
  transactions: boolean;
  budget: boolean;
  analytics: boolean;
  portfolio: boolean;
}

interface InviteMemberOptions {
  email?: string;
  permissions: Permissions;
  allowedBankAccountIds?: string[] | null;
}

interface InviteResult {
  member: HouseholdMember;
  inviteLink: string;
}

export function useHousehold() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [myMemberships, setMyMemberships] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHousehold = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/household");
      if (!res.ok) throw new Error("Failed to fetch household");
      const data = await res.json();
      setHousehold(data.household);
      setMembers(data.members || []);
      setMyMemberships(data.myMemberships || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHousehold();
  }, [fetchHousehold]);

  const updateHouseholdName = useCallback(async (name: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to update household");
      const data = await res.json();
      setHousehold(data.household);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    }
  }, []);

  const inviteMember = useCallback(async (options: InviteMemberOptions): Promise<InviteResult | null> => {
    try {
      const res = await fetch("/api/household/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
      if (!res.ok) throw new Error("Failed to create invite");
      const data = await res.json();
      setMembers((prev) => [data.member, ...prev]);
      // Update household if it was just created
      if (!household) fetchHousehold();
      return { member: data.member, inviteLink: data.inviteLink };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    }
  }, [household, fetchHousehold]);

  const revokeMember = useCallback(async (memberId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/household/invite?memberId=${memberId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke member");
      setMembers((prev) =>
        prev.map((m) => m.id === memberId ? { ...m, invite_status: "revoked" as const } : m)
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    }
  }, []);

  const myPermissions = myMemberships.length > 0 ? {
    overview: myMemberships[0].can_view_overview,
    receipts: myMemberships[0].can_view_receipts,
    transactions: myMemberships[0].can_view_transactions,
    budget: myMemberships[0].can_view_budget,
    analytics: myMemberships[0].can_view_analytics,
    portfolio: myMemberships[0].can_view_portfolio,
  } : null;

  return {
    household,
    members,
    myMemberships,
    myPermissions,
    loading,
    error,
    updateHouseholdName,
    inviteMember,
    revokeMember,
    refresh: fetchHousehold,
  };
}
