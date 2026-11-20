'use client';

import { useSyncExternalStore } from 'react';
import type { Product } from '@/types';

/** Display snapshot only: checkout re-reads products from the catalog and the server prices them. */
export type CartItem = Pick<Product, 'id' | 'title' | 'price' | 'thumbnail_url'>;

const KEY = 'synectra-cart';
const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cached: CartItem[] = EMPTY;

function read(): CartItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Storage blocked (private mode): the cart simply starts empty.
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      cached = Array.isArray(parsed) ? parsed : EMPTY;
    } catch {
      cached = EMPTY;
    }
  }
  return cached;
}

function write(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Ignore: nothing else to fall back to.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  // Keep tabs in sync.
  const onStorage = (e: StorageEvent) => e.key === KEY && notify();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener('storage', onStorage);
  };
}

/** Digital goods: each product is in the cart at most once (quantity is always 1). */
export const cart = {
  add(product: Product) {
    const items = read();
    if (items.some((item) => item.id === product.id)) return;
    const { id, title, price, thumbnail_url } = product;
    write([...items, { id, title, price, thumbnail_url }]);
  },
  remove(id: string) {
    write(read().filter((item) => item.id !== id));
  },
  /** Drop items the catalog no longer sells. */
  keep(ids: string[]) {
    write(read().filter((item) => ids.includes(item.id)));
  },
  clear() {
    write(EMPTY);
  },
};

export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
