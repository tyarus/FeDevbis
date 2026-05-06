# Fitur Notifikasi Seller - Update API

## 📋 Ringkasan Perubahan

Sistem pembayaran telah ditingkatkan untuk:
1. **Otomatis mengurangi stock produk** saat pembayaran berhasil
2. **Mengirim notifikasi real-time** ke seller ketika ada pembayaran order

## ✨ Fitur Baru Backend

### 1. **Automatic Stock Reduction**

**Di endpoint:** `POST /api/orders/{id}/pay`

Ketika pembayaran berhasil:
- Order status berubah dari `pending_payment` → `paid`
- **Stock produk dikurangi otomatis** sesuai quantity order
- Contoh: Jika produk stock = 5, dibeli 2 item → stock menjadi 3

```php
// Dalam PaymentController
$product = $order->product;
if ($product) {
    $product->decrement('stock', $order->quantity);
}
```

### 2. **Seller Notifications System**

**Database Table:** `notifications`

Struktur:
```sql
- id (PK)
- user_id (FK to users)
- order_id (FK to orders, nullable)
- title (string)
- message (text)
- type (enum: info, success, warning, error)
- action_url (string, nullable)
- action_label (string, nullable)
- read_at (timestamp, nullable)
- created_at, updated_at
```

**Model:** `App\Models\Notification`

### 3. **Seller Notification Otomatis**

Ketika buyer melakukan pembayaran:

```
Database: notifications table
{
  user_id: seller_id,
  order_id: order_id,
  title: "Pembayaran Diterima!",
  message: "Pesanan dari {buyer_name} telah dibayar. {quantity}x {product_name} siap diproses untuk dikirim.",
  type: "success",
  action_url: "/seller/orders/{order_id}",
  action_label: "Lihat Pesanan"
}
```

## 🔌 API Endpoints - Notifications

### `GET /api/notifications`

**Authentication:** Required (Bearer token)

**Query params:**
- Automatic pagination: 20 items per page
- Supports standard pagination params: `page`

**Response:**
```json
{
  "success": true,
  "message": "Notifikasi berhasil diambil",
  "data": [
    {
      "id": "1",
      "user_id": "2",
      "order_id": "123",
      "title": "Pembayaran Diterima!",
      "message": "Pesanan dari John Buyer telah dibayar. 1x Laptop Pro siap diproses untuk dikirim.",
      "type": "success",
      "action_url": "/seller/orders/123",
      "action_label": "Lihat Pesanan",
      "is_read": false,
      "read_at": null,
      "created_at": "2026-05-04T10:00:00.000000Z",
      "updated_at": "2026-05-04T10:00:00.000000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total": 5,
    "per_page": 20,
    "last_page": 1
  }
}
```

---

### `GET /api/notifications/unread-count`

**Authentication:** Required

**Purpose:** Get total unread notifications count

**Response:**
```json
{
  "success": true,
  "message": "Jumlah notifikasi belum dibaca",
  "data": {
    "unread_count": 3
  }
}
```

---

### `PUT /api/notifications/{id}/mark-as-read`

**Authentication:** Required

**Purpose:** Mark single notification as read

**Response:**
```json
{
  "success": true,
  "message": "Notifikasi telah ditandai sebagai telah dibaca",
  "data": {
    "id": "1",
    "is_read": true,
    "read_at": "2026-05-04T10:05:00.000000Z"
  }
}
```

---

### `PUT /api/notifications/mark-all-as-read`

**Authentication:** Required

**Purpose:** Mark all unread notifications as read at once

**Response:**
```json
{
  "success": true,
  "message": "Semua notifikasi telah ditandai sebagai telah dibaca",
  "data": null
}
```

---

### `DELETE /api/notifications/{id}`

**Authentication:** Required

**Purpose:** Delete a notification

**Response:**
```json
{
  "success": true,
  "message": "Notifikasi berhasil dihapus",
  "data": null
}
```

---

## 🎨 Frontend Implementation

### 1. **Hook: `useNotifications()`** (`lib/useNotifications.ts`)

```typescript
const {
  notifications,      // Array of Notification objects
  unreadCount,       // Number of unread notifications
  isLoading,         // Loading state
  markAsRead,        // (notificationId) => Promise
  markAllAsRead,     // () => Promise
  deleteNotification, // (notificationId) => Promise
  mutate             // SWR mutate function
} = useNotifications();
```

**Features:**
- Auto-refresh every 30 seconds untuk notifications
- Auto-refresh every 10 seconds untuk unread count
- Handle token auth automatically
- Only fetch if user is logged in

---

