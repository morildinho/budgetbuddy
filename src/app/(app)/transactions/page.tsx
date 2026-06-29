"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Link2,
  Link2Off,
  Loader2,
  RefreshCw,
  Search,
  Target,
  Unplug,
  Wallet,
} from "lucide-react";
import { getMerchantInfoWithIcons } from "@/lib/merchants";
import { useBankConnection } from "@/hooks/useBankConnection";
import { useBankTransactions, useBankAccounts } from "@/hooks/useBankTransactions";
import { useBudget } from "@/hooks/useBudgets";
import { useMerchantIcons } from "@/hooks/useMerchantIcons";
import { useReceipts } from "@/hooks/useReceipts";
import type { Receipt, BudgetEntryType } from "@/types/database";

function getMonthRange(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

const MONTHS = [
  "Januar", "Februar", "Mars", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Desember",
];

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [budgetLinkingId, setBudgetLinkingId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedAccount, setSelectedAccount] = useState<string>("all");

  const { startDate, endDate } = getMonthRange(currentMonth);

  const {
    connection,
    loading: connectionLoading,
    isConnected,
    isExpired,
    connect,
    disconnect,
    syncTransactions,
    syncing,
    error: connectionError,
  } = useBankConnection();

  const {
    transactions,
    loading: txnLoading,
    error: txnError,
    fetchTransactions,
    linkReceipt,
    unlinkReceipt,
    linkBudgetEntry,
    unlinkBudgetEntry,
    stats,
  } = useBankTransactions({
    startDate,
    endDate,
    accountId: selectedAccount === "all" ? undefined : selectedAccount,
  });

  const { accounts } = useBankAccounts();
  const { icons: merchantIcons } = useMerchantIcons();
  const { receipts: allReceipts } = useReceipts();

  // Budget entries for the current month (for linking)
  const { entries: budgetEntries } = useBudget({
    month: `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-01`,
  });

  // Handle URL params from callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let message: string | null = null;
    if (params.get("connected") === "true") {
      message = "Bankkonto tilkoblet! Du kan nå synkronisere transaksjoner.";
    }
    const error = params.get("error");
    if (error) {
      const errorMessages: Record<string, string> = {
        bank_auth_denied: "Banktilkobling ble avvist.",
        no_auth_code: "Ingen autorisasjonskode mottatt.",
        config_error: "Konfigurasjonsfeil. Sjekk miljøvariabler.",
        token_exchange_failed: "Kunne ikke fullføre tilkobling.",
        storage_failed: "Kunne ikke lagre tilkoblingsinformasjon.",
        callback_failed: "Noe gikk galt under tilkobling.",
      };
      message = errorMessages[error] || "En feil oppstod.";
    }
    if (message) {
      window.setTimeout(() => setSyncMessage(message), 0);
      window.history.replaceState({}, "", "/transactions");
    }
  }, []);

  const currentYear = currentMonth.getFullYear();
  const currentMonthIndex = currentMonth.getMonth();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handleSync = async () => {
    setSyncMessage(null);
    const result = await syncTransactions();
    if (result) {
      setSyncMessage(
        `Synkronisering fullført: ${result.imported} nye, ${result.skipped} hoppet over av ${result.total} totalt.`
      );
      fetchTransactions();
    }
  };

  const handleLinkReceipt = async (transactionId: string, receipt: Receipt) => {
    await linkReceipt(transactionId, receipt.id);
    setLinkingId(null);
  };

  const handleUnlinkReceipt = async (transactionId: string) => {
    await unlinkReceipt(transactionId);
  };

  const handleLinkBudgetEntry = async (transactionId: string, budgetEntryId: string) => {
    await linkBudgetEntry(transactionId, budgetEntryId);
    setBudgetLinkingId(null);
  };

  const handleUnlinkBudgetEntry = async (transactionId: string) => {
    await unlinkBudgetEntry(transactionId);
  };

  // Group budget entries by type for the linking panel
  const ENTRY_TYPE_LABELS: Record<BudgetEntryType, string> = {
    income: "Inntekter",
    fixed_expense: "Faste utgifter",
    variable_expense: "Variable utgifter",
    loan: "Lån",
  };

  const groupedBudgetEntries = useMemo(() => {
    const groups: Partial<Record<BudgetEntryType, typeof budgetEntries>> = {};
    for (const entry of budgetEntries) {
      if (!groups[entry.entry_type]) groups[entry.entry_type] = [];
      groups[entry.entry_type]!.push(entry);
    }
    return groups;
  }, [budgetEntries]);

  const filteredTransactions = transactions.filter(
    (txn) =>
      txn.description.toLowerCase().includes(search.toLowerCase()) ||
      (txn.category?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  // Group transactions by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof filteredTransactions> = {};
    for (const txn of filteredTransactions) {
      const dateKey = txn.date;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(txn);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredTransactions]);

  // Find potential receipt matches for a transaction
  const findMatchingReceipts = (txn: { date: string; amount: number }) => {
    return allReceipts.filter((receipt) => {
      const txnDate = new Date(txn.date);
      const receiptDate = new Date(receipt.receipt_date);
      const dayDiff = Math.abs(txnDate.getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24);
      const amountMatch = Math.abs(Math.abs(txn.amount) - Number(receipt.total_amount)) < 1;
      return dayDiff <= 3 && amountMatch;
    });
  };

  const loading = connectionLoading || txnLoading;

  if (loading && transactions.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] lg:text-3xl">
            Transaksjoner
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {isConnected
              ? `Koblet til ${connection?.bank_name || "SpareBank 1"}`
              : "Koble til banken din for å importere transaksjoner"}
          </p>
        </div>
        <div className="flex gap-2">
          {isConnected && (
            <>
              <Button
                variant="primary"
                onClick={handleSync}
                isLoading={syncing}
                disabled={syncing}
              >
                <RefreshCw className="h-4 w-4" />
                Synkroniser
              </Button>
              <Button variant="outline" onClick={disconnect}>
                <Unplug className="h-4 w-4" />
              </Button>
            </>
          )}
          {!isConnected && (
            <Button variant="primary" onClick={connect}>
              <Landmark className="h-4 w-4" />
              Koble til SpareBank 1
            </Button>
          )}
        </div>
      </div>

      {/* Status messages */}
      {(syncMessage || connectionError || txnError) && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${
          connectionError || txnError
            ? "bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]"
            : "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
        }`}>
          {syncMessage || connectionError || txnError}
        </div>
      )}

      {/* Connection expired banner */}
      {isExpired && (
        <div className="mb-4 rounded-lg bg-[var(--accent-warning)]/10 p-4 text-sm text-[var(--accent-warning)]">
          <p className="font-medium">Banktilkobling utløpt</p>
          <p>Du må koble til på nytt med BankID for å synkronisere transaksjoner.</p>
          <Button variant="outline" size="sm" onClick={connect} className="mt-2">
            Koble til på nytt
          </Button>
        </div>
      )}

      {/* Filters: Account, Month, Year */}
      <div className="mb-4 flex flex-wrap gap-2">
        {accounts.length > 0 && (
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          >
            <option value="all">Alle kontoer</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
                {account.accountNumber ? ` (…${account.accountNumber.slice(-4)})` : ""}
              </option>
            ))}
          </select>
        )}
        <select
          value={currentMonthIndex}
          onChange={(e) => setCurrentMonth(new Date(currentYear, parseInt(e.target.value), 1))}
          className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
        >
          {MONTHS.map((name, i) => (
            <option key={i} value={i}>{name}</option>
          ))}
        </select>
        <select
          value={currentYear}
          onChange={(e) => setCurrentMonth(new Date(parseInt(e.target.value), currentMonthIndex, 1))}
          className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <button
          onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-2 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-2 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      {transactions.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            title="Utgifter"
            value={formatCurrency(stats.totalExpenses)}
            icon={<ArrowDownLeft className="h-5 w-5 text-[var(--accent-danger)]" />}
          />
          <StatCard
            title="Inntekter"
            value={formatCurrency(stats.totalIncome)}
            icon={<ArrowUpRight className="h-5 w-5 text-[var(--accent-success)]" />}
          />
          <StatCard
            title="Transaksjoner"
            value={stats.transactionCount}
            icon={<Wallet className="h-5 w-5 text-[var(--accent-primary)]" />}
          />
          <StatCard
            title="Koblet til kvittering"
            value={`${stats.matchedCount} / ${stats.transactionCount}`}
            icon={<Link2 className="h-5 w-5 text-[var(--accent-primary)]" />}
          />
        </div>
      )}

      {/* Search */}
      {transactions.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            type="search"
            placeholder="Søk etter beskrivelse eller kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Last synced info */}
      {connection?.last_synced_at && (
        <p className="mb-4 text-xs text-[var(--text-muted)]">
          Sist synkronisert: {formatDate(connection.last_synced_at)}
        </p>
      )}

      {/* Transaction List */}
      {!isConnected && transactions.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Ingen banktilkobling"
          description="Koble til SpareBank 1 med BankID for å importere transaksjoner automatisk."
          action={{
            label: "Koble til bank",
            onClick: connect,
          }}
        />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Ingen transaksjoner denne måneden"
          description="Prøv en annen måned eller synkroniser for å hente nye transaksjoner."
        />
      ) : filteredTransactions.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Ingen treff"
          description="Prøv å justere søkeordene."
        />
      ) : (
        <div className="space-y-4">
          {groupedByDate.map(([dateKey, txns]) => (
            <div key={dateKey}>
              {/* Date header */}
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  {formatDate(dateKey)}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {formatCurrency(
                    txns.reduce((sum, t) => sum + Number(t.amount), 0)
                  )}
                </p>
              </div>

              <Card>
                <div className="divide-y divide-[var(--border-primary)]">
                  {txns.map((txn) => {
                    const isExpense = txn.amount < 0;
                    const matchingReceipts = findMatchingReceipts(txn);
                    const isLinking = linkingId === txn.id;
                    const isBudgetLinking = budgetLinkingId === txn.id;

                    return (
                      <div key={txn.id} className="px-3 py-2 lg:px-4 lg:py-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {(() => {
                              const merchant = getMerchantInfoWithIcons(txn.description, merchantIcons);
                              return merchant.logo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={merchant.logo}
                                  alt={merchant.name}
                                  className="h-8 w-8 flex-shrink-0 rounded-lg border border-[var(--border-primary)] object-contain"
                                />
                              ) : (
                                <div
                                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                                  style={{ backgroundColor: merchant.bg, color: merchant.text }}
                                  title={merchant.name}
                                >
                                  {merchant.initials}
                                </div>
                              );
                            })()}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-[var(--text-primary)]">
                                {txn.description}
                              </p>
                              <div className="flex items-center gap-2">
                                {txn.receipt_id && (
                                  <Badge variant="success">Kvittering</Badge>
                                )}
                                {txn.budget_entry_id && (
                                  <Badge variant="primary">Budsjett</Badge>
                                )}
                                {txn.category && (
                                  <Badge variant="primary">{txn.category.name}</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p
                              className={`font-semibold ${
                                isExpense
                                  ? "text-[var(--accent-danger)]"
                                  : "text-[var(--accent-success)]"
                              }`}
                            >
                              {isExpense ? "" : "+"}
                              {formatCurrency(Number(txn.amount))}
                            </p>
                            <div className="mt-1 flex justify-end gap-1">
                              {txn.receipt_id ? (
                                <button
                                  onClick={() => handleUnlinkReceipt(txn.id)}
                                  className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent-danger)]"
                                  title="Fjern kvitteringskobling"
                                >
                                  <Link2Off className="h-3 w-3" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => { setLinkingId(isLinking ? null : txn.id); setBudgetLinkingId(null); }}
                                  className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
                                  title="Koble til kvittering"
                                >
                                  <Link2 className="h-3 w-3" />
                                </button>
                              )}
                              {txn.budget_entry_id ? (
                                <button
                                  onClick={() => handleUnlinkBudgetEntry(txn.id)}
                                  className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent-danger)]"
                                  title="Fjern budsjettkobling"
                                >
                                  <Target className="h-3 w-3" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => { setBudgetLinkingId(isBudgetLinking ? null : txn.id); setLinkingId(null); }}
                                  className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
                                  title="Koble til budsjettpost"
                                >
                                  <Target className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Receipt matching panel */}
                        {isLinking && (
                          <div className="mt-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-3">
                            <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                              Koble til kvittering
                            </p>
                            {matchingReceipts.length > 0 && (
                              <div className="mb-2">
                                <p className="mb-1 text-xs text-[var(--accent-success)]">
                                  Mulige treff:
                                </p>
                                {matchingReceipts.map((receipt) => (
                                  <button
                                    key={receipt.id}
                                    onClick={() => handleLinkReceipt(txn.id, receipt)}
                                    className="mb-1 flex w-full items-center justify-between rounded-md border border-[var(--accent-success)]/30 bg-[var(--accent-success)]/5 p-2 text-left text-sm transition-colors hover:bg-[var(--accent-success)]/10"
                                  >
                                    <span className="text-[var(--text-primary)]">
                                      {receipt.merchant} — {formatDate(receipt.receipt_date)}
                                    </span>
                                    <span className="font-medium text-[var(--text-primary)]">
                                      {formatCurrency(Number(receipt.total_amount))}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                            {allReceipts.length > matchingReceipts.length && (
                              <details className="text-sm">
                                <summary className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                                  Vis alle kvitteringer ({allReceipts.length})
                                </summary>
                                <div className="mt-2 max-h-48 overflow-y-auto">
                                  {allReceipts
                                    .filter((r) => !matchingReceipts.find((m) => m.id === r.id))
                                    .map((receipt) => (
                                      <button
                                        key={receipt.id}
                                        onClick={() => handleLinkReceipt(txn.id, receipt)}
                                        className="mb-1 flex w-full items-center justify-between rounded-md p-2 text-left text-sm transition-colors hover:bg-[var(--bg-card-hover)]"
                                      >
                                        <span className="text-[var(--text-secondary)]">
                                          {receipt.merchant} — {formatDate(receipt.receipt_date)}
                                        </span>
                                        <span className="text-[var(--text-muted)]">
                                          {formatCurrency(Number(receipt.total_amount))}
                                        </span>
                                      </button>
                                    ))}
                                </div>
                              </details>
                            )}
                            <button
                              onClick={() => setLinkingId(null)}
                              className="mt-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                            >
                              Avbryt
                            </button>
                          </div>
                        )}

                        {/* Budget entry linking panel */}
                        {isBudgetLinking && (
                          <div className="mt-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-3">
                            <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                              Koble til budsjettpost
                            </p>
                            {budgetEntries.length === 0 ? (
                              <p className="text-xs text-[var(--text-muted)]">
                                Ingen budsjettposter for denne måneden. Opprett et budsjett først.
                              </p>
                            ) : (
                              <div className="max-h-48 overflow-y-auto space-y-2">
                                {(Object.entries(groupedBudgetEntries) as [BudgetEntryType, typeof budgetEntries][]).map(
                                  ([type, entries]) => (
                                    <div key={type}>
                                      <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">
                                        {ENTRY_TYPE_LABELS[type]}
                                      </p>
                                      {entries.map((entry) => (
                                        <button
                                          key={entry.id}
                                          onClick={() => handleLinkBudgetEntry(txn.id, entry.id)}
                                          className="mb-1 flex w-full items-center justify-between rounded-md p-2 text-left text-sm transition-colors hover:bg-[var(--bg-card-hover)]"
                                        >
                                          <span className="text-[var(--text-primary)]">
                                            {entry.description}
                                          </span>
                                          <span className="text-[var(--text-muted)]">
                                            {formatCurrency(Number(entry.amount))}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                            <button
                              onClick={() => setBudgetLinkingId(null)}
                              className="mt-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                            >
                              Avbryt
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
