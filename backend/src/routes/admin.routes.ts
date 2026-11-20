import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { adminService } from '../services/admin.service';
import {
  createProductDtoSchema,
  updateProductDtoSchema,
  createLinkDtoSchema,
  updateLinkDtoSchema,
  reorderLinksDtoSchema,
  updateProfileDtoSchema,
  type CreateProductDto,
  type UpdateProductDto,
  type CreateLinkDto,
  type UpdateLinkDto,
  type ReorderLinksDto,
  type UpdateProfileDto,
} from '../dtos';
import type { OrderStatus } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import type { AppEnv } from '../types';

export const adminRoutes = new Hono<AppEnv>();

// Lindungi seluruh endpoint admin dengan Auth middleware
adminRoutes.use('*', authMiddleware);

// --- Analytics ---
adminRoutes.get('/analytics', async (c) => {
  try {
    const summary = await adminService.getAnalytics();
    return c.json(successResponse(summary));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat analitik';
    return c.json(errorResponse(message, 'ANALYTICS_ERROR'), 500);
  }
});

// --- Products ---
adminRoutes.get('/products', async (c) => {
  try {
    const products = await adminService.getAllProducts();
    return c.json(successResponse(products));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat produk';
    return c.json(errorResponse(message), 500);
  }
});

adminRoutes.get('/products/:id', async (c) => {
  const id = c.req.param('id');
  const product = await adminService.getProductById(id);
  if (!product) {
    return c.json(errorResponse('Produk tidak ditemukan', 'NOT_FOUND'), 404);
  }
  return c.json(successResponse(product));
});

adminRoutes.post('/products', validateBody(createProductDtoSchema), async (c) => {
  const dto = c.get('validatedBody') as CreateProductDto;
  try {
    const product = await adminService.createProduct(dto);
    return c.json(successResponse(product, 'Produk berhasil dibuat'), 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membuat produk';
    return c.json(errorResponse(message), 400);
  }
});

adminRoutes.put('/products/:id', validateBody(updateProductDtoSchema), async (c) => {
  const id = c.req.param('id');
  const dto = c.get('validatedBody') as UpdateProductDto;
  try {
    const product = await adminService.updateProduct(id, dto);
    return c.json(successResponse(product, 'Produk berhasil diperbarui'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui produk';
    return c.json(errorResponse(message), 400);
  }
});

adminRoutes.delete('/products/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await adminService.deleteProduct(id);
    return c.json(successResponse({ id }, 'Produk berhasil dihapus'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus produk';
    return c.json(errorResponse(message), 400);
  }
});

// --- Links ---
adminRoutes.get('/links', async (c) => {
  try {
    const links = await adminService.getAllLinks();
    return c.json(successResponse(links));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat link';
    return c.json(errorResponse(message), 500);
  }
});

adminRoutes.post('/links', validateBody(createLinkDtoSchema), async (c) => {
  const dto = c.get('validatedBody') as CreateLinkDto;
  try {
    const link = await adminService.createLink(dto);
    return c.json(successResponse(link, 'Link berhasil dibuat'), 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membuat link';
    return c.json(errorResponse(message), 400);
  }
});

adminRoutes.put('/links/reorder', validateBody(reorderLinksDtoSchema), async (c) => {
  const dto = c.get('validatedBody') as ReorderLinksDto;
  try {
    await adminService.reorderLinks(dto);
    return c.json(successResponse(null, 'Urutan link berhasil diperbarui'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mengubah urutan link';
    return c.json(errorResponse(message), 400);
  }
});

adminRoutes.put('/links/:id', validateBody(updateLinkDtoSchema), async (c) => {
  const id = c.req.param('id');
  const dto = c.get('validatedBody') as UpdateLinkDto;
  try {
    const link = await adminService.updateLink(id, dto);
    return c.json(successResponse(link, 'Link berhasil diperbarui'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui link';
    return c.json(errorResponse(message), 400);
  }
});

adminRoutes.delete('/links/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await adminService.deleteLink(id);
    return c.json(successResponse({ id }, 'Link berhasil dihapus'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus link';
    return c.json(errorResponse(message), 400);
  }
});

// --- Profile / Appearance ---
adminRoutes.get('/profile', async (c) => {
  try {
    const profile = await adminService.getProfile();
    return c.json(successResponse(profile));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat profil';
    return c.json(errorResponse(message), 500);
  }
});

adminRoutes.put('/profile/:id', validateBody(updateProfileDtoSchema), async (c) => {
  const id = c.req.param('id');
  const dto = c.get('validatedBody') as UpdateProfileDto;
  try {
    const profile = await adminService.updateProfile(id, dto);
    return c.json(successResponse(profile, 'Profil berhasil diperbarui'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui profil';
    return c.json(errorResponse(message), 400);
  }
});

// --- Orders ---
adminRoutes.get('/orders', async (c) => {
  const status = c.req.query('status') as OrderStatus | undefined;
  try {
    const orders = await adminService.getAllOrders(status);
    return c.json(successResponse(orders));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat pesanan';
    return c.json(errorResponse(message), 500);
  }
});

// --- Storage Upload Signed URL ---
const uploadUrlSchema = z.object({
  bucket: z.enum(['public-assets', 'private-products']),
  fileName: z.string().min(1),
});

adminRoutes.post('/storage/upload-url', validateBody(uploadUrlSchema), async (c) => {
  const { bucket, fileName } = c.get('validatedBody') as z.infer<typeof uploadUrlSchema>;
  try {
    const result = await adminService.generateUploadSignedUrl(bucket, fileName);
    return c.json(successResponse(result, 'Upload URL berhasil digenerate'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membuat URL upload';
    return c.json(errorResponse(message), 400);
  }
});