### 2. **Component: `NotificationDropdown`** (`components/NotificationDropdown.tsx`)

**Features:**
- ✅ Bell icon di navbar (hanya untuk sellers)
- ✅ Red badge dengan unread count
- ✅ Dropdown list notifikasi terbaru
- ✅ Click outside untuk close
- ✅ Mark as read on click
- ✅ Delete notification button
- ✅ Link ke action URL
- ✅ Timestamp untuk setiap notif

**Usage:**
```typescript
import { NotificationDropdown } from "@/components";

<NotificationDropdown />
```

---

## 🔄 User Flow (Seller Perspective)

1. **Buyer membayar order**
   - `POST /api/orders/{id}/pay` → Payment created
   - Product stock berkurang
   - Notification dibuat di database

2. **Seller lihat notifikasi**
   - Bell icon di navbar menunjukkan badge dengan unread count
   - Click bell → dropdown terbuka
   - Lihat list notifikasi terbaru
   - Click "Lihat Pesanan" → redirect ke `/seller/orders/{id}`
   - Notifikasi di-mark as read
   - Seller bisa delete atau cek notifikasi lama

---

## 📊 Database Schema

```sql
CREATE TABLE notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  order_id BIGINT NULLABLE,
  title VARCHAR(255) NOT NULL,
  message LONGTEXT NOT NULL,
  type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
  action_url VARCHAR(255) NULLABLE,
  action_label VARCHAR(255) NULLABLE,
  read_at TIMESTAMP NULLABLE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_order_id (order_id),
  INDEX idx_read_at (read_at),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

---

## 🚀 Setup Instructions

### Backend (Laravel)

1. **Migration sudah berjalan:**
   ```bash
   php artisan migrate
   ```

2. **Models & Controllers sudah dibuat:**
   - `App\Models\Notification`
   - `App\Http\Controllers\API\NotificationController`
   - `App\Http\Resources\NotificationResource`

3. **Routes sudah didaftar di `routes/api.php`**

4. **PaymentController sudah updated** untuk:
   - Reduce stock
   - Create seller notification

### Frontend (Next.js)

1. **Hook dibuat:** `lib/useNotifications.ts`
2. **Component dibuat:** `components/NotificationDropdown.tsx`
3. **Navbar updated** untuk include NotificationDropdown
4. **Exports updated:** `components/index.ts`

---

## ✅ Testing Checklist

- [ ] Seller login → lihat bell icon di navbar
- [ ] Seller click bell → dropdown terbuka
- [ ] Buyer beli & bayar produk
- [ ] Seller lihat notifikasi baru dengan badge
- [ ] Click notification → mark as read
- [ ] Click "Lihat Pesanan" → redirect ke order detail
- [ ] Stock produk berkurang sesuai quantity
- [ ] Click "Lihat Semua Notifikasi" → go to full notifications page (optional)
- [ ] Delete notification → removed from list
- [ ] Mark all as read → all unread hilang

---

## 🎯 Notification Types

| Type | Color | Use Case |
|------|-------|----------|
| `success` | Green | Payment received, order shipped |
| `warning` | Yellow | Order pending, stock running low |
| `error` | Red | Payment failed, order cancelled |
| `info` | Blue | General updates, new order |

---

## 📱 Responsive Design

- ✅ Dropdown positions correctly on mobile (fixed right edge)
- ✅ Max-width 384px (w-96 in Tailwind)
- ✅ Auto-scroll if notifications > 6 items
- ✅ Touch-friendly close button

---

## 🔒 Security Notes

- ✅ Users hanya bisa lihat notifikasi mereka sendiri
- ✅ Mark/delete hanya untuk user pemilik notification
- ✅ Sanctum authentication required
- ✅ No notification leakage between users

---

## 📈 Future Enhancements

1. **Email Notifications** - Send email saat ada new notification
2. **Push Notifications** - Browser push notifications
3. **Notification Preferences** - Let sellers choose notification types
4. **Notification Archive** - Keep deleted notifications for reference
5. **Notification Filters** - Filter by type, date, read status
6. **Real-time Updates** - WebSocket/Pusher untuk live notifications

---

## 🐛 Troubleshooting

**Notifikasi tidak muncul?**
- Pastikan migration sudah jalan: `php artisan migrate:status`
- Restart Laravel server
- Check PaymentController logic

**Unread count tidak update?**
- Pastikan frontend endpoint `/notifications/unread-count` bisa diakses
- Check browser console untuk error
- Verify auth token valid

**Stock tidak berkurang?**
- Check PaymentController di line yang menggunakan `decrement()`
- Verify product relationship di Order model sudah loaded dengan eager loading
- Check database directly

