-- =============================================================================
-- LMS PELATIHAN DIGITAL — Row Level Security Policies (002)
-- Isolasi per training_id, Proteksi Kunci Jawaban, Pemantau Read-Only, Signed Storage
-- =============================================================================

-- Helper fungsi cek peran
CREATE OR REPLACE FUNCTION public.has_role(p_role public.lms_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = p_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_training_staff(p_training_id UUID, p_roles public.lms_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT public.has_role('super_admin') OR EXISTS (
    SELECT 1 FROM public.staff_assignments
    WHERE training_id = p_training_id AND user_id = auth.uid() AND role = ANY(p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_enrolled(p_training_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.training_enrollments
    WHERE training_id = p_training_id AND user_id = auth.uid() AND status IN ('disetujui', 'aktif', 'lulus')
  );
$$;

-- Aktifkan RLS pada seluruh 29 tabel
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 1. profiles: hanya pemilik atau Super Admin / Admin Kegiatan
CREATE POLICY profiles_select ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.has_role('super_admin') OR public.has_role('admin_kegiatan'));
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- 2. user_roles: peserta tidak bisa mengubah perannya sendiri
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT
  USING (user_id = auth.uid() OR public.has_role('super_admin'));
CREATE POLICY user_roles_admin_write ON public.user_roles FOR ALL
  USING (public.has_role('super_admin')) WITH CHECK (public.has_role('super_admin'));

-- 3. training_programs: katalog aktif terbaca peserta; mutasi hanya Super Admin / Admin Kegiatan bertugas
CREATE POLICY training_select ON public.training_programs FOR SELECT
  USING (status = 'aktif' OR public.is_training_staff(id, ARRAY['admin_kegiatan','fasilitator','pemantau']::public.lms_role[]) OR public.is_enrolled(id));
CREATE POLICY training_manage ON public.training_programs FOR ALL
  USING (public.is_training_staff(id, ARRAY['admin_kegiatan']::public.lms_role[]))
  WITH CHECK (public.is_training_staff(id, ARRAY['admin_kegiatan']::public.lms_role[]));

-- 4. training_enrollments: isolasi berdasarkan training_id
CREATE POLICY enrollments_select ON public.training_enrollments FOR SELECT
  USING (user_id = auth.uid() OR public.is_training_staff(training_id, ARRAY['admin_kegiatan','fasilitator','pemantau']::public.lms_role[]));
CREATE POLICY enrollments_insert_self ON public.training_enrollments FOR INSERT
  WITH CHECK (user_id = auth.uid() AND status = 'menunggu' AND starting_level = 0 AND current_level = 0);
CREATE POLICY enrollments_admin_update ON public.training_enrollments FOR UPDATE
  USING (public.is_training_staff(training_id, ARRAY['admin_kegiatan']::public.lms_role[]));

-- 5. Kunci jawaban (assessment_options / quiz_options / evaluation_options):
-- Peserta HANYA membaca melalui VIEW tanpa kolom is_correct & accepted_short_answer!
CREATE OR REPLACE VIEW public.v_assessment_options_safe AS
  SELECT id, question_id, label, order_index FROM public.assessment_options;
CREATE OR REPLACE VIEW public.v_quiz_options_safe AS
  SELECT id, question_id, label, order_index FROM public.quiz_options;
CREATE OR REPLACE VIEW public.v_evaluation_options_safe AS
  SELECT id, question_id, label, order_index FROM public.evaluation_options;

CREATE POLICY assessment_options_staff_only ON public.assessment_options FOR SELECT
  USING (public.has_role('super_admin') OR public.has_role('admin_kegiatan') OR public.has_role('fasilitator'));
CREATE POLICY quiz_options_staff_only ON public.quiz_options FOR SELECT
  USING (public.has_role('super_admin') OR public.has_role('admin_kegiatan') OR public.has_role('fasilitator'));
CREATE POLICY evaluation_options_staff_only ON public.evaluation_options FOR SELECT
  USING (public.has_role('super_admin') OR public.has_role('admin_kegiatan') OR public.has_role('fasilitator'));

-- 6. level_assignments: peserta dilarang mengubah status level secara langsung dari frontend
CREATE POLICY level_assignments_select ON public.level_assignments FOR SELECT
  USING (user_id = auth.uid() OR public.is_training_staff(training_id, ARRAY['admin_kegiatan','fasilitator','pemantau']::public.lms_role[]));
CREATE POLICY level_assignments_admin_override ON public.level_assignments FOR UPDATE
  USING (public.is_training_staff(training_id, ARRAY['admin_kegiatan']::public.lms_role[]));

-- 7. certificates: verifikasi publik minimum melalui RPC get_certificate_verification(cert_no)
CREATE POLICY certificates_select ON public.certificates FOR SELECT
  USING (user_id = auth.uid() OR public.is_training_staff(training_id, ARRAY['admin_kegiatan','pemantau']::public.lms_role[]));

CREATE OR REPLACE FUNCTION public.verify_certificate_public(p_certificate_number TEXT)
RETURNS TABLE (
  certificate_number VARCHAR,
  participant_name VARCHAR,
  training_name VARCHAR,
  organizer VARCHAR,
  issued_at DATE,
  signer_name VARCHAR,
  status VARCHAR
) LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT certificate_number, participant_name, training_name, organizer, issued_at, signer_name, status
  FROM public.certificates
  WHERE certificate_number = p_certificate_number
  LIMIT 1;
$$;

-- 8. activity_logs: append-only (tidak dapat diubah/dihapus)
CREATE POLICY activity_logs_select ON public.activity_logs FOR SELECT
  USING (public.has_role('super_admin') OR (training_id IS NOT NULL AND public.is_training_staff(training_id, ARRAY['admin_kegiatan','pemantau']::public.lms_role[])));
CREATE POLICY activity_logs_insert ON public.activity_logs FOR INSERT
  WITH CHECK (actor_id = auth.uid());

-- 9. Supabase Storage: Bucket privat 'lms-materials' (akses via Signed URL saja)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('lms-materials', 'lms-materials', false) ON CONFLICT DO NOTHING;
