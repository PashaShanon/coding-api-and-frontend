# 📋 Dokumentasi Keseluruhan Codebase: Fashion POS (Toko Pakaian)

---

## 🎯 Gambaran Umum

Project ini adalah **Sistem Point of Sale (POS) / Kasir untuk Toko Pakaian** yang dibangun dengan arsitektur **client-server**. Aplikasi ini memungkinkan manajemen produk pakaian, transaksi penjualan, kategori, dan pengelolaan pengguna dengan sistem role-based access control (admin & kasir).

---

## 🏗️ Arsitektur Project

```
login-dashboard/
├── backend/                         # Server-side (API)
│   ├── API-TokoPakaian/             # Express.js REST API
│   │   ├── config/
│   │   │   └── swagger/             # Konfigurasi Swagger API docs
│   │   ├── database/
│   │   │   └── pool.js              # PostgreSQL connection pool
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT authentication middleware
│   │   │   ├── admin.js             # Role-based authorization middleware
│   │   │   └── kasir.js             # Kasir role middleware
│   │   ├── routes/
│   │   │   ├── auth.js              # Login, logout, refresh, profile
│   │   │   ├── products.js          # CRUD produk
│   │   │   ├── categories.js        # CRUD kategori
│   │   │   ├── transactions.js      # Transaksi + laporan
│   │   │   └── users.js             # Manajemen user
│   │   ├── utils/
│   │   │   └── jwtUtils.js          # JWT helper functions
│   │   ├── .env                     # Environment variables
│   │   ├── server.js                # Entry point API
│   │   └── package.json
│   ├── schema.sql                   # Database schema (6 tabel)
│   └── sample_data.sql              # Data contoh
└── frontend/                        # Client-side (React + Vite)
    ├── src/
    │   ├── components/
    │   │   └── ProtectedRoute.jsx   # Route guard (cek token)
    │   ├── pages/
    │   │   ├── Login.jsx            # Halaman login
    │   │   ├── Login.css
    │   │   ├── Dashboard.jsx        # Layout utama + sidebar navigasi
    │   │   ├── Dashboard.css
    │   │   ├── POS.jsx              # Kasir / Point of Sale
    │   │   ├── POS.css
    │   │   ├── Products.jsx         # Manajemen produk (CRUD)
    │   │   ├── Products.css
    │   │   ├── Categories.jsx       # Manajemen kategori (CRUD)
    │   │   ├── Categories.css
    │   │   ├── Transactions.jsx     # Riwayat transaksi
    │   │   ├── Transactions.css
    │   │   ├── SalesReports.jsx     # Laporan penjualan
    │   │   └── Users.jsx            # Manajemen user (admin)
    │   ├── services/
    │   │   └── api.js               # Axios instance + API functions
    │   ├── App.jsx                  # Routing utama
    │   ├── main.jsx                 # Entry point React
    │   └── index.css                # Global styles
    ├── vite.config.js
    ├── index.html
    └── package.json
```

---

## 🔧 BACKEND (API-TokoPakaian)

### Tech Stack Backend

| Teknologi            | Kegunaan                      |
| -------------------- | ----------------------------- |
| **Express.js**       | Web framework                 |
| **PostgreSQL** (pg)  | Database                      |
| **JWT** (jsonwebtoken) | Autentikasi token           |
| **bcryptjs**         | Hash password                 |
| **Helmet**           | Keamanan HTTP headers         |
| **express-rate-limit** | Perlindungan rate limiting  |
| **Swagger**          | Dokumentasi API               |
| **CORS**             | Cross-origin resource sharing |
| **dotenv**           | Environment variables         |
| **nodemon**          | Dev auto-restart              |

---

### `server.js` — Entry Point API

File ini merupakan "jantung" backend. Tugas utama:

1. **Security middleware**: `helmet()` untuk HTTP security headers, `rateLimit` (maks 1000 request per 15 menit)
2. **CORS**: Mengizinkan request dari `localhost:3000`, `localhost:3001`, `localhost:5173`
3. **Body parser**: Menerima JSON hingga 10MB
4. **Request logging**: Log setiap request dengan timestamp
5. **Routing**: Mendaftarkan 5 route utama di prefix `/api/`:
   - `/api/auth` → autentikasi
   - `/api/categories` → kategori
   - `/api/products` → produk
   - `/api/transactions` → transaksi
   - `/api/users` → user
