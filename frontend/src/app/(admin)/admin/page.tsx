'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, Inbox, Palette, Plus, ShoppingBag, TrendingUp, Wallet, Zap, type LucideIcon } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import { api } from '@/services/api';
import { formatRupiah } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AnimatedNumber, EmptyState, ErrorState, StatusBadge } from '@/components/shared/feedback';
import type { AdminAnalytics, Order } from '@/types';
import { useI18n } from '@/lib/i18n';

export default function AdminDashboardPage() {
  const { token } = useAdmin();
  const { t, intl } = useI18n();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    setLoading(true);
    setError(null);
    Promise.all([api.adminGetAnalytics(token), api.adminGetOrders(token)])
      .then(([analyticsData, ordersData]) => {
        if (!isMounted) return;
        setAnalytics(analyticsData);
        setRecentOrders(ordersData);
      })
      .catch((err) => isMounted && setError(err.message || t('dash.loadError')))
      .finally(() => isMounted && setLoading(false));
    return () => {
      isMounted = false;
    };
  }, [token, reloadKey]);

  const revenue = analytics?.totalRevenue || 0;
  const totalOrders = analytics?.totalOrders || 0;
  const paidOrders = analytics?.paidOrdersCount || 0;
  const pending = analytics?.pendingOrdersCount || 0;
  const conversionRate = totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0;

  const stats: { label: string; value: number; format?: (n: number) => string; hint: string; icon: LucideIcon; tone: string }[] = [
    { label: t('dash.revenue'), value: revenue, format: (n) => formatRupiah(Math.round(n)), hint: t('dash.revenueHint'), icon: Wallet, tone: 'bg-emerald-500' },
    { label: t('dash.paid'), value: paidOrders, hint: t('dash.paidHint', { n: totalOrders }), icon: ShoppingBag, tone: 'bg-primary' },
    { label: t('dash.conversion'), value: conversionRate, format: (n) => `${n.toFixed(1)}%`, hint: t('dash.conversionHint'), icon: TrendingUp, tone: 'bg-indigo' },
    { label: t('dash.pending'), value: pending, hint: t('dash.pendingHint'), icon: Zap, tone: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold">
            {t('dash.hello')} <span className="text-primary">creator</span> 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('dash.sub')}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="brand">
            <Link href="/admin/products"><Plus /> {t('dash.addProduct')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/appearance"><Palette /> {t('dash.customize')}</Link>
          </Button>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} retrying={loading} />
      ) : (
        <>
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {stats.map(({ label, value, format, hint, icon: Icon, tone }) => (
              <motion.div
                key={label}
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -4 }}
                className="glass group relative overflow-hidden rounded-2xl p-5 transition-shadow hover:shadow-glow"
              >
                <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full ${tone} opacity-10 transition-all duration-300 group-hover:scale-125 group-hover:opacity-20`} />
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone} text-white shadow-lg transition-transform group-hover:rotate-6 group-hover:scale-110`}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                {loading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <p className="font-mono text-2xl font-bold tracking-tight">
                    <AnimatedNumber value={value} format={format} />
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{t('dash.recent')}</h2>
                <p className="text-sm text-muted-foreground">{t('dash.recentSub')}</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/orders">{t('dash.seeAll')} <ArrowUpRight /></Link>
              </Button>
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
              </div>
            ) : recentOrders.length === 0 ? (
              <EmptyState icon={Inbox} title={t('dash.empty')} description={t('dash.emptySub')} className="border-0 bg-transparent" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.invoice')}</TableHead>
                    <TableHead>{t('table.buyer')}</TableHead>
                    <TableHead>{t('table.total')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('table.time')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.slice(0, 5).map((order, i) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.05 }}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="font-mono text-xs text-primary">{order.invoice_id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{order.buyer_name}</div>
                        <div className="text-xs text-muted-foreground">{order.buyer_email}</div>
                      </TableCell>
                      <TableCell className="font-mono font-semibold">{formatRupiah(order.amount)}</TableCell>
                      <TableCell><StatusBadge status={order.status} /></TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                        {new Date(order.created_at).toLocaleDateString(intl, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
