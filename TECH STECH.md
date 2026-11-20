# DOKUMEN SPESIFIKASI TECH STACK & ARSITEKTUR SISTEM

**Nama Proyek:** Synectra Digital Catalog  
**Pola Arsitektur:** Modular Multi-Layer Architecture (Separated Frontend & Backend)  
**Infrastruktur Utama:** Vercel (Serverless Compute & Edge Network) + Supabase (BaaS)  
**Gerbang Pembayaran:** DOKU Payment Gateway  
**Versi:** 1.0  

---

## 1. Konsep Multi-Layer Architecture

Sistem dirancang menggunakan pendekatan **Separation of Concerns (SoC)** dengan memisahkan direktori **`/frontend`** dan **`/backend`** di dalam satu repositori (*Monorepo* / *Workspace*). Arsitektur ini memastikan kode mudah diuji (*testable*), mudah dikembangkan (*scalable*), dan tidak saling mengunci (*decoupled*) ketika di-deploy ke **Vercel**.

```
========================================================================================
                         ALUR ARSITEKTUR MULTI-LAYER SYNECTRA
========================================================================================

[ PENGGUNA / ADMIN ]
        │
        ▼ (HTTPS / Edge CDN)
+--------------------------------------------------------------------------------------+
| FRONTEND LAYER (/frontend - Next.js App Router)                                      |
|  ├── 1. Presentation Layer (Pages, Layouts, Responsive Views)                        |
|  ├── 2. UI Component Layer (Shadcn UI, Interactive Drawers, Modals)                  |
|  ├── 3. Application State Layer (Custom Hooks, TanStack Query, Zustand)              |
|  └── 4. API Client Layer (Typed Fetch/Axios Interceptors)                            |
+--------------------------------------------------------------------------------------+
        │
        ▼ (REST API / JSON + JWT Auth Header)
+--------------------------------------------------------------------------------------+
| BACKEND LAYER (/backend - Node.js TypeScript on Vercel Serverless)                   |
|  ├── 1. Delivery / Controller Layer (Request Parsing, HTTP Status, Routing)          |
|  ├── 2. Middleware & Security Layer (Supabase JWT Guard, DOKU HMAC Validator, Zod)   |
|  ├── 3. Service / Business Logic Layer (Checkout, Auto-Fulfillment, Analytics)       |
|  ├── 4. Repository / Data Access Layer (Abstraksi Query Database & Storage)          |
|  └── 5. Infrastructure / Adapter Layer (Supabase SDK, DOKU REST Client, Resend SDK)  |
+--------------------------------------------------------------------------------------+
        │                                       │                               │
        ▼ (PostgreSQL & Signed URL)             ▼ (REST API & Webhook)          ▼ (SMTP/API)
[ SUPABASE CLOUD ]                        [ DOKU GATEWAY ]                [ RESEND EMAIL ]
 (DB, Auth, Private Storage)               (QRIS, VA, E-Wallet)            (Auto-Delivery)
```

---

## 2. Spesifikasi Tech Stack Lengkap

### 2.1. Frontend Stack (`/frontend`)
| Kategori | Teknologi | Peran & Alasan Pemilihan |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15 (App Router)** | Mendukung SSR/ISR untuk kecepatan muat katalog publik $< 1.2\text{ detik}$ dan SEO optimal di Vercel. |
| **Bahasa** | **TypeScript** | Menjamin keamanan tipe data (*type-safety*) dari respons API hingga komponen UI. |
| **Styling & UI** | **Tailwind CSS + Shadcn UI** | Pembuatan komponen ala Lynk.id (*Drawer*, *Dialog*, *Bento Grid*) yang responsif dan konsisten. |
| **Animasi** | **Framer Motion** | Transisi halus pada *Bottom Sheet Checkout*, filter kategori dinamis, dan *micro-interactions*. |
| **Data Fetching** | **TanStack Query (React Query)** | Mengelola *caching*, *loading state*, dan sinkronisasi data *real-time* pada Panel Admin. |
| **State Management** | **Zustand** | Menyimpan *state* ringan di sisi klien (seperti *Live Mobile Preview* di Admin & *Checkout Drawer*). |
| **Form & Validasi** | **React Hook Form + Zod** | Validasi input *guest checkout* (nama & email) serta validasi form unggah produk di Admin. |
| **Drag & Drop** | **@dnd-kit/core** | Mengatur urutan (*sorting*) tautan portofolio dan produk secara interaktif di Panel Admin. |

