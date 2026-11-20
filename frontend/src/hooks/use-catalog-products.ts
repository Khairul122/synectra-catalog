'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { Product, Profile } from '@/types';

/** Active catalog products for the product, cart and checkout pages. */
export function useCatalogProducts() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const catalog = await api.getCatalog();
      setProfile(catalog.profile ?? null);
      setProducts(catalog.products ?? []);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { products, profile, loading: products === null && !failed, failed, retry: load };
}
