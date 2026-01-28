"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Receipt, Search, Loader2, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useReceipts } from "@/hooks/useReceipts";

export default function ReceiptsPage() {
  const [search, setSearch] = useState("");
  const { receipts, loading, error } = useReceipts();

  const filteredReceipts = receipts.filter(
    (receipt) =>
      receipt.merchant.toLowerCase().includes(search.toLowerCase()) ||
      (receipt.category?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
        <p className="text-[var(--accent-danger)]">Feil ved lasting av kvitteringer: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] lg:text-3xl">Kvitteringer</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {receipts.length} kvittering{receipts.length !== 1 ? "er" : ""} registrert
          </p>
        </div>
        <Link href="/add">
          <Button>
            <PlusCircle className="h-4 w-4" />
            Legg til
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <Input
          type="search"
          placeholder="Søk etter butikk eller kategori..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Receipt List */}
      {filteredReceipts.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Ingen kvitteringer funnet"
          description={
            search
              ? "Prøv å justere søkeordene"
              : "Legg til din første kvittering for å komme i gang"
          }
          action={
            !search
              ? {
                  label: "Legg til kvittering",
                  onClick: () => (window.location.href = "/add"),
                }
              : undefined
          }
        />
      ) : (
        <Card>
          <div className="divide-y divide-[var(--border-primary)]">
            {filteredReceipts.map((receipt) => (
              <Link
                key={receipt.id}
                href={`/receipts/${receipt.id}`}
                className="flex items-center justify-between p-3 transition-colors hover:bg-[var(--bg-card-hover)] lg:p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10">
                    <Receipt className="h-5 w-5 text-[var(--accent-primary)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      {receipt.merchant}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {formatDate(receipt.receipt_date)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[var(--text-primary)]">
                    {formatCurrency(Number(receipt.total_amount))}
                  </p>
                  <p className="text-xs text-[var(--accent-primary)]">
                    {receipt.category?.name || "Ukategorisert"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
