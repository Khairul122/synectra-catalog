'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { formatDate, libraryOf, useMember } from '@/context/MemberContext';
import { ErrorState } from '@/components/shared/feedback';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Search and category chips only earn their space once the list is long enough to need them.
const SEARCH_FROM = 6;

export default function MemberPurchasesPage() {
  const { t, intl } = useI18n();
  const { orders, ordersError, reloadOrders, store } = useMember();
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const library = useMemo(() => libraryOf(orders ?? []), [orders]);
  const categories = useMemo(() => Array.from(new Set(library.map((p) => p.item.category).filter(Boolean))), [library]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return library.filter((p) => (!category || p.item.category === category) && (!q || p.item.title.toLowerCase().includes(q)));
  }, [library, category, search]);

  if (ordersError) return <ErrorState message={ordersError} onRetry={reloadOrders} />;
  if (!orders) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>;

  if (library.length === 0) {
    const pending = orders.some((o) => o.status === 'PENDING');
    return (
      <div className="py-10 text-center">
        <p className="font-semibold">{t('member.noPurchases')}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{pending ? t('member.noPurchasesPending') : t('member.noPurchasesSub')}</p>
        <Link href={pending ? '/member/transactions' : '/'} className="mt-4 inline-block text-sm font-semibold text-primary underline underline-offset-4">
          {pending ? t('member.seeTransactions') : t('member.browseStore', { store: store?.business_name || 'toko' })}
        </Link>
      </div>
    );
  }

  return (
    <div>
      {library.length >= SEARCH_FROM && (
        <div className="mb-4 space-y-3">
          <label className="relative block">
            <span className="sr-only">{t('member.search')}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('member.searchProducts')} className="pl-9" />
          </label>
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('member.filterCategory')}>
              {['', ...categories].map((c) => (
                <button
                  key={c || 'all'}
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm transition-colors',
                    category === c ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {c || t('member.allContent')}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="mb-2 text-sm text-muted-foreground">{t('member.productCount', { n: library.length })}</p>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t('member.noMatch')}</p>
      ) : (
        <ul className="divide-y border-y">
          {visible.map(({ invoiceId, paidAt, item, count }) => (
            <li key={item.id}>
              <Link
                href={`/member/content/${encodeURIComponent(invoiceId)}/${item.id}`}
                className="group flex items-center gap-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                  {item.thumbnail_url && <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium leading-snug group-hover:underline">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t('member.boughtOn', { date: formatDate(paidAt, intl) })}
                    {count > 1 && ` · ${t('member.boughtTimes', { n: count })}`}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">{t('member.open')}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
