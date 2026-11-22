'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

// The owner's own browsing would skew the numbers.
const ignored = (path: string) => path.startsWith('/admin') || path === '/login';

function send(body: Record<string, string | undefined>) {
  // keepalive lets click events survive the navigation they trigger.
  fetch(`${API_BASE}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

/** First-party page view + click logger feeding the admin Traffic page. */
export function TrafficTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (ignored(pathname)) return;
    send({ type: 'pageview', path: pathname, referrer: document.referrer || undefined });
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const path = window.location.pathname;
      if (ignored(path)) return;
      const el = (event.target as Element | null)?.closest('a, button, [role="button"]');
      if (!el) return;
      const label = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120);
      const target = el instanceof HTMLAnchorElement ? el.href.slice(0, 500) : undefined;
      if (!label && !target) return;
      send({ type: 'click', path, label: label || undefined, target });
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return null;
}
