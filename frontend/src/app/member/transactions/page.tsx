'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ClipboardList, Search } from 'lucide-react';
import { formatDateTime, useMember } from '@/context/MemberContext';
import { api } from '@/services/api';
import { EmptyState, ErrorState, StatusBadge } from '@/components/shared/feedback';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n';
import { formatRupiah, selectClass } from '@/lib/utils';
import type { MemberOrder, OrderStatus } from '@/types';

const STATUSES: OrderStatus[] = ['PAID', 'PENDING', 'FAILED', 'EXPIRED'];
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA'); // YYYY-MM-DD in the viewer's zone

export default function MemberTransactionsPage() {
  const { t, intl } = useI18n();
  const { orders, ordersError, reloadOrders } = useMember();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MemberOrder | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (orders ?? []).filter((o) => {
      const day = dayKey(o.created_at);
      return (
        (!from || day >= from) &&
        (!to || day <= to) &&
        (!status || o.status === status) &&
        (!q || o.invoice_id.toLowerCase().includes(q) || o.items.some((i) => i.title.toLowerCase().includes(q)))
      );
    });
  }, [orders, from, to, status, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize);

  const reset = () => {
    setFrom('');
    setTo('');
    setStatus('');
    setSearch('');
    setPage(1);
  };
  const filterChange = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <div>
      <h1 className="py-6 font-display text-3xl font-bold">{t('member.transactionsTitle')}</h1>
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[auto_auto_auto_1fr_auto]">
          <label>
            <span className="sr-only">{t('member.dateFrom')}</span>
            <Input type="date" value={from} max={to || undefined} onChange={(e) => filterChange(setFrom)(e.target.value)} aria-label={t('member.dateFrom')} />
          </label>
          <label>
            <span className="sr-only">{t('member.dateTo')}</span>
            <Input type="date" value={to} min={from || undefined} onChange={(e) => filterChange(setTo)(e.target.value)} aria-label={t('member.dateTo')} />
          </label>
          <label>
            <span className="sr-only">{t('member.status')}</span>
            <select value={status} onChange={(e) => filterChange(setStatus)(e.target.value)} className={selectClass}>
              <option value="">{t('member.allStatus')}</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="relative">
            <span className="sr-only">{t('member.search')}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={search} onChange={(e) => filterChange(setSearch)(e.target.value)} placeholder={t('member.search')} className="pl-9" />
          </label>
          <Button variant="outline" onClick={reset}>{t('member.reset')}</Button>
        </div>

        <div className="mt-4">
          {ordersError ? (
            <ErrorState message={ordersError} onRetry={reloadOrders} />
          ) : !orders ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : visible.length === 0 ? (
            <EmptyState icon={ClipboardList} title={orders.length ? t('member.noMatch') : t('member.noTransactions')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-3 font-semibold">#</th>
                    <th className="px-2 py-3 font-semibold">{t('member.trxId')}</th>
                    <th className="px-2 py-3 font-semibold">{t('member.date')}</th>
                    <th className="px-2 py-3 font-semibold">{t('member.status')}</th>
                    <th className="px-2 py-3 text-right font-semibold">{t('member.amount')}</th>
                    <th className="px-2 py-3"><span className="sr-only">{t('member.details')}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((o, i) => (
                    <tr key={o.invoice_id} className="border-b last:border-0">
                      <td className="px-2 py-3 text-muted-foreground">{(current - 1) * pageSize + i + 1}</td>
                      <td className="px-2 py-3 font-mono text-xs">{o.invoice_id}</td>
                      <td className="px-2 py-3 whitespace-nowrap">{formatDateTime(o.created_at, intl)}</td>
                      <td className="px-2 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-2 py-3 text-right whitespace-nowrap">{formatRupiah(o.amount)}</td>
                      <td className="px-2 py-3 text-right">
                        <Button size="sm" onClick={() => setSelected(o)}>{t('member.details')}</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {orders && orders.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              {t('member.show')}
              <select value={pageSize} onChange={(e) => filterChange(setPageSize)(Number(e.target.value))} className={`${selectClass} w-auto`}>
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <nav aria-label={t('member.pagination')} className="flex items-center gap-1">
              {[
                { icon: ChevronsLeft, to: 1, label: t('member.first') },
                { icon: ChevronLeft, to: current - 1, label: t('member.prev') },
              ].map(({ icon: Icon, to: target, label }) => (
                <Button key={label} variant="ghost" size="icon" disabled={current === 1} onClick={() => setPage(target)} aria-label={label}><Icon /></Button>
              ))}
              <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-primary px-2 text-sm font-semibold text-primary-foreground">{current}</span>
              {[
                { icon: ChevronRight, to: current + 1, label: t('member.next') },
                { icon: ChevronsRight, to: pages, label: t('member.last') },
              ].map(({ icon: Icon, to: target, label }) => (
                <Button key={label} variant="ghost" size="icon" disabled={current === pages} onClick={() => setPage(target)} aria-label={label}><Icon /></Button>
              ))}
            </nav>
          </div>
        )}
      </div>

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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {order && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="text-xs font-semibold text-muted-foreground">{t('member.buyerInfo')}</DialogTitle>
                <DialogDescription asChild>
                  <div className="text-sm text-foreground">
                    <p className="truncate">{order.buyer_email}</p>
                    {order.buyer_phone && <p>{order.buyer_phone}</p>}
                  </div>
                </DialogDescription>
              </div>
              <StatusBadge status={order.status} />
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground">{t('member.orderSummary')}</p>
              <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                <span>{t('member.trxId')}: <span className="font-mono">{order.invoice_id}</span></span>
                <span>{formatDateTime(order.created_at, intl)}</span>
              </div>
            </div>

            <ul className="divide-y rounded-xl border">
              {order.items.map((item) => (
                <li key={item.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {item.thumbnail_url && (
                        <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <p className="line-clamp-2 min-w-0 flex-1 text-sm">{item.title}</p>
                    <span className="text-xs text-muted-foreground">1x</span>
                    <span className="whitespace-nowrap text-sm font-semibold">{formatRupiah(item.price)}</span>
                  </div>
                  {links[item.id] && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/60 p-2">
                      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{t('member.linkIntro')}</span>
                      <a href={links[item.id]} target="_blank" rel="noopener noreferrer" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
                        {t('member.access')}
                      </a>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('member.paymentMethod')}</dt>
                <dd>{order.payment_method === 'QRIS_MANUAL' ? 'QRIS' : t('member.onlinePayment')}</dd>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold">
                <dt>{t('member.total')}</dt>
                <dd>{formatRupiah(order.amount)}</dd>
              </div>
            </dl>

            <Button onClick={onClose} className="w-full">{t('member.close')}</Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
