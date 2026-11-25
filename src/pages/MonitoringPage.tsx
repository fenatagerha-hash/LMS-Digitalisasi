import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, FileSpreadsheet, FileText, Search } from 'lucide-react';
import { useLms } from '../context/LmsContext';
import { exportMonitoringToExcel, exportMonitoringToPdf } from '../lib/exporters';
import { JENJANG_OPTIONS, LEVEL_SHORT_NAMES } from '../types/lms';

const PIE_COLORS = ['#059669', '#1D4ED8', '#D97706', '#64748B', '#DC2626'];

export function MonitoringPage() {
  const {
    currentUser,
    effectiveRole,
    profiles,
    trainings,
    levels,
    materials,
    enrollments,
    attempts,
    taskSubmissions,
    activityLogs,
    institutionSettings,
    showToast,
  } = useLms();

  const [tab, setTab] = useState<'peserta' | 'fasilitator' | 'aktivitas'>('peserta');
  const [reportType, setReportType] = useState<
    | 'rekap_peserta'
    | 'asesmen_awal'
    | 'distribusi_samr'
    | 'progres_belajar'
    | 'tugas_praktik'
    | 'hasil_kuis'
    | 'evaluasi_kegiatan'
    | 'kelulusan'
  >('rekap_peserta');

  // 7 Filter multi-dimensi (Kegiatan, Kab/Kota, Jenjang, Satuan Pendidikan, Fasilitator, Level SAMR, Status)
  const [nameQuery, setNameQuery] = useState('');
  const [trainingFilter, setTrainingFilter] = useState('all');
  const [instansiFilter, setInstansiFilter] = useState('all');
  const [jenjangFilter, setJenjangFilter] = useState('all');
  const [kotaFilter, setKotaFilter] = useState('all');
  const [facilitatorFilter, setFacilitatorFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const scopedTrainings = useMemo(() => {
    if (!currentUser) return [];
    if (effectiveRole === 'super_admin') return trainings;
    if (effectiveRole === 'admin_kegiatan') {
      const assigned = trainings.filter((t) => t.adminUids.includes(currentUser.uid));
      return assigned.length > 0 ? assigned : trainings;
    }
    if (effectiveRole === 'fasilitator') {
      return trainings.filter((t) => t.facilitatorUids.includes(currentUser.uid));
    }
    if (effectiveRole === 'pemantau') {
      return trainings.filter((t) => t.monitorUids.includes(currentUser.uid));
    }
    return trainings;
  }, [trainings, effectiveRole, currentUser]);

  const scopedIds = useMemo(() => new Set(scopedTrainings.map((t) => t.id)), [scopedTrainings]);

  const baseEnrollments = useMemo(
    () => enrollments.filter((e) => scopedIds.has(e.trainingId)),
    [enrollments, scopedIds],
  );

  const uniqueInstansi = useMemo(
    () => Array.from(new Set(baseEnrollments.map((e) => e.instansi))).sort(),
    [baseEnrollments],
  );
  const uniqueKota = useMemo(
    () => Array.from(new Set(baseEnrollments.map((e) => e.kabupatenKota))).sort(),
    [baseEnrollments],
  );

  const filteredRows = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    return baseEnrollments
      .map((enr) => {
        const prof = profiles.find((p) => p.uid === enr.userId);
        const jenjang = enr.jenjangPendidikan || prof?.jenjangPendidikan || '-';
        const mataPelajaran = enr.mataPelajaran || prof?.mataPelajaran || '-';
        return { enr, jenjang, mataPelajaran };
      })
      .filter(({ enr, jenjang }) => {
        if (q && !enr.userName.toLowerCase().includes(q) && !enr.instansi.toLowerCase().includes(q)) {
          return false;
        }
        if (trainingFilter !== 'all' && enr.trainingId !== trainingFilter) return false;
        if (instansiFilter !== 'all' && enr.instansi !== instansiFilter) return false;
        if (jenjangFilter !== 'all' && jenjang !== jenjangFilter) return false;
        if (kotaFilter !== 'all' && enr.kabupatenKota !== kotaFilter) return false;
        if (levelFilter !== 'all' && String(enr.currentLevel) !== levelFilter) return false;
        if (statusFilter !== 'all' && enr.status !== statusFilter) return false;
        if (facilitatorFilter !== 'all') {
          const trn = trainings.find((t) => t.id === enr.trainingId);
          const lvlFacilitatorMatch = levels.some(
            (lv) =>
              lv.trainingId === enr.trainingId &&
              lv.levelNumber === (enr.currentLevel || enr.startingLevel || 1) &&
              lv.facilitatorUid === facilitatorFilter,
          );
          if (!trn?.facilitatorUids.includes(facilitatorFilter) && !lvlFacilitatorMatch) {
            return false;
          }
        }
        return true;
      })
      .map(({ enr, jenjang, mataPelajaran }) => {
        const trn = trainings.find((t) => t.id === enr.trainingId);
        const userQuiz = attempts.filter(
          (a) =>
            a.trainingId === enr.trainingId &&
            a.userId === enr.userId &&
            a.kind === 'quiz' &&
            a.gradingStatus === 'selesai',
        );
        const userEval = attempts.filter(
          (a) =>
            a.trainingId === enr.trainingId &&
            a.userId === enr.userId &&
            a.kind === 'evaluation' &&
            a.gradingStatus === 'selesai',
        );
        const userRubrics = taskSubmissions.filter(
          (s) => s.trainingId === enr.trainingId && s.userId === enr.userId && s.weightedScore > 0,
        );
        const avgQuiz =
          userQuiz.length > 0
            ? Math.round(userQuiz.reduce((s, a) => s + a.finalScore, 0) / userQuiz.length)
            : null;
        const avgEval =
          userEval.length > 0
            ? Math.round(userEval.reduce((s, a) => s + a.finalScore, 0) / userEval.length)
            : null;
        const avgRubric =
          userRubrics.length > 0
            ? Math.round(userRubrics.reduce((s, a) => s + a.weightedScore, 0) / userRubrics.length)
            : null;
        return {
          ...enr,
          jenjang,
          mataPelajaran,
          trainingCode: trn?.code || '-',
          trainingName: trn?.name || '-',
          avgQuiz,
          avgEval,
          avgRubric,
        };
      });
  }, [
    baseEnrollments,
    profiles,
    nameQuery,
    trainingFilter,
    instansiFilter,
    jenjangFilter,
    kotaFilter,
    facilitatorFilter,
    levelFilter,
    statusFilter,
    trainings,
    levels,
    attempts,
    taskSubmissions,
  ]);

  const levelChart = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const r of filteredRows) {
      if (r.currentLevel >= 1 && r.currentLevel <= 4) {
        counts[r.currentLevel as 1 | 2 | 3 | 4] += 1;
      }
    }
    return [
      { level: 'L1 · Substitution', peserta: counts[1] },
      { level: 'L2 · Augmentation', peserta: counts[2] },
      { level: 'L3 · Modification', peserta: counts[3] },
      { level: 'L4 · Redefinition', peserta: counts[4] },
    ];
  }, [filteredRows]);

  const statusPieData = useMemo(() => {
    const map: Array<{ name: string; value: number }> = [
      { name: 'Lulus', value: filteredRows.filter((r) => r.status === 'lulus').length },
      { name: 'Aktif', value: filteredRows.filter((r) => r.status === 'aktif').length },
      { name: 'Disetujui', value: filteredRows.filter((r) => r.status === 'disetujui').length },
      { name: 'Menunggu', value: filteredRows.filter((r) => r.status === 'menunggu').length },
      { name: 'Ditolak', value: filteredRows.filter((r) => r.status === 'ditolak').length },
    ];
    return map.filter((m) => m.value > 0);
  }, [filteredRows]);

  // Grafik 3: Perbandingan Rata-rata Asesmen Awal vs Evaluasi Akhir per Level SAMR
  const preVsEvalChart = useMemo(() => {
    return ([1, 2, 3, 4] as const).map((lv) => {
      const group = filteredRows.filter((r) => r.startingLevel === lv || r.currentLevel === lv);
      const preList = group.filter((r) => r.assessmentScore >= 0).map((r) => r.assessmentScore);
      const evalList = group.filter((r) => r.avgEval !== null).map((r) => r.avgEval as number);
      return {
        level: `L${lv} · ${LEVEL_SHORT_NAMES[lv]}`,
        'Asesmen Awal':
          preList.length > 0 ? Math.round(preList.reduce((a, b) => a + b, 0) / preList.length) : 0,
        'Evaluasi Akhir':
          evalList.length > 0 ? Math.round(evalList.reduce((a, b) => a + b, 0) / evalList.length) : 0,
      };
    });
  }, [filteredRows]);

  // Grafik 4: Progres Penyelesaian Peserta per Level SAMR
  const levelCompletionChart = useMemo(() => {
    return ([1, 2, 3, 4] as const).map((lv) => ({
      level: `L${lv} · ${LEVEL_SHORT_NAMES[lv]}`,
      Tuntas: filteredRows.filter((r) => r.completedLevels.includes(lv)).length,
      Aktif: filteredRows.filter(
        (r) => r.unlockedLevels.includes(lv) && !r.completedLevels.includes(lv),
      ).length,
    }));
  }, [filteredRows]);

  const facilitatorRecap = useMemo(() => {
    return profiles
      .filter((p) => p.role === 'fasilitator')
      .map((f) => {
        const handledLevels = levels.filter(
          (lv) => lv.facilitatorUid === f.uid && scopedIds.has(lv.trainingId),
        );
        const handledMats = materials.filter(
          (m) => m.createdBy === f.uid && scopedIds.has(m.trainingId),
        );
        const gradedCount = attempts.filter(
          (a) => a.gradedBy === f.uid && scopedIds.has(a.trainingId),
        ).length;
        return {
          ...f,
          levelCount: handledLevels.length,
          materialCount: handledMats.length,
          gradedCount,
        };
      });
  }, [profiles, levels, materials, attempts, scopedIds]);

  const REPORT_LABELS: Record<typeof reportType, string> = {
    rekap_peserta: '1. Rekapitulasi Peserta',
    asesmen_awal: '2. Hasil Asesmen Awal',
    distribusi_samr: '3. Distribusi Level SAMR',
    progres_belajar: '4. Progres Pembelajaran',
    tugas_praktik: '5. Hasil Tugas Praktik',
    hasil_kuis: '6. Hasil Kuis Pemahaman',
    evaluasi_kegiatan: '7. Evaluasi Kegiatan',
    kelulusan: '8. Rekapitulasi Kelulusan',
  };

  const buildReportExportPayload = () => {
    const label = REPORT_LABELS[reportType];
    if (reportType === 'distribusi_samr') {
      return {
        title: `Laporan ${label} — ${institutionSettings.appName}`,
        columns: ['Level SAMR', 'Jumlah Peserta', 'Persentase (%)'],
        rows: levelChart.map((d) => [
          d.level,
          String(d.peserta),
          filteredRows.length > 0 ? `${Math.round((d.peserta / filteredRows.length) * 100)}%` : '0%',
        ]),
        excel: levelChart.map((d) => ({
          'Level SAMR': d.level,
          'Jumlah Peserta': d.peserta,
          'Persentase (%)':
            filteredRows.length > 0 ? Math.round((d.peserta / filteredRows.length) * 100) : 0,
        })),
      };
    }
    if (reportType === 'tugas_praktik') {
      const filteredSubs = taskSubmissions.filter((s) =>
        filteredRows.some((r) => r.trainingId === s.trainingId && r.userId === s.userId),
      );
      return {
        title: `Laporan ${label} — ${institutionSettings.appName}`,
        columns: ['Peserta', 'Level', 'Judul Produk PID', 'Skor Rubrik', 'Status', 'Penilai'],
        rows: filteredSubs.map((s) => [
          s.userName,
          `L${s.levelNumber}`,
          s.title,
          s.weightedScore > 0 ? `${s.weightedScore}` : '-',
          s.status.toUpperCase(),
          s.gradedByName || '-',
        ]),
        excel: filteredSubs.map((s) => ({
          Peserta: s.userName,
          'Level SAMR': `L${s.levelNumber} ${LEVEL_SHORT_NAMES[s.levelNumber]}`,
          'Judul Produk PID': s.title,
          'Skor Rubrik': s.weightedScore > 0 ? s.weightedScore : '-',
          Status: s.status.toUpperCase(),
          Penilai: s.gradedByName || '-',
          'Umpan Balik': s.facilitatorFeedback || '-',
        })),
      };
    }
    if (reportType === 'asesmen_awal') {
      return {
        title: `Laporan ${label} — ${institutionSettings.appName}`,
        columns: ['Kegiatan', 'Peserta', 'Jenjang', 'Satuan Pendidikan', 'Skor Awal', 'Rekomendasi Level'],
        rows: filteredRows.map((r) => [
          r.trainingCode,
          r.userName,
          r.jenjang,
          r.instansi,
          r.assessmentScore >= 0 ? `${r.assessmentScore}` : 'Belum',
          r.startingLevel >= 1
            ? `L${r.startingLevel} ${LEVEL_SHORT_NAMES[r.startingLevel as 1 | 2 | 3 | 4]}`
            : '-',
        ]),
        excel: filteredRows.map((r) => ({
          Kegiatan: r.trainingCode,
          Peserta: r.userName,
          Jenjang: r.jenjang,
          'Satuan Pendidikan': r.instansi,
          'Kabupaten/Kota': r.kabupatenKota,
          'Skor Asesmen Awal': r.assessmentScore >= 0 ? r.assessmentScore : '-',
          'Rekomendasi Level SAMR':
            r.startingLevel >= 1
              ? `L${r.startingLevel} ${LEVEL_SHORT_NAMES[r.startingLevel as 1 | 2 | 3 | 4]}`
              : 'Belum Asesmen',
        })),
      };
    }
    if (reportType === 'kelulusan') {
      return {
        title: `Laporan ${label} — ${institutionSettings.appName}`,
        columns: ['Kegiatan', 'Peserta', 'Instansi', 'Status', 'Progres', 'Eval', 'No. Sertifikat'],
        rows: filteredRows.map((r) => [
          r.trainingCode,
          r.userName,
          r.instansi,
          r.status.toUpperCase(),
          `${r.overallProgress}%`,
          r.avgEval !== null ? `${r.avgEval}` : '-',
          r.certificateNumber || '-',
        ]),
        excel: filteredRows.map((r) => ({
          Kegiatan: r.trainingCode,
          Peserta: r.userName,
          Instansi: r.instansi,
          'Kabupaten/Kota': r.kabupatenKota,
          Status: r.status.toUpperCase(),
          'Progres (%)': r.overallProgress,
          'Rata-rata Evaluasi': r.avgEval !== null ? r.avgEval : '-',
          'Nomor Sertifikat': r.certificateNumber || '-',
        })),
      };
    }
    return {
      title: `Laporan ${label} — ${institutionSettings.appName}`,
      columns: ['Kegiatan', 'Peserta', 'Jenjang', 'Instansi', 'Status', 'Asesmen', 'Level', 'Kuis', 'Eval', 'Rubrik'],
      rows: filteredRows.map((r) => [
        r.trainingCode,
        r.userName,
        r.jenjang,
        r.instansi,
        r.status.toUpperCase(),
        r.assessmentScore >= 0 ? `${r.assessmentScore}` : '-',
        r.currentLevel > 0 ? `L${r.startingLevel}->L${r.currentLevel}` : '-',
        r.avgQuiz !== null ? `${r.avgQuiz}` : '-',
        r.avgEval !== null ? `${r.avgEval}` : '-',
        r.avgRubric !== null ? `${r.avgRubric}` : '-',
      ]),
      excel: filteredRows.map((r) => ({
        Kegiatan: r.trainingCode,
        'Nama Peserta': r.userName,
        Jenjang: r.jenjang,
        'Mata Pelajaran': r.mataPelajaran,
        'Satuan Pendidikan': r.instansi,
        'Kabupaten/Kota': r.kabupatenKota,
        Status: r.status.toUpperCase(),
        'Skor Asesmen Awal': r.assessmentScore >= 0 ? r.assessmentScore : '-',
        'Level Awal SAMR':
          r.startingLevel >= 1
            ? `L${r.startingLevel} ${LEVEL_SHORT_NAMES[r.startingLevel as 1 | 2 | 3 | 4]}`
            : '-',
        'Level Aktif SAMR':
          r.currentLevel >= 1
            ? `L${r.currentLevel} ${LEVEL_SHORT_NAMES[r.currentLevel as 1 | 2 | 3 | 4]}`
            : '-',
        'Progres (%)': r.overallProgress,
        'Rata-rata Kuis': r.avgQuiz !== null ? r.avgQuiz : '-',
        'Rata-rata Evaluasi': r.avgEval !== null ? r.avgEval : '-',
        'Skor Rubrik Praktik': r.avgRubric !== null ? r.avgRubric : '-',
        'No Sertifikat': r.certificateNumber || '-',
      })),
    };
  };

  const handleExportExcel = () => {
    const payload = buildReportExportPayload();
    exportMonitoringToExcel(
      payload.excel,
      `Laporan-${reportType}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    showToast('success', `${REPORT_LABELS[reportType]} berhasil diekspor ke Excel (.xlsx).`);
  };

  const handleExportPdf = () => {
    const payload = buildReportExportPayload();
    const lulusCount = filteredRows.filter((r) => r.status === 'lulus').length;
    exportMonitoringToPdf({
      title: payload.title,
      subtitle: `Tanggal cetak: ${new Date().toISOString().slice(0, 10)} · PAMANDAI EDU · Pelatihan PID Berbasis SAMR`,
      summaryLines: [
        `Total Peserta Terfilter: ${filteredRows.length} | Lulus: ${lulusCount} (${filteredRows.length > 0 ? Math.round((lulusCount / filteredRows.length) * 100) : 0}%)`,
        `Filter: Kegiatan=${trainingFilter} | Jenjang=${jenjangFilter} | Fasilitator=${facilitatorFilter} | Kota=${kotaFilter} | Level=${levelFilter} | Status=${statusFilter}`,
      ],
      columns: payload.columns,
      rows: payload.rows,
      fileName: `Laporan-${reportType}-${new Date().toISOString().slice(0, 10)}.pdf`,
    });
    showToast('success', `${REPORT_LABELS[reportType]} berhasil diekspor ke PDF.`);
  };

  const pendingValidationsCount = taskSubmissions.filter(
    (s) => scopedIds.has(s.trainingId) && s.status === 'menunggu_penilaian',
  ).length;
  const totalFacilitatorsCount = profiles.filter((p) => p.role === 'fasilitator').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#212529]">Monitoring & 8 Laporan Resmi</h1>
          <p className="text-sm text-[#6c757d] mt-1">
            Pemantauan multi-dimensi kegiatan, peserta, fasilitator, asesmen awal, distribusi SAMR, tugas praktik, dan ekspor Excel/PDF.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Pilih jenis laporan"
            value={reportType}
            onChange={(e) => setReportType(e.target.value as typeof reportType)}
            className="px-3 py-2 text-xs font-semibold bg-white border border-[#ced4da] rounded-lg text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
          >
            {Object.entries(REPORT_LABELS).map(([k, lbl]) => (
              <option key={k} value={k}>
                {lbl}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#198754] bg-[#e8f5ee] border border-[#b7e4c7] hover:bg-[#d1e7dd] rounded-lg whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Ekspor Excel
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Ekspor PDF
          </button>
        </div>
      </div>

      {/* Ringkasan KPI Monitoring Lengkap */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total Kegiatan', val: scopedTrainings.length, tone: 'text-[#212529]' },
          { label: 'Total Peserta', val: filteredRows.length, tone: 'text-[#0f6cbf]' },
          { label: 'Total Fasilitator', val: totalFacilitatorsCount, tone: 'text-[#212529]' },
          {
            label: 'Sudah Asesmen',
            val: filteredRows.filter((r) => r.startingLevel >= 1).length,
            tone: 'text-[#0f6cbf]',
          },
          { label: 'Menunggu Validasi', val: pendingValidationsCount, tone: 'text-amber-700' },
          {
            label: 'Peserta Lulus',
            val: filteredRows.filter((r) => r.status === 'lulus').length,
            tone: 'text-[#198754]',
          },
          {
            label: 'Belum Selesai',
            val: filteredRows.filter((r) => r.status !== 'lulus').length,
            tone: 'text-[#6c757d]',
          },
        ].map((k) => (
          <div
            key={k.label}
            className="bg-white border border-[#dee2e6] rounded-xl p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
          >
            <p className="text-[11px] text-[#6c757d]">{k.label}</p>
            <p className={`text-xl font-bold font-mono tabular-nums mt-1 ${k.tone}`}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* 7 Filter Multi-Dimensi */}
      <div className="bg-white border border-[#dee2e6] rounded-xl p-4 space-y-3 text-xs shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="relative max-w-md">
          <Search className="w-3.5 h-3.5 text-[#6c757d] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="Cari nama peserta atau satuan pendidikan..."
            className="w-full pl-8 pr-3 py-1.5 border border-[#ced4da] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div>
            <label className="block text-[#6c757d] mb-1">1. Nama Kegiatan</label>
            <select
              value={trainingFilter}
              onChange={(e) => setTrainingFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-[#ced4da] rounded-md bg-white"
            >
              <option value="all">Semua Kegiatan</option>
              {scopedTrainings.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[#6c757d] mb-1">2. Kabupaten / Kota</label>
            <select
              value={kotaFilter}
              onChange={(e) => setKotaFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-[#ced4da] rounded-md bg-white"
            >
              <option value="all">Semua Wilayah</option>
              {uniqueKota.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[#6c757d] mb-1">3. Jenjang</label>
            <select
              value={jenjangFilter}
              onChange={(e) => setJenjangFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-[#ced4da] rounded-md bg-white"
            >
              <option value="all">Semua Jenjang</option>
              {JENJANG_OPTIONS.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[#6c757d] mb-1">4. Satuan Pendidikan</label>
            <select
              value={instansiFilter}
              onChange={(e) => setInstansiFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-[#ced4da] rounded-md bg-white"
            >
              <option value="all">Semua Sekolah</option>
              {uniqueInstansi.map((ins) => (
                <option key={ins} value={ins}>
                  {ins}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[#6c757d] mb-1">5. Fasilitator</label>
            <select
              value={facilitatorFilter}
              onChange={(e) => setFacilitatorFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-[#ced4da] rounded-md bg-white"
            >
              <option value="all">Semua Fasilitator</option>
              {profiles
                .filter((p) => p.role === 'fasilitator')
                .map((f) => (
                  <option key={f.uid} value={f.uid}>
                    {f.fullName}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-[#6c757d] mb-1">6. Level SAMR</label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-[#ced4da] rounded-md bg-white"
            >
              <option value="all">Semua Level</option>
              <option value="0">Belum Asesmen</option>
              <option value="1">L1 · Substitution</option>
              <option value="2">L2 · Augmentation</option>
              <option value="3">L3 · Modification</option>
              <option value="4">L4 · Redefinition</option>
            </select>
          </div>
          <div>
            <label className="block text-[#6c757d] mb-1">7. Status Belajar</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-[#ced4da] rounded-md bg-white"
            >
              <option value="all">Semua Status</option>
              <option value="menunggu">Menunggu</option>
              <option value="disetujui">Disetujui</option>
              <option value="aktif">Aktif</option>
              <option value="lulus">Lulus</option>
              <option value="ditolak">Ditolak</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ringkasan & Grafik Distribusi Aktual */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Ringkasan Data Terfilter</h2>
          <dl className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <dt className="text-slate-500">Jumlah Baris Peserta</dt>
              <dd className="font-mono font-bold text-slate-900 tabular-nums">{filteredRows.length}</dd>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <dt className="text-slate-500">Lulus & Bersertifikat</dt>
              <dd className="font-mono font-bold text-emerald-700 tabular-nums">
                {filteredRows.filter((r) => r.status === 'lulus').length}
              </dd>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <dt className="text-slate-500">Belum Asesmen Awal</dt>
              <dd className="font-mono font-bold text-amber-700 tabular-nums">
                {filteredRows.filter((r) => r.startingLevel === 0).length}
              </dd>
            </div>
            <div className="flex justify-between py-1.5">
              <dt className="text-slate-500">Rata-rata Progres Belajar</dt>
              <dd className="font-mono font-bold text-slate-900 tabular-nums">
                {filteredRows.length > 0
                  ? Math.round(
                      filteredRows.reduce((s, r) => s + r.overallProgress, 0) / filteredRows.length,
                    )
                  : 0}
                %
              </dd>
            </div>
          </dl>
        </div>

        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Distribusi Level (Batang)</h2>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="level" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip />
                <Bar dataKey="peserta" name="Peserta" fill="#0F2544" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Proporsi Status Kelulusan (Lingkaran)</h2>
          <div className="h-44">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={66}
                    paddingAngle={2}
                  >
                    {statusPieData.map((entry, idx) => (
                      <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Tidak ada data status pada filter ini.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grafik Tambahan SAMR: Asesmen Awal vs Evaluasi Akhir & Progres Penyelesaian per Level */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-900">
            Perbandingan Rata-rata Asesmen Awal vs Evaluasi Akhir
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Peningkatan skor rata-rata peserta antar tahap sebelum dan sesudah pembelajaran per level SAMR
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={preVsEvalChart} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="level" tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Asesmen Awal" fill="#64748B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Evaluasi Akhir" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-900">
            Progres Penyelesaian Peserta per Level SAMR
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Jumlah peserta yang telah menuntaskan vs sedang aktif belajar pada masing-masing level SAMR
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelCompletionChart} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="level" tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Tuntas" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Aktif" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabs Tabel */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          {(
            [
              ['peserta', `Rekap Peserta (${filteredRows.length})`],
              ['fasilitator', `Rekap Fasilitator (${facilitatorRecap.length})`],
              ['aktivitas', `Riwayat Aktivitas (${activityLogs.length})`],
            ] as const
          ).map(([k, lbl]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
                tab === k ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-x-auto">
          {tab === 'peserta' && (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-2.5 pr-3 font-medium">Kegiatan</th>
                  <th className="py-2.5 pr-3 font-medium">Peserta & Sekolah</th>
                  <th className="py-2.5 pr-3 font-medium">Jenjang & Wilayah</th>
                  <th className="py-2.5 pr-3 font-medium text-right">Asesmen</th>
                  <th className="py-2.5 pr-3 font-medium">Level SAMR</th>
                  <th className="py-2.5 pr-3 font-medium text-right">Progres</th>
                  <th className="py-2.5 pr-3 font-medium text-right">Kuis</th>
                  <th className="py-2.5 pr-3 font-medium text-right">Evaluasi</th>
                  <th className="py-2.5 pr-3 font-medium text-right">Rubrik</th>
                  <th className="py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-3 font-mono text-slate-700 whitespace-nowrap">
                      {r.trainingCode}
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-slate-900">{r.userName}</p>
                      <p className="text-slate-500">
                        {r.instansi}
                        {r.mataPelajaran && r.mataPelajaran !== '-' ? ` · ${r.mataPelajaran}` : ''}
                      </p>
                    </td>
                    <td className="py-3 pr-3 text-slate-600 whitespace-nowrap">
                      <span className="font-medium text-slate-800">{r.jenjang}</span> · {r.kabupatenKota}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono tabular-nums">
                      {r.assessmentScore >= 0 ? `${r.assessmentScore}` : '—'}
                    </td>
                    <td className="py-3 pr-3 font-mono whitespace-nowrap">
                      {r.startingLevel > 0 ? `L${r.startingLevel} → L${r.currentLevel}` : 'Belum'}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono tabular-nums">
                      {r.overallProgress}%
                    </td>
                    <td className="py-3 pr-3 text-right font-mono tabular-nums">
                      {r.avgQuiz !== null ? `${r.avgQuiz}` : '—'}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono tabular-nums">
                      {r.avgEval !== null ? `${r.avgEval}` : '—'}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono tabular-nums">
                      {r.avgRubric !== null ? `${r.avgRubric}` : '—'}
                    </td>
                    <td className="py-3 font-semibold uppercase whitespace-nowrap text-slate-800">
                      {r.status}
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500">
                      Tidak ada data peserta yang cocok dengan kombinasi filter saat ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {tab === 'fasilitator' && (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-2.5 pr-4 font-medium">Nama Fasilitator</th>
                  <th className="py-2.5 pr-4 font-medium">Instansi</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Level Diampu</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Materi Dikelola</th>
                  <th className="py-2.5 font-medium text-right">Koreksi Manual Selesai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facilitatorRecap.map((f) => (
                  <tr key={f.uid}>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{f.fullName}</td>
                    <td className="py-3 pr-4 text-slate-600">{f.instansi}</td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums">{f.levelCount}</td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums">{f.materialCount}</td>
                    <td className="py-3 text-right font-mono tabular-nums">{f.gradedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'aktivitas' && (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-2.5 pr-4 font-medium">Waktu</th>
                  <th className="py-2.5 pr-4 font-medium">Petugas / Aktor</th>
                  <th className="py-2.5 pr-4 font-medium">Tindakan</th>
                  <th className="py-2.5 font-medium">Detail & Alasan Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activityLogs.map((log) => (
                  <tr key={log.id}>
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
                          <FileText className="w-3 h-3 inline mr-1" />
                          Alasan Override: {log.overrideReason}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
