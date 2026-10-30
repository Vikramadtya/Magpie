import { Pencil, Plus, RefreshCw, Search, Tag, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useDebounce } from 'use-debounce';
import { toast } from 'sonner';
import { marketApi } from '../api/endpoints';
import { errorMessage } from '../lib/http';
import { TOOLTIP_STYLE } from '../lib/chart';
import { paletteColor } from '../lib/palette';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Holding } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { Amount } from '../components/ui/Amount';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
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
            <div className="hero-card p-6 lg:col-span-2 flex flex-col justify-between gap-6">
              <div>
                <p className="text-[13px] font-medium text-white/60">Market value</p>
                <p className="text-4xl font-semibold mt-1.5 tabular-nums tracking-[-0.03em]">{formatMoney(s.valueMinor, s.currency)}</p>
              </div>
              <div className="flex flex-wrap gap-x-10 gap-y-3">
                <div><p className="text-xs text-white/60">Gain / loss</p><p className={`text-lg font-semibold tabular-nums ${s.gainMinor >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{formatMoney(s.gainMinor, s.currency, { sign: true })} <span className="text-sm font-medium">({s.gainPercent}%)</span></p></div>
                <div><p className="text-xs text-white/60">Cost basis</p><p className="text-lg font-semibold tabular-nums">{formatMoney(s.costMinor, s.currency)}</p></div>
                <div><p className="text-xs text-white/60">Holdings</p><p className="text-lg font-semibold tabular-nums">{list.length}</p></div>
              </div>
            </div>
            <div className="glass-panel p-5 flex items-center gap-4" role="img" aria-label="Allocation">
              <div className="h-32 w-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={s.allocation} dataKey="valueMinor" nameKey="symbol" innerRadius="62%" outerRadius="95%" paddingAngle={2} stroke="none">
                      {s.allocation.map((a, i) => <Cell key={a.symbol} fill={paletteColor(i)} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [formatMoney(Number(v), s.currency), n]} contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 min-w-0 space-y-1.5 text-sm">
                {s.allocation.slice(0, 5).map((a, i) => (
                  <li key={a.symbol} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: paletteColor(i) }} /><span className="truncate">{a.symbol}</span></span>
                    <span className="tabular-nums text-secondary">{Math.round(a.percent)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <div className="glass-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-medium text-secondary border-b border-border">
              <tr><th className="px-5 py-3.5">Holding</th><th className="px-3 py-3.5 text-right">Qty</th><th className="px-3 py-3.5 text-right">Price</th><th className="px-3 py-3.5 text-right">Value</th><th className="px-3 py-3.5 text-right">Gain</th><th className="px-3 py-3.5" /></tr>
            </thead>
            <tbody>
              {list.map((h) => (
                <tr key={h.id} className="border-b border-border/60 last:border-0 group hover:bg-primary/[0.02]">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={h.symbol} size={36} />
                      <div className="min-w-0"><p className="font-semibold">{h.symbol}</p><p className="text-xs text-secondary truncate">{h.name}{h.exchange ? ` · ${h.exchange}` : ''}</p></div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums">{h.quantity}</td>
                  <td className="px-3 py-3.5 text-right tabular-nums">{formatMoney(h.priceMinor, h.currency)}<p className="text-xs text-secondary">{h.priceSource === 'LIVE' ? `live${h.priceUpdatedAt ? ` · ${new Date(h.priceUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}` : h.priceAsOf ?? 'manual'}</p></td>
                  <td className="px-3 py-3.5 text-right tabular-nums font-medium">{formatMoney(h.marketValueMinor, h.currency)}</td>
                  <td className="px-3 py-3.5 text-right"><Badge tone={h.gainMinor >= 0 ? 'good' : 'bad'} className="text-xs"><Amount minor={h.gainMinor} currency={h.currency} signed /></Badge></td>
                  <td className="px-3 py-3.5 text-right whitespace-nowrap">
                    {canEdit && (
                      <div className="inline-flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <IconButton label="Update price" onClick={() => setPricing(h)}><Tag className="w-4 h-4" /></IconButton>
                        <IconButton label="Edit" onClick={() => setEditing(h)}><Pencil className="w-4 h-4" /></IconButton>
                        <IconButton label="Remove" onClick={() => setDeleting(h)}><Trash2 className="w-4 h-4" /></IconButton>
                      </div>
                    )}
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
