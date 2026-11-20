'use client';

import { useSyncExternalStore } from 'react';
import { CheckCircle2, CircleAlert, HelpCircle, Info, TriangleAlert } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Kind = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface MessageOptions {
  description?: string;
  /** Optional second button, e.g. "Open cart". */
  action?: { label: string; onClick: () => void };
}

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
}

interface Entry extends MessageOptions {
  id: number;
  kind: Kind;
  title: string;
  confirmLabel?: string;
  destructive?: boolean;
  resolve?: (confirmed: boolean) => void;
}

// One dialog at a time; later messages wait their turn.
let queue: Entry[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function push(entry: Omit<Entry, 'id'>) {
  queue = [...queue, { ...entry, id: nextId++ }];
  emit();
}

function close(id: number, confirmed: boolean) {
  const entry = queue.find((e) => e.id === id);
  if (!entry) return;
  queue = queue.filter((e) => e.id !== id);
  emit();
  entry.resolve?.(confirmed);
}

const show = (kind: Exclude<Kind, 'confirm'>) => (title: string, options: MessageOptions = {}) => push({ kind, title, ...options });

/** Modal message dialogs (success/error/warning/info) and promise-based confirmations. */
export const notify = {
  success: show('success'),
  error: show('error'),
  warning: show('warning'),
  info: show('info'),
  confirm: (options: ConfirmOptions) => new Promise<boolean>((resolve) => push({ kind: 'confirm', ...options, resolve })),
};

const STYLE: Record<Kind, { icon: typeof Info; tone: string }> = {
  success: { icon: CheckCircle2, tone: 'bg-success/15 text-success' },
  error: { icon: CircleAlert, tone: 'bg-destructive/15 text-destructive' },
  warning: { icon: TriangleAlert, tone: 'bg-warning/15 text-warning' },
  info: { icon: Info, tone: 'bg-primary/15 text-primary' },
  confirm: { icon: HelpCircle, tone: 'bg-primary/15 text-primary' },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const EMPTY: Entry[] = [];

/** Mounted once in the root layout. */
export function MessageDialogHost() {
  const { t } = useI18n();
  const current = useSyncExternalStore(subscribe, () => queue, () => EMPTY)[0];
  if (!current) return null;

  const { icon: Icon, tone } = STYLE[current.kind];
  const danger = current.destructive || current.kind === 'error';
  const toneClass = current.destructive ? STYLE.error.tone : tone;

  return (
    // key: each message gets a fresh dialog; onOpenChange closes over this entry's id only.
    <AlertDialog key={current.id} open onOpenChange={(open) => !open && close(current.id, false)}>
      <AlertDialogContent className="max-w-sm rounded-3xl">
        <AlertDialogHeader className="items-center text-center sm:text-center">
          <span className={cn('mb-1 flex h-14 w-14 items-center justify-center rounded-full', toneClass)}>
            <Icon className="h-7 w-7" />
          </span>
          <AlertDialogTitle>{current.title}</AlertDialogTitle>
          {current.description && <AlertDialogDescription className="text-balance">{current.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:justify-center">
          {current.kind === 'confirm' ? (
            <>
              <AlertDialogCancel className="sm:flex-1">{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => close(current.id, true)}
                className={cn('sm:flex-1', current.destructive && 'bg-destructive text-destructive-foreground hover:bg-destructive/90')}
              >
                {current.confirmLabel ?? t('common.confirm')}
              </AlertDialogAction>
            </>
          ) : current.action ? (
            <>
              <AlertDialogCancel className="sm:flex-1">{t('common.close')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  close(current.id, true);
                  current.action?.onClick();
                }}
                className="sm:flex-1"
              >
                {current.action.label}
              </AlertDialogAction>
            </>
          ) : (
            <AlertDialogAction
              onClick={() => close(current.id, true)}
              className={cn('w-full', danger && 'bg-destructive text-destructive-foreground hover:bg-destructive/90')}
            >
              {t('common.ok')}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
