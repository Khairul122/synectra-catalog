export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';

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
  qris_image_url?: string | null;
  whatsapp_number?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Link {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'DOKU' | 'QRIS_MANUAL';

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  thumbnail_url: string | null;
  file_path: string | null;
  /** Admin only: the link buyers receive after paying. */
  delivery_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  invoice_id: string;
  product_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone?: string | null;
  payment_method?: PaymentMethod;
  /** Manual QRIS while pending: the store's QR and admin WhatsApp. */
  manual_payment?: { qris_image_url: string | null; whatsapp_number: string | null } | null;
  paid_at?: string | null;
  amount: number;
  status: OrderStatus;
  payment_url: string | null;
  doku_reference_id: string | null;
  created_at: string;
  updated_at: string;
  product?: Product;
  /** Every product in the order (cart checkout). */
  items?: Array<Pick<Product, 'id' | 'title' | 'price' | 'thumbnail_url'>>;
}

export interface CatalogData {
  profile: Profile | null;
  links: Link[];
  products: Product[];
}

export interface CheckoutPayload {
  productIds: string[];
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  paymentMethod: PaymentMethod;
}

export interface CheckoutResponseData {
  invoiceId: string;
  paymentUrl: string;
  amount: number;
  status: OrderStatus;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: {
    code?: string;
    details?: unknown;
  };
}

export interface AdminAnalytics {
  totalRevenue: number;
  totalOrders: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  failedOrdersCount: number;
}
