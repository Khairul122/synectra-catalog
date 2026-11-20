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

const GRID = 'grid grid-cols-2 gap-3 sm:gap-4';

export function ProductGrid({ products, onBuy, loading = false, filtered = false }: ProductGridProps) {
  const { t } = useI18n();
  if (loading) {
    return (
      <div className={GRID}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border bg-card">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <div className="flex justify-between pt-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-8 w-14 rounded-lg" />
              </div>
            </div>
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