6. **Health check**: Endpoint `/health` untuk monitor status server & database
7. **Swagger docs**: Dokumentasi API otomatis di `/api-docs`
8. **Global error handler**: Menangkap semua error, tampilkan stack trace hanya di development
9. **404 handler**: Response JSON untuk route yang tidak ditemukan
10. **Graceful shutdown**: `SIGINT` → tutup koneksi database → exit
11. **Port**: `8000` (dari `.env`)

---

### Database (`database/pool.js`)

Menggunakan **PostgreSQL connection pool** dengan konfigurasi:

- **Maks 20 koneksi** simultan dalam pool
- **Idle timeout**: 30 detik — koneksi yang idle ditutup
- **Connection timeout**: 2 detik — batas waktu membuat koneksi baru
- **SSL**: Aktif hanya di production (untuk hosting)
- **Support `DATABASE_URL`**: Untuk hosting seperti Heroku
- **Event listeners**: Monitor koneksi baru dan error

Helper functions:
- `query(text, params)` — Query dengan logging durasi dan jumlah rows
- `transaction(callback)` — Wrapper `BEGIN → callback → COMMIT / ROLLBACK`

Backward compatibility export: `pool.query`, `pool.connect`, `pool.end` langsung di-export agar bisa dipanggil tanpa `.pool`.

---

### Skema Database (`schema.sql`) — 6 Tabel

#### Relasi Antar Tabel

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────┐
│    users     │     │   transactions    │     │  categories  │
│──────────────│     │───────────────────│     │──────────────│
│ id (PK)      │◄────│ user_id (FK)      │     │ id (PK)      │
│ name         │     │ transaction_code  │     │ name (UNIQUE)│
│ email (UNQ)  │     │ total_amount      │     │ description  │
│ password     │     │ payment_method    │     └──────┬───────┘
│ role         │     │ status            │            │
│ is_active    │     └───────┬───────────┘     ┌──────▼───────┐
└──────────────┘             │                 │   products   │
                             │                 │──────────────│
┌───────────────────┐        │                 │ id (PK)      │
│ transaction_items  │        │                 │ name         │
│───────────────────│        │                 │ description  │
│ transaction_id(FK)│◄───────┘                 │ price        │
│ product_id (FK)   │◄────────────────────────│ stock        │
│ quantity          │                          │ category_id  │
│ price             │                          │ image        │
│ subtotal          │                          └──────────────┘
└───────────────────┘

