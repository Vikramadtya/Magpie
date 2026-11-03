import type { TransactionFilters, TxSort, TxType } from '../api/types';
import { parseMoney } from './money';

const SORTS: readonly TxSort[] = ['date_desc', 'date_asc', 'amount_desc', 'amount_asc'];
const TYPES: readonly TxType[] = ['INCOME', 'EXPENSE', 'TRANSFER'];

const list = (text: string | null) => (text ? text.split(',').map((s) => s.trim()).filter(Boolean) : undefined);

/** The address bar is the source of truth, so a filtered view can be bookmarked or shared. */
export function parseFilters(p: URLSearchParams): TransactionFilters {
  const sort = p.get('sort') as TxSort | null;
  const type = p.get('type') as TxType | null;
  return {
    q: p.get('q')?.trim() || undefined,
    from: p.get('from') || undefined,
    to: p.get('to') || undefined,
    type: type && TYPES.includes(type) ? type : undefined,
    tripId: p.get('trip') || undefined,
    spentBy: p.get('by') || undefined,
    accountIds: list(p.get('account')),
    categoryIds: list(p.get('category')),
    payeeIds: list(p.get('payee')),
    tagIds: list(p.get('tag')),
    uncategorised: p.get('none') === '1' || undefined,
    minAmount: p.get('min') || undefined,
    maxAmount: p.get('max') || undefined,
    sort: sort && SORTS.includes(sort) && sort !== 'date_desc' ? sort : undefined,
  };
}

export function toParams(f: TransactionFilters): URLSearchParams {
  const p = new URLSearchParams();
  const set = (key: string, value: string | undefined) => value && p.set(key, value);
  set('q', f.q?.trim());
  set('from', f.from);
  set('to', f.to);
  set('type', f.type);
  set('trip', f.tripId);
  set('by', f.spentBy);
  set('account', f.accountIds?.join(','));
  set('category', f.categoryIds?.join(','));
  set('payee', f.payeeIds?.join(','));
  set('tag', f.tagIds?.join(','));
  if (f.uncategorised) p.set('none', '1');
  set('min', f.minAmount);
  set('max', f.maxAmount);
  if (f.sort && f.sort !== 'date_desc') p.set('sort', f.sort);
  return p;
}

/** The query the server understands: ids comma-separated, amounts in minor units of the main currency. */
export function toQuery(f: TransactionFilters, baseCurrency: string): Record<string, string | boolean | number | undefined> {
  const min = f.minAmount ? parseMoney(f.minAmount, baseCurrency) : null;
  const max = f.maxAmount ? parseMoney(f.maxAmount, baseCurrency) : null;
  return {
    q: f.q?.trim() || undefined,
    from: f.from,
    to: f.to,
    type: f.type,
    tripId: f.tripId,
    spentBy: f.spentBy,
    accountIds: f.accountIds?.join(',') || undefined,
    categoryIds: f.categoryIds?.join(',') || undefined,
    payeeIds: f.payeeIds?.join(',') || undefined,
    tagIds: f.tagIds?.join(',') || undefined,
    uncategorised: f.uncategorised || undefined,
    minAmount: min ?? undefined,
    maxAmount: max ?? undefined,
    sort: f.sort,
  };
}

/** How many separate filters are on (the search words count as one). */
export function countActive(f: TransactionFilters): number {
  return [
    f.q, f.from || f.to, f.type, f.tripId, f.spentBy, f.accountIds?.length, f.categoryIds?.length, f.payeeIds?.length,
    f.tagIds?.length, f.uncategorised, f.minAmount || f.maxAmount,
  ].filter(Boolean).length;
}

export const SORT_LABELS: Record<TxSort, string> = {
  date_desc: 'Newest first',
  date_asc: 'Oldest first',
  amount_desc: 'Largest first',
  amount_asc: 'Smallest first',
};

/** A saved combination of filters, kept on this device. */
export interface SavedFilter { id: string; name: string; query: string }

const savedKey = (ws: string) => `keeper.savedFilters.${ws}`;

export function readSaved(ws: string, storage?: Pick<Storage, 'getItem'>): SavedFilter[] {
  try {
    const parsed: unknown = JSON.parse((storage ?? localStorage).getItem(savedKey(ws)) ?? '[]');
    return Array.isArray(parsed) ? (parsed as SavedFilter[]).filter((s) => s && typeof s.name === 'string' && typeof s.query === 'string') : [];
  } catch {
    return [];
  }
}

export function writeSaved(ws: string, items: SavedFilter[], storage?: Pick<Storage, 'setItem'>) {
  try {
    (storage ?? localStorage).setItem(savedKey(ws), JSON.stringify(items.slice(0, 30)));
  } catch {
    // private mode: saved filters just do not stick
  }
}
