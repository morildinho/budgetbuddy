"use client";

import { useState, useEffect, useCallback } from "react";

export interface PortfolioAsset {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  asset_type: "stock" | "crypto";
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
  gainLossPercent: number | null;
  change24h: number | null;
}

interface NewAsset {
  symbol: string;
  name: string;
  asset_type: "stock" | "crypto";
  quantity: number;
  purchase_price?: number | null;
  currency?: string;
  notes?: string;
}

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

  const addAsset = useCallback(async (newAsset: NewAsset): Promise<boolean> => {
    try {
      const res = await fetch("/api/portfolio/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAsset),
      });
      if (!res.ok) throw new Error("Failed to add asset");
      const data = await res.json();

      setAssets((prev) => [data.asset, ...prev]);

      // Fetch price for the new asset
      const type = newAsset.asset_type;
      const params = new URLSearchParams();
      if (type === "crypto") params.set("crypto", newAsset.symbol.toUpperCase());
      else params.set("stocks", newAsset.symbol.toUpperCase());

      const priceRes = await fetch(`/api/portfolio/prices?${params.toString()}`);
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        setPrices((prev) => ({ ...prev, ...priceData.prices }));
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
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
    const priceInfo = prices[asset.symbol.toUpperCase()];
    const currentPrice = priceInfo?.price ?? null;
    const currentPriceNok = priceInfo?.price_nok ?? null;

    const currentValue = currentPrice != null ? asset.quantity * currentPrice : null;
    const currentValueNok = currentPriceNok != null ? asset.quantity * currentPriceNok : null;

    let gainLoss: number | null = null;
    let gainLossPercent: number | null = null;
    if (currentPrice != null && asset.purchase_price != null) {
      gainLoss = (currentPrice - asset.purchase_price) * asset.quantity;
      gainLossPercent = ((currentPrice - asset.purchase_price) / asset.purchase_price) * 100;
    }

    return {
      ...asset,
      currentPrice,
      currentPriceNok,
      currentValue,
      currentValueNok,
      gainLoss,
      gainLossPercent,
      change24h: priceInfo?.change_24h ?? null,
    };
  });

  return {
    assets: assetsWithMetrics,
    prices,
    loading,
    error,
    lastUpdated,
    addAsset,
    deleteAsset,
    refresh,
  };
}