┌───────────────────┐
│  refresh_tokens   │
│───────────────────│
│ user_id (FK)      │ → references users(id) ON DELETE CASCADE
│ token (UNIQUE)    │
│ expires_at        │
└───────────────────┘
```

#### Detail Tabel

**1. `users`**
- `id` SERIAL PRIMARY KEY
- `name` VARCHAR(100) NOT NULL
- `email` VARCHAR(100) UNIQUE NOT NULL
- `password` VARCHAR(255) NOT NULL — bcrypt hashed
- `role` VARCHAR(20) CHECK (`admin` atau `kasir`), default `kasir`
- `is_active` BOOLEAN DEFAULT TRUE
- `created_at`, `updated_at` TIMESTAMP

**2. `refresh_tokens`**
- `user_id` FK → users(id) ON DELETE CASCADE
- `token` VARCHAR(500) UNIQUE NOT NULL
- `expires_at` TIMESTAMP NOT NULL

**3. `categories`**
- `name` VARCHAR(100) UNIQUE NOT NULL
- `description` TEXT

**4. `products`**
- `name` VARCHAR(200) NOT NULL
- `description` TEXT
- `price` DECIMAL(12,2) CHECK >= 0
- `stock` INTEGER DEFAULT 0 CHECK >= 0
- `category_id` FK → categories(id) ON DELETE RESTRICT
- `image` — kolom tambahan untuk URL/base64 gambar

**5. `transactions`**
- `transaction_code` VARCHAR(50) UNIQUE NOT NULL — format `TRX-<timestamp>`
- `user_id` FK → users(id) ON DELETE RESTRICT
- `total_amount` DECIMAL(12,2) CHECK >= 0
- `payment_method` CHECK (`cash`, `debit`, `credit`, `qris`)
- `status` CHECK (`pending`, `completed`, `cancelled`), default `completed`

**6. `transaction_items`**
- `transaction_id` FK → transactions(id) ON DELETE CASCADE
- `product_id` FK → products(id) ON DELETE RESTRICT
- `quantity` INTEGER CHECK > 0
- `price` DECIMAL(12,2) — harga saat transaksi (snapshot)
- `subtotal` DECIMAL(12,2) — quantity × price

#### Fitur Database Penting:
- **Trigger `update_updated_at_column()`**: Otomatis update kolom `updated_at` setiap kali record di-UPDATE
- **Views** (pre-built queries):
  - `v_products_with_category` — produk + nama kategori
  - `v_transactions_with_user` — transaksi + nama kasir
  - `v_transaction_items_detailed` — item transaksi + nama produk
- **Indexes**: Dioptimasi pada kolom-kolom yang sering di-query (email, role, name, category_id, dsb)

---

### JWT Utils (`utils/jwtUtils.js`)

Sistem autentikasi berbasis **token pair** (Access Token + Refresh Token):

| Fungsi                    | Kegunaan                                              |
| ------------------------- | ----------------------------------------------------- |
| `signAccessToken()`       | Generate access token (expire 15 menit)               |
| `signRefreshToken()`      | Generate refresh token (expire 7 hari)                |
| `verifyAccessToken()`     | Verifikasi access token (cek expiry, issuer, audience)|
| `verifyRefreshToken()`    | Verifikasi refresh token                              |
| `extractTokenFromHeader()`| Ekstrak token dari header `Authorization: Bearer <token>`|
| `generateTokenPair()`     | Generate pasangan access + refresh token sekaligus    |
| `decodeToken()`           | Decode token tanpa verifikasi (untuk debugging)       |

**Keamanan JWT:**
- Token ditandai dengan `issuer: 'toko-pakaian-api'` dan `audience: 'toko-pakaian-client'`
- Token dibedakan berdasarkan `type` field (`access` vs `refresh`)
- Password otomatis dihapus dari payload sebelum di-sign
- Error handling terpisah untuk `TokenExpiredError`, `JsonWebTokenError`, `NotBeforeError`

---

### Middleware

#### 1. `middleware/auth.js` — Autentikasi JWT

**`authenticateToken(req, res, next)`** — Wajib ada token yang valid:
1. Ekstrak token dari header `Authorization`
2. Verifikasi token (validitas, expiry, issuer)
3. Cek payload harus punya `id` dan `email`
4. Query user dari database berdasarkan `payload.id`
5. Cek apakah user masih aktif (`is_active = true`)
6. Attach user ke `req.user`
7. Error codes: `MISSING_TOKEN`, `INVALID_TOKEN`, `INVALID_PAYLOAD`, `USER_NOT_FOUND`, `ACCOUNT_DEACTIVATED`

**`optionalAuth(req, res, next)`** — Token opsional:
- Jika ada token yang valid → attach user ke `req.user`
- Jika tidak ada token atau token invalid → lanjut tanpa error

**`authenticateRefreshToken(req, res, next)`** — Verifikasi refresh token:
- Mengambil `refreshToken` dari `req.body`
- Verifikasi menggunakan `REFRESH_SECRET`
- Attach payload ke `req.refreshPayload`

#### 2. `middleware/admin.js` — Otorisasi (Role-Based Access Control)

**`authorizeRoles(...allowedRoles)`** — Factory function:
- Menerima daftar role yang diizinkan
- Return middleware yang cek `req.user.role` terhadap daftar role
- Log akses yang berhasil ke console

Pre-built middleware:
- `requireAdmin` → Hanya role `admin`
- `requireAdminOrKasir` → Role `admin` atau `kasir`
- `requireKasir` → Hanya role `kasir`

**`requireOwnerOrAdmin(userIdField)`** — Akses untuk admin atau pemilik resource:
- Admin selalu boleh akses
- Non-admin hanya boleh akses jika `req.params[userIdField]` === `req.user.id`

Helper functions:
- `hasRole(user, requiredRoles)` — Cek apakah user punya role tertentu
- `isAdmin(user)` — Shorthand cek admin
- `isKasir(user)` — Shorthand cek kasir

#### 3. `middleware/kasir.js` — Kasir Middleware (Standalone)
- Middleware sederhana: izinkan jika role `kasir` ATAU `admin`

---

### Routes (API Endpoints)

#### 📌 `routes/auth.js` — Autentikasi

| Method | Endpoint           | Akses  | Deskripsi                    |
| ------ | ------------------ | ------ | ---------------------------- |
| POST   | `/api/auth/login`  | Public | Login dengan email & password|
| POST   | `/api/auth/refresh`| Auth   | Refresh access token         |
| POST   | `/api/auth/logout` | Auth   | Logout user                  |
| GET    | `/api/auth/me`     | Auth   | Ambil profil user yang login |

**Login Flow:**
1. Validasi input (email format, password min 6 char)
2. Query user berdasarkan email (case-insensitive, trimmed)
3. Cek apakah user aktif (`is_active`)
4. Verifikasi password dengan `bcrypt.compare()`
5. Generate token pair (access + refresh) via `jwtUtils.generateTokenPair()`
6. Update `updated_at` (sebagai last login time)
7. Return: `{ user (tanpa password), accessToken, refreshToken, tokenType, expiresIn }`

**Refresh Flow:**
1. Middleware `authenticateRefreshToken` memverifikasi refresh token
2. Query user berdasarkan ID dari refresh token payload
3. Cek user masih ada dan aktif
4. Generate token pair baru
5. Return tokens baru

**Logout:** Log event ke console (di produksi: tambahkan token ke blacklist).

**Get Profile (`/me`):** Return data user dari `req.user` (tanpa password).

---

#### 📌 `routes/products.js` — Manajemen Produk

| Method | Endpoint             | Akses | Deskripsi                         |
| ------ | -------------------- | ----- | --------------------------------- |
| GET    | `/api/products`      | Auth  | List produk (paginasi + search)   |
| GET    | `/api/products/:id`  | Auth  | Detail satu produk                |
| POST   | `/api/products`      | Admin | Tambah produk baru                |
| PUT    | `/api/products/:id`  | Admin | Update produk                     |
| DELETE | `/api/products/:id`  | Admin | Hapus produk                      |

**GET `/api/products`** — List Produk:
- **Query params**: `page` (default 1), `limit` (default 10), `search`, `category_id`
- Search menggunakan `ILIKE` (case-insensitive)
- Join dengan `categories` untuk nama kategori
- Return: `{ products, pagination: { page, limit, total, totalPages } }`

**POST `/api/products`** — Buat Produk:
- Validasi: nama (min 2 char), deskripsi (wajib), harga (> 0), stok (>= 0), category_id (harus ada)
- Cek kategori ada di database
- Insert dengan field `image` (opsional)
- Handle error duplicate nama (constraint `products_name_key`)

**PUT `/api/products/:id`** — Update Produk:
- Validasi ID (harus angka)
- Validasi input sama seperti POST
- Cek kategori ada
- Update semua field termasuk `image` dan `updated_at`
- Return 404 jika produk tidak ditemukan

**DELETE `/api/products/:id`** — Hapus Produk:
- Cek produk ada
- **Proteksi**: Tidak bisa hapus jika ada di `transaction_items` (riwayat penjualan)
- Handle foreign key constraint error

---

#### 📌 `routes/categories.js` — Manajemen Kategori

| Method | Endpoint                | Akses | Deskripsi         |
| ------ | ----------------------- | ----- | ----------------- |
| GET    | `/api/categories`       | Auth  | List semua        |
| GET    | `/api/categories/:id`   | Auth  | Detail kategori   |
| POST   | `/api/categories`       | Admin | Tambah kategori   |
| PUT    | `/api/categories/:id`   | Admin | Update kategori   |
| DELETE | `/api/categories/:id`   | Admin | Hapus kategori    |

**Validasi**: Nama min 2 char, deskripsi maks 500 char.
**Proteksi hapus**: Tidak bisa hapus jika masih ada produk yang terkait (`products.category_id`).
**Handle duplicate**: Error constraint `categories_name_key`.

---

#### 📌 `routes/transactions.js` — Manajemen Transaksi

| Method | Endpoint                              | Akses       | Deskripsi                    |
| ------ | ------------------------------------- | ----------- | ---------------------------- |
| GET    | `/api/transactions/reports/summary`   | Admin/Kasir | Ringkasan laporan penjualan  |
| GET    | `/api/transactions`                   | Admin/Kasir | List semua transaksi         |
| GET    | `/api/transactions/:id`               | Admin/Kasir | Detail transaksi + items     |
| GET    | `/api/transactions/code/:code`        | Admin/Kasir | Cari transaksi by kode       |
| POST   | `/api/transactions`                   | Admin/Kasir | Buat transaksi baru          |
| PUT    | `/api/transactions/:id`               | Admin/Kasir | Update status transaksi      |

**POST `/api/transactions`** — Buat Transaksi Baru (PALING PENTING):

Menggunakan **database transaction** untuk atomicity:

```
BEGIN
  1. Generate kode unik: TRX-<timestamp>
  2. Loop setiap item di keranjang:
     a. Query harga & stok produk dari DB
     b. Validasi stok cukup
     c. Akumulasi total_amount
  3. INSERT ke tabel transactions
  4. Loop lagi setiap item:
     a. INSERT ke tabel transaction_items (snapshot harga)
     b. UPDATE products SET stock = stock - quantity
