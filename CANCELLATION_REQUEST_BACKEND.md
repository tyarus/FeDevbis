# Backend Implementation: Sistem Pembatalan Pesanan (Cancellation Request)

**For Backend Team** | Deployed Frontend: https://project-five-delta-14.vercel.app

---

## 📋 Overview

Backend perlu implement sistem pembatalan pesanan dengan approval workflow. User (buyer) bisa submit permintaan pembatalan dengan alasan, seller bisa approve/reject, dan jika disetujui, pesanan dibatalkan dengan dana refund ke wallet buyer.

**Frontend sudah siap**, tinggal backend implement 5 API endpoints + database.

---

## 🗄️ Database Schema

### Table: `cancellation_requests`

```sql
CREATE TABLE cancellation_requests (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL UNIQUE,
    buyer_id BIGINT UNSIGNED NOT NULL,
    seller_id BIGINT UNSIGNED NOT NULL,
    reason VARCHAR(50) NOT NULL,
    details LONGTEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' NOT NULL,
    seller_notes LONGTEXT,
    rejection_reason LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_order_id (order_id),
    INDEX idx_seller_status (seller_id, status),
    INDEX idx_buyer_status (buyer_id, status),
    INDEX idx_created_at (created_at DESC)
);
```

### Enum Values untuk `reason`
- `urgent_payment_delay` - Urgensi Pembayaran Tertangguh
- `product_mismatch` - Produk Tidak Sesuai
- `ordering_mistake` - Kesalahan Pemesanan
- `other` - Alasan Lain

---

## 📡 API Endpoints

### 1️⃣ POST `/api/orders/{id}/cancellation-request`

**Auth:** Bearer token (buyer)

**Request Body:**
```json
{
  "reason": "urgent_payment_delay",
  "details": "Saya tidak bisa melanjutkan karena pendapatan tertangguh (opsional)"
}
```

**Validations:**
- ✅ Order harus exist
- ✅ Order harus milik buyer (buyer_id == auth user)
- ✅ Order status harus dalam: `pending_payment`, `paid`, atau `processing`
- ✅ Tidak boleh ada cancellation request sebelumnya untuk order ini (unique order_id)
- ✅ `reason` wajib dipilih dari enum
- ✅ `details` max 500 karakter (jika dikirim)

**Response 201 (Success):**
```json
{
  "success": true,
  "message": "Permohonan pembatalan berhasil dikirim",
  "data": {
    "id": 1,
    "order_id": 123,
    "buyer_id": 10,
    "seller_id": 20,
    "reason": "urgent_payment_delay",
    "details": "Saya tidak bisa melanjutkan karena...",
    "status": "pending",
    "created_at": "2026-05-25T10:00:00Z",
    "updated_at": "2026-05-25T10:00:00Z"
  }
}
```

**Response 400 (Bad Request):**
```json
{
  "success": false,
  "message": "Order tidak bisa dibatalkan karena sudah dikirim"
}
```

**Response 409 (Conflict):**
```json
{
  "success": false,
  "message": "Sudah ada permohonan pembatalan untuk pesanan ini"
}
```

**Response 404 (Not Found):**
```json
{
  "success": false,
  "message": "Pesanan tidak ditemukan"
}
```

**Side Effects:**
- Create notification untuk seller: "Pembeli meminta pembatalan pesanan #{order_id}"
- Create activity log (optional)

---

### 2️⃣ GET `/api/orders/{id}/cancellation-request`

**Auth:** Bearer token (buyer atau seller)

**Query Params:** None

**Response 200 (Ada request):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "order_id": 123,
    "buyer_id": 10,
    "seller_id": 20,
    "reason": "urgent_payment_delay",
    "details": "...",
    "status": "pending",
    "seller_notes": null,
    "rejection_reason": null,
    "created_at": "2026-05-25T10:00:00Z",
    "updated_at": "2026-05-25T10:00:00Z"
  }
}
```

**Response 200 (Tidak ada request):**
```json
{
  "success": true,
  "data": null
}
```

**Response 404 (Order not found):**
```json
{
  "success": false,
  "message": "Pesanan tidak ditemukan"
}
```

**Authorization:**
- Buyer hanya bisa lihat untuk order miliknya
- Seller hanya bisa lihat untuk order miliknya
- Return 403 jika tidak authorized

---

### 3️⃣ GET `/api/seller/cancellation-requests`

**Auth:** Bearer token (seller)

**Query Params:**
- `page` (integer, default: 1) - Halaman pagination
- `status` (string, optional) - Filter: `pending`, `approved`, `rejected` (kosong = all)
- `limit` (integer, default: 50) - Items per page

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "order_id": 123,
      "buyer_id": 10,
      "seller_id": 20,
      "reason": "urgent_payment_delay",
      "details": "Saya tidak bisa melanjutkan karena...",
      "status": "pending",
      "seller_notes": null,
      "rejection_reason": null,
      "created_at": "2026-05-25T10:00:00Z",
      "updated_at": "2026-05-25T10:00:00Z"
    },
    {
      "id": 2,
      "order_id": 124,
      "buyer_id": 11,
      "seller_id": 20,
      "reason": "product_mismatch",
      "details": null,
      "status": "approved",
      "seller_notes": "Baik, pesanan dibatalkan",
      "rejection_reason": null,
      "created_at": "2026-05-25T09:00:00Z",
      "updated_at": "2026-05-25T09:30:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total": 25,
    "per_page": 50,
    "last_page": 1
  }
}
```

