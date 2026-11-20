# PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Nama Produk:** Synectra Digital Catalog (Platform Link-in-Bio & E-Commerce Digital)  
**Versi:** 1.1 (MVP dengan Panel Admin Terpusat)  
**Dokumen:** PRD-SYNECTRA-002-REV-A (Detailed Edition)  
**Pemilik Produk:** Juliana Sari (Synectra Jasa Digital)  
**Target Rilis:** Q4 2026 / Q1 2027  

---

## 1. Latar Belakang & Visi Produk
Synectra Jasa Digital saat ini mendistribusikan berbagai produk digital berlisensi—mulai dari aplikasi manajemen pesanan WhatsApp, sistem keamanan AI CCTV (YOLO/BoT-SORT), hingga aset dan skrip Roblox. Mengandalkan platform pihak ketiga seringkali membebankan biaya potongan (komisi) yang tinggi dan membatasi kontrol atas data pelanggan.

**Visi:** Membangun ekosistem etalase digital *self-hosted* yang menggabungkan fungsi *link-in-bio* (seperti lynk.id) dengan kapabilitas *direct-checkout* tanpa komisi pihak ketiga, memanfaatkan infrastruktur modern (Vercel, Supabase) dan gerbang pembayaran lokal (DOKU).

## 2. Metrik Keberhasilan (OKRs)
*   **Objective 1: Transaksi Tanpa Gesekan (Frictionless Checkout)**
    *   *Key Result:* Waktu dari klik "Beli" hingga pembayaran selesai rata-rata di bawah 2 menit.
    *   *Key Result:* *Drop-off rate* di halaman *checkout* di bawah 30%.
*   **Objective 2: Otomatisasi Pemenuhan 100%**
    *   *Key Result:* 99.9% pembeli menerima email tautan unduhan dalam waktu < 60 detik setelah DOKU memvalidasi pembayaran.
*   **Objective 3: Performa & Keandalan Web**
    *   *Key Result:* *First Contentful Paint* (FCP) halaman katalog di bawah 1.2 detik.
    *   *Key Result:* 0 insiden kebocoran tautan unduhan tanpa pembayaran.
*   **Objective 4: Manajemen Operasional Efisien**
    *   *Key Result:* Waktu untuk menambah produk baru via Panel Admin di bawah 2 menit.
    *   *Key Result:* Admin dapat memantau status pesanan (Pending/Paid) secara *real-time* dengan penundaan maksimal 10 detik.

## 3. Profil Pengguna (User Personas)
### Persona 1: Pembeli B2B / Klien (Pembeli Web App & AI)
*   **Kebutuhan:** Membeli *source code* atau lisensi aplikasi dengan metode pembayaran perusahaan/lokal yang sah.
*   **Perilaku:** Membutuhkan bukti transaksi (invoice) yang jelas dan pengiriman *file* ZIP yang aman.

### Persona 2: Pembeli B2C / *Gamer* (Pembeli Aset Roblox)
*   **Kebutuhan:** Akses instan ke skrip atau *map* Roblox segera setelah bayar pakai e-Wallet/QRIS.
*   **Perilaku:** Cenderung impulsif, tidak suka membuat akun (*guest checkout* wajib).

### Persona 3: Administrator (Juliana Sari)
*   **Kebutuhan:** Antarmuka terpusat (Panel Admin) untuk mengunggah produk baru, mengatur tautan profil, melacak riwayat transaksi (orders), memantau konversi DOKU, dan mengelola analitik penjualan dasar.

---

## 4. Spesifikasi Fitur Utama & Kriteria Penerimaan (Acceptance Criteria)