### 2.2. Backend Stack (`/backend`)
| Kategori | Teknologi | Peran & Alasan Pemilihan |
| :--- | :--- | :--- |
| **Runtime & Framework** | **Node.js + Hono / Express.js (TypeScript)** | *Framework* backend super ringan yang berjalan secara *native* di atas **Vercel Serverless Functions** dengan *cold-start* mendekati $0\text{ ms}$. |
| **Validasi Skema** | **Zod** | Memvalidasi *payload* masuk pada *Controller Layer* sebelum diproses oleh *Service Layer*. |
| **Keamanan & Kriptografi** | **Node Crypto (Native)** | Menghitung dan memvalidasi *HMAC-SHA256 Signature* dari *Header* DOKU Checkout & Webhook. |
| **Email Engine** | **Resend SDK + React Email** | Merender *template* email pengiriman *file* produk (`Signed URL`) yang rapi dan anti-spam. |

### 2.3. Database, Storage & Infrastruktur (`/supabase` & Vercel)
| Kategori | Teknologi | Peran & Alasan Pemilihan |
| :--- | :--- | :--- |
| **Database** | **Supabase PostgreSQL** | Basis data relasional dengan fitur *Row Level Security* (RLS) untuk memisahkan akses publik dan admin. |
| **Authentication** | **Supabase Auth** | Mengelola sesi login Administrator menggunakan JWT (*JSON Web Token*). |
| **Object Storage** | **Supabase Storage** | Terbagi menjadi 2 *Bucket*: `public-assets` (Thumbnail/Avatar) dan `private-products` (File ZIP/GLB berbayar). |
| **Hosting & CI/CD** | **Vercel** | *Deployment* otomatis dari GitHub, mendukung *Monorepo* maupun *Rewrite Routing* antara `/frontend` dan `/backend`. |

---

## 3. Struktur Folder Proyek (Multi-Layer Directory Tree)

Struktur di bawah ini memisahkan `frontend`, `backend`, dan `supabase` secara bersih di dalam satu *root workspace*:

```text
synectra-digital-catalog/
├── package.json                      # Konfigurasi Workspace (npm/pnpm workspaces)
├── vercel.json                       # Konfigurasi Routing & Serverless Build Vercel
├── .env.example                      # Template Environment Variables
│
├── supabase/                         # LAYER DATABASE & CLOUD INFRASTRUCTURE
│   ├── config.toml
│   ├── migrations/
│   │   ├── 001_initial_schema.sql    # Pembuatan tabel profiles, links, products, orders
│   │   └── 002_rls_policies.sql      # Kebijakan keamanan Row Level Security (RLS)
│   └── seed.sql                      # Data awal katalog Synectra
│
├── frontend/                         # LAYER FRONTEND APPLICATION (Next.js)
│   ├── package.json
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   └── src/
│       ├── app/                      # 1. Presentation / Routing Layer
│       │   ├── (public)/             # Grup rute etalase publik (Lynk.id style)
│       │   │   ├── page.tsx          # Halaman utama katalog (Mobile & Desktop Adaptive)
│       │   │   └── payment-status/   # Halaman redirect sukses/pending dari DOKU
│       │   └── (admin)/              # Grup rute Panel Admin
│       │       ├── login/page.tsx
│       │       └── admin/
│       │           ├── layout.tsx    # Split-Screen Layout + Live Mobile Preview
│       │           ├── page.tsx      # Dashboard Overview & Analitik
│       │           ├── products/     # Manajemen Produk & File Dropzone
│       │           ├── links/        # Manajemen Tautan Drag-and-Drop
│       │           ├── orders/       # Monitor Transaksi & Resend Email
│       │           └── appearance/   # Kustomisasi Profil & Tema Toko
│       │
│       ├── components/               # 2. UI Component Layer
│       │   ├── ui/                   # Komponen dasar Shadcn (Button, Drawer, Dialog, dll.)
│       │   ├── storefront/           # ProfileHeader, LinkBlock, ProductCard, CheckoutDrawer
│       │   └── admin/                # LivePhoneMockup, ProductFormModal, SortableItem
│       │
│       ├── hooks/                    # 3. Application / State Layer
│       │   ├── useCatalog.ts         # Mengambil & memfilter produk/tautan
│       │   ├── useCheckout.ts        # Mengelola alur guest checkout ke DOKU
│       │   └── useAdminProducts.ts   # Operasi CRUD produk & progress upload
│       │
│       ├── services/                 # 4. Frontend API Client Layer
│       │   ├── apiClient.ts          # Instance Fetch/Axios terpusat ke /api/* (Backend)
│       │   └── supabaseBrowser.ts    # Klien Supabase khusus Auth & Direct Upload
│       │
│       └── types/                    # Definisi Tipe Data Frontend
│           └── index.ts
│
└── backend/                          # LAYER BACKEND API (Multi-Layer Architecture)
    ├── package.json
    ├── tsconfig.json
    ├── api/
    │   └── index.ts                  # Entrypoint Vercel Serverless Function (/api/*)
    └── src/
        ├── config/                   # Konfigurasi Environment & Konstanta
        │   └── env.ts
        │
        ├── routes/                   # Definisi Endpoint REST API
        │   ├── index.ts
        │   ├── public.routes.ts      # GET /catalog, POST /checkout
        │   ├── webhook.routes.ts     # POST /webhooks/doku
        │   └── admin.routes.ts       # CRUD /admin/products, /admin/links, /admin/orders
        │
        ├── middlewares/              # 1. Security & Middleware Layer
        │   ├── auth.middleware.ts    # Verifikasi Token JWT Supabase untuk rute /admin
        │   ├── doku.middleware.ts    # Verifikasi HMAC-SHA256 Signature dari DOKU
        │   ├── validate.middleware.ts# Validasi Request Body/Query dengan Zod
        │   └── error.middleware.ts   # Global Error Handler terstandarisasi
        │
        ├── controllers/              # 2. Delivery / Controller Layer
        │   ├── catalog.controller.ts
        │   ├── checkout.controller.ts
        │   ├── webhook.controller.ts
        │   └── admin.controller.ts
        │
        ├── services/                 # 3. Business Logic / Service Layer
        │   ├── catalog.service.ts    # Logika agregasi profil, link, dan produk aktif
        │   ├── checkout.service.ts   # Kalkulasi harga, buat order PENDING, panggil DOKU
        │   ├── fulfillment.service.ts# Ubah status PAID, buat Signed URL, picu pengiriman email
        │   └── admin.service.ts      # Logika bisnis manajemen data & statistik penjualan
        │
        ├── repositories/             # 4. Data Access / Repository Layer
        │   ├── profile.repository.ts # Query tabel `profiles`
        │   ├── link.repository.ts    # Query tabel `links` & update `sort_order`
        │   ├── product.repository.ts # Query tabel `products`
        │   ├── order.repository.ts   # Query tabel `orders` & pencarian invoice
        │   └── storage.repository.ts # Operasi Supabase Storage (Generate Signed URL, Delete)
        │
        ├── infrastructure/           # 5. External Integration / Adapter Layer
        │   ├── supabase.admin.ts     # Inisialisasi Supabase Service Role Client (Bypass RLS)
        │   ├── doku.client.ts        # HTTP Client khusus API DOKU (Jokul Checkout)
        │   └── mail.client.ts        # Klien Resend API & Template Email HTML
        │
        └── models/                   # 6. Domain Models, DTOs & Schemas
            ├── dto/
            │   ├── checkout.dto.ts   # Skema Zod untuk input Guest Checkout
            │   └── product.dto.ts    # Skema Zod untuk input CRUD Produk
            └── entities/
                └── database.types.ts # Tipe otomatis dari skema Supabase PostgreSQL
```