COMMIT (jika semua berhasil)
ROLLBACK (jika ada error → semua perubahan dibatalkan)
```

**Request body**: `{ items: [{ product_id, quantity }], payment_method }`
**Response**: `{ id, transaction_code, total_amount }`

**GET `/api/transactions/reports/summary`** — Laporan:
- Total penjualan hari ini (jumlah Rp & jumlah transaksi)
- Total penjualan bulan ini
- 5 transaksi terakhir (kode, amount, kasir, waktu)

---

#### 📌 `routes/users.js` — Manajemen User

| Method | Endpoint                     | Akses | Deskripsi                |
| ------ | ---------------------------- | ----- | ------------------------ |
| GET    | `/api/users`                 | Admin | List semua user          |
| GET    | `/api/users/profile`         | Auth  | Profil user sendiri      |
| POST   | `/api/users/register`        | Admin | Register user baru       |
| PUT    | `/api/users/deactivate-user` | Admin | Deaktivasi user          |

**Register User:**
- Validasi: nama (min 2 char), email (format valid), password (min 6 char), role (admin/kasir)
- Cek email belum terdaftar
- Hash password dengan bcrypt (12 salt rounds)
- Default role: `kasir`
- Return user data tanpa password

**Deactivate User:**
- Menerima `{ id }` dari body request
- **Proteksi**: Tidak bisa mendeaktivasi akun sendiri (`id != req.user.id`)
- Set `is_active = FALSE`

---

### Environment Variables (`.env`)

```env
# Server
PORT=8000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=toko_online

