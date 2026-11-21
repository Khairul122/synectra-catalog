'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { Preferences } from '@/components/shared/theme-toggle';
import { useCart } from '@/lib/cart';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Cart icon with a live item count, linking to /cart. */
export function CartButton({ className }: { className?: string }) {
  const { t } = useI18n();
  const count = useCart().length;
  return (
    <Link
      href="/cart"
      aria-label={`${t('cart.open')} (${count})`}
      className={cn(
        'relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <ShoppingCart className="h-5 w-5" />
      <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
        {count}
      </span>
    </Link>
  );
}

/** Lynk.id-style dark app bar: left action, centered title, cart + preferences on the right. */
export function StoreBar({ left, title }: { left: ReactNode; title?: string }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-1 bg-zinc-800 px-2 text-white">
      <div className="shrink-0">{left}</div>
      {title ? <h1 className="min-w-0 flex-1 truncate text-center font-display text-lg font-bold">{title}</h1> : <div className="flex-1" />}
      <div className="flex shrink-0 items-center gap-1">
        <CartButton />
        {/* .dark scopes the dark tokens so the controls read well on the dark bar in both themes */}
        <div className="dark">
          <Preferences />
        </div>
      </div>
    </header>
  );
}
