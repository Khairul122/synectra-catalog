# DOKUMEN SPESIFIKASI DESAIN UI/UX (DESIGN SYSTEM)

**Nama Proyek:** Synectra Digital Catalog  
**Inspirasi Referensi:** Lynk.id (dengan peningkatan *Adaptive Desktop Layout*)  
**Versi:** 1.0  
**Target Perangkat:** Mobile-First ($\le 767\text{ px}$), Tablet ($768\text{ px} - 1023\text{ px}$), dan Desktop ($\ge 1024\text{ px}$)  

---

## 1. Hasil Riset UI/UX Lynk.id & Strategi Adaptasi

Berdasarkan bedah antarmuka **Lynk.id**, terdapat 5 pilar utama yang membuat platform tersebut sangat mudah digunakan (*easy-to-use*) dan menghasilkan konversi tinggi:

1. **Visual Header yang Personal:** Menggunakan kombinasi *Cover Banner* (ukuran optimal $1200 \times 628\text{ px}$) dengan foto profil/logo yang menumpuk (*overlapping avatar*) di bagian tengah atau tepi bawah *banner*, diikuti nama bisnis, deskripsi singkat (*About You*), dan deretan ikon media sosial.
2. **Arsitektur Berbasis Blok (*Block-Based Content*):** Semua elemen di halaman depan—baik tautan eksternal maupun produk digital—disusun sebagai blok-blok modular yang rapi dan mudah dipindai mata (*scannable*).
3. **Kartu Produk Digital Kompak (*Simple Product Template*):** Menampilkan *thumbnail* visual yang menonjol, judul jelas, harga dalam Rupiah (IDR), dan tombol aksi langsung (*Buy Now* / *Beli Sekarang*).
4. **Gesekan Transaksi Rendah (*Frictionless Checkout*):** Pembeli tidak perlu mendaftar akun. Cukup klik produk, baca deskripsi singkat, isi nama serta email, lalu bayar.
5. **Admin Builder dengan *Live Preview*:** Sisi admin memisahkan area pengaturan ("My Lynk" & "Appearance") di sebelah kiri dan pratinjau layar ponsel (*mobile mockup preview*) secara langsung (*real-time*) di sebelah kanan.

### Peningkatan Khusus untuk Synectra Digital Catalog:
* **Masalah Umum Lynk.id di Desktop:** Tampilan desktop umumnya hanya menampilkan kolom sempit berukuran layar HP di tengah layar monitor, sehingga menyisakan ruang kosong yang kaku di sisi kiri dan kanan.
* **Solusi Desain Synectra:** Menerapkan **Adaptive Split-Screen Layout** pada tampilan *desktop* (Profil *sticky* di kiri, Katalog *Bento Grid* di kanan), namun tetap mempertahankan tampilan satu kolom vertikal khas Lynk.id saat dibuka melalui *smartphone*.

---

## 2. Sistem Desain & Identitas Visual (*Eye-Catching & Modern*)

Untuk mencerminkan citra produk teknologi (Web App, AI CCTV, dan Roblox Assets), tema visual dirancang menggunakan konsep **Modern Tech Glassmorphism** dengan dukungan penuh *Light Mode* (default bersih & tepercaya) serta *Dark Mode* (futuristik & elegan).

### 2.1. Palet Warna (Color Tokens)

| Peran Warna | Light Mode (Default) | Dark Mode (Opsional/Auto) | Penggunaan |
| :--- | :--- | :--- | :--- |
| **Background Primary** | `#F8FAFC` (Slate 50) | `#0B0F19` (Deep Space) | Latar belakang utama halaman |
| **Surface / Card** | `#FFFFFF` (Pure White) | `#1E293B` (Charcoal Slate) | Latar kartu produk, tombol blok, dan *modal* |
| **Primary Brand** | `#00A8E8` (Vibrant Cyan) | `#38BDF8` (Sky Cyan) | Tombol CTA utama, aksen aktif, *highlight* harga |
| **Secondary Accent** | `#6366F1` (Electric Indigo) | `#818CF8` (Soft Indigo) | Gradien *banner*, *badge* kategori, efek *glow* |
| **Text Primary** | `#0F172A` (Slate 900) | `#F8FAFC` (Slate 50) | Judul produk, nama profil, teks utama |
| **Text Muted** | `#64748B` (Slate 500) | `#94A3B8` (Slate 400) | Deskripsi bio, sub-teks, harga coret |
| **Semantic Status** | Hijau: `#10B981`, Kuning: `#F59E0B`, Merah: `#EF4444` | Sama dengan Light Mode | Indikator status pesanan (PAID, PENDING, FAILED) |

