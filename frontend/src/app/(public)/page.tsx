'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { ProfileHeader } from '@/components/storefront/ProfileHeader';
import { LinkBlockList } from '@/components/storefront/LinkBlockList';
import { CategoryFilterBar } from '@/components/storefront/CategoryFilterBar';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { StoreBar } from '@/components/storefront/StoreBar';
import { ErrorState } from '@/components/shared/feedback';
import { useI18n } from '@/lib/i18n';
import { applyBrandTheme } from '@/lib/utils';
import type { Profile, Link, Product } from '@/types';

export default function StorefrontPage() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      setFailed(false);
      const data = await api.getCatalog();
      setProfile(data.profile);
      setLinks(data.links || []);
      setProducts(data.products || []);
    } catch {
      // Server error text is for logs, not buyers.
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter(Boolean))), [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!selectedCategory || p.category.toLowerCase() === selectedCategory.toLowerCase()) &&
        (!q || p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)),
    );
  }, [products, selectedCategory, search]);

  useEffect(() => applyBrandTheme(profile?.theme_color), [profile?.theme_color]);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <Squiggles />

      <div className="relative mx-auto min-h-screen w-full max-w-[600px] bg-background/60 pb-24 shadow-sm">
        {/* Lynk.id-style app bar */}
        <StoreBar
          title={t('store.home')}
          left={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen((open) => !open)}
              aria-label={t('store.toggleSearch')}
              aria-expanded={searchOpen}
              className="rounded-full text-white hover:bg-white/10 hover:text-white"
            >
              {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </Button>
          }
        />

        <AnimatePresence initial={false}>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="sticky top-14 z-30 overflow-hidden border-b bg-background/90 backdrop-blur-xl"
            >
              <div className="p-3">
                <CategoryFilterBar categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} search={search} onSearch={setSearch} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-4 pt-8">
          <ProfileHeader profile={profile} loading={loading && !profile} />
          <LinkBlockList links={links} />

          <section aria-label={t('store.catalogTitle')} className="mt-8">
            {failed ? (
              <ErrorState message={t('store.loadError')} onRetry={fetchCatalog} retrying={loading} />
            ) : (
              <ProductGrid products={filteredProducts} loading={loading} filtered={Boolean(search || selectedCategory)} />
            )}
          </section>
        </div>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-40 mx-auto flex h-12 w-full max-w-[600px] items-center justify-center gap-1.5 border-t bg-card text-sm font-semibold text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" /> {t('store.footer')}
      </footer>
    </main>
  );
}

/** Decorative solid-stroke squiggles in the page margins (desktop only), like Lynk.id themes. */
function Squiggles() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 hidden lg:block">
      <svg className="absolute -left-6 top-24 h-64 w-40 text-primary/70" viewBox="0 0 160 260" fill="none">
        <path d="M120 10c20 60-90 70-60 130s-70 60-50 110" stroke="currentColor" strokeWidth="18" strokeLinecap="round" />
      </svg>
      <svg className="absolute -right-10 bottom-0 h-72 w-56 text-orange-500/80" viewBox="0 0 220 280" fill="none">
        <path d="M20 270c0-120 60-200 180-200" stroke="currentColor" strokeWidth="22" strokeLinecap="round" />
      </svg>
      <svg className="absolute bottom-10 left-[12%] h-16 w-16 text-amber-300/80" viewBox="0 0 64 64">
        <path d="M32 0l6 26 26 6-26 6-6 26-6-26L0 32l26-6z" fill="currentColor" />
      </svg>
      <svg className="absolute right-[14%] top-28 h-10 w-10 text-primary/60" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="6" fill="none" />
      </svg>
    </div>
  );
}
