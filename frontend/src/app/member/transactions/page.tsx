'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { formatDateTime, useMember } from '@/context/MemberContext';
import { api } from '@/services/api';
import { ErrorState, StatusBadge } from '@/components/shared/feedback';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n, type MessageKey } from '@/lib/i18n';
import { cn, formatRupiah } from '@/lib/utils';
import type { MemberOrder, OrderStatus } from '@/types';

const PAGE_SIZE = 10;
// Filters only earn their space once there is something to filter.
const FILTERS_FROM = 6;
const STATUS_FILTERS: { value: OrderStatus | ''; label: MessageKey }[] = [
  { value: '', label: 'member.allStatus' },
  { value: 'PAID', label: 'member.statusPaid' },
  { value: 'PENDING', label: 'member.statusPending' },
  { value: 'EXPIRED', label: 'member.statusEnded' },
];
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA'); // YYYY-MM-DD in the viewer's zone

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
        // "Ended" groups both terminal failures: the buyer cares that it did not go through, not why.
        (!status || o.status === status || (status === 'EXPIRED' && o.status === 'FAILED')) &&
        (!q || o.invoice_id.toLowerCase().includes(q) || o.items.some((i) => i.title.toLowerCase().includes(q)))
      );
    });
  }, [orders, from, to, status, search]);
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
  if (!orders) return <>{title}<div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div></>;
  if (orders.length === 0) return <>{title}<p className="py-10 text-center text-sm text-muted-foreground">{t('member.noTransactions')}</p></>;

  return (
    <div>
      {title}
      {orders.length >= FILTERS_FROM && (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('member.status')}>
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={label}
                onClick={() => update(setStatus)(value)}
                aria-pressed={status === value}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm transition-colors',
                  status === value ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t(label)}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <label className="relative">
              <span className="sr-only">{t('member.search')}</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" value={search} onChange={(e) => update(setSearch)(e.target.value)} placeholder={t('member.searchTransactions')} className="pl-9" />
            </label>
            <Input type="date" value={from} max={to || undefined} onChange={(e) => update(setFrom)(e.target.value)} aria-label={t('member.dateFrom')} />
            <Input type="date" value={to} min={from || undefined} onChange={(e) => update(setTo)(e.target.value)} aria-label={t('member.dateTo')} />
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {t('member.noMatch')}{' '}
          {filtering && <button onClick={reset} className="font-medium text-foreground underline underline-offset-4">{t('member.reset')}</button>}
        </div>
      ) : (
        <ul className="divide-y border-y">
          {visible.map((o) => (
            <li key={o.invoice_id}>
              <button onClick={() => setSelected(o)} className="group flex w-full items-center gap-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium group-hover:underline">
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
              </button>
            </li>
          ))}
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

      <OrderDetailDialog order={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function OrderDetailDialog({ order, onClose }: { order: MemberOrder | null; onClose: () => void }) {
  const { t, intl } = useI18n();
  const { token } = useMember();
  const [links, setLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    setLinks({});
    if (order?.status !== 'PAID') return;
    api
      .memberAccess(token, order.invoice_id)
      .then((list) => setLinks(Object.fromEntries(list.map((l) => [l.productId, l.url]))))
      .catch(() => {});
  }, [order, token]);

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-md">
        {order && (
          <>
            <div className="border-b p-5">
              <div className="flex items-start justify-between gap-3 pr-8">
                <DialogTitle className="font-display text-lg">{t('member.receipt')}</DialogTitle>
                <StatusBadge status={order.status} />
              </div>
              <DialogDescription className="mt-1 text-xs">
                <span className="font-mono">{order.invoice_id}</span> · {formatDateTime(order.created_at, intl)}
              </DialogDescription>
            </div>

            <ul className="divide-y px-5">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                    {item.thumbnail_url && <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm">{item.title}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">1 × {formatRupiah(item.price)}</p>
                  </div>
                  {links[item.id] && (
                    <a href={links[item.id]} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
                      {t('member.open')}
                    </a>
                  )}
                </li>
              ))}
            </ul>

            <dl className="space-y-1.5 border-t p-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t('member.paymentMethod')}</dt>
                <dd>{order.payment_method === 'QRIS_MANUAL' ? 'QRIS' : t('member.onlinePayment')}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t('member.buyer')}</dt>
                <dd className="min-w-0 truncate text-right">{order.buyer_email}</dd>
              </div>
              <div className="flex justify-between gap-4 pt-2 text-base font-bold">
                <dt>{t('member.total')}</dt>
                <dd className="tabular-nums">{formatRupiah(order.amount)}</dd>
              </div>
            </dl>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
