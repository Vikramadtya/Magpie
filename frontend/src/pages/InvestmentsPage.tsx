import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Download, Layers, Pencil, Plus, RefreshCw, Search, Tag, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
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
import { formatUnits, unitsForAmount } from '../lib/fractional';
import { Segmented } from '../components/ui/Segmented';
import { useMarketSearch, useRefreshHolding, useRefreshHoldings, useUploadPrices, useLots, useAddPurchase, useRemovePurchase } from '../hooks/useExtras';
import { buildPriceScript, parsePriceCsv } from '../lib/priceScript';
import { ASSET_KINDS, assetKind } from '../lib/assetKinds';
import { CURRENCIES, formatMoney, parseMoney, toInputValue } from '../lib/money';


export default function InvestmentsPage() {
  return <HoldingsView assets={false} />;
}

/** Stocks and funds (assets=false) or gold, land and other things you value yourself (assets=true). */
export function HoldingsView({ assets }: { assets: boolean }) {
  const { canEdit, baseCurrency } = useWorkspace();
  const holdings = useHoldings();
  const summary = useInvestmentSummary(assets ? 'assets' : 'market');
  const [editing, setEditing] = useState<Holding | 'new' | null>(null);
  const [pricing, setPricing] = useState<Holding | null>(null);
  const [deleting, setDeleting] = useState<Holding | null>(null);
  const [offline, setOffline] = useState(false);
  const [buying, setBuying] = useState<Holding | null>(null);
  const del = useDeleteHolding();
  const refresh = useRefreshHoldings();
  const refreshOne = useRefreshHolding();
  const list = (holdings.data ?? []).filter((h) => !!assetKind(h.assetType) === assets);
  const market = list.filter((h) => !assetKind(h.assetType));
  const hasLive = market.some((h) => h.priceSource === 'LIVE');
  const stale = list.some((h) => h.priceSource === 'LIVE' && (!h.priceUpdatedAt || Date.now() - new Date(h.priceUpdatedAt).getTime() > 30 * 60_000));
  // The server refreshes stale prices in the background; look again shortly.
  useEffect(() => {
    if (!stale) return;
    const t = setTimeout(() => void holdings.refetch(), 6000);
    return () => clearTimeout(t);
  }, [stale, holdings]);
  const s = summary.data;
  const stamps = list.filter((h) => h.priceSource === 'LIVE' && h.priceUpdatedAt).map((h) => new Date(h.priceUpdatedAt!).getTime());
  const updatedAt = stamps.length ? new Date(Math.min(...stamps)) : null;

  const fetchLive = () =>
    refresh.mutate(undefined, {
      onSuccess: async (after) => {
        const live = after.filter((h) => h.priceSource === 'LIVE').length;
        if (live > 0) return toast.success(`${live} of ${after.length} holdings now have live prices`);
        try {
          const status = await marketApi.status();
          const why = status.providers.filter((p) => !p.ok && p.error).map((p) => `${p.provider}: ${p.error}`).join('; ');
          toast.error(status.live
            ? "None of these symbols was found on the market. Edit a holding and pick the exact instrument from search."
            : `Live prices can't be reached from the server right now${why ? ` (${why})` : ''}. Your last prices are kept. If this keeps happening, add a market data key in the server settings.`, { duration: 10000 });
        } catch {
          toast.error('Could not check the market data service.');
        }
      },
      onError: (e) => toast.error(errorMessage(e)),
    });

  return (
    <>
      <PageHeader title={assets ? 'Assets' : 'Investments'} subtitle={assets ? 'Gold, land and other things you own' : 'Stocks and mutual funds with live prices'} actions={<>{market.length > 0 && <div className="flex items-center gap-3">{updatedAt && <span className="text-xs text-secondary hidden sm:inline">Updated {formatDistanceToNow(updatedAt, { addSuffix: true })}</span>}<Button variant="outline" disabled={refresh.isPending} onClick={fetchLive}><RefreshCw className={`w-4 h-4 mr-2 ${refresh.isPending ? 'animate-spin' : ''}`} />Refresh prices</Button>{canEdit && <Button variant="outline" onClick={() => setOffline(true)}><Upload className="w-4 h-4 mr-2" />From my computer</Button>}</div>}{canEdit && <Button onClick={() => setEditing('new')}><Plus className="w-4 h-4 mr-2" />Add holding</Button>}</>} />
      {market.length > 0 && !hasLive && !holdings.isLoading && (
        <div role="status" className="glass-panel p-4 mb-6 flex flex-wrap items-center gap-3 border-accent/40">
          <Tag className="w-4 h-4 text-accent shrink-0" />
          <p className="text-sm flex-1 min-w-[14rem]">These prices were entered by hand, so they don't move on their own. Keeper will look for live prices by symbol; press <strong>Refresh prices</strong> to try now.</p>
        </div>
      )}
      <StateView isLoading={holdings.isLoading} error={holdings.error} onRetry={() => void holdings.refetch()} isEmpty={list.length === 0} emptyTitle={assets ? 'No assets yet' : 'No holdings yet'} emptyHint={assets ? 'Add gold, land, a vehicle or anything else you own, with what you paid and what it is worth now.' : 'Track stocks and mutual funds by entering quantity, what you paid and the current price.'} emptyAction={canEdit && <Button onClick={() => setEditing('new')}>Add holding</Button>}>
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
              <tr><th className="px-5 py-3.5">Holding</th><th className="px-3 py-3.5 text-right">Qty</th><th className="px-3 py-3.5 text-right">Buy price</th><th className="px-3 py-3.5 text-right">Current price</th><th className="px-3 py-3.5 text-right">Value</th><th className="px-3 py-3.5 text-right">Gain</th><th className="px-3 py-3.5" /></tr>
            </thead>
            <tbody>
              {list.map((h) => (
                <tr key={h.id} className="border-b border-border/60 last:border-0 group hover:bg-primary/[0.02]">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={h.name} size={36} />
                      <div className="min-w-0"><p className="font-semibold truncate">{h.name}</p><p className="text-xs text-secondary truncate">{assetKind(h.assetType)?.label ?? (h.symbol.startsWith('MF:') ? 'Mutual fund' : h.symbol)}{h.exchange ? ` · ${h.exchange}` : ''}</p></div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums">{assetKind(h.assetType)?.single ? '' : h.quantity}</td>
                  <td className="px-3 py-3.5 text-right tabular-nums">{h.quantity > 0 ? formatMoney(Math.round(h.costBasisMinor / h.quantity), h.currency) : '—'}<p className="text-xs text-secondary mt-0.5">{h.lotCount > 1 ? `${h.lotCount} buys · since ${format(parseISO(h.purchasedOn!), 'd MMM yyyy')}` : h.purchasedOn ? `Bought ${format(parseISO(h.purchasedOn), 'd MMM yyyy')}` : 'Date not set'}</p></td>
                  <td className="px-3 py-3.5 text-right tabular-nums">{formatMoney(h.priceMinor, h.currency)}<p className="text-xs text-secondary flex items-center justify-end gap-1.5 mt-0.5">{h.priceSource === 'LIVE' ? <Badge tone="good">Live</Badge> : <Badge>{assetKind(h.assetType) ? 'Your value' : 'Manual'}</Badge>}{h.priceUpdatedAt ? `Updated ${format(new Date(h.priceUpdatedAt), 'd MMM, HH:mm')}` : h.priceAsOf ? `As of ${format(parseISO(h.priceAsOf), 'd MMM yyyy')}` : ''}</p></td>
                  <td className="px-3 py-3.5 text-right tabular-nums font-medium">{formatMoney(h.marketValueMinor, h.currency)}</td>
                  <td className="px-3 py-3.5 text-right"><Badge tone={h.gainMinor >= 0 ? 'good' : 'bad'} className="text-xs"><Amount minor={h.gainMinor} currency={h.currency} signed /></Badge></td>
                  <td className="px-3 py-3.5 text-right whitespace-nowrap">
                    {canEdit && (
                      <div className="inline-flex items-center gap-0.5">
                        <IconButton label="Purchases" onClick={() => setBuying(h)}><Layers className="w-4 h-4" /></IconButton>
                        {!assetKind(h.assetType) && <IconButton label="Refresh this price" disabled={refreshOne.isPending && refreshOne.variables === h.id} onClick={() => refreshOne.mutate(h.id, { onSuccess: (x) => (x.priceSource === 'LIVE' ? toast.success(`${x.symbol} updated`) : toast.error(`No live price found for ${x.symbol}`)), onError: (e) => toast.error(errorMessage(e)) })}><RefreshCw className={`w-4 h-4 ${refreshOne.isPending && refreshOne.variables === h.id ? 'animate-spin' : ''}`} /></IconButton>}
                        <span className="inline-flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <IconButton label="Update price by hand" onClick={() => setPricing(h)}><Tag className="w-4 h-4" /></IconButton>
                        <IconButton label="Edit" onClick={() => setEditing(h)}><Pencil className="w-4 h-4" /></IconButton>
                        <IconButton label="Remove" onClick={() => setDeleting(h)}><Trash2 className="w-4 h-4" /></IconButton>
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateView>
      {editing && <HoldingModal assets={assets} holding={editing === 'new' ? null : editing} currency={baseCurrency} onClose={() => setEditing(null)} />}
      {buying && <PurchasesModal holding={buying} canEdit={canEdit} onClose={() => setBuying(null)} />}
      {offline && <OfflinePricesModal holdings={list} onClose={() => setOffline(false)} />}
      {pricing && <PriceModal holding={pricing} onClose={() => setPricing(null)} />}
      <ConfirmDialog open={!!deleting} title={`Remove ${deleting?.symbol}?`} message="This only removes the holding record." confirmLabel="Remove" onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) del.mutate(deleting.id); setDeleting(null); }} />
    </>
  );
}

function HoldingModal({ assets, holding, currency, onClose }: { assets: boolean; holding: Holding | null; currency: string; onClose: () => void }) {
  const accounts = (useAccounts().data ?? []).filter((a) => a.type === 'INVESTMENT');
  const save = useSaveHolding();
  const cur = holding?.currency ?? currency;
  const [kind, setKind] = useState(assetKind(holding?.assetType)?.id ?? (assets ? 'GOLD' : 'MARKET'));
  const own = assetKind(kind);
  const [symbol, setSymbol] = useState(holding?.symbol ?? '');
  const [name, setName] = useState(holding?.name ?? '');
  const [quantity, setQuantity] = useState('');
  // Invest a sum of money (fractional shares) instead of counting whole units.
  const [by, setBy] = useState<'units' | 'amount'>('units');
  const [amount, setAmount] = useState('');
  const firstBuy = !holding || holding.lotCount === 0;
  const [paid, setPaid] = useState('');
  const [price, setPrice] = useState(holding ? toInputValue(holding.priceMinor, cur) : '');
  const [currencyCode, setCurrencyCode] = useState(cur);
  const [accountId, setAccountId] = useState(holding?.accountId ?? '');
  const [purchasedOn, setPurchasedOn] = useState(holding?.purchasedOn ?? '');
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
      if (!(hit.type === 'MUTUALFUND' && symbol.trim())) setSymbol(hit.symbol.replace(/^\^/, ''));
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
    let q = own?.single ? 1 : Number(quantity);
    let paidMinor = parseMoney(paid || '0', currencyCode);
    const priceMinor = parseMoney(price || '0', currencyCode);
    if (firstBuy && !own?.single && by === 'amount') {
      const sum = parseMoney(amount || '0', currencyCode);
      const unit = parseMoney(paid || price || '0', currencyCode);
      if (!sum || !unit) return setError('Enter the amount invested and the price per unit');
      q = unitsForAmount(sum, unit);
      paidMinor = unit;
    }
    if (!name.trim() || (!own && !symbol.trim())) return setError(own ? 'Give it a name' : 'Symbol and name are required');
    if (!(q >= 0) || paidMinor === null || priceMinor === null) return setError('Check quantity, buy price and current price');
    save.mutate({ id: holding?.id, body: { accountId: accountId || null, symbol: own ? '' : symbol.trim(), name: name.trim(), quantity: q, costBasisMinor: 0, unitPriceMinor: paidMinor, priceMinor, currency: currencyCode, providerSymbol: own ? null : linked?.providerSymbol ?? null, exchange: own ? null : linked?.exchange ?? null, assetType: own ? own.id : linked?.assetType ?? null, purchasedOn: purchasedOn || null } }, { onSuccess: onClose });
  };

  return (
    <Modal isOpen onClose={onClose} title={holding ? `Edit ${holding.name}` : 'Add holding'}>
      <form onSubmit={submit} className="space-y-4">
        {!holding && assets && <Field label="What are you adding?"><Select value={kind} onChange={(e) => setKind(e.target.value)}>{ASSET_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</Select></Field>}
        {own ? null : linked ? (
          <div className="rounded-lg border border-border p-3 text-sm flex items-center justify-between gap-3">
            <span>Live price from <strong>{linked.providerSymbol}</strong>{linked.exchange ? ` · ${linked.exchange}` : ''}{linked.assetType ? ` · ${linked.assetType.toLowerCase()}` : ''}</span>
            <button type="button" className="text-accent" onClick={() => setLinked(null)}>Enter price by hand</button>
          </div>
        ) : (
          <div>
            <Field label="Find a stock, ETF or index" hint="Search by name or ticker, e.g. Reliance, TCS, Apple, Nifty 50, or a mutual fund like Parag Parikh Flexi Cap. Picking one keeps the price live. For a fund, type your own symbol (such as the Google Finance code) first and it will be kept.">
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
          {own ? <Field label="Currency"><Select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} disabled={!!holding}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></Field> : <Field label="Symbol" error={error}><Input value={symbol} onChange={(e) => setSymbol(e.target.value)} maxLength={20} /></Field>}
          {!own && <Field label="Currency"><Select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} disabled={!!holding}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>}
        </div>
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={160} /></Field>
        <Field label={own ? (own.single ? 'Current value' : `Current value / ${own.unit}`) : 'Current price / unit'}><MoneyInput value={price} currency={currencyCode} onChange={setPrice} /></Field>
        {firstBuy ? (
          <div className="space-y-3">
            {!own?.single && <Segmented value={by} onChange={setBy} options={[['units', 'I know the units'], ['amount', 'I invested an amount']] as const} />}
            {by === 'amount' && !own?.single ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount invested"><MoneyInput value={amount} currency={currencyCode} onChange={setAmount} /></Field>
                  <Field label="Date bought"><Input type="date" value={purchasedOn} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setPurchasedOn(e.target.value)} /></Field>
                </div>
                <Field label="Price per unit then" hint="Leave blank to use the current price above.">
                  <MoneyInput value={paid} currency={currencyCode} onChange={setPaid} placeholder={price} />
                </Field>
                <FractionPreview amount={amount} unit={paid || price} currency={currencyCode} />
              </>
            ) : (
              <div className={`grid gap-3 ${own?.single ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {!own?.single && <Field label={own ? `${own.unit[0].toUpperCase()}${own.unit.slice(1)}s bought` : 'Units bought'}><Input inputMode="decimal" value={quantity} onChange={(e) => /^\d*\.?\d{0,8}$/.test(e.target.value) && setQuantity(e.target.value)} /></Field>}
                <Field label={own ? (own.single ? 'Paid' : `Bought at / ${own.unit}`) : 'Bought at / unit'}><MoneyInput value={paid} currency={currencyCode} onChange={setPaid} /></Field>
                <Field label="Date bought"><Input type="date" value={purchasedOn} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setPurchasedOn(e.target.value)} /></Field>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-secondary">{holding.lotCount} purchase{holding.lotCount === 1 ? '' : 's'} recorded. Add or remove buys with the <Layers className="w-3.5 h-3.5 inline" /> button on the holding.</p>
        )}
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

/** Prices without the server: run a downloaded script on your own computer, then upload its CSV. */
function OfflinePricesModal({ holdings, onClose }: { holdings: Holding[]; onClose: () => void }) {
  const upload = useUploadPrices();
  const input = useRef<HTMLInputElement>(null);

  const download = () => {
    const url = URL.createObjectURL(new Blob([buildPriceScript(holdings)], { type: 'text/x-python' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'keeper_prices.py' });
    a.click();
    URL.revokeObjectURL(url);
  };

  const send = async (file: File | undefined) => {
    if (!file) return;
    const prices = parsePriceCsv(await file.text());
    if (prices.length === 0) return toast.error('No prices found. Upload the prices.csv the script wrote.');
    upload.mutate(prices, {
      onSuccess: (r) => {
        toast.success(`${r.updated} price${r.updated === 1 ? '' : 's'} updated`);
        if (r.unmatched.length) toast.error(`Not matched to a holding: ${r.unmatched.join(', ')}`, { duration: 8000 });
        onClose();
      },
      onError: (e) => toast.error(errorMessage(e)),
    });
  };

  return (
    <Modal isOpen onClose={onClose} title="Prices from my computer">
      <div className="p-5 space-y-5 text-sm">
        <p className="text-secondary">When the server can't reach the market, your own computer usually can. Nothing leaves your computer except the prices you upload.</p>
        <ol className="space-y-4">
          <li className="flex items-start gap-3"><Badge>1</Badge><div className="flex-1"><p className="mb-2">Download the script. It already lists your {holdings.length} holding{holdings.length === 1 ? '' : 's'}.</p><Button variant="outline" onClick={download}><Download className="w-4 h-4 mr-2" />Download keeper_prices.py</Button></div></li>
          <li className="flex items-start gap-3"><Badge>2</Badge><div className="flex-1"><p className="mb-2">Run it. It needs Python 3 and writes <code>prices.csv</code> next to it.</p><code className="block rounded-lg bg-primary/[0.06] px-3 py-2 text-xs">python3 keeper_prices.py</code></div></li>
          <li className="flex items-start gap-3"><Badge>3</Badge><div className="flex-1"><p className="mb-2">Upload the CSV to update your prices.</p><input ref={input} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { void send(e.target.files?.[0]); e.target.value = ''; }} /><Button disabled={upload.isPending} onClick={() => input.current?.click()}><Upload className="w-4 h-4 mr-2" />{upload.isPending ? 'Updating…' : 'Upload prices.csv'}</Button></div></li>
        </ol>
      </div>
    </Modal>
  );
}

/** Every purchase of a holding, with room to record another one. */
function PurchasesModal({ holding, canEdit, onClose }: { holding: Holding; canEdit: boolean; onClose: () => void }) {
  const lots = useLots(holding.id);
  const add = useAddPurchase();
  const remove = useRemovePurchase();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [by, setBy] = useState<'units' | 'amount'>('units');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const currentPrice = toInputValue(holding.priceMinor, holding.currency);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const unit = parseMoney((by === 'amount' ? price || currentPrice : price) || '0', holding.currency);
    const q = by === 'amount' ? unitsForAmount(parseMoney(amount || '0', holding.currency) ?? 0, unit ?? 0) : Number(qty);
    if (!(q > 0) || unit === null || unit <= 0 || !date) return setError('Enter the date, units and price paid');
    setError('');
    add.mutate({ holdingId: holding.id, body: { boughtOn: date, quantity: q, unitPriceMinor: unit } }, {
      onSuccess: () => { setQty(''); setPrice(''); setAmount(''); toast.success('Purchase added'); },
      onError: (err) => toast.error(errorMessage(err)),
    });
  };

  return (
    <Modal isOpen onClose={onClose} title={`Purchases · ${holding.name}`}>
      <div className="space-y-4">
        {lots.isLoading ? <p className="text-sm text-secondary">Loading…</p> : (lots.data ?? []).length === 0 ? <p className="text-sm text-secondary">No purchases recorded yet.</p> : (
          <ul className="divide-y divide-border rounded-lg border border-border text-sm">
            {(lots.data ?? []).map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 p-3">
                <div><p className="font-medium">{format(parseISO(l.boughtOn), 'd MMM yyyy')}</p><p className="text-xs text-secondary">{l.quantity} units at {formatMoney(l.unitPriceMinor, holding.currency)}</p></div>
                <div className="flex items-center gap-1"><span className="tabular-nums">{formatMoney(l.costMinor, holding.currency)}</span>
                  {canEdit && <IconButton label="Remove purchase" onClick={() => remove.mutate({ holdingId: holding.id, lotId: l.id })}><Trash2 className="w-4 h-4" /></IconButton>}</div>
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm font-medium">Add another purchase</p>
            <Segmented value={by} onChange={setBy} options={[['units', 'By units'], ['amount', 'By amount']] as const} />
            <div className="grid grid-cols-3 gap-3">
              <Field label="Date" error={error}><Input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} /></Field>
              {by === 'amount'
                ? <Field label="Amount invested"><MoneyInput value={amount} currency={holding.currency} onChange={setAmount} /></Field>
                : <Field label="Units"><Input inputMode="decimal" value={qty} onChange={(e) => /^\d*\.?\d{0,8}$/.test(e.target.value) && setQty(e.target.value)} /></Field>}
              <Field label="Price / unit"><MoneyInput value={price} currency={holding.currency} onChange={setPrice} placeholder={by === 'amount' ? currentPrice : undefined} /></Field>
            </div>
            {by === 'amount' && <FractionPreview amount={amount} unit={price || currentPrice} currency={holding.currency} />}
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Close</Button><Button type="submit" disabled={add.isPending}>Add purchase</Button></div>
          </form>
        )}
      </div>
    </Modal>
  );
}

/** Shows how many (fractional) units an amount buys, so the result is clear before saving. */
function FractionPreview({ amount, unit, currency }: { amount: string; unit: string; currency: string }) {
  const sum = parseMoney(amount || '0', currency);
  const price = parseMoney(unit || '0', currency);
  const units = sum && price ? unitsForAmount(sum, price) : 0;
  if (!units) return <p className="text-caption text-secondary">Enter an amount and a price to see how many units it buys.</p>;
  return <p className="text-body rounded-xl bg-accent/[0.08] px-3 py-2">That buys <strong className="tabular-nums">{formatUnits(units)}</strong> {units < 1 ? 'of one unit' : units === 1 ? 'unit' : 'units'}.</p>;
}