**Note:**
- Hanya tampilkan untuk seller_id == auth user
- Filter by seller_id AND status (jika ada)
- Order by created_at DESC
- Paginate dengan limit

---

### 4️⃣ PUT `/api/orders/{id}/cancellation-request/approve`

**Auth:** Bearer token (seller)

**Request Body:**
```json
{
  "seller_notes": "Baik, pesanan dibatalkan sesuai permintaan (opsional)"
}
```

**Validations:**
- ✅ Order harus exist
- ✅ Cancellation request harus exist untuk order ini
- ✅ Cancellation request status harus "pending"
- ✅ Order harus milik seller (seller_id == auth user)
- ✅ Order status harus dalam: `pending_payment`, `paid`, atau `processing`
- ✅ `seller_notes` max 500 karakter (jika dikirim)

**Response 200 (Success):**
```json
{
  "success": true,
  "message": "Permintaan pembatalan disetujui",
  "data": {
    "id": 123,
    "order_id": 123,
    "status": "approved",
    "refunded_amount": 500000,
    "refunded_to_wallet": true
  }
}
```

**Response 400 (Bad Request):**
```json
{
  "success": false,
  "message": "Permohonan pembatalan sudah diproses sebelumnya"
}
```

**Response 404 (Not Found):**
```json
{
  "success": false,
  "message": "Permintaan pembatalan tidak ditemukan"
}
```

**Side Effects (PENTING):**

1. **Update cancellation_requests:**
   - Set `status = 'approved'`
   - Set `seller_notes` dari request (jika ada)
   - Set `updated_at = NOW()`

2. **Update orders:**
   - Set `status = 'cancelled'`
   - Set `updated_at = NOW()`

3. **Release Escrow (Wallet System):**
   - Find escrow entry untuk order ini dengan status `held`
   - Update escrow status = `released`
   - Create wallet ledger entry:
     ```
     type: 'order_refund'
     direction: 'credit'
     amount: order.total_price
     user_id: order.buyer_id
     order_id: order.id
     description: "Refund pembatalan pesanan #{order_id}"
     ```
   - Update buyer wallet: `available_balance += order.total_price`

4. **Notifications:**
   - Create notification untuk buyer:
     ```
     type: 'order_cancelled'
     title: "Pesanan dibatalkan"
     message: "Pesanan #{order_id} dibatalkan dan dana Rp{amount} dikembalikan ke wallet"
     order_id: order.id
     read: false
     ```

5. **Activity Log (Optional):**
   - Log action: "Cancellation approved by seller"

---

### 5️⃣ PUT `/api/orders/{id}/cancellation-request/reject`

**Auth:** Bearer token (seller)

**Request Body:**
```json
{
  "reason": "Kami tidak bisa membatalkan karena produk sudah dikirim (required)"
}
```

**Validations:**
- ✅ Order harus exist
- ✅ Cancellation request harus exist untuk order ini
- ✅ Cancellation request status harus "pending"
- ✅ Order harus milik seller (seller_id == auth user)
- ✅ `reason` wajib diisi dan max 500 karakter
- ✅ `reason` tidak boleh kosong/whitespace

**Response 200 (Success):**
```json
{
  "success": true,
  "message": "Permintaan pembatalan ditolak",
  "data": {
    "id": 123,
    "order_id": 123,
    "status": "rejected",
    "rejection_reason": "Produk sudah dikirim"
  }
}
```

**Response 400 (Bad Request):**
```json
{
  "success": false,
  "message": "Permohonan pembatalan sudah diproses sebelumnya"
}
```

**Response 404 (Not Found):**
```json
{
  "success": false,
  "message": "Permintaan pembatalan tidak ditemukan"
}
```

**Side Effects:**

1. **Update cancellation_requests:**
   - Set `status = 'rejected'`
   - Set `rejection_reason` dari request
   - Set `updated_at = NOW()`

2. **Jangan ubah order status** (tetap normal)

3. **Notifications:**
   - Create notification untuk buyer:
     ```
     type: 'cancellation_rejected'
     title: "Permintaan pembatalan ditolak"
     message: "Permintaan pembatalan pesanan #{order_id} ditolak. Alasan: {reason}"
     order_id: order.id
     read: false
     ```

4. **Activity Log (Optional):**
   - Log action: "Cancellation rejected by seller: {reason}"

---

## 🔐 Authorization Rules

| Endpoint | Auth | Owner Check | Notes |
|----------|------|------------|-------|
| POST /cancellation-request | Buyer | buyer_id | Must own the order |
| GET /cancellation-request | Buyer/Seller | buyer_id OR seller_id | Can only view own |
| GET /seller/cancellation-requests | Seller | seller_id | Only seller's orders |
| PUT /approve | Seller | seller_id | Must own the order |
| PUT /reject | Seller | seller_id | Must own the order |

