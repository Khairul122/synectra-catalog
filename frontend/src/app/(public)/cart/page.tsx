'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ShoppingCart, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/feedback';
import { StoreBar } from '@/components/storefront/StoreBar';
import { cart, useCart } from '@/lib/cart';
import { useI18n } from '@/lib/i18n';
import { formatRupiah } from '@/lib/utils';

export default function CartPage() {
  const { t } = useI18n();
  const items = useCart();
  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <main className="min-h-screen bg-muted/50">
      <div className="mx-auto min-h-screen w-full max-w-[600px] bg-background pb-10 shadow-sm">
        <StoreBar
          title={t('cart.title', { n: items.length })}
          left={
            <Button asChild variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/10 hover:text-white">
              <Link href="/" aria-label={t('checkout.back')}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
          }
        />

        <div className="space-y-6 p-4">
          {items.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title={t('cart.empty')}
              description={t('cart.emptySub')}
              action={
                <Button asChild variant="brand">
                  <Link href="/">{t('cart.continue')}</Link>
                </Button>
              }
            />
          ) : (
            <>
              <ul className="space-y-3">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.li
                      key={item.id}
                      layout
                      exit={{ opacity: 0, x: -24, transition: { duration: 0.15 } }}
                      className="flex items-center gap-3 rounded-lg border bg-card p-2"
                    >
                      <Link href={`/p/${item.id}`} className="relative aspect-square w-20 shrink-0 overflow-hidden rounded bg-muted">
                        {item.thumbnail_url ? (
                          <Image src={item.thumbnail_url} alt="" fill sizes="80px" className="object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-primary/10">
                            <Sparkles className="h-6 w-6 text-primary/50" />
                          </span>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/p/${item.id}`} className="line-clamp-2 font-medium hover:underline">
                          {item.title}
                        </Link>
                        <p className="mt-1 text-sm font-semibold">{formatRupiah(item.price)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => cart.remove(item.id)}
                        aria-label={t('cart.remove', { title: item.title })}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              <section aria-labelledby="cart-summary">
                <h2 id="cart-summary" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('cart.summary')}
                </h2>
                <dl className="mt-2 divide-y text-sm">
                  <div className="flex justify-between px-1 py-3">
                    <dt>{t('cart.totalItems', { n: items.length })}</dt>
                    <dd>{formatRupiah(total)}</dd>
                  </div>
                  <div className="flex justify-between px-1 py-3 text-base font-semibold">
                    <dt>{t('cart.grandTotal')}</dt>
                    <dd>{formatRupiah(total)}</dd>
                  </div>
                </dl>
              </section>

              <div className="space-y-3">
                <Button asChild variant="brand" size="xl" className="w-full">
                  <Link href="/checkout">{t('store.buyNow')}</Link>
                </Button>
                <Button asChild variant="outline" size="xl" className="w-full border-primary text-primary hover:text-primary">
                  <Link href="/">{t('cart.continue')}</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
