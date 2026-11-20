import { z } from 'zod';

export const checkoutDtoSchema = z.object({
  productId: z.string().uuid('ID produk harus berupa format UUID yang valid'),
  buyerName: z.string().trim().min(2, 'Nama pembeli minimal 2 karakter').max(100),
  buyerEmail: z.string().trim().email('Format email tidak valid'),
});

export type CheckoutDto = z.infer<typeof checkoutDtoSchema>;

export const createProductDtoSchema = z.object({
  title: z.string().trim().min(3, 'Judul produk minimal 3 karakter').max(255),
  description: z.string().trim().min(10, 'Deskripsi minimal 10 karakter'),
  price: z.number().int().min(0, 'Harga produk tidak boleh negatif'),
  thumbnail_url: z.string().trim().url('URL thumbnail harus valid'),
  file_path: z.string().trim().min(3, 'File path produk wajib diisi'),
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