**Implementation:**
```php
// Contoh Laravel Gate/Policy
if ($order->seller_id !== auth()->id()) {
    abort(403, 'Unauthorized');
}
```

---

## ⚙️ Implementation Checklist

### Phase 1: Database & Basic CRUD
- [ ] Create migration untuk `cancellation_requests` table
- [ ] Create model `CancellationRequest`
- [ ] Create controller `CancellationRequestController`

### Phase 2: Endpoints 1-2 (Buyer)
- [ ] Implement POST `/api/orders/{id}/cancellation-request`
- [ ] Implement GET `/api/orders/{id}/cancellation-request`
- [ ] Add auth middleware & owner validation

### Phase 3: Endpoints 3-5 (Seller)
- [ ] Implement GET `/api/seller/cancellation-requests`
- [ ] Implement PUT `/api/orders/{id}/cancellation-request/approve`
- [ ] Implement PUT `/api/orders/{id}/cancellation-request/reject`

### Phase 4: Integration
- [ ] Integrate with wallet system (escrow release)
- [ ] Add notifications (buyer & seller)
- [ ] Activity logging

### Phase 5: Testing
- [ ] Test happy path (submit → approve)
- [ ] Test reject path
- [ ] Test validation errors
- [ ] Test authorization (403 Forbidden)
- [ ] Test wallet refund
- [ ] Test notifications

---

## 🧪 Testing Scenarios

### Scenario 1: Happy Path (Approve)
```
1. Buyer submit cancellation request
   POST /api/orders/123/cancellation-request
   { reason: "urgent_payment_delay", details: "..." }
   
2. Verify CR created with status "pending"
   GET /api/orders/123/cancellation-request
   → status: "pending"
   
3. Seller list cancellation requests
   GET /api/seller/cancellation-requests?status=pending
   → shows the request
   
4. Seller approve
   PUT /api/orders/123/cancellation-request/approve
   { seller_notes: "..." }
   
5. Verify order cancelled & wallet refunded
   GET /api/orders/123
   → status: "cancelled"
   GET /api/wallet/me
   → available_balance increased
```

### Scenario 2: Reject Path
```
1. Buyer submit cancellation
   POST /api/orders/123/cancellation-request
   
2. Seller reject
   PUT /api/orders/123/cancellation-request/reject
   { reason: "Sudah dikirim" }
   
3. Verify order still normal & rejection recorded
   GET /api/orders/123/cancellation-request
   → status: "rejected", rejection_reason: "Sudah dikirim"
   GET /api/orders/123
   → status: still "paid" (unchanged)
```

### Scenario 3: Validation Errors
```
- Submit CR 2x for same order → 409 Conflict
- Submit CR for already cancelled order → 400 Bad Request
- Non-owner buyer submit → 403 Forbidden
- Non-owner seller approve → 403 Forbidden
- Approve non-pending CR → 400 Bad Request
- Reject empty reason → 400 Bad Request
```

---

## 📝 Response Format Standard

**All endpoints** harus follow format ini:

**Success Response:**
```json
{
  "success": true,
  "message": "Deskripsi aksi berhasil",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Deskripsi error"
}
```

**Validation Error Response (422):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "reason": ["Alasan pembatalan harus dipilih"],
    "details": ["Penjelasan maksimal 500 karakter"]
  }
}
```

---

## 🚀 Deployment Checklist

- [ ] All endpoints tested locally
- [ ] Auth middleware applied
- [ ] DB migration runs successfully
- [ ] Wallet integration tested
- [ ] Notifications sent correctly
- [ ] Error handling complete
- [ ] Rate limiting applied (if needed)
- [ ] Deployed to staging
- [ ] Testing approval from frontend (https://project-five-delta-14.vercel.app)
- [ ] Deployed to production

---

## 📞 Frontend Integration Points

Frontend sudah ready di https://project-five-delta-14.vercel.app

**Frontend akan call:**
1. `POST /api/orders/{id}/cancellation-request` - Saat user submit form
2. `GET /api/orders/{id}/cancellation-request` - Untuk polling status (every 5s)
3. `GET /api/seller/cancellation-requests` - Seller buka halaman
4. `PUT /api/orders/{id}/cancellation-request/approve` - Seller klik Setujui
5. `PUT /api/orders/{id}/cancellation-request/reject` - Seller klik Tolak

**Frontend expects:**
- Response status codes: 200, 201, 400, 403, 404, 409, 422
- Data format sesuai spec di atas
- Timestamps dalam format ISO 8601 (2026-05-25T10:00:00Z)

---

## 🔗 Related Docs

- [Wallet System](BE_FE_INTEGRATION_NOTES.md#14-wallet-system--escrow-new) - Escrow release logic
- [Order Status](lib/orderStatus.ts) - Order status mapping
- [Frontend Spec](CANCELLATION_REQUEST_SYSTEM.md) - Frontend implementation

---

**Questions?** Refer to CANCELLATION_REQUEST_SYSTEM.md untuk frontend spec atau tanya langsung ke frontend team.