# JWT
JWT_ACCESS_SECRET=eyjafjalla
JWT_REFRESH_SECRET=eyjafjalla_the_hvít_aska
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Security
BCRYPT_SALT_ROUNDS=12

# File Upload
MAX_FILE_SIZE=10485760    # 10MB
UPLOAD_DIR=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000    # 15 menit
RATE_LIMIT_MAX=100
```

---

## 🎨 FRONTEND (React + Vite)

### Tech Stack Frontend

| Teknologi               | Kegunaan            |
| ----------------------- | ------------------- |
| **React 19**            | UI Library          |
| **Vite 7**              | Build tool & dev server |
| **React Router DOM 7**  | Client-side routing |
| **Axios**               | HTTP client         |
| **Lucide React**        | Icon library        |
| **Vanilla CSS**         | Styling             |

---

### `main.jsx` — Entry Point

```jsx
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

Membungkus `<App />` dengan:
- `<React.StrictMode>` — Menegakkan best practices React
- `<BrowserRouter>` — Menyediakan routing context

---

### `App.jsx` — Routing Utama

```
/              → Redirect ke /login
/login         → Halaman Login (public)
/:page         → Dashboard + sub-halaman (protected)
/dashboard     → Dashboard explicit (protected)
*              → Redirect ke /
```

**Key design**: Semua halaman selain `/login` dibungkus oleh `<ProtectedRoute>` → jika tidak ada token, redirect ke login. Route `/:page` digunakan sebagai dynamic param sehingga Dashboard bisa menentukan halaman aktif (`dashboard`, `pos`, `products`, dsb) tanpa unmounting komponen.

---

### `components/ProtectedRoute.jsx` — Route Guard

Komponen sederhana:
- Cek `localStorage.getItem('token')`
- Ada token → render `{children}`
- Tidak ada → `<Navigate to="/login" replace />`

---

### `services/api.js` — Centralized API Client

File ini adalah **satu-satunya tempat** komunikasi dengan backend:

#### Axios Instance
```js
const API_BASE_URL = 'http://localhost:8000/api';
const api = axios.create({ baseURL: API_BASE_URL, headers: { 'Content-Type': 'application/json' } });
```

#### Request Interceptor
Otomatis tambahkan header `Authorization: Bearer <token>` ke SETIAP request jika token ada di localStorage.

#### Response Interceptor — Auto Token Refresh
```
Response error 401?
  └── Sudah retry sebelumnya? → reject
  └── Ada refreshToken di localStorage?
      ├── Ya → POST /auth/refresh → dapat token baru
      │   ├── Simpan token baru ke localStorage
      │   └── Retry request asli dengan token baru
      └── Tidak → reject
  └── Refresh gagal?
      ├── Hapus semua localStorage
      └── Redirect ke /login
```

#### API Objects

