'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { notify } from '@/components/shared/message-dialog';
import { ArrowLeft, ArrowRight, KeyRound, Loader2, Mail, Sparkles } from 'lucide-react';
import { sendAdminOtp, verifyAdminOtp } from '@/services/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Preferences } from '@/components/shared/theme-toggle';
import { useI18n } from '@/lib/i18n';

export default function AdminLoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

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
      await sendAdminOtp(email.trim());
      setCode('');
      setStep('code');
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
      await verifyAdminOtp(email.trim(), code);
      notify.success(t('login.welcome'));
      router.push('/admin');
    } catch (err) {
      fail(err, t('login.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void (step === 'email' ? sendCode() : verifyCode());
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="fixed right-4 top-4">
        <Preferences />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 20 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-glow"
          >
            <Sparkles className="h-7 w-7 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold">
            Synectra <span className="text-primary">{t('login.studio')}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{step === 'email' ? t('login.sub') : t('login.codeSub', { email: email.trim() })}</p>
        </div>

        <motion.div key={shakeKey} animate={shakeKey ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.45 }} className="glass rounded-3xl p-6 shadow-2xl shadow-black/10 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                <div className="group relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input id="email" type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" className="pl-10" />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="otp">{t('login.code')}</Label>
                <div className="group relative">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="otp"
                    required
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="pl-10 font-mono text-lg tracking-[0.5em]"
                  />
                </div>
              </div>
            )}

            <Button type="submit" variant="brand" size="xl" className="mt-2 w-full" disabled={loading || (step === 'code' && code.length !== 6)}>
              {loading ? <Loader2 className="animate-spin" /> : <>{step === 'email' ? t('login.sendCode') : t('login.submit')} <ArrowRight /></>}
            </Button>

            {step === 'code' && (
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => { setStep('email'); setError(null); }} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" /> {t('login.changeEmail')}
                </button>
                <button type="button" onClick={() => void sendCode()} disabled={loading} className="font-medium text-primary hover:underline disabled:opacity-50">
                  {t('login.resend')}
                </button>
              </div>
            )}
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
