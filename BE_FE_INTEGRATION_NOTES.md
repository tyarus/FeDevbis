# BE to FE Integration Notes (BeDevbis API)

Dokumen ini merangkum kontrak backend Laravel untuk kebutuhan frontend.

## 1) Base URL per Environment

- Local:
  - `http://localhost:8000/api`
- Staging:
  - `https://<staging-domain>/api` (belum hardcoded di repo, set lewat env deploy)
- Production (Railway):
  - `https://<RAILWAY_PUBLIC_DOMAIN>/api`

Contoh env backend:

```env
APP_URL=https://${RAILWAY_PUBLIC_DOMAIN}
FRONTEND_URL=https://your-frontend-domain.com
```

## 2) Header Auth

Untuk endpoint protected, kirim:

```http
Authorization: Bearer <token>
Accept: application/json
Content-Type: application/json
```

## 3) Daftar Endpoint Lengkap

### Public

- `GET /api/health`
- `POST /api/auth/register` (rate limit)
- `POST /api/auth/login` (rate limit)
- `GET /api/products`
- `GET /api/products/{id}`

### Protected (butuh Bearer token)

- `POST /api/auth/logout`
- `GET /api/me`
- `POST /api/products` (seller)
- `PUT /api/products/{id}` (owner product)
- `DELETE /api/products/{id}` (owner product)
- `GET /api/seller/products` (seller list by auth user id)
- `POST /api/orders` (buyer)
- `GET /api/orders` (buyer own orders)
- `GET /api/orders/{id}` (buyer/seller pemilik order)
- `GET /api/seller/orders` (seller own orders)
- `PUT /api/seller/orders/{id}/ship` (seller pemilik order)
- `PUT /api/orders/{id}/confirm` (buyer pemilik order)
- `PUT /api/orders/{id}/cancel` (buyer pemilik order)
- `POST /api/orders/{id}/pay` (buyer pemilik order) - **UPDATED: Now reduces product stock and sends notification to seller**
- `GET /api/notifications` (get all notifications with pagination)
- `GET /api/notifications/unread-count` (get unread notification count)
- `PUT /api/notifications/{id}/mark-as-read` (mark single notification as read)
- `PUT /api/notifications/mark-all-as-read` (mark all notifications as read)
- `DELETE /api/notifications/{id}` (delete a notification)

## 4) Request Body + Success Response per Endpoint

## Auth

### `POST /api/auth/register`

Request:

```json
{
  "name": "John Buyer",
  "email": "john@example.com",
  "password": "password123",
  "password_confirmation": "password123",
  "role": "buyer"
}
```

Success `201`:

```json
{
  "success": true,
  "message": "Registrasi berhasil",
  "data": {
    "user": {
      "id": 1,
      "name": "John Buyer",
      "email": "john@example.com",
      "role": "buyer",
      "created_at": "2026-04-27T00:00:00.000000Z"
    },
    "token": "1|..."
  }
}
```

### `POST /api/auth/login`

Request:

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

Success `200`:

```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "user": {
      "id": 1,
      "name": "John Buyer",
      "email": "john@example.com",
      "role": "buyer",
      "created_at": "2026-04-27T00:00:00.000000Z"
    },
    "token": "1|..."
  }
}
```

### `POST /api/auth/logout`

Request body: none

Success `200`:

```json
{
  "success": true,
  "message": "Logout berhasil",
  "data": null
}
```

### `GET /api/me`

Request body: none

Success `200`:

```json
{
  "success": true,
  "message": "Data user berhasil diambil",
  "data": {
    "id": 1,
    "name": "John Buyer",
    "email": "john@example.com",
    "role": "buyer",
    "created_at": "2026-04-27T00:00:00.000000Z"
  }
}
```

## Products

### `GET /api/products`

Query params:
- `search` (optional)
- `min_price` (optional, efektif jika `max_price` juga ada)
- `max_price` (optional, efektif jika `min_price` juga ada)
- `page` (optional)

Success `200`:

```json
{
  "success": true,
  "message": "Daftar produk berhasil diambil",
  "data": [
    {
      "id": 1,
      "seller_id": 2,
      "name": "Laptop Pro 14",
      "description": "Laptop untuk kerja dan editing.",
      "price": 14500000,
      "stock": 12,
      "image_url": "https://...",
      "status": "active",
      "created_at": "2026-04-27T00:00:00.000000Z",
      "updated_at": "2026-04-27T00:00:00.000000Z"
    }
  ],
  "pagination": {
    "total": 4,
    "per_page": 12,
    "current_page": 1,
    "last_page": 1
  }
}
```

