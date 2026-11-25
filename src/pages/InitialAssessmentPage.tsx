import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Layers,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useLms } from '../context/LmsContext';
import { QuestionRunner } from '../components/QuestionRunner';
import { LEVEL_NAMES, LEVEL_SHORT_NAMES, SAMR_LEVEL_META } from '../types/lms';

export default function InitialAssessmentPage() {
  const {
    currentUser,
    effectiveRole,
    trainings,
    enrollments,
    questionBanks,
    attempts,
  } = useLms();

  const isPeserta = effectiveRole === 'peserta';

  const myEnrollments = useMemo(
    () => enrollments.filter((e) => e.userId === currentUser?.uid),
    [enrollments, currentUser],
  );

  const availableTrainings = useMemo(() => {
    if (isPeserta) {
      const ids = new Set(myEnrollments.map((e) => e.trainingId));
      return trainings.filter((t) => ids.has(t.id));
    }
    return trainings;
  }, [isPeserta, myEnrollments, trainings]);

  const [selectedTrainingId, setSelectedTrainingId] = useState<string>(
    availableTrainings[0]?.id || trainings[0]?.id || '',
  );

  const activeTraining =
    availableTrainings.find((t) => t.id === selectedTrainingId) ||
    availableTrainings[0] ||
    trainings[0];

  const myEnrollment = useMemo(
    () =>
      myEnrollments.find((e) => e.trainingId === activeTraining?.id) || null,
    [myEnrollments, activeTraining],
  );

  const assessBank = useMemo(
    () =>
      questionBanks.find(
        (b) => b.trainingId === activeTraining?.id && b.kind === 'assessment' && b.isActive,
      ),
    [questionBanks, activeTraining],
  );

  const myAssessAttempts = useMemo(
    () =>
      attempts.filter(
        (a) =>
          a.trainingId === activeTraining?.id &&
          a.kind === 'assessment' &&
          a.userId === currentUser?.uid,
      ),
    [attempts, activeTraining, currentUser],
  );

  // Untuk Staff & Pemantau: ringkasan hasil asesmen awal peserta pada kegiatan aktif
  const trainingEnrollments = useMemo(
    () => enrollments.filter((e) => e.trainingId === activeTraining?.id),
    [enrollments, activeTraining],
  );

  const staffStats = useMemo(() => {
    const assessed = trainingEnrollments.filter((e) => e.assessmentScore >= 0);
    const avg =
      assessed.length > 0
        ? Math.round(
            assessed.reduce((acc, e) => acc + e.assessmentScore, 0) / assessed.length,
          )
        : 0;
    const dist = ([1, 2, 3, 4] as const).map((lv) => ({
      level: lv,
      name: LEVEL_SHORT_NAMES[lv],
      count: assessed.filter((e) => e.startingLevel === lv).length,
    }));
    return {
      total: trainingEnrollments.length,
      assessedCount: assessed.length,
      pendingCount: trainingEnrollments.length - assessed.length,
      avgScore: avg,
      dist,
    };
  }, [trainingEnrollments]);

  if (!activeTraining) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-600">
          Belum ada kegiatan pelatihan aktif yang Anda ikuti. Silakan mendaftar melalui menu Kegiatan Pelatihan.
        </p>
        <Link
          to="/kegiatan"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0F2544] px-4 py-2 text-sm font-semibold text-white"
        >
          Lihat Katalog Kegiatan
        </Link>
      </div>
    );
  }

  // Tampilan Peserta
  if (isPeserta) {
    const placedLevel =
      myEnrollment && myEnrollment.startingLevel >= 1 && myEnrollment.startingLevel <= 4
        ? (myEnrollment.startingLevel as 1 | 2 | 3 | 4)
        : null;
    const placedMeta = placedLevel ? SAMR_LEVEL_META[placedLevel] : null;

    return (
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
              Pemetaan Kompetensi Awal · Model SAMR
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#0F2544]">
              Asesmen Awal Kompetensi PID
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Hasil asesmen menentukan level SAMR awal yang paling sesuai dengan kemampuan Anda saat ini.
            </p>
          </div>
          {availableTrainings.length > 1 && (
            <select
              value={activeTraining.id}
              onChange={(e) => setSelectedTrainingId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
            >
              {availableTrainings.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} — {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Status Menunggu Persetujuan */}
        {myEnrollment?.status === 'menunggu' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <h2 className="font-display text-base font-bold text-amber-950">
                  Pendaftaran Menunggu Verifikasi Admin Kegiatan
                </h2>
                <p className="mt-1 text-sm text-amber-900">
                  Anda telah terdaftar pada <strong>{activeTraining.name}</strong>. Asesmen Awal Kompetensi akan terbuka segera setelah Admin Kegiatan menyetujui pendaftaran Anda.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status Ditolak */}
        {myEnrollment?.status === 'ditolak' && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-rose-600" />
              <div>
                <h2 className="font-display text-base font-bold text-rose-950">
                  Pendaftaran Tidak Disetujui
                </h2>
                <p className="mt-1 text-sm text-rose-900">
                  Silakan hubungi Admin Kegiatan atau pilih jadwal kegiatan lainnya pada menu Kegiatan Pelatihan.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sudah Selesai Asesmen Awal -> Halaman Hasil Asesmen Awal Lengkap */}
        {myEnrollment && placedLevel && placedMeta && (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="bg-[#0F2544] px-6 py-6 text-white">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                      Hasil Asesmen Awal Kompetensi · Terverifikasi Sistem
                    </div>
                    <h2 className="mt-1 font-display text-2xl font-bold">
                      Rekomendasi: Level {placedLevel} — {placedMeta.name} ({placedMeta.indonesianName})
                    </h2>
                    <div className="mt-1 text-xs text-slate-300">
                      Peserta: {currentUser?.fullName} · {currentUser?.instansi} · Kegiatan: {activeTraining.name}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-right">
                    <div className="text-[11px] uppercase tracking-wider text-slate-200">
                      Skor Asesmen Awal
                    </div>
                    <div className="font-display text-3xl font-bold tabular-nums text-white">
                      {myEnrollment.assessmentScore}
                      <span className="text-base font-normal text-slate-300">/100</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-12">
                <div className="lg:col-span-7 space-y-5">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Deskripsi Kemampuan Saat Ini
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                      {placedMeta.definition}
                    </p>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Kompetensi yang Perlu Dikembangkan pada Level {placedLevel}
                    </div>
                    <ul className="mt-2 space-y-2 text-sm text-slate-700">
                      {placedMeta.competencies.map((c, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-950">
                    <div className="font-semibold text-[#0F2544]">
                      Aturan Pembelajaran Adaptif Model SAMR
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-700">
                      {placedLevel > 1
                        ? `Karena Anda ditempatkan langsung pada Level ${placedLevel} (${placedMeta.name}), maka Level ${Array.from({ length: placedLevel - 1 }, (_, i) => i + 1).join(' dan ')} berstatus Tidak Diwajibkan. Anda langsung memulai pembelajaran dari Level ${placedLevel} hingga Level 4 (Redefinition).`
                        : 'Anda memulai dari Level 1 (Substitution) sebagai fondasi kuat pengoperasian Papan Interaktif Digital sebelum naik secara berjenjang ke Level 2, 3, dan 4.'}
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-5 flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Target Produk Praktik PID
                      </div>
                      <p className="mt-1 text-sm font-semibold text-[#0F2544]">
                        {placedMeta.practicalProduct}
                      </p>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Peta 4 Level Anda
                      </div>
                      <div className="mt-2 space-y-2">
                        {([1, 2, 3, 4] as const).map((lv) => {
                          const isBelow = lv < placedLevel;
                          const isDone = myEnrollment.completedLevels.includes(lv);
                          const isUnlocked = myEnrollment.unlockedLevels.includes(lv);
                          const statusText = isDone
                            ? 'Selesai'
                            : isBelow
                              ? 'Tidak Diwajibkan'
                              : isUnlocked
                                ? lv === placedLevel
                                  ? 'Direkomendasikan · Aktif'
                                  : 'Sedang Dipelajari'
                                : 'Terkunci';
                          return (
                            <div
                              key={lv}
                              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                            >
                              <span className="font-medium text-slate-800">
                                L{lv} · {LEVEL_SHORT_NAMES[lv]}
                              </span>
                              <span
                                className={`font-semibold ${
                                  isDone
                                    ? 'text-[#059669]'
                                    : isBelow
                                      ? 'text-slate-400'
                                      : isUnlocked
                                        ? 'text-[#1D4ED8]'
                                        : 'text-slate-500'
                                }`}
                              >
                                {statusText}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/pembelajaran?training=${activeTraining.id}&level=${myEnrollment.currentLevel || placedLevel}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    <Sparkles className="h-4 w-4" />
                    Mulai Pembelajaran Level {myEnrollment.currentLevel || placedLevel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Belum mengerjakan Asesmen Awal (status disetujui & startingLevel === 0) */}
        {myEnrollment && myEnrollment.status === 'disetujui' && !placedLevel && (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
                <Layers className="h-4 w-4" />
                Aturan Penempatan Level SAMR ({activeTraining.code})
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {activeTraining.scoreRanges.map((r) => (
                  <div
                    key={r.level}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs"
                  >
                    <div className="font-mono font-bold text-[#0F2544] tabular-nums">
                      Skor {r.min === 0 ? 0 : Math.ceil(r.min)} – {r.max}
                    </div>
                    <div className="mt-0.5 font-semibold text-[#1D4ED8]">
                      Level {r.level}: {LEVEL_NAMES[r.level]}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {assessBank ? (
              <QuestionRunner
                bank={assessBank}
                existingAttempts={myAssessAttempts}
              />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                Instrumen Asesmen Awal belum dipublikasikan oleh Admin Kegiatan.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Tampilan Staff & Pemantau: Rekapitulasi Hasil Asesmen Awal Peserta
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
            Pemetaan Kompetensi Awal · Model SAMR
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-[#0F2544]">
            Hasil Asesmen Awal & Penempatan Level SAMR
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Pantau sebaran hasil diagnostik awal peserta sebelum memulai pembelajaran berbasis Papan Interaktif Digital.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={activeTraining.id}
            onChange={(e) => setSelectedTrainingId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
          >
            {trainings.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code} — {t.name}
              </option>
            ))}
          </select>
          {effectiveRole !== 'pemantau' && (
            <Link
              to="/asesmen-kuis"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F2544] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#173660]"
            >
              <ClipboardCheck className="h-4 w-4" />
              Kelola Soal & Rubrik
            </Link>
          )}
        </div>
      </div>

      {/* Ringkasan Angka */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Sudah Asesmen Awal</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#0F2544] tabular-nums">
            {staffStats.assessedCount}
            <span className="text-sm font-normal text-slate-400">/{staffStats.total}</span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Rata-rata Skor Awal</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#1D4ED8] tabular-nums">
            {staffStats.avgScore}
          </div>
        </div>
        {staffStats.dist.map((d) => (
          <div key={d.level} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">
              L{d.level} · {d.name}
            </div>
            <div className="mt-1 font-display text-2xl font-bold text-[#059669] tabular-nums">
              {d.count}
            </div>
          </div>
        ))}
      </div>

      {/* Tabel Penempatan Peserta */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div className="flex items-center gap-2 text-sm font-bold text-[#0F2544]">
            <Award className="h-4 w-4 text-[#1D4ED8]" />
            Daftar Penempatan Level SAMR ({trainingEnrollments.length} Peserta)
          </div>
          <span className="text-xs text-slate-500">
            Rentang default: 0–40 L1 · 41–60 L2 · 61–80 L3 · 81–100 L4
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Peserta & Sekolah</th>
                <th className="px-4 py-3">Jenjang / Mapel</th>
                <th className="px-4 py-3 text-right">Skor Awal</th>
                <th className="px-4 py-3">Level Direkomendasikan</th>
                <th className="px-4 py-3">Level Aktif</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trainingEnrollments.map((enr) => (
                <tr key={enr.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{enr.userName}</div>
                    <div className="text-xs text-slate-500">
                      {enr.instansi} · {enr.kabupatenKota}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {enr.jenjangPendidikan || 'Umum'} · {enr.mataPelajaran || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                    {enr.assessmentScore >= 0 ? enr.assessmentScore : 'Belum'}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-[#1D4ED8]">
                    {enr.startingLevel >= 1 && enr.startingLevel <= 4
                      ? `Level ${enr.startingLevel} (${LEVEL_SHORT_NAMES[enr.startingLevel as 1 | 2 | 3 | 4]})`
                      : 'Menunggu asesmen'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">
                    {enr.currentLevel >= 1 && enr.currentLevel <= 4
                      ? `Level ${enr.currentLevel} (${LEVEL_SHORT_NAMES[enr.currentLevel as 1 | 2 | 3 | 4]})`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold capitalize text-slate-700">
                    {enr.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
