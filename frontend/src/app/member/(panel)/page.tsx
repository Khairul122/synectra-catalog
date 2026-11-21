'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Package, Search } from 'lucide-react';
import { formatDate, libraryOf, useMember, type Purchase } from '@/context/MemberContext';
import { PurchaseSheet } from '@/components/member/PurchaseSheet';
import { ErrorState } from '@/components/shared/feedback';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// The search box only earns its space once the library is long enough to need it.
const SEARCH_FROM = 6;

export default function MemberPurchasesPage() {
  const { t, intl } = useI18n();
  const { orders, ordersError, reloadOrders, store } = useMember();
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<(Purchase & { count: number }) | null>(null);

  const library = useMemo(() => libraryOf(orders ?? []), [orders]);
  const categories = useMemo(() => Array.from(new Set(library.map((p) => p.item.category).filter(Boolean))), [library]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return library.filter((p) => (!category || p.item.category === category) && (!q || p.item.title.toLowerCase().includes(q)));
  }, [library, category, search]);

  const title = <h1 className="py-6 font-display text-3xl font-bold">{t('member.nav.purchases')}</h1>;
  if (ordersError) return <>{title}<ErrorState message={ordersError} onRetry={reloadOrders} /></>;
  if (!orders) {
    return (
      <>
        {title}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />)}</div>
      </>
    );
  }

  if (library.length === 0) {
    const pending = orders.some((o) => o.status === 'PENDING');
    return (
      <>
        {title}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-dashed bg-card/60 px-6 py-14 text-center">
          <Package className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">{t('member.noPurchases')}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{pending ? t('member.noPurchasesPending') : t('member.noPurchasesSub')}</p>
          <Link href={pending ? '/member/transactions' : '/'} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            {pending ? t('member.seeTransactions') : t('member.browseStore', { store: store?.business_name || 'toko' })} <ArrowUpRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </>
    );
  }

  return (
    <div>
      {title}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {categories.length > 1 ? (
          <div role="tablist" aria-label={t('member.filterCategory')} className="flex gap-1 overflow-x-auto rounded-full border bg-card p-1">
            {['', ...categories].map((c) => {
              const active = category === c;
              return (
                <button
                  key={c || 'all'}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategory(c)}
                  className={cn('relative whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors', active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
                >
                  {active && <motion.span layoutId="purchase-filter" className="absolute inset-0 rounded-full bg-primary" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                  <span className="relative">{c || t('member.allContent')}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('member.productCount', { n: library.length })}</p>
        )}
        {library.length >= SEARCH_FROM && (
          <label className="relative sm:w-72">
            <span className="sr-only">{t('member.search')}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('member.searchProducts')} className="pl-9" />
          </label>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t('member.noMatch')}</p>
      ) : (
        <motion.ul layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((purchase, i) => {
              const { item, paidAt, count } = purchase;
              return (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 9) * 0.05 } }}
                  exit={{ opacity: 0, scale: 0.96 }}
                >
                  <motion.button
                    onClick={() => setOpen(purchase)}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className="group block w-full overflow-hidden rounded-2xl border bg-card text-left transition-shadow hover:shadow-xl hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      {item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <Package className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground" />
                      )}
                      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg transition-all sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-visible:translate-y-0 sm:group-focus-visible:opacity-100">
                        {t('member.open')} <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <div className="p-4">
                      <p className="line-clamp-2 font-semibold leading-snug">{item.title}</p>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {t('member.boughtOn', { date: formatDate(paidAt, intl) })}
                        {count > 1 && ` · ${t('member.boughtTimes', { n: count })}`}
                      </p>
                    </div>
                  </motion.button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}

      <PurchaseSheet purchase={open} onClose={() => setOpen(null)} />
    </div>
  );
}
