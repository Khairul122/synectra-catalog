'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { applyBrandTheme } from '@/lib/utils';
import type { Link, Product, Profile } from '@/types';
import { StorefrontView } from './StorefrontView';

/** Public home: loads the catalog and renders the shared store view. */
export function Storefront() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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

  useEffect(() => applyBrandTheme(profile?.theme_color), [profile?.theme_color]);

  return (
    <main className="relative flex min-h-screen flex-col overflow-x-hidden bg-background">
      <Squiggles />
      <StorefrontView profile={profile} links={links} products={products} loading={loading} failed={failed} onRetry={fetchCatalog} />
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