```js
authAPI = {
  login(credentials),     // POST /auth/login
  logout(),               // POST /auth/logout
  getProfile(),           // GET  /auth/me
  refreshToken()          // POST /auth/refresh
}

productsAPI = {
  getAll(params),         // GET    /products?page=&limit=&search=&category_id=
  getById(id),            // GET    /products/:id
  create(data),           // POST   /products
  update(id, data),       // PUT    /products/:id
  delete(id)              // DELETE /products/:id
}

categoriesAPI = {
  getAll(),               // GET    /categories
  getById(id),            // GET    /categories/:id
  create(data),           // POST   /categories
  update(id, data),       // PUT    /categories/:id
  delete(id)              // DELETE /categories/:id
}

transactionsAPI = {
  getAll(params),         // GET  /transactions
  getById(id),            // GET  /transactions/:id
  create(data),           // POST /transactions
  getStats(),             // GET  /transactions/stats
  getReportsSummary()     // GET  /transactions/reports/summary
}

usersAPI = {
  getAll(),               // GET    /users
  getById(id),            // GET    /users/:id
  create(data),           // POST   /users/register
  update(id, data),       // PUT    /users/:id
  delete(id),             // DELETE /users/:id
  toggleStatus(id)        // PUT    /users/deactivate-user
}
```

---

### Halaman-Halaman Frontend

#### 1. 🔐 `Login.jsx` — Halaman Login

**State:**
- `email`, `password` — input fields
- `showPassword` — toggle visibility
- `rememberMe` — checkbox
- `error` — error message
- `isLoading` — loading state

**Flow Login:**
1. User isi form email & password
2. Submit → `POST http://localhost:8000/api/auth/login`
3. Berhasil → simpan `token`, `refreshToken`, `user` di localStorage
4. Alert "Login berhasil!" → Navigate ke `/dashboard`
5. Gagal → tampilkan error message

**UI Components:**
- Logo ShoppingBag icon
- Form dengan input email & password
- Toggle show/hide password (Eye/EyeOff icon)
- Checkbox "Ingat saya"
- Link "Lupa password?" (placeholder)
- Button submit dengan loading state
- Footer "Belum punya akun?"

---

#### 2. 📊 `Dashboard.jsx` — Layout Utama (Master Container)

**Ini adalah halaman paling penting** — berfungsi sebagai layout container yang mengelola semua sub-halaman.

**State:**
- `user` — data user yang login
- `stats` — statistik dashboard (produk, penjualan, transaksi)
- `activeMenu` — menu yang sedang aktif (default: `dashboard`)
- `sidebarOpen` — toggle sidebar (responsive)
- `dataVersion` — counter untuk sinkronisasi data antar komponen

**Mekanisme Navigasi — Conditional Rendering:**

Dashboard TIDAK menggunakan routing React Router untuk sub-halaman. Sebaliknya, menggunakan **CSS display `none`/`block`** untuk show/hide sub-komponen:

```jsx
<div style={{ display: activeMenu === 'pos' ? 'block' : 'none' }}>
  <POS dataVersion={dataVersion} />
</div>
<div style={{ display: activeMenu === 'products' ? 'block' : 'none' }}>
  <Products onDataChange={() => setDataVersion(v => v + 1)} />
</div>
// ... dst
```

**Kenapa?** Setiap komponen tetap **mounted** — tidak di-unmount saat switch halaman. Ini mencegah:
- Re-fetching data berulang kali
- Kehilangan state (form yang sedang diisi, scroll position, dsb)
- API overload

**Sidebar Menu Items:**

| ID           | Label       | Icon           | Akses       |
| ------------ | ----------- | -------------- | ----------- |
| `dashboard`  | Dashboard   | LayoutDashboard| Semua       |
| `pos`        | Kasir       | ShoppingCart   | Semua       |
| `products`   | Produk      | Shirt          | Semua       |
| `categories` | Kategori    | Tag            | Semua       |
| `transactions`| Transaksi  | FileText       | Semua       |
| `reports`    | Laporan     | TrendingUp     | Admin only  |
| `users`      | Users       | Users          | Admin only  |

**Dashboard Overview (activeMenu === 'dashboard'):**
- Greeting: "Selamat datang, [Nama]!"
- 4 stat cards: total produk, penjualan hari ini, penjualan bulan ini, total transaksi
- Quick actions
- User avatar (inisial nama)

**Data Sync:** Ketika `Products` mengubah data (tambah/edit/hapus), `onDataChange` di-trigger → `dataVersion` increment → `POS` component mendeteksi perubahan `dataVersion` via `useEffect` → re-fetch produk terbaru.

