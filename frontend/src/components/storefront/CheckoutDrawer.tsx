'use client';

import { useId, useRef, useState, type ComponentProps, type FormEvent, type ReactNode } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Loader2, Lock, Mail, ShieldCheck, Sparkles, User, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn, formatRupiah } from '@/lib/utils';
import { api } from '@/services/api';
import type { Product } from '@/types';
import { useI18n } from '@/lib/i18n';

interface CheckoutDrawerProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function CheckoutDrawer({ product, isOpen, onClose }: CheckoutDrawerProps) {
  const { t } = useI18n();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [stage, setStage] = useState<1 | 2>(1);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Same key for resubmits of identical data (double click, retry after timeout); new key if data changes.
  const idempotencyRef = useRef<{ signature: string; key: string } | null>(null);
  // Keep the last product so content stays visible during the close animation.
  const lastProduct = useRef<Product | null>(null);
  if (product) lastProduct.current = product;
  const shown = product ?? lastProduct.current;

  const handleOpenChange = (open: boolean) => {
    if (open || loading) return;
    onClose();
    setTimeout(() => {
      setStage(1);
      setBuyerName('');
      setBuyerEmail('');
      setErrorMsg(null);
    }, 250);
  };

  const handleSubmitPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!shown) return;
    if (buyerName.trim().length < 2) return setErrorMsg(t('checkout.errName'));
    if (!EMAIL_RE.test(buyerEmail.trim())) return setErrorMsg(t('checkout.errEmail'));

    try {
      setLoading(true);
      setErrorMsg(null);
      const dto = { productId: shown.id, buyerName: buyerName.trim(), buyerEmail: buyerEmail.trim() };
      const signature = `${dto.productId}|${dto.buyerName}|${dto.buyerEmail}`;
      if (idempotencyRef.current?.signature !== signature) {
        idempotencyRef.current = { signature, key: crypto.randomUUID() };
      }
      const res = await api.checkout(dto, idempotencyRef.current.key);
      toast.success(t('checkout.created'), { description: t('checkout.redirecting') });
      window.location.href = res.paymentUrl || `/order/${res.invoiceId}`;
    } catch (err: unknown) {
      // A failed attempt leaves an order without a payment URL; retrying with the same key would replay that 409.
      idempotencyRef.current = null;
      setLoading(false);
      const message = err instanceof Error ? err.message : t('checkout.failedGeneric');
      setErrorMsg(message);
      toast.error(t('checkout.failed'), { description: message });
    }
  };

  if (!shown) return null;

  const body = (
    <CheckoutBody
      product={shown}
      stage={stage}
      setStage={(s) => {
        setErrorMsg(null);
        setStage(s);
      }}
      buyerName={buyerName}
      setBuyerName={setBuyerName}
      buyerEmail={buyerEmail}
      setBuyerEmail={setBuyerEmail}
      loading={loading}
      errorMsg={errorMsg}
      onSubmit={handleSubmitPayment}
      split={isDesktop}
    />
  );

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl gap-0 overflow-hidden rounded-3xl p-0 sm:rounded-3xl">
          <DialogTitle className="sr-only">{t('checkout.title', { title: shown.title })}</DialogTitle>
          <DialogDescription className="sr-only">{t('checkout.desc')}</DialogDescription>
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[92vh] rounded-t-3xl">
        <DrawerTitle className="sr-only">{t('checkout.title', { title: shown.title })}</DrawerTitle>
        <DrawerDescription className="sr-only">{t('checkout.desc')}</DrawerDescription>
        {body}
      </DrawerContent>
    </Drawer>
  );
}

interface BodyProps {
  product: Product;
  stage: 1 | 2;
  setStage: (s: 1 | 2) => void;
  buyerName: string;
  setBuyerName: (v: string) => void;
  buyerEmail: string;
  setBuyerEmail: (v: string) => void;
  loading: boolean;
  errorMsg: string | null;
  onSubmit: (e: FormEvent) => void;
  split: boolean;
}

