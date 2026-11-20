import { z } from 'zod';

const httpUrlSchema = (message: string) =>
  z.string().trim().url(message).refine((value) => /^https?:\/\//i.test(value), message);

// Indonesian mobile number; stored as 628xxxxxxxx (the format DOKU expects).
const phoneSchema = z
  .string()
  .transform((value) => value.replace(/[\s.-]/g, '').replace(/^\+/, '').replace(/^0/, '62'))
  .refine((value) => /^628\d{7,12}$/.test(value), 'Nomor HP tidak valid (contoh: 081234567890)');

const productIdSchema = z.string().uuid('ID produk harus berupa format UUID yang valid');

// Cart checkout sends productIds; a single legacy productId is accepted and normalized.
export const checkoutDtoSchema = z.preprocess(
  (raw) => {
    if (raw && typeof raw === 'object' && !('productIds' in raw) && 'productId' in raw) {
      const { productId, ...rest } = raw as Record<string, unknown>;
      return { ...rest, productIds: [productId] };
    }
    return raw;
  },
  z.object({
  productIds: z
    .array(productIdSchema)
    .min(1, 'Keranjang kosong')
    .max(20, 'Maksimal 20 produk per checkout')
    .transform((ids) => Array.from(new Set(ids))),
  buyerName: z.string().trim().min(2, 'Nama pembeli minimal 2 karakter').max(100),
  buyerEmail: z.string().trim().email('Format email tidak valid'),
  buyerPhone: phoneSchema,
  paymentMethod: z.enum(['DOKU', 'QRIS_MANUAL']).default('DOKU'),
  }),
);

export type CheckoutDto = z.infer<typeof checkoutDtoSchema>;

export const createProductDtoSchema = z.object({
  title: z.string().trim().min(3, 'Judul produk minimal 3 karakter').max(255),
  description: z.string().trim().min(10, 'Deskripsi minimal 10 karakter'),
  price: z.number().int().min(0, 'Harga produk tidak boleh negatif'),
  thumbnail_url: z.string().trim().url('URL thumbnail harus valid'),
  delivery_url: httpUrlSchema('Tautan produk harus berupa URL http/https yang valid'),
  category: z.string().trim().min(2).default('General'),
  is_active: z.boolean().default(true),
});

export type CreateProductDto = z.infer<typeof createProductDtoSchema>;

export const updateProductDtoSchema = createProductDtoSchema.partial();
export type UpdateProductDto = z.infer<typeof updateProductDtoSchema>;

export const createLinkDtoSchema = z.object({
  title: z.string().trim().min(2, 'Judul tautan minimal 2 karakter').max(255),
  url: z.string().trim().url('URL tautan harus valid'),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export type CreateLinkDto = z.infer<typeof createLinkDtoSchema>;

export const updateLinkDtoSchema = createLinkDtoSchema.partial();
export type UpdateLinkDto = z.infer<typeof updateLinkDtoSchema>;

export const reorderLinksDtoSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sort_order: z.number().int(),
    }),
  ),
});

export type ReorderLinksDto = z.infer<typeof reorderLinksDtoSchema>;

const sanitizeEmptyString = (val: unknown) =>
  typeof val === 'string' && val.trim() === '' ? null : val;

const optionalUrlSchema = z.preprocess(
  sanitizeEmptyString,
  z
    .string()
    .trim()
    .url('URL tidak valid')
    .refine((value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === 'http:' || protocol === 'https:';
      } catch {
        return false;
      }
    }, 'URL harus memakai protokol HTTP atau HTTPS')
    .nullable()
    .optional(),
);

const optionalHexColorSchema = z.preprocess(
  sanitizeEmptyString,
  z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Format kode hex warna tidak valid (contoh: #00A8E8)')
    .nullable()
    .optional(),
);

export const updateProfileDtoSchema = z.object({
  business_name: z.string().trim().min(2, 'Nama bisnis minimal 2 karakter').max(255).optional(),
  display_name: z.preprocess(
    sanitizeEmptyString,
    z.string().trim().max(255, 'Display name maksimal 255 karakter').nullable().optional(),
  ),
  bio: z.preprocess(
    sanitizeEmptyString,
    z.string().trim().max(1000, 'Bio maksimal 1000 karakter').nullable().optional(),
  ),
  avatar_url: optionalUrlSchema,
  cover_banner_url: optionalUrlSchema,
  instagram_url: optionalUrlSchema,
  tiktok_url: optionalUrlSchema,
  youtube_url: optionalUrlSchema,
  theme_color: optionalHexColorSchema,
  qris_image_url: optionalUrlSchema,
  whatsapp_number: z.preprocess(sanitizeEmptyString, phoneSchema.nullable().optional()),
});

export type UpdateProfileDto = z.infer<typeof updateProfileDtoSchema>;

export const dokuNotificationDtoSchema = z.object({
  order: z.object({
    invoice_number: z.string().min(1),
    amount: z.number().optional(),
  }),
  transaction: z.object({
    status: z.enum(['SUCCESS', 'FAILED', 'EXPIRED', 'PENDING']),
    reference_id: z.string().optional(),
    date: z.string().optional(),
  }),
});

export type DokuNotificationDto = z.infer<typeof dokuNotificationDtoSchema>;
