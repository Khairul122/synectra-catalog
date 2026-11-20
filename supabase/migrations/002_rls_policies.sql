-- Migration 002: Row Level Security (RLS) Policies and Storage Configuration
-- Applies to: profiles, links, products, orders, and storage.objects

-- 1. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 2. Profiles Policies
-- Public can view storefront profile
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Authenticated owner can insert their profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

-- Authenticated owner can update their profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- 3. Links Policies
-- Public can view active links; authenticated users can view all
CREATE POLICY "Active links are viewable by everyone"
  ON public.links FOR SELECT
  USING (is_active = true OR (SELECT auth.role()) = 'authenticated');

-- Authenticated admin can insert, update, delete links
CREATE POLICY "Admin full access on links"
  ON public.links FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Products Policies
-- Public can view active products; authenticated users can view all
CREATE POLICY "Active products are viewable by everyone"
  ON public.products FOR SELECT
  USING (is_active = true OR (SELECT auth.role()) = 'authenticated');

-- Authenticated admin can insert, update, delete products
CREATE POLICY "Admin full access on products"
  ON public.products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Orders Policies
-- Direct public access is disabled; orders are created via backend service-role API
-- Authenticated admin can view all orders for monitoring
CREATE POLICY "Admin can view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (true);

-- 6. Storage Buckets Configuration
-- Create public-assets and private-products buckets if they do not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'public-assets',
    'public-assets',
    true,
    10485760, -- 10MB limit for thumbnails/avatars
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']::text[]
  ),
  (
    'private-products',
    'private-products',
    false,
    524288000, -- 500MB limit for ZIP/GLB asset packages
    NULL
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 7. Storage Policies
-- public-assets: anyone can view
CREATE POLICY "Public Assets Viewable by Everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public-assets');

-- public-assets: authenticated admin can upload
CREATE POLICY "Admin can upload to public-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'public-assets');

-- public-assets: authenticated admin can update
CREATE POLICY "Admin can update objects in public-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'public-assets');

-- public-assets: authenticated admin can delete
CREATE POLICY "Admin can delete objects in public-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'public-assets');

-- private-products: authenticated admin can upload
CREATE POLICY "Admin can upload to private-products"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'private-products');

-- private-products: authenticated admin can update
CREATE POLICY "Admin can update objects in private-products"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'private-products');

-- private-products: authenticated admin can delete
CREATE POLICY "Admin can delete objects in private-products"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'private-products');
