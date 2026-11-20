'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, LogOut } from 'lucide-react';
import { getStoredToken, adminSignOut } from '@/services/supabase';
import { api, ApiError } from '@/services/api';
import { MemberContext, memberDisplayName } from '@/context/MemberContext';
import { Preferences } from '@/components/shared/theme-toggle';
import { notify } from '@/components/shared/message-dialog';
import { useI18n, type MessageKey } from '@/lib/i18n';
import { applyBrandTheme, cn } from '@/lib/utils';
import type { Member, MemberMe, MemberOrder, Profile } from '@/types';

const TABS: { key: MessageKey; href: string }[] = [
  { key: 'member.nav.purchases', href: '/member' },
  { key: 'member.nav.transactions', href: '/member/transactions' },
  { key: 'member.nav.account', href: '/member/account' },
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
  const isActive = (href: string) => (href === '/member' ? pathname === href || pathname.startsWith('/member/content') : pathname.startsWith(href));
  const whatsapp = store?.whatsapp_number;

  return (
    <MemberContext.Provider value={{ token, me, store, orders, ordersError, reloadOrders, setAccount }}>
      <div className="flex min-h-screen flex-col bg-background">
        {/* Same dark bar as the storefront, so the member area reads as part of the store. */}
        <header className="sticky top-0 z-30 bg-zinc-800 text-white">
          <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
            <Link href="/" className="flex min-w-0 items-center gap-2 rounded-md py-1 pr-2 hover:bg-white/10" aria-label={t('member.backToStore')}>
              <ArrowLeft className="h-4 w-4 shrink-0 text-white/70" />
              {store?.avatar_url && <img src={store.avatar_url} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />}
              <span className="truncate font-display font-bold">{storeName}</span>
            </Link>
            <div className="ml-auto flex items-center gap-1">
              <div className="dark">
                <Preferences />
              </div>
              <button onClick={handleLogout} className="flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-white/80 hover:bg-white/10 hover:text-white">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{t('member.logout')}</span>
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-3xl flex-1 px-4">
          <div className="pb-4 pt-8">
            <p className="font-display text-2xl font-bold">{t('member.greeting', { name: memberDisplayName(me, orders) })}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{me.email}</p>
          </div>

          <nav aria-label={t('member.menu')} className="-mx-4 overflow-x-auto border-b px-4">
            <ul className="flex gap-6">
              {TABS.map(({ key, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive(href) ? 'page' : undefined}
                    className={cn(
                      '-mb-px block whitespace-nowrap border-b-2 py-3 text-sm font-semibold transition-colors',
                      isActive(href) ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <main className="py-6">{children}</main>
        </div>

        {whatsapp && (
          <footer className="border-t py-6 text-center text-sm text-muted-foreground">
            {t('member.helpPrompt')}{' '}
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-4">
              {t('member.contactWhatsapp')}
            </a>
          </footer>
        )}
      </div>
    </MemberContext.Provider>
  );
}
