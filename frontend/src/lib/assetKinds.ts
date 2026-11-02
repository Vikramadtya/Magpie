/** Things that have no market ticker: their value is what the owner says it is. */
export interface AssetKind {
  id: string;
  label: string;
  /** One item (a plot, a car): no quantity, just what was paid and what it is worth now. */
  single: boolean;
  unit: string;
}

export const ASSET_KINDS: AssetKind[] = [
  { id: 'GOLD', label: 'Gold', single: false, unit: 'gram' },
  { id: 'SILVER', label: 'Silver', single: false, unit: 'gram' },
  { id: 'PROPERTY', label: 'Land / property', single: true, unit: 'item' },
  { id: 'VEHICLE', label: 'Vehicle', single: true, unit: 'item' },
  { id: 'OTHER', label: 'Other asset', single: true, unit: 'item' },
];

export const assetKind = (assetType: string | null | undefined) => ASSET_KINDS.find((k) => k.id === assetType);
