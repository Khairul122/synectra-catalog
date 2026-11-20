import { describe, expect, it, vi } from 'vitest';
import { api } from './api';

describe('API routing', () => {
  it('uses Next same-origin /api paths by default', async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    globalThis.fetch = fetchMock as typeof fetch;

    try {
      await api.adminGetLinks('test-admin-token');
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/links', {
        headers: { Authorization: 'Bearer test-admin-token' },
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('surfaces backend message and status on errors', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, message: 'Token tidak valid', error: { code: 'UNAUTHORIZED' } }), { status: 401 }),
    ) as typeof fetch;

    try {
      await expect(api.adminGetLinks('bad')).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Token tidak valid',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
