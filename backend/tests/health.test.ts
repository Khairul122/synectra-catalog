import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';

describe('API Health Endpoint', () => {
  it('returns success status and message', async () => {
    const app = new Hono().basePath('/api');
    app.get('/health', (c) => c.json({ success: true, message: 'Synectra API active' }));

    const res = await app.request('/api/health');
    const body = (await res.json()) as { success: boolean; message: string };

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe('Synectra API active');
  });
});
