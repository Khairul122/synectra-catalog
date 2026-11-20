'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { formatDate, purchasesOf, useMember } from '@/context/MemberContext';
import { api } from '@/services/api';
import { ErrorState } from '@/components/shared/feedback';
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
    <Link href="/member" className="mb-5 mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> {t('member.nav.purchases')}
    </Link>
  );

  if (!orders) return <>{back}<Skeleton className="h-72 rounded-lg" /></>;
  if (!purchase) {
    return (
      <>
        {back}
        <p className="py-8 text-center text-sm text-muted-foreground">{t('member.contentMissing')}</p>
      </>
    );
  }

  const { item, paidAt } = purchase;
  return (
    <article>
      {back}
      <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">{item.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t('member.boughtOn', { date: formatDate(paidAt, intl) })} · <span className="font-mono text-xs">{purchase.invoiceId}</span>
      </p>

      <div className="mt-5">
        {error ? (
          <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />
        ) : url === null ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{t('member.noLink')}</p>
        ) : (
          <a
            href={url ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!url}
            className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto ${url ? '' : 'pointer-events-none opacity-60'}`}
          >
            {url ? <ExternalLink className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />} {t('member.openProduct')}
          </a>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{t('member.linkHint')}</p>
      </div>

      {item.thumbnail_url && <img src={item.thumbnail_url} alt="" className="mt-8 w-full rounded-lg border" />}
      {item.description && <p className="mt-6 whitespace-pre-line leading-relaxed text-muted-foreground">{item.description}</p>}
    </article>
  );
}
