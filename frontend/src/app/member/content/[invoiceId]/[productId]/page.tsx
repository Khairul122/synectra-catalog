'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Eye, Loader2, Package } from 'lucide-react';
import { formatDateTime, purchasesOf, useMember } from '@/context/MemberContext';
import { api } from '@/services/api';
import { EmptyState, ErrorState } from '@/components/shared/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n';

export default function MemberContentPage() {
  const { t, intl } = useI18n();
  const { token, orders } = useMember();
  const params = useParams<{ invoiceId: string; productId: string }>();
  const invoiceId = decodeURIComponent(params.invoiceId);
  const purchase = useMemo(
    () => purchasesOf(orders ?? []).find((p) => p.invoiceId === invoiceId && p.item.id === params.productId),
    [orders, invoiceId, params.productId],
  );
  // undefined = loading, null = this product has no link
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Fetch the link up front: an <a> click opens it, so popup blockers never interfere.
  useEffect(() => {
    if (!purchase) return;
    setError(null);
    setUrl(undefined);
    api
      .memberAccess(token, purchase.invoiceId)
      .then((links) => setUrl(links.find((l) => l.productId === purchase.item.id)?.url ?? null))
      .catch((err) => setError(err instanceof Error ? err.message : t('member.loadFailed')));
  }, [token, purchase, attempt, t]);

  const back = (
    <div className="flex items-center gap-3 py-6">
      <Link href="/member" aria-label={t('member.back')} className="rounded-full p-2 hover:bg-muted">
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <h1 className="font-display text-2xl font-bold">{t('member.contentTitle')}</h1>
    </div>
  );

  if (!orders) return <>{back}<Skeleton className="h-96 rounded-2xl" /></>;
  if (!purchase) return <>{back}<EmptyState icon={Package} title={t('member.contentMissing')} /></>;

  const { item, paidAt } = purchase;
  return (
    <div>
      {back}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-display text-2xl font-bold leading-tight">{item.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{formatDateTime(paidAt, intl)}</p>
          {item.thumbnail_url && (
            <img src={item.thumbnail_url} alt={item.title} className="mt-4 w-full rounded-xl border object-cover" />
          )}
          {item.description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
        </article>

        <aside className="h-fit rounded-2xl border bg-card p-5 shadow-sm lg:sticky lg:top-16">
          <p className="text-sm text-muted-foreground">{t('member.linkIntro')}</p>
          {error ? (
            <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} className="mt-3" />
          ) : url === null ? (
            <p className="mt-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{t('member.noLink')}</p>
          ) : (
            <a
              href={url ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!url}
              className={`mt-3 flex h-14 items-center justify-center gap-2 rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-opacity hover:opacity-90 ${url ? '' : 'pointer-events-none opacity-60'}`}
            >
              {url ? <Eye className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />} {t('member.accessLink')}
            </a>
          )}
        </aside>
      </div>
    </div>
  );
}
