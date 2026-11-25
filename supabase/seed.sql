-- =============================================================================
-- LMS PELATIHAN DIGITAL — Seed Data Pengujian (Supabase / PostgreSQL)
-- 1 Super Admin, 2 Admin Kegiatan, 4 Fasilitator, 2 Pemantau, 20 Peserta, 2 Kegiatan, 8 Level
-- =============================================================================

-- Kegiatan 1 & 2
INSERT INTO public.training_programs (id, code, name, description, organizer, start_date, end_date, location, quota, status, require_approval, signer_name, signer_title)
VALUES
  (
    '11111111-1111-4111-8111-111111111101',
    'TD-2026-A',
    'Transformasi Digital & Tata Kelola Layanan Publik',
    'Pelatihan terstruktur empat level untuk meningkatkan kompetensi aparatur dan tenaga pendidik dalam perancangan layanan digital, manajemen data, dan keamanan informasi.',
    'Pusat Pengembangan Kompetensi Digital Nusantara',
    '2026-10-01',
    '2026-12-20',
    'Daring & Balai Pelatihan Jakarta',
    120,
    'aktif',
    TRUE,
    'Dr. Hendra Kusuma, M.Kom.',
    'Kepala Pusat Pengembangan Kompetensi Digital'
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    'LD-2026-B',
    'Literasi Data & Analitik Pembelajaran Adaptif',
    'Program peningkatan kapasitas pengolahan data evaluasi, visualisasi indikator kinerja, dan pengambilan keputusan berbasis bukti.',
    'Direktorat Inovasi Pembelajaran Digital',
    '2026-11-01',
    '2027-01-30',
    'Hybrid — Bandung & Platform LMS',
    80,
    'aktif',
    FALSE,
    'Prof. Dr. Ratna Wijaya, M.Pd.',
    'Direktur Inovasi Pembelajaran Digital'
  )
ON CONFLICT (code) DO NOTHING;

-- 4 Level untuk Kegiatan 1
INSERT INTO public.learning_levels (training_id, level_number, title, slug, description, duration_hours, min_quiz_score, min_evaluation_score)
VALUES
  ('11111111-1111-4111-8111-111111111101', 1, 'Level 1: Dasar — Fondasi Ekosistem Digital', 'dasar', 'Pengenalan arsitektur layanan digital, etika siber, dan produktivitas kolaboratif.', 8, 70, 75),
  ('11111111-1111-4111-8111-111111111101', 2, 'Level 2: Berkembang — Manajemen Data & Alur Kerja', 'berkembang', 'Standardisasi formulir elektronik, basis data terstruktur, dan otomasi layanan.', 10, 70, 75),
  ('11111111-1111-4111-8111-111111111101', 3, 'Level 3: Lanjut — Keamanan Informasi & Integrasi Sistem', 'lanjut', 'Penerapan kontrol akses berbasis peran, perlindungan data pribadi, dan audit.', 12, 75, 80),
  ('11111111-1111-4111-8111-111111111101', 4, 'Level 4: Mahir — Strategi & Evaluasi Transformasi', 'mahir', 'Perancangan peta jalan transformasi, indikator dampak, dan tata kelola berkelanjutan.', 14, 75, 80)
ON CONFLICT (training_id, level_number) DO NOTHING;

-- 4 Level untuk Kegiatan 2
INSERT INTO public.learning_levels (training_id, level_number, title, slug, description, duration_hours, min_quiz_score, min_evaluation_score)
VALUES
  ('11111111-1111-4111-8111-111111111102', 1, 'Level 1: Dasar — Prinsip Literasi Data', 'dasar', 'Memahami jenis data, kualitas instrumen, dan pembersihan dataset pelatihan.', 6, 70, 75),
  ('11111111-1111-4111-8111-111111111102', 2, 'Level 2: Berkembang — Eksplorasi & Visualisasi', 'berkembang', 'Menyusun grafik distribusi capaian dan pembacaan tren kelulusan.', 8, 70, 75),
  ('11111111-1111-4111-8111-111111111102', 3, 'Level 3: Lanjut — Analitik Diagnostik Peserta', 'lanjut', 'Identifikasi dini peserta yang membutuhkan pendampingan fasilitator.', 10, 75, 80),
  ('11111111-1111-4111-8111-111111111102', 4, 'Level 4: Mahir — Pelaporan Eksekutif Berbasis Bukti', 'mahir', 'Penyusunan rekomendasi kebijakan dan laporan akuntabilitas program.', 12, 75, 80)
ON CONFLICT (training_id, level_number) DO NOTHING;