---

## 4. Penjelasan tanggung Jawab Setiap Layer di Backend

Dengan menerapkan **Multi-Layer Architecture** pada folder `/backend`, setiap proses bisnis (seperti pembelian produk hingga pengiriman *file* otomatis) memiliki batas tanggung jawab yang sangat jelas:

### 4.1. Delivery / Controller Layer (`src/controllers/`)
*   **Tugas:** Menerima objek `Request`, memanggil *Service* yang sesuai, dan mengembalikan respons JSON standar (`{ success: boolean, data: any, message?: string }`).
*   **Aturan Ketat:** *Controller* dilarang menulis *query* database atau menghitung logika bisnis secara langsung.

### 4.2. Service / Business Logic Layer (`src/services/`)
*   **Tugas:** Menjalankan aturan bisnis utama Synectra.
*   **Contoh Kasus pada `CheckoutService.createTransaction()`:**
    1. Meminta data produk ke `ProductRepository` berdasarkan `product_id` (memastikan harga diambil dari server, bukan dari input *frontend*).
    2. Membuat kode unik `SYN-ORD-[TIMESTAMP]`.
    3. Menyimpan pesanan berstatus `PENDING` melalui `OrderRepository`.
    4. Meminta `DokuClient` (Infrastructure Layer) untuk membuat tautan pembayaran DOKU.
    5. Mengembalikan URL pembayaran DOKU ke *Controller*.

### 4.3. Repository / Data Access Layer (`src/repositories/`)
*   **Tugas:** Menjadi satu-satunya lapisan yang berkomunikasi dengan tabel-tabel di Supabase PostgreSQL dan *bucket* Supabase Storage.
*   **Keuntungan:** Jika di masa depan terdapat perubahan struktur tabel atau penambahan *caching* (seperti Redis), Anda cukup mengubah kode di *Repository* tanpa menyentuh *Service* maupun *Controller*.

