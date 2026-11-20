'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, ExternalLink, Hash, Loader2, Tag } from 'lucide-react';
import { formatDateTime, useMember, type Purchase } from '@/context/MemberContext';
import { api } from '@/services/api';
import { ErrorState } from '@/components/shared/feedback';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useI18n } from '@/lib/i18n';
import { CopyButton, rise, stagger } from './shared';

/** Side panel for one purchased product: cover, its link, and where it came from. */
export function PurchaseSheet({ purchase, onClose }: { purchase: (Purchase & { count?: number }) | null; onClose: () => void }) {
  const { t, intl } = useI18n();
  const { token } = useMember();
  // undefined = loading, null = this product has no link
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Fetch the link as soon as the panel opens: an <a> click opens it, so popup blockers never interfere.
  useEffect(() => {
    if (!purchase) return;
    setError(null);
    setUrl(undefined);
    api
      .memberAccess(token, purchase.invoiceId)
      .then((links) => setUrl(links.find((l) => l.productId === purchase.item.id)?.url ?? null))
      .catch((err) => setError(err instanceof Error ? err.message : t('member.loadFailed')));
  }, [token, purchase, attempt, t]);

  return (
    <Sheet open={!!purchase} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {purchase && (
          <>
            <SheetHeader>
              <SheetTitle className="pr-6 text-left leading-snug">{purchase.item.title}</SheetTitle>
              <SheetDescription className="text-left">{purchase.item.category || t('member.product')}</SheetDescription>
            </SheetHeader>

            <motion.div initial="hidden" animate="show" variants={stagger} className="mt-6 space-y-5">
              {purchase.item.thumbnail_url && (
                <motion.img variants={rise} src={purchase.item.thumbnail_url} alt="" className="w-full rounded-2xl border object-cover" />
              )}

              <motion.div variants={rise}>
                {error ? (
                  <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />
                ) : url === null ? (
                  <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{t('member.noLink')}</p>
                ) : (
                  <motion.a
                    href={url ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={!url}
                    whileHover={url ? { y: -2 } : undefined}
                    whileTap={url ? { scale: 0.98 } : undefined}
                    className={`flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground shadow-lg shadow-primary/25 ${url ? '' : 'pointer-events-none opacity-60'}`}
                  >
                    {url ? <ExternalLink className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />} {t('member.openProduct')}
                  </motion.a>
                )}
                <p className="mt-2 text-center text-xs text-muted-foreground">{t('member.linkHint')}</p>
              </motion.div>

              <motion.dl variants={rise} className="divide-y rounded-2xl border">
                {[
                  { icon: CalendarDays, label: t('member.lastBought'), value: formatDateTime(purchase.paidAt, intl) },
                  ...(purchase.count && purchase.count > 1 ? [{ icon: Tag, label: t('member.timesBought'), value: t('member.boughtTimes', { n: purchase.count }) }] : []),
                  { icon: Hash, label: t('member.trxIdLabel'), value: purchase.invoiceId, copy: true },
                ].map(({ icon: Icon, label, value, copy }) => (
                  <div key={label} className="flex items-center gap-3 p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className={`truncate text-sm font-medium ${copy ? 'font-mono text-xs' : ''}`}>{value}</dd>
                    </div>
                    {copy && <CopyButton value={value} label={label} />}
                  </div>
                ))}
              </motion.dl>

              {purchase.item.description && (
                <motion.p variants={rise} className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {purchase.item.description}
                </motion.p>
              )}
            </motion.div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
