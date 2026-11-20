export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
export type PaymentMethod = 'DOKU' | 'QRIS_MANUAL';
export type FulfillmentState = 'PENDING' | 'PROCESSING' | 'SENT';

export interface Profile {
  id: string;
  business_name: string;
  display_name?: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_banner_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;
  /** Social profile URLs in display order. */
  social_links?: string[];
  theme_color?: string | null;
  /** Store's own QRIS image for manual payment. */
  qris_image_url?: string | null;
  /** Admin WhatsApp (628…) where buyers confirm manual payments. */
  whatsapp_number?: string | null;
  /** The single active payment method; buyers do not choose. */
  payment_mode?: PaymentMethod;
  created_at: string;
  updated_at: string;
}

export interface Link {
  id: string;
  title: string;
  url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnail_url: string;
  /** Legacy uploaded file in private-products; new products use delivery_url. */
  file_path: string | null;
  /** Secret delivery link (e.g. Google Drive). Never expose outside paid orders. */
  delivery_url: string | null;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Catalog shape: no delivery link/file. */
export type PublicProduct = Omit<Product, 'delivery_url' | 'file_path'>;

export interface Order {
  id: string;
  invoice_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  payment_method: PaymentMethod;
  product_id: string;
  amount: number;
  status: OrderStatus;
  doku_reference: string | null;
  payment_url: string | null;
  idempotency_key: string | null;
  fulfillment_state: FulfillmentState;
  payment_error: string | null;
  fulfillment_error: string | null;
  created_at: string;
  updated_at: string;
  product?: Product;
  items?: OrderItem[];
}

export interface OrderItem {
  price: number;
  product: Product;
}

export interface CatalogData {
  profile: Profile | null;
  links: Link[];
  products: PublicProduct[];
}

export interface Member {
  user_id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  area: string | null;
  zip_code: string | null;
  updated_at: string;
}

export interface AppVariables {
  validatedBody: unknown;
  validatedQuery: unknown;
  user: unknown;
}

export type AppEnv = {
  Variables: AppVariables;
};

