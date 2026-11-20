'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Download, ExternalLink, FileSearch, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { api } from '@/services/api';
import { formatRupiah } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, StatusBadge } from '@/components/shared/feedback';
import { Preferences } from '@/components/shared/theme-toggle';
import { useI18n } from '@/lib/i18n';
import type { Order, OrderStatus } from '@/types';

export default function OrderStatusPage() {
  const params = useParams();
  const invoiceId = params?.invoiceId as string;
  const { t } = useI18n();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(
    async (isManualRefresh = false) => {
      if (!invoiceId) return;
      if (isManualRefresh) setRefreshing(true);
      try {
        const data = await api.getOrder(invoiceId);
        if (!data) {
          setError(t('order.notFoundInvoice'));
        } else {
          setOrder((prev) => {
            if (prev?.status === 'PENDING' && data.status === 'PAID') toast.success(t('order.paidToast'));
            return data;
          });
          setError(null);
          if (isManualRefresh && data.status === 'PENDING') toast.info(t('order.notYet'), { description: t('order.notYetSub') });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('order.loadError'));
      } finally {
        setLoading(false);
        if (isManualRefresh) setRefreshing(false);
      }
    },
    [invoiceId, t],
  );

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Polling otomatis setiap 5 detik bila status masih PENDING
  useEffect(() => {
    if (!order || order.status !== 'PENDING') return;
    const interval = setInterval(() => fetchOrder(), 5000);
    return () => clearInterval(interval);
  }, [order, fetchOrder]);

  const handleDownload = async () => {
    if (!order || order.status !== 'PAID') return;
    setDownloading(true);
    try {
      const url = await api.getDownloadLink(order.invoice_id);
      if (url) window.open(url, '_blank');
      else toast.error(t('order.downloadMissing'));
    } catch (err) {
      toast.error(t('order.downloadFailed'), { description: err instanceof Error ? err.message : undefined });
    } finally {
      setDownloading(false);
    }
  };

  const copyInvoice = async () => {
    if (!order) return;
    await navigator.clipboard.writeText(order.invoice_id);
    toast.success(t('common.copied', { label: t('order.invoice') }));
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      </div>
      <div className="fixed right-4 top-4 z-40">
        <Preferences />
      </div>

      <div className="w-full max-w-md space-y-4">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href="/">
            <ArrowLeft /> {t('order.back')}
          </Link>
        </Button>

        {loading ? (
          <div className="glass space-y-4 rounded-3xl p-8">
            <Skeleton className="mx-auto h-20 w-20 rounded-full" />
            <Skeleton className="mx-auto h-6 w-48" />
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : error || !order ? (
          <EmptyState
            icon={FileSearch}
            title={t('order.notFound')}
            description={error || t('order.notFoundSub')}
            action={
              <Button asChild variant="brand">
                <Link href="/">{t('order.toCatalog')}</Link>
              </Button>
            }
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            className="glass space-y-6 rounded-3xl p-6 shadow-2xl shadow-black/5 sm:p-8"
          >
            <div className="space-y-3 text-center">
              <StatusIcon status={order.status} />
              <motion.h1 key={order.status} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-2xl font-bold">
                {t(`order.${order.status}.title`)}
              </motion.h1>
              <p className="text-sm text-muted-foreground">{t(`order.${order.status}.sub`)}</p>
              <button onClick={copyInvoice} className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground">
                #{order.invoice_id} <Copy className="h-3 w-3" />
              </button>
            </div>

            <motion.dl
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.35 } } }}
              className="divide-y rounded-2xl border bg-background/50 text-sm"
            >
              {[
                [t('order.product'), order.product?.title || t('order.productDefault')],
                [t('order.buyer'), order.buyer_name],
                [t('order.email'), order.buyer_email],
                [t('order.status'), <StatusBadge key="s" status={order.status} />],
              ].map(([k, v]) => (
                <motion.div key={k as string} variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }} className="flex items-center justify-between gap-4 px-4 py-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="truncate text-right font-medium">{v}</dd>
                </motion.div>
              ))}
              <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="flex items-center justify-between px-4 py-3">
                <dt className="text-muted-foreground">{t('order.total')}</dt>
                <dd className="font-mono text-lg font-bold text-primary">{formatRupiah(order.amount)}</dd>
              </motion.div>
            </motion.dl>

            <div className="space-y-3">
              {order.status === 'PAID' && (
                <>
                  <Button variant="brand" size="xl" className="w-full" onClick={handleDownload} disabled={downloading}>
                    {downloading ? <Loader2 className="animate-spin" /> : <Download />}
                    {downloading ? t('order.downloading') : t('order.download')}
                  </Button>
                  <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-success" /> {t('order.downloadSafe')}
                  </p>
                </>
              )}
              {order.status === 'PENDING' && (
                <>
                  {order.payment_url && (
                    <Button asChild variant="brand" size="xl" className="w-full">
                      <a href={order.payment_url} target="_blank" rel="noopener noreferrer">
                        {t('order.continuePay')} <ExternalLink />
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="lg" className="w-full" onClick={() => fetchOrder(true)} disabled={refreshing}>
                    <RefreshCw className={refreshing ? 'animate-spin' : ''} /> {t('order.check')}
                  </Button>
                </>
              )}
              {(order.status === 'FAILED' || order.status === 'EXPIRED') && (
                <Button asChild variant="brand" size="xl" className="w-full">
                  <Link href="/">{t('order.reorder')}</Link>
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}

function StatusIcon({ status }: { status: OrderStatus }) {
  const color = status === 'PAID' ? 'text-success' : status === 'PENDING' ? 'text-warning' : 'text-destructive';
  const bg = status === 'PAID' ? 'bg-success/15' : status === 'PENDING' ? 'bg-warning/15' : 'bg-destructive/15';

  return (
    <div className="relative mx-auto h-20 w-20">
      {status === 'PAID' &&
        Array.from({ length: 8 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-success"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos((i / 8) * Math.PI * 2) * 56, y: Math.sin((i / 8) * Math.PI * 2) * 56, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.9, delay: 0.45, ease: 'easeOut' }}
          />
        ))}
      {status === 'PENDING' && <span className="absolute inset-0 animate-ping rounded-full bg-warning/20" />}
      <motion.div
        key={status}
        initial={{ scale: 0 }}
        animate={{ scale: 1, x: status === 'FAILED' || status === 'EXPIRED' ? [0, -6, 6, -3, 3, 0] : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 15 }}
        className={`relative flex h-full w-full items-center justify-center rounded-full ${bg} ${color}`}
      >
        <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          {status === 'PAID' && <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2, duration: 0.5 }} />}
          {status === 'PENDING' && (
            <>
              <circle cx="12" cy="12" r="9" />
              <motion.path d="M12 7v5l3 2" style={{ originX: '12px', originY: '12px' }} animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }} />
            </>
          )}
          {(status === 'FAILED' || status === 'EXPIRED') && (
            <>
              <motion.path d="M7 7l10 10" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2, duration: 0.3 }} />
              <motion.path d="M17 7L7 17" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4, duration: 0.3 }} />
            </>
          )}
        </svg>
      </motion.div>
    </div>
  );
}
