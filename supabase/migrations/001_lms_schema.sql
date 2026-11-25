-- =============================================================================
-- LMS PELATIHAN DIGITAL — PostgreSQL / Supabase Migration 001
-- 29 Tabel Inti + UUID + Foreign Keys + Check Constraints + Indexes + Functions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enumerasi domain
DO $$ BEGIN
  CREATE TYPE public.lms_role AS ENUM ('super_admin', 'admin_kegiatan', 'fasilitator', 'peserta', 'pemantau');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.training_status AS ENUM ('draft', 'aktif', 'selesai', 'arsip');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.enrollment_status AS ENUM ('menunggu', 'disetujui', 'ditolak', 'aktif', 'lulus');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.question_type AS ENUM ('pilihan_ganda', 'benar_salah', 'pilihan_ganda_kompleks', 'isian_singkat');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.material_type AS ENUM ('teks', 'pdf', 'ppt', 'gambar', 'video', 'youtube', 'tautan', 'interaktif');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  phone VARCHAR(32) DEFAULT '',
  instansi VARCHAR(160) DEFAULT '',
  kabupaten_kota VARCHAR(120) DEFAULT '',
  jabatan VARCHAR(120) DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.lms_role NOT NULL DEFAULT 'peserta',
  assigned_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- 3. training_programs
CREATE TABLE IF NOT EXISTS public.training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  organizer VARCHAR(160) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location VARCHAR(160) DEFAULT '',
  quota INTEGER NOT NULL CHECK (quota > 0),
  status public.training_status NOT NULL DEFAULT 'draft',
  require_approval BOOLEAN NOT NULL DEFAULT TRUE,
  score_ranges JSONB NOT NULL DEFAULT '[
    {"level":1,"min":0,"max":40},
    {"level":2,"min":40.01,"max":60},
    {"level":3,"min":60.01,"max":80},
    {"level":4,"min":80.01,"max":100}
  ]'::jsonb,
  signer_name VARCHAR(120) DEFAULT '',
  signer_title VARCHAR(160) DEFAULT '',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

-- 4. training_enrollments
CREATE TABLE IF NOT EXISTS public.training_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.enrollment_status NOT NULL DEFAULT 'menunggu',
  starting_level SMALLINT NOT NULL DEFAULT 0 CHECK (starting_level BETWEEN 0 AND 4),
  current_level SMALLINT NOT NULL DEFAULT 0 CHECK (current_level BETWEEN 0 AND 4),
  assessment_score NUMERIC(5,2) CHECK (assessment_score IS NULL OR (assessment_score >= 0 AND assessment_score <= 100)),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (training_id, user_id)
);

-- 5. staff_assignments
CREATE TABLE IF NOT EXISTS public.staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.lms_role NOT NULL CHECK (role IN ('admin_kegiatan', 'fasilitator', 'pemantau')),
  assigned_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (training_id, user_id, role)
);

-- 6. training_schedules
CREATE TABLE IF NOT EXISTS public.training_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  description TEXT DEFAULT '',
  session_start TIMESTAMPTZ NOT NULL,
  session_end TIMESTAMPTZ NOT NULL,
  meeting_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (session_end >= session_start)
);

-- 7. learning_levels
CREATE TABLE IF NOT EXISTS public.learning_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  level_number SMALLINT NOT NULL CHECK (level_number BETWEEN 1 AND 4),
  title VARCHAR(160) NOT NULL,
  slug VARCHAR(32) NOT NULL CHECK (slug IN ('dasar', 'berkembang', 'lanjut', 'mahir')),
  description TEXT DEFAULT '',
  learning_objectives TEXT DEFAULT '',
  learning_outcomes TEXT DEFAULT '',
  facilitator_id UUID REFERENCES public.profiles(id),
  duration_hours NUMERIC(5,1) NOT NULL DEFAULT 8 CHECK (duration_hours > 0),
  min_quiz_score NUMERIC(5,2) NOT NULL DEFAULT 70 CHECK (min_quiz_score BETWEEN 0 AND 100),
  min_evaluation_score NUMERIC(5,2) NOT NULL DEFAULT 75 CHECK (min_evaluation_score BETWEEN 0 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (training_id, level_number)
);

