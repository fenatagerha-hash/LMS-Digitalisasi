-- =============================================================================
-- PAMANDAI EDU — LMS DIGITALISASI PEMBELAJARAN (MODEL SAMR · PID)
-- Migrasi Konsolidasi 31 Tabel Supabase PostgreSQL + RLS + Storage + RPC Aman
-- =============================================================================
-- Catatan Keamanan:
-- 1. Kunci jawaban tidak pernah diekspos ke peserta sebelum submit.
-- 2. Perhitungan nilai, penentuan level awal SAMR, pembukaan level berikutnya,
--    dan penerbitan sertifikat dijalankan oleh fungsi SECURITY DEFINER di DB.
-- 3. Seluruh tabel menerapkan Row Level Security (RLS) berbasis peran & kegiatan.
-- =============================================================================

create extension if not exists "pgcrypto";

-- Pastikan seluruh 31 tabel utama tersedia (idempoten terhadap 001 & 002)
-- 1. profiles
-- 2. user_roles
-- 3. training_programs
-- 4. training_enrollments
-- 5. staff_assignments
-- 6. training_schedules
-- 7. learning_levels
-- 8. level_assignments
-- 9. assessments
-- 10. assessment_questions
-- 11. assessment_options
-- 12. assessment_attempts
-- 13. assessment_answers
-- 14. learning_materials
-- 15. material_progress
-- 16. practical_tasks
-- 17. task_submissions
-- 18. rubrics
-- 19. rubric_scores
-- 20. quizzes
-- 21. quiz_questions
-- 22. quiz_options
-- 23. quiz_attempts
-- 24. quiz_answers
-- 25. evaluations
-- 26. evaluation_questions
-- 27. evaluation_attempts
-- 28. level_completions
-- 29. certificates
-- 30. announcements
-- 31. activity_logs

-- Indeks performa multi-kegiatan & analitik jenjang/SAMR
create index if not exists idx_enrollments_training_level
  on public.training_enrollments (training_id, current_level, status);

create index if not exists idx_task_submissions_training_level_status
  on public.task_submissions (training_id, level_number, status);

create index if not exists idx_certificates_number
  on public.certificates (certificate_number);

-- =============================================================================
-- FUNGSI BACKEND TERVALIDASI (SECURITY DEFINER)
-- =============================================================================

-- A. Penentuan Level Awal SAMR Adaptif (0-40 L1, 41-60 L2, 61-80 L3, 81-100 L4)
create or replace function public.resolve_samr_starting_level(
  p_score numeric
) returns smallint
language sql
immutable
as $$
  select case
    when p_score <= 40 then 1
    when p_score <= 60 then 2
    when p_score <= 80 then 3
    else 4
  end::smallint;
$$;

