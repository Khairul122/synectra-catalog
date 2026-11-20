export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
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
  theme_color?: string | null;
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
  file_path: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  invoice_id: string;
  buyer_name: string;
  buyer_email: string;
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
}

export interface CatalogData {
  profile: Profile | null;
  links: Link[];
  products: Product[];
}

export interface AppVariables {
  validatedBody: unknown;
  validatedQuery: unknown;
  user: unknown;
}

export type AppEnv = {
  Variables: AppVariables;
};

