'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Filter, Package, Search, SortDesc } from 'lucide-react';
import { formatDateTime, purchasesOf, useMember } from '@/context/MemberContext';
import { EmptyState, ErrorState } from '@/components/shared/feedback';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n';
import { selectClass } from '@/lib/utils';

const PAGE_SIZE = 10;

export default function MemberPurchasesPage() {
  const { t, intl } = useI18n();
  const { orders, ordersError, reloadOrders } = useMember();
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<'latest' | 'oldest'>('latest');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const purchases = useMemo(() => purchasesOf(orders ?? []), [orders]);
  const categories = useMemo(() => Array.from(new Set(purchases.map((p) => p.item.category).filter(Boolean))), [purchases]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = purchases.filter((p) => (!category || p.item.category === category) && (!q || p.item.title.toLowerCase().includes(q)));
    return sort === 'latest' ? list : [...list].reverse();
  }, [purchases, category, search, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <h1 className="py-6 font-display text-3xl font-bold">{t('member.purchasesTitle')}</h1>
      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="grid gap-3 border-b p-4 sm:grid-cols-[1fr_1fr_2fr]">
          <label className="relative">
            <span className="sr-only">{t('member.filterCategory')}</span>
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className={`${selectClass} pl-9`}>
              <option value="">{t('member.allContent')}</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="relative">
            <span className="sr-only">{t('member.sort')}</span>
            <SortDesc className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select value={sort} onChange={(e) => setSort(e.target.value as 'latest' | 'oldest')} className={`${selectClass} pl-9`}>
              <option value="latest">{t('member.sortLatest')}</option>
              <option value="oldest">{t('member.sortOldest')}</option>
            </select>
          </label>
          <label className="relative">
            <span className="sr-only">{t('member.search')}</span>
            <Input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t('member.search')} className="pr-10" />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </label>
        </div>

        <div className="p-4">
          {ordersError ? (
            <ErrorState message={ordersError} onRetry={reloadOrders} />
          ) : !orders ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState icon={Package} title={purchases.length ? t('member.noMatch') : t('member.noPurchases')} description={purchases.length ? undefined : t('member.noPurchasesSub')} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {visible.map(({ invoiceId, paidAt, item }) => (
                <li key={`${invoiceId}-${item.id}`}>
                  <Link
                    href={`/member/content/${encodeURIComponent(invoiceId)}/${item.id}`}
                    className="group flex items-center gap-3 rounded-xl border bg-background p-2 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {item.thumbnail_url && (
                        <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-semibold leading-snug">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(paidAt, intl)}</p>
                      {item.category && <span className="mt-1.5 inline-block rounded-md border px-1.5 py-0.5 text-[11px] text-muted-foreground">{item.category}</span>}
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {pages > 1 && (
            <nav aria-label={t('member.pagination')} className="mt-6 flex justify-center gap-1">
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  aria-current={n === page ? 'page' : undefined}
                  className={`h-9 min-w-9 rounded-lg px-2 text-sm font-semibold ${n === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  {n}
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
