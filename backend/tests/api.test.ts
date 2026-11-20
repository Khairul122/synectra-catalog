import { describe, expect, it, vi } from 'vitest';
import { app } from '../api/index';
import { catalogService } from '@/services/catalog.service';
import { orderRepository } from '@/repositories/order.repository';
import { adminService } from '@/services/admin.service';

describe('Backend API Integration Tests', () => {
  it('GET /api/health returns ok status', async () => {
    const res = await app.request('/api/health');
    const json = (await res.json()) as { status: string; service: string };

    expect(res.status).toBe(200);
    expect(json.status).toBe('ok');
    expect(json.service).toBe('synectra-backend-api');
  });

  it('GET /api/unknown-endpoint returns 404 with standard error format', async () => {
    const res = await app.request('/api/not-existing-path');
    const json = (await res.json()) as { success: boolean; message: string };

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.message).toBe('API route not found');
  });

  it('GET /api/catalog returns 200 with catalog data structure', async () => {
    vi.spyOn(catalogService, 'getCatalog').mockResolvedValueOnce({
      profile: {
        id: '1',
        business_name: 'Synectra Studio',
        bio: 'Digital Goods & Templates',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      links: [],
      products: [],
    });

    const res = await app.request('/api/catalog');
    const json = (await res.json()) as {
      success: boolean;
      data: { profile: unknown; links: unknown[]; products: unknown[] };
    };

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(Array.isArray(json.data.links)).toBe(true);
    expect(Array.isArray(json.data.products)).toBe(true);
  });

  it('POST /api/checkout fails with 400 on invalid body schema', async () => {
    const res = await app.request('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: 'not-a-uuid',
        buyerName: 'A',
        buyerEmail: 'invalid-email',
      }),
    });

    const json = (await res.json()) as { success: boolean; message: string; error?: { code?: string } };
    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe('VALIDATION_FAILED');
  });

  it('GET /api/order/:invoiceId returns 404 when invoice does not exist', async () => {
    vi.spyOn(orderRepository, 'getOrderByInvoiceId').mockResolvedValueOnce(null);

    const res = await app.request('/api/order/INV-NON-EXISTENT-999');
    const json = (await res.json()) as { success: boolean; error?: { code?: string } };

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe('NOT_FOUND');
  });

  it('GET /api/admin/analytics denies access (401) without Authorization token', async () => {
    const res = await app.request('/api/admin/analytics');
    const json = (await res.json()) as { success: boolean; error?: { code?: string } };

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/admin/analytics allows access (200) with test-admin-token in test environment', async () => {
    vi.spyOn(adminService, 'getAnalytics').mockResolvedValueOnce({
      totalRevenue: 500000,
      totalOrders: 5,
      paidOrdersCount: 3,
      pendingOrdersCount: 2,
      failedOrdersCount: 0,
    });

    const res = await app.request('/api/admin/analytics', {
      headers: {
        Authorization: 'Bearer test-admin-token',
      },
    });

    const json = (await res.json()) as { success: boolean; data?: unknown };
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  // --- Profile / Appearance Integration Tests ---
  it('GET /api/admin/profile denies access (401) without Authorization token', async () => {
    const res = await app.request('/api/admin/profile');
    const json = (await res.json()) as { success: boolean; error?: { code?: string } };

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/admin/profile returns 200 with profile including appearance fields', async () => {
    vi.spyOn(adminService, 'getProfile').mockResolvedValueOnce({
      id: 'profile-1',
      business_name: 'Synectra Digital',
      display_name: 'Synectra Store',
      bio: 'Digital products & templates',
      avatar_url: 'https://example.com/avatar.png',
      cover_banner_url: 'https://example.com/cover.png',
      instagram_url: 'https://instagram.com/synectra',
      tiktok_url: 'https://tiktok.com/@synectra',
      youtube_url: 'https://youtube.com/@synectra',
      theme_color: '#00A8E8',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const res = await app.request('/api/admin/profile', {
      headers: { Authorization: 'Bearer test-admin-token' },
    });

    const json = (await res.json()) as { success: boolean; data?: unknown };
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    const profile = json.data as Record<string, unknown>;
    expect(profile.business_name).toBe('Synectra Digital');
    expect(profile.display_name).toBe('Synectra Store');
    expect(profile.cover_banner_url).toBe('https://example.com/cover.png');
    expect(profile.instagram_url).toBe('https://instagram.com/synectra');
    expect(profile.tiktok_url).toBe('https://tiktok.com/@synectra');
    expect(profile.youtube_url).toBe('https://youtube.com/@synectra');
    expect(profile.theme_color).toBe('#00A8E8');
  });

  it('PUT /api/admin/profile/:id updates appearance fields successfully', async () => {
    const updatedProfile = {
      id: 'profile-1',
      business_name: 'Synectra Digital',
      display_name: 'Updated Store Name',
      bio: 'Updated bio description',
      avatar_url: 'https://example.com/new-avatar.png',
      cover_banner_url: 'https://example.com/new-cover.png',
      instagram_url: 'https://instagram.com/updated',
      tiktok_url: 'https://tiktok.com/@updated',
      youtube_url: 'https://youtube.com/@updated',
      theme_color: '#10B981',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    vi.spyOn(adminService, 'updateProfile').mockResolvedValueOnce(updatedProfile);

    const res = await app.request('/api/admin/profile/profile-1', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer test-admin-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        display_name: 'Updated Store Name',
        bio: 'Updated bio description',
        avatar_url: 'https://example.com/new-avatar.png',
        cover_banner_url: 'https://example.com/new-cover.png',
        instagram_url: 'https://instagram.com/updated',
        tiktok_url: 'https://tiktok.com/@updated',
        youtube_url: 'https://youtube.com/@updated',
        theme_color: '#10B981',
      }),
    });

    const json = (await res.json()) as { success: boolean; data?: unknown };
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    const profile = json.data as Record<string, unknown>;
    expect(profile.display_name).toBe('Updated Store Name');
    expect(profile.cover_banner_url).toBe('https://example.com/new-cover.png');
    expect(profile.theme_color).toBe('#10B981');
  });

  it('PUT /api/admin/profile/:id rejects invalid theme_color format', async () => {
    const res = await app.request('/api/admin/profile/profile-1', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer test-admin-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        theme_color: 'not-a-hex-color',
      }),
    });

    const json = (await res.json()) as { success: boolean; error?: { code?: string } };
    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe('VALIDATION_FAILED');
  });

  it('PUT /api/admin/profile/:id rejects invalid URL format for social links', async () => {
    const res = await app.request('/api/admin/profile/profile-1', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer test-admin-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instagram_url: 'not-a-valid-url',
        tiktok_url: 'ftp://invalid-protocol.com',
      }),
    });

    const json = (await res.json()) as { success: boolean; error?: { code?: string } };
    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe('VALIDATION_FAILED');
  });

  it('PUT /api/admin/profile/:id normalizes empty strings to null for appearance fields', async () => {
    const updatedProfile = {
      id: 'profile-1',
      business_name: 'Synectra Digital',
      display_name: null,
      bio: null,
      avatar_url: null,
      cover_banner_url: null,
      instagram_url: null,
      tiktok_url: null,
      youtube_url: null,
      theme_color: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    vi.spyOn(adminService, 'updateProfile').mockResolvedValueOnce(updatedProfile);

    const res = await app.request('/api/admin/profile/profile-1', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer test-admin-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        display_name: '',
        bio: '',
        instagram_url: '',
        theme_color: '',
      }),
    });

    const json = (await res.json()) as { success: boolean; data?: unknown };
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});