### `GET /api/products/{id}`

Success `200`:

```json
{
  "success": true,
  "message": "Detail produk berhasil diambil",
  "data": {
    "id": 1,
    "seller_id": 2,
    "name": "Laptop Pro 14",
    "description": "Laptop untuk kerja dan editing.",
    "price": 14500000,
    "stock": 12,
    "image_url": "https://...",
    "status": "active",
    "created_at": "2026-04-27T00:00:00.000000Z",
    "updated_at": "2026-04-27T00:00:00.000000Z"
  }
}
```

### `POST /api/products` (seller)

Request:

```json
{
  "name": "Laptop Gaming",
  "description": "High performance",
  "price": 15000000,
  "stock": 10,
  "image_url": "https://example.com/laptop.jpg",
  "status": "active"
}
```

Success `201`:

```json
{
  "success": true,
  "message": "Produk berhasil dibuat",
  "data": {
    "id": 10,
    "seller_id": 2,
    "name": "Laptop Gaming",
    "description": "High performance",
    "price": 15000000,
    "stock": 10,
    "image_url": "https://example.com/laptop.jpg",
    "status": "active",
    "created_at": "2026-04-27T00:00:00.000000Z",
    "updated_at": "2026-04-27T00:00:00.000000Z"
  }
}
```

### `PUT /api/products/{id}` (owner)

Request (semua field optional):

```json
{
  "name": "Laptop Gaming Pro",
  "price": 15500000,
  "stock": 8
}
```

Success `200`:

```json
{
  "success": true,
  "message": "Produk berhasil diperbarui",
  "data": {
    "id": 10,
    "seller_id": 2,
    "name": "Laptop Gaming Pro",
    "price": 15500000,
    "stock": 8,
    "status": "active"
  }
}
```

### `DELETE /api/products/{id}` (owner)

Success `200`:

```json
{
  "success": true,
  "message": "Produk berhasil dihapus",
  "data": null
}
```

### `GET /api/seller/products`

Query params:
- `search` (optional)
- `page` (optional)

Success `200`: format sama dengan `GET /api/products` + pagination.

## Orders

### `POST /api/orders` (buyer)

Request:

```json
{
  "product_id": 1,
  "quantity": 2
}
```

Success `201`:

```json
{
  "success": true,
  "message": "Order berhasil dibuat",
  "data": {
    "id": 1,
    "buyer_id": 1,
    "product_id": 1,
    "seller_id": 2,
    "quantity": 2,
    "total_price": 29000000,
    "status": "pending_payment",
    "tracking_number": null
  }
}
```

### `GET /api/orders` (buyer own)

Success `200`: `data` array order + `pagination`.

### `GET /api/orders/{id}` (buyer/seller pemilik order)

Success `200`: detail order termasuk relasi jika available (`buyer`, `seller`, `product`, `payments`).

### `GET /api/seller/orders` (seller own)

Success `200`: `data` array order + `pagination`.

### `PUT /api/seller/orders/{id}/ship` (seller pemilik order)

Request:

```json
{
  "tracking_number": "TRX-SHIP-0001"
}
```

Success `200`:

```json
{
  "success": true,
  "message": "Order berhasil dikirim",
  "data": {
    "id": 1,
    "status": "shipped",
    "tracking_number": "TRX-SHIP-0001"
  }
}
```

### `PUT /api/orders/{id}/confirm` (buyer pemilik order)

Request body: none

Success `200`:

```json
{
  "success": true,
  "message": "Order berhasil dikonfirmasi, dana di-release ke seller",
  "data": {
    "id": 1,
    "status": "completed"
  }
}
```

Catatan: endpoint ini hanya menerima order status `delivered`.

### `PUT /api/orders/{id}/cancel` (buyer pemilik order)

Request body: none

Success `200`:

```json
{
  "success": true,
  "message": "Order berhasil dibatalkan",
  "data": {
    "id": 1,
    "status": "cancelled"
  }
}
```

## Payments

### `POST /api/orders/{id}/pay` (buyer pemilik order)

Request:

```json
{
  "payment_method": "bank_transfer"
}
```

Nilai `payment_method` valid:
- `bank_transfer`
- `virtual_account`
- `ewallet`

Success `201`:

