import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** '#00A8E8' → '197 100% 45%' (the HSL triplet format used by the CSS tokens). Null if invalid. */
export function hexToHslTriplet(hex: string | null | undefined): string | null {
  const m = hex?.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const full = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return `${Math.round(((h * 60) + 360) % 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * CSS vars that re-skin a subtree with the store's theme color (see [data-brand] in globals.css).
 * Dark mode gets a lifted lightness so very dark brand colors stay visible.
 */
export function brandVars(hex: string | null | undefined): Record<string, string> | undefined {
  const light = hexToHslTriplet(hex);
  if (!light) return undefined;
  const [h, s, l] = light.split(' ');
  const dark = `${h} ${s} ${Math.max(parseInt(l, 10), 62)}%`;
  return { '--brand-l': light, '--brand-d': dark };
}

/** Apply the store theme color to <html> while the calling page is mounted. */
export function applyBrandTheme(hex: string | null | undefined): () => void {
  const vars = brandVars(hex);
  const root = document.documentElement;
  if (!vars) return () => {};
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute('data-brand', '');
  return () => {
    Object.keys(vars).forEach((k) => root.style.removeProperty(k));
    root.removeAttribute('data-brand');
  };
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
