import { describe, expect, it, vi } from 'vitest';
import { dokuAdapter } from '@/infrastructure/doku.adapter';

describe('DOKU Adapter Security & Signature Verification', () => {
  it('generates reproducible SHA256 digest', () => {
    const payload = JSON.stringify({ amount: 150000, invoice: 'INV-123' });
    const digest1 = dokuAdapter.generateDigest(payload);
    const digest2 = dokuAdapter.generateDigest(payload);

    expect(digest1).toBe(digest2);
    expect(typeof digest1).toBe('string');
    expect(digest1.length).toBeGreaterThan(10);
  });

  it('generates and verifies valid HMAC-SHA256 signature', () => {
    const body = JSON.stringify({ test: 'data' });
    const digest = dokuAdapter.generateDigest(body);
    const requestId = 'REQ-TEST-001';
    const timestamp = new Date().toISOString();
    const requestTarget = '/checkout/v1/payment';

    const signature = dokuAdapter.generateSignature(
      requestId,
      timestamp,
      requestTarget,
      digest,
    );

    expect(signature.startsWith('HMACSHA256=')).toBe(true);

    const isValid = dokuAdapter.verifySignature(
      process.env.DOKU_CLIENT_ID || 'MALL-ID-DEMO',
      requestId,
      timestamp,
      signature,
      requestTarget,
      body,
    );

    expect(isValid).toBe(true);
  });

  it('rejects tampered payload signature', () => {
    const originalBody = JSON.stringify({ amount: 100000 });
    const tamperedBody = JSON.stringify({ amount: 1000 }); // Attempted price tampering
    const digest = dokuAdapter.generateDigest(originalBody);
    const requestId = 'REQ-TEST-002';
    const timestamp = new Date().toISOString();
    const requestTarget = '/checkout/v1/payment';

    const signature = dokuAdapter.generateSignature(
      requestId,
      timestamp,
      requestTarget,
      digest,
    );

    const isValid = dokuAdapter.verifySignature(
      process.env.DOKU_CLIENT_ID || 'MALL-ID-DEMO',
      requestId,
      timestamp,
      signature,
      requestTarget,
      tamperedBody,
    );

    expect(isValid).toBe(false);
  });

  it('rejects stale signatures', () => {
    const body = JSON.stringify({ test: 'data' });
    const requestId = 'REQ-TEST-003';
    const timestamp = new Date(Date.now() - 301_000).toISOString();
    const requestTarget = '/api/webhooks/doku';
    const signature = dokuAdapter.generateSignature(
      requestId,
      timestamp,
      requestTarget,
      dokuAdapter.generateDigest(body),
    );

    expect(
      dokuAdapter.verifySignature(
        process.env.DOKU_CLIENT_ID || 'MALL-ID-DEMO',
        requestId,
        timestamp,
        signature,
        requestTarget,
        body,
      ),
    ).toBe(false);
  });

  it('throws when DOKU provider fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('provider unavailable'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      dokuAdapter.createCheckout({
        invoiceId: 'INV-TEST',
        amount: 25_000,
        buyerName: 'Buyer',
        buyerEmail: 'buyer@example.com',
        productTitle: 'Asset',
      }),
    ).rejects.toThrow('provider unavailable');
  });
});
