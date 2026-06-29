import { NextRequest, NextResponse } from "next/server";

// Map crypto symbols to CoinGecko IDs
const COINGECKO_ID_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  ADA: "cardano",
  DOT: "polkadot",
  DOGE: "dogecoin",
  XRP: "ripple",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  LINK: "chainlink",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  UNI: "uniswap",
  ATOM: "cosmos",
  FIL: "filecoin",
  BNB: "binancecoin",
  SHIB: "shiba-inu",
  TRX: "tron",
};

// Stablecoins — always $1 USD, no CoinGecko needed
const STABLECOINS = new Set(["USDC", "USDT", "DAI", "BUSD", "TUSD", "USDP", "GUSD", "FRAX"]);

interface PriceData {
  price: number | null;
  price_nok: number | null;
  change_24h: number | null;
  currency: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cryptoParam = searchParams.get("crypto") || "";
  const stocksParam = searchParams.get("stocks") || "";

  const cryptoSymbols = cryptoParam ? cryptoParam.split(",").filter(Boolean) : [];
  const stockSymbols = stocksParam ? stocksParam.split(",").filter(Boolean) : [];

  const prices: Record<string, PriceData> = {};

  // Fetch USD/NOK rate upfront (used for stablecoins + stocks)
  let usdNokRate: number | null = null;
  try {
    const fxRes = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/USDNOK=X?interval=1d&range=1d",
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, next: { revalidate: 300 } }
    );
    if (fxRes.ok) {
      const fxData = await fxRes.json();
      usdNokRate = fxData?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
    }
  } catch { /* ignore FX errors */ }

  // Handle stablecoins — hardcode $1 USD
  for (const symbol of cryptoSymbols) {
    if (STABLECOINS.has(symbol.toUpperCase())) {
      prices[symbol.toUpperCase()] = {
        price: 1,
        price_nok: usdNokRate ? usdNokRate : null,
        change_24h: 0,
        currency: "USD",
      };
    }
  }

  // Fetch crypto prices from CoinGecko
  if (cryptoSymbols.length > 0) {
    const symbolToId: Record<string, string> = {};
    const ids: string[] = [];

    for (const symbol of cryptoSymbols) {
      const upper = symbol.toUpperCase();
      if (STABLECOINS.has(upper)) continue; // already handled above
      const id = COINGECKO_ID_MAP[upper];
      if (id) {
        symbolToId[id] = upper;
        ids.push(id);
      } else {
        prices[upper] = { price: null, price_nok: null, change_24h: null, currency: "USD" };
      }
    }

    if (ids.length > 0) {
      try {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd,nok&include_24hr_change=true`;
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          next: { revalidate: 60 }, // cache 1 minute
        });

        if (response.ok) {
          const data = await response.json();
          for (const [geckoId, priceInfo] of Object.entries(data)) {
            const symbol = symbolToId[geckoId];
            if (symbol) {
              const info = priceInfo as Record<string, number>;
              prices[symbol] = {
                price: info.usd ?? null,
                price_nok: info.nok ?? null,
                change_24h: info.usd_24h_change ?? null,
                currency: "USD",
              };
            }
          }
        }
      } catch (err) {
        console.error("CoinGecko fetch error:", err);
      }

      // Fill any that failed
      for (const id of ids) {
        const symbol = symbolToId[id];
        if (symbol && !prices[symbol]) {
          prices[symbol] = { price: null, price_nok: null, change_24h: null, currency: "USD" };
        }
      }
    }
  }

  // Fetch stock prices from Yahoo Finance
  if (stockSymbols.length > 0) {
    for (const symbol of stockSymbols) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; BudgetBuddy/1.0)",
            Accept: "application/json",
          },
          next: { revalidate: 60 },
        });

        if (response.ok) {
          const data = await response.json();
          const meta = data?.chart?.result?.[0]?.meta;

          if (meta) {
            const currentPrice: number = meta.regularMarketPrice ?? null;
            const prevClose: number = meta.chartPreviousClose ?? meta.previousClose ?? null;
            const change24h =
              currentPrice != null && prevClose != null
                ? ((currentPrice - prevClose) / prevClose) * 100
                : null;

            prices[symbol.toUpperCase()] = {
              price: currentPrice ?? null,
              price_nok: currentPrice != null && usdNokRate != null && (meta.currency || "USD") === "USD"
                ? currentPrice * usdNokRate
                : currentPrice != null && meta.currency === "NOK"
                ? currentPrice
                : null,
              change_24h: change24h,
              currency: meta.currency || "USD",
            };
          } else {
            prices[symbol.toUpperCase()] = { price: null, price_nok: null, change_24h: null, currency: "USD" };
          }
        } else {
          prices[symbol.toUpperCase()] = { price: null, price_nok: null, change_24h: null, currency: "USD" };
        }
      } catch (err) {
        console.error(`Yahoo Finance fetch error for ${symbol}:`, err);
        prices[symbol.toUpperCase()] = { price: null, price_nok: null, change_24h: null, currency: "USD" };
      }
    }
  }

  return NextResponse.json({ prices });
}