### 4.1. Halaman Etalase Publik (*Public Storefront*)
Pengguna dapat melihat profil Synectra, tautan penting, dan daftar produk yang dijual dalam satu halaman responsif.
*   **UI/UX:** Desain *mobile-first*, *clean*, mengadopsi palet warna *brand* Synectra (Vibrant Cyan `#00A8E8` & Charcoal Slate `#1E293B`).
*   **Acceptance Criteria (AC):**
    *   Header menampilkan Logo, Nama "Synectra Jasa Digital", dan Bio.
    *   Tombol tautan eksternal (GitHub, WhatsApp, Portofolio) dapat diklik dan membuka tab baru.
    *   Bagian Katalog menampilkan produk dengan format *Grid* (Gambar, Judul, Harga, Label Kategori).
    *   Produk yang diset `is_active = false` di *database* tidak muncul di katalog.

### 4.2. Alur *Guest Checkout* (Tanpa Login)
Meminimalkan langkah pembeli untuk meningkatkan konversi.
*   **AC:**
    *   Saat klik produk, muncul *Modal/Bottom Sheet* berisi deskripsi lengkap dan *form* input.
    *   *Form* hanya meminta **Nama Lengkap** dan **Email** (dengan validasi format email).
    *   Menampilkan rincian harga akhir (Harga Produk + Biaya Layanan DOKU jika di- *pass* ke pembeli).
    *   Klik "Lanjutkan Pembayaran" menghasilkan *Invoice ID* unik dan me- *redirect* pengguna ke halaman pembayaran DOKU (atau memuat modul *Seamless* QRIS).

### 4.3. Integrasi Payment Gateway (DOKU)
Menangani pembuatan tagihan dan mendengarkan status pembayaran.
*   **AC:**
    *   *Endpoint* API Vercel (`/api/checkout`) berhasil memanggil API DOKU *Generate Payment Link*.
    *   Sistem memiliki *endpoint* Webhook (`/api/doku-webhook`) yang terekspos untuk menerima HTTP POST dari server DOKU.
    *   Webhook wajib memvalidasi *Signature* HMAC dari DOKU untuk mencegah *request* palsu.
    *   Jika status `SUCCESS`, sistem meng- *update* kolom `status` di tabel `orders` menjadi `PAID`.

### 4.4. Sistem *Auto-Fulfillment* & Keamanan File
Mengirimkan *file* digital ke pembeli secara otomatis dan aman menggunakan Supabase Storage.
*   **AC:**
    *   *File* produk (*source code* ZIP/GLB) disimpan di *Private Bucket* Supabase (tidak bisa diakses publik secara langsung).
    *   Setelah pesanan `PAID`, sistem memanggil API Supabase untuk men- *generate* `Signed URL` (waktu kadaluarsa di- *set* 24 jam).
    *   Sistem memicu layanan Email (misal: Resend API) mengirim pesan HTML ke email pembeli berisi ucapan terima kasih, detail pesanan, dan Tombol Unduh (*Signed URL*).

### 4.5. Panel Admin (Manajemen Data & Operasional)
Antarmuka internal (CMS) terpusat untuk mengelola seluruh aspek platform Synectra Digital Catalog. Menggunakan komponen UI berbasis *dashboard* (misal: Shadcn UI).

*   **AC - 4.5.1. Autentikasi & Keamanan:**
    *   Rute `/admin/*` dilindungi dengan Supabase Auth (hanya email akun internal Juliana yang dapat mengakses).
    *   Upaya akses tanpa sesi akan dialihkan (*redirect*) ke halaman `/login`.

*   **AC - 4.5.2. Dashboard Overview (Beranda Admin):**
    *   Menampilkan ringkasan metrik utama (*High-level Metrics*):
        *   Total Penjualan (Rp) bulan ini.
        *   Jumlah Pesanan Sukses (PAID) vs Gagal/Kadaluarsa (FAILED/EXPIRED).
        *   Produk paling laris (*Top Seller*).

