'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { PackageOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/feedback';
import { ProductCard } from './ProductCard';
import type { Product } from '@/types';
import { useI18n } from '@/lib/i18n';

interface ProductGridProps {
  products: Product[];
  onBuy: (product: Product) => void;
  loading?: boolean;
  filtered?: boolean;
}

const GRID = 'flex flex-col gap-5';

export function ProductGrid({ products, onBuy, loading = false, filtered = false }: ProductGridProps) {
  const { t } = useI18n();
  if (loading) {
    return (
      <div className={GRID}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-md border-2 bg-card p-2.5">
            <div className="flex gap-3">
              <Skeleton className="aspect-square w-[88px] shrink-0 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="mt-3 h-12 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackageOpen}
        title={filtered ? t('store.emptyFiltered') : t('store.empty')}
        description={filtered ? t('store.emptyFilteredSub') : t('store.emptySub')}
      />
    );
  }

  return (
    <motion.div layout className={GRID}>
      <AnimatePresence>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onBuy={onBuy} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
