import { beforeEach, describe, expect, it, vi } from 'vitest';

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send };
  },
}));

import { ResendAdapter } from '@/infrastructure/resend.adapter';

beforeEach(() => {
  send.mockReset();
});

describe('ResendAdapter', () => {
  it('throws provider failures instead of returning a fallback ID', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'provider unavailable' } });

    await expect(
      new ResendAdapter().sendProductDeliveryEmail({
        to: 'buyer@example.com',
        buyerName: 'Buyer',
        productTitle: 'Asset',
        invoiceId: 'INV-TEST',
        signedDownloadUrl: 'https://example.com/download',
      }),
    ).rejects.toThrow('provider unavailable');
  });
});
