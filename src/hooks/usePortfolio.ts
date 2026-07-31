"use client";

import { useState, useEffect, useCallback } from "react";

export interface PortfolioAsset {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  asset_type: "stock" | "crypto" | "cash";
  quantity: number;
  purchase_price: number | null;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriceData {
  price: number | null;
  price_nok: number | null;
  change_24h: number | null;
  currency: string;
}

export interface AssetWithMetrics extends PortfolioAsset {
  currentPrice: number | null;
  currentPriceNok: number | null;
  currentValue: number | null;
  currentValueNok: number | null;
  gainLoss: number | null;
  gainLossNok: number | null;
  gainLossPercent: number | null;
  change24h: number | null;
}

interface NewAsset {
  symbol: string;
  name: string;
  asset_type: "stock" | "crypto" | "cash";
  quantity: number;
  purchase_price?: number | null;
  currency?: string;
  notes?: string;
}

interface AssetUpdates {
  notes?: string | null;
  quantity?: number;
  name?: string;
  purchase_price?: number | null;
  currency?: string;
}

export type AddAssetResult = "created" | "merged";

export function usePortfolio() {
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAssets = useCallback(async (): Promise<PortfolioAsset[]> => {
    const res = await fetch("/api/portfolio/assets");
    if (!res.ok) throw new Error("Failed to fetch assets");
    const data = await res.json();
    return data.assets || [];
  }, []);

  const fetchPrices = useCallback(async (assetList: PortfolioAsset[]) => {
    if (assetList.length === 0) return {};

    const cryptoSymbols = assetList
      .filter((a) => a.asset_type === "crypto")
      .map((a) => a.symbol);
    const stockSymbols = assetList
      .filter((a) => a.asset_type === "stock")
      .map((a) => a.symbol);

    const params = new URLSearchParams();
    if (cryptoSymbols.length > 0) params.set("crypto", cryptoSymbols.join(","));
    if (stockSymbols.length > 0) params.set("stocks", stockSymbols.join(","));

    if (!params.toString()) return {};

    const res = await fetch(`/api/portfolio/prices?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch prices");
    const data = await res.json();
    return data.prices || {};
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const assetList = await fetchAssets();
      setAssets(assetList);

      const priceMap = await fetchPrices(assetList);
      setPrices(priceMap);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [fetchAssets, fetchPrices]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addAsset = useCallback(async (newAsset: NewAsset): Promise<AddAssetResult | null> => {
    setError(null);
    try {
      const res = await fetch("/api/portfolio/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAsset),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunne ikke legge til beholdningen");

      const result = data as { asset: PortfolioAsset; merged: boolean };
      setAssets((previous) => {
        const alreadyExists = previous.some((asset) => asset.id === result.asset.id);
        return alreadyExists
          ? previous.map((asset) => asset.id === result.asset.id ? result.asset : asset)
          : [result.asset, ...previous];
      });

      // Cash has a fixed NOK price and does not need a market-price request.
      if (newAsset.asset_type !== "cash") {
        const params = new URLSearchParams();
        const symbol = newAsset.symbol.trim().toUpperCase();
        if (newAsset.asset_type === "crypto") params.set("crypto", symbol);
        else params.set("stocks", symbol);

        const priceRes = await fetch(`/api/portfolio/prices?${params.toString()}`);
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          setPrices((previous) => ({ ...previous, ...priceData.prices }));
        }
      }

      return result.merged ? "merged" : "created";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
      return null;
    }
  }, []);

  const updateAsset = useCallback(async (id: string, updates: AssetUpdates): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch("/api/portfolio/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunne ikke oppdatere beholdningen");
      setAssets((prev) => prev.map((asset) => (asset.id === id ? data.asset : asset)));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
      return false;
    }
  }, []);

  const deleteAsset = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/portfolio/assets?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete asset");
      setAssets((prev) => prev.filter((a) => a.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    }
  }, []);

  // Enrich assets with price metrics
  const assetsWithMetrics: AssetWithMetrics[] = assets.map((asset) => {
    const isCash = asset.asset_type === "cash";
    const priceInfo = prices[asset.symbol.toUpperCase()];
    const currentPrice = isCash ? 1 : priceInfo?.price ?? null;
    const currentPriceNok = isCash ? 1 : priceInfo?.price_nok ?? null;

    const currentValue = currentPrice != null ? asset.quantity * currentPrice : null;
    const currentValueNok = currentPriceNok != null ? asset.quantity * currentPriceNok : null;

    let gainLoss: number | null = null;
    let gainLossNok: number | null = null;
    let gainLossPercent: number | null = null;
    if (!isCash && currentPrice != null && asset.purchase_price != null) {
      gainLoss = (currentPrice - asset.purchase_price) * asset.quantity;
      gainLossPercent = ((currentPrice - asset.purchase_price) / asset.purchase_price) * 100;

      const purchasePriceNok = asset.currency === "NOK"
        ? asset.purchase_price
        : currentPrice !== 0 && currentPriceNok != null
          ? asset.purchase_price * (currentPriceNok / currentPrice)
          : null;

      if (currentPriceNok != null && purchasePriceNok != null) {
        gainLossNok = (currentPriceNok - purchasePriceNok) * asset.quantity;
      }
    }

    return {
      ...asset,
      currentPrice,
      currentPriceNok,
      currentValue,
      currentValueNok,
      gainLoss,
      gainLossNok,
      gainLossPercent,
      change24h: isCash ? 0 : priceInfo?.change_24h ?? null,
    };
  });

  return {
    assets: assetsWithMetrics,
    prices,
    loading,
    error,
    lastUpdated,
    addAsset,
    updateAsset,
    deleteAsset,
    refresh,
  };
}
