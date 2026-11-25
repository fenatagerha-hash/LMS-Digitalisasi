-- ============================================================================
-- LMS PELATIHAN DIGITALISASI PEMBELAJARAN (MODEL SAMR - PID)
-- Additive PostgreSQL / Supabase Migration 002
-- Menambahkan kolom profil guru, konfigurasi SAMR-PID, jadwal, tugas praktik,
-- rubrik penilaian (skala 1-4), refleksi level, catatan fasilitator, & lembaga.
-- ============================================================================

-- 1. Penambahan kolom profil guru pada profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS jenjang_pendidikan TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS mata_pelajaran TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS status_peserta TEXT DEFAULT '';

-- 2. Penambahan kolom kegiatan SAMR-PID & template sertifikat pada training_programs
ALTER TABLE public.training_programs
  ADD COLUMN IF NOT EXISTS execution_mode TEXT DEFAULT 'hybrid' CHECK (execution_mode IN ('daring', 'luring', 'hybrid')),
  ADD COLUMN IF NOT EXISTS progression_policy TEXT DEFAULT 'sequential' CHECK (progression_policy IN ('sequential', 'assigned_only')),
  ADD COLUMN IF NOT EXISTS guidelines TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cert_template_title TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cert_template_subtitle TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cert_accent_color TEXT DEFAULT 'navy' CHECK (cert_accent_color IN ('navy', 'blue', 'gold')),
  ADD COLUMN IF NOT EXISTS cert_logo_url TEXT DEFAULT '';

-- 3. Penambahan kolom demonstrasi & praktik PID pada learning_levels
ALTER TABLE public.learning_levels
  ADD COLUMN IF NOT EXISTS demo_guide TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS demo_video_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS task_instructions TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS task_steps TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS task_sample_output TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS require_practice_validation BOOLEAN NOT NULL DEFAULT TRUE;

-- 4. Jadwal Kegiatan Pelatihan (training_schedules)
CREATE TABLE IF NOT EXISTS public.training_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  level_number SMALLINT NOT NULL DEFAULT 0 CHECK (level_number BETWEEN 0 AND 4),
  title TEXT NOT NULL,
  session_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  facilitator_name TEXT DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'daring' CHECK (mode IN ('daring', 'luring', 'mandiri')),
  location_or_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tugas Praktik PID per Level (practical_tasks)
CREATE TABLE IF NOT EXISTS public.practical_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  level_number SMALLINT NOT NULL CHECK (level_number BETWEEN 1 AND 4),
  title TEXT NOT NULL,
  instructions TEXT NOT NULL,
  steps TEXT DEFAULT '',
  sample_output TEXT DEFAULT '',
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (training_id, level_number)
);

-- 6. Kiriman Tugas Praktik Peserta (task_submissions)
CREATE TABLE IF NOT EXISTS public.task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  level_number SMALLINT NOT NULL CHECK (level_number BETWEEN 1 AND 4),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  product_url TEXT DEFAULT '',
  product_file_name TEXT DEFAULT '',
  doc_media_url TEXT DEFAULT '',
  doc_media_name TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'menunggu_penilaian' CHECK (status IN ('menunggu_penilaian', 'lulus', 'perlu_perbaikan')),
  weighted_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (weighted_score BETWEEN 0 AND 100),
  facilitator_feedback TEXT DEFAULT '',
  graded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (training_id, level_number, user_id)
);

-- 7. Master Rubrik Penilaian Praktik SAMR (rubrics)
CREATE TABLE IF NOT EXISTS public.rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  criterion_code TEXT NOT NULL,
  criterion_label TEXT NOT NULL,
  weight SMALLINT NOT NULL CHECK (weight BETWEEN 1 AND 100),
  order_index SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Detail Skor Rubrik Skala 1-4 per Kiriman Praktik (rubric_scores)
CREATE TABLE IF NOT EXISTS public.rubric_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.task_submissions(id) ON DELETE CASCADE,
  criterion_code TEXT NOT NULL,
  criterion_label TEXT NOT NULL,
  weight SMALLINT NOT NULL,
  score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 4),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (submission_id, criterion_code)
);

-- 9. Refleksi Pembelajaran per Level SAMR (level_reflections)
CREATE TABLE IF NOT EXISTS public.level_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  level_number SMALLINT NOT NULL CHECK (level_number BETWEEN 1 AND 4),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  learning_experience TEXT NOT NULL,
  challenges TEXT DEFAULT '',
  competencies_gained TEXT DEFAULT '',
  school_implementation_plan TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (training_id, level_number, user_id)
);

-- 10. Catatan & Umpan Balik Fasilitator (facilitator_notes)
CREATE TABLE IF NOT EXISTS public.facilitator_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  level_number SMALLINT NOT NULL DEFAULT 1 CHECK (level_number BETWEEN 0 AND 4),
  participant_uid TEXT NOT NULL DEFAULT 'all',
  participant_name TEXT NOT NULL,
  author_uid UUID NOT NULL REFERENCES public.profiles(id),
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Identitas Lembaga & Konfigurasi Global (institution_settings)
CREATE TABLE IF NOT EXISTS public.institution_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  app_name TEXT NOT NULL DEFAULT 'LMS PELATIHAN DIGITALISASI PEMBELAJARAN',
  tagline TEXT DEFAULT 'Platform Peningkatan Kompetensi Guru Berbasis Model SAMR',
  institution_name TEXT NOT NULL DEFAULT 'Balai Guru Penggerak & Layanan Digitalisasi Pendidikan',
  address TEXT DEFAULT '',
  website TEXT DEFAULT '',
  support_email TEXT DEFAULT '',
  certificate_prefix TEXT NOT NULL DEFAULT 'SAMR',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indeks Kinerja
CREATE INDEX IF NOT EXISTS idx_task_submissions_training_status ON public.task_submissions(training_id, status);
CREATE INDEX IF NOT EXISTS idx_level_reflections_training_user ON public.level_reflections(training_id, user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_training_date ON public.training_schedules(training_id, session_date);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE public.training_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practical_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilitator_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS Minimum (Peserta hanya mengakses data miliknya; Staf mengelola sesuai peran)
CREATE POLICY "schedules_read_authenticated" ON public.training_schedules
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "task_submissions_owner_select" ON public.task_submissions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff());

CREATE POLICY "task_submissions_owner_insert" ON public.task_submissions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "task_submissions_owner_update" ON public.task_submissions
  FOR UPDATE TO authenticated USING (
    (user_id = auth.uid() AND status <> 'lulus') OR public.is_staff()
  );

CREATE POLICY "level_reflections_owner_all" ON public.level_reflections
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_staff())
  WITH CHECK (user_id = auth.uid() OR public.is_staff());

CREATE POLICY "institution_settings_public_read" ON public.institution_settings
  FOR SELECT USING (id = 'default');
