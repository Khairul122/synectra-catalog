-- Seed data for Synectra Digital Catalog

-- 1. Seed Profile (tied to demo admin auth user if available)
DO $$
DECLARE
  admin_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Insert into auth.users for local dev environment
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    admin_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@synectra.id',
    extensions.crypt('admin123', extensions.gen_salt('bf')), -- local-dev only password
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"business_name": "Synectra Jasa Digital"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert profile
  INSERT INTO public.profiles (id, business_name, display_name, bio, avatar_url, cover_banner_url, instagram_url, tiktok_url, youtube_url, theme_color)
  VALUES (
    admin_id,
    'Synectra Jasa Digital',
    'Synectra Digital',
    'Penyedia aset digital profesional, source code AI, model 3D, dan template aplikasi siap pakai.',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1558655146-9f40138eddee?w=1200&auto=format&fit=crop',
    'https://instagram.com/synectra.digital',
    'https://tiktok.com/@synectra.digital',
    'https://youtube.com/@synectra.digital',
    '#00A8E8'
  )
  ON CONFLICT (id) DO UPDATE SET
    business_name = EXCLUDED.business_name,
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    avatar_url = EXCLUDED.avatar_url,
    cover_banner_url = EXCLUDED.cover_banner_url,
    instagram_url = EXCLUDED.instagram_url,
    tiktok_url = EXCLUDED.tiktok_url,
    youtube_url = EXCLUDED.youtube_url,
    theme_color = EXCLUDED.theme_color;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Auth user / profile seed skipped: %', SQLERRM;
END $$;

-- 2. Seed Links
INSERT INTO public.links (id, title, url, sort_order, is_active)
VALUES
  (
    'a1111111-1111-1111-1111-111111111111',
    'Portofolio Aplikasi Web & Mobile',
    'https://synectra.id',
    1,
    true
  ),
  (
    'a2222222-2222-2222-2222-222222222222',
    'GitHub Official Repository',
    'https://github.com/synectra',
    2,
    true
  ),
  (
    'a3333333-3333-3333-3333-333333333333',
    'Konsultasi Teknis & Custom Project (WhatsApp)',
    'https://wa.me/6281234567890',
    3,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Products
INSERT INTO public.products (id, title, description, price, thumbnail_url, file_path, category, is_active)
VALUES
  (
    'b1111111-1111-1111-1111-111111111111',
    'CCTV AI YOLOv8 Script & Pre-trained Model',
    'Script pendeteksi objek real-time untuk sistem CCTV menggunakan model YOLOv8 teroptimasi edge device dengan latency rendah.',
    150000,
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop',
    'products/yolov8-cctv-ai-v1.0.zip',
    'AI & Computer Vision',
    true
  ),
  (
    'b2222222-2222-2222-2222-222222222222',
    '3D Hologram Sci-Fi Avatar Rigged (GLB/Blender)',
    'Model 3D avatar hologram futuristik dengan rigging lengkap siap integrasi ke Unity, Unreal Engine, atau Three.js.',
    75000,
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop',
    'products/hologram-avatar-rigged.glb',
    '3D Assets',
    true
  ),
  (
    'b3333333-3333-3333-3333-333333333333',
    'Next.js 15 SaaS Starter Boilerplate (Supabase + DOKU)',
    'Boilerplate full-stack Next.js App Router dengan autentikasi Supabase, multi-tenant RBAC, dan integrasi payment gateway DOKU.',
    250000,
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop',
    'products/nextjs-saas-starter-v2.zip',
    'Source Code',
    true
  ),
  (
    'b4444444-4444-4444-4444-444444444444',
    'Microservices Architecture Blueprint (Docker + K8s)',
    'Dokumentasi arsitektur enterprise, manifest Kubernetes, dan pipeline CI/CD GitHub Actions siap pakai untuk produksi.',
    95000,
    'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=600&auto=format&fit=crop',
    'products/k8s-microservices-blueprint.zip',
    'Templates',
    true
  )
ON CONFLICT (id) DO NOTHING;
