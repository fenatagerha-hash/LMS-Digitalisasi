import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileCheck2,
  FileText,
  Lock,
} from 'lucide-react';
import { useLms } from '../context/LmsContext';
import { evaluateLevelStatus } from '../lib/lmsRules';
import { isSamrTraining, LEVEL_NAMES, LEVEL_SHORT_NAMES, ROLE_LABELS } from '../types/lms';
import { generateCertificatePdf } from '../lib/exporters';

const LEVEL_COLORS = ['#64748B', '#0284C7', '#1D4ED8', '#059669'];

export function DashboardPage() {
  const {
    currentUser,
    effectiveRole,
    profiles,
    trainings,
    levels,
    materials,
    materialProgress,
    enrollments,
    attempts,
    taskSubmissions,
    levelReflections,
    certificates,
    announcements,
    activityLogs,
    institutionSettings,
    approveOrRejectEnrollment,
    enrollInTraining,
  } = useLms();

  if (!currentUser || !effectiveRole) return null;

  // Kegiatan sesuai kewenangan peran (isolasi kewenangan)
  const scopedTrainings = useMemo(() => {
    if (effectiveRole === 'super_admin') return trainings;
    if (effectiveRole === 'admin_kegiatan') {
      const assigned = trainings.filter((t) => t.adminUids.includes(currentUser.uid));
      return assigned.length > 0 ? assigned : trainings;
    }
    if (effectiveRole === 'fasilitator') {
      const assigned = trainings.filter((t) => t.facilitatorUids.includes(currentUser.uid));
      return assigned.length > 0 ? assigned : trainings.slice(0, 1);
    }
    if (effectiveRole === 'pemantau') {
      const assigned = trainings.filter((t) => t.monitorUids.includes(currentUser.uid));
      return assigned.length > 0 ? assigned : trainings;
    }
    return trainings;
  }, [effectiveRole, trainings, currentUser.uid]);

  const scopedTrainingIds = useMemo(
    () => new Set(scopedTrainings.map((t) => t.id)),
    [scopedTrainings],
  );

  const scopedEnrollments = useMemo(
    () => enrollments.filter((e) => scopedTrainingIds.has(e.trainingId)),
    [enrollments, scopedTrainingIds],
  );

  const scopedAttempts = useMemo(
    () => attempts.filter((a) => scopedTrainingIds.has(a.trainingId)),
    [attempts, scopedTrainingIds],
  );

  // Distribusi level aktual SAMR dari data database
  const levelDistribution = useMemo(() => {
    const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const e of scopedEnrollments) {
      const lv = (e.currentLevel || e.startingLevel || 0) as keyof typeof counts;
      counts[lv] = (counts[lv] || 0) + 1;
    }
    return [
      { name: 'L1 · Substitution', jumlah: counts[1] },
      { name: 'L2 · Augmentation', jumlah: counts[2] },
      { name: 'L3 · Modification', jumlah: counts[3] },
      { name: 'L4 · Redefinition', jumlah: counts[4] },
    ];
  }, [scopedEnrollments]);

  const graduationChartData = useMemo(() => {
    return scopedTrainings.map((t) => {
      const list = scopedEnrollments.filter((e) => e.trainingId === t.id);
      const lulus = list.filter((e) => e.status === 'lulus').length;
      const aktif = list.filter((e) => e.status === 'aktif' || e.status === 'disetujui').length;
      const menunggu = list.filter((e) => e.status === 'menunggu').length;
      return { name: t.code, Lulus: lulus, Aktif: aktif, Menunggu: menunggu };
    });
  }, [scopedTrainings, scopedEnrollments]);

  // =========================================================================
  // DASHBOARD 1: SUPER ADMIN
  // =========================================================================
  if (effectiveRole === 'super_admin') {
    const totalPeserta = profiles.filter((p) => p.role === 'peserta').length;
    const sudahAsesmen = enrollments.filter((e) => e.startingLevel >= 1);
    const avgAsesmen =
      sudahAsesmen.length > 0
        ? Math.round(sudahAsesmen.reduce((s, e) => s + Math.max(0, e.assessmentScore), 0) / sudahAsesmen.length)
        : 0;
    const evalDone = attempts.filter((a) => a.kind === 'evaluation' && a.gradingStatus === 'selesai');
    const avgEvalAll =
      evalDone.length > 0
        ? Math.round(evalDone.reduce((s, a) => s + a.finalScore, 0) / evalDone.length)
        : 0;
    const pendingRubricsAll = taskSubmissions.filter((s) => s.status === 'menunggu_penilaian').length;
    const lulusCount = enrollments.filter((e) => e.status === 'lulus').length;
    const completionRate =
      enrollments.length > 0 ? Math.round((lulusCount / enrollments.length) * 100) : 0;

    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Super Admin</h1>
            <p className="text-sm text-slate-600 mt-1">
              Ringkasan lintas kegiatan pelatihan PID berbasis SAMR, penempatan asesmen awal, penilaian rubrik praktik, dan jejak audit.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/kegiatan"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2544] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
            >
              Kelola Kegiatan
            </Link>
            <Link
              to="/asesmen-kuis?tab=rubrik"
              className="px-4 py-2 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap"
            >
              Rubrik Praktik ({pendingRubricsAll})
            </Link>
            <Link
              to="/pengguna"
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
            >
              Manajemen Akun
            </Link>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Kegiatan', value: trainings.length, sub: `${trainings.filter((t) => t.status === 'aktif').length} aktif · ${profiles.length} akun` },
            { label: 'Total Peserta Guru', value: totalPeserta, sub: `${enrollments.length} kepesertaan` },
            { label: 'Sudah Asesmen Awal', value: sudahAsesmen.length, sub: `Rata-rata skor ${avgAsesmen}` },
            { label: 'Rata-rata Evaluasi', value: avgEvalAll, sub: `${evalDone.length} evaluasi dinilai` },
            { label: 'Antrean Rubrik PID', value: pendingRubricsAll, sub: `${taskSubmissions.length} total produk praktik` },
            { label: 'Tingkat Kelulusan', value: `${completionRate}%`, sub: `${lulusCount} bersertifikat` },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">{kpi.label}</p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{kpi.value}</p>
              <p className="text-xs text-slate-500 mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">Distribusi Peserta per Level</h2>
              <p className="text-xs text-slate-500">Berdasarkan posisi level aktif hasil asesmen & progres sekuensial</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={levelDistribution} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip />
                  <Bar dataKey="jumlah" name="Peserta" radius={[6, 6, 0, 0]}>
                    {levelDistribution.map((_, idx) => (
                      <Cell key={idx} fill={LEVEL_COLORS[idx % LEVEL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">Grafik Kelulusan & Status per Kegiatan</h2>
              <p className="text-xs text-slate-500">Perbandingan peserta lulus, aktif belajar, dan menunggu verifikasi</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graduationChartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip />
                  <Bar dataKey="Lulus" fill="#0F766E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Aktif" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Menunggu" fill="#D97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Aktivitas Terbaru (activity_logs) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Aktivitas & Log Audit Terbaru</h2>
              <p className="text-xs text-slate-500">Catatan tidak dapat diubah (append-only) seluruh transaksi kritis</p>
            </div>
            <Link to="/monitoring" className="text-xs font-semibold text-blue-700 hover:underline">
              Lihat Semua Laporan
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="py-2.5 pr-4 font-medium">Waktu</th>
                  <th className="py-2.5 pr-4 font-medium">Aktor</th>
                  <th className="py-2.5 pr-4 font-medium">Aksi</th>
                  <th className="py-2.5 font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {activityLogs.slice(0, 8).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-mono text-slate-500 whitespace-nowrap">
                      {log.createdAt.slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="py-3 pr-4 font-medium text-slate-900 whitespace-nowrap">
                      {log.actorName} · <span className="text-slate-500 font-normal">{log.actorRole}</span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-slate-700 whitespace-nowrap">{log.action}</td>
                    <td className="py-3 text-slate-600">
                      {log.details}
                      {log.overrideReason && (
                        <span className="block text-amber-800 mt-0.5">
                          Alasan Override: {log.overrideReason}
                        </span>
                      )}
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

  // =========================================================================
  // DASHBOARD 2: ADMIN KEGIATAN
  // =========================================================================
  if (effectiveRole === 'admin_kegiatan') {
    const belumAsesmen = scopedEnrollments.filter(
      (e) => e.startingLevel === 0 && e.status !== 'ditolak',
    );
    const menungguVerifikasi = scopedEnrollments.filter((e) => e.status === 'menunggu');
    const avgProgress =
      scopedEnrollments.length > 0
        ? Math.round(
            scopedEnrollments.reduce((acc, e) => acc + e.overallProgress, 0) /
              scopedEnrollments.length,
          )
        : 0;
    const quizAttempts = scopedAttempts.filter((a) => a.kind === 'quiz' && a.gradingStatus === 'selesai');
    const evalAttempts = scopedAttempts.filter((a) => a.kind === 'evaluation' && a.gradingStatus === 'selesai');
    const avgQuiz =
      quizAttempts.length > 0
        ? Math.round(quizAttempts.reduce((acc, a) => acc + a.finalScore, 0) / quizAttempts.length)
        : 0;
    const avgEval =
      evalAttempts.length > 0
        ? Math.round(evalAttempts.reduce((acc, a) => acc + a.finalScore, 0) / evalAttempts.length)
        : 0;
    const lulusCount = scopedEnrollments.filter((e) => e.status === 'lulus').length;
    const gradRate =
      scopedEnrollments.length > 0 ? Math.round((lulusCount / scopedEnrollments.length) * 100) : 0;

    const sudahAsesmenAdmin = scopedEnrollments.filter((e) => e.startingLevel >= 1);
    const avgAsesmenAdmin =
      sudahAsesmenAdmin.length > 0
        ? Math.round(
            sudahAsesmenAdmin.reduce((s, e) => s + Math.max(0, e.assessmentScore), 0) /
              sudahAsesmenAdmin.length,
          )
        : 0;
    const pendingRubricsAdmin = taskSubmissions.filter(
      (s) => s.status === 'menunggu_penilaian' && scopedTrainingIds.has(s.trainingId),
    ).length;

    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Admin Kegiatan</h1>
            <p className="text-sm text-slate-600 mt-1">
              Mengelola {scopedTrainings.length} kegiatan SAMR-PID yang ditugaskan · {scopedTrainings.map((t) => t.code).join(', ')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/pengguna"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2544] hover:bg-slate-800 rounded-lg whitespace-nowrap"
            >
              Impor Peserta Excel
            </Link>
            <Link
              to="/kegiatan"
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap"
            >
              Atur Rentang SAMR
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Peserta Kegiatan', value: scopedEnrollments.length, sub: `${belumAsesmen.length} belum asesmen` },
            { label: 'Sudah Asesmen Awal', value: sudahAsesmenAdmin.length, sub: `Rata-rata ${avgAsesmenAdmin}` },
            { label: 'Rata-rata Progres', value: `${avgProgress}%`, sub: 'Materi & level SAMR' },
            { label: 'Rata-rata Kuis / Eval', value: `${avgQuiz} / ${avgEval}`, sub: `${quizAttempts.length + evalAttempts.length} percobaan` },
            { label: 'Antrean Rubrik PID', value: pendingRubricsAdmin, sub: 'Menunggu fasilitator' },
            { label: 'Tingkat Kelulusan', value: `${gradRate}%`, sub: `${lulusCount} lulus` },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">{kpi.label}</p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{kpi.value}</p>
              <p className="text-xs text-slate-500 mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Persetujuan pendaftaran mandiri */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Antrean Persetujuan Peserta Mandiri</h2>
                <p className="text-xs text-slate-500">Peserta menunggu verifikasi sebelum dapat memulai asesmen awal</p>
              </div>
              <span className="text-xs font-semibold text-amber-800 tabular-nums">
                {menungguVerifikasi.length} menunggu
              </span>
            </div>
            {menungguVerifikasi.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                Seluruh pendaftaran mandiri pada kegiatan Anda sudah diverifikasi.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {menungguVerifikasi.map((enr) => {
                  const trn = trainings.find((t) => t.id === enr.trainingId);
                  return (
                    <div key={enr.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{enr.userName}</p>
                        <p className="text-xs text-slate-500">
                          {enr.instansi} · {enr.kabupatenKota} · {trn?.code}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void approveOrRejectEnrollment(enr.id, 'disetujui')}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                        >
                          Setujui
                        </button>
                        <button
                          type="button"
                          onClick={() => void approveOrRejectEnrollment(enr.id, 'ditolak')}
                          className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg"
                        >
                          Tolak
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Distribusi level kegiatan */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Distribusi Level Peserta</h2>
            <p className="text-xs text-slate-500 mb-4">Komposisi peserta pada kegiatan yang dikelola</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={levelDistribution} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip />
                  <Bar dataKey="jumlah" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DASHBOARD 3: FASILITATOR
  // =========================================================================
  if (effectiveRole === 'fasilitator') {
    const myMaterials = materials.filter(
      (m) => scopedTrainingIds.has(m.trainingId) || m.createdBy === currentUser.uid,
    );
    const needHelpEnrollments = scopedEnrollments.filter((enr) => {
      const hasFailed = scopedAttempts.some(
        (a) => a.userId === enr.userId && a.trainingId === enr.trainingId && !a.passed && a.kind !== 'assessment',
      );
      return hasFailed || (enr.status === 'aktif' && enr.overallProgress < 25);
    });
    const pendingManual = scopedAttempts.filter((a) => a.gradingStatus === 'menunggu_manual');
    const pendingRubrics = taskSubmissions.filter(
      (s) => s.status === 'menunggu_penilaian' && scopedTrainingIds.has(s.trainingId),
    );

    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Fasilitator</h1>
            <p className="text-sm text-slate-600 mt-1">
              Pendampingan guru peserta PID, penilaian rubrik praktik (skala 1–4), koreksi manual isian, dan pengelolaan materi SAMR.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/asesmen-kuis?tab=rubrik"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-blue-800 rounded-lg whitespace-nowrap"
            >
              <FileCheck2 className="w-4 h-4" />
              Nilai Rubrik Praktik ({pendingRubrics.length})
            </Link>
            <Link
              to="/asesmen-kuis?tab=manual"
              className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap"
            >
              Koreksi Isian ({pendingManual.length})
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Kegiatan Ditangani</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{scopedTrainings.length}</p>
            <p className="text-xs text-slate-500 mt-1">{scopedTrainings.map((t) => t.code).join(', ')}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Peserta Dampingan</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{scopedEnrollments.length}</p>
            <p className="text-xs text-slate-500 mt-1">Lintas Level SAMR 1–4</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Antrean Rubrik Praktik</p>
            <p className="text-2xl font-bold text-blue-700 tabular-nums mt-1">{pendingRubrics.length}</p>
            <p className="text-xs text-slate-500 mt-1">Produk PID menunggu nilai</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Membutuhkan Bantuan</p>
            <p className="text-2xl font-bold text-amber-700 tabular-nums mt-1">{needHelpEnrollments.length}</p>
            <p className="text-xs text-slate-500 mt-1">Di bawah KKM / progres rendah</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Materi Dikelola</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{myMaterials.length}</p>
            <p className="text-xs text-slate-500 mt-1">{pendingManual.length} isian menunggu koreksi</p>
          </div>
        </div>

        {/* Antrean Rubrik Praktik PID */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-blue-700" />
                Antrean Penilaian Rubrik Praktik PID ({pendingRubrics.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Produk praktik pemanfaatan Papan Interaktif Digital yang dikirim peserta dan menunggu penilaian rubrik 6 aspek (skala 1–4).
              </p>
            </div>
            <Link
              to="/asesmen-kuis?tab=rubrik"
              className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
            >
              Buka Formulir Rubrik
            </Link>
          </div>
          {pendingRubrics.length === 0 ? (
            <p className="text-xs text-slate-500 py-3">
              Seluruh tugas praktik PID pada kegiatan Anda sudah dinilai.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingRubrics.slice(0, 5).map((sub) => (
                <div key={sub.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{sub.title}</p>
                    <p className="text-slate-500 mt-0.5">
                      {sub.userName} · Level {sub.levelNumber} ({LEVEL_SHORT_NAMES[sub.levelNumber]}) ·{' '}
                      {sub.productFileName || 'Tautan Produk'}
                    </p>
                  </div>
                  <Link
                    to="/asesmen-kuis?tab=rubrik"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-white bg-[#0F2544] hover:bg-slate-800 rounded-lg whitespace-nowrap"
                  >
                    Nilai Sekarang
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700" />
                Peserta Membutuhkan Pendampingan
              </h2>
              <Link to="/monitoring" className="text-xs font-semibold text-blue-700 hover:underline">
                Rekap Lengkap
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {needHelpEnrollments.slice(0, 6).map((enr) => (
                <div key={enr.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{enr.userName}</p>
                    <p className="text-slate-500">
                      {enr.instansi} · Level {enr.currentLevel || '-'}
                      {enr.currentLevel >= 1 && enr.currentLevel <= 4
                        ? ` (${LEVEL_SHORT_NAMES[enr.currentLevel as 1 | 2 | 3 | 4]})`
                        : ''}
                    </p>
                  </div>
                  <span className="font-mono text-amber-800 tabular-nums">
                    Progres {enr.overallProgress}%
                  </span>
                </div>
              ))}
              {needHelpEnrollments.length === 0 && (
                <p className="text-xs text-slate-500 py-4">Tidak ada peserta berisiko saat ini.</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-700" />
                Daftar Materi yang Dikelola
              </h2>
              <Link to="/pembelajaran" className="text-xs font-semibold text-blue-700 hover:underline">
                Kelola Materi
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {myMaterials.slice(0, 6).map((mat) => (
                <div key={mat.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{mat.title}</p>
                    <p className="text-slate-500">
                      Level {mat.levelNumber} ({LEVEL_SHORT_NAMES[mat.levelNumber]}) · {mat.contentType.toUpperCase()} · {mat.isMandatory ? 'Wajib' : 'Opsional'}
                    </p>
                  </div>
                  <span className="font-mono text-slate-500 whitespace-nowrap">{mat.durationMinutes} mnt</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DASHBOARD 4: PEMANTAU (READ-ONLY)
  // =========================================================================
  if (effectiveRole === 'pemantau') {
    const lulusCount = scopedEnrollments.filter((e) => e.status === 'lulus').length;
    const completionPct =
      scopedEnrollments.length > 0 ? Math.round((lulusCount / scopedEnrollments.length) * 100) : 0;
    const scored = scopedAttempts.filter((a) => a.gradingStatus === 'selesai');
    const avgScore =
      scored.length > 0
        ? Math.round(scored.reduce((acc, a) => acc + a.finalScore, 0) / scored.length)
        : 0;

    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Supervisor (Akses Baca)</h1>
            <p className="text-sm text-slate-600 mt-1">
              Supervisi capaian indikator pembelajaran, distribusi level, dan pelaporan akuntabilitas tanpa hak ubah data.
            </p>
          </div>
          <Link
            to="/monitoring"
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap"
          >
            Buka Laporan & Ekspor Excel/PDF
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Kegiatan Dipantau</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{scopedTrainings.length}</p>
            <p className="text-xs text-slate-500 mt-1">Program aktif</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Total Peserta</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{scopedEnrollments.length}</p>
            <p className="text-xs text-slate-500 mt-1">Terdaftar pada cakupan</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Persentase Penyelesaian</p>
            <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">{completionPct}%</p>
            <p className="text-xs text-slate-500 mt-1">{lulusCount} peserta lulus</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Rata-rata Nilai</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{avgScore}</p>
            <p className="text-xs text-slate-500 mt-1">Dari {scored.length} penilaian</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Distribusi Level Kompetensi</h2>
            <p className="text-xs text-slate-500 mb-4">Sebaran peserta aktif berdasarkan 4 level pelatihan</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={levelDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip />
                  <Bar dataKey="jumlah" name="Peserta" fill="#0F766E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Ringkasan Hasil per Kegiatan</h2>
            <p className="text-xs text-slate-500 mb-4">Perbandingan peserta lulus vs aktif belajar</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graduationChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip />
                  <Bar dataKey="Lulus" fill="#0F766E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Aktif" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DASHBOARD 5: PESERTA
  // =========================================================================
  const myEnrollments = enrollments.filter(
    (e) => e.userId === currentUser.uid && e.status !== 'ditolak',
  );
  const myEnrolledTrainingIds = new Set(myEnrollments.map((e) => e.trainingId));
  const myAnnouncements = announcements.filter(
    (ann) => !ann.trainingId || myEnrolledTrainingIds.has(ann.trainingId),
  );
  const myAttempts = attempts.filter((a) => a.userId === currentUser.uid);
  const myCerts = certificates.filter((c) => c.userId === currentUser.uid);
  const availableTrainings = trainings.filter(
    (t) => t.status === 'aktif' && !myEnrolledTrainingIds.has(t.id),
  );

  const avgQuizMe = (() => {
    const list = myAttempts.filter((a) => a.kind === 'quiz' && a.gradingStatus === 'selesai');
    return list.length > 0 ? Math.round(list.reduce((s, a) => s + a.finalScore, 0) / list.length) : null;
  })();
  const avgEvalMe = (() => {
    const list = myAttempts.filter((a) => a.kind === 'evaluation' && a.gradingStatus === 'selesai');
    return list.length > 0 ? Math.round(list.reduce((s, a) => s + a.finalScore, 0) / list.length) : null;
  })();
  const completedMaterialsCount = materialProgress.filter(
    (p) => p.userId === currentUser.uid && p.status === 'selesai',
  ).length;
  const pendingPracticeCount = taskSubmissions.filter(
    (s) => s.userId === currentUser.uid && s.status === 'menunggu_penilaian',
  ).length;

  const initials = currentUser.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-[#dee2e6] rounded-xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#0f6cbf] text-white font-bold text-base flex items-center justify-center shrink-0">
            {initials || 'GR'}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#212529]">
              Selamat Datang, {currentUser.fullName}
            </h1>
            <p className="text-xs sm:text-sm text-[#6c757d] mt-0.5">
              {ROLE_LABELS[effectiveRole]}
              {currentUser.jenjangPendidikan ? ` · ${currentUser.jenjangPendidikan}` : ''}
              {currentUser.mataPelajaran ? ` · ${currentUser.mataPelajaran}` : ''}
              {` · ${currentUser.instansi} · ${currentUser.kabupatenKota}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/kegiatan?aktivitas=pretest"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#212529] bg-[#f4f6f9] border border-[#dee2e6] hover:bg-[#e9ecef] rounded-lg transition-colors whitespace-nowrap"
          >
            <ClipboardCheck className="w-4 h-4 text-[#0f6cbf]" />
            Asesmen Awal Kegiatan
          </Link>
          <Link
            to="/kegiatan"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4" />
            Pelatihan Saya
          </Link>
        </div>
      </div>

      {/* Ringkasan Metrik Peserta (Lengkap sesuai Dashboard Peserta PAMANDAI EDU) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-[#dee2e6] rounded-xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <p className="text-xs text-[#6c757d]">Kegiatan Diikuti</p>
          <p className="text-2xl font-bold text-[#212529] tabular-nums mt-1">{myEnrollments.length}</p>
          <p className="text-xs text-[#6c757d] mt-1">Program aktif & lulus</p>
        </div>
        <div className="bg-white border border-[#dee2e6] rounded-xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <p className="text-xs text-[#6c757d]">Materi Selesai</p>
          <p className="text-2xl font-bold text-[#0f6cbf] tabular-nums mt-1">{completedMaterialsCount}</p>
          <p className="text-xs text-[#6c757d] mt-1">Modul terverifikasi</p>
        </div>
        <div className="bg-white border border-[#dee2e6] rounded-xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <p className="text-xs text-[#6c757d]">Tugas Menunggu Validasi</p>
          <p className="text-2xl font-bold text-amber-700 tabular-nums mt-1">{pendingPracticeCount}</p>
          <p className="text-xs text-[#6c757d] mt-1">Antrean fasilitator</p>
        </div>
        <div className="bg-white border border-[#dee2e6] rounded-xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <p className="text-xs text-[#6c757d]">Nilai Kuis Rata-rata</p>
          <p className="text-2xl font-bold text-[#212529] tabular-nums mt-1">
            {avgQuizMe !== null ? avgQuizMe : '—'}
          </p>
          <p className="text-xs text-[#6c757d] mt-1">Kuis pemahaman</p>
        </div>
        <div className="bg-white border border-[#dee2e6] rounded-xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <p className="text-xs text-[#6c757d]">Nilai Evaluasi</p>
          <p className="text-2xl font-bold text-[#212529] tabular-nums mt-1">
            {avgEvalMe !== null ? avgEvalMe : '—'}
          </p>
          <p className="text-xs text-[#6c757d] mt-1">Level tuntas: {myEnrollments.reduce((acc, e) => acc + e.completedLevels.length, 0)}</p>
        </div>
        <div className="bg-white border border-[#dee2e6] rounded-xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <p className="text-xs text-[#6c757d]">Sertifikat Digital</p>
          <p className="text-2xl font-bold text-[#198754] tabular-nums mt-1">{myCerts.length}</p>
          <p className="text-xs text-[#6c757d] mt-1">Siap diunduh PDF</p>
        </div>
      </div>

      {/* Pelatihan Aktif Peserta (Hanya Kegiatan yang Diikuti) */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">
            Kegiatan Pelatihan yang Saya Ikuti ({myEnrollments.length})
          </h2>
          <span className="text-xs text-slate-500">
            Hanya menampilkan kegiatan yang telah Anda daftarkan atau ikuti
          </span>
        </div>
        {myEnrollments.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-600">
            Anda belum terdaftar pada kegiatan pelatihan apa pun. Pilih kegiatan pada bagian rekomendasi di bawah ini untuk memulai.
          </div>
        ) : (
          <div className="space-y-6">
            {myEnrollments.map((enr) => {
              const trn = trainings.find((t) => t.id === enr.trainingId);
              if (!trn) return null;
              const trnUsesSamr = isSamrTraining(trn);
              const cert = myCerts.find((c) => c.trainingId === enr.trainingId);
              const trnLevels = levels
                .filter((l) => l.trainingId === trn.id)
                .sort((a, b) => a.levelNumber - b.levelNumber);
              const startLvlName =
                enr.startingLevel >= 1
                  ? `Level ${enr.startingLevel} · ${LEVEL_NAMES[enr.startingLevel as 1 | 2 | 3 | 4]}`
                  : 'Belum Asesmen Awal';

              return (
                <div
                  key={enr.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold text-slate-700">{trn.code}</span>
                        <span>·</span>
                        <span>{trn.organizer}</span>
                        <span>·</span>
                        <span className="font-medium text-slate-700">
                          {trnUsesSamr ? 'Model 4 Level SAMR' : 'Modul Berurutan Standar'}
                        </span>
                        <span>·</span>
                        <span
                          className={`font-semibold ${
                            enr.status === 'lulus'
                              ? 'text-emerald-700'
                              : enr.status === 'menunggu'
                                ? 'text-amber-700'
                                : 'text-blue-700'
                          }`}
                        >
                          Status: {enr.status.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{trn.name}</h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {enr.status === 'menunggu' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-amber-800 font-medium">
                          <Clock className="w-4 h-4" />
                          Menunggu persetujuan Admin Kegiatan
                        </span>
                      ) : enr.assessmentScore < 0 && enr.startingLevel === 0 ? (
                        <Link
                          to={`/kegiatan?training=${trn.id}&aktivitas=pretest`}
                          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-blue-800 rounded-lg"
                        >
                          <ClipboardCheck className="w-4 h-4" />
                          Kerjakan Asesmen Awal
                        </Link>
                      ) : (
                        <>
                          <Link
                            to={`/kegiatan?training=${trn.id}&aktivitas=pretest`}
                            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
                          >
                            Hasil Asesmen Awal
                          </Link>
                          <Link
                            to={`/kegiatan?training=${trn.id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F2544] hover:bg-slate-800 rounded-lg"
                          >
                            {trnUsesSamr ? `Lanjutkan Level ${enr.currentLevel}` : 'Buka Ruang Kegiatan'}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </>
                      )}

                      {cert && (
                        <button
                          type="button"
                          onClick={() =>
                            void generateCertificatePdf(cert, {
                              templateTitle: trn.certTemplateTitle,
                              templateSubtitle: trn.certTemplateSubtitle,
                              accentColor: trn.certAccentColor || 'navy',
                              appName: institutionSettings.appName,
                              logoUrl: trn.certLogoUrl,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg"
                        >
                          <Award className="w-4 h-4" />
                          Unduh Sertifikat PDF
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-3 border-y border-slate-100 text-xs">
                    <div>
                      <p className="text-slate-500">Hasil Asesmen Awal</p>
                      <p className="font-semibold text-slate-900 tabular-nums mt-0.5">
                        {enr.assessmentScore >= 0 ? `${enr.assessmentScore} / 100` : 'Belum dikerjakan'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">
                        {trnUsesSamr ? 'Rekomendasi Level SAMR' : 'Alur Pembelajaran'}
                      </p>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        {trnUsesSamr ? startLvlName : 'Modul Berurutan (Tanpa Level SAMR)'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Progres Belajar Keseluruhan</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#1D4ED8] h-full transition-all"
                            style={{ width: `${enr.overallProgress}%` }}
                          />
                        </div>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {enr.overallProgress}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Kartu Level SAMR Adaptif — HANYA untuk kegiatan Digitalisasi Pembelajaran */}
                  {trnUsesSamr ? (
                    trnLevels.length > 0 && (
                      <div className="space-y-2.5">
                        {enr.startingLevel >= 1 && (
                          <p className="text-[11px] text-slate-600 bg-blue-50/70 border border-blue-100 rounded-lg px-3 py-2">
                            {enr.startingLevel === 1 ? (
                              <>
                                Hasil asesmen awal menempatkan Anda pada{' '}
                                <strong className="text-slate-900">Level 1 (Substitution)</strong>.
                                Selesaikan materi secara berurutan mulai dari Level 1 hingga Level 4.
                              </>
                            ) : (
                              <>
                                Hasil asesmen awal menempatkan Anda pada{' '}
                                <strong className="text-slate-900">
                                  Level {enr.startingLevel} ({LEVEL_SHORT_NAMES[enr.startingLevel]})
                                </strong>
                                . Anda dapat langsung mengakses dan memulai kegiatan dari Level{' '}
                                {enr.startingLevel}. Materi{' '}
                                {enr.startingLevel === 2
                                  ? 'Level 1'
                                  : `Level 1 s.d. Level ${enr.startingLevel - 1}`}{' '}
                                tetap terbuka sebagai referensi (tidak wajib).
                              </>
                            )}
                          </p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {trnLevels.map((lv) => {
                            const summary = evaluateLevelStatus({
                              enrollment: enr,
                              level: lv,
                              materials,
                              progressList: materialProgress,
                              attempts,
                              taskSubmissions,
                              reflections: levelReflections,
                            });
                            const isUnlocked = enr.unlockedLevels.includes(lv.levelNumber);
                            const isBelowStarting =
                              enr.startingLevel > 1 && lv.levelNumber < enr.startingLevel;
                            const canOpen = isUnlocked || isBelowStarting;
                            const isRecommended =
                              enr.startingLevel === lv.levelNumber && summary.status === 'terbuka';
                            const statusText =
                              summary.status === 'lulus'
                                ? 'Selesai'
                                : isBelowStarting
                                  ? 'Tidak Wajib · Terbuka'
                                  : isRecommended
                                    ? 'Mulai di Sini (Wajib)'
                                    : summary.status === 'sedang_dipelajari' ||
                                        summary.status === 'menunggu_evaluasi'
                                      ? 'Sedang Dipelajari'
                                      : summary.status === 'belum_lulus'
                                        ? 'Perlu Perbaikan'
                                        : isUnlocked
                                          ? 'Terbuka (Wajib)'
                                          : 'Terkunci';
                            const statusColor =
                              summary.status === 'lulus'
                                ? 'text-emerald-700'
                                : isBelowStarting
                                  ? 'text-slate-600'
                                  : isRecommended || summary.status === 'sedang_dipelajari'
                                    ? 'text-blue-700'
                                    : summary.status === 'belum_lulus'
                                      ? 'text-red-700'
                                      : 'text-slate-500';

                            const cardInner = (
                              <div
                                className={`h-full p-4 rounded-xl border transition-colors flex flex-col justify-between space-y-2.5 ${
                                  isUnlocked
                                    ? 'bg-white border-slate-200 hover:border-[#1D4ED8]'
                                    : isBelowStarting
                                      ? 'bg-slate-50/90 border-dashed border-slate-300 hover:border-slate-500 hover:bg-white'
                                      : 'bg-slate-50/70 border-slate-200/80 opacity-80'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2 text-[11px]">
                                    <span className="font-mono font-semibold text-slate-600">
                                      Level {lv.levelNumber} · {LEVEL_SHORT_NAMES[lv.levelNumber]}
                                    </span>
                                    {summary.status === 'lulus' ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : isBelowStarting ? (
                                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                                    ) : !canOpen ? (
                                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                                    ) : null}
                                  </div>
                                  <p className="text-xs font-bold text-slate-900 mt-1 line-clamp-2">
                                    {lv.title}
                                  </p>
                                </div>
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                  <span className={`font-semibold ${statusColor}`}>{statusText}</span>
                                  <span className="font-mono text-slate-500 tabular-nums">
                                    {summary.mandatoryCompleted}/{summary.mandatoryTotal} materi
                                  </span>
                                </div>
                              </div>
                            );

                            return canOpen ? (
                              <Link
                                key={lv.id}
                                to={`/kegiatan?training=${trn.id}&level=${lv.levelNumber}`}
                                className="block"
                              >
                                {cardInner}
                              </Link>
                            ) : (
                              <div key={lv.id}>{cardInner}</div>
                            );
                          })}
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#e9ecef] flex flex-wrap items-center justify-between gap-3 text-xs text-[#495057]">
                      <span>
                        Kegiatan ini menggunakan alur modul berurutan standar. Asesmen awal, eksplorasi materi, kuis, dan evaluasi diakses langsung saat membuka kegiatan.
                      </span>
                      <Link
                        to={`/kegiatan?training=${trn.id}`}
                        className="font-semibold text-[#0f6cbf] hover:underline whitespace-nowrap"
                      >
                        Masuk ke Ruang Kegiatan →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rekomendasi Kegiatan yang Bisa Diikuti Selanjutnya */}
      {availableTrainings.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Rekomendasi Kegiatan yang Bisa Diikuti Selanjutnya
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kegiatan aktif yang direkomendasikan untuk memperluas kompetensi Anda berikutnya.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {availableTrainings.map((trn) => {
              const trnUsesSamr = isSamrTraining(trn);
              return (
                <div key={trn.id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-[#0f6cbf]">{trn.code}</span>
                      <span className="text-[11px] font-semibold text-emerald-700">
                        {trnUsesSamr
                          ? 'Rekomendasi · Model 4 Level SAMR'
                          : 'Rekomendasi Lanjutan · Modul Standar'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1.5">{trn.name}</h3>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{trn.description}</p>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Jadwal: {trn.startDate} s.d. {trn.endDate} · Kuota {trn.quota} peserta
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500">
                      {trn.requireApproval ? 'Verifikasi Panitia aktif' : 'Pendaftaran langsung aktif'}
                    </span>
                    <button
                      type="button"
                      onClick={() => void enrollInTraining(trn.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Daftar & Ikuti Kegiatan
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pengumuman (Khusus Kegiatan yang Diikuti Peserta) */}
      {myAnnouncements.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <h2 className="text-base font-bold text-slate-900">Pengumuman Kegiatan Saya</h2>
          <div className="divide-y divide-slate-100">
            {myAnnouncements.slice(0, 4).map((ann) => (
              <div key={ann.id} className="py-3">
                <p className="text-sm font-semibold text-slate-900">{ann.title}</p>
                <p className="text-xs text-slate-600 mt-1">{ann.body}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Oleh {ann.authorName} · {ann.createdAt.slice(0, 10)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