*   **AC - 4.5.3. Manajemen Produk (Product Manager):**
    *   **Tabel Data:** Menampilkan semua produk dengan kolom: ID, Judul, Kategori, Harga, Status (Aktif/Tidak Aktif), dan Aksi.
    *   **Fitur "Tambah Produk Baru" (Modal/Form):**
        *   Input teks untuk: Judul, Deskripsi, Kategori, Harga (Rp).
        *   Area unggah (*upload zone*) untuk gambar *Thumbnail* (disimpan ke *public bucket*).
        *   Area unggah untuk *File* Produk (ZIP/GLB) (disimpan ke *private bucket*).
        *   Tersedia indikator *progress bar* saat mengunggah *file* besar.
    *   **Fitur Edit/Hapus:** Mengubah harga, deskripsi, mengganti *file*, atau menandai produk sebagai tidak aktif (`is_active = false`) agar disembunyikan dari katalog publik tanpa menghapus riwayat datanya.

*   **AC - 4.5.4. Manajemen Tautan Profil (Link Manager):**
    *   Antarmuka *drag-and-drop* (atau tombol *up/down*) untuk mengatur urutan (*sorting*) tombol tautan portofolio di halaman publik.
    *   **Fitur CRUD:** Tambah, edit judul, edit URL, atau sembunyikan tautan (misal: "Portofolio Aplikasi", "GitHub", "WhatsApp").

*   **AC - 4.5.5. Manajemen Transaksi (Order Monitor):**
    *   **Tabel Data Historis:** Menampilkan daftar transaksi yang ditarik dari tabel `orders`.
    *   **Kolom yang ditampilkan:** *Invoice ID*, Waktu (*Timestamp*), Nama Produk, Email Pembeli, Nominal Pembayaran, dan Status (Badge warna: Hijau untuk PAID, Kuning untuk PENDING, Merah untuk FAILED).
    *   **Fitur Filter/Pencarian:** Admin dapat mencari pesanan berdasarkan Email pembeli atau *Invoice ID*, dan memfilter berdasarkan status pembayaran.
    *   **Detail Pesanan:** Mengklik satu baris pesanan akan menampilkan riwayat lengkap, termasuk referensi transaksi dari DOKU (`doku_reference`).

*   **AC - 4.5.6. Pengaturan Profil Toko (Store Settings):**
    *   Formulir untuk mengubah Nama Bisnis ("Synectra Jasa Digital"), Bio/Deskripsi publik, dan mengunggah gambar Avatar/Logo baru.

---

## 5. Arsitektur Sistem & Teknologi

| Layer | Teknologi | Detail Implementasi |
| :--- | :--- | :--- |
| **Frontend Publik** | Next.js (App Router), React, Tailwind CSS | Halaman katalog dirender menggunakan SSG/ISR agar *load time* sangat cepat dan SEO optimal. |
| **Frontend Admin** | Next.js (Client Components), Shadcn UI | Komponen *dashboard* responsif, *data tables*, *modals*, form input, dan *toast notifications* untuk kemudahan manajemen. |
| **Backend API** | Vercel Serverless Functions | Menangani pembuatan pesanan, komunikasi ke API DOKU, dan penerima Webhook DOKU. Rute API Admin dilindungi *middleware* autentikasi. |
| **Database** | Supabase (PostgreSQL) | Menyimpan konfigurasi profil, tautan, produk, dan riwayat pesanan. Memanfaatkan Supabase Client JS / Prisma ORM. |
| **Storage** | Supabase Storage | Menggunakan *Private Bucket* untuk aset digital berbayar dan *Public Bucket* untuk gambar *thumbnail*/logo. |
| **Email** | Resend API / React Email | Mengirimkan resi pembayaran dan tautan *download* dengan desain HTML yang profesional. |

---

## 6. Skema Basis Data (Database Schema)

Skema direlasikan dengan struktur PostgreSQL di Supabase.

### Tabel `profiles` (Konfigurasi Akun/Toko)
*   `id` (uuid, PK) - Relasi ke Supabase Auth `users.id`
*   `business_name` (varchar) - ex: "Synectra Jasa Digital"
*   `bio` (text)
*   `avatar_url` (varchar)

