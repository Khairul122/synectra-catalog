'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { Product } from '@/types';

/** Active catalog products for the product, cart and checkout pages. */
export function useCatalogProducts() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setProducts((await api.getCatalog()).products ?? []);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { products, loading: products === null && !failed, failed, retry: load };
}
