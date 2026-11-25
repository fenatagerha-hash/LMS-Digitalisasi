import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Calendar,
  Check,
  Edit3,
  FolderOpen,
  Megaphone,
  Plus,
  Save,
  ShieldAlert,
  Sliders,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { CourseWorkspace } from '../components/CourseWorkspace';
import { useLms } from '../context/LmsContext';
import { ASSET_HERO_TRAINING } from '../data/seedDataset';
import { validateScoreRanges } from '../lib/lmsRules';
import {
  DEFAULT_SCORE_RANGES,
  isSamrTraining,
  LearningLevel,
  ScoreRange,
  TrainingProgram,
  TrainingStatus,
} from '../types/lms';

export function TrainingsPage() {
  const {
    currentUser,
    effectiveRole,
    profiles,
    trainings,
    levels,
    enrollments,
    schedules,
    announcements,
    createTraining,
    updateTraining,
    deleteTraining,
    updateScoreRanges,
    updateLearningLevel,
    approveOrRejectEnrollment,
    adminOverrideLevel,
    createSchedule,
    deleteSchedule,
    createAnnouncement,
  } = useLms();

  const canManage = effectiveRole === 'super_admin' || effectiveRole === 'admin_kegiatan';
  const isSuperAdmin = effectiveRole === 'super_admin';

  const [selectedTrainingId, setSelectedTrainingId] = useState<string>(trainings[0]?.id || '');
  const [subTab, setSubTab] = useState<'daftar' | 'ringkasan' | 'rentang' | 'level' | 'jadwal' | 'peserta'>(
    'daftar',
  );
  const [deleteTarget, setDeleteTarget] = useState<TrainingProgram | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal Tambah Kegiatan Baru
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newForm, setNewForm] = useState({
    code: '',
    name: '',
    description: '',
    organizer: 'Balai Pengembangan Kompetensi Guru & Digitalisasi Pembelajaran',
    startDate: '2026-11-25',
    endDate: '2027-02-20',
    location: 'Daring & Platform LMS PAMANDAI EDU',
    quota: 100,
    status: 'aktif' as TrainingStatus,
    requireApproval: true,
    usesSamrLevels: false,
    signerName: 'Dr. Hendra Kusuma, M.Pd.',
    signerTitle: 'Kepala Balai Pengembangan Kompetensi Guru',
  });

  // Modal Edit Kegiatan
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTraining, setEditingTraining] = useState<TrainingProgram | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    guidelines: '',
    organizer: '',
    location: '',
    startDate: '',
    endDate: '',
    quota: 100,
    status: 'aktif' as TrainingStatus,
    usesSamrLevels: false,
    signerName: '',
    signerTitle: '',
    adminUids: [] as string[],
    facilitatorUids: [] as string[],
    monitorUids: [] as string[],
  });

  // Rentang skor SAMR draft
  const [rangeDraft, setRangeDraft] = useState<ScoreRange[]>(DEFAULT_SCORE_RANGES);
  const rangeValidation = useMemo(() => validateScoreRanges(rangeDraft), [rangeDraft]);

  // Editor Level
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [levelDraft, setLevelDraft] = useState<Partial<LearningLevel>>({});

  // Jadwal & Pengumuman
  const [schForm, setSchForm] = useState({
    levelNumber: 1,
    title: '',
    sessionDate: '2026-12-01',
    startTime: '09:00',
    endTime: '11:00',
    facilitatorName: '',
    mode: 'daring' as 'daring' | 'luring' | 'mandiri',
    locationOrUrl: '',
    notes: '',
  });
  const [annForm, setAnnForm] = useState({ title: '', body: '' });

  // Override Level Modal
  const [overrideTarget, setOverrideTarget] = useState<{
    enrollmentId: string;
    userName: string;
    currentLevel: number;
  } | null>(null);
  const [overrideLevel, setOverrideLevel] = useState<1 | 2 | 3 | 4>(2);
  const [overrideReason, setOverrideReason] = useState('');

  const facilitators = profiles.filter((p) => p.role === 'fasilitator');
  const trainingAdmins = profiles.filter((p) => p.role === 'admin_kegiatan');
  const monitors = profiles.filter((p) => p.role === 'pemantau');
  const toggleUidInList = (list: string[], uid: string) =>
    list.includes(uid) ? list.filter((x) => x !== uid) : [...list, uid];

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createTraining({
      ...newForm,
      bannerUrl: ASSET_HERO_TRAINING,
      scoreRanges: DEFAULT_SCORE_RANGES,
      adminUids: currentUser ? [currentUser.uid] : [],
      facilitatorUids: facilitators.slice(0, 2).map((p) => p.uid),
      monitorUids: monitors.slice(0, 1).map((p) => p.uid),
      visibility: 'public_catalog',
    });
    if (res.ok && res.data && typeof res.data === 'object' && 'id' in res.data) {
      setSelectedTrainingId(String((res.data as { id: string }).id));
      setShowCreateModal(false);
      setNewForm({
        ...newForm,
        code: '',
        name: '',
        description: '',
        usesSamrLevels: false,
      });
    }
  };

  const openEditTrainingModal = (trn: TrainingProgram) => {
    setEditingTraining(trn);
    setEditForm({
      name: trn.name,
      description: trn.description,
      guidelines: trn.guidelines || '',
      organizer: trn.organizer,
      location: trn.location,
      startDate: trn.startDate,
      endDate: trn.endDate,
      quota: trn.quota,
      status: trn.status,
      usesSamrLevels: isSamrTraining(trn),
      signerName: trn.signerName,
      signerTitle: trn.signerTitle,
      adminUids: trn.adminUids,
      facilitatorUids: trn.facilitatorUids,
      monitorUids: trn.monitorUids,
    });
    setShowEditModal(true);
  };

  const handleEditTrainingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTraining) return;
    const res = await updateTraining(editingTraining.id, {
      name: editForm.name.trim().slice(0, 200),
      description: editForm.description.trim().slice(0, 2000),
      guidelines: editForm.guidelines.trim().slice(0, 3000),
      organizer: editForm.organizer.trim().slice(0, 160),
      location: editForm.location.trim().slice(0, 160),
      startDate: editForm.startDate,
      endDate: editForm.endDate,
      quota: Math.max(1, Math.min(10000, Math.round(Number(editForm.quota) || 100))),
      status: editForm.status,
      usesSamrLevels: editForm.usesSamrLevels,
      signerName: editForm.signerName.trim().slice(0, 120),
      signerTitle: editForm.signerTitle.trim().slice(0, 160),
      ...(isSuperAdmin
        ? {
            adminUids: editForm.adminUids.slice(0, 10),
            facilitatorUids: editForm.facilitatorUids.slice(0, 20),
            monitorUids: editForm.monitorUids.slice(0, 10),
          }
        : {}),
    });
    if (res.ok) setShowEditModal(false);
  };

  const handleSaveLevel = async () => {
    if (!editingLevelId) return;
    await updateLearningLevel(editingLevelId, levelDraft);
    setEditingLevelId(null);
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideTarget) return;
    const res = await adminOverrideLevel(overrideTarget.enrollmentId, overrideLevel, overrideReason);
    if (res.ok) {
      setOverrideTarget(null);
      setOverrideReason('');
    }
  };

  const handleConfirmDeleteTraining = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const deletingId = deleteTarget.id;
      const res = await deleteTraining(deletingId);
      if (res.ok) {
        if (selectedTrainingId === deletingId) {
          const next = trainings.find((t) => t.id !== deletingId);
          setSelectedTrainingId(next?.id || '');
        }
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  const renderManagementTab = (selectedTraining: TrainingProgram) => {
    const usesSamr = isSamrTraining(selectedTraining);
    const trainingLevels = levels
      .filter((l) => l.trainingId === selectedTraining.id)
      .sort((a, b) => a.levelNumber - b.levelNumber);
    const trainingEnrollments = enrollments.filter((e) => e.trainingId === selectedTraining.id);
    const trainingSchedules = schedules
      .filter((s) => s.trainingId === selectedTraining.id)
      .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
    const trainingAnnouncements = announcements.filter((a) => a.trainingId === selectedTraining.id);

    return (
      <div className="bg-white border border-[#dee2e6] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        {/* Header Kelola Kegiatan */}
        <div className="p-5 sm:p-6 border-b border-[#e9ecef] flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="text-xs text-[#6c757d] flex flex-wrap items-center gap-2">
              <span className="font-mono font-semibold text-[#0f6cbf]">{selectedTraining.code}</span>
              <span>·</span>
              <span>{selectedTraining.organizer}</span>
              <span>·</span>
              <span className="font-semibold text-[#212529]">
                {usesSamr ? 'Mode 4 Level SAMR' : 'Mode Modul Berurutan (Non-SAMR)'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#212529]">{selectedTraining.name}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#198754] hover:bg-[#146c43] rounded-lg whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Kegiatan
            </button>
            <button
              type="button"
              onClick={() => openEditTrainingModal(selectedTraining)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#0f6cbf] border border-[#b6d4fe] bg-[#e7f1fa]/50 rounded-lg hover:bg-[#e7f1fa] whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Kegiatan
            </button>
            <button
              type="button"
              onClick={() =>
                void updateTraining(selectedTraining.id, {
                  status: selectedTraining.status === 'aktif' ? 'arsip' : 'aktif',
                })
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#495057] border border-[#ced4da] rounded-lg hover:bg-[#f8f9fa] whitespace-nowrap"
            >
              <Archive className="w-3.5 h-3.5" />
              {selectedTraining.status === 'aktif' ? 'Arsipkan' : 'Aktifkan'}
            </button>
            <button
              type="button"
              onClick={() =>
                void updateTraining(selectedTraining.id, {
                  requireApproval: !selectedTraining.requireApproval,
                })
              }
              className="px-3 py-1.5 text-xs font-medium border border-[#ced4da] rounded-lg hover:bg-[#f8f9fa] whitespace-nowrap"
            >
              Verifikasi: {selectedTraining.requireApproval ? 'Panitia' : 'Otomatis'}
            </button>
            {canManage && (
              <button
                type="button"
                onClick={() => setDeleteTarget(selectedTraining)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-50 rounded-lg whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Kegiatan
              </button>
            )}
          </div>
        </div>

        {/* Sub-tab Pengelolaan */}
        <div className="px-5 py-3 bg-[#f8f9fa] border-b border-[#e9ecef] flex flex-wrap gap-2">
          {(
            [
              ['daftar', `Semua Kegiatan (${trainings.length})`],
              ['ringkasan', 'Informasi & Petugas'],
              ...(usesSamr ? ([['rentang', 'Rentang Skor & Kebijakan SAMR']] as const) : []),
              ...(usesSamr ? ([['level', '4 Level SAMR']] as const) : []),
              ['jadwal', `Jadwal & Pengumuman (${trainingSchedules.length})`],
              ['peserta', `Persetujuan & Override (${trainingEnrollments.length})`],
            ] as Array<[typeof subTab, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSubTab(key);
                if (key === 'rentang') setRangeDraft(selectedTraining.scoreRanges);
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                subTab === key
                  ? 'bg-[#0f6cbf] text-white'
                  : 'text-[#495057] hover:bg-[#e9ecef]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-5 sm:p-6">
          {subTab === 'daftar' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#212529]">
                    Daftar Seluruh Kegiatan Pelatihan ({trainings.length})
                  </h3>
                  <p className="text-xs text-[#6c757d] mt-0.5">
                    Tambah kegiatan baru, buka ruang LMS kegiatan, sunting detail, atau hapus kegiatan yang tidak digunakan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#198754] hover:bg-[#146c43] rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Kegiatan Baru
                </button>
              </div>

              <div className="overflow-x-auto border border-[#e9ecef] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8f9fa] border-b border-[#e9ecef] text-[#6c757d]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Kode & Nama Kegiatan</th>
                      <th className="py-2.5 px-3 font-semibold">Model</th>
                      <th className="py-2.5 px-3 font-semibold">Periode</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Peserta</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Aksi Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e9ecef]">
                    {trainings.map((trn) => {
                      const trnSamr = isSamrTraining(trn);
                      const count = enrollments.filter((e) => e.trainingId === trn.id).length;
                      const isCurrent = trn.id === selectedTraining.id;
                      return (
                        <tr
                          key={trn.id}
                          className={isCurrent ? 'bg-[#e7f1fa]/40' : 'hover:bg-[#f8f9fa]'}
                        >
                          <td className="py-3 px-4">
                            <p className="font-mono text-[11px] font-semibold text-[#0f6cbf]">
                              {trn.code} {isCurrent ? '· Sedang Dibuka' : ''}
                            </p>
                            <p className="font-bold text-[#212529] mt-0.5">{trn.name}</p>
                            <p className="text-[11px] text-[#6c757d]">{trn.organizer}</p>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-medium text-[#212529]">
                            {trnSamr ? '4 Level SAMR' : 'Modul Standar'}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-mono text-[#495057]">
                            {trn.startDate} – {trn.endDate}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-[#212529]">
                            {count} / {trn.quota}
                          </td>
                          <td className="py-3 px-3 uppercase font-semibold text-[#198754]">
                            {trn.status}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() => setSelectedTrainingId(trn.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#0f6cbf] border border-[#b6d4fe] bg-white hover:bg-[#e7f1fa] rounded-md"
                              >
                                <FolderOpen className="w-3.5 h-3.5" />
                                Buka
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditTrainingModal(trn)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#495057] border border-[#ced4da] bg-white hover:bg-[#f8f9fa] rounded-md"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(trn)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 border border-red-200 bg-white hover:bg-red-50 rounded-md"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Hapus
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {subTab === 'ringkasan' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-2.5">
                <h3 className="text-sm font-bold text-[#212529]">Detail Pelaksanaan</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between py-1.5 border-b border-[#e9ecef]">
                    <dt className="text-[#6c757d]">Struktur Pembelajaran</dt>
                    <dd className="font-semibold text-[#0f6cbf]">
                      {usesSamr
                        ? '4 Level SAMR (Khusus Pemanfaatan Digitalisasi)'
                        : 'Modul Berurutan Standar (Non-SAMR)'}
                    </dd>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#e9ecef]">
                    <dt className="text-[#6c757d]">Periode</dt>
                    <dd className="font-mono text-[#212529]">
                      {selectedTraining.startDate} s.d. {selectedTraining.endDate}
                    </dd>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#e9ecef]">
                    <dt className="text-[#6c757d]">Kuota Peserta</dt>
                    <dd className="font-mono text-[#212529]">{selectedTraining.quota} orang</dd>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <dt className="text-[#6c757d]">Penandatangan Sertifikat</dt>
                    <dd className="font-medium text-[#212529]">{selectedTraining.signerName}</dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-sm font-bold text-[#212529]">Penugasan Panitia & Fasilitator</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-[#6c757d]">Panitia / Admin Kegiatan</p>
                    <p className="font-medium text-[#212529] mt-0.5">
                      {selectedTraining.adminUids
                        .map((uid) => profiles.find((p) => p.uid === uid)?.fullName || uid)
                        .join(', ') || 'Belum ditugaskan'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#6c757d]">Fasilitator</p>
                    <p className="font-medium text-[#212529] mt-0.5">
                      {selectedTraining.facilitatorUids
                        .map((uid) => profiles.find((p) => p.uid === uid)?.fullName || uid)
                        .join(', ') || 'Belum ditugaskan'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#6c757d]">Supervisor (Akses Baca)</p>
                    <p className="font-medium text-[#212529] mt-0.5">
                      {selectedTraining.monitorUids
                        .map((uid) => profiles.find((p) => p.uid === uid)?.fullName || uid)
                        .join(', ') || 'Belum ditugaskan'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {subTab === 'rentang' && usesSamr && (
            <div className="space-y-5 max-w-2xl">
              <div className="flex items-start gap-3">
                <Sliders className="w-5 h-5 text-[#0f6cbf] mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-[#212529]">
                    Konfigurasi Rentang Skor Asesmen Awal SAMR (0 – 100)
                  </h3>
                  <p className="text-xs text-[#6c757d] mt-0.5">
                    Khusus untuk kegiatan Pemanfaatan Digitalisasi Pembelajaran berbasis 4 Level SAMR.
                  </p>
                </div>
              </div>
              <div className="space-y-2.5">
                {rangeDraft.map((item, idx) => (
                  <div
                    key={item.level}
                    className="grid grid-cols-12 gap-3 items-center p-3 border border-[#dee2e6] rounded-lg"
                  >
                    <div className="col-span-4 text-xs font-semibold text-[#212529]">
                      {item.label}
                    </div>
                    <div className="col-span-4">
                      <label className="block text-[11px] text-[#6c757d] mb-0.5">Minimum</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.min}
                        onChange={(e) => {
                          const next = [...rangeDraft];
                          next[idx] = { ...next[idx], min: Number(e.target.value) };
                          setRangeDraft(next);
                        }}
                        className="w-full px-2.5 py-1.5 text-sm font-mono border border-[#ced4da] rounded-md"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-[11px] text-[#6c757d] mb-0.5">Maksimum</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.max}
                        onChange={(e) => {
                          const next = [...rangeDraft];
                          next[idx] = { ...next[idx], max: Number(e.target.value) };
                          setRangeDraft(next);
                        }}
                        className="w-full px-2.5 py-1.5 text-sm font-mono border border-[#ced4da] rounded-md"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {!rangeValidation.valid ? (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                  {rangeValidation.error}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-[#d1e7dd] border border-[#a3cfbb] text-xs text-[#0f5132]">
                  Rentang skor valid (0–100 tanpa celah/tumpang tindih).
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!rangeValidation.valid}
                  onClick={() => void updateScoreRanges(selectedTraining.id, rangeDraft)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg disabled:opacity-40"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan Rentang Skor
                </button>
                <button
                  type="button"
                  onClick={() => setRangeDraft(DEFAULT_SCORE_RANGES)}
                  className="px-3 py-2 text-xs border border-[#ced4da] rounded-lg hover:bg-[#f8f9fa]"
                >
                  Default
                </button>
              </div>
            </div>
          )}

          {subTab === 'level' && usesSamr && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trainingLevels.map((lv) => {
                const isEditing = editingLevelId === lv.id;
                return (
                  <div key={lv.id} className="border border-[#dee2e6] rounded-xl p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] text-[#6c757d]">
                          Level {lv.levelNumber} · {lv.durationHours} JP
                        </p>
                        <h4 className="text-sm font-bold text-[#212529]">{lv.title}</h4>
                      </div>
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLevelId(lv.id);
                            setLevelDraft({
                              title: lv.title,
                              description: lv.description,
                              minQuizScore: lv.minQuizScore,
                              minEvaluationScore: lv.minEvaluationScore,
                              durationHours: lv.durationHours,
                            });
                          }}
                          className="p-1.5 text-[#6c757d] hover:text-[#0f6cbf] rounded"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="space-y-2 text-xs">
                        <input
                          type="text"
                          value={levelDraft.title || ''}
                          onChange={(e) => setLevelDraft({ ...levelDraft, title: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-[#ced4da] rounded-md"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="number"
                            value={levelDraft.durationHours || 8}
                            onChange={(e) =>
                              setLevelDraft({ ...levelDraft, durationHours: Number(e.target.value) })
                            }
                            className="px-2 py-1.5 border border-[#ced4da] rounded-md font-mono"
                          />
                          <input
                            type="number"
                            value={levelDraft.minQuizScore || 75}
                            onChange={(e) =>
                              setLevelDraft({ ...levelDraft, minQuizScore: Number(e.target.value) })
                            }
                            className="px-2 py-1.5 border border-[#ced4da] rounded-md font-mono"
                          />
                          <input
                            type="number"
                            value={levelDraft.minEvaluationScore || 75}
                            onChange={(e) =>
                              setLevelDraft({
                                ...levelDraft,
                                minEvaluationScore: Number(e.target.value),
                              })
                            }
                            className="px-2 py-1.5 border border-[#ced4da] rounded-md font-mono"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleSaveLevel()}
                            className="px-3 py-1.5 bg-[#0f6cbf] text-white font-semibold rounded-md"
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingLevelId(null)}
                            className="px-3 py-1.5 border border-[#ced4da] rounded-md"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[#495057]">
                        KKM Kuis {lv.minQuizScore} · Evaluasi {lv.minEvaluationScore} · Fasilitator:{' '}
                        {lv.facilitatorName}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {subTab === 'jadwal' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[#212529] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#0f6cbf]" />
                  Jadwal Sesi Kegiatan ({trainingSchedules.length})
                </h3>
                {trainingSchedules.map((sch) => (
                  <div
                    key={sch.id}
                    className="p-3 border border-[#dee2e6] rounded-lg flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="font-mono text-[#6c757d]">
                        {sch.sessionDate} · {sch.startTime}–{sch.endTime} · {sch.mode.toUpperCase()}
                      </p>
                      <p className="font-bold text-[#212529] mt-0.5">{sch.title}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteSchedule(sch.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const res = await createSchedule({
                      trainingId: selectedTraining.id,
                      ...schForm,
                    });
                    if (res.ok) setSchForm({ ...schForm, title: '', locationOrUrl: '', notes: '' });
                  }}
                  className="p-4 bg-[#f8f9fa] border border-[#e9ecef] rounded-xl space-y-2.5"
                >
                  <p className="font-bold text-[#212529]">Tambah Jadwal Baru</p>
                  <input
                    required
                    type="text"
                    value={schForm.title}
                    onChange={(e) => setSchForm({ ...schForm, title: e.target.value })}
                    placeholder="Judul sesi pendampingan..."
                    className="w-full px-2.5 py-1.5 bg-white border border-[#ced4da] rounded-md"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="date"
                      value={schForm.sessionDate}
                      onChange={(e) => setSchForm({ ...schForm, sessionDate: e.target.value })}
                      className="px-2 py-1.5 bg-white border border-[#ced4da] rounded-md"
                    />
                    <input
                      type="time"
                      value={schForm.startTime}
                      onChange={(e) => setSchForm({ ...schForm, startTime: e.target.value })}
                      className="px-2 py-1.5 bg-white border border-[#ced4da] rounded-md"
                    />
                    <input
                      type="time"
                      value={schForm.endTime}
                      onChange={(e) => setSchForm({ ...schForm, endTime: e.target.value })}
                      className="px-2 py-1.5 bg-white border border-[#ced4da] rounded-md"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-[#0f6cbf] text-white font-semibold rounded-lg"
                  >
                    Simpan Jadwal
                  </button>
                </form>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[#212529] flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-[#0f6cbf]" />
                  Pengumuman Kegiatan ({trainingAnnouncements.length})
                </h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const res = await createAnnouncement(
                      selectedTraining.id,
                      annForm.title,
                      annForm.body,
                    );
                    if (res.ok) setAnnForm({ title: '', body: '' });
                  }}
                  className="p-4 bg-[#f8f9fa] border border-[#e9ecef] rounded-xl space-y-2.5"
                >
                  <input
                    required
                    type="text"
                    value={annForm.title}
                    onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                    placeholder="Judul pengumuman..."
                    className="w-full px-2.5 py-1.5 bg-white border border-[#ced4da] rounded-md"
                  />
                  <textarea
                    required
                    rows={2}
                    value={annForm.body}
                    onChange={(e) => setAnnForm({ ...annForm, body: e.target.value })}
                    placeholder="Isi pengumuman untuk peserta..."
                    className="w-full px-2.5 py-1.5 bg-white border border-[#ced4da] rounded-md"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-[#0f6cbf] text-white font-semibold rounded-lg"
                  >
                    Terbitkan Pengumuman
                  </button>
                </form>
                {trainingAnnouncements.map((ann) => (
                  <div key={ann.id} className="p-3 border border-[#dee2e6] rounded-lg space-y-1">
                    <p className="font-bold text-[#212529]">{ann.title}</p>
                    <p className="text-[#495057]">{ann.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {subTab === 'peserta' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#dee2e6] text-[#6c757d]">
                  <tr>
                    <th className="py-2.5 pr-4 font-semibold">Peserta & Sekolah</th>
                    <th className="py-2.5 pr-4 font-semibold">Status</th>
                    {usesSamr && <th className="py-2.5 pr-4 font-semibold">Level SAMR</th>}
                    <th className="py-2.5 font-semibold text-right">Tindakan Panitia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e9ecef]">
                  {trainingEnrollments.map((enr) => (
                    <tr key={enr.id}>
                      <td className="py-2.5 pr-4">
                        <p className="font-semibold text-[#212529]">{enr.userName}</p>
                        <p className="text-[#6c757d]">
                          {enr.instansi} · {enr.kabupatenKota}
                        </p>
                      </td>
                      <td className="py-2.5 pr-4 uppercase font-semibold text-[#212529]">
                        {enr.status}
                      </td>
                      {usesSamr && (
                        <td className="py-2.5 pr-4 font-mono text-[#0f6cbf]">
                          {enr.startingLevel > 0 ? `L${enr.startingLevel} → L${enr.currentLevel}` : 'Belum'}
                        </td>
                      )}
                      <td className="py-2.5 text-right whitespace-nowrap space-x-2">
                        {enr.status === 'menunggu' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void approveOrRejectEnrollment(enr.id, 'disetujui')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#198754] text-white rounded font-medium"
                            >
                              <Check className="w-3 h-3" /> Setujui
                            </button>
                            <button
                              type="button"
                              onClick={() => void approveOrRejectEnrollment(enr.id, 'ditolak')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 border border-red-200 text-red-700 rounded font-medium"
                            >
                              <X className="w-3 h-3" /> Tolak
                            </button>
                          </>
                        ) : usesSamr ? (
                          <button
                            type="button"
                            onClick={() => {
                              setOverrideTarget({
                                enrollmentId: enr.id,
                                userName: enr.userName,
                                currentLevel: enr.currentLevel || 1,
                              });
                              setOverrideLevel(
                                Math.min(4, Math.max(1, (enr.currentLevel || 1) + 1)) as 1 | 2 | 3 | 4,
                              );
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#ced4da] text-[#495057] hover:bg-[#f8f9fa] rounded font-medium"
                          >
                            <ShieldAlert className="w-3 h-3" /> Override Level
                          </button>
                        ) : (
                          <span className="text-[#198754] font-semibold">Aktif</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <CourseWorkspace
        showManagementFeatures={canManage}
        onOpenCreateTraining={() => setShowCreateModal(true)}
        onRequestDeleteTraining={(trn) => setDeleteTarget(trn)}
        renderManagementTab={renderManagementTab}
        selectedTrainingIdOverride={selectedTrainingId}
        onSelectTrainingChange={setSelectedTrainingId}
      />

      {/* Modal Konfirmasi Hapus Kegiatan */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#dee2e6] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-[#212529]">Hapus Kegiatan Pelatihan?</h2>
                <p className="text-xs text-[#6c757d] leading-relaxed">
                  Anda akan menghapus kegiatan{' '}
                  <strong className="text-[#212529]">
                    {deleteTarget.code} — {deleteTarget.name}
                  </strong>
                  . Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#f8f9fa] border border-[#e9ecef] text-xs text-[#495057] space-y-1">
              <p>
                Penyelenggara: <span className="font-semibold">{deleteTarget.organizer}</span>
              </p>
              <p>
                Peserta terdaftar:{' '}
                <span className="font-mono font-semibold">
                  {enrollments.filter((e) => e.trainingId === deleteTarget.id).length} orang
                </span>
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#e9ecef]">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-[#495057] border border-[#ced4da] hover:bg-[#f8f9fa] rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleConfirmDeleteTraining()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? 'Menghapus...' : 'Ya, Hapus Kegiatan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Kegiatan Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={(e) => void handleCreateSubmit(e)}
            className="bg-white border border-[#dee2e6] rounded-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#e9ecef]">
              <h2 className="text-base font-bold text-[#212529]">Tambah Kegiatan Pelatihan Baru</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[#6c757d] hover:text-[#212529]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#212529] mb-1">
                  Kode Kegiatan
                </label>
                <input
                  required
                  minLength={2}
                  maxLength={40}
                  type="text"
                  value={newForm.code}
                  onChange={(e) => setNewForm({ ...newForm, code: e.target.value })}
                  placeholder="DIKLAT-2026"
                  className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#212529] mb-1">
                  Nama Kegiatan
                </label>
                <input
                  required
                  minLength={3}
                  maxLength={200}
                  type="text"
                  value={newForm.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    const isDigitalisasi = val.toLowerCase().includes('digitalisasi pembelajaran');
                    setNewForm({ ...newForm, name: val, usesSamrLevels: isDigitalisasi });
                  }}
                  placeholder="Contoh: Bimtek Kurikulum Merdeka / Digitalisasi Pembelajaran"
                  className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#212529] mb-1">Deskripsi</label>
              <textarea
                rows={2}
                maxLength={2000}
                value={newForm.description}
                onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg"
              />
            </div>

            {/* Pilihan Khusus Model Level SAMR */}
            {(() => {
              const eligibleForSamr = newForm.name
                .toLowerCase()
                .includes('digitalisasi pembelajaran');
              return (
                <div
                  className={`p-3.5 rounded-xl border ${
                    eligibleForSamr
                      ? 'bg-[#e7f1fa]/70 border-[#b6d4fe]'
                      : 'bg-[#f8f9fa] border-[#dee2e6]'
                  }`}
                >
                  <label
                    className={`flex items-start gap-2.5 text-xs text-[#212529] ${
                      eligibleForSamr ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!eligibleForSamr}
                      checked={eligibleForSamr && newForm.usesSamrLevels}
                      onChange={(e) =>
                        setNewForm({
                          ...newForm,
                          usesSamrLevels: eligibleForSamr ? e.target.checked : false,
                        })
                      }
                      className="mt-0.5 accent-[#0f6cbf]"
                    />
                    <span>
                      <strong className={eligibleForSamr ? 'text-[#0b5394]' : 'text-[#495057]'}>
                        Aktifkan 4 Level SAMR (Khusus Kegiatan Digitalisasi Pembelajaran)
                      </strong>
                      <span className="block text-[11px] text-[#495057] mt-0.5">
                        {eligibleForSamr
                          ? 'Kegiatan Digitalisasi Pembelajaran menggunakan 4 Level SAMR (Substitution, Augmentation, Modification, Redefinition).'
                          : 'Model SAMR hanya aktif untuk kegiatan Digitalisasi Pembelajaran. Kegiatan ini otomatis menggunakan alur modul standar dengan Asesmen Awal yang disesuaikan dengan materinya.'}
                      </span>
                    </span>
                  </label>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#212529] mb-1">Penyelenggara</label>
                <input
                  required
                  type="text"
                  value={newForm.organizer}
                  onChange={(e) => setNewForm({ ...newForm, organizer: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#212529] mb-1">Lokasi</label>
                <input
                  required
                  type="text"
                  value={newForm.location}
                  onChange={(e) => setNewForm({ ...newForm, location: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#212529] mb-1">Mulai</label>
                <input
                  required
                  type="date"
                  value={newForm.startDate}
                  onChange={(e) => setNewForm({ ...newForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#212529] mb-1">Selesai</label>
                <input
                  required
                  type="date"
                  value={newForm.endDate}
                  onChange={(e) => setNewForm({ ...newForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#212529] mb-1">Kuota</label>
                <input
                  required
                  type="number"
                  min={1}
                  max={10000}
                  value={newForm.quota}
                  onChange={(e) => setNewForm({ ...newForm, quota: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg font-mono"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-[#212529]">
              <input
                type="checkbox"
                checked={newForm.requireApproval}
                onChange={(e) => setNewForm({ ...newForm, requireApproval: e.target.checked })}
              />
              Aktifkan verifikasi Panitia untuk pendaftaran peserta
            </label>
            <div className="flex justify-end gap-2 pt-3 border-t border-[#e9ecef]">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-medium text-[#495057] border border-[#ced4da] rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg"
              >
                Simpan Kegiatan Baru
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Edit Kegiatan */}
      {showEditModal && editingTraining && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={(e) => void handleEditTrainingSubmit(e)}
            className="bg-white border border-[#dee2e6] rounded-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#e9ecef]">
              <h2 className="text-base font-bold text-[#212529]">
                Edit Kegiatan · {editingTraining.code}
              </h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-[#6c757d] hover:text-[#212529]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-[#212529] mb-1">Nama Kegiatan</label>
                <input
                  required
                  type="text"
                  value={editForm.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    const isDigitalisasi = val.toLowerCase().includes('digitalisasi pembelajaran');
                    setEditForm({
                      ...editForm,
                      name: val,
                      usesSamrLevels: isDigitalisasi ? editForm.usesSamrLevels : false,
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#212529] mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value as TrainingStatus })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg bg-white"
                >
                  <option value="draft">Draft</option>
                  <option value="aktif">Aktif</option>
                  <option value="selesai">Selesai</option>
                  <option value="arsip">Arsip</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block font-semibold text-[#212529] mb-1">Deskripsi</label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg"
                />
              </div>
              {(() => {
                const editEligibleSamr = editForm.name
                  .toLowerCase()
                  .includes('digitalisasi pembelajaran');
                return (
                  <div
                    className={`sm:col-span-3 p-3 rounded-lg border ${
                      editEligibleSamr
                        ? 'bg-[#e7f1fa]/70 border-[#b6d4fe]'
                        : 'bg-[#f8f9fa] border-[#dee2e6]'
                    }`}
                  >
                    <label
                      className={`flex items-center gap-2 font-semibold ${
                        editEligibleSamr
                          ? 'text-[#0b5394] cursor-pointer'
                          : 'text-[#6c757d] cursor-not-allowed'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={!editEligibleSamr}
                        checked={editEligibleSamr && editForm.usesSamrLevels}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            usesSamrLevels: editEligibleSamr ? e.target.checked : false,
                          })
                        }
                        className="accent-[#0f6cbf]"
                      />
                      Gunakan 4 Level SAMR (Khusus Kegiatan Digitalisasi Pembelajaran)
                    </label>
                  </div>
                );
              })()}
            </div>

            {isSuperAdmin && (
              <div className="pt-3 border-t border-[#e9ecef] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="font-semibold text-[#212529] mb-1">Panitia / Admin</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {trainingAdmins.map((u) => (
                      <label key={u.uid} className="flex items-center gap-2 text-[#495057]">
                        <input
                          type="checkbox"
                          checked={editForm.adminUids.includes(u.uid)}
                          onChange={() =>
                            setEditForm({
                              ...editForm,
                              adminUids: toggleUidInList(editForm.adminUids, u.uid),
                            })
                          }
                        />
                        <span className="truncate">{u.fullName}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-[#212529] mb-1">Fasilitator</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {facilitators.map((u) => (
                      <label key={u.uid} className="flex items-center gap-2 text-[#495057]">
                        <input
                          type="checkbox"
                          checked={editForm.facilitatorUids.includes(u.uid)}
                          onChange={() =>
                            setEditForm({
                              ...editForm,
                              facilitatorUids: toggleUidInList(editForm.facilitatorUids, u.uid),
                            })
                          }
                        />
                        <span className="truncate">{u.fullName}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-[#212529] mb-1">Supervisor</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {monitors.map((u) => (
                      <label key={u.uid} className="flex items-center gap-2 text-[#495057]">
                        <input
                          type="checkbox"
                          checked={editForm.monitorUids.includes(u.uid)}
                          onChange={() =>
                            setEditForm({
                              ...editForm,
                              monitorUids: toggleUidInList(editForm.monitorUids, u.uid),
                            })
                          }
                        />
                        <span className="truncate">{u.fullName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[#e9ecef]">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-xs font-medium text-[#495057] border border-[#ced4da] rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Override Level SAMR */}
      {overrideTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={(e) => void handleOverrideSubmit(e)}
            className="bg-white border border-[#dee2e6] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center gap-2 text-amber-800">
              <UserCheck className="w-5 h-5" />
              <h2 className="text-base font-bold text-[#212529]">Override Level SAMR (Audit Tercatat)</h2>
            </div>
            <p className="text-xs text-[#6c757d]">
              Peserta: <strong className="text-[#212529]">{overrideTarget.userName}</strong> (Level {overrideTarget.currentLevel}).
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#212529] mb-1">Buka ke Level</label>
              <select
                value={overrideLevel}
                onChange={(e) => setOverrideLevel(Number(e.target.value) as 1 | 2 | 3 | 4)}
                className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg bg-white"
              >
                <option value={1}>Level 1 · Substitution</option>
                <option value={2}>Level 2 · Augmentation</option>
                <option value={3}>Level 3 · Modification</option>
                <option value={4}>Level 4 · Redefinition</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#212529] mb-1">
                Alasan Override (min. 8 karakter)
              </label>
              <textarea
                required
                minLength={8}
                rows={3}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOverrideTarget(null)}
                className="px-4 py-2 text-xs border border-[#ced4da] rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg"
              >
                Konfirmasi Override
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
