'use client';

import { Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Lock, ShoppingCart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/shared/feedback';
import { Preferences } from '@/components/shared/theme-toggle';
import { useCatalogProducts } from '@/hooks/use-catalog-products';
import { cart, useCart } from '@/lib/cart';
import { useI18n } from '@/lib/i18n';
import { formatRupiah } from '@/lib/utils';
import { api } from '@/services/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function CheckoutPage() {
  // useSearchParams needs a Suspense boundary for the static build.
  return (
    <Suspense>
      <Checkout />
    </Suspense>
  );
}

function Checkout() {
  const { t } = useI18n();
  // ?product=<id> is "Buy now" for a single product; otherwise the cart is checked out.
  const buyNowId = useSearchParams().get('product');
  const cartItems = useCart();
  const { products, loading, failed, retry } = useCatalogProducts();

  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  // Same key for resubmits of identical data (double click, retry after timeout); new key if data changes.
  const idempotencyRef = useRef<{ signature: string; key: string } | null>(null);

  const wantedIds = buyNowId ? [buyNowId] : cartItems.map((item) => item.id);
  // Current catalog data, not the cart snapshot: shows today's price and drops products no longer sold.
  const selected = products ? wantedIds.map((id) => products.find((p) => p.id === id)).filter((p) => p !== undefined) : [];
  const total = selected.reduce((sum, p) => sum + p.price, 0);

  const staleCart = !buyNowId && products !== null && selected.length < cartItems.length;
  useEffect(() => {
    if (!staleCart) return;
    cart.keep(selected.map((p) => p.id));
    toast.warning(t('checkout.unavailable'));
  }, [staleCart]); // Intentionally keyed on detection only: selected/t change identity every render.

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = buyerName.trim();
    const email = buyerEmail.trim();
    const phone = buyerPhone.trim();
    const nextErrors = {
      name: name.length < 2 ? t('checkout.errName') : undefined,
      email: EMAIL_RE.test(email) ? undefined : t('checkout.errEmail'),
      // Same rule as the server: Indonesian mobile number (08…, 628…, +628…).
      phone: /^(\+?62|0)8\d{7,12}$/.test(phone.replace(/[\s.-]/g, '')) ? undefined : t('checkout.errPhone'),
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.email || nextErrors.phone || selected.length === 0) return;

    const dto = { productIds: selected.map((p) => p.id), buyerName: name, buyerEmail: email, buyerPhone: phone };
    const signature = `${dto.productIds.join()}|${name}|${email}|${phone}`;
    if (idempotencyRef.current?.signature !== signature) {
      idempotencyRef.current = { signature, key: crypto.randomUUID() };
    }

    setSubmitting(true);
    try {
      const res = await api.checkout(dto, idempotencyRef.current.key);
      if (!buyNowId) cart.clear();
      toast.success(t('checkout.created'), { description: t('checkout.redirecting') });
      window.location.href = res.paymentUrl || `/order/${res.invoiceId}`;
    } catch (err) {
      // A failed attempt leaves an order without a payment URL; retrying with the same key would replay that 409.
      idempotencyRef.current = null;
      setSubmitting(false);
      toast.error(t('checkout.failed'), { description: err instanceof Error ? err.message : t('checkout.failedGeneric') });
    }
  };

  const backHref = buyNowId ? `/p/${buyNowId}` : '/cart';

  return (
    <main className="min-h-screen bg-muted/50">
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-2">
          <Button asChild variant="ghost" size="icon" className="shrink-0 rounded-full">
            <Link href={backHref} aria-label={t('checkout.back')}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-center font-display text-xl font-semibold">{t('checkout.pageTitle')}</h1>
          <Preferences className="shrink-0" />
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-4">
        {failed ? (
          <ErrorState message={t('store.loadError')} onRetry={retry} retrying={loading} />
        ) : loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        ) : selected.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={t('cart.empty')}
            description={t('cart.emptySub')}
            action={
              <Button asChild variant="brand">
                <Link href="/">{t('cart.continue')}</Link>
              </Button>
            }
          />
        ) : (
          <form onSubmit={submit} noValidate className="grid items-start gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <Card title={t('checkout.products')}>
                <ul className="divide-y">
                  {selected.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="relative aspect-square w-16 shrink-0 overflow-hidden rounded bg-muted">
                        {p.thumbnail_url ? (
                          <Image src={p.thumbnail_url} alt="" fill sizes="64px" className="object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-primary/10">
                            <Sparkles className="h-5 w-5 text-primary/50" />
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2 min-w-0 flex-1 text-sm font-medium">{p.title}</p>
                      <span className="shrink-0 text-sm text-muted-foreground">1x</span>
                      <span className="shrink-0 text-sm font-semibold">{formatRupiah(p.price)}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card title={t('checkout.buyerInfo')}>
                <div className="space-y-4">
                  <Field id="buyer-name" label={t('checkout.name')} error={errors.name}>
                    <Input
                      id="buyer-name"
                      autoComplete="name"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? 'buyer-name-error' : undefined}
                      className="h-12"
                    />
                  </Field>
                  <Field id="buyer-email" label={t('checkout.email')} error={errors.email} hint={t('checkout.emailHint')}>
                    <Input
                      id="buyer-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'buyer-email-error' : 'buyer-email-hint'}
                      className="h-12"
                    />
                  </Field>
                  <Field id="buyer-phone" label={t('checkout.phone')} error={errors.phone}>
                    <Input
                      id="buyer-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="081234567890"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby={errors.phone ? 'buyer-phone-error' : undefined}
                      className="h-12"
                    />
                  </Field>
                </div>
              </Card>
            </div>

            <Card title={t('checkout.paymentDetail')}>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt>{t('checkout.subtotal')}</dt>
                  <dd>{formatRupiah(total)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t('checkout.fee')}</dt>
                  <dd className="text-success">{t('checkout.free')}</dd>
                </div>
                <div className="flex justify-between border-t pt-3 text-base font-bold">
                  <dt>{t('checkout.total').toUpperCase()}</dt>
                  <dd>{formatRupiah(total)}</dd>
                </div>
              </dl>

              <div className="mt-5 flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4">
                <Lock className="h-8 w-8 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold">{t('checkout.secure')}</p>
                  <p className="text-xs text-muted-foreground">{t('checkout.secureSub')}</p>
                </div>
              </div>

              <Button type="submit" variant="brand" size="xl" className="mt-5 w-full" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" />}
                {submitting ? t('checkout.preparing') : t('checkout.buyNow', { amount: formatRupiah(total) })}
              </Button>
            </Card>
          </form>
        )}
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        <span className="text-destructive">*</span> {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