### 2.2. Tipografi (Typography)
* **Heading & Judul:** **Plus Jakarta Sans** (Bold / SemiBold) — Memberikan karakter modern, ramah, dan tajam di layar ponsel maupun monitor.
* **Body & Deskripsi:** **Inter** (Regular / Medium) — Sangat mudah dibaca pada ukuran kecil sekalipun.
* **Harga, Angka & Kode Invoice:** **JetBrains Mono** (Medium / Bold) — Memberikan kesan teknis yang presisi untuk nominal Rupiah dan nomor referensi transaksi.

### 2.3. Bentuk, Sudut, dan Bayangan (Shape & Elevation)
* **Border Radius:**
  * Kartu Produk & Modal: `rounded-2xl` ($16\text{ px}$)
  * Tombol Tautan (*Link Blocks*) & Filter Kategori: `rounded-xl` ($12\text{ px}$) atau `rounded-full` (bentuk kapsul/*pill* khas Lynk.id)
  * Thumbnail Produk: `rounded-xl` ($12\text{ px}$) dengan rasio aspek konsisten $1:1$ (persegi) atau $16:9$ (lanskap).
* **Shadow & Border:**
  * Kartu menggunakan garis tepi tipis `1px solid rgba(226, 232, 240, 0.8)` dengan bayangan lembut `shadow-sm` yang berubah menjadi `shadow-xl` disertai pendaran warna tipis (*cyan glow*) saat disentuh kursor (*hover*).

---

## 3. Arsitektur Tata Letak Responsif (Mobile vs. Desktop View)

### 3.1. Halaman Etalase Publik (*Public Storefront*)

#### A. Tampilan Mobile ($\le 767\text{ px}$) — *True Lynk.id Experience*
* **Struktur:** Satu kolom vertikal penuh (*Single-Column Feed*) dengan lebar maksimum $100\%$ dan *padding* tepi $16\text{ px}$.
* **Header:** *Banner* di bagian paling atas, diikuti logo bulat yang menumpuk di garis batas bawah *banner* (*overlap* $-36\text{ px}$), nama toko di tengah (*center-aligned*), bio singkat, dan barisan ikon sosial.
* **Navigasi Kategori (*Sticky Filter Bar*):** Saat pengguna menggulir (*scroll*) melewati profil, barisan *pill* kategori (`Semua`, `Web App`, `AI & CCTV`, `Roblox`) akan menempel (*sticky*) di bagian atas layar dengan efek latar buram (*backdrop-blur*).
* **Susunan Konten:**
  1. Blok Tautan Penting (*Featured Links*) — Tombol memanjang penuh (*full-width*).
  2. Grid Produk Digital — Dapat diatur tampil 1 kolom besar atau 2 kolom kompak berdampingan.
* **Interaksi Detail & Checkout:** Mengklik produk akan memunculkan **Bottom Sheet Drawer** (panel geser dari bawah layar ke atas) sehingga jempol pengguna sangat mudah menjangkau formulir input dan tombol bayar.

#### B. Tampilan Desktop ($\ge 1024\text{ px}$) — *Adaptive Split-Screen Showcase*
* **Struktur:** Kontainer utama terpusat (`max-w-6xl` atau $1152\text{ px}$) yang terbagi menjadi **2 Kolom Asimetris** ($35\%$ Kiri : $65\%$ Kanan) dengan jarak antar kolom $32\text{ px}$.
* **Kolom Kiri (Sticky Profile Card - Lebar $\approx 380\text{ px}$):**
  * Kartu profil tetap diam (*sticky*) saat halaman digulir.
  * Berisi *Banner*, Avatar/Logo, Nama "Synectra Jasa Digital", Bio lengkap, deretan ikon sosial, dan daftar tombol **Tautan Portofolio/Kontak** (GitHub, WhatsApp, Kooda Easy).
* **Kolom Kanan (Scrollable Catalog Feed - Lebar $\approx 740\text{ px}$):**
  * Bagian atas menampilkan **Search Bar Instan** dan **Filter Kategori** dalam satu baris.
  * Bagian bawah menampilkan **Katalog Produk Digital** dalam format **Grid 2 hingga 3 Kolom** (*Bento Style*).
* **Interaksi Detail & Checkout:** Mengklik produk akan memunculkan **Centered Split Modal** (Gambar pratinjau di sisi kiri *modal*, deskripsi dan formulir *guest checkout* di sisi kanan *modal*).

---

## 4. Wireframe Visual (Blueprint Tata Letak)

### 4.1. Wireframe Etalase: Mobile View vs. Desktop View

```text
====================================================================================
[ TAMPILAN MOBILE (< 768px) ]             [ TAMPILAN DESKTOP (>= 1024px) ]
====================================================================================

+-----------------------------------+     +------------------+ +---------------------------------------+
|       [ COVER BANNER 16:9 ]       |     | [ COVER BANNER ] | | [ Cari produk... ] [Semua][AI][Roblox]|
|            ( ( LOGO ) )           |     |    (( LOGO ))    | +---------------------------------------+
|                                   |     |                  | |                                       |
|      Synectra Jasa Digital ✓      |     | Synectra Digital | | +-----------------+ +---------------+ |
|   Solusi Web App, AI & Roblox     |     | Solusi Web, AI.. | | | [THUMBNAIL 1:1] | | [THUMBNAIL]   | |
|      [IG]  [GH]  [WA]  [WEB]      |     | [IG] [GH] [WA]   | | | [Badge: AI]     | | [Badge: Web]  | |
+-----------------------------------+     |                  | | | CCTV YOLOv8     | | WA Order App  | |
| [ Semua ] [ Web ] [ AI ] [Roblox] | <-- | +--------------+ | | | Rp 450.000      | | Rp 350.000    | |
+-----------------------------------+     | | Portofolio ↗ | | | | [ Beli Instan ] | | [ Beli Instan]| |
| +-------------------------------+ |     | +--------------+ | | +-----------------+ +---------------+ |
| | 🌐 Portofolio Kooda Easy    ↗ | |     | | Konsultasi ↗ | | |                                       |
| +-------------------------------+ |     | +--------------+ | | +-----------------+ +---------------+ |
| | 💬 Konsultasi Custom Project↗ | |     |                  | | | [THUMBNAIL 1:1] | | [THUMBNAIL]   | |
| +-------------------------------+ |     | (Sticky di Kiri) | | | [Badge: Roblox] | | [Badge: AI]   | |
|                                   |     +------------------+ | | Map Obby Pack   | | BoT-SORT Kit  | |
| KATALOG PRODUK DIGITAL            |                          | | Rp 150.000      | | Rp 550.000    | |
| +--------------+ +--------------+ |                          | | [ Beli Instan ] | | [ Beli Instan]| |
| | [THUMBNAIL]  | | [THUMBNAIL]  | |                          | +-----------------+ +---------------+ |
| | CCTV YOLOv8  | | WA Order App | |                          +---------------------------------------+
| | Rp 450.000   | | Rp 350.000   | |
| | [  Beli  ]   | | [  Beli  ]   | |
| +--------------+ +--------------+ |
+-----------------------------------+
```

### 4.2. Wireframe Panel Admin (Gaya "My Lynk" Builder dengan Live Preview)

```text
====================================================================================================
[ PANEL ADMIN DESKTOP: SPLIT-SCREEN BUILDER & LIVE PREVIEW ]
====================================================================================================
+----------------+ +---------------------------------------------+ +-------------------------------+
| SYNECTRA ADMIN | | MANAJEMEN KATALOG & BLOK                    | |     LIVE MOBILE PREVIEW       |
|----------------| |---------------------------------------------| |                               |
| 📊 Overview    | | [ + Tambah Produk ]   [ + Tambah Tautan ]   | |      .-----------------.      |
| 📦 Produk &    | |                                             | |      |  [Banner Toko]  |      |
|    Tautan      | | :: [Aktif] 🌐 Portofolio Kooda Easy   [Edit]| |      |    (( Logo ))   |      |
| 🎨 Appearance  | | :: [Aktif] 📦 Sistem Deteksi YOLOv8   [Edit]| |      | Synectra Digital|      |
| 🧾 Transaksi   | |    Rp 450.000 | Kategori: AI | 24 Terjual   | |      |  [Portofolio]   |      |
| ⚙️ Pengaturan  | | :: [Aktif] 📦 Template WA Order App   [Edit]| |      |  +-----------+  |      |
|                | |    Rp 350.000 | Kategori: Web | 12 Terjual  | |      |  | YOLOv8 AI |  |      |
|                | | :: [Draft] 📦 Roblox Map Terrain      [Edit]| |      |  | Rp450.000 |  |      |
|                | |    Rp 150.000 | Kategori: Roblox            | |      |  +-----------+  |      |
| [Lihat Web ↗]  | |                                             | |      '-----------------'      |
+----------------+ +---------------------------------------------+ +-------------------------------+
```

---

## 5. Spesifikasi Detail Komponen & Interaktivitas (*Micro-Interactions*)

Agar aplikasi terasa hidup, dinamis, dan *eye-catching*, setiap komponen dilengkapi dengan umpan balik visual (*visual feedback*) yang responsif:

### 5.1. Tombol Tautan (*Link Blocks*)
* **Anatomi:** Ikon/Thumbnail di kiri ($40 \times 40\text{ px}$) + Teks Judul di tengah/kiri + Ikon Panah (`ArrowUpRight`) di kanan.
* **Interaksi:**
  * *Hover (Desktop):* Tombol naik sedikit (`-translate-y-0.5`), bayangan membesar, dan ikon panah bergeser diagonal $2\text{ px}$ ke kanan atas.
  * *Active/Tap (Mobile):* Efek mengecil halus (`scale-[0.98]`) selama $100\text{ ms}$ untuk memberikan sensasi tombol fisik.
  * *Highlight Block:* Tautan paling penting dapat diberi animasi *border shimmer* (kilauan cahaya berjalan di tepi tombol) untuk menarik perhatian pengunjung.

### 5.2. Kartu Produk Digital (*Product Card*)
* **Anatomi:**
  * **Gambar Thumbnail:** Rasio $1:1$ dengan fitur *lazy loading* dan *skeleton shimmer* saat sedang dimuat.
  * **Floating Category Badge:** Terletak di pojok kiri atas gambar dengan efek `backdrop-blur-md` dan latar semi-transparan (contoh: `🤖 AI & CCTV`, `💻 Web App`, `🎮 Roblox`).
  * **Informasi Harga:** Mendukung tampilan harga normal (`Rp 450.000`) maupun harga diskon dengan harga coret (`Rp 600.000` dicoret di samping harga utama) untuk meningkatkan psikologi konversi.
  * **Tombol CTA:** Tombol penuh bertuliskan `"Beli Sekarang"` dengan ikon keranjang/petir.
* **Interaksi:** Saat kartu disentuh kursor, gambar *thumbnail* melakukan *zoom-in* halus (`scale-105` dengan `overflow-hidden`).

### 5.3. Laci/Modal Checkout Instan (*Seamless Guest Checkout*)
Menggantikan perpindahan halaman yang lambat dengan satu kontainer interaktif yang memiliki **2 Tahap Transisi Halus**:
* **Tahap 1 — Pratinjau Produk:**
  * Menampilkan *carousel* gambar produk, label ukuran *file* (misal: `ZIP • 45 MB`), daftar fitur utama produk (menggunakan ikon centang hijau), dan deskripsi lengkap.
  * Bagian bawah memiliki **Sticky Action Bar** berisi total harga dan tombol `"Lanjut ke Pembayaran"`.
* **Tahap 2 — Formulir Guest & Pemicu DOKU:**
  * Saat tombol diklik, tampilan di dalam *drawer/modal* bergeser secara *slide-left* ke formulir input singkat:
    1. **Nama Lengkap** (*Floating label input*).
    2. **Alamat Email Pengiriman File** (Dilengkapi validasi langsung: muncul tanda centang hijau jika format email valid, serta teks pengingat *"File produk akan dikirim otomatis ke email ini"*).
    3. **Ringkasan Tagihan:** Harga Produk + Biaya Layanan (jika ada) = **Total Bayar**.
  * **Tombol Eksekusi:** `"Bayar Instan via DOKU"` (Menampilkan logo kecil QRIS, BCA, Mandiri, OVO di bawah tombol untuk membangun kepercayaan/ *trust signal*).
  * Saat diklik, tombol berubah menjadi indikator *loading spinner* (`"Menyiapkan Gerbang Pembayaran..."`) sebelum mengarahkan pengguna ke antarmuka DOKU.

---

## 6. Desain Antarmuka Panel Admin (*Easy-to-Use Creator Studio*)

Panel Admin dirancang agar pemilik bisnis dapat mengelola produk secepat mengedit profil di aplikasi media sosial:

1. **Manajemen Produk & Link (Drag-and-Drop):**
   * Menggunakan *handle* ikon titik enam (`GripVertical`) di sisi kiri setiap baris produk/tautan untuk memudahkan pengurutan prioritas tampil hanya dengan menggeser (*drag and drop*).
   * *Toggle Switch* cepat di setiap baris untuk mengaktifkan/menonaktifkan produk (`is_active`) dalam satu klik tanpa perlu membuka formulir edit.
2. **Zona Unggah File Pintar (*Smart Dropzone*):**
   * Saat menambah produk baru, tersedia dua kotak *drag-and-drop* terpisah yang jelas: satu untuk **Thumbnail Gambar** (dilengkapi fitur *crop* rasio $1:1$ otomatis) dan satu untuk **File Aset Digital (ZIP/GLB)** dengan indikator *progress bar* persentase unggahan ke Supabase Storage.
3. **Kustomisasi Tampilan (*Appearance Tab* ala Lynk.id):**
   * Memungkinkan Admin mengganti gambar *Banner*, memilih *preset* warna tema, dan mengubah gaya tombol (*Fill*, *Outline*, *Soft Shadow*) yang langsung terlihat perubahannya pada **Live Mobile Mockup Preview** di sisi kanan layar.
4. **Tabel Monitor Transaksi (*Order Monitor*):**
   * Dilengkapi kartu ringkasan metrik di bagian atas (Total Pendapatan, Produk Terjual, Konversi Sukses).
   * Setiap baris transaksi memiliki tombol aksi cepat `"Kirim Ulang Email Unduhan"` (*Resend Signed URL*) sebagai fitur penyelamat apabila pembeli mengaku tidak sengaja menghapus email atau belum menerima tautan.

---

## 7. Rekomendasi Stack UI untuk Implementasi

Untuk mewujudkan spesifikasi desain di atas secara cepat di atas **Next.js (Vercel)** dan **Supabase**, berikut adalah kombinasi pustaka (*libraries*) terbaik:

* **Styling Utama:** `Tailwind CSS` (Konfigurasi warna kustom, gradien, dan *responsive breakpoints*).
* **Komponen Interaktif & Aksesibel:** `Shadcn UI` (Menggunakan komponen `Drawer` berbasis *Vaul* untuk tampilan *mobile bottom sheet*, `Dialog` untuk *desktop modal*, `Tabs` untuk filter kategori, dan `Switch` untuk panel admin).
* **Animasi & Transisi Dinamis:** `Framer Motion` (Untuk animasi *layout shift* saat pengguna memfilter kategori produk, serta transisi *slide* di dalam *checkout drawer*).
* **Drag-and-Drop Admin:** `@dnd-kit/core` (Untuk menyusun urutan tautan dan produk di Panel Admin dengan mulus di layar sentuh maupun *mouse*).
* **Ikonografi:** `Lucide React` (Ikon bersih, konsisten, dan ringan).