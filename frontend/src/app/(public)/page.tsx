'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { api } from '@/services/api';
import { ProfileHeader } from '@/components/storefront/ProfileHeader';
import { LinkBlockList } from '@/components/storefront/LinkBlockList';
import { CategoryFilterBar } from '@/components/storefront/CategoryFilterBar';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { CheckoutDrawer } from '@/components/storefront/CheckoutDrawer';
import { ErrorState } from '@/components/shared/feedback';
import { Preferences } from '@/components/shared/theme-toggle';
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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
    <main className="relative min-h-screen overflow-x-hidden pb-12">
      {/* Soft brand-tinted backdrop, like a link-in-bio page */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-primary/[0.06]" />
      </div>

      <div className="mx-auto w-full max-w-[560px] px-4">
        <div className="flex justify-end py-4">
          <Preferences />
        </div>

        <ProfileHeader profile={profile} loading={loading && !profile} />
        <LinkBlockList links={links} />

        <section className="mt-10 space-y-4">
          <div className="sticky top-0 z-30 -mx-4 space-y-3 bg-background/75 px-4 py-3 backdrop-blur-xl">
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{t('store.catalogTitle')}</h2>
                <p className="text-xs text-muted-foreground">{t('store.catalogSub')}</p>
              </div>
              {!loading && products.length > 0 && (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 font-mono text-xs font-semibold text-primary">{filteredProducts.length}</span>
              )}
            </motion.div>
            <CategoryFilterBar categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} search={search} onSearch={setSearch} />
          </div>

          {failed ? (
            <ErrorState message={t('store.loadError')} onRetry={fetchCatalog} retrying={loading} />
          ) : (
            <ProductGrid products={filteredProducts} loading={loading} filtered={Boolean(search || selectedCategory)} onBuy={setSelectedProduct} />
          )}
        </section>

        <footer className="mt-12 flex justify-center">
          <span className="glass inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> {t('store.footer')}
          </span>
        </footer>
      </div>

      <CheckoutDrawer product={selectedProduct} isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} />
    </main>
  );
}
