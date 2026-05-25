# Catatan Deploy FE (Vercel) + Koneksi ke BE Railway

Dokumen ini untuk frontend repo: `tyarus/FeDevbis`.
Backend aktif saat ini: `https://web-production-d5197.up.railway.app`.

## 1. Pastikan Backend Siap

1. Cek health backend:
   - `https://web-production-d5197.up.railway.app/api/health`
2. Pastikan response:
   - `{"status":"ok"}`

## 2. Deploy Frontend ke Vercel

1. Login ke Vercel.
2. Import repo `tyarus/FeDevbis`.
3. Framework preset: `Next.js` (auto-detect).
4. Build command: `next build` (default).
5. Output: default Next.js (jangan diubah).

## 3. Set Environment Variable di Vercel

Di Project Settings -> Environment Variables, tambahkan:

```env
NEXT_PUBLIC_API_URL=https://web-production-d5197.up.railway.app/api
```

Set untuk:
- `Production`
- `Preview` (disarankan)
- `Development` (opsional)

Lalu redeploy.

## 4. Hubungkan CORS di Backend Railway

Set variable di service backend Railway (`web`):

```env
FRONTEND_URL=https://<domain-production-vercel-kamu>.vercel.app
```

Contoh:

```env
FRONTEND_URL=https://fedevbis.vercel.app
```

Setelah update variable, lakukan redeploy backend.

Contoh via CLI:

```bash
railway variable set --service web FRONTEND_URL=https://fedevbis.vercel.app
railway redeploy --service web --yes
```

## 5. Checklist Setelah Deploy

1. Buka frontend Vercel.
2. Coba register/login.
3. Cek DevTools -> Network:
   - request harus menuju `https://web-production-d5197.up.railway.app/api/...`
4. Pastikan tidak ada error CORS.
5. Uji alur inti:
   - list produk
   - buat order
   - bayar

## 6. Troubleshooting Cepat

- Masih call `localhost`:
  - `NEXT_PUBLIC_API_URL` belum terset atau belum redeploy.
- CORS error:
  - `FRONTEND_URL` di Railway belum sama dengan domain Vercel production.
- CORS error di domain Preview Vercel:
  - default backend saat ini hanya mengizinkan satu domain dari `FRONTEND_URL`.
  - untuk testing aman, gunakan domain production Vercel dulu.
- Deploy sukses tapi data kosong:
  - cek API response di tab Network (401/422/500) dan log backend Railway.

## 7. Catatan Penting

- Frontend kamu memakai token Bearer dari `localStorage` (`auth_token`), jadi header `Authorization` wajib terkirim.
- Jika domain Vercel production berubah, update:
  - `FRONTEND_URL` di Railway
  - lalu redeploy backend.
