import type { Holding } from '../api/types';

export interface UploadedPrice { symbol: string; price: number; currency?: string }

/** Where to look a holding up: its linked symbol, or the Indian exchange suffixes for rupee holdings. */
function lookups(h: Holding): string[] {
  const base = (h.providerSymbol ?? h.symbol).trim().toUpperCase();
  return h.currency === 'INR' && !base.includes('.') ? [`${base}.NS`, `${base}.BO`] : [base];
}

/**
 * A small Python 3 script (standard library only) that fetches the current price of every holding
 * from the user's own computer and writes prices.csv for upload.
 */
export function buildPriceScript(holdings: Holding[]): string {
  const items = holdings.map((h) => ({ symbol: h.symbol, currency: h.currency, lookups: lookups(h) }));
  return `#!/usr/bin/env python3
"""Fetches current prices for your Keeper holdings and writes prices.csv.

Run:    python3 keeper_prices.py
Then upload prices.csv on Keeper's Investments page (Prices from your computer).
"""
import csv, json, urllib.parse, urllib.request

HOLDINGS = json.loads(${JSON.stringify(JSON.stringify(items))})
URL = "https://query1.finance.yahoo.com/v8/finance/chart/{}?range=1d&interval=1d"


def quote(symbol):
    req = urllib.request.Request(
        URL.format(urllib.parse.quote(symbol)),
        headers={"User-Agent": "Keeper-price-script/1.0 (personal use)"},
    )
    with urllib.request.urlopen(req, timeout=15) as res:
        meta = json.load(res)["chart"]["result"][0]["meta"]
    return meta["regularMarketPrice"], meta.get("currency")


rows = []
for h in HOLDINGS:
    for symbol in h["lookups"]:
        try:
            price, currency = quote(symbol)
        except Exception as e:  # try the next candidate, then move on
            print("  {}: {}".format(symbol, e))
            continue
        rows.append([h["symbol"], price, currency or h["currency"]])
        print("{:<14} {} {}".format(h["symbol"], price, currency or ""))
        break
    else:
        print("{:<14} no price found".format(h["symbol"]))

with open("prices.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["symbol", "price", "currency"])
    w.writerows(rows)
print("\\nWrote {} prices to prices.csv".format(len(rows)))
`;
}

/** Reads prices.csv: a header row naming symbol, price and (optionally) currency columns. */
export function parsePriceCsv(text: string): UploadedPrice[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const head = lines[0].split(',').map((c) => c.trim().toLowerCase());
  const [sym, price, cur] = [head.indexOf('symbol'), head.indexOf('price'), head.indexOf('currency')];
  if (sym < 0 || price < 0) return [];
  const out: UploadedPrice[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const value = Number(cols[price]);
    if (!cols[sym] || !Number.isFinite(value) || value <= 0) continue;
    const currency = cur >= 0 && /^[A-Za-z]{3}$/.test(cols[cur] ?? '') ? cols[cur].toUpperCase() : undefined;
    out.push({ symbol: cols[sym], price: value, currency });
  }
  return out;
}
