# Sistem Pembatalan Pesanan dengan Approval Seller

## 📋 Ringkasan

Sistem pembatalan pesanan dengan workflow approval dari seller. User (buyer) dapat mengajukan permintaan pembatalan dengan alasan, dan seller dapat menyetujui atau menolak permintaan tersebut. Jika disetujui, pesanan dibatalkan dan dana refund ke wallet buyer.

## 🔄 Konsep Alur

```
User klik "Batalkan Pesanan" 
  ↓
Tampil form dialog dengan:
  - Pilih alasan pembatalan (dropdown)
  - Penjelasan detail (textarea opsional)
  ↓
User submit form
  ↓
Frontend kirim POST /api/orders/{id}/cancellation-request
  ↓
Backend create Cancellation Request (status: pending)
  ↓
Seller melihat notifikasi & buka halaman Permintaan Pembatalan
  ↓
Seller bisa: Approve / Reject
  ↓
Jika Approve:
  - Order status = cancelled
  - Dana escrow dirilis ke wallet buyer
  - Buyer dapat notifikasi "Dana dikembalikan"
  
Jika Reject:
  - Cancellation Request status = rejected
  - Order tetap normal
  - Buyer dapat notifikasi "Permintaan ditolak"
```

## ✅ Frontend Implementation (Sudah Selesai)

### 1. Types (`types/index.ts`)
```typescript
export type CancellationReason = 
  | "urgent_payment_delay"
  | "product_mismatch"
  | "ordering_mistake"
  | "other";

export interface CancellationRequest {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  reason: CancellationReason;
  details?: string;
  status: "pending" | "approved" | "rejected";
  seller_notes?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCancellationRequestInput {
  reason: CancellationReason;
  details?: string;
}
```

### 2. Components Created

#### **CancellationRequestDialog.tsx** 
- Form dialog untuk submit pembatalan
- Dropdown alasan pembatalan
- Textarea penjelasan detail
- Loading state & error handling
- Lokasi: `components/CancellationRequestDialog.tsx`

#### **CancellationRequestStatus.tsx**
- Tampil status cancellation request di order detail
- Status: pending (yellow), approved (green), rejected (red)
- Lokasi: `components/CancellationRequestStatus.tsx`

#### **SellerCancellationApprovalPanel.tsx**
- Panel untuk seller approve/reject cancellation
- Form textarea untuk alasan penolakan
- Tampil alasan buyer & detail request
- Lokasi: `components/SellerCancellationApprovalPanel.tsx`

#### **SellerCancellationRequestsPanel.tsx**
- List semua pending/approved/rejected cancellation requests
- Filter by status (all, pending, approved, rejected)
- Pagination
- Lokasi: `components/SellerCancellationRequestsPanel.tsx`

### 3. Page Updates

#### **Orders Detail Page** (`app/orders/[id]/page.tsx`)
- Import `CancellationRequestDialog` & `CancellationRequestStatus`
- Fetch cancellation request status via SWR
- Tampilkan dialog form ketika user klik "Batalkan Pesanan"
- Tampilkan status cancellation request di order detail
- Button "Batalkan Pesanan" hanya muncul jika belum ada cancellation request

#### **Seller Cancellation Requests Page** (`app/seller/cancellation-requests/page.tsx`)
- Halaman untuk seller melihat semua cancellation requests
- Import & display `SellerCancellationRequestsPanel`

## 📡 Backend Implementation (Diperlukan)

### Database Schema

```sql
CREATE TABLE cancellation_requests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL UNIQUE,
    buyer_id BIGINT NOT NULL,
    seller_id BIGINT NOT NULL,
    reason ENUM('urgent_payment_delay', 'product_mismatch', 'ordering_mistake', 'other') NOT NULL,
    details LONGTEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    seller_notes LONGTEXT,
    rejection_reason LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users(id),
    FOREIGN KEY (seller_id) REFERENCES users(id),
    INDEX idx_seller_status (seller_id, status),
    INDEX idx_buyer_status (buyer_id, status)
);
```

### API Endpoints

#### 1️⃣ **POST /api/orders/{id}/cancellation-request**
**Auth:** Buyer yang pemilik order

**Request:**
```json
{
  "reason": "urgent_payment_delay|product_mismatch|ordering_mistake|other",
  "details": "Penjelasan detail (optional)"
}
```

**Validation:**
- Order harus exist & milik buyer
- Order status harus dalam: `pending_payment`, `paid`, `processing`
- Tidak boleh ada cancellation request sebelumnya untuk order ini
- Reason wajib dipilih
- Details max 500 karakter

**Response 201:**
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
    "details": "...",
    "status": "pending",
    "created_at": "2026-05-25T10:00:00Z"
  }
}
```

**Error 400:** Order status tidak bisa dibatalkan
**Error 409:** Sudah ada permohonan pembatalan untuk order ini
**Error 404:** Order tidak ditemukan

---

#### 2️⃣ **GET /api/orders/{id}/cancellation-request**
**Auth:** Buyer atau Seller pemilik order

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "pending",
    "reason": "urgent_payment_delay",
    "details": "...",
    "created_at": "2026-05-25T10:00:00Z"
  }
}
```

**Response 404:** Tidak ada cancellation request
```json
{
  "success": true,
  "data": null
}
```

---