-- 8. level_assignments
CREATE TABLE IF NOT EXISTS public.level_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.training_enrollments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES public.learning_levels(id) ON DELETE CASCADE,
  level_number SMALLINT NOT NULL CHECK (level_number BETWEEN 1 AND 4),
  status VARCHAR(32) NOT NULL DEFAULT 'belum_terbuka' CHECK (
    status IN ('belum_terbuka', 'terbuka', 'sedang_dipelajari', 'menunggu_evaluasi', 'lulus', 'belum_lulus')
  ),
  is_override BOOLEAN NOT NULL DEFAULT FALSE,
  override_reason TEXT DEFAULT '',
  override_by UUID REFERENCES public.profiles(id),
  unlocked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (enrollment_id, level_number)
);

-- 9. assessments
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes >= 5),
  max_attempts INTEGER NOT NULL DEFAULT 1 CHECK (max_attempts >= 1),
  shuffle_questions BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. assessment_questions
CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  question_type public.question_type NOT NULL,
  prompt TEXT NOT NULL,
  weight NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (weight > 0),
  accepted_short_answer TEXT,
  explanation TEXT DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. assessment_options
CREATE TABLE IF NOT EXISTS public.assessment_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 1
);

-- 12. assessment_attempts
CREATE TABLE IF NOT EXISTS public.assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  total_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (percentage BETWEEN 0 AND 100),
  assigned_level SMALLINT NOT NULL CHECK (assigned_level BETWEEN 1 AND 4),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_id, user_id, attempt_number)
);

-- 13. assessment_answers
CREATE TABLE IF NOT EXISTS public.assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  selected_option_ids UUID[] DEFAULT '{}',
  text_answer TEXT DEFAULT '',
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  earned_score NUMERIC(5,2) NOT NULL DEFAULT 0
);

-- 14. learning_materials
CREATE TABLE IF NOT EXISTS public.learning_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES public.learning_levels(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  content_type public.material_type NOT NULL,
  content_body TEXT DEFAULT '',
  storage_path TEXT DEFAULT '',
  external_url TEXT DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 1,
  duration_minutes INTEGER NOT NULL DEFAULT 15 CHECK (duration_minutes > 0),
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  allow_download BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. material_progress
CREATE TABLE IF NOT EXISTS public.material_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES public.learning_levels(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.learning_materials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status VARCHAR(24) NOT NULL DEFAULT 'belum' CHECK (status IN ('belum', 'dipelajari', 'selesai')),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (material_id, user_id)
);

-- 16. quizzes
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES public.learning_levels(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 20 CHECK (duration_minutes >= 5),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts >= 1),
  passing_score NUMERIC(5,2) NOT NULL DEFAULT 70 CHECK (passing_score BETWEEN 0 AND 100),
  show_explanation BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. quiz_questions
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_type public.question_type NOT NULL,
  prompt TEXT NOT NULL,
  weight NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (weight > 0),
  accepted_short_answer TEXT,
  requires_manual_grading BOOLEAN NOT NULL DEFAULT FALSE,
  explanation TEXT DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 1
);

-- 18. quiz_options
CREATE TABLE IF NOT EXISTS public.quiz_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 1
);

-- 19. quiz_attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES public.learning_levels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  auto_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  manual_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  final_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (final_score BETWEEN 0 AND 100),
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  grading_status VARCHAR(24) NOT NULL DEFAULT 'selesai' CHECK (grading_status IN ('selesai', 'menunggu_manual')),
  graded_by UUID REFERENCES public.profiles(id),
  feedback TEXT DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. quiz_answers
CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_option_ids UUID[] DEFAULT '{}',
  text_answer TEXT DEFAULT '',
  is_correct BOOLEAN DEFAULT FALSE,
  earned_score NUMERIC(5,2) NOT NULL DEFAULT 0
);

