# TODO — Synectra Digital Catalog

## Status

- [x] Siapkan struktur folder frontend, backend, dan Supabase
- [x] Buat Graphify knowledge graph
- [ ] Implementasi MVP aplikasi

## 1. Konfigurasi Workspace

- [x] Buat `package.json` root dan workspace frontend/backend
- [x] Buat `.env.example` tanpa credential nyata
- [x] Buat `vercel.json`
- [x] Konfigurasi TypeScript, lint, format, dan test runner
- [x] Tambahkan aturan keamanan dasar untuk secret dan environment variable

## 2. Supabase

- [x] Buat migration tabel `profiles`
- [x] Buat migration tabel `links`
- [x] Buat migration tabel `products`
- [x] Buat migration tabel `orders`
- [x] Tambahkan foreign key, enum status, constraint harga, dan timestamp
- [x] Tambahkan RLS untuk akses publik, pembeli, dan admin
- [x] Buat bucket `public-assets`
- [x] Buat bucket private `private-products`
- [x] Buat `seed.sql` untuk data katalog awal

## 3. Backend API

- [x] Konfigurasi environment di `backend/src/config/env.ts`
- [x] Buat Supabase admin client
- [x] Buat repository profile, link, product, order, dan storage
- [x] Buat service catalog
- [x] Buat service checkout
- [x] Buat service fulfillment
- [x] Buat service admin
- [x] Buat validasi DTO checkout dan product dengan Zod
- [x] Buat middleware auth Supabase
- [x] Buat middleware validasi request
- [x] Buat middleware validasi signature DOKU
- [x] Buat global error handler
- [x] Buat endpoint katalog publik
- [x] Buat endpoint checkout
- [x] Buat endpoint webhook DOKU
- [x] Buat endpoint admin products, links, orders, dan appearance
- [x] Buat adapter DOKU
- [x] Buat adapter Resend
- [x] Buat response JSON standar

## 4. Frontend Publik

- [x] Konfigurasi Next.js, Tailwind CSS, dan Shadcn UI
- [x] Buat halaman storefront responsif
- [x] Buat profile header
- [x] Buat link blocks
- [x] Buat product grid dan product card
- [x] Buat checkout drawer atau bottom sheet
- [x] Tambahkan validasi nama dan email
- [x] Hubungkan checkout ke backend
- [x] Buat halaman payment status
- [x] Terapkan filter produk aktif
- [x] Terapkan metadata SEO dasar
- [x] Verifikasi target FCP katalog di bawah 1.2 detik

## 5. Frontend Admin

- [x] Buat halaman login
- [x] Lindungi rute `/admin/*`
- [x] Buat dashboard overview
- [x] Buat product manager
- [x] Buat upload thumbnail ke public bucket
- [x] Buat upload file produk ke private bucket
- [x] Buat progress upload
- [x] Buat link manager dengan sorting
- [x] Buat order monitor dengan pencarian dan filter status
- [x] Buat store appearance settings
- [x] Tambahkan live preview mobile

## 6. Payment dan Fulfillment

- [x] Implementasi pembuatan invoice DOKU
- [x] Simpan order dengan status `PENDING`
- [x] Validasi webhook memakai HMAC-SHA256
- [x] Tolak webhook dengan signature tidak valid
- [x] Update order menjadi `PAID` hanya setelah validasi sukses
- [x] Generate signed URL produk selama 24 jam
- [x] Kirim email fulfillment melalui Resend
- [x] Cegah fulfillment ganda untuk invoice sama
- [x] Catat error payment dan email

## 7. Security dan Reliability

- [x] Pastikan service role key hanya dipakai backend
- [x] Pastikan bucket produk tetap private
- [x] Validasi harga dari database, bukan request frontend
- [x] Tambahkan idempotency untuk checkout dan webhook
- [x] Tambahkan rate limit pada endpoint sensitif
- [x] Tambahkan logging tanpa secret atau data sensitif
- [x] Audit authorization untuk seluruh endpoint admin
- [x] Tambahkan handling timeout dan provider failure

## 8. Testing

- [x] Unit test DTO dan validasi input
- [x] Unit test kalkulasi checkout
- [x] Unit test signature DOKU valid dan invalid
- [x] Unit test status transition order
- [x] Unit test signed URL dan idempotency fulfillment
- [ ] Integration test repository dengan Supabase lokal/test project — _blocked: butuh Docker + `supabase start` (belum tersedia di mesin ini)_
- [x] Integration test endpoint publik dan admin
- [x] Test akses tanpa autentikasi ke `/admin/*`
- [x] Test input email tidak valid
- [x] Test webhook signature tidak valid
- [x] Jalankan typecheck, lint, build, dan seluruh test otomatis
- [ ] Jalankan aplikasi sungguhan untuk verifikasi E2E storefront — _blocked: sebagian: guard /admin, login ditolak, error state katalog terverifikasi di browser; render katalog butuh DB_
- [ ] Jalankan E2E guest checkout sampai payment redirect — _blocked: butuh DB berisi produk_
- [ ] Jalankan E2E login dan operasi admin — _blocked: butuh Supabase Auth lokal_
- [ ] Jalankan E2E webhook serta fulfillment sukses dan gagal — _blocked: butuh DB; logika tercakup unit test_
- [x] Hapus data uji dan matikan server setelah verifikasi