**Fungsi Helper:**
- `getMenuFromPath()` — Extract active menu dari URL path
- `getFirstName(fullName)` — Ambil nama pertama
- `getInitials(name)` — Ambil inisial untuk avatar

---

#### 3. 🛒 `POS.jsx` — Point of Sale / Kasir

**Prop:** `dataVersion` — trigger re-fetch produk saat data berubah di Products.

**State:**
- `products`, `categories` — data dari API
- `cart` — array `[{ ...product, quantity }]`
- `searchTerm`, `selectedCategory` — filter
- `paymentMethod` — metode bayar terpilih (`cash`/`debit`/`qris`)
- `loading`, `processing` — loading states

**Layout 2 Panel:**

**Panel Kiri — Product Grid:**
- Search bar untuk cari produk
- Filter buttons kategori (semua + setiap kategori)
- Grid card produk menampilkan: nama, harga, stok
- Tombol "Tambah" di setiap card
- Menggunakan `useMemo` untuk filtering yang efisien

**Panel Kanan — Cart / Keranjang:**
- Daftar item di keranjang
- Tombol +/- untuk ubah quantity
- Tombol hapus per item
- Tombol "Kosongkan" untuk clear cart
- Total harga
- Pilihan metode pembayaran
- Tombol "Proses Pembayaran"

**Cart Operations:**
- `addToCart(product)` — Jika produk sudah ada di cart, tambah quantity. Cek stok tersedia.
- `updateQuantity(productId, change)` — Tambah/kurangi quantity. Hapus jika 0. Cek stok.
- `removeFromCart(productId)` — Hapus item dari cart.
- `clearCart()` — Kosongkan seluruh cart.

**Checkout Flow:**
1. Validasi cart tidak kosong
2. Build payload: `{ items: [{ product_id, quantity }], payment_method }`
3. `POST /api/transactions`
4. Berhasil → alert sukses + clear cart + re-fetch produk (update stok)
5. Gagal → alert error

---

#### 4. 👕 `Products.jsx` — Manajemen Produk (CRUD)

**Prop:** `onDataChange()` — callback saat data berubah (untuk sinkronisasi POS).

**State:**
- `products` — list produk
- `categories` — list kategori (untuk dropdown)
- `searchTerm` — filter pencarian
- `showModal` — toggle form modal
- `editingProduct` — produk yang sedang diedit (null = mode tambah)
- `formData` — `{ name, description, price, stock, category_id, image }`
- `loading` — loading state

**Fitur:**
- **Search**: Filter produk berdasarkan nama
- **Add**: Buka modal → isi form → POST `/api/products` → refresh list
- **Edit**: Klik edit → pre-fill form → PUT `/api/products/:id` → refresh list
- **Delete**: Konfirmasi → DELETE `/api/products/:id` → refresh list
- **Image Upload**: File reader membaca gambar sebagai base64 → simpan di field `image`
- **Data Change Notification**: Setiap CRUD berhasil → panggil `onDataChange()` → POS ter-update

---

#### 5. 🏷️ `Categories.jsx` — Manajemen Kategori (CRUD)

**State:** `categories`, `showModal`, `editingCategory`, `formData: { name, description }`, `loading`

**UI:** Grid layout dengan card per kategori (ikon Tag, nama, deskripsi, tombol edit & hapus).
**Modal form:** Input nama + textarea deskripsi.
**CRUD:** Sama seperti Products — create, update, delete dengan konfirmasi.

---

#### 6. 📋 `Transactions.jsx` — Riwayat Transaksi

**State:** `transactions`, `selectedTransaction`, `showDetail`, `loading`

**UI:**
- Tabel full-width: Kode transaksi, tanggal, total (format Rupiah), metode pembayaran (badge), nama kasir, tombol detail
- Modal detail: info transaksi + tabel items (produk, qty, harga, subtotal) + total bayar

**Flow:** Fetch semua transaksi saat mount → tampilkan di tabel → klik Eye icon → tampilkan modal detail.

---

#### 7. 📈 `SalesReports.jsx` — Laporan Penjualan

**State:** `stats: { today: { total, count }, month: { total, count }, recent: [] }`, `loading`

**UI:**
- 2 stat cards: Penjualan hari ini & bulan ini (total Rp + jumlah transaksi)
- Tabel 5 transaksi terakhir (kode, kasir, total, waktu)
- Styling inline
- Data dari `GET /api/transactions/reports/summary`

---

#### 8. 👥 `Users.jsx` — Manajemen User (Admin Only)

**State:** `users`, `showModal`, `formData: { name, email, password, role }`, `loading`

