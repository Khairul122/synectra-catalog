'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Receipt, Search, X } from 'lucide-react';
import { formatDateTime, useMember } from '@/context/MemberContext';
import { OrderSheet } from '@/components/member/OrderSheet';
import { ErrorState, StatusBadge } from '@/components/shared/feedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n, type MessageKey } from '@/lib/i18n';
import { cn, formatRupiah } from '@/lib/utils';
import type { MemberOrder, OrderStatus } from '@/types';

const PAGE_SIZE = 10;
const STATUS_FILTERS: { value: OrderStatus | ''; label: MessageKey }[] = [
  { value: '', label: 'member.allStatus' },
  { value: 'PAID', label: 'member.statusPaid' },
  { value: 'PENDING', label: 'member.statusPending' },
  { value: 'EXPIRED', label: 'member.statusEnded' },
];
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA'); // YYYY-MM-DD in the viewer's zone
// "Ended" groups both terminal failures: the buyer cares that it did not go through, not why.
const matchesStatus = (o: MemberOrder, status: OrderStatus | '') => !status || o.status === status || (status === 'EXPIRED' && o.status === 'FAILED');

export default function MemberTransactionsPage() {
  const { t, intl } = useI18n();
  const { orders, ordersError, reloadOrders } = useMember();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MemberOrder | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (orders ?? []).filter((o) => {
      const day = dayKey(o.created_at);
      return (
        (!from || day >= from) &&
        (!to || day <= to) &&
        matchesStatus(o, status) &&
        (!q || o.invoice_id.toLowerCase().includes(q) || o.items.some((i) => i.title.toLowerCase().includes(q)))
      );
    });
  }, [orders, from, to, status, search]);
  const counts = useMemo(() => Object.fromEntries(STATUS_FILTERS.map(({ value }) => [value, (orders ?? []).filter((o) => matchesStatus(o, value)).length])), [orders]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const filtering = Boolean(from || to || status || search);

  const update = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };
  const reset = () => {
    setFrom('');
    setTo('');
    setStatus('');
    setSearch('');
    setPage(1);
  };

  const title = <h1 className="py-6 font-display text-3xl font-bold">{t('member.nav.transactions')}</h1>;
  if (ordersError) return <>{title}<ErrorState message={ordersError} onRetry={reloadOrders} /></>;
  if (!orders) return <>{title}<div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div></>;
  if (orders.length === 0) {
    return (
      <>
        {title}
        <div className="rounded-2xl border border-dashed bg-card/60 px-6 py-14 text-center">
          <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{t('member.noTransactions')}</p>
        </div>
      </>
    );
  }

  return (
    <div>
      {title}
      <div className="mb-4 space-y-3">
        <div role="tablist" aria-label={t('member.status')} className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border bg-card p-1">
          {STATUS_FILTERS.map(({ value, label }) => {
            const active = status === value;
            return (
              <button
                key={label}
                role="tab"
                aria-selected={active}
                onClick={() => update(setStatus)(value)}
                className={cn('relative flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors', active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                {active && <motion.span layoutId="trx-filter" className="absolute inset-0 rounded-full bg-primary" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                <span className="relative">{t(label)}</span>
                <span className={cn('relative rounded-full px-1.5 text-[11px] tabular-nums', active ? 'bg-white/20' : 'bg-muted')}>{counts[value]}</span>
              </button>
            );
          })}
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <label className="relative">
            <span className="sr-only">{t('member.search')}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={search} onChange={(e) => update(setSearch)(e.target.value)} placeholder={t('member.searchTransactions')} className="pl-9" />
          </label>
          <Input type="date" value={from} max={to || undefined} onChange={(e) => update(setFrom)(e.target.value)} aria-label={t('member.dateFrom')} />
          <Input type="date" value={to} min={from || undefined} onChange={(e) => update(setTo)(e.target.value)} aria-label={t('member.dateTo')} />
          <AnimatePresence>
            {filtering && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                <Button variant="ghost" onClick={reset} className="w-full"><X /> {t('member.reset')}</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t('member.noMatch')}</p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border bg-card">
          <AnimatePresence initial={false}>
            {visible.map((o, i) => (
              <motion.li
                key={o.invoice_id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.03 } }}
                exit={{ opacity: 0 }}
                className="border-b last:border-0"
              >
                <button
                  onClick={() => setSelected(o)}
                  className={cn(
                    'group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/5 focus-visible:bg-primary/5 focus-visible:outline-none',
                    selected?.invoice_id === o.invoice_id && 'bg-primary/5',
                  )}
                >
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {o.items[0]?.thumbnail_url && <img src={o.items[0].thumbnail_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {o.items[0]?.title ?? o.invoice_id}
                      {o.items.length > 1 && <span className="text-muted-foreground"> {t('member.moreItems', { n: o.items.length - 1 })}</span>}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {formatDateTime(o.created_at, intl)} · <span className="font-mono">{o.invoice_id}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums">{formatRupiah(o.amount)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label={t('member.pagination')} className="mt-4 flex items-center justify-between text-sm">
          <Button variant="outline" size="sm" disabled={current === 1} onClick={() => setPage(current - 1)}>{t('member.prev')}</Button>
          <span className="text-muted-foreground">
            {t('member.range', { from: (current - 1) * PAGE_SIZE + 1, to: Math.min(current * PAGE_SIZE, filtered.length), total: filtered.length })}
          </span>
          <Button variant="outline" size="sm" disabled={current === pages} onClick={() => setPage(current + 1)}>{t('member.next')}</Button>
        </nav>
      )}

      <OrderSheet order={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
