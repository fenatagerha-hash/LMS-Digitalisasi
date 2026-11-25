# Panduan Instalasi, Konfigurasi Database & Deployment — LMS Pelatihan Digital

## 1. Arsitektur Aplikasi
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, React Router v7, Lucide React, Recharts, SheetJS (`xlsx`), jsPDF, QRCode.
- **Backend & Database Aktif (Lingkungan Pratinjau)**: Firebase Authentication (Google Sign-In) + Cloud Firestore dengan aturan keamanan `firestore.rules` (isolasi PII, proteksi kunci jawaban, validasi sekuensial, log audit append-only).
- **Skema Migrasi PostgreSQL / Supabase**: Tersedia lengkap di folder `/supabase/migrations/` (29 tabel, RLS, fungsi `SECURITY DEFINER`) dan `/supabase/seed.sql`.

## 2. Konfigurasi Environment Variables
Salin `.env.example` menjadi `.env` (jangan pernah memasukkan `SUPABASE_SERVICE_ROLE_KEY` ke variabel frontend `VITE_*`):
```env
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<anon-public-key>"
```

## 3. Menjalankan Migrasi PostgreSQL (Supabase)
1. Buka **Supabase Dashboard → SQL Editor** atau gunakan Supabase CLI:
   ```bash
   supabase db push
   ```
2. Jalankan berurutan:
   - `supabase/migrations/001_lms_schema.sql` (29 tabel + constraint + index + fungsi backend)
   - `supabase/migrations/002_rls_policies.sql` (kebijakan Row Level Security & proteksi kunci jawaban)
   - `supabase/seed.sql` (2 kegiatan & 8 level pembelajaran)
3. Buat bucket private di **Supabase Storage** bernama `lms-materials` (`public = false`) untuk materi file PDF/PPT/Video dengan akses Signed URL.

## 4. Menjalankan Secara Lokal
```bash
npm install
npm run dev
```
Aplikasi berjalan di `http://localhost:3000`.

## 5. Build & Deployment (Vercel / Firebase Hosting)
```bash
npm run lint
npm run build
```
- **Vercel**: Hubungkan repositori, atur *Output Directory* `dist`, tambahkan rewrite SPA `/* -> /index.html`, lalu isi Environment Variables.
- **Firebase Hosting**:
  ```bash
  firebase deploy --only hosting,firestore:rules
  ```