```json
{
  "success": true,
  "message": "Pembayaran berhasil diproses",
  "data": {
    "id": 1,
    "order_id": 1,
    "amount": 29000000,
    "method": "bank_transfer",
    "status": "success",
    "paid_at": "2026-04-27T00:00:00.000000Z",
    "created_at": "2026-04-27T00:00:00.000000Z"
  }
}
```

## 5) Format Error Penting

## `401 Unauthorized`

Login gagal:

```json
{
  "success": false,
  "message": "Email atau password salah",
  "errors": []
}
```

Token tidak valid/expired/revoked (middleware Sanctum):

```json
{
  "message": "Unauthenticated."
}
```

## `422 Validation Error` (default Laravel FormRequest)

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["Email sudah terdaftar"],
    "password": ["Password minimal 8 karakter"]
  }
}
```

## `429 Too Many Requests` (throttle login/register)

```json
{
  "message": "Too Many Attempts."
}
```

## `500 Internal Server Error` (catch di controller)

```json
{
  "success": false,
  "message": "Terjadi kesalahan",
  "errors": {
    "error": "detail internal error"
  }
}
```

## 6) Aturan Auth dan Token

- Auth menggunakan Laravel Sanctum personal access token.
- Login/Register menghasilkan token baru.
- Token dikirim sebagai `Bearer token`.
- Expiry token dikontrol env `SANCTUM_TOKEN_EXPIRY_DAYS` (default repo: `7` hari).
- Logout hanya revoke token aktif saat ini (`currentAccessToken()->delete()`).
- Token jadi tidak valid jika:
  - expired,
  - di-revoke via logout,
  - tidak dikirim/format salah.

## 7) Protected Endpoint + Role Matrix

- Seller only:
  - `POST /api/products` (dicek di `CreateProductRequest::authorize`)
  - `PUT /api/products/{id}` (harus owner product)
  - `DELETE /api/products/{id}` (harus owner product)
  - `GET /api/seller/products` (data berdasarkan `seller_id = auth_user.id`)
  - `GET /api/seller/orders` (data berdasarkan `seller_id = auth_user.id`)
  - `PUT /api/seller/orders/{id}/ship` (harus seller pemilik order)
- Buyer only:
  - `POST /api/orders` (dicek di `CreateOrderRequest::authorize`)
  - `GET /api/orders` (buyer own)
  - `PUT /api/orders/{id}/confirm` (buyer pemilik order)
  - `PUT /api/orders/{id}/cancel` (buyer pemilik order)
  - `POST /api/orders/{id}/pay` (buyer pemilik order)
- Buyer/Seller pemilik order:
  - `GET /api/orders/{id}`

## 8) Aturan Validasi Penting

### Register

- `name`: required, string, max 255
- `email`: required, email, unique
- `password`: required, string, min 8, confirmed
- `role`: required, `seller|buyer`

### Login

- `email`: required, email
- `password`: required, string

### Create Product

- `name`: required, string, max 255
- `description`: nullable, string
- `price`: required, numeric, min 0.01
- `stock`: required, integer, min 0
- `image_url`: nullable, url
- `status`: nullable, `active|inactive`

### Update Product

- semua field nullable, rule sama dengan create

### Create Order

- `product_id`: required, exists `products.id`
- `quantity`: required, integer, min 1

### Ship Order

- `tracking_number`: required, string

### Pay Order

- `payment_method`: required, `bank_transfer|virtual_account|ewallet`

## 9) Pagination / Filter / Sort

- Semua list endpoint pakai `paginate(12)`:
  - `GET /api/products`
  - `GET /api/seller/products`
  - `GET /api/orders`
  - `GET /api/seller/orders`
- Bentuk pagination:

```json
{
  "pagination": {
    "total": 100,
    "per_page": 12,
    "current_page": 1,
    "last_page": 9
  }
}
```

- Filter saat ini:
  - `GET /api/products`
    - `search` (name/description)
    - `min_price` + `max_price`
    - `page`
  - `GET /api/seller/products`
    - `search`
    - `page`
- Sorting:
  - Belum ada query sort eksplisit di endpoint (mengikuti default query DB).

## 10) CORS yang Diizinkan

Default `config/cors.php`:

- `http://localhost:3000`
- `http://localhost:8000`
- nilai env `FRONTEND_URL` (default local: `http://localhost:3000`)

Setting lain:
- `allowed_methods`: `*`
- `allowed_headers`: `*`
- `supports_credentials`: `true`

## 11) Rate Limit Endpoint Penting