-- 21. evaluations
CREATE TABLE IF NOT EXISTS public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES public.learning_levels(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes >= 5),
  max_attempts INTEGER NOT NULL DEFAULT 2 CHECK (max_attempts >= 1),
  passing_score NUMERIC(5,2) NOT NULL DEFAULT 75 CHECK (passing_score BETWEEN 0 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. evaluation_questions
CREATE TABLE IF NOT EXISTS public.evaluation_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  question_type public.question_type NOT NULL,
  prompt TEXT NOT NULL,
  weight NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (weight > 0),
  accepted_short_answer TEXT,
  requires_manual_grading BOOLEAN NOT NULL DEFAULT FALSE,
  explanation TEXT DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 1
);

-- 23. evaluation_options
CREATE TABLE IF NOT EXISTS public.evaluation_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.evaluation_questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 1
);

-- 24. evaluation_attempts
CREATE TABLE IF NOT EXISTS public.evaluation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES public.learning_levels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  auto_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  manual_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  final_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (final_score BETWEEN 0 AND 100),
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  grading_status VARCHAR(24) NOT NULL DEFAULT 'selesai' CHECK (grading_status IN ('selesai', 'menunggu_manual')),
  graded_by UUID REFERENCES public.profiles(id),
  feedback TEXT DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 25. evaluation_answers
CREATE TABLE IF NOT EXISTS public.evaluation_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.evaluation_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.evaluation_questions(id) ON DELETE CASCADE,
  selected_option_ids UUID[] DEFAULT '{}',
  text_answer TEXT DEFAULT '',
  is_correct BOOLEAN DEFAULT FALSE,
  earned_score NUMERIC(5,2) NOT NULL DEFAULT 0
);

-- 26. level_completions
CREATE TABLE IF NOT EXISTS public.level_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES public.learning_levels(id) ON DELETE CASCADE,
  level_number SMALLINT NOT NULL CHECK (level_number BETWEEN 1 AND 4),
  mandatory_materials_done BOOLEAN NOT NULL DEFAULT FALSE,
  best_quiz_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  best_evaluation_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (training_id, user_id, level_number)
);

-- 27. certificates
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number VARCHAR(80) NOT NULL UNIQUE,
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_name VARCHAR(120) NOT NULL,
  training_name VARCHAR(200) NOT NULL,
  organizer VARCHAR(160) NOT NULL,
  completed_level SMALLINT NOT NULL CHECK (completed_level BETWEEN 1 AND 4),
  signer_name VARCHAR(120) NOT NULL,
  signer_title VARCHAR(160) DEFAULT '',
  issued_at DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'dicabut')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (training_id, user_id)
);

