'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, CreditCard, ExternalLink, Mail, Phone, QrCode } from 'lucide-react';
import { formatDateTime, useMember } from '@/context/MemberContext';
import { api } from '@/services/api';
import { StatusBadge } from '@/components/shared/feedback';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useI18n } from '@/lib/i18n';
import { formatRupiah } from '@/lib/utils';
import type { MemberOrder } from '@/types';
import { CopyButton, rise, stagger } from './shared';

/** Side panel receipt for one transaction, with purchase links once it is paid. */
export function OrderSheet({ order, onClose }: { order: MemberOrder | null; onClose: () => void }) {
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
    <Sheet open={!!order} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {order && (
          <>
            <SheetHeader>
              <SheetTitle className="text-left">{t('member.receipt')}</SheetTitle>
              <SheetDescription asChild>
                <div className="flex items-center gap-1 text-left">
                  <span className="min-w-0 truncate font-mono text-xs">#{order.invoice_id}</span>
                  <CopyButton value={order.invoice_id} label={t('member.trxIdLabel')} />
                </div>
              </SheetDescription>
            </SheetHeader>

            <motion.div initial="hidden" animate="show" variants={stagger} className="mt-4 space-y-4">
              <motion.div variants={rise} className="rounded-2xl bg-primary/10 p-5">
                <p className="text-xs text-muted-foreground">{t('member.total')}</p>
                <p className="font-mono text-3xl font-bold tabular-nums">{formatRupiah(order.amount)}</p>
                <div className="mt-3"><StatusBadge status={order.status} /></div>
                {order.status === 'PENDING' && <p className="mt-3 text-xs text-muted-foreground">{t('member.pendingHint')}</p>}
              </motion.div>

              <motion.ul variants={rise} className="divide-y rounded-2xl border">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 p-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {item.thumbnail_url && <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">1 × {formatRupiah(item.price)}</p>
                    </div>
                    {links[item.id] && (
                      <motion.a
                        href={links[item.id]}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                      >
                        {t('member.open')} <ExternalLink className="h-3 w-3" />
                      </motion.a>
                    )}
                  </li>
                ))}
              </motion.ul>

              {[
                { icon: CalendarDays, label: t('member.orderedAt'), value: formatDateTime(order.created_at, intl) },
                { icon: order.payment_method === 'QRIS_MANUAL' ? QrCode : CreditCard, label: t('member.paymentMethod'), value: order.payment_method === 'QRIS_MANUAL' ? 'QRIS' : t('member.onlinePayment') },
                { icon: Mail, label: t('member.buyer'), value: order.buyer_email },
                ...(order.buyer_phone ? [{ icon: Phone, label: t('member.phone'), value: order.buyer_phone }] : []),
              ].map(({ icon: Icon, label, value }) => (
                <motion.div key={label} variants={{ hidden: { opacity: 0, x: 12 }, show: { opacity: 1, x: 0 } }} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="truncate text-sm font-medium">{value}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
