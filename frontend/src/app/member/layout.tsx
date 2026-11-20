'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ClipboardList, Loader2, LogOut, Menu, ShoppingBag, Store, UserRound } from 'lucide-react';
import { getStoredToken, adminSignOut } from '@/services/supabase';
import { api, ApiError } from '@/services/api';
import { MemberContext, libraryOf, memberDisplayName } from '@/context/MemberContext';
import { AnimatedNumber } from '@/components/shared/feedback';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Preferences } from '@/components/shared/theme-toggle';
import { notify } from '@/components/shared/message-dialog';
import { useI18n, type MessageKey } from '@/lib/i18n';
import { applyBrandTheme, cn, formatRupiah } from '@/lib/utils';
import type { Member, MemberMe, MemberOrder, Profile } from '@/types';

const NAV: { key: MessageKey; href: string; icon: typeof ShoppingBag }[] = [
  { key: 'member.nav.purchases', href: '/member', icon: ShoppingBag },
  { key: 'member.nav.transactions', href: '/member/transactions', icon: ClipboardList },
  { key: 'member.nav.account', href: '/member/account', icon: UserRound },
];

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<MemberMe | null>(null);
  const [store, setStore] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<MemberOrder[] | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const signOut = useCallback(async () => {
    await adminSignOut();
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    const saved = getStoredToken();
    if (!saved) {
      router.replace('/login');
      return;
    }
    api
      .memberMe(saved)
      .then((data) => {
        setToken(saved);
        setMe(data);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) void signOut();
        else notify.error(t('member.loadFailed'), { description: err instanceof Error ? err.message : undefined });
      });
    api.getCatalog().then((c) => setStore(c.profile)).catch(() => {});
  }, [router, signOut, t]);

  const reloadOrders = useCallback(() => {
    if (!token) return;
    setOrdersError(null);
    api
      .memberOrders(token)
      .then(setOrders)
      .catch((err) => setOrdersError(err instanceof Error ? err.message : t('member.loadFailed')));
  }, [token, t]);

  useEffect(reloadOrders, [reloadOrders]);
  useEffect(() => applyBrandTheme(store?.theme_color), [store?.theme_color]);

  const handleLogout = async () => {
    const ok = await notify.confirm({ title: t('member.logoutTitle'), description: t('member.logoutSub'), confirmLabel: t('member.logout'), destructive: true });
    if (ok) await signOut();
  };

  if (!token || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" aria-label={t('member.loading')} />
      </div>
    );
  }

  const setAccount = (account: Member) => setMe({ ...me, account });
  const storeName = store?.business_name || store?.display_name || 'Synectra';
  const isActive = (href: string) => (href === '/member' ? pathname === href : pathname.startsWith(href));
  const owned = orders ? libraryOf(orders).length : null;
  const spent = orders?.filter((o) => o.status === 'PAID').reduce((sum, o) => sum + o.amount, 0) ?? null;

  const sidebar = (layoutId: string) => (
    <div className="flex h-full flex-col bg-zinc-800 p-4 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <Link href="/" className="flex items-center gap-3 rounded-xl hover:opacity-90">
          {store?.avatar_url ? (
            <img src={store.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
              <Store className="h-4 w-4" />
            </span>
          )}
          <span className="min-w-0 truncate text-sm font-semibold">{storeName}</span>
        </Link>
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="truncate font-display text-lg font-bold">{memberDisplayName(me, orders)}</p>
          <p className="truncate text-xs text-white/60">{me.email}</p>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/10 p-2.5">
            <dt className="text-[11px] text-white/60">{t('member.statOwned')}</dt>
            <dd className="font-display text-xl font-bold tabular-nums">{owned === null ? '–' : <AnimatedNumber value={owned} />}</dd>
          </div>
          <div className="rounded-xl bg-white/10 p-2.5">
            <dt className="text-[11px] text-white/60">{t('member.statSpent')}</dt>
            <dd className="truncate text-sm font-bold tabular-nums leading-7">{spent === null ? '–' : <AnimatedNumber value={spent} format={formatRupiah} />}</dd>
          </div>
        </dl>
      </div>

      <p className="mb-2 mt-8 px-3 text-xs font-semibold uppercase tracking-wider text-white/50">{t('member.menu')}</p>
      <nav className="flex-1 space-y-1">
        {NAV.map(({ key, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            aria-current={isActive(href) ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
              isActive(href) ? 'text-zinc-900' : 'text-white/85 hover:bg-white/10',
            )}
          >
            {isActive(href) && (
              <motion.span layoutId={layoutId} className="absolute inset-0 rounded-xl bg-white shadow" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
            )}
            <Icon className="relative h-4 w-4 transition-transform group-hover:scale-110" />
            <span className="relative">{t(key)}</span>
          </Link>
        ))}
      </nav>

      <div className="border-t border-white/15 pt-3">
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/85 hover:bg-white/10">
          <LogOut className="h-4 w-4" /> {t('member.logout')}
        </button>
      </div>
    </div>
  );

  const whatsapp = store?.whatsapp_number;

  return (
    <MemberContext.Provider value={{ token, me, store, orders, ordersError, reloadOrders, setAccount }}>
      <div className="flex min-h-screen bg-muted/40">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 md:block">{sidebar('member-nav')}</aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background/80 px-4 py-2 backdrop-blur md:justify-end md:border-0 md:bg-transparent md:backdrop-blur-none">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('member.openMenu')}>
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-0 p-0">
                <SheetTitle className="sr-only">{t('member.menu')}</SheetTitle>
                <SheetDescription className="sr-only">{storeName}</SheetDescription>
                {sidebar('member-nav-mobile')}
              </SheetContent>
            </Sheet>
            <Preferences />
          </header>

          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10 sm:px-6">
            <AnimatePresence mode="wait">
              <motion.div key={pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
                {children}
              </motion.div>
            </AnimatePresence>
          </main>

          {whatsapp && (
            <footer className="pb-8 text-center text-sm text-muted-foreground">
              {t('member.helpPrompt')}{' '}
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-4">
                {t('member.contactWhatsapp')}
              </a>
            </footer>
          )}
        </div>
      </div>
    </MemberContext.Provider>
  );
}