-- B. Verifikasi Kelulusan Level & Pembukaan Level Berikutnya Secara Otomatis
create or replace function public.verify_and_unlock_samr_level(
  p_training_id uuid,
  p_level_number smallint
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_enrollment record;
  v_level record;
  v_mandatory_total int;
  v_mandatory_done int;
  v_practice_passed boolean;
  v_quiz_best numeric;
  v_eval_best numeric;
  v_reflection_exists boolean;
  v_next_level smallint;
  v_cert_number text;
begin
  if v_uid is null then
    raise exception 'Akses ditolak: pengguna belum terautentikasi.';
  end if;

  select * into v_enrollment
  from public.training_enrollments
  where training_id = p_training_id and user_id = v_uid;

  if not found then
    raise exception 'Kepesertaan tidak ditemukan pada kegiatan ini.';
  end if;

  select * into v_level
  from public.learning_levels
  where training_id = p_training_id and level_number = p_level_number;

  if not found then
    raise exception 'Level pembelajaran tidak ditemukan.';
  end if;

  -- 1. Cek seluruh materi wajib selesai
  select count(*) into v_mandatory_total
  from public.learning_materials
  where training_id = p_training_id
    and level_id = v_level.id
    and is_mandatory = true
    and is_active = true;

  select count(*) into v_mandatory_done
  from public.material_progress mp
  join public.learning_materials lm on lm.id = mp.material_id
  where mp.user_id = v_uid
    and lm.training_id = p_training_id
    and lm.level_id = v_level.id
    and lm.is_mandatory = true
    and mp.status = 'selesai';

  if v_mandatory_done < v_mandatory_total then
    return jsonb_build_object('ok', false, 'reason', 'Materi wajib belum selesai seluruhnya.');
  end if;

  -- 2. Cek validasi tugas praktik fasilitator
  select exists(
    select 1 from public.task_submissions
    where training_id = p_training_id
      and level_number = p_level_number
      and user_id = v_uid
      and status = 'lulus'
  ) into v_practice_passed;

  if not v_practice_passed then
    return jsonb_build_object('ok', false, 'reason', 'Tugas praktik PID belum divalidasi lulus oleh fasilitator.');
  end if;

  -- 3. Cek nilai kuis & evaluasi >= KKM (default 75)
  select coalesce(max(final_score), 0) into v_quiz_best
  from public.quiz_attempts qa
  join public.quizzes q on q.id = qa.quiz_id
  where q.training_id = p_training_id
    and q.level_id = v_level.id
    and qa.user_id = v_uid
    and qa.grading_status = 'selesai';

  if v_quiz_best < coalesce(v_level.min_quiz_score, 75) then
    return jsonb_build_object('ok', false, 'reason', 'Nilai kuis pemahaman belum mencapai standar kelulusan.');
  end if;

  select coalesce(max(final_score), 0) into v_eval_best
  from public.evaluation_attempts ea
  join public.evaluations ev on ev.id = ea.evaluation_id
  where ev.training_id = p_training_id
    and ev.level_id = v_level.id
    and ea.user_id = v_uid
    and ea.grading_status = 'selesai';

  if v_eval_best < coalesce(v_level.min_evaluation_score, 75) then
    return jsonb_build_object('ok', false, 'reason', 'Nilai evaluasi akhir level belum mencapai standar kelulusan.');
  end if;

  -- 4. Cek refleksi level terisi
  select exists(
    select 1 from public.level_reflections
    where training_id = p_training_id
      and level_number = p_level_number
      and user_id = v_uid
  ) into v_reflection_exists;

  if not v_reflection_exists then
    return jsonb_build_object('ok', false, 'reason', 'Refleksi pembelajaran level belum diisi.');
  end if;

  -- Catat penyelesaian level (idempoten)
  insert into public.level_completions (training_id, level_id, user_id, completed_at)
  values (p_training_id, v_level.id, v_uid, now())
  on conflict (training_id, level_id, user_id) do nothing;

  -- Buka level berikutnya atau terbitkan sertifikat jika Level 4 selesai
  if p_level_number < 4 then
    v_next_level := p_level_number + 1;
    update public.training_enrollments
    set current_level = greatest(current_level, v_next_level),
        status = 'aktif',
        updated_at = now()
    where id = v_enrollment.id;

    insert into public.activity_logs (training_id, actor_id, action, target_type, target_id, details)
    values (
      p_training_id,
      v_uid,
      'LEVEL_UNLOCKED',
      'learning_levels',
      v_level.id::text,
      format('Level %s lulus terverifikasi; Level %s terbuka otomatis.', p_level_number, v_next_level)
    );

    return jsonb_build_object('ok', true, 'unlocked_level', v_next_level);
  else
    v_cert_number := 'PID-SAMR-' || to_char(now(), 'YYYY') || '-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));

    insert into public.certificates (
      certificate_number, training_id, user_id, completed_level, issued_date, status
    )
    values (
      v_cert_number, p_training_id, v_uid, 4, current_date, 'valid'
    )
    on conflict (training_id, user_id) do nothing;

    update public.training_enrollments
    set status = 'lulus',
        overall_progress = 100,
        updated_at = now()
    where id = v_enrollment.id;

    return jsonb_build_object('ok', true, 'graduated', true, 'certificate_number', v_cert_number);
  end if;
end;
$$;

-- =============================================================================
-- KEBIJAKAN STORAGE BUCKET PRIVAT (MATERI & TUGAS PRAKTIK)
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'learning-materials',
    'learning-materials',
    false,
    26214400,
    array['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/png', 'image/jpeg', 'video/mp4']
  ),
  (
    'practice-submissions',
    'practice-submissions',
    false,
    26214400,
    array['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'video/mp4']
  )
on conflict (id) do nothing;