function CheckoutBody({ product, stage, setStage, buyerName, setBuyerName, buyerEmail, setBuyerEmail, loading, errorMsg, onSubmit, split }: BodyProps) {
  const { t } = useI18n();
  const emailValid = EMAIL_RE.test(buyerEmail.trim());

  return (
    <div className={cn('grid', split && 'grid-cols-[1fr_1.15fr]')}>
      {split && (
        <div className="relative min-h-[460px] overflow-hidden bg-muted">
          <Thumb product={product} />
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-x-0 bottom-0 space-y-2 p-6 text-white">
            <span className="inline-block rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] backdrop-blur">{product.category || t('checkout.category')}</span>
            <h3 className="text-xl font-bold leading-tight">{product.title}</h3>
            <p className="font-mono text-2xl font-bold">{formatRupiah(product.price)}</p>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-col">
        {/* Step header with animated progress */}
        <div className="space-y-3 px-6 pb-4 pt-6">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>{t('checkout.step', { n: stage })}</span>
            <span>{stage === 1 ? t('checkout.step1') : t('checkout.step2')}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: stage === 1 ? '50%' : '100%' }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        </div>

        <div className="relative flex-1 overflow-y-auto overflow-x-hidden px-6">
          <AnimatePresence mode="wait" initial={false} custom={stage}>
            {stage === 1 ? (
              <motion.div
                key="s1"
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -40, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-4 pb-4"
              >
                {!split && (
                  <div className="flex items-start gap-4">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border bg-muted">
                      <Thumb product={product} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-medium text-primary">{product.category || t('checkout.category')}</span>
                      <h3 className="line-clamp-2 font-semibold">{product.title}</h3>
                      <p className="mt-1 font-mono text-lg font-bold text-primary">{formatRupiah(product.price)}</p>
                    </div>
                  </div>
                )}
                {product.description && (
                  <p className="max-h-40 overflow-y-auto whitespace-pre-line rounded-2xl bg-muted/60 p-4 text-sm leading-relaxed text-muted-foreground">
                    {product.description}
                  </p>
                )}
                <ul className="space-y-2">
                  {[t('checkout.perk1'), t('checkout.perk2'), t('checkout.perk3')].map((t, i) => (
                    <motion.li
                      key={t}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.07 }}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-success">
                        <Check className="h-3 w-3" />
                      </span>
                      {t}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ) : (
              <motion.form
                key="s2"
                id="checkout-form"
                onSubmit={onSubmit}
                noValidate
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 40, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-4 pb-4"
              >
                <FloatingInput
                  label={t('checkout.name')}
                  icon={<User />}
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  valid={buyerName.trim().length >= 2}
                  autoComplete="name"
                  autoFocus
                />
                <div className="space-y-1.5">
                  <FloatingInput
                    label={t('checkout.email')}
                    type="email"
                    icon={<Mail />}
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    valid={emailValid}
                    autoComplete="email"
                    inputMode="email"
                  />
                  <p className="pl-1 text-xs text-muted-foreground">{t('checkout.emailHint')}</p>
                </div>

                <div className="space-y-2 rounded-2xl border bg-muted/40 p-4 text-sm">
                  <Row label={t('checkout.price')} value={formatRupiah(product.price)} />
                  <Row label={t('checkout.fee')} value={<span className="font-medium text-success">{t('checkout.free')}</span>} />
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>{t('checkout.total')}</span>
                    <span className="font-mono text-primary">{formatRupiah(product.price)}</span>
                  </div>
                </div>

                <AnimatePresence>
                  {errorMsg && (
                    <motion.p
                      role="alert"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto', x: [0, -6, 6, -3, 3, 0] }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    >
                      {errorMsg}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Sticky action bar */}
        <div className="space-y-3 border-t bg-background/80 p-4 backdrop-blur sm:px-6">
          <div className="flex gap-2">
            <AnimatePresence initial={false}>
              {stage === 2 && (
                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }}>
                  <Button type="button" variant="outline" size="xl" disabled={loading} onClick={() => setStage(1)} aria-label={t('checkout.back')}>
                    <ArrowLeft />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            {stage === 1 ? (
              <Button variant="brand" size="xl" className="flex-1" onClick={() => setStage(2)}>
                {t('checkout.next')} <ArrowRight />
              </Button>
            ) : (
              <Button type="submit" form="checkout-form" variant="brand" size="xl" className="flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" /> {t('checkout.preparing')}
                  </>
                ) : (
                  <>
                    <Zap /> {t('checkout.pay', { amount: formatRupiah(product.price) })}
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> {t('checkout.secure')}</span>
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> {t('checkout.methods')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Thumb({ product }: { product: Product }) {
  return product.thumbnail_url ? (
    <Image src={product.thumbnail_url} alt={product.title} fill sizes="400px" className="object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-primary/15">
      <Sparkles className="h-10 w-10 text-primary/60" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function FloatingInput({ label, icon, valid, className, ...props }: ComponentProps<'input'> & { label: string; icon: ReactNode; valid: boolean }) {
  const id = useId();
  return (
    <div className="group relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </span>
      <input
        id={id}
        placeholder=" "
        className={cn(
          'peer h-14 w-full rounded-xl border bg-background/60 pl-10 pr-10 pt-4 text-sm outline-none transition-all',
          'hover:border-primary/40 focus:border-primary focus:ring-4 focus:ring-primary/15',
          className,
        )}
        {...props}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 text-sm text-muted-foreground transition-all peer-focus:top-4 peer-focus:text-[11px] peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-4 peer-[:not(:placeholder-shown)]:text-[11px]"
      >
        {label}
      </label>
      <AnimatePresence>
        {valid && (
          <motion.span
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            className="absolute right-3.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-success text-white"
          >
            <Check className="h-3 w-3" />
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