#### 3️⃣ **PUT /api/orders/{id}/cancellation-request/approve**
**Auth:** Seller yang pemilik order

**Request:**
```json
{
  "seller_notes": "Baik, pesanan dibatalkan sesuai permintaan (optional)"
}
```

**Logic:**
1. Validasi: Cancellation request harus ada & status "pending"
2. Update cancellation_request status = "approved"
3. Update order status = "cancelled"
4. **Release escrow:** Dana dari escrow dirilis kembali ke wallet buyer dengan type "order_refund"
5. Create notification untuk buyer: "Pesanan dibatalkan dan dana dikembalikan"
6. Create activity log untuk transaction_activities

**Response 200:**
```json
{
  "success": true,
  "message": "Permintaan pembatalan disetujui",
  "data": {
    "id": 123,
    "status": "cancelled",
    "refunded_amount": 500000,
    "refunded_to_wallet": true
  }
}
```

**Error 400:** Cancellation request tidak dalam status pending

---

#### 4️⃣ **PUT /api/orders/{id}/cancellation-request/reject**
**Auth:** Seller yang pemilik order

**Request:**
```json
{
  "reason": "Kami tidak bisa membatalkan karena produk sudah dikirim (required)"
}
```

**Validation:**
- Reason wajib & max 500 karakter

**Logic:**
1. Validasi: Cancellation request harus ada & status "pending"
2. Update cancellation_request status = "rejected" + rejection_reason
3. **Jangan ubah order status** (tetap normal)
4. Create notification untuk buyer: "Permintaan pembatalan ditolak: {reason}"

**Response 200:**
```json
{
  "success": true,
  "message": "Permintaan pembatalan ditolak",
  "data": {
    "id": 123,
    "status": "rejected",
    "rejection_reason": "Produk sudah dikirim"
  }
}
```

**Error 400:** Cancellation request tidak dalam status pending

---

#### 5️⃣ **GET /api/seller/cancellation-requests**
**Auth:** Seller

**Query Params:**
- `page` (default 1)
- `status` (optional: pending, approved, rejected; kosong = all)

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
      "details": "...",
      "status": "pending",
      "created_at": "2026-05-25T10:00:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total": 15,
    "per_page": 50,
    "last_page": 1
  }
}
```

---

### Integration Points

1. **Wallet System**
   - Ketika approve: Release escrow dengan type "order_refund" ke buyer wallet
   - Gunakan existing method: `walletAPI.refundEscrowForOrder()` di frontend
   - Backend: Update ledger dengan transaction type "order_refund"

2. **Notifications**
   - Buyer submit cancellation → Seller dapat notifikasi
   - Seller approve → Buyer dapat notifikasi dengan dana amount
   - Seller reject → Buyer dapat notifikasi dengan alasan

3. **Order Status**
   - Ketika cancellation request approved → order status "cancelled"
   - Sistem existing sudah handle: "cancelled" → tidak bisa process

4. **Auth & Authorization**
   - Buyer hanya bisa submit untuk own order
   - Seller hanya bisa approve/reject untuk own order
   - Guard dengan buyer_id/seller_id check

### Error Cases Handling

| Kasus | Response |
|-------|----------|
| User coba buat 2x cancellation untuk order sama | 409 Conflict |
| User coba batalkan order yang sudah cancelled | 400 Bad Request |
| Seller coba approve yang sudah di-reject | 400 Bad Request |
| User tidak pemilik order | 403 Forbidden |
| Order tidak exist | 404 Not Found |

## 🔄 Data Flow Integration

```
Frontend                          Backend
─────────────────────────────────────────────

POST /cancellation-request        Create CR (pending)
                                  ↓
                                  Send notification to seller

[Seller buka halaman]
GET /seller/cancellation-requests Fetch all pending CR

[Seller klik Approve]
PUT /approve                      1. Update CR status
                                  2. Update order status
                                  3. Release escrow
                                  4. Send notification
                                  ↓
Frontend refresh
GET /cancellation-request         Get updated CR
(status: approved)
```

## 🚀 Implementation Priority

**Phase 1 - MVP:**
1. Database table + migration
2. 4 API endpoints (create, get, approve, reject)
3. Basic seller cancellation list endpoint

**Phase 2 - Complete:**
1. Notifications integration
2. Wallet escrow release on approve
3. Activity logging

**Phase 3 - Polish:**
1. Email notifications
2. Audit trail
3. Edge case handling

## 📝 Testing Checklist

- [ ] Buyer bisa submit cancellation dengan alasan
- [ ] Error jika alasan kosong
- [ ] Seller bisa lihat pending cancellation requests
- [ ] Seller bisa approve cancellation
- [ ] Dana refund ke wallet buyer
- [ ] Seller bisa reject dengan alasan
- [ ] Buyer dapat notifikasi setelah approve/reject
- [ ] Order status berubah ke "cancelled" setelah approve
- [ ] Tidak bisa submit cancellation 2x untuk order sama
- [ ] Filter & pagination di seller cancellation requests bekerja
- [ ] Authorization check (buyer/seller hanya lihat own data)

## 📚 References

- Order Status: [orderStatus.ts](lib/orderStatus.ts)
- Wallet Integration: [wallet.ts](lib/wallet.ts)
- API Client: [api.ts](lib/api.ts)