- `POST /api/auth/register`: `throttle:5,1` (max 5 request/menit/IP)
- `POST /api/auth/login`: `throttle:5,1` (max 5 request/menit/IP)

Catatan:
- Env `API_RATE_LIMIT_LOGIN=5` ada, tapi saat ini route memakai nilai hardcoded `throttle:5,1`.

## 12) Akun Test Seeder (Dummy)

Dari `DatabaseSeeder`:

- Buyer:
  - email: `tyar@example.com`
  - password: `password123`
- Seller:
  - email: `tyars@example.com`
  - password: `password123`

Jalankan seed:

```bash
php artisan migrate:fresh --seed
```

## 13) Transaction Chat + Fraud Tracking (NEW)

Fitur frontend transaksi game sekarang membutuhkan endpoint tambahan agar chat, checklist, dan aktivitas audit tersimpan di database.

### Endpoint yang Dibutuhkan (Protected)

- `GET /api/orders/{id}/transaction-chat`
- `POST /api/orders/{id}/transaction-chat/messages`
- `PUT /api/orders/{id}/transaction-chat/checklist` (atau `PATCH`)
- `PUT /api/orders/{id}/transaction-chat/status` (atau `PATCH`)
- `POST /api/orders/{id}/transaction-chat/completion-code`
- `POST /api/orders/{id}/transaction-chat/verify-completion-code`

### Payload yang Digunakan Frontend

#### `POST /messages`

```json
{
  "message": "Akun sudah saya cek, datanya sesuai.",
  "message_type": "text"
}
```

`message_type` valid:
- `text`
- `system`
- `checklist_update`
- `status_update`
- `completion_code`

#### `PUT/PATCH /checklist`

```json
{
  "account_match": true,
  "account_secured": true,
  "seller_device_removed": false
}
```

Checklist final yang frontend tampilkan:
- `account_match`
- `account_secured`
- `seller_device_removed`
- `completion_code_verified` (di-set backend setelah verify code sukses)

#### `PUT/PATCH /status`

```json
{
  "status": "account_verification"
}
```

`status` valid:
- `chat_open`
- `account_verification`
- `account_secured`
- `device_cleanup`
- `awaiting_completion_code`
- `completed`
- `disputed`

#### `POST /completion-code`

Request body: none

Success `200/201`:

```json
{
  "success": true,
  "message": "Kode penyelesaian berhasil dibuat",
  "data": {
    "completion_code": "FIN-238714",
    "expires_at": "2026-05-19T10:00:00.000000Z"
  }
}
```

#### `POST /verify-completion-code`

```json
{
  "code": "FIN-238714"
}
```

Success `200`:

```json
{
  "success": true,
  "message": "Kode valid",
  "data": {
    "verified": true,
    "status": "completed",
    "verified_at": "2026-05-19T10:10:00.000000Z"
  }
}
```

### Response Minimum untuk `GET /transaction-chat`

```json
{
  "success": true,
  "message": "Data transaksi chat berhasil diambil",
  "data": {
    "order_id": 1,
    "status": "chat_open",
    "checklist": {
      "account_match": false,
      "account_secured": false,
      "seller_device_removed": false,
      "completion_code_verified": false
    },
    "completion_code": null,
    "completion_code_expires_at": null,
    "completion_code_verified_at": null,
    "messages": [],
    "activities": [],
    "updated_at": "2026-05-18T12:00:00.000000Z"
  }
}
```

### Saran Struktur Tabel Database

- `order_transaction_chats`
  - `id`, `order_id`, `status`, `completion_code_hash`, `completion_code_expires_at`, `completion_code_verified_at`, `created_at`, `updated_at`
- `order_transaction_checklists`
  - `id`, `order_id`, `account_match`, `account_secured`, `seller_device_removed`, `completion_code_verified`, `updated_by`, `updated_at`
- `order_transaction_messages`
  - `id`, `order_id`, `sender_id`, `sender_role`, `message`, `message_type`, `metadata(json)`, `created_at`
- `order_transaction_activities`
  - `id`, `order_id`, `actor_id`, `actor_role`, `action`, `description`, `metadata(json)`, `created_at`

### Catatan Keamanan dan Anti-Fraud

- Simpan semua activity log immutable (append-only) agar valid sebagai bukti.
- Hash completion code di DB (`completion_code_hash`), jangan simpan raw code.
- Tambahkan `ip_address` dan `user_agent` di activity log untuk investigasi admin.
- Batasi percobaan verify code (rate limit + lock sementara).