### Tabel `links` (Tautan Sosial/Portofolio)
*   `id` (uuid, PK)
*   `title` (varchar) - ex: "Portofolio Aplikasi"
*   `url` (varchar)
*   `sort_order` (int) - Untuk pengurutan di Panel Admin
*   `is_active` (boolean)

### Tabel `products` (Katalog Aset Digital)
*   `id` (uuid, PK)
*   `title` (varchar) - ex: "CCTV AI YOLOv8 Script"
*   `description` (text)
*   `price` (int) - Disimpan dalam IDR (Rupiah)
*   `thumbnail_url` (varchar) - URL dari *public bucket*
*   `file_path` (varchar) - *Path* internal di *private bucket*
*   `category` (varchar)
*   `is_active` (boolean)
*   `created_at` (timestamptz)

### Tabel `orders` (Transaksi Pembelian)
*   `id` (uuid, PK)
*   `invoice_id` (varchar, UNIQUE) - Format: SYN-ORD-[TIMESTAMP] (Dikirim ke DOKU)
*   `buyer_name` (varchar)
*   `buyer_email` (varchar)
*   `product_id` (uuid, FK ke `products`)
*   `amount` (int)
*   `status` (enum) - `PENDING`, `PAID`, `FAILED`, `EXPIRED`
*   `doku_reference` (varchar, nullable) - ID referensi dari DOKU
*   `created_at` (timestamptz)

---

## 7. Persyaratan Non-Fungsional (NFR)

1.  **Keamanan Data & Berkas:**
    *   Terapkan *Row Level Security* (RLS) di Supabase agar tabel `orders`, konfigurasi `profiles`, dan aksi *Write/Update/Delete* pada `products` dan `links` hanya dapat diakses oleh *Role* Admin yang diautentikasi (Juliana).
    *   Berkas ZIP produk tidak boleh bisa ditebak URL-nya (wajib menggunakan `Signed URL` berbatas waktu).
2.  **Keamanan Transaksi (Edge Cases):**
    *   Pastikan ada mekanisme validasi bahwa nominal harga yang dikirim ke DOKU tidak dimanipulasi di sisi *frontend* (harga selalu diambil langsung dari *database backend* saat *checkout*).
3.  **Ketersediaan (Uptime):**
    *   Mengandalkan infrastruktur Vercel dan Supabase yang menargetkan *uptime* 99.9%.

---

## 8. Roadmap Pengembangan (Sprints)

*   **Sprint 1: Konfigurasi & UI Publik (1 Minggu)**
    *   Setup *project* Next.js, instalasi Shadcn UI dan Tailwind.
    *   Pembuatan UI halaman Link-in-Bio (Header, Links List, Product Grid).
    *   Desain *modal checkout* (pengisian nama & email).
*   **Sprint 2: Panel Admin & Database (1.5 Minggu)**
    *   Setup *project* Supabase, eksekusi skema SQL dan konfigurasi Auth (RLS).
    *   Pembuatan UI Panel Admin (Shadcn UI *dashboard layout*).
    *   Implementasi logika CRUD untuk menu Products, Links, dan Settings di sisi klien (Admin) dan *backend* (Supabase).
*   **Sprint 3: Integrasi Pembayaran & Pemenuhan (1.5 Minggu)**
    *   Integrasi DOKU *Generate Payment Link API*.
    *   Pembuatan *Webhook Listener* DOKU dan validasi *Signature*.
    *   Implementasi Supabase Storage *Signed URL*.
    *   Integrasi *email sender* (Resend) untuk pengiriman *file*.
    *   Penyambungan status *Webhook* ke tampilan *Order Monitor* di Panel Admin.
*   **Sprint 4: Pengujian & Rilis (0.5 Minggu)**
    *   Simulasi transaksi menggunakan DOKU Sandbox Environment (QRIS/VA) dan pengujian aliran *Webhook*.
    *   Uji coba kadaluarsa *Signed URL* dan manajemen *file* melalui Admin Panel.
    *   *Routing custom domain* Vercel ke domain resmi Synectra.
    *   Transisi API DOKU ke mode *Production*.