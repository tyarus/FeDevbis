# Fitur Notifikasi & Tracking - Dokumentasi Lengkap

## 📋 Ringkasan Perubahan

Telah ditambahkan sistem notifikasi dan tracking code verification, serta perbaikan dashboard untuk memberikan informasi yang lebih penting dan actionable.

---

## 🎯 Fitur Baru

### 1. **Notification System** (`components/Notification.tsx`)

**Komponen:**
- `NotificationBell` - Bell icon dengan badge unread count
- `NotificationItem` - Individual notification card
- `NotificationContainer` - Container untuk multiple notifications

**Fitur:**
- ✅ Auto-dismiss setelah 5 detik (untuk non-error)
- ✅ 4 tipe notifikasi: info, success, warning, error
- ✅ Animated slide-in
- ✅ Icon + title + message + optional action
- ✅ Manual dismiss dengan X button

**Tipe Notifikasi:**
```typescript
interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: Date;
  actionUrl?: string;
  actionLabel?: string;
}
```

**Contoh Penggunaan:**
```typescript
const notifications = [
  {
    id: "1",
    type: "success",
    title: "Pembayaran Berhasil",
    message: "Order #12345 telah dibayar",
    timestamp: new Date(),
    actionUrl: "/orders/12345",
    actionLabel: "Lihat Pesanan"
  }
];

<NotificationContainer 
  notifications={notifications}
  onDismiss={(id) => console.log(id)}
/>
```

---

### 2. **Tracking Code Verification** (`components/TrackingCodeVerification.tsx`)

**Fitur:**
- ✅ Buyer input tracking code untuk verifikasi
- ✅ Code harus match dengan nomor tracking dari seller
- ✅ Success state menampilkan konfirmasi
- ✅ Error handling dengan pesan jelas

**Alur:**
1. Seller input tracking number saat ship order
2. Buyer lihat tracking number di order page
3. Buyer input code untuk verifikasi akun sesuai
4. System verifikasi bahwa akun buyer sesuai dengan penerima

**Contoh Implementasi:**
```typescript
<TrackingCodeVerification
  orderId={order.id}
  trackingNumber={order.tracking_number}
  onVerify={async (code) => {
    await apiClient.put(`/orders/${orderId}/confirm`, { code });
  }}
  isVerified={order.status === "delivered"}
/>
```

---

### 3. **Enhanced Buyer Dashboard** (`app/dashboard/page.tsx`)

**Perbaikan:**
- ✅ Background gradient untuk visual appeal
- ✅ Urgent alert untuk pending payment
- ✅ Metrics cards dengan conditional display:
  - Total Pesanan
  - Menunggu Bayar (if > 0)
  - Dalam Pengiriman (if > 0)
  - Selesai (if > 0)
  - Total Belanja (sum of all orders)

- ✅ Recent Orders table dengan:
  - ID Pesanan (link)
  - Produk
  - Total
  - Status badge
  - Aksi link

- ✅ Right sidebar dengan:
  - Urgent Actions (orders needing attention)
  - Quick Links
  - Info Tips

**Metrics Ditampilkan:**
```
- Total Orders
- Pending Payment (amber/yellow highlight if > 0)
- In Transit (blue highlight if > 0)
- Completed (green)
- Total Spent (purple)
```

**Alert Condition:**
- Jika ada pesanan `pending_payment`, tampil warning alert
- User bisa langsung klik untuk lihat pesanan

---

### 4. **Enhanced Seller Dashboard** (`app/seller/dashboard/page.tsx`)

**Perbaikan:**
- ✅ Prominent alert untuk pesanan yang perlu diproses
- ✅ Metrics cards dengan:
  - Total Produk
  - Pesanan Masuk
  - Perlu Diproses (red highlight if > 0)
  - Menunggu Bayar (if > 0)
  - Dikirim (if > 0)

- ✅ Quick Actions buttons:
  - Tambah Produk Baru
  - Lihat Semua Pesanan

- ✅ Recent Orders table dengan:
  - ID Pesanan
  - Pembeli (nama buyer)
  - Total
  - Status
  - Aksi

- ✅ Right sidebar dengan:
  - Urgent Orders (perlu diproses)
  - Info Tips (pantau pesanan)
  - Info tentang tracking code verification

**Urgent Alert:**
- Jika ada pesanan `pending_payment` atau `processing`
- Red background untuk maximum visibility
- Direct link ke orders page

---

### 5. **Enhanced Buyer Order Detail** (`app/orders/[id]/page.tsx`)

**Fitur Baru:**
- ✅ Tracking Info section dengan:
  - Truck icon
  - Nomor tracking display di font-mono
  - Info bahwa verifikasi kode akan diminta

- ✅ Tracking Code Verification component:
  - Tampil saat status `shipped` atau `delivered`
  - Buyer input code dari seller
  - Success state menampilkan konfirmasi

- ✅ Better Cancel Button:
  - Available saat status: pending_payment, paid, processing
  - Red color untuk cancel action

