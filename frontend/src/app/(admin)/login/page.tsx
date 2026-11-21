'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, MailCheck, PackageOpen, ReceiptText, Store } from 'lucide-react';
import { notify } from '@/components/shared/message-dialog';
import { sendLoginOtp, verifyLoginOtp } from '@/services/supabase';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Preferences } from '@/components/shared/theme-toggle';
import { useI18n } from '@/lib/i18n';
import { applyBrandTheme, cn } from '@/lib/utils';
import type { Profile } from '@/types';

// Supabase sends 6-10 digit codes depending on the project's "Email OTP Length".
const MIN_CODE = 6;
const MAX_CODE = 10;
// Supabase rate-limits OTP emails; waiting a minute between sends keeps the member under it.
const RESEND_AFTER = 60;

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [store, setStore] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getCatalog().then((c) => setStore(c.profile)).catch(() => {});
  }, []);
  useEffect(() => applyBrandTheme(store?.theme_color), [store?.theme_color]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const fail = (err: unknown, title: string) => {
    const message = err instanceof Error ? err.message : title;
    setError(message);
    notify.error(title, { description: message });
    setShakeKey((k) => k + 1);
  };

  const sendCode = async () => {
    setError(null);
    setLoading(true);
    try {
      await sendLoginOtp(email.trim());
      setCode('');
      setStep('code');
      setCooldown(RESEND_AFTER);
      notify.success(t('login.codeSent'), { description: email.trim() });
    } catch (err) {
      fail(err, t('login.sendFailed'));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError(null);
    setLoading(true);
    try {
      const token = await verifyLoginOtp(email.trim(), code);
      notify.success(t('login.welcome'));
      // Store owner goes to the studio; everyone else to their purchases.
      const me = await api.memberMe(token).catch(() => null);
      router.push(me?.isAdmin ? '/admin' : '/member');
    } catch (err) {
      setCode('');
      fail(err, t('login.failed'));
      codeRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void (step === 'email' ? sendCode() : verifyCode());
  };

  const storeName = store?.business_name || store?.display_name || 'Synectra';
  // One box per digit; a box is added as the member types past six for longer codes.
  const boxes = Math.max(MIN_CODE, Math.min(MAX_CODE, code.length + (code.length >= MIN_CODE && code.length < MAX_CODE ? 1 : 0)));
  const benefits = [
    { icon: PackageOpen, text: t('login.benefitProducts') },
    { icon: ReceiptText, text: t('login.benefitReceipts') },
    { icon: MailCheck, text: t('login.benefitPasswordless') },
  ];

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Store side: who you are signing in to and what the member area gives you. */}
      <aside className="relative min-h-[220px] overflow-hidden bg-zinc-900 text-white">
        {store?.cover_banner_url && (
          <motion.img
            src={store.cover_banner_url}
            alt=""
            initial={{ scale: 1.08, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.7 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute inset-x-0 top-0 w-full"
          />
        )}
        {/* The banner shows whole at the top and fades into solid ground, so the store name never sits on banner text. */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/20 via-zinc-900 via-60% to-zinc-900 lg:via-45%" />

        <div className="relative flex h-full flex-col p-5 sm:p-8 lg:p-12">
          <Link href="/" className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm text-white/75 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> {t('login.backToStore')}
          </Link>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6 flex items-center gap-3 lg:mt-auto">
            {store?.avatar_url ? (
              <img src={store.avatar_url} alt="" className="h-14 w-14 rounded-2xl border-2 border-white/20 object-cover lg:h-16 lg:w-16" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary lg:h-16 lg:w-16">
                <Store className="h-6 w-6" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-bold lg:text-2xl">{storeName}</p>
              {store?.bio && <p className="line-clamp-1 text-sm text-white/70">{store.bio}</p>}
            </div>
          </motion.div>

          <ul className="mt-8 hidden space-y-4 lg:block">
            {benefits.map(({ icon: Icon, text }, i) => (
              <motion.li
                key={text}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.1 }}
                className="flex items-center gap-3 text-white/85"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10"><Icon className="h-4 w-4" /></span>
                {text}
              </motion.li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="relative flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <div className="absolute right-4 top-4">
          <Preferences />
        </div>

        <motion.div key={shakeKey} animate={shakeKey ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.45 }} className="w-full max-w-sm">
          <AnimatePresence mode="wait" initial={false}>
            <motion.form
              key={step}
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: step === 'code' ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: step === 'code' ? -40 : 40 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-6"
            >
              <div>
                <p className="text-sm font-medium text-primary">{t('login.stepOf', { n: step === 'email' ? 1 : 2 })}</p>
                <h1 className="mt-1 font-display text-3xl font-bold">{step === 'email' ? t('login.title', { store: storeName }) : t('login.codeTitle')}</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step === 'email' ? t('login.sub') : t('login.codeSub', { email: email.trim() })}
                </p>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    role="alert"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {step === 'email' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t('login.email')}</Label>
                  <Input id="email" type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" className="h-12" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="otp">{t('login.code')}</Label>
                  {/* One real input (paste, autofill, screen readers) drawn as per-digit boxes. */}
                  <div className="group relative">
                    <input
                      id="otp"
                      ref={codeRef}
                      required
                      autoFocus
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern={`\\d{${MIN_CODE},${MAX_CODE}}`}
                      maxLength={MAX_CODE}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, MAX_CODE))}
                      className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
                    />
                    <div aria-hidden className="flex gap-2">
                      {Array.from({ length: boxes }, (_, i) => {
                        const digit = code[i];
                        const active = i === Math.min(code.length, boxes - 1);
                        return (
                          <motion.div
                            key={i}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={cn(
                              'flex h-14 min-w-0 flex-1 items-center justify-center rounded-xl border-2 bg-card font-mono text-2xl font-bold transition-colors',
                              digit ? 'border-primary/60' : 'border-input',
                              active && 'group-focus-within:border-primary group-focus-within:ring-4 group-focus-within:ring-primary/15',
                            )}
                          >
                            <AnimatePresence mode="popLayout">
                              {digit && (
                                <motion.span key={digit + i} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }}>
                                  {digit}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <Button type="submit" variant="brand" size="xl" className="w-full" disabled={loading || (step === 'code' && code.length < MIN_CODE)}>
                {loading ? <Loader2 className="animate-spin" /> : <>{step === 'email' ? t('login.sendCode') : t('login.submit')} <ArrowRight /></>}
              </Button>

              {step === 'code' && (
                <div className="flex items-center justify-between text-sm">
                  <button type="button" onClick={() => { setStep('email'); setError(null); }} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> {t('login.changeEmail')}
                  </button>
                  <button type="button" onClick={() => void sendCode()} disabled={loading || cooldown > 0} className="font-medium text-primary tabular-nums hover:underline disabled:text-muted-foreground disabled:no-underline">
                    {cooldown > 0 ? t('login.resendIn', { s: cooldown }) : t('login.resend')}
                  </button>
                </div>
              )}

              {step === 'email' && <p className="text-xs text-muted-foreground">{t('login.newHint')}</p>}
            </motion.form>
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}
