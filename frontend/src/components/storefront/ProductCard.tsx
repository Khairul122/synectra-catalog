'use client';

import { useState, type MouseEvent } from 'react';
import Image from 'next/image';
import { motion, useSpring } from 'framer-motion';
import { ShoppingBag, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatRupiah } from '@/lib/utils';
import type { Product } from '@/types';
import { useI18n } from '@/lib/i18n';

interface ProductCardProps {
  product: Product;
  onBuy: (product: Product) => void;
}

export function ProductCard({ product, onBuy }: ProductCardProps) {
  const { t } = useI18n();
  const [imageError, setImageError] = useState(false);
  const rotateX = useSpring(0, { stiffness: 200, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 200, damping: 20 });

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    rotateY.set((px - 0.5) * 8);
    rotateX.set((0.5 - py) * 8);
  };
  const onLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={() => onBuy(product)}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow duration-300 hover:shadow-glow"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {product.thumbnail_url && !imageError ? (
          <Image
            src={product.thumbnail_url}
            alt={product.title}
            fill
            sizes="(max-width: 560px) 50vw, 270px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/10">
            <Sparkles className="h-12 w-12 text-primary/50 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {product.category && (
          <span className="absolute left-2.5 top-2.5 z-10 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
            {product.category}
          </span>
        )}
        <span className="absolute bottom-2.5 right-2.5 z-10 flex translate-y-3 items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-900 opacity-0 shadow transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Zap className="h-3 w-3 text-amber-500" /> {t('store.instant')}
        </span>
      </div>

      <div className="relative z-20 flex flex-1 flex-col p-3.5 sm:p-4">
        <h3 className="line-clamp-1 text-sm font-semibold transition-colors group-hover:text-primary sm:text-base">{product.title}</h3>
        <p className="mt-1 line-clamp-2 flex-1 text-xs text-muted-foreground sm:text-sm">
          {product.description || t('store.defaultDesc')}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
          <span className="font-mono text-sm font-bold sm:text-base">{formatRupiah(product.price)}</span>
          <Button
            size="sm"
            variant="brand"
            onClick={(e) => {
              e.stopPropagation();
              onBuy(product);
            }}
            aria-label={t('store.buyLabel', { title: product.title })}
          >
            <ShoppingBag />
            <span className="hidden sm:inline">{t('store.buy')}</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
