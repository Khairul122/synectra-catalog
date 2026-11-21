'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Store } from 'lucide-react';
import { api } from '@/services/api';
import { Preferences } from '@/components/shared/theme-toggle';
import { useI18n } from '@/lib/i18n';
import { applyBrandTheme } from '@/lib/utils';
import type { Profile } from '@/types';

/** Store-branded frame shared by the admin and member sign-in pages. The card shakes whenever shakeKey changes. */
export function LoginShell({ shakeKey, children }: { shakeKey: number; children: React.ReactNode }) {
  const { t } = useI18n();
  const [store, setStore] = useState<Profile | null>(null);

  useEffect(() => {
    api.getCatalog().then((c) => setStore(c.profile)).catch(() => {});
  }, []);
  useEffect(() => applyBrandTheme(store?.theme_color), [store?.theme_color]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <Link href="/" className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md py-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t('login.backToStore')}
      </Link>
      <div className="absolute right-4 top-4">
        <Preferences />
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col items-center text-center">
        {store?.avatar_url ? (
          <img src={store.avatar_url} alt="" className="h-16 w-16 rounded-2xl border object-cover shadow-sm" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Store className="h-7 w-7" />
          </span>
        )}
        <p className="mt-3 font-display font-semibold">{store?.business_name || store?.display_name || 'Synectra'}</p>
      </motion.div>

      <motion.div key={shakeKey} animate={shakeKey ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.45 }} className="w-full max-w-sm rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
        {children}
      </motion.div>
    </div>
  );
}

export function LoginError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <motion.p role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </motion.p>
  );
}
