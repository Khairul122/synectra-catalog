import type { Profile, Link, Product, Order, OrderStatus, AdminAnalytics, TrafficSummary, CheckoutPayload, Member, MemberMe, MemberOrder } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

class ApiError extends Error {
  constructor(public status: number, public code?: string, message?: string) {
    super(message || `Permintaan gagal (${status})`);
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Validation failures carry per-field messages; show those instead of the generic "Validation error".
    const details = Array.isArray(data.error?.details) ? (data.error.details as { message?: string }[]) : [];
    const fieldMessages = details.map((d) => d.message).filter(Boolean).join(', ');
    throw new ApiError(response.status, data.error?.code ?? data.code, fieldMessages || data.message);
  }
  return data as T;
}

export const api = {
  // PUBLIC
  async getCatalog(category?: string): Promise<{ profile: Profile; links: Link[]; products: Product[] }> {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    const res = await fetch(`${API_BASE}/catalog?${params.toString()}`, {
      next: { revalidate: 60 },
    });
    const data = await handleResponse<{ data: { profile: Profile; links: Link[]; products: Product[] } }>(res);
    return data.data;
  },

  async checkout(
    dto: CheckoutPayload,
    idempotencyKey?: string,
  ): Promise<{ invoiceId: string; paymentUrl: string | null }> {
    const res = await fetch(`${API_BASE}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify(dto),
    });
    const data = await handleResponse<{ data: { invoiceId: string; paymentUrl: string } }>(res);
    return data.data;
  },

  async getOrder(invoiceId: string): Promise<Order | null> {
    const res = await fetch(`${API_BASE}/order/${invoiceId}`, { next: { revalidate: 10 } });
    if (res.status === 404) return null;
    const data = await handleResponse<{ data: Order }>(res);
    return data.data;
  },

  async getDownloadLinks(invoiceId: string): Promise<Array<{ productId: string; title: string; url: string }>> {
    const res = await fetch(`${API_BASE}/order/${invoiceId}/download`);
    const data = await handleResponse<{ data: { downloads: Array<{ productId: string; title: string; url: string }> } }>(res);
    return data.data.downloads;
  },

  // MEMBER (buyer signed in with email OTP)
  async memberMe(token: string): Promise<MemberMe> {
    const res = await fetch(`${API_BASE}/member/me`, { headers: { Authorization: `Bearer ${token}` } });
    return (await handleResponse<{ data: MemberMe }>(res)).data;
  },

  async memberOrders(token: string): Promise<MemberOrder[]> {
    const res = await fetch(`${API_BASE}/member/orders`, { headers: { Authorization: `Bearer ${token}` } });
    return (await handleResponse<{ data: MemberOrder[] }>(res)).data;
  },

  async memberAccess(token: string, invoiceId: string): Promise<Array<{ productId: string; title: string; url: string }>> {
    const res = await fetch(`${API_BASE}/member/orders/${encodeURIComponent(invoiceId)}/access`, { headers: { Authorization: `Bearer ${token}` } });
    return (await handleResponse<{ data: { downloads: Array<{ productId: string; title: string; url: string }> } }>(res)).data.downloads;
  },

  async memberUpdateAccount(token: string, dto: Partial<Member>): Promise<Member> {
    const res = await fetch(`${API_BASE}/member/account`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(dto),
    });
    return (await handleResponse<{ data: Member }>(res)).data;
  },

  // ADMIN (requires Authorization header)
  async adminGetAnalytics(token: string): Promise<AdminAnalytics> {
    const res = await fetch(`${API_BASE}/admin/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleResponse<{ data: AdminAnalytics }>(res);
    return data.data;
  },

  async adminGetTraffic(token: string, days: number): Promise<TrafficSummary> {
    const res = await fetch(`${API_BASE}/admin/traffic?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleResponse<{ data: TrafficSummary }>(res);
    return data.data;
  },

  async adminGetProducts(token: string): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/admin/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleResponse<{ data: Product[] }>(res);
    return data.data;
  },

  async adminGetProduct(token: string, id: string): Promise<Product> {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleResponse<{ data: Product }>(res);
    return data.data;
  },

  async adminCreateProduct(token: string, dto: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(dto),
    });
    const data = await handleResponse<{ data: Product }>(res);
    return data.data;
  },

  async adminUpdateProduct(token: string, id: string, dto: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(dto),
    });
    const data = await handleResponse<{ data: Product }>(res);
    return data.data;
  },

  async adminDeleteProduct(token: string, id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await handleResponse(res);
  },

  async adminGetLinks(token: string): Promise<Link[]> {
    const res = await fetch(`${API_BASE}/admin/links`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleResponse<{ data: Link[] }>(res);
    return data.data;
  },

  async adminCreateLink(token: string, dto: Partial<Link>): Promise<Link> {
    const res = await fetch(`${API_BASE}/admin/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(dto),
    });
    const data = await handleResponse<{ data: Link }>(res);
    return data.data;
  },

  async adminReorderLinks(token: string, links: { id: string; sort_order: number }[]): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/links/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items: links }),
    });
    await handleResponse(res);
  },

  async adminUpdateLink(token: string, id: string, dto: Partial<Link>): Promise<Link> {
    const res = await fetch(`${API_BASE}/admin/links/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(dto),
    });
    const data = await handleResponse<{ data: Link }>(res);
    return data.data;
  },

  async adminDeleteLink(token: string, id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/links/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await handleResponse(res);
  },

  async adminGetProfile(token: string): Promise<Profile> {
    const res = await fetch(`${API_BASE}/admin/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleResponse<{ data: Profile }>(res);
    return data.data;
  },

  async adminUpdateProfile(token: string, id: string, dto: Partial<Profile>): Promise<Profile> {
    const res = await fetch(`${API_BASE}/admin/profile/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(dto),
    });
    const data = await handleResponse<{ data: Profile }>(res);
    return data.data;
  },

  async adminConfirmOrder(token: string, invoiceId: string): Promise<{ emailSent: boolean }> {
    const res = await fetch(`${API_BASE}/admin/orders/${encodeURIComponent(invoiceId)}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await handleResponse<{ data: { emailSent: boolean } }>(res);
    return json.data;
  },

  async adminGetOrders(token: string, status?: OrderStatus) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    const res = await fetch(`${API_BASE}/admin/orders?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleResponse<{ data: Order[] }>(res);
    return data.data;
  },

  async adminGenerateUploadUrl(token: string, bucket: 'public-assets' | 'private-products', fileName: string) {
    const res = await fetch(`${API_BASE}/admin/storage/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bucket, fileName }),
    });
    const data = await handleResponse<{
      data: { uploadUrl: string; signedUrl: string; path: string; publicUrl: string | null };
    }>(res);
    return data.data;
  },
};

export { ApiError };