'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import type { Product } from '@/types';
import { useI18n } from '@/lib/i18n';

interface ProductCardProps {
  product: Product;
  onBuy: (product: Product) => void;
}

/** Lynk.id product block: bordered card with a hard offset shadow, thumbnail + text row, full-width CTA. */
export function ProductCard({ product, onBuy }: ProductCardProps) {
  const { t } = useI18n();
  const [imageError, setImageError] = useState(false);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      onClick={() => onBuy(product)}
      className="group cursor-pointer rounded-md border-2 border-primary bg-card p-2.5 shadow-[4px_4px_0_0_hsl(var(--primary))] transition-[transform,box-shadow] duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_hsl(var(--primary))] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_0_hsl(var(--primary))]"
    >
      <div className="flex gap-3">
        <div className="relative aspect-square w-[88px] shrink-0 overflow-hidden rounded bg-muted">
          {product.thumbnail_url && !imageError ? (
            <Image
              src={product.thumbnail_url}
              alt=""
              fill
              sizes="88px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10">
              <Sparkles className="h-7 w-7 text-primary/50" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-display text-base font-bold leading-snug">{product.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.description || t('store.defaultDesc')}</p>
          <p className="mt-1.5 font-display text-base font-bold">{formatRupiah(product.price)}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onBuy(product);
        }}
        aria-label={t('store.buyLabel', { title: product.title })}
        className="mt-3 w-full rounded-lg border border-primary/40 bg-card py-3 font-display text-base font-bold shadow-md transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t('store.buyNow')}
      </button>
    </motion.article>
  );
}
