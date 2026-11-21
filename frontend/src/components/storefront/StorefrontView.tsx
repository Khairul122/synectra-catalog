'use client';

import { useMemo, useState } from 'react';
import NextLink from 'next/link';
import { Home, LogIn, Menu, MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ErrorState } from '@/components/shared/feedback';
import { ProfileHeader } from './ProfileHeader';
import { LinkBlockList } from './LinkBlockList';
import { CategoryFilterBar } from './CategoryFilterBar';
import { ProductGrid } from './ProductGrid';
import { StoreBar } from './StoreBar';
import { useI18n } from '@/lib/i18n';
import type { Link, Product, Profile } from '@/types';

interface StorefrontViewProps {
  profile: Profile | null;
  links: Link[];
  products: Product[];
  loading?: boolean;
  failed?: boolean;
  onRetry?: () => void;
}

/**
 * The public store page body. Rendered by the storefront and by the admin live preview,
 * so what the admin sees is exactly what buyers get.
 */
export function StorefrontView({ profile, links, products, loading = false, failed = false, onRetry }: StorefrontViewProps) {
  const { t } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter(Boolean))), [products]);
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!selectedCategory || p.category.toLowerCase() === selectedCategory.toLowerCase()) &&
        (!q || p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)),
    );
  }, [products, selectedCategory, search]);

  const storeName = profile?.business_name || profile?.display_name || 'Synectra Digital';


  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-[600px] flex-col bg-background/60 shadow-sm">
      <StoreBar
        title={storeName}
        left={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t('store.menu')} className="rounded-full text-white hover:bg-white/10 hover:text-white">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem asChild>
                <NextLink href="/"><Home className="h-4 w-4" /> {t('store.menuHome')}</NextLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NextLink href="/member/login"><LogIn className="h-4 w-4" /> {t('store.menuLogin')}</NextLink>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="flex-1 px-4 pb-10 pt-8">
        <ProfileHeader profile={profile} loading={loading && !profile} />
        <LinkBlockList links={links} />

        <section aria-labelledby="catalog-title" className="mt-10">
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <h2 id="catalog-title" className="font-display text-xl font-bold">{t('store.catalogTitle')}</h2>
            {!loading && products.length > 0 && <span className="text-sm text-muted-foreground">{t('store.productCount', { n: products.length })}</span>}
          </div>
          {products.length > 0 && (
            <div className="mb-5">
              <CategoryFilterBar categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} search={search} onSearch={setSearch} />
            </div>
          )}
          {failed ? (
            <ErrorState message={t('store.loadError')} onRetry={onRetry} retrying={loading} />
          ) : (
            <ProductGrid products={filteredProducts} loading={loading} filtered={Boolean(search || selectedCategory)} />
          )}
        </section>
      </div>

      <footer className="border-t bg-card px-4 py-6 text-center text-xs text-muted-foreground">
        {profile?.whatsapp_number && (
          <a
            href={`https://wa.me/${profile.whatsapp_number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <MessageCircle className="h-4 w-4" /> {t('store.contact')}
          </a>
        )}
        <p>{t('store.copyright', { year: new Date().getFullYear(), name: storeName })}</p>
        <p className="mt-1 inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-primary" /> {t('store.footer')}
        </p>
      </footer>
    </div>
  );
}