**Fitur:**
- **List users**: Tabel nama, email, role (badge), status (aktif/non-aktif)
- **Add user**: Modal form → POST `/api/users/register`
- **Deactivate**: Confirm → PUT `/api/users/deactivate-user { id }`
- Role pilihan: Admin atau Kasir (dropdown)

---

## 🔒 Sistem Keamanan

| Layer             | Mekanisme                                        |
| ----------------- | ------------------------------------------------ |
| **Autentikasi**   | JWT (Access Token 15m + Refresh Token 7d)        |
| **Otorisasi**     | Role-based (admin, kasir)                        |
| **Password**      | bcryptjs hash (12 salt rounds)                   |
| **HTTP Security** | Helmet.js (XSS, clickjacking, MIME sniffing, dll)|
| **Rate Limiting** | 1000 req / 15 menit per IP                       |
| **CORS**          | Whitelist origin                                 |
| **Input Validasi**| Validasi di setiap route backend                 |
| **Token Refresh** | Auto-refresh via Axios response interceptor      |
| **DB Constraints**| CHECK, UNIQUE, FOREIGN KEY, ON DELETE RESTRICT   |
| **Graceful Shutdown** | Tutup pool koneksi saat server stop           |

---

## 🔄 Alur Data (Data Flow)

### Login Flow
```
[User] → Isi form login
       → POST /api/auth/login { email, password }
       → [Backend] validasi → cek user → bcrypt.compare → generate token pair
       → [Response] { user, accessToken, refreshToken }
       → [Frontend] simpan ke localStorage
       → Navigate ke /dashboard
```

### Request Flow (Setiap API Call)
```
[Frontend] → api.get/post/put/delete(...)
           → [Axios Request Interceptor] tambahkan Bearer token
           → [Backend] Helmet → Rate Limit → CORS → Body Parser
           → [authenticateToken middleware] verifikasi JWT → query user DB
           → [authorization middleware] cek role
           → [Route handler] proses request → query database
           → [Response] → json data
           → [Axios Response Interceptor] jika 401 → auto refresh token
```

### POS Checkout Flow
```
[Kasir] → Pilih produk → Tambah ke cart → Atur quantity → Pilih payment method
        → Klik "Proses Pembayaran"
        → POST /api/transactions { items, payment_method }
        → [Backend] BEGIN transaction:
            ├── Validate semua stok produk
            ├── Calculate total_amount
            ├── INSERT transactions
            ├── INSERT transaction_items (snapshot harga)
            ├── UPDATE products SET stock = stock - quantity
            └── COMMIT (atau ROLLBACK jika error)
        → [Response] { id, transaction_code, total_amount }
        → [Frontend] alert sukses → clear cart → re-fetch produk (update stok)
```

### Data Sync Flow (Products ↔ POS)
```
[Products page] → Admin tambah/edit/hapus produk
                → onDataChange() callback
                → [Dashboard] setDataVersion(v => v + 1)
                → [POS] useEffect deteksi dataVersion berubah
                → Re-fetch products dari API
                → POS menampilkan data terbaru (stok, harga, produk baru)
```

---

## 📝 Demo Accounts

| Role  | Email             | Password   |
| ----- | ----------------- | ---------- |
| Admin | admin@demo.com    | admin123   |
| Kasir | kasir@demo.com    | kasir123   |

---

## ⚙️ Cara Menjalankan

### Prasyarat
- Node.js >= 16
- PostgreSQL terinstall dan running
- Database `toko_online` sudah dibuat dan schema sudah dijalankan

### Backend (Port 8000)
```bash
cd login-dashboard/backend/API-TokoPakaian
npm install
npm run dev      # Development (nodemon)
# atau
npm start        # Production
```

### Frontend (Port 5173)
```bash
cd login-dashboard/frontend
npm install
npm run dev      # Development (Vite)
```

### Run Keduanya Sekaligus
```bash
cd login-dashboard/frontend
npm run dev:all   # Menjalankan frontend + backend bersamaan (concurrently)
```

### API Documentation
Buka browser: `http://localhost:8000/api-docs` (Swagger UI)

### Health Check
`GET http://localhost:8000/health` — Cek status server & koneksi database

---

## 📊 Ringkasan Angka

| Metrik                     | Jumlah        |
| -------------------------- | ------------- |
| Total tabel database       | 6             |
| Total API endpoints        | ~20           |
| Total halaman frontend     | 8             |
| Total middleware            | 3 file        |
| Backend dependencies       | 9 packages    |
| Frontend dependencies      | 4 packages    |
| Lines of code (estimasi)   | ~3500+        |
