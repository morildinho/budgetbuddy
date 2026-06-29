"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import {
  Landmark,
  RefreshCw,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface BankAccount {
  id: string;
  tink_account_id: string;
  name: string;
  iban: string | null;
  type: string | null;
  balance_amount: number | null;
  balance_currency: string;
  last_refreshed_at: string | null;
}

interface BankTransaction {
  id: string;
  tink_transaction_id: string;
  amount: number;
  currency: string;
  description: string;
  date: string;
  category: string | null;
  status: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function maskIban(iban: string | null): string {
  if (!iban) return "—";
  if (iban.length <= 8) return iban;
  return iban.slice(0, 4) + " •••• •••• " + iban.slice(-4);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BankPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Per-account expanded + transactions
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Record<string, BankTransaction[]>>({});
  const [loadingTxns, setLoadingTxns] = useState<Record<string, boolean>>({});
  const [removingAccount, setRemovingAccount] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // ── Load accounts ────────────────────────────────────────────────────────

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch("/api/bank/tink/accounts");
      if (!res.ok) throw new Error("feil");
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch {
      setStatusMsg({ text: "Kunne ikke laste kontoer.", ok: false });
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
    // Read URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      setStatusMsg({ text: "Bankkonto koblet til! Kontoer er hentet.", ok: true });
      window.history.replaceState({}, "", "/bank");
    }
    const err = params.get("error");
    if (err) {
      const msgs: Record<string, string> = {
        auth_denied: "Tilkobling avvist av bruker.",
        no_code: "Ingen autorisasjonskode mottatt.",
        no_credentials: "Ingen banktilkobling ble returnert fra Tink.",
        invalid_state: "Tilkoblingen kunne ikke verifiseres. Prøv igjen.",
        config_error: "Konfigurasjonsfeil.",
        token_failed: "Kunne ikke fullføre tilkobling.",
        token_expired: "Tink-tilgangen utløp. Prøv å koble til på nytt.",
        save_failed: "Kunne ikke lagre tilkobling.",
        sync_failed: "Banken ble koblet til, men kontoene kunne ikke hentes ennå.",
        callback_failed: "Noe gikk galt under tilkobling.",
      };
      setStatusMsg({ text: msgs[err] || "En feil oppstod.", ok: false });
      window.history.replaceState({}, "", "/bank");
    }
  }, [loadAccounts]);

  // ── Connect bank ─────────────────────────────────────────────────────────

  const connectBank = async () => {
    try {
      const res = await fetch("/api/bank/tink/link");
      if (!res.ok) throw new Error("feil");
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch {
      setStatusMsg({ text: "Kunne ikke starte bankkobling.", ok: false });
    }
  };

  // ── Refresh all ──────────────────────────────────────────────────────────

  const refreshAll = async () => {
    setRefreshing(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/bank/tink/refresh", { method: "POST" });
      if (!res.ok) throw new Error("feil");
      const data = await res.json();
      setStatusMsg({ text: data.message || "Oppdatert!", ok: true });
      await loadAccounts();
      // Clear cached transactions so they reload on next expand
      setTransactions({});
    } catch {
      setStatusMsg({ text: "Kunne ikke oppdatere kontoer.", ok: false });
    } finally {
      setRefreshing(false);
    }
  };

  // ── Load transactions for account ────────────────────────────────────────

  const loadTransactions = async (accountId: string) => {
    if (expandedAccount === accountId) {
      setExpandedAccount(null);
      return;
    }
    setExpandedAccount(accountId);
    if (transactions[accountId]) return; // already loaded

    setLoadingTxns((prev) => ({ ...prev, [accountId]: true }));
    try {
      const res = await fetch(`/api/bank/tink/transactions?account_id=${accountId}`);
      if (!res.ok) throw new Error("feil");
      const data = await res.json();
      setTransactions((prev) => ({ ...prev, [accountId]: data.transactions || [] }));
    } catch {
      setTransactions((prev) => ({ ...prev, [accountId]: [] }));
    } finally {
      setLoadingTxns((prev) => ({ ...prev, [accountId]: false }));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const isConnected = accounts.length > 0;

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] lg:text-3xl">
            Bank
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {isConnected
              ? `${accounts.length} konto${accounts.length !== 1 ? "er" : ""} tilkoblet via Tink`
              : "Koble til banken din for å importere transaksjoner"}
          </p>
        </div>

        <div className="flex gap-2">
          {isConnected && (
            <Button
              variant="outline"
              onClick={refreshAll}
              isLoading={refreshing}
              disabled={refreshing}
            >
              <RefreshCw className="h-4 w-4" />
              Oppdater
            </Button>
          )}
          <Button variant="primary" onClick={connectBank}>
            <LinkIcon className="h-4 w-4" />
            {isConnected ? "Koble til ny bank" : "Koble til bank"}
          </Button>
        </div>
      </div>

      {/* Status message */}
      {statusMsg && (
        <div
          className={`mb-4 rounded-lg p-3 text-sm ${
            statusMsg.ok
              ? "bg-[var(--accent-success)]/10 text-[var(--accent-success)]"
              : "bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Loading state */}
      {loadingAccounts && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
        </div>
      )}

      {/* Empty state — not connected */}
      {!loadingAccounts && !isConnected && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-primary)] bg-[var(--bg-card)] p-12 text-center">
          <Landmark className="mb-4 h-12 w-12 text-[var(--text-muted)]" />
          <h2 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
            Ingen bank tilkoblet
          </h2>
          <p className="mb-6 max-w-sm text-sm text-[var(--text-muted)]">
            Koble til banken din via Tink for å importere kontoer og transaksjoner automatisk. 
            Støtter de fleste norske banker.
          </p>
          <Button variant="primary" onClick={connectBank}>
            <Landmark className="h-4 w-4" />
            Koble til bank
          </Button>
        </div>
      )}

      {/* Accounts list */}
      {!loadingAccounts && isConnected && (
        <div className="space-y-4">
          {accounts.map((account) => {
            const isExpanded = expandedAccount === account.id;
            const txns = transactions[account.id] || [];
            const isLoadingTxns = loadingTxns[account.id] ?? false;

            return (
              <Card key={account.id}>
                {/* Account header */}
                <div className="p-4 lg:p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-primary)]/10">
                        <Landmark className="h-5 w-5 text-[var(--accent-primary)]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">
                          {account.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {maskIban(account.iban)}
                        </p>
                        {account.type && (
                          <Badge variant="primary" className="mt-1 text-xs">
                            {account.type}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="text-right">
                      {account.balance_amount !== null ? (
                        <p className="text-lg font-bold text-[var(--text-primary)]">
                          {formatCurrency(account.balance_amount)}
                        </p>
                      ) : (
                        <p className="text-sm text-[var(--text-muted)]">Saldo utilgjengelig</p>
                      )}
                      {account.last_refreshed_at && (
                        <p className="text-xs text-[var(--text-muted)]">
                          Oppdatert {formatDate(account.last_refreshed_at)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => loadTransactions(account.id)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--border-primary)] py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)]"
                    >
                    {isLoadingTxns ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Skjul transaksjoner
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Vis transaksjoner
                      </>
                    )}
                    </button>
                    <button
                      onClick={() => setConfirmRemoveId(account.id)}
                      className="flex items-center justify-center gap-2 rounded-lg border border-[var(--accent-danger)]/30 px-3 py-2 text-sm text-[var(--accent-danger)] transition-colors hover:bg-[var(--accent-danger)]/10"
                      title="Fjern konto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Confirm remove dialog */}
                  {confirmRemoveId === account.id && (
                    <div className="mt-3 rounded-lg border border-[var(--accent-danger)]/30 bg-[var(--accent-danger)]/5 p-4">
                      <p className="mb-3 text-sm text-[var(--text-primary)]">
                        Er du sikker på at du vil fjerne denne kontoen? Alle transaksjoner fra denne kontoen vil bli slettet.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmRemoveId(null)}
                        >
                          Avbryt
                        </Button>
                        <button
                          onClick={async () => {
                            setRemovingAccount(account.id);
                            try {
                              const res = await fetch(
                                `/api/bank/tink/disconnect?account_id=${account.id}`,
                                { method: "DELETE" }
                              );
                              if (!res.ok) throw new Error("feil");
                              setStatusMsg({ text: "Konto fjernet.", ok: true });
                              setConfirmRemoveId(null);
                              await loadAccounts();
                              setTransactions({});
                            } catch {
                              setStatusMsg({ text: "Kunne ikke fjerne kontoen.", ok: false });
                            } finally {
                              setRemovingAccount(null);
                            }
                          }}
                          disabled={removingAccount === account.id}
                          className="flex items-center gap-2 rounded-lg bg-[var(--accent-danger)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-danger)]/80 disabled:opacity-50"
                        >
                          {removingAccount === account.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Fjern konto
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Transactions table */}
                {isExpanded && !isLoadingTxns && (
                  <div className="border-t border-[var(--border-primary)]">
                    {txns.length === 0 ? (
                      <p className="p-4 text-center text-sm text-[var(--text-muted)]">
                        Ingen transaksjoner funnet for denne kontoen.
                      </p>
                    ) : (
                      <div className="divide-y divide-[var(--border-primary)]">
                        {txns.map((txn) => {
                          const isExpense = txn.amount < 0;
                          return (
                            <div
                              key={txn.id}
                              className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-card-hover)]"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                                    isExpense
                                      ? "bg-[var(--accent-danger)]/10"
                                      : "bg-[var(--accent-success)]/10"
                                  }`}
                                >
                                  {isExpense ? (
                                    <ArrowDownLeft className="h-4 w-4 text-[var(--accent-danger)]" />
                                  ) : (
                                    <ArrowUpRight className="h-4 w-4 text-[var(--accent-success)]" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-[var(--text-primary)]">
                                    {txn.description || "Ukjent transaksjon"}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs text-[var(--text-muted)]">
                                      {formatDate(txn.date)}
                                    </p>
                                    {txn.category && (
                                      <Badge variant="primary" className="text-xs">
                                        {txn.category}
                                      </Badge>
                                    )}
                                    {txn.status && txn.status !== "BOOKED" && (
                                      <Badge variant="warning" className="text-xs">
                                        {txn.status}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <p
                                className={`flex-shrink-0 font-semibold ${
                                  isExpense
                                    ? "text-[var(--accent-danger)]"
                                    : "text-[var(--accent-success)]"
                                }`}
                              >
                                {isExpense ? "" : "+"}
                                {formatCurrency(txn.amount)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
