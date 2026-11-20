'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { notify } from '@/components/shared/message-dialog';
import Image from 'next/image';
import { ArrowLeft, Copy, ExternalLink, FileSearch, Loader2, MessageCircle, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
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
  const { t, locale } = useI18n();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // productId -> delivery link, loaded once the order is paid.
  const [links, setLinks] = useState<Record<string, string> | null>(null);
  const [linksFailed, setLinksFailed] = useState(false);
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
            if (prev?.status === 'PENDING' && data.status === 'PAID') notify.success(t('order.paidToast'));
            return data;
          });
          setError(null);
          if (isManualRefresh && data.status === 'PENDING') notify.info(t('order.notYet'), { description: t('order.notYetSub') });
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

  const loadLinks = useCallback(async () => {
    setLinksFailed(false);
    try {
      const list = await api.getDownloadLinks(invoiceId);
      setLinks(Object.fromEntries(list.map((link) => [link.productId, link.url])));
    } catch {
      setLinksFailed(true);
      notify.error(t('order.downloadFailed'), { description: t('order.downloadFailedSub') });
    }
  }, [invoiceId, t]);

  const paid = order?.status === 'PAID';
  useEffect(() => {
    if (paid) loadLinks();
  }, [paid, loadLinks]);

  const items = order?.items?.length ? order.items : order?.product ? [order.product] : [];
  const manual = order?.status === 'PENDING' ? order.manual_payment : null;
  const waUrl =
    order && manual?.whatsapp_number
      ? `https://wa.me/${manual.whatsapp_number}?text=${encodeURIComponent(
          t('order.waMessage', {
            invoice: order.invoice_id,
            name: order.buyer_name,
            products: items.map((item) => item.title).join(', '),
            total: formatRupiah(order.amount),
            url: typeof window === 'undefined' ? '' : window.location.href,
          }),
        )}`
      : null;
  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

  const copyInvoice = async () => {
    if (!order) return;
    await navigator.clipboard.writeText(order.invoice_id);
    notify.success(t('common.copied', { label: t('order.invoice') }));
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

            {order.status === 'PAID' && (
              <section aria-labelledby="your-products" className="space-y-2">
                <h2 id="your-products" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('order.yourProducts')}</h2>
                <ul className="space-y-2">
                  {items.map((item) => {
                    const url = links?.[item.id];
                    return (
                      <li key={item.id} className="flex items-center gap-3 rounded-2xl border bg-background/50 p-2">
                        <div className="relative aspect-square w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                          {item.thumbnail_url ? (
                            <Image src={item.thumbnail_url} alt="" fill sizes="56px" className="object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center bg-primary/10"><Sparkles className="h-5 w-5 text-primary/50" /></span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{formatRupiah(item.price)}</p>
                        </div>
                        {url ? (
                          <Button asChild variant="brand" size="sm" className="shrink-0">
                            <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${t('order.open')} ${item.title}`}>
                              {t('order.open')} <ExternalLink />
                            </a>
                          </Button>
                        ) : linksFailed ? (
                          <Button variant="outline" size="sm" className="shrink-0" onClick={loadLinks}>
                            <RefreshCw /> {t('common.retry')}
                          </Button>
                        ) : links ? null : (
                          <Loader2 className="mx-3 h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-label={t('order.downloading')} />
                        )}
                      </li>
                    );
                  })}
                </ul>
                {links && items.some((item) => !links[item.id]) && <p className="text-xs text-destructive">{t('order.downloadMissing')}</p>}
                <p className="flex items-center justify-center gap-1.5 pt-1 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-success" /> {t('order.downloadSafe')}
                </p>
              </section>
            )}

            {order.status === 'PAID' && <h2 className="-mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('order.detail')}</h2>}
            <motion.dl
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.35 } } }}
              className="divide-y rounded-2xl border bg-background/50 text-sm"
            >
              {[
                ...(order.status === 'PAID' ? [] : [[t('order.product'), items.map((item) => item.title).join(', ') || t('order.productDefault')]]),
                [t('order.buyer'), order.buyer_name],
                [t('order.email'), order.buyer_email],
                ...(order.buyer_phone ? [[t('order.phone'), order.buyer_phone]] : []),
                ...(order.paid_at ? [[t('order.paidAt'), formatDate(order.paid_at)]] : []),
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
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link href="/">{t('cart.continue')}</Link>
                </Button>
              )}
              {manual && (
                <section aria-labelledby="qris-title" className="space-y-4 text-center">
                  <h2 id="qris-title" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('order.qrisTitle')}</h2>
                  {manual.qris_image_url && (
                    <img src={manual.qris_image_url} alt={t('order.qrisAlt')} className="mx-auto w-full max-w-[280px] rounded-2xl border bg-white p-3" />
                  )}
                  <ol className="space-y-1.5 text-left text-sm">
                    {[t('order.qrisStep1'), t('order.qrisStep2', { amount: formatRupiah(order.amount) }), t('order.qrisStep3')].map((step, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  {waUrl && (
                    <Button asChild variant="brand" size="xl" className="w-full">
                      <a href={waUrl} target="_blank" rel="noopener noreferrer">
                        <MessageCircle /> {t('order.qrisConfirm')}
                      </a>
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">{t('order.qrisWait')}</p>
                </section>
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
