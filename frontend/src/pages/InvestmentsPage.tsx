import { Plus, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useDebounce } from 'use-debounce';
import { toast } from 'sonner';
import { marketApi } from '../api/endpoints';
import { errorMessage } from '../lib/http';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Holding } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { Amount } from '../components/ui/Amount';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { MoneyInput } from '../components/ui/MoneyInput';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { StateView } from '../components/ui/StateView';
import { useDeleteHolding, useHoldings, useInvestmentSummary, useSaveHolding, useSetPrice } from '../hooks/useInsights';
import { useAccounts } from '../hooks/useReference';
import { useMarketSearch, useRefreshHoldings } from '../hooks/useExtras';
import { CURRENCIES, formatMoney, parseMoney, toInputValue } from '../lib/money';

const COLORS = ['#0A84FF', '#32D74B', '#FF9F0A', '#BF5AF2', '#FF375F', '#64D2FF', '#FFD60A', '#AC8E68'];

export default function InvestmentsPage() {
  const { canEdit, baseCurrency } = useWorkspace();
  const holdings = useHoldings();
  const summary = useInvestmentSummary();
  const [editing, setEditing] = useState<Holding | 'new' | null>(null);
  const [pricing, setPricing] = useState<Holding | null>(null);
  const [deleting, setDeleting] = useState<Holding | null>(null);
  const del = useDeleteHolding();
  const refresh = useRefreshHoldings();
  const list = holdings.data ?? [];
  const hasLive = list.some((h) => h.priceSource === 'LIVE');
  const stale = list.some((h) => h.priceSource === 'LIVE' && (!h.priceUpdatedAt || Date.now() - new Date(h.priceUpdatedAt).getTime() > 30 * 60_000));
  // The server refreshes stale prices in the background; look again shortly.
  useEffect(() => {
    if (!stale) return;
    const t = setTimeout(() => void holdings.refetch(), 6000);
    return () => clearTimeout(t);
  }, [stale, holdings]);
  const s = summary.data;

  return (
    <>
      <PageHeader title="Investments" subtitle="Holdings with prices you update" actions={<>{hasLive && <Button variant="outline" disabled={refresh.isPending} onClick={() => refresh.mutate(undefined, { onSuccess: () => toast.success('Prices updated'), onError: (e) => toast.error(errorMessage(e)) })}><RefreshCw className={`w-4 h-4 mr-2 ${refresh.isPending ? 'animate-spin' : ''}`} />Refresh prices</Button>}{canEdit && <Button onClick={() => setEditing('new')}><Plus className="w-4 h-4 mr-2" />Add holding</Button>}</>} />
      <StateView isLoading={holdings.isLoading} error={holdings.error} onRetry={() => void holdings.refetch()} isEmpty={list.length === 0} emptyTitle="No holdings yet" emptyHint="Track stocks, funds or crypto by entering quantity, cost and the current price." emptyAction={canEdit && <Button onClick={() => setEditing('new')}>Add holding</Button>}>
        {s && (
          <div className="grid lg:grid-cols-3 gap-4 mb-6">
            <div className="glass-panel p-5 lg:col-span-2 grid grid-cols-3 gap-4">
              <Stat label="Market value" value={formatMoney(s.valueMinor, s.currency)} />
              <Stat label="Cost basis" value={formatMoney(s.costMinor, s.currency)} />
              <Stat label="Gain / loss" value={`${formatMoney(s.gainMinor, s.currency, { sign: true })} (${s.gainPercent}%)`} tone={s.gainMinor >= 0 ? 'up' : 'down'} />
            </div>
            <div className="glass-panel p-3 h-40" role="img" aria-label="Allocation">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={s.allocation} dataKey="valueMinor" nameKey="symbol" innerRadius="55%" outerRadius="90%" stroke="none">
                    {s.allocation.map((a, i) => <Cell key={a.symbol} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [formatMoney(Number(v), s.currency), n]} contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        <div className="glass-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-secondary border-b border-border">
              <tr><th className="p-3">Holding</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Value</th><th className="p-3 text-right">Gain</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {list.map((h) => (
                <tr key={h.id} className="border-b border-border/60 last:border-0">
                  <td className="p-3"><p className="font-medium">{h.symbol}</p><p className="text-xs text-secondary">{h.name}{h.exchange ? ` · ${h.exchange}` : ''}</p></td>
                  <td className="p-3 text-right tabular-nums">{h.quantity}</td>
                  <td className="p-3 text-right tabular-nums">{formatMoney(h.priceMinor, h.currency)}<p className="text-xs text-secondary">{h.priceSource === 'LIVE' ? `live${h.priceUpdatedAt ? ` · ${new Date(h.priceUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}` : h.priceAsOf ?? 'manual'}</p></td>
                  <td className="p-3 text-right tabular-nums">{formatMoney(h.marketValueMinor, h.currency)}</td>
                  <td className="p-3 text-right"><Amount minor={h.gainMinor} currency={h.currency} signed /></td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {canEdit && <><Button size="sm" variant="ghost" onClick={() => setPricing(h)}>Price</Button><Button size="sm" variant="ghost" onClick={() => setEditing(h)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => setDeleting(h)}>Delete</Button></>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateView>
      {editing && <HoldingModal holding={editing === 'new' ? null : editing} currency={baseCurrency} onClose={() => setEditing(null)} />}
      {pricing && <PriceModal holding={pricing} onClose={() => setPricing(null)} />}
      <ConfirmDialog open={!!deleting} title={`Remove ${deleting?.symbol}?`} message="This only removes the holding record." confirmLabel="Remove" onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) del.mutate(deleting.id); setDeleting(null); }} />
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div>
      <p className="text-xs text-secondary">{label}</p>
      <p className={`text-lg font-bold tabular-nums mt-1 ${tone === 'up' ? 'text-green-600 dark:text-green-400' : tone === 'down' ? 'text-red-500' : ''}`}>{value}</p>
    </div>
  );
}

function HoldingModal({ holding, currency, onClose }: { holding: Holding | null; currency: string; onClose: () => void }) {
  const accounts = (useAccounts().data ?? []).filter((a) => a.type === 'INVESTMENT');
  const save = useSaveHolding();
  const cur = holding?.currency ?? currency;
  const [symbol, setSymbol] = useState(holding?.symbol ?? '');
  const [name, setName] = useState(holding?.name ?? '');
  const [quantity, setQuantity] = useState(holding ? String(holding.quantity) : '');
  const [cost, setCost] = useState(holding ? toInputValue(holding.costBasisMinor, cur) : '');
  const [price, setPrice] = useState(holding ? toInputValue(holding.priceMinor, cur) : '');
  const [currencyCode, setCurrencyCode] = useState(cur);
  const [accountId, setAccountId] = useState(holding?.accountId ?? '');
  const [error, setError] = useState('');
  // the exact instrument picked from market search; null = price entered by hand
  const [linked, setLinked] = useState<{ providerSymbol: string; exchange: string | null; assetType: string | null } | null>(
    holding?.providerSymbol ? { providerSymbol: holding.providerSymbol, exchange: holding.exchange, assetType: holding.assetType } : null,
  );
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 350);
  const hits = useMarketSearch(linked ? '' : debouncedQuery);
  const [picking, setPicking] = useState(false);

  const pick = async (hit: { symbol: string; name: string; exchange: string | null; type: string | null }) => {
    setPicking(true);
    try {
      const q = await marketApi.quote(hit.symbol);
      setSymbol(hit.symbol.replace(/^\^/, ''));
      setName(q.name ?? hit.name);
      setLinked({ providerSymbol: hit.symbol, exchange: q.exchange ?? hit.exchange, assetType: hit.type });
      if (q.available && q.currency && q.priceMinor != null) {
        setCurrencyCode(q.currency);
        setPrice(toInputValue(q.priceMinor, q.currency));
      } else {
        toast.info('No live price right now. Enter one by hand; it will update automatically when available.');
      }
      setQuery('');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPicking(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = Number(quantity);
    const costMinor = parseMoney(cost || '0', currencyCode);
    const priceMinor = parseMoney(price || '0', currencyCode);
    if (!symbol.trim() || !name.trim()) return setError('Symbol and name are required');
    if (!(q >= 0) || costMinor === null || priceMinor === null) return setError('Check quantity, cost and price');
    save.mutate({ id: holding?.id, body: { accountId: accountId || null, symbol: symbol.trim(), name: name.trim(), quantity: q, costBasisMinor: costMinor, priceMinor, currency: currencyCode, providerSymbol: linked?.providerSymbol ?? null, exchange: linked?.exchange ?? null, assetType: linked?.assetType ?? null } }, { onSuccess: onClose });
  };

  return (
    <Modal isOpen onClose={onClose} title={holding ? `Edit ${holding.symbol}` : 'Add holding'}>
      <form onSubmit={submit} className="space-y-4">
        {linked ? (
          <div className="rounded-lg border border-border p-3 text-sm flex items-center justify-between gap-3">
            <span>Live price from <strong>{linked.providerSymbol}</strong>{linked.exchange ? ` · ${linked.exchange}` : ''}{linked.assetType ? ` · ${linked.assetType.toLowerCase()}` : ''}</span>
            <button type="button" className="text-accent" onClick={() => setLinked(null)}>Enter price by hand</button>
          </div>
        ) : (
          <div>
            <Field label="Find a stock, ETF or index" hint="Search by name or ticker, e.g. Reliance, TCS, Apple, Nifty 50. Picking one keeps the price live.">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-secondary" />
                <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" autoFocus={!holding} />
              </div>
            </Field>
            {query.trim().length >= 2 && (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border text-sm" aria-label="Search results">
                {hits.isFetching && <li className="p-2 text-secondary">Searching…</li>}
                {!hits.isFetching && (hits.data ?? []).length === 0 && <li className="p-2 text-secondary">No matches, or the price source is unavailable. You can enter the details by hand below.</li>}
                {(hits.data ?? []).map((h) => (
                  <li key={`${h.symbol}-${h.exchange}`}>
                    <button type="button" disabled={picking} onClick={() => void pick(h)} className="w-full text-left p-2 hover:bg-black/5 dark:hover:bg-white/5">
                      <span className="font-medium">{h.symbol}</span> <span className="text-secondary">{h.name}</span>
                      <span className="block text-xs text-secondary">{[h.exchange, h.type?.toLowerCase()].filter(Boolean).join(' · ')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Symbol" error={error}><Input value={symbol} onChange={(e) => setSymbol(e.target.value)} maxLength={20} /></Field>
          <Field label="Currency"><Select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} disabled={!!holding}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        </div>
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={160} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Quantity"><Input inputMode="decimal" value={quantity} onChange={(e) => /^\d*\.?\d{0,8}$/.test(e.target.value) && setQuantity(e.target.value)} /></Field>
          <Field label="Total cost"><MoneyInput value={cost} currency={currencyCode} onChange={setCost} /></Field>
          <Field label="Price / unit"><MoneyInput value={price} currency={currencyCode} onChange={setPrice} /></Field>
        </div>
        {accounts.length > 0 && <Field label="Account (optional)"><Select value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">None</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={save.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}

function PriceModal({ holding, onClose }: { holding: Holding; onClose: () => void }) {
  const setPrice = useSetPrice();
  const [price, setPriceText] = useState(toInputValue(holding.priceMinor, holding.currency));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const minor = parseMoney(price, holding.currency);
    if (minor === null) return;
    setPrice.mutate({ id: holding.id, priceMinor: minor }, { onSuccess: onClose });
  };
  return (
    <Modal isOpen onClose={onClose} title={`Update ${holding.symbol} price`}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={`Price per unit (${holding.currency})`}><MoneyInput value={price} currency={holding.currency} onChange={setPriceText} autoFocus /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={setPrice.isPending}>Update</Button></div>
      </form>
    </Modal>
  );
}