- ✅ Better Confirm Button:
  - Tampil saat shipped/delivered
  - Dengan CheckCircle2 icon

- ✅ Better Alert Messages:
  - Yellow alert untuk pending payment
  - Green success untuk order processing
  - Clear instruction untuk user

**Status-based Actions:**
```
pending_payment → [Lanjutkan Pembayaran, Batalkan Pesanan]
paid/processing → [Batalkan Pesanan]
shipped/delivered → [Konfirmasi Penerimaan]
completed → [No Actions]
cancelled → [No Actions]
```

---

## 📊 Metrics & Calculations

### Buyer Dashboard:
```typescript
pendingPayment = orders.filter(o => o.status === "pending_payment").length
processing = orders.filter(o => o.status === "processing").length
needsAction = orders.filter(o => o.status === "shipped" || o.status === "delivered").length
completed = orders.filter(o => o.status === "completed").length
totalSpent = orders.reduce((sum, o) => sum + o.total_price, 0)
```

### Seller Dashboard:
```typescript
pendingPayment = orders.filter(o => o.status === "pending_payment").length
processingOrders = orders.filter(o => o.status === "processing").length
shippedOrders = orders.filter(o => o.status === "shipped" || o.status === "delivered").length
needsProcessing = pendingPayment + processingOrders
```

---

## 🎨 Color Scheme

| Status | Color | Background |
|--------|-------|------------|
| Urgent/Pending | Red (#ef4444) | bg-red-50 |
| Warning/Alert | Yellow (#eab308) | bg-yellow-50 |
| In Progress | Blue (#3b82f6) | bg-blue-50 |
| Success/Complete | Green (#22c55e) | bg-green-50 |
| Info | Purple (#a855f7) | bg-purple-50 |

---

## 📱 Responsive Design

Semua komponen responsive:
- Mobile: 1 column grid
- Tablet: 2-3 columns
- Desktop: Full layout dengan sidebar

---

## ✅ Tracking Code Verification Flow

```
1. Seller input tracking number saat ship order
   ↓
2. Order status berubah ke "shipped"
   ↓
3. Buyer lihat order detail
   ↓
4. Tampil Tracking Code Verification component
   ↓
5. Buyer input code yang diterima dari seller/paket
   ↓
6. System verifikasi code == tracking_number
   ↓
7. Jika cocok → success state, siap confirm order
   ↓
8. Buyer klik "Konfirmasi Penerimaan"
   ↓
9. Order status berubah menjadi "completed"
   ↓
10. Dana di-release ke seller
```

---

## 🔔 Notification Integration Points

**Buyer Notifications:**
- ✅ Pembayaran Berhasil
- ✅ Pesanan Diproses
- ✅ Pesanan Dikirim
- ✅ Pesanan Siap Dikonfirmasi

**Seller Notifications:**
- ✅ Pesanan Baru Diterima
- ✅ Pesanan Sudah Dibayar (Ready to Process)
- ✅ Pesanan Selesai

**Implementation** (contoh dengan socket.io atau polling):
```typescript
// Listen for payment success
apiClient.interceptors.response.use((response) => {
  if (response.config.url?.includes("/pay")) {
    addNotification({
      type: "success",
      title: "Pembayaran Berhasil",
      message: "Order akan segera diproses",
      actionUrl: `/orders/${orderId}`
    });
  }
  return response;
});
```

---

## 📁 File Changes

```
✅ components/Notification.tsx - NEW
✅ components/TrackingCodeVerification.tsx - NEW
✅ components/index.ts - UPDATED (exports)
✅ app/dashboard/page.tsx - UPDATED (enhanced)
✅ app/seller/dashboard/page.tsx - UPDATED (enhanced)
✅ app/orders/[id]/page.tsx - UPDATED (add tracking verification & better cancel)
```

---

## 🚀 Future Enhancements

1. **Real-time Notifications**
   - WebSocket untuk instant notifications
   - Push notifications ke mobile
   - Email notifications

2. **Notification Preferences**
   - User bisa pilih channel (in-app, email, SMS)
   - Pilih type notifikasi yang mau diterima

3. **Notification History**
   - Page untuk melihat semua notifications
   - Filter by type/date
   - Search functionality

4. **Analytics Dashboard**
   - Order conversion rates
   - Average order value
   - Payment success rates
   - Seller response time

5. **Advanced Tracking**
   - Integration dengan kurir sebenarnya
   - Real-time location tracking
   - Estimated delivery time

---

## 🧪 Testing Checklist

- [x] Buyer dashboard displays correct metrics
- [x] Seller dashboard shows urgent alert
- [x] Tracking code verification component renders
- [x] Code validation works
- [x] Cancel button available at correct status
- [x] Confirm button available when shipped
- [x] All links navigate correctly
- [x] Responsive on mobile/tablet/desktop
- [x] Icons display correctly
- [x] Colors match design
- [x] Loading states show
- [x] Error messages display
- [x] No console errors

---

**Last Updated**: May 4, 2026
**Status**: ✅ Ready for Integration with Backend Notifications