### 4.4. Infrastructure / Adapter Layer (`src/infrastructure/`)
*   **Tugas:** Membungkus SDK dan API pihak ketiga:
    *   `supabase.admin.ts`: Menggunakan `SUPABASE_SERVICE_ROLE_KEY` agar *backend* dapat membuat `Signed URL` dari *private bucket* dan memperbarui status transaksi dari *webhook* DOKU dengan aman.
    *   `doku.client.ts`: Menangani pembuatan *Header* `Client-Id`, `Request-Id`, `Request-Timestamp`, dan pembuatan *Signature* $\text{HMAC-SHA256}$ sesuai standar dokumentasi DOKU.
    *   `mail.client.ts`: Mengirimkan email transaksional berisi tautan unduhan kepada pembeli.

---

## 5. Konfigurasi Deployment di Vercel (`vercel.json`)

Agar folder `/frontend` dan `/backend` dapat berjalan bersama dengan mulus di satu proyek **Vercel** (di mana semua permintaan ke `/api/*` diarahkan ke *Backend Serverless* dan rute lainnya diarahkan ke *Frontend Next.js*), gunakan konfigurasi `vercel.json` di tingkat *root* berikut:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/api/index.ts",
      "use": "@vercel/node"
    },
    {
      "src": "frontend/package.json",
      "use": "@vercel/next"
    }
  ],
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "backend/api/index.ts"
    },
    {
      "source": "/(.*)",
      "destination": "frontend/$1"
    }
  ]
}
```
> **Catatan Alternatif Deployment:** Anda juga dapat men-deploy `/frontend` dan `/backend` sebagai **2 Proyek Vercel Terpisah** dari repositori GitHub yang sama cukup dengan mengatur *Root Directory* masing-masing proyek di pengaturan *Dashboard* Vercel (`frontend` untuk web utama, dan `backend` untuk `api.synectra.id`).

---

## 6. Spesifikasi Environment Variables (`.env`)

Berikut adalah daftar variabel lingkungan yang wajib dikonfigurasi pada **Vercel Project Settings**:

```ini
# ==========================================
# 1. KONFIGURASI FRONTEND (PUBLIC)
# ==========================================
NEXT_PUBLIC_APP_URL=https://catalog.synectra.id
NEXT_PUBLIC_API_BASE_URL=https://catalog.synectra.id/api
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ==========================================
# 2. KONFIGURASI BACKEND (SERVER-ONLY)
# ==========================================
# Kunci Service Role Supabase (Hanya diakses oleh Repository & Infrastructure Layer)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SIGNED_URL_EXPIRES_IN=86400 # 24 Jam dalam satuan detik

# Kredensial DOKU Payment Gateway
DOKU_CLIENT_ID=BRN-0213-1700000000000
DOKU_SECRET_KEY=SK-xxxxxxxxxxxxxxxxxxxxxxxx
DOKU_API_BASE_URL=https://api-sandbox.doku.com # Gunakan https://api.doku.com saat Production

# Kredensial Pengiriman Email Otomatis (Resend)
RESEND_API_KEY=re_123456789_abcdefghijklmnop
MAIL_FROM_ADDRESS="Synectra Jasa Digital <delivery@synectra.id>"
```

---

## 7. Standar Keamanan & Alur Data Kritis

1. **Direct-to-Storage Upload untuk File Besar (Bypass Limit 4.5 MB Vercel):**
   * Karena Vercel Serverless Functions memiliki batas ukuran *request body* sebesar $4.5\text{ MB}$, pengunggahan *file* produk berukuran besar (seperti *file* ZIP/GLB hingga $50\text{ MB}$) dari Panel Admin dilakukan dengan pola **Presigned Upload URL**:
     1. Admin meminta izin unggah ke `/api/admin/products/upload-url`.
     2. Backend memvalidasi sesi Admin dan memanggil `StorageRepository.createSignedUploadUrl()`.
     3. Frontend mengunggah *file* langsung ke Supabase Storage menggunakan URL tersebut dengan indikator *progress bar* yang akurat.
2. **Validasi Kriptografi Webhook DOKU:**
   * Setiap *callback* yang masuk ke `/api/webhooks/doku` wajib diverifikasi menggunakan algoritma:
     $$\text{Signature} = \text{Base64}\left(\text{HMAC-SHA256}\left(\text{ComponentString}, \text{DOKU\_SECRET\_KEY}\right)\right)$$
   * Selain itu, `FulfillmentService` menerapkan sifat **Idempotensi** (mengecek apakah status pesanan sudah `PAID` sebelumnya) agar tidak mengirim email ganda jika server DOKU mengirim *webhook* berulang.