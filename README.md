# Deploy Frontend ke Vercel + Koneksi Backend Railway

Project ini adalah Next.js (App Router). Frontend membaca base URL API dari environment variable berikut:

```env
NEXT_PUBLIC_API_URL=...
```

Referensi implementasi: `lib/api.ts`.

## 1. Setup Lokal

1. Install dependency:

```bash
npm install
```

2. Buat file env lokal:

```bash
cp .env.local.example .env.local
```

3. Isi `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

4. Jalankan app:

```bash
npm run dev
```

## 2. Siapkan Backend di Railway

1. Deploy backend kamu di Railway sampai status deploy sukses.
2. Buka service backend -> `Settings` -> `Networking` -> `Public Networking`.
3. Klik `Generate Domain` untuk mendapatkan domain publik Railway (contoh: `https://my-backend.up.railway.app`).
4. Pastikan endpoint API bisa diakses, lalu catat URL final API kamu.
   Contoh yang dipakai frontend ini:

```txt
https://my-backend.up.railway.app/api
```

5. Set CORS di backend agar mengizinkan origin frontend Vercel:
   - `https://<nama-project>.vercel.app`
   - custom domain frontend kamu (kalau ada)
   - preview domain Vercel (opsional, jika ingin test dari preview)

## 3. Deploy Frontend ke Vercel (Dashboard)

1. Push project ini ke GitHub/GitLab/Bitbucket.
2. Buka Vercel -> `Add New Project` -> import repository.
3. Vercel akan otomatis mendeteksi Next.js.
4. Di bagian `Environment Variables`, tambahkan:

```env
NEXT_PUBLIC_API_URL=https://my-backend.up.railway.app/api
```

5. Terapkan variable ini minimal untuk:
   - `Production`
   - `Preview`
   - `Development` (opsional, jika pakai `vercel dev`)
6. Klik `Deploy`.

## 4. Deploy dengan Vercel CLI (Opsional)

```bash
npm i -g vercel
vercel
vercel --prod
```

Jika project sudah terhubung, deploy berikutnya cukup jalankan command di atas dari root project.

## 5. Verifikasi Koneksi Frontend <-> Backend

1. Buka URL Vercel hasil deploy.
2. Buka browser DevTools -> tab `Network`.
3. Pastikan request API mengarah ke domain Railway kamu (bukan `localhost`).
4. Pastikan tidak ada error CORS atau `401/500` yang tidak diharapkan.

## 6. Troubleshooting Cepat

- Data tidak muncul setelah ganti env di Vercel:
  - perubahan env hanya berlaku untuk deployment baru -> lakukan redeploy.
- Domain backend Railway berubah:
  - update `NEXT_PUBLIC_API_URL` di Vercel lalu redeploy.
- Ubah variable di Railway tapi tidak berefek:
  - Railway memakai staged changes -> pastikan perubahan sudah di-`Deploy`.
- Kena CORS:
  - tambahkan domain Vercel production + preview ke whitelist origin backend.

## 7. Catatan Penting

- Untuk frontend/browser di Next.js, variable harus diawali `NEXT_PUBLIC_`.
- Jangan commit file `.env.local` ke repository.
- Jika backend memakai path prefix `/api`, pastikan suffix `/api` ikut ditulis di `NEXT_PUBLIC_API_URL`.

## Referensi Resmi

- Next.js deployment guide (versi Next di project): `node_modules/next/dist/docs/01-app/01-getting-started/17-deploying.md`
- Next.js env variables guide (versi Next di project): `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`
- Vercel Next.js docs: https://vercel.com/docs/frameworks/nextjs
- Vercel Environment Variables docs: https://vercel.com/docs/environment-variables
- Railway Public Networking docs: https://docs.railway.com/networking/public-networking
- Railway Variables docs: https://docs.railway.com/variables
- Railway Staged Changes docs: https://docs.railway.com/deployments/staged-changes