-- 28. announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 29. activity_logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID REFERENCES public.training_programs(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role VARCHAR(40) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(60) NOT NULL,
  target_id VARCHAR(128) NOT NULL,
  details TEXT DEFAULT '',
  override_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES (Isolasi training_id & performa kueri)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_enrollments_training ON public.training_enrollments (training_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.training_enrollments (user_id);
CREATE INDEX IF NOT EXISTS idx_staff_training ON public.staff_assignments (training_id, user_id);
CREATE INDEX IF NOT EXISTS idx_materials_training_level ON public.learning_materials (training_id, level_id, order_index);
CREATE INDEX IF NOT EXISTS idx_progress_user_level ON public.material_progress (user_id, level_id, status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts (training_id, level_id, user_id);
CREATE INDEX IF NOT EXISTS idx_eval_attempts_user ON public.evaluation_attempts (training_id, level_id, user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_training ON public.activity_logs (training_id, created_at DESC);

-- =============================================================================
-- SECURITY DEFINER FUNCTIONS (Penilaian, Penempatan, Unlock Sekuensial, Sertifikat)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.determine_starting_level(p_training_id UUID, p_score NUMERIC)
RETURNS SMALLINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ranges JSONB;
  v_item JSONB;
BEGIN
  SELECT score_ranges INTO v_ranges FROM public.training_programs WHERE id = p_training_id;
  IF v_ranges IS NULL THEN
    IF p_score <= 40 THEN RETURN 1;
    ELSIF p_score <= 60 THEN RETURN 2;
    ELSIF p_score <= 80 THEN RETURN 3;
    ELSE RETURN 4;
    END IF;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_ranges) LOOP
    IF p_score >= (v_item->>'min')::NUMERIC AND p_score <= (v_item->>'max')::NUMERIC THEN
      RETURN (v_item->>'level')::SMALLINT;
    END IF;
  END LOOP;
  RETURN 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_and_unlock_next_level(
  p_training_id UUID,
  p_user_id UUID,
  p_level_number SMALLINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_level public.learning_levels%ROWTYPE;
  v_mandatory_total INT;
  v_mandatory_done INT;
  v_best_quiz NUMERIC;
  v_best_eval NUMERIC;
  v_cert_no VARCHAR(80);
  v_training public.training_programs%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_level FROM public.learning_levels
    WHERE training_id = p_training_id AND level_number = p_level_number;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Level tidak ditemukan');
  END IF;

  SELECT COUNT(*) INTO v_mandatory_total FROM public.learning_materials
    WHERE level_id = v_level.id AND is_mandatory = TRUE AND is_active = TRUE;

  SELECT COUNT(*) INTO v_mandatory_done FROM public.material_progress mp
    JOIN public.learning_materials lm ON lm.id = mp.material_id
    WHERE mp.user_id = p_user_id AND mp.level_id = v_level.id
      AND lm.is_mandatory = TRUE AND mp.status = 'selesai';

  IF v_mandatory_done < v_mandatory_total THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Materi wajib belum selesai seluruhnya');
  END IF;

  SELECT COALESCE(MAX(final_score), 0) INTO v_best_quiz FROM public.quiz_attempts
    WHERE training_id = p_training_id AND level_id = v_level.id AND user_id = p_user_id AND grading_status = 'selesai';

  IF v_best_quiz < v_level.min_quiz_score THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Nilai kuis belum memenuhi standar kelulusan');
  END IF;

  SELECT COALESCE(MAX(final_score), 0) INTO v_best_eval FROM public.evaluation_attempts
    WHERE training_id = p_training_id AND level_id = v_level.id AND user_id = p_user_id AND grading_status = 'selesai';

  IF v_best_eval < v_level.min_evaluation_score THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Nilai evaluasi akhir belum memenuhi standar kelulusan');
  END IF;

  INSERT INTO public.level_completions (training_id, user_id, level_id, level_number, mandatory_materials_done, best_quiz_score, best_evaluation_score, passed)
  VALUES (p_training_id, p_user_id, v_level.id, p_level_number, TRUE, v_best_quiz, v_best_eval, TRUE)
  ON CONFLICT (training_id, user_id, level_number) DO UPDATE
    SET best_quiz_score = EXCLUDED.best_quiz_score, best_evaluation_score = EXCLUDED.best_evaluation_score, passed = TRUE, verified_at = NOW();

  UPDATE public.level_assignments SET status = 'lulus', completed_at = NOW(), updated_at = NOW()
    WHERE training_id = p_training_id AND user_id = p_user_id AND level_number = p_level_number;

  IF p_level_number < 4 THEN
    UPDATE public.level_assignments SET status = 'terbuka', unlocked_at = NOW(), updated_at = NOW()
      WHERE training_id = p_training_id AND user_id = p_user_id AND level_number = p_level_number + 1;

    UPDATE public.training_enrollments SET current_level = p_level_number + 1, updated_at = NOW()
      WHERE training_id = p_training_id AND user_id = p_user_id;

    RETURN jsonb_build_object('ok', true, 'unlocked_level', p_level_number + 1, 'graduated', false);
  ELSE
    SELECT * INTO v_training FROM public.training_programs WHERE id = p_training_id;
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
    v_cert_no := 'LMS-' || TO_CHAR(NOW(), 'YYYY') || '-' || UPPER(REPLACE(v_training.code, ' ', '')) || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6));

    INSERT INTO public.certificates (certificate_number, training_id, user_id, participant_name, training_name, organizer, completed_level, signer_name, signer_title)
    VALUES (v_cert_no, p_training_id, p_user_id, v_profile.full_name, v_training.name, v_training.organizer, 4, v_training.signer_name, v_training.signer_title)
    ON CONFLICT (training_id, user_id) DO NOTHING;

    UPDATE public.training_enrollments SET status = 'lulus', updated_at = NOW()
      WHERE training_id = p_training_id AND user_id = p_user_id;

    RETURN jsonb_build_object('ok', true, 'graduated', true, 'certificate_number', v_cert_no);
  END IF;
END;
$$;
