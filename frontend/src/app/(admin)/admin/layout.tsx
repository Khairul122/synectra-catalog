'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, LayoutDashboard, Link2, LogOut, Menu, Package, Palette, ShoppingBag, Sparkles } from 'lucide-react';
import { getStoredToken, adminSignOut } from '@/services/supabase';
import { AdminContext } from '@/context/AdminContext';
import { api, ApiError } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Preferences } from '@/components/shared/theme-toggle';
import { useI18n, type MessageKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const NAV: { key: MessageKey; href: string; icon: typeof LayoutDashboard }[] = [
  { key: 'admin.nav.overview', href: '/admin', icon: LayoutDashboard },
  { key: 'admin.nav.products', href: '/admin/products', icon: Package },
  { key: 'admin.nav.links', href: '/admin/links', icon: Link2 },
  { key: 'admin.nav.orders', href: '/admin/orders', icon: ShoppingBag },
  { key: 'admin.nav.appearance', href: '/admin/appearance', icon: Palette },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const [token, setToken] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const savedToken = getStoredToken();
    if (!savedToken) {
      router.replace('/login');
      return;
    }
    // Validate the token server-side; an expired/forged token gets 401 and is cleared.
    api
      .adminGetProfile(savedToken)
      .then(() => {
        setToken(savedToken);
        setIsChecking(false);
      })
      .catch(async (err) => {
        if (err instanceof ApiError && err.status === 401) {
          await adminSignOut();
          router.replace('/login');
          return;
        }
        // Backend unreachable: let pages render and show their own errors.
        setToken(savedToken);
        setIsChecking(false);
      });
  }, [router]);

  const handleLogout = async () => {
    await adminSignOut();
    router.replace('/login');
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground">
          <motion.div
            animate={{ rotate: 360, borderRadius: ['30%', '50%', '30%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="flex h-12 w-12 items-center justify-center bg-primary shadow-glow"
          >
            <Sparkles className="h-5 w-5 text-white" />
          </motion.div>
          <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.6, repeat: Infinity }}>
            {t('admin.verifying')}
          </motion.span>
        </div>
      </div>
    );
  }

  const isActive = (href: string) => (href === '/admin' ? pathname === href : pathname.startsWith(href));

  const nav = (layoutId: string) => (
    <nav className="flex-1 space-y-1 p-3">
      {NAV.map(({ key, href, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
              active ? 'text-primary' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl border border-primary/25 bg-primary/10"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <Icon className="relative h-4 w-4 transition-transform group-hover:scale-110" />
            <span className="relative">{t(key)}</span>
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-3 p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
        <Sparkles className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="font-display text-sm font-bold">Synectra Studio</p>
        <p className="text-[11px] text-primary">{t('admin.dashboard')}</p>
      </div>
    </div>
  );

  const footer = (
    <div className="space-y-1 border-t p-3">
      <Link
        href="/"
        target="_blank"
        className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        <span className="flex items-center gap-3">
          <ExternalLink className="h-4 w-4" /> {t('admin.viewStore')}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-success">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> Live
        </span>
      </Link>
      <button
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
      >
        <LogOut className="h-4 w-4" /> {t('admin.logout')}
      </button>
    </div>
  );

  return (
    <AdminContext.Provider value={{ token, logout: handleLogout }}>
      <div className="flex min-h-screen">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        </div>

        {/* Desktop sidebar */}
        <aside className="glass sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-y-0 border-l-0 md:flex">
          {brand}
          {nav('nav-desktop')}
          {footer}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="glass sticky top-0 z-30 flex items-center justify-between border-x-0 border-t-0 px-4 py-3 md:px-8">
            <div className="flex items-center gap-2">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('admin.openMenu')}>
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex w-72 flex-col p-0">
                  <SheetTitle className="sr-only">{t('admin.navTitle')}</SheetTitle>
                  <SheetDescription className="sr-only">{t('admin.dashboard')}</SheetDescription>
                  {brand}
                  {nav('nav-mobile')}
                  {footer}
                </SheetContent>
              </Sheet>
              <span className="font-display text-sm font-semibold">{(() => { const n = NAV.find((x) => isActive(x.href)); return n ? t(n.key) : null; })()}</span>
            </div>
            <Preferences />
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="mx-auto max-w-6xl"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
