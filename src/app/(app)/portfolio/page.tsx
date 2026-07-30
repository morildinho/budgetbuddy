"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Plus, RefreshCw, Trash2, Bitcoin, BarChart2, Banknote, Pencil, MessageSquare } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardBody, CardHeader, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { usePortfolio, AssetWithMetrics } from "@/hooks/usePortfolio";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

type AssetType = "crypto" | "stock" | "cash";

const ALLOCATION_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ec4899", "#06b6d4", "#8b5cf6", "#f97316", "#84cc16", "#e11d48", "#14b8a6"];

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  crypto: "Krypto",
  stock: "Aksje",
  cash: "Kontanter",
};

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

function TypeBadge({ type }: { type: AssetType }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        type === "crypto" && "bg-violet-500/15 text-violet-400",
        type === "stock" && "bg-sky-500/15 text-sky-400",
        type === "cash" && "bg-emerald-500/15 text-emerald-400"
      )}
    >
      {ASSET_TYPE_LABELS[type]}
    </span>
  );
}

function AllocationChart({ assets, loading }: { assets: AssetWithMetrics[]; loading: boolean }) {
  const allocation = assets
    .map((asset) => ({
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      type: asset.asset_type,
      value: asset.currentValueNok ?? (asset.currency === "NOK" ? asset.currentValue : null),
    }))
    .filter((item): item is typeof item & { value: number } => item.value != null && item.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = allocation.reduce((sum, item) => sum + item.value, 0);
  const chartData = allocation.map((item, index) => ({
    ...item,
    color: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length],
    percentage: total > 0 ? (item.value / total) * 100 : 0,
  }));

  return (
    <Card className="mb-8">
      <CardHeader>
        <div>
          <h2 className="font-semibold text-[var(--text-primary)]">Porteføljefordeling</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Andel av total markedsverdi i NOK</p>
        </div>
      </CardHeader>
      <CardBody>
        {loading ? (
          <div className="grid min-h-72 animate-pulse gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)]">
            <div className="mx-auto h-64 w-64 rounded-full bg-[var(--bg-secondary)]" />
            <div className="space-y-3 py-4">
              {[...Array(4)].map((_, index) => <div key={index} className="h-10 rounded bg-[var(--bg-secondary)]" />)}
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="py-12 text-center">
            <BarChart2 className="mx-auto mb-3 h-10 w-10 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-secondary)]">Ingen markedsverdier å vise ennå</p>
          </div>
        ) : (
          <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)]">
            <div
              className="relative h-72 min-w-0"
              role="img"
              aria-label={`Sektordiagram over ${chartData.length} beholdninger med totalverdi ${formatCurrency(total, "NOK")}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="symbol"
                    cx="50%"
                    cy="50%"
                    innerRadius="56%"
                    outerRadius="82%"
                    paddingAngle={2}
                    stroke="var(--bg-card)"
                    strokeWidth={2}
                  >
                    {chartData.map((item) => <Cell key={item.id} fill={item.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value), "NOK")}
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-primary)",
                      borderRadius: "0.75rem",
                      color: "var(--text-primary)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-[var(--text-muted)]">Totalt</span>
                <span className="mt-1 text-lg font-bold text-[var(--text-primary)]">{formatCurrency(total, "NOK")}</span>
              </div>
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1" role="list" aria-label="Porteføljefordeling i tekst">
              {chartData.map((item) => (
                <div
                  key={item.id}
                  role="listitem"
                  className="flex items-center gap-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]/50 px-3 py-2"
                >
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-[var(--text-primary)]">{item.symbol}</span>
                      <span className="shrink-0 text-sm font-semibold text-[var(--text-primary)]">{item.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
                      <span className="truncate">{item.name} · {ASSET_TYPE_LABELS[item.type]}</span>
                      <span className="shrink-0">{formatCurrency(item.value, "NOK")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[var(--border-primary)]">
      {[...Array(9)].map((_, i) => (
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
  onEdit,
  loading,
  readOnly,
}: {
  assets: AssetWithMetrics[];
  onDelete: (id: string) => void;
  onEdit: (asset: AssetWithMetrics) => void;
  loading: boolean;
  readOnly: boolean;
}) {
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-primary)] text-left text-xs text-[var(--text-muted)]">
              <th className="px-4 py-3 font-medium">Symbol / Navn</th>
              <th className="px-4 py-3 font-medium">Type</th>
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
            <th className="px-4 py-3 font-medium">Type</th>
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
            const glPositive = asset.gainLossNok != null && asset.gainLossNok > 0;
            const glNegative = asset.gainLossNok != null && asset.gainLossNok < 0;
            return (
              <tr
                key={asset.id}
                className="border-b border-[var(--border-primary)] transition-colors hover:bg-[var(--bg-card)]/50"
              >
                <td className="px-4 py-3">
                  <div className="font-semibold text-[var(--text-primary)]">{asset.symbol}</div>
                  <div className="text-xs text-[var(--text-muted)]">{asset.name}</div>
                  {asset.notes && (
                    <div className="mt-1 flex max-w-xs items-start gap-1 text-xs text-[var(--accent-primary)]">
                      <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="line-clamp-2">{asset.notes}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <TypeBadge type={asset.asset_type} />
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
                  {asset.gainLossNok != null ? (
                    <div className={cn(
                      "font-medium text-sm",
                      glPositive && "text-[var(--accent-success)]",
                      glNegative && "text-[var(--accent-danger)]",
                      !glPositive && !glNegative && "text-[var(--text-secondary)]"
                    )}>
                      {glPositive ? "+" : ""}{formatCurrency(asset.gainLossNok, "NOK")}
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
                  {!readOnly && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEdit(asset)}
                        className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)]"
                        title="Rediger notat"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(asset.id)}
                        className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-danger)]/10 hover:text-[var(--accent-danger)]"
                        title="Slett"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
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
  const { isOwner } = usePermissions();
  const { assets, loading, lastUpdated, addAsset, updateAsset, deleteAsset, refresh } = usePortfolio();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetWithMetrics | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const [form, setForm] = useState({
    type: "crypto" as AssetType,
    symbol: "",
    name: "",
    quantity: "",
    purchase_price: "",
    currency: "USD",
    notes: "",
  });

  const cryptoAssets = assets.filter((a) => a.asset_type === "crypto");
  const stockAssets = assets.filter((a) => a.asset_type === "stock");
  const cashAssets = assets.filter((a) => a.asset_type === "cash");

  // Summary stats in NOK. Never add unconverted values from mixed currencies.
  const totalValue = assets.reduce((sum, asset) => {
    const valueNok = asset.currentValueNok ?? (asset.currency === "NOK" ? asset.currentValue : null);
    return sum + (valueNok ?? 0);
  }, 0);

  const totalGainLoss = assets.reduce((sum, asset) => sum + (asset.gainLossNok ?? 0), 0);
  const hasGainLossData = assets.some((asset) => asset.gainLossNok != null);

  const handleAdd = async () => {
    const isCash = form.type === "cash";
    const symbol = isCash ? "NOK" : form.symbol.toUpperCase();
    const name = isCash ? (form.name.trim() || "Kontanter") : form.name.trim();
    if (!symbol || !name || !form.quantity) return;
    setAdding(true);
    const success = await addAsset({
      symbol,
      name,
      asset_type: form.type,
      quantity: parseFloat(form.quantity),
      purchase_price: isCash ? null : form.purchase_price ? parseFloat(form.purchase_price) : null,
      currency: isCash ? "NOK" : form.currency,
      notes: form.notes.trim() || undefined,
    });
    setAdding(false);
    if (success) {
      setShowAddModal(false);
      setForm({ type: "crypto", symbol: "", name: "", quantity: "", purchase_price: "", currency: "USD", notes: "" });
    }
  };

  const openEditNotes = (asset: AssetWithMetrics) => {
    setEditingAsset(asset);
    setEditNotes(asset.notes || "");
  };

  const saveNotes = async () => {
    if (!editingAsset) return;
    setSavingNotes(true);
    const success = await updateAsset(editingAsset.id, { notes: editNotes.trim() || null });
    setSavingNotes(false);
    if (success) setEditingAsset(null);
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
          {isOwner && (
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" />
              Legg til
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total verdi"
          value={loading ? "..." : formatCurrency(totalValue, "NOK")}
          icon={<TrendingUp className="h-5 w-5 text-[var(--accent-primary)]" />}
        />
        <StatCard
          title="Gevinst/Tap"
          value={
            loading
              ? "..."
              : hasGainLossData
              ? formatCurrency(totalGainLoss, "NOK")
              : "—"
          }
          valueClassName={cn(
            hasGainLossData && totalGainLoss > 0 && "text-[var(--accent-success)]",
            hasGainLossData && totalGainLoss < 0 && "text-[var(--accent-danger)]",
            hasGainLossData && totalGainLoss === 0 && "text-[var(--text-secondary)]"
          )}
          changeType={hasGainLossData ? (totalGainLoss > 0 ? "positive" : totalGainLoss < 0 ? "negative" : "neutral") : "neutral"}
          change={!hasGainLossData ? "Legg til kjøpspris for å se" : undefined}
          icon={
            totalGainLoss > 0
              ? <TrendingUp className="h-5 w-5 text-[var(--accent-success)]" />
              : totalGainLoss < 0
                ? <TrendingDown className="h-5 w-5 text-[var(--accent-danger)]" />
                : <BarChart2 className="h-5 w-5 text-[var(--text-muted)]" />
          }
        />
        <StatCard
          title="Antall eiendeler"
          value={loading ? "..." : String(assets.length)}
          change={`${cryptoAssets.length} krypto · ${stockAssets.length} aksjer · ${cashAssets.length} kontant`}
          icon={<BarChart2 className="h-5 w-5 text-[var(--accent-primary)]" />}
        />
      </div>

      <AllocationChart assets={assets} loading={loading} />

      {/* Combined holdings table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">Beholdning</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Alle aksjer, kryptovalutaer og kontanter i én liste
              </p>
            </div>
            <span className="rounded-full bg-[var(--bg-secondary)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
              {assets.length} {assets.length === 1 ? "element" : "elementer"}
            </span>
          </div>
        </CardHeader>
        <AssetTable
          assets={assets}
          onDelete={deleteAsset}
          onEdit={openEditNotes}
          loading={loading}
          readOnly={!isOwner}
        />
      </Card>

      {/* Add Asset Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Legg til investering">
        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(["crypto", "stock", "cash"] as AssetType[]).map((type) => (
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
                  {type === "crypto" ? <Bitcoin className="h-4 w-4" /> : type === "stock" ? <BarChart2 className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
                  {type === "crypto" ? "Krypto" : type === "stock" ? "Aksje" : "NOK"}
                </button>
              ))}
            </div>
          </div>

          {form.type === "cash" ? (
            <Input
              label="Navn (valgfritt)"
              placeholder="F.eks. Bufferkonto eller kontanter"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          ) : (
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
          )}

          <Input
            label={form.type === "cash" ? "Beløp i NOK" : "Antall"}
            type="number"
            placeholder="0.00"
            step="any"
            min="0"
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
          />

          {form.type !== "cash" && (
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
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Notat (valgfritt)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="F.eks. Kjøpte flere aksjer på grunn av god pris"
              rows={3}
              maxLength={1000}
              className="w-full resize-y rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">Notatet deles med husstandsmedlemmer som har porteføljetilgang.</p>
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
              disabled={(form.type !== "cash" && (!form.symbol || !form.name)) || !form.quantity || adding}
              isLoading={adding}
            >
              Lagre
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={editingAsset !== null}
        onClose={() => setEditingAsset(null)}
        title={`Notat – ${editingAsset?.name || "portefølje"}`}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Delt notat</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Skriv nødvendig informasjon til husstanden"
              rows={5}
              maxLength={1000}
              className="w-full resize-y rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Dette vises i porteføljen og på Oversikt for brukere med porteføljetilgang.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingAsset(null)}>Avbryt</Button>
            <Button onClick={saveNotes} isLoading={savingNotes}>Lagre notat</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
