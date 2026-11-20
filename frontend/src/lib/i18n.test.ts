import { describe, expect, it } from 'vitest';
import { translate } from './i18n';

describe('translate', () => {
  it('interpolates variables per locale', () => {
    expect(translate('id', 'checkout.step', { n: 2 })).toBe('Langkah 2 dari 2');
    expect(translate('en', 'checkout.step', { n: 2 })).toBe('Step 2 of 2');
  });
  it('leaves unknown placeholders visible instead of printing undefined', () => {
    expect(translate('en', 'checkout.pay')).toBe('Pay {amount}');
    expect(translate('en', 'checkout.pay', {})).toBe('Pay {amount}');
  });
});

import { hexToHslTriplet } from './utils';

describe('hexToHslTriplet', () => {
  it('converts brand hex values and rejects junk', () => {
    expect(hexToHslTriplet('#00A8E8')).toBe('197 100% 45%');
    expect(hexToHslTriplet('#fff')).toBe('0 0% 100%');
    expect(hexToHslTriplet('#0F172A')).toBe('222 47% 11%');
    expect(hexToHslTriplet('red')).toBeNull();
  });
});
