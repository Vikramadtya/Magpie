/** Fractional ownership: the units that an amount buys at a unit price (both in minor units), to 8 decimals. */
export function unitsForAmount(amountMinor: number, unitPriceMinor: number): number {
  if (!(amountMinor > 0) || !(unitPriceMinor > 0)) return 0;
  return Math.floor((amountMinor / unitPriceMinor) * 1e8) / 1e8;
}

/** "0.2654" rather than "0.26543210": trailing zeros trimmed. */
export function formatUnits(units: number): string {
  return units.toFixed(8).replace(/\.?0+$/, '') || '0';
}
