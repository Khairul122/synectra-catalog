import { flushSync } from 'react-dom';

export type TransitionKind = 'theme' | 'locale';

/**
 * Run a UI-wide state change inside a View Transition.
 * - theme: circular reveal growing from `origin` (the clicked control).
 * - locale: blurred cross-fade of the whole page.
 * Falls back to an instant update when the API is missing or the user prefers reduced motion.
 */
export function runViewTransition(kind: TransitionKind, update: () => void, origin?: HTMLElement | null) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduceMotion) {
    update();
    return;
  }

  const root = document.documentElement;
  if (origin) {
    const r = origin.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    // Radius that reaches the farthest viewport corner from the origin.
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.style.setProperty('--vt-x', `${x}px`);
    root.style.setProperty('--vt-y', `${y}px`);
    root.style.setProperty('--vt-r', `${radius}px`);
  }
  root.dataset.vt = kind;

  // flushSync so React commits the new DOM before the browser takes the "after" snapshot.
  const transition = document.startViewTransition(() => flushSync(update));
  transition.finished.finally(() => {
    delete root.dataset.vt;
  });
}
