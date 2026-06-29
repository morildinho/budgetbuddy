"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Plus, RefreshCw, Trash2, Bitcoin, BarChart2 } from "lucide-react";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { usePortfolio, AssetWithMetrics } from "@/hooks/usePortfolio";
import { cn } from "@/lib/utils";

type AssetType = "crypto" | "stock";
type TabType = "crypto" | "stock";

function formatCurrency(value: number | null, currency = "USD"): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatQuantity(value: number): string {
  return parseFloat(value.toFixed(8)).toString();
}

function ChangeBadge({ change }: { change: number | null }) {
  if (change == null) return <span className="text-[var(--text-muted)] text-xs">—</span>;
  const positive = change >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
        positive
          ? "bg-[var(--accent-success)]/15 text-[var(--accent-success)]"
          : "bg-[var(--accent-danger)]/15 text-[var(--accent-danger)]"
      )}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(change).toFixed(2)}%
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[var(--border-primary)]">
      {[...Array(8)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 animate-pulse rounded bg-[var(--bg-secondary)]" />
        </td>
      ))}
    </tr>
  );
}

function AssetTable({
  assets,
  onDelete,
  loading,
}: {
  assets: AssetWithMetrics[];
  onDelete: (id: string) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-primary)] text-left text-xs text-[var(--text-muted)]">
              <th className="px-4 py-3 font-medium">Symbol / Navn</th>
              <th className="px-4 py-3 font-medium">Antall</th>
              <th className="px-4 py-3 font-medium">Kjøpspris</th>
              <th className="px-4 py-3 font-medium">Nåværende pris</th>
              <th className="px-4 py-3 font-medium">Totalverdi</th>
              <th className="px-4 py-3 font-medium">Gevinst/Tap</th>
              <th className="px-4 py-3 font-medium">24t</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
          </tbody>
        </table>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BarChart2 className="mb-4 h-12 w-12 text-[var(--text-muted)]" />
        <p className="text-[var(--text-secondary)]">Ingen eiendeler enda</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Klikk &quot;Legg til&quot; for å legge til din første investering
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-primary)] text-left text-xs text-[var(--text-muted)]">
            <th className="px-4 py-3 font-medium">Symbol / Navn</th>
            <th className="px-4 py-3 font-medium">Antall</th>
            <th className="px-4 py-3 font-medium">Kjøpspris</th>
            <th className="px-4 py-3 font-medium">Nåværende pris</th>
            <th className="px-4 py-3 font-medium">Totalverdi</th>
            <th className="px-4 py-3 font-medium">Gevinst/Tap</th>
            <th className="px-4 py-3 font-medium">24t</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const glPositive = asset.gainLoss != null && asset.gainLoss >= 0;
            return (
              <tr
                key={asset.id}
                className="border-b border-[var(--border-primary)] transition-colors hover:bg-[var(--bg-card)]/50"
              >
                <td className="px-4 py-3">
                  <div className="font-semibold text-[var(--text-primary)]">{asset.symbol}</div>
                  <div className="text-xs text-[var(--text-muted)]">{asset.name}</div>
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {formatQuantity(Number(asset.quantity))}
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {asset.purchase_price
                    ? formatCurrency(Number(asset.purchase_price), asset.currency)
                    : <span className="text-[var(--text-muted)]">—</span>}
                </td>
                <td className="px-4 py-3 text-[var(--text-primary)]">
                  {asset.currentPrice != null ? (
                    <div>
                      <div>{formatCurrency(asset.currentPrice, asset.currency)}</div>
                      {asset.currentPriceNok != null && asset.currency !== "NOK" && (
                        <div className="text-xs text-[var(--text-muted)]">
                          {formatCurrency(asset.currentPriceNok, "NOK")}
                        </div>
                      )}
                    </div>
                  ) : <span className="text-[var(--text-muted)] text-xs">Laster...</span>}
                </td>
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                  {asset.currentValue != null ? (
                    <div>
                      <div>{formatCurrency(asset.currentValue, asset.currency)}</div>
                      {asset.currentValueNok != null && asset.currency !== "NOK" && (
                        <div className="text-xs text-[var(--text-muted)]">
                          {formatCurrency(asset.currentValueNok, "NOK")}
                        </div>
                      )}
                    </div>
                  ) : <span className="text-[var(--text-muted)]">—</span>}
                </td>
                <td className="px-4 py-3">
                  {asset.gainLoss != null ? (
                    <div className={cn(
                      "font-medium text-sm",
                      glPositive ? "text-[var(--accent-success)]" : "text-[var(--accent-danger)]"
                    )}>
                      {glPositive ? "+" : ""}{formatCurrency(asset.gainLoss, asset.currency)}
                      {asset.gainLossPercent != null && (
                        <div className="text-xs font-normal">
                          {glPositive ? "+" : ""}{asset.gainLossPercent.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <ChangeBadge change={asset.change24h} />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onDelete(asset.id)}
                    className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-danger)]/10 hover:text-[var(--accent-danger)]"
                    title="Slett"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function PortfolioPage() {
  const { assets, loading, lastUpdated, addAsset, deleteAsset, refresh } = usePortfolio();
  const [activeTab, setActiveTab] = useState<TabType>("crypto");
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);

  const [form, setForm] = useState({
    type: "crypto" as AssetType,
    symbol: "",
    name: "",
    quantity: "",
    purchase_price: "",
    currency: "USD",
  });

  const cryptoAssets = assets.filter((a) => a.asset_type === "crypto");
  const stockAssets = assets.filter((a) => a.asset_type === "stock");
  const displayedAssets = activeTab === "crypto" ? cryptoAssets : stockAssets;

  // Summary stats
  const totalValue = assets.reduce((sum, a) => {
    return sum + (a.currentValueNok ?? a.currentValue ?? 0);
  }, 0);

  const totalGainLoss = assets.reduce((sum, a) => sum + (a.gainLoss ?? 0), 0);
  const hasGainLossData = assets.some((a) => a.gainLoss != null);

  const handleAdd = async () => {
    if (!form.symbol || !form.name || !form.quantity) return;
    setAdding(true);
    const success = await addAsset({
      symbol: form.symbol.toUpperCase(),
      name: form.name,
      asset_type: form.type,
      quantity: parseFloat(form.quantity),
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      currency: form.currency,
    });
    setAdding(false);
    if (success) {
      setShowAddModal(false);
      setForm({ type: "crypto", symbol: "", name: "", quantity: "", purchase_price: "", currency: "USD" });
    }
  };

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] lg:text-3xl">Portefølje</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {lastUpdated
              ? `Sist oppdatert: ${lastUpdated.toLocaleTimeString("nb-NO")}`
              : "Henter priser..."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Oppdater
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            Legg til
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total verdi"
          value={loading ? "..." : formatCurrency(totalValue, assets.some(a => a.currentValueNok != null) ? "NOK" : "USD")}
          icon={<TrendingUp className="h-5 w-5 text-[var(--accent-primary)]" />}
        />
        <StatCard
          title="Gevinst/Tap"
          value={
            loading
              ? "..."
              : hasGainLossData
              ? formatCurrency(totalGainLoss, "USD")
              : "—"
          }
          changeType={hasGainLossData ? (totalGainLoss >= 0 ? "positive" : "negative") : "neutral"}
          change={!hasGainLossData ? "Legg til kjøpspris for å se" : undefined}
          icon={
            totalGainLoss >= 0
              ? <TrendingUp className="h-5 w-5 text-[var(--accent-success)]" />
              : <TrendingDown className="h-5 w-5 text-[var(--accent-danger)]" />
          }
        />
        <StatCard
          title="Antall eiendeler"
          value={loading ? "..." : String(assets.length)}
          change={`${cryptoAssets.length} krypto · ${stockAssets.length} aksjer`}
          icon={<BarChart2 className="h-5 w-5 text-[var(--accent-primary)]" />}
        />
      </div>

      {/* Tabs + Table */}
      <Card>
        <div className="border-b border-[var(--border-primary)] px-4">
          <div className="flex gap-1">
            {(["crypto", "stock"] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === tab
                    ? "border-[var(--accent-primary)] text-[var(--accent-primary)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
              >
                {tab === "crypto" ? <Bitcoin className="h-4 w-4" /> : <BarChart2 className="h-4 w-4" />}
                {tab === "crypto" ? "Krypto" : "Aksjer"}
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs",
                  activeTab === tab
                    ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]"
                    : "bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                )}>
                  {tab === "crypto" ? cryptoAssets.length : stockAssets.length}
                </span>
              </button>
            ))}
          </div>
        </div>
        <AssetTable assets={displayedAssets} onDelete={deleteAsset} loading={loading} />
      </Card>

      {/* Add Asset Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Legg til investering">
        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["crypto", "stock"] as AssetType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setForm((f) => ({ ...f, type }))}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all",
                    form.type === type
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                      : "border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/50"
                  )}
                >
                  {type === "crypto" ? <Bitcoin className="h-4 w-4" /> : <BarChart2 className="h-4 w-4" />}
                  {type === "crypto" ? "Krypto" : "Aksje"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Symbol"
              placeholder={form.type === "crypto" ? "BTC" : "AAPL"}
              value={form.symbol}
              onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))}
            />
            <Input
              label="Navn"
              placeholder={form.type === "crypto" ? "Bitcoin" : "Apple Inc."}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <Input
            label="Antall"
            type="number"
            placeholder="0.00"
            step="any"
            min="0"
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Kjøpspris (valgfritt)"
              type="number"
              placeholder="0.00"
              step="any"
              min="0"
              value={form.purchase_price}
              onChange={(e) => setForm((f) => ({ ...f, purchase_price: e.target.value }))}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Valuta</label>
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              >
                <option value="USD">USD</option>
                <option value="NOK">NOK</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {form.type === "stock" && (
            <p className="text-xs text-[var(--text-muted)]">
              Tips: Bruk <span className="text-[var(--accent-primary)]">.OL</span> for Oslo Børs (f.eks. EQNR.OL)
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Avbryt
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!form.symbol || !form.name || !form.quantity || adding}
              isLoading={adding}
            >
              Lagre
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
