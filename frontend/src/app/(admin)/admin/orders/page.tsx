'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Copy, CreditCard, Inbox, Mail, Package, RefreshCw, Search, User } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import { api } from '@/services/api';
import type { Order, OrderStatus } from '@/types';
import { cn, formatRupiah } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, ErrorState, StatusBadge } from '@/components/shared/feedback';
import { useI18n, type MessageKey } from '@/lib/i18n';

const FILTERS: { value: OrderStatus | 'ALL'; label: MessageKey }[] = [
  { value: 'ALL', label: 'store.all' },
  { value: 'PAID', label: 'status.PAID' },
  { value: 'PENDING', label: 'status.PENDING' },
  { value: 'FAILED', label: 'status.FAILED' },
  { value: 'EXPIRED', label: 'status.EXPIRED' },
];

export default function AdminOrdersPage() {
  const { token } = useAdmin();
  const { t, intl } = useI18n();
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString(intl, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async (manual = false) => {
    if (!token) return;
    try {
      if (manual) setRefreshing(true);
      else setLoading(true);
      setError(null);
      setOrders(await api.adminGetOrders(token, statusFilter === 'ALL' ? undefined : statusFilter));
      if (manual) toast.success(t('orders.reloaded'));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('orders.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token, statusFilter]);

  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase();
    return orders
      .filter(
        (o) =>
          o.invoice_id.toLowerCase().includes(q) ||
          o.buyer_name.toLowerCase().includes(q) ||
          o.buyer_email.toLowerCase().includes(q) ||
          o.product?.title.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [orders, search, sortOrder]);

  const paidTotal = filteredOrders.filter((o) => o.status === 'PAID').reduce((s, o) => s + o.amount, 0);

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied', { label }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('orders.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('orders.summary', { n: filteredOrders.length, amount: formatRupiah(paidTotal) })}
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchOrders(true)} disabled={refreshing}>
          <RefreshCw className={cn(refreshing && 'animate-spin')} /> {t('orders.reload')}
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" className="scrollbar-none glass flex gap-1 overflow-x-auto rounded-full p-1">
          {FILTERS.map(({ value, label }) => {
            const active = statusFilter === value;
            return (
              <button
                key={value}
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(value)}
                className={cn('relative whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors', active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                {active && <motion.span layoutId="order-filter" className="absolute inset-0 rounded-full bg-primary" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                <span className="relative">{t(label)}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 lg:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t('orders.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => setSortOrder((s) => (s === 'asc' ? 'desc' : 'asc'))} aria-label={t('orders.sort')}>
                {sortOrder === 'desc' ? <ArrowDownWideNarrow /> : <ArrowUpNarrowWide />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{sortOrder === 'desc' ? t('orders.newest') : t('orders.oldest')}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => fetchOrders()} retrying={loading} />
      ) : loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState icon={Inbox} title={t('orders.empty')} description={search ? t('orders.emptySearch') : t('orders.emptyStatus')} />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.invoice')}</TableHead>
                <TableHead>{t('table.buyer')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('table.product')}</TableHead>
                <TableHead>{t('table.total')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('table.time')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order, i) => (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 12) * 0.03 }}
                  onClick={() => setViewingOrder(order)}
                  className="cursor-pointer border-b transition-colors hover:bg-primary/5"
                >
                  <TableCell className="font-mono text-xs text-primary">{order.invoice_id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{order.buyer_name}</div>
                    <div className="text-xs text-muted-foreground">{order.buyer_email}</div>
                  </TableCell>
                  <TableCell className="hidden max-w-[200px] truncate md:table-cell">{order.product?.title ?? '-'}</TableCell>
                  <TableCell className="font-mono font-semibold">{formatRupiah(order.amount)}</TableCell>
                  <TableCell><StatusBadge status={order.status} /></TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{formatDate(order.created_at)}</TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={!!viewingOrder} onOpenChange={(o) => !o && setViewingOrder(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {viewingOrder && (
            <>
              <SheetHeader>
                <SheetTitle>{t('orders.detail')}</SheetTitle>
                <SheetDescription asChild>
                  <button onClick={() => copy(viewingOrder.invoice_id, t('table.invoice'))} className="inline-flex items-center gap-1.5 font-mono text-xs hover:text-foreground">
                    #{viewingOrder.invoice_id} <Copy className="h-3 w-3" />
                  </button>
                </SheetDescription>
              </SheetHeader>
              <motion.div
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.06 } } }}
                className="mt-6 space-y-4"
              >
                <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="rounded-2xl bg-primary/10 p-5">
                  <p className="text-xs text-muted-foreground">{t('order.total')}</p>
                  <p className="font-mono text-3xl font-bold">{formatRupiah(viewingOrder.amount)}</p>
                  <div className="mt-3"><StatusBadge status={viewingOrder.status} /></div>
                </motion.div>
                {[
                  { icon: User, label: t('order.buyer'), value: viewingOrder.buyer_name },
                  { icon: Mail, label: t('order.email'), value: viewingOrder.buyer_email, copy: true },
                  { icon: Package, label: t('order.product'), value: viewingOrder.product?.title ?? '-' },
                  { icon: CreditCard, label: t('orders.doku'), value: viewingOrder.doku_reference_id ?? '-' },
                ].map(({ icon: Icon, label, value, copy: canCopy }) => (
                  <motion.div key={label} variants={{ hidden: { opacity: 0, x: 12 }, show: { opacity: 1, x: 0 } }} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="truncate text-sm font-medium">{value}</p>
                    </div>
                    {canCopy && (
                      <Button variant="ghost" size="icon" onClick={() => copy(value, label)} aria-label={t('orders.copy', { label })}><Copy /></Button>
                    )}
                  </motion.div>
                ))}
                <Separator />
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>{t('orders.created', { date: formatDate(viewingOrder.created_at) })}</p>
                  <p>{t('orders.updated', { date: formatDate(viewingOrder.updated_at) })}</p>
                </div>
                <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">{t('orders.emailNote')}</p>
              </motion.div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
