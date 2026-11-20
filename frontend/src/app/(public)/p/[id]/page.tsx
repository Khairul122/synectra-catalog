'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, PackageOpen, Share2, ShoppingCart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/shared/feedback';
import { CartButton } from '@/components/storefront/StoreBar';
import { useCatalogProducts } from '@/hooks/use-catalog-products';
import { cart, useCart } from '@/lib/cart';
import { useI18n } from '@/lib/i18n';
import { formatRupiah } from '@/lib/utils';

const OVERLAY_BTN =
  'inline-flex h-11 w-11 items-center justify-center rounded-md bg-zinc-800/75 text-white backdrop-blur transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { products, loading, failed, retry } = useCatalogProducts();
  const inCart = useCart().some((item) => item.id === id);
  const [imageError, setImageError] = useState(false);
  const product = products?.find((p) => p.id === id);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product?.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(t('product.linkCopied'));
      }
    } catch {
      // Share sheet dismissed.
    }
  };

  const addToCart = () => {
    if (!product) return;
    cart.add(product);
    toast.success(t('cart.added'), { action: { label: t('cart.open'), onClick: () => router.push('/cart') } });
  };

  if (failed) {
    return (
      <Shell>
        <div className="p-6">
          <ErrorState message={t('store.loadError')} onRetry={retry} retrying={loading} />
        </div>
      </Shell>
    );
  }

  if (!loading && !product) {
    return (
      <Shell>
        <div className="p-6">
          <EmptyState
            icon={PackageOpen}
            title={t('product.notFound')}
            description={t('product.notFoundSub')}
            action={
              <Button asChild variant="brand">
                <Link href="/">{t('order.toCatalog')}</Link>
              </Button>
            }
          />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {loading ? (
          <Skeleton className="h-full w-full rounded-none" />
        ) : product?.thumbnail_url && !imageError ? (
          <Image src={product.thumbnail_url} alt={product.title} fill priority sizes="600px" className="object-cover" onError={() => setImageError(true)} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/10">
            <Sparkles className="h-16 w-16 text-primary/50" />
          </div>
        )}

        <Link href="/" aria-label={t('checkout.back')} className={`absolute left-4 top-4 ${OVERLAY_BTN}`}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="absolute right-4 top-4 flex gap-3">
          <button type="button" onClick={share} aria-label={t('product.share')} className={OVERLAY_BTN}>
            <Share2 className="h-5 w-5" />
          </button>
          <CartButton className={OVERLAY_BTN} />
        </div>
      </div>

      <div className="px-6 py-6">
        {loading || !product ? (
          <div className="space-y-3">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-display text-2xl font-semibold leading-snug">{product.title}</h1>
              <p className="shrink-0 font-display text-lg font-bold text-primary">{formatRupiah(product.price)}</p>
            </div>
            <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('product.description')}</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{product.description || t('store.defaultDesc')}</p>
          </>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[600px] gap-3 border-t bg-card p-4">
        <Button
          type="button"
          variant="outline"
          size="xl"
          onClick={addToCart}
          disabled={!product || inCart}
          aria-label={inCart ? t('cart.inCart') : t('cart.add')}
          title={inCart ? t('cart.inCart') : t('cart.add')}
          className="border-primary px-5 text-primary hover:text-primary"
        >
          <ShoppingCart className="h-5 w-5" />
          <span aria-hidden>+</span>
        </Button>
        <Button asChild variant="brand" size="xl" className="flex-1">
          <Link href={`/checkout?product=${id}`} aria-disabled={!product}>
            {t('store.buyNow')}
          </Link>
        </Button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-muted/50">
      <div className="relative mx-auto min-h-screen w-full max-w-[600px] bg-card pb-28 shadow-sm">{children}</div>
    </main>
  );
}
