'use client';

import { useEffect, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { CheckCircle2, Clock, RefreshCw, WifiOff, XCircle, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types';
import { useI18n } from '@/lib/i18n';

/** Empty list: floating icon with a soft halo instead of a flat grey box. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/40 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="relative mb-5">
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, -4, 4, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="relative flex h-16 w-16 items-center justify-center rounded-2xl border bg-card shadow-lg"
        >
          <Icon className="h-7 w-7 text-primary" />
        </motion.div>
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

/** Recoverable error: shakes in once, offers a retry. Replaces red alert boxes. */
export function ErrorState({
  message,
  onRetry,
  retrying,
  className,
}: {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1, x: [0, -8, 8, -4, 4, 0] }}
      transition={{ duration: 0.5 }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center',
        className,
      )}
    >
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"
      >
        <WifiOff className="h-6 w-6" />
      </motion.div>
      <p className="relative text-sm font-medium">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} disabled={retrying} className="relative mt-5">
          <RefreshCw className={cn(retrying && 'animate-spin')} />
          {t('common.retry')}
        </Button>
      )}
    </motion.div>
  );
}

const STATUS: Record<OrderStatus, { icon: LucideIcon; className: string }> = {
  PAID: { icon: CheckCircle2, className: 'bg-success/10 text-success border-success/25' },
  PENDING: { icon: Clock, className: 'bg-warning/10 text-warning border-warning/25' },
  FAILED: { icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/25' },
  EXPIRED: { icon: Clock, className: 'bg-muted text-muted-foreground border-border' },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  const { icon: Icon, className } = STATUS[status];
  const label = t(`status.${status}`);
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', className)}>
      {status === 'PENDING' ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
        </span>
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      {label}
    </span>
  );
}

/** Counts up from 0 to `value` when mounted or when value changes. */
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString('id-ID') }: { value: number; format?: (n: number) => string }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, format);
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [mv, value]);
  return <motion.span>{text}</motion.span>;
}
