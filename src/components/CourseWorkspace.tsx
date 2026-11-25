import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Link2,
  ListChecks,
  Loader2,
  Lock,
  Megaphone,
  MessageSquare,
  MonitorPlay,
  PenLine,
  Plus,
  Search,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useLms } from '../context/LmsContext';
import { evaluateLevelStatus, extractYoutubeEmbedUrl } from '../lib/lmsRules';
import {
  resolveMaterialFileForViewing,
  uploadMaterialFilePersistent,
} from '../lib/materialFileStorage';
import {
  exportMonitoringToExcel,
  exportMonitoringToPdf,
  generateCertificatePdf,
} from '../lib/exporters';
import { QuestionRunner } from './QuestionRunner';
import { AccessLinksPanel } from './AccessLinksPanel';
import { MaterialUploadModal } from './MaterialUploadModal';
import {
  AnswerKeyEntry,
  DEFAULT_SAMR_RUBRIC,
  isSamrTraining,
  LearningLevel,
  LearningMaterial,
  LEVEL_NAMES,
  LEVEL_SHORT_NAMES,
  LevelCardStatus,
  QuestionBank,
  QuestionItem,
  ROLE_LABELS,
  RUBRIC_SCALE_LABELS,
  SAMR_LEVEL_META,
  TrainingProgram,
  UserRole,
} from '../types/lms';

export type WorkspaceTopTab = 'kursus' | 'peserta' | 'nilai' | 'aktivitas' | 'tautan' | 'kelola';

interface SidebarItem {
  id: string;
  sectionId: string;
  label: string;
  kind:
    | 'panduan'
    | 'pretest'
    | 'pengantar'
    | 'material'
    | 'demonstrasi'
    | 'eksplorasi'
    | 'nalar_kritis'
    | 'diskusi'
    | 'analisis_diskusi'
    | 'tugas_praktik'
    | 'kuis'
    | 'evaluasi'
    | 'refleksi';
  levelNumber: 1 | 2 | 3 | 4;
  material?: LearningMaterial;
  done: boolean;
  locked: boolean;
  optional?: boolean;
  prereqLocked?: boolean;
}

interface SidebarSection {
  id: string;
  title: string;
  subtitle?: string;
  levelNumber?: 1 | 2 | 3 | 4;
  locked?: boolean;
  optional?: boolean;
  items: SidebarItem[];
}

interface DiscussionPost {
  id: string;
  authorName: string;
  authorRole: string;
  text: string;
  createdAt: string;
}

const STATUS_LABEL_MAP: Record<LevelCardStatus, { text: string; tone: string }> = {
  tidak_diwajibkan: { text: 'Tidak Diwajibkan', tone: 'text-[#6c757d]' },
  belum_terbuka: { text: 'Terkunci', tone: 'text-[#6c757d]' },
  terbuka: { text: 'Aktif', tone: 'text-[#0f6cbf]' },
  sedang_dipelajari: { text: 'Sedang Dipelajari', tone: 'text-[#0f6cbf]' },
  menunggu_evaluasi: { text: 'Menunggu Evaluasi', tone: 'text-amber-700' },
  lulus: { text: 'Selesai', tone: 'text-[#198754]' },
  belum_lulus: { text: 'Perlu Perbaikan', tone: 'text-red-700' },
};

interface CourseWorkspaceProps {
  /** Menampilkan tab Kelola Kegiatan serta tombol Tambah & Hapus Kegiatan untuk Panitia/Admin */
  showManagementFeatures?: boolean;
  onOpenCreateTraining?: () => void;
  onRequestDeleteTraining?: (training: TrainingProgram) => void;
  renderManagementTab?: (training: TrainingProgram) => React.ReactNode;
  selectedTrainingIdOverride?: string;
  onSelectTrainingChange?: (trainingId: string) => void;
}

export function CourseWorkspace({
  showManagementFeatures = false,
  onOpenCreateTraining,
  onRequestDeleteTraining,
  renderManagementTab,
  selectedTrainingIdOverride,
  onSelectTrainingChange,
}: CourseWorkspaceProps) {
  const {
    currentUser,
    effectiveRole,
    profiles,
    trainings,
    levels,
    materials,
    materialProgress,
    questionBanks,
    enrollments,
    attempts,
    taskSubmissions,
    levelReflections,
    certificates,
    schedules,
    announcements,
    facilitatorNotes,
    activityLogs,
    institutionSettings,
    markMaterialProgress,
    verifyAndUnlockLevel,
    submitPracticalTask,
    saveLevelReflection,
    saveMaterial,
    saveQuestionBank,
    deleteMaterial,
    enrollInTraining,
    createFacilitatorNote,
    showToast,
  } = useLms();

  const [searchParams] = useSearchParams();
  const isStaff =
    effectiveRole === 'super_admin' ||
    effectiveRole === 'admin_kegiatan' ||
    effectiveRole === 'fasilitator';
  const canManage = effectiveRole === 'super_admin' || effectiveRole === 'admin_kegiatan';
  const canMonitor = isStaff || effectiveRole === 'pemantau';

  // Untuk peserta: HANYA tampilkan kegiatan yang benar-benar diikuti / didaftarkan
  const visibleTrainings = useMemo(() => {
    if (!currentUser) return [];
    if (canMonitor) return trainings;
    const enrolledIds = new Set(
      enrollments
        .filter((e) => e.userId === currentUser.uid && e.status !== 'ditolak')
        .map((e) => e.trainingId),
    );
    return trainings.filter((t) => enrolledIds.has(t.id));
  }, [trainings, enrollments, currentUser, canMonitor]);

  // Rekomendasi kegiatan aktif yang belum diikuti peserta
  const recommendedTrainings = useMemo(() => {
    if (!currentUser || canMonitor) return [];
    const enrolledIds = new Set(
      enrollments.filter((e) => e.userId === currentUser.uid).map((e) => e.trainingId),
    );
    return trainings.filter((t) => t.status === 'aktif' && !enrolledIds.has(t.id));
  }, [trainings, enrollments, currentUser, canMonitor]);

  const [activitySearch, setActivitySearch] = useState('');
  const [activityFilter, setActivityFilter] = useState<'all' | 'asesmen' | 'materi' | 'lainnya'>('all');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  const queryTrainingId = searchParams.get('training') || searchParams.get('kegiatan') || '';
  const queryActivity = searchParams.get('aktivitas') || '';
  const queryLevelRaw = Number(searchParams.get('level') || 0);
  const queryLevelNum =
    queryLevelRaw >= 1 && queryLevelRaw <= 4 ? (queryLevelRaw as 1 | 2 | 3 | 4) : 0;
  const [internalTrainingId, setInternalTrainingId] = useState(
    selectedTrainingIdOverride || queryTrainingId || visibleTrainings[0]?.id || '',
  );

  useEffect(() => {
    if (selectedTrainingIdOverride) {
      setInternalTrainingId(selectedTrainingIdOverride);
    }
  }, [selectedTrainingIdOverride]);

  const selectedTraining =
    visibleTrainings.find((t) => t.id === internalTrainingId) || visibleTrainings[0] || null;

  const handleTrainingSwitch = (nextId: string) => {
    setInternalTrainingId(nextId);
    onSelectTrainingChange?.(nextId);
  };

  const usesSamr = isSamrTraining(selectedTraining);

  const enrollment = useMemo(() => {
    if (!currentUser || !selectedTraining) return null;
    return (
      enrollments.find(
        (e) => e.trainingId === selectedTraining.id && e.userId === currentUser.uid,
      ) || null
    );
  }, [enrollments, selectedTraining, currentUser]);

  const trainingLevels = useMemo(
    () =>
      selectedTraining
        ? levels
            .filter((l) => l.trainingId === selectedTraining.id)
            .sort((a, b) => a.levelNumber - b.levelNumber)
        : [],
    [levels, selectedTraining],
  );

  const trainingMaterials = useMemo(
    () =>
      selectedTraining
        ? materials
            .filter((m) => m.trainingId === selectedTraining.id && m.isActive)
            .sort((a, b) => a.levelNumber - b.levelNumber || a.orderIndex - b.orderIndex)
        : [],
    [materials, selectedTraining],
  );

  const levelSummaries = useMemo(() => {
    if (!selectedTraining) return [];
    const fallbackEnr = enrollment || {
      id: 'preview',
      trainingId: selectedTraining.id,
      userId: currentUser?.uid || 'staff',
      userName: currentUser?.fullName || 'Staf',
      instansi: '',
      kabupatenKota: '',
      status: 'aktif' as const,
      startingLevel: 1,
      currentLevel: 1,
      unlockedLevels: [1, 2, 3, 4],
      completedLevels: [],
      assessmentScore: -1,
      overallProgress: 0,
      certificateNumber: '',
      approvedBy: '',
      enrolledAt: '',
      updatedAt: '',
    };
    return trainingLevels.map((lv) => ({
      level: lv,
      summary: evaluateLevelStatus({
        enrollment: isStaff || !usesSamr ? { ...fallbackEnr, unlockedLevels: [1, 2, 3, 4], startingLevel: 1 } : fallbackEnr,
        level: lv,
        materials,
        progressList: materialProgress,
        attempts,
        taskSubmissions,
        reflections: levelReflections,
      }),
    }));
  }, [
    selectedTraining,
    enrollment,
    currentUser,
    trainingLevels,
    isStaff,
    usesSamr,
    materials,
    materialProgress,
    attempts,
    taskSubmissions,
    levelReflections,
  ]);

  // Persistent local completion markers for non-material activities (panduan, pengantar, nalar kritis, diskusi, sintesis)
  const visitedKey = `pamandai_seen_${currentUser?.uid || 'anon'}_${selectedTraining?.id || 'none'}`;
  const [completedActivityIds, setCompletedActivityIds] = useState<string[]>(['panduan']);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(visitedKey);
      const parsed = raw ? (JSON.parse(raw) as string[]) : ['panduan'];
      setCompletedActivityIds(parsed.length > 0 ? parsed : ['panduan']);
    } catch {
      setCompletedActivityIds(['panduan']);
    }
  }, [visitedKey]);

  const markActivitySeen = (actId: string) => {
    setCompletedActivityIds((prev) => {
      if (prev.includes(actId)) return prev;
      const next = [...prev, actId];
      try {
        localStorage.setItem(visitedKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Interactive Forum Diskusi per training
  const forumStorageKey = `pamandai_forum_${selectedTraining?.id || 'none'}`;
  const [forumPosts, setForumPosts] = useState<DiscussionPost[]>([]);
  const [newForumText, setNewForumText] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(forumStorageKey);
      if (raw) {
        setForumPosts(JSON.parse(raw) as DiscussionPost[]);
      } else {
        setForumPosts([
          {
            id: 'post_seed_1',
            authorName: 'Dr. Budi Hartono',
            authorRole: 'Fasilitator',
            text: 'Selamat datang di Forum Berbagi Praktik Baik! Silakan bagikan tantangan dan strategi terbaik Anda saat menerapkan materi pelatihan ini di satuan pendidikan.',
            createdAt: 'Hari ini · 08:30',
          },
        ]);
      }
    } catch {
      setForumPosts([]);
    }
  }, [forumStorageKey]);

  const handleAddForumPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForumText.trim() || !currentUser) return;
    const nextPost: DiscussionPost = {
      id: `post_${Date.now()}`,
      authorName: currentUser.fullName,
      authorRole: effectiveRole || 'peserta',
      text: newForumText.trim(),
      createdAt: new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    const next = [...forumPosts, nextPost];
    setForumPosts(next);
    setNewForumText('');
    markActivitySeen('diskusi');
    try {
      localStorage.setItem(forumStorageKey, JSON.stringify(next));
    } catch {
      // ignore
    }
    showToast('success', 'Tanggapan forum diskusi berhasil dipublikasikan.');
  };

  // Interactive Synthesis note
  const synthesisKey = `pamandai_synth_${currentUser?.uid || 'anon'}_${selectedTraining?.id || 'none'}`;
  const [synthesisText, setSynthesisText] = useState('');
  useEffect(() => {
    try {
      setSynthesisText(localStorage.getItem(synthesisKey) || '');
    } catch {
      setSynthesisText('');
    }
  }, [synthesisKey]);

  const handleSaveSynthesis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!synthesisText.trim()) return;
    try {
      localStorage.setItem(synthesisKey, synthesisText.trim());
    } catch {
      // ignore
    }
    markActivitySeen('analisis_diskusi');
    showToast('success', 'Sintesis hasil kolaborasi berhasil disimpan.');
  };

  const pretestDone = useMemo(() => {
    if (!selectedTraining) return false;
    const uid = currentUser?.uid || '';
    return Boolean(
      (enrollment && enrollment.assessmentScore >= 0) ||
        attempts.some(
          (a) =>
            a.trainingId === selectedTraining.id &&
            a.userId === uid &&
            a.kind === 'assessment',
        ) ||
        completedActivityIds.includes('pretest'),
    );
  }, [selectedTraining, currentUser?.uid, enrollment, attempts, completedActivityIds]);

  const isMaterialCompleted = (matId: string) => {
    const uid = currentUser?.uid || '';
    return (
      materialProgress.some(
        (p) => p.materialId === matId && p.userId === uid && p.status === 'selesai',
      ) || completedActivityIds.includes(`mat_${matId}`)
    );
  };

  const getMaterialQuizBank = (mat: LearningMaterial): QuestionBank | undefined => {
    if (!selectedTraining) return undefined;
    return (
      questionBanks.find(
        (b) =>
          b.trainingId === selectedTraining.id &&
          b.kind === 'quiz' &&
          b.materialId === mat.id,
      ) ||
      questionBanks.find(
        (b) =>
          b.trainingId === selectedTraining.id &&
          b.kind === 'quiz' &&
          !b.materialId &&
          b.levelNumber === mat.levelNumber,
      ) ||
      (!usesSamr
        ? questionBanks.find(
            (b) =>
              b.trainingId === selectedTraining.id &&
              b.kind === 'quiz' &&
              !b.materialId,
          )
        : undefined)
    );
  };

  // Build Sidebar Sections: SAMR (only for Pemanfaatan Digitalisasi Pembelajaran) vs Standard Modules
  const sections: SidebarSection[] = useMemo(() => {
    if (!selectedTraining) return [];
    const uid = currentUser?.uid || '';

    const isMatDone = (matId: string) =>
      materialProgress.some(
        (p) => p.materialId === matId && p.userId === uid && p.status === 'selesai',
      ) || completedActivityIds.includes(`mat_${matId}`);

    const isBankPassed = (bankId?: string) =>
      Boolean(
        bankId &&
          attempts.some((a) => a.bankId === bankId && a.userId === uid && a.passed),
      );

    if (!usesSamr) {
      // Non-SAMR: Multi-materi + kuis khusus setelah setiap materi + evaluasi akhir setelah semua materi selesai
      const lv1Summary = levelSummaries[0]?.summary;
      const quizDone = Boolean(lv1Summary?.quizPassed || completedActivityIds.includes('kuis_1'));
      const evalDone = Boolean(lv1Summary?.evalPassed || completedActivityIds.includes('evaluasi_1'));
      const taskDone = Boolean(
        lv1Summary?.practiceSubmitted || completedActivityIds.includes('tugas_1'),
      );
      const refDone = Boolean(
        lv1Summary?.reflectionDone || completedActivityIds.includes('refleksi_1'),
      );
      const allTrainingMatsDone =
        trainingMaterials.length === 0 || trainingMaterials.every((m) => isMatDone(m.id));

      const matAndQuizItems: SidebarItem[] =
        trainingMaterials.length > 0
          ? trainingMaterials.flatMap((mat, idx) => {
              const matDone = isMatDone(mat.id);
              const matQuizBank =
                questionBanks.find(
                  (b) =>
                    b.trainingId === selectedTraining.id &&
                    b.kind === 'quiz' &&
                    b.materialId === mat.id,
                ) ||
                questionBanks.find(
                  (b) =>
                    b.trainingId === selectedTraining.id &&
                    b.kind === 'quiz' &&
                    !b.materialId &&
                    b.levelNumber === mat.levelNumber,
                );
              const matQuizDone =
                isBankPassed(matQuizBank?.id) ||
                completedActivityIds.includes(`kuis_mat_${mat.id}`);
              return [
                {
                  id: `mat_${mat.id}`,
                  sectionId: 'sec_eksplorasi',
                  label: `${idx + 1}. ${mat.title}`,
                  kind: 'material' as const,
                  levelNumber: mat.levelNumber,
                  material: mat,
                  done: matDone,
                  locked: false,
                },
                {
                  id: `kuis_mat_${mat.id}`,
                  sectionId: 'sec_eksplorasi',
                  label: `Kuis Materi ${idx + 1}: ${mat.title}`,
                  kind: 'kuis' as const,
                  levelNumber: mat.levelNumber,
                  material: mat,
                  done: matQuizDone,
                  locked: false,
                  prereqLocked: !matDone,
                },
              ];
            })
          : [
              {
                id: 'mat_empty',
                sectionId: 'sec_eksplorasi',
                label: 'Belum ada materi diunggah',
                kind: 'material',
                levelNumber: 1,
                done: false,
                locked: false,
              },
            ];

      return [
        {
          id: 'sec_konteks',
          title: 'Memahami Konteks',
          items: [
            {
              id: 'panduan',
              sectionId: 'sec_konteks',
              label: 'Panduan Pembelajaran di LMS',
              kind: 'panduan',
              levelNumber: 1,
              done: completedActivityIds.includes('panduan'),
              locked: false,
            },
            {
              id: 'pretest',
              sectionId: 'sec_konteks',
              label: 'Asesmen Awal (Pretest)',
              kind: 'pretest',
              levelNumber: 1,
              done: pretestDone,
              locked: false,
            },
            {
              id: 'pengantar',
              sectionId: 'sec_konteks',
              label: `Pengantar ${selectedTraining.code}`,
              kind: 'pengantar',
              levelNumber: 1,
              done: completedActivityIds.includes('pengantar'),
              locked: false,
            },
          ],
        },
        {
          id: 'sec_eksplorasi',
          title: `Eksplorasi Materi & Kuis (${trainingMaterials.length})`,
          items: matAndQuizItems,
        },
        {
          id: 'sec_nalar',
          title: 'Nalar Kritis',
          items: [
            {
              id: 'nalar_kritis',
              sectionId: 'sec_nalar',
              label: 'Studi Kasus & Analisis Praktik',
              kind: 'nalar_kritis',
              levelNumber: 1,
              done: completedActivityIds.includes('nalar_kritis'),
              locked: false,
            },
          ],
        },
        {
          id: 'sec_diskusi',
          title: 'Diskusi dan Kolaborasi',
          items: [
            {
              id: 'diskusi',
              sectionId: 'sec_diskusi',
              label: 'Forum Berbagi Praktik Baik',
              kind: 'diskusi',
              levelNumber: 1,
              done: completedActivityIds.includes('diskusi'),
              locked: false,
            },
          ],
        },
        {
          id: 'sec_analisis',
          title: 'Analisis Hasil Diskusi',
          items: [
            {
              id: 'analisis_diskusi',
              sectionId: 'sec_analisis',
              label: 'Sintesis Hasil Kolaborasi',
              kind: 'analisis_diskusi',
              levelNumber: 1,
              done: completedActivityIds.includes('analisis_diskusi'),
              locked: false,
            },
          ],
        },
        {
          id: 'sec_latihan',
          title: 'Latihan, Evaluasi & Refleksi',
          items: [
            {
              id: 'tugas_1',
              sectionId: 'sec_latihan',
              label: 'Tugas Praktik & Karya',
              kind: 'tugas_praktik',
              levelNumber: 1,
              done: taskDone,
              locked: false,
            },
            ...(trainingMaterials.length === 0
              ? [
                  {
                    id: 'kuis_1',
                    sectionId: 'sec_latihan',
                    label: 'Kuis Pemahaman',
                    kind: 'kuis' as const,
                    levelNumber: 1 as const,
                    done: quizDone,
                    locked: false,
                  },
                ]
              : []),
            {
              id: 'evaluasi_1',
              sectionId: 'sec_latihan',
              label: 'Evaluasi Akhir Keseluruhan',
              kind: 'evaluasi',
              levelNumber: 1,
              done: evalDone,
              locked: false,
              prereqLocked: !allTrainingMatsDone,
            },
            {
              id: 'refleksi_1',
              sectionId: 'sec_latihan',
              label: 'Refleksi Pembelajaran',
              kind: 'refleksi',
              levelNumber: 1,
              done: refDone,
              locked: false,
            },
          ],
        },
      ];
    }

    // SAMR Mode (ONLY for Pemanfaatan Digitalisasi Pembelajaran)
    const contextSection: SidebarSection = {
      id: 'sec_konteks',
      title: 'Memahami Konteks',
      items: [
        {
          id: 'panduan',
          sectionId: 'sec_konteks',
          label: 'Panduan Pembelajaran di LMS',
          kind: 'panduan',
          levelNumber: 1,
          done: completedActivityIds.includes('panduan'),
          locked: false,
        },
        {
          id: 'pretest',
          sectionId: 'sec_konteks',
          label: 'Asesmen Awal SAMR (Pretest)',
          kind: 'pretest',
          levelNumber: 1,
          done: pretestDone,
          locked: false,
        },
        {
          id: 'pengantar',
          sectionId: 'sec_konteks',
          label: 'Pengantar Digitalisasi Pembelajaran',
          kind: 'pengantar',
          levelNumber: 1,
          done: completedActivityIds.includes('pengantar'),
          locked: false,
        },
      ],
    };

    const samrSections: SidebarSection[] = levelSummaries.map(({ level, summary }) => {
      const lvNum = level.levelNumber;
      const isUnlocked =
        isStaff || Boolean(enrollment?.unlockedLevels.includes(lvNum));
      const isBelowStarting =
        !isStaff &&
        Boolean(enrollment && enrollment.startingLevel > 1 && lvNum < enrollment.startingLevel);
      const isAccessible = isUnlocked || isBelowStarting;
      const lvMats = trainingMaterials.filter((m) => m.levelNumber === lvNum);
      const allLvMatsDone = lvMats.length === 0 || lvMats.every((m) => isMatDone(m.id));
      const secId = `sec_samr_${lvNum}`;

      const matAndQuizItems: SidebarItem[] = lvMats.flatMap((mat, idx) => {
        const matDone = isMatDone(mat.id);
        const matQuizBank =
          questionBanks.find(
            (b) =>
              b.trainingId === selectedTraining.id &&
              b.kind === 'quiz' &&
              b.materialId === mat.id,
          ) ||
          questionBanks.find(
            (b) =>
              b.trainingId === selectedTraining.id &&
              b.kind === 'quiz' &&
              !b.materialId &&
              b.levelNumber === lvNum,
          );
        const matQuizDone =
          isBankPassed(matQuizBank?.id) ||
          completedActivityIds.includes(`kuis_mat_${mat.id}`);
        return [
          {
            id: `mat_${mat.id}`,
            sectionId: secId,
            label: `${idx + 1}. ${mat.title}`,
            kind: 'material' as const,
            levelNumber: lvNum,
            material: mat,
            done: matDone,
            locked: !isAccessible,
            optional: isBelowStarting,
          },
          {
            id: `kuis_mat_${mat.id}`,
            sectionId: secId,
            label: `Kuis Materi ${idx + 1}: ${mat.title}`,
            kind: 'kuis' as const,
            levelNumber: lvNum,
            material: mat,
            done: matQuizDone,
            locked: !isAccessible,
            optional: isBelowStarting,
            prereqLocked: isBelowStarting ? false : !matDone,
          },
        ];
      });

      return {
        id: secId,
        title: `Level ${lvNum}: ${LEVEL_SHORT_NAMES[lvNum]}`,
        subtitle: isBelowStarting
          ? 'Tidak Wajib · Terbuka'
          : STATUS_LABEL_MAP[summary.status].text,
        levelNumber: lvNum,
        locked: !isAccessible,
        optional: isBelowStarting,
        items: [
          ...matAndQuizItems,
          {
            id: `demo_${lvNum}`,
            sectionId: secId,
            label: `Video & Demonstrasi PID (L${lvNum})`,
            kind: 'demonstrasi',
            levelNumber: lvNum,
            done: completedActivityIds.includes(`demo_${lvNum}`),
            locked: !isAccessible,
            optional: isBelowStarting,
          },
          {
            id: `eks_${lvNum}`,
            sectionId: secId,
            label: `Eksplorasi PID & Nalar Kritis (L${lvNum})`,
            kind: 'eksplorasi',
            levelNumber: lvNum,
            done: completedActivityIds.includes(`eks_${lvNum}`),
            locked: !isAccessible,
            optional: isBelowStarting,
          },
          {
            id: `tugas_${lvNum}`,
            sectionId: secId,
            label: `Tugas Praktik & Pengumpulan (L${lvNum})`,
            kind: 'tugas_praktik',
            levelNumber: lvNum,
            done: summary.practiceSubmitted,
            locked: !isAccessible,
            optional: isBelowStarting,
          },
          ...(lvMats.length === 0
            ? [
                {
                  id: `kuis_${lvNum}`,
                  sectionId: secId,
                  label: `Kuis Pemahaman (L${lvNum})`,
                  kind: 'kuis' as const,
                  levelNumber: lvNum,
                  done: summary.quizPassed,
                  locked: !isAccessible,
                  optional: isBelowStarting,
                },
              ]
            : []),
          {
            id: `evaluasi_${lvNum}`,
            sectionId: secId,
            label: `Evaluasi Akhir Level ${lvNum}`,
            kind: 'evaluasi',
            levelNumber: lvNum,
            done: summary.evalPassed,
            locked: !isAccessible,
            optional: isBelowStarting,
            prereqLocked: isBelowStarting ? false : !allLvMatsDone,
          },
          {
            id: `refleksi_${lvNum}`,
            sectionId: secId,
            label: `Refleksi & Pendampingan (L${lvNum})`,
            kind: 'refleksi',
            levelNumber: lvNum,
            done: summary.reflectionDone,
            locked: !isAccessible,
            optional: isBelowStarting,
          },
        ],
      };
    });

    return [contextSection, ...samrSections];
  }, [
    selectedTraining,
    currentUser,
    materialProgress,
    enrollment,
    pretestDone,
    completedActivityIds,
    usesSamr,
    levelSummaries,
    trainingMaterials,
    questionBanks,
    attempts,
    isStaff,
  ]);

  const flatItems = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  const [topTab, setTopTab] = useState<WorkspaceTopTab>('kursus');
  const [activeItemId, setActiveItemId] = useState<string>('pretest');
  const [openSectionIds, setOpenSectionIds] = useState<string[]>([
    'sec_konteks',
    'sec_eksplorasi',
    'sec_nalar',
    'sec_diskusi',
    'sec_analisis',
    'sec_latihan',
    'sec_samr_1',
    'sec_samr_2',
    'sec_samr_3',
    'sec_samr_4',
  ]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingMaterialObj, setEditingMaterialObj] = useState<LearningMaterial | null>(null);
  const [uploadTargetLevelNum, setUploadTargetLevelNum] = useState<1 | 2 | 3 | 4>(1);
  const [syncingPretest, setSyncingPretest] = useState(false);
  const [syncingMaterialQuizId, setSyncingMaterialQuizId] = useState<string | null>(null);
  const [syncingEvaluation, setSyncingEvaluation] = useState(false);
  const [openViewerMaterialId, setOpenViewerMaterialId] = useState<string | null>(null);
  const [viewerState, setViewerState] = useState<'idle' | 'loading' | 'ready' | 'expired' | 'error'>('idle');
  const [viewerTextBody, setViewerTextBody] = useState<string | null>(null);
  const [viewerResolvedUrl, setViewerResolvedUrl] = useState<string | null>(null);
  const [viewerDownloadUrl, setViewerDownloadUrl] = useState<string | null>(null);
  const [viewerUploadProgress, setViewerUploadProgress] = useState<string>('');
  const [viewerUploadError, setViewerUploadError] = useState<string>('');
  const [reuploadingMatId, setReuploadingMatId] = useState<string | null>(null);
  const [inlineLinkInput, setInlineLinkInput] = useState<string>('');
  const [savingInlineLink, setSavingInlineLink] = useState<boolean>(false);

  const findFirstItemForLevel = (lvNum: number): SidebarItem | null => {
    const sec = sections.find((s) => s.id === `sec_samr_${lvNum}`);
    if (!sec || sec.items.length === 0) return null;
    return sec.items[0];
  };

  // Buka Asesmen Awal otomatis saat membuka kegiatan, atau langsung ke Level penempatan SAMR / query ?level=
  const lastAutoOpenedRef = useRef<string>('');
  useEffect(() => {
    if (!selectedTraining) return;
    const visitKey = `${selectedTraining.id}::${queryActivity}::${queryLevelNum}`;
    if (lastAutoOpenedRef.current === visitKey) return;
    lastAutoOpenedRef.current = visitKey;

    if (queryActivity === 'pretest' || (!isStaff && !pretestDone)) {
      setActiveItemId('pretest');
      setTopTab('kursus');
      setOpenSectionIds((prev) =>
        prev.includes('sec_konteks') ? prev : ['sec_konteks', ...prev],
      );
      return;
    }

    if (usesSamr && queryLevelNum >= 1 && queryLevelNum <= 4) {
      const targetItem = findFirstItemForLevel(queryLevelNum);
      if (targetItem && (!targetItem.locked || isStaff)) {
        setActiveItemId(targetItem.id);
        setTopTab('kursus');
        setOpenSectionIds((prev) =>
          prev.includes(targetItem.sectionId) ? prev : [targetItem.sectionId, ...prev],
        );
        return;
      }
    }

    if (usesSamr && !isStaff && enrollment && enrollment.startingLevel >= 1) {
      const preferredLevel = enrollment.currentLevel || enrollment.startingLevel;
      const targetItem = findFirstItemForLevel(preferredLevel);
      if (targetItem && !targetItem.locked) {
        setActiveItemId(targetItem.id);
        setTopTab('kursus');
        setOpenSectionIds((prev) =>
          prev.includes(targetItem.sectionId) ? prev : [targetItem.sectionId, ...prev],
        );
        return;
      }
    }

    setActiveItemId('panduan');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTraining, queryActivity, queryLevelNum, isStaff, pretestDone, usesSamr]);

  const activeItem = flatItems.find((i) => i.id === activeItemId) || flatItems[0] || null;
  const activeItemIndex = activeItem ? flatItems.findIndex((i) => i.id === activeItem.id) : -1;
  const nextItem = useMemo(() => {
    if (!activeItem) return null;
    // Pada mode SAMR, selesai Pretest atau Pengantar langsung menuju level penempatan (Level 1/2/3/4)
    if (
      usesSamr &&
      !isStaff &&
      enrollment &&
      enrollment.startingLevel >= 1 &&
      (activeItem.kind === 'pengantar' || (activeItem.kind === 'pretest' && pretestDone))
    ) {
      const placedFirst = findFirstItemForLevel(enrollment.startingLevel);
      if (placedFirst) {
        return placedFirst;
      }
    }
    return activeItemIndex >= 0 && activeItemIndex < flatItems.length - 1
      ? flatItems[activeItemIndex + 1]
      : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItem, activeItemIndex, flatItems, usesSamr, isStaff, enrollment?.startingLevel, pretestDone]);
  const prevItem = activeItemIndex > 0 ? flatItems[activeItemIndex - 1] : null;

  const activeLevelNumber: 1 | 2 | 3 | 4 = activeItem?.levelNumber || 1;
  const activeLevelObj: LearningLevel | null =
    trainingLevels.find((l) => l.levelNumber === activeLevelNumber) || trainingLevels[0] || null;
  const activeLevelSummary =
    levelSummaries.find((s) => s.level.levelNumber === activeLevelNumber)?.summary || null;

  // Automatically record view when selecting passive activities
  useEffect(() => {
    if (!activeItem || activeItem.locked) return;
    if (activeItem.kind === 'panduan' || activeItem.kind === 'pengantar') {
      markActivitySeen(activeItem.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItem?.id]);

  // Task submission form
  const existingTaskSub = useMemo(() => {
    if (!currentUser || !selectedTraining) return null;
    return (
      taskSubmissions.find(
        (s) =>
          s.trainingId === selectedTraining.id &&
          s.levelNumber === activeLevelNumber &&
          s.userId === currentUser.uid,
      ) || null
    );
  }, [taskSubmissions, selectedTraining, activeLevelNumber, currentUser]);

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    productUrl: '',
    productFileName: '',
    docMediaUrl: '',
    docMediaName: '',
  });

  useEffect(() => {
    setTaskForm({
      title: existingTaskSub?.title || '',
      description: existingTaskSub?.description || '',
      productUrl: existingTaskSub?.productUrl || '',
      productFileName: existingTaskSub?.productFileName || '',
      docMediaUrl: existingTaskSub?.docMediaUrl || '',
      docMediaName: existingTaskSub?.docMediaName || '',
    });
  }, [existingTaskSub, activeLevelNumber, selectedTraining?.id]);

  // Reflection form
  const existingReflection = useMemo(() => {
    if (!currentUser || !selectedTraining) return null;
    return (
      levelReflections.find(
        (r) =>
          r.trainingId === selectedTraining.id &&
          r.levelNumber === activeLevelNumber &&
          r.userId === currentUser.uid,
      ) || null
    );
  }, [levelReflections, selectedTraining, activeLevelNumber, currentUser]);

  const [reflectionForm, setReflectionForm] = useState({
    learningExperience: '',
    challenges: '',
    competenciesGained: '',
    schoolImplementationPlan: '',
  });

  useEffect(() => {
    setReflectionForm({
      learningExperience: existingReflection?.learningExperience || '',
      challenges: existingReflection?.challenges || '',
      competenciesGained: existingReflection?.competenciesGained || '',
      schoolImplementationPlan: existingReflection?.schoolImplementationPlan || '',
    });
  }, [existingReflection, activeLevelNumber, selectedTraining?.id]);

  // Facilitator Note form
  const [noteTargetUid, setNoteTargetUid] = useState('all');
  const [noteContent, setNoteContent] = useState('');

  const handleQuickEnrollRecommended = async (trainingId: string) => {
    setEnrollingId(trainingId);
    try {
      const res = await enrollInTraining(trainingId);
      if (res.ok) {
        setInternalTrainingId(trainingId);
        onSelectTrainingChange?.(trainingId);
      }
    } finally {
      setEnrollingId(null);
    }
  };

  if (!currentUser || !selectedTraining) {
    return (
      <div className="p-6 sm:p-10 max-w-4xl mx-auto space-y-6">
        <div className="bg-white border border-[#dee2e6] rounded-xl p-8 text-center space-y-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <BookOpen className="w-10 h-10 text-[#0f6cbf] mx-auto" />
          <h2 className="text-lg font-bold text-[#212529]">
            {canMonitor
              ? 'Belum ada kegiatan pelatihan aktif.'
              : 'Anda belum mengikuti kegiatan pelatihan apa pun'}
          </h2>
          <p className="text-xs sm:text-sm text-[#6c757d] max-w-lg mx-auto">
            {canMonitor
              ? 'Tambahkan kegiatan pelatihan baru untuk mulai mengelola materi, peserta, kuis, dan evaluasi.'
              : 'Hanya kegiatan yang sudah Anda ikuti atau daftarkan yang muncul pada daftar pelatihan Anda. Pilih salah satu rekomendasi kegiatan di bawah ini untuk mulai belajar.'}
          </p>
          {canManage && onOpenCreateTraining && (
            <button
              type="button"
              onClick={onOpenCreateTraining}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Buat Kegiatan Pertama
            </button>
          )}
        </div>

        {!canMonitor && recommendedTrainings.length > 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#212529]">
                Rekomendasi Kegiatan yang Bisa Diikuti Selanjutnya
              </h3>
              <p className="text-xs text-[#6c757d] mt-0.5">
                Daftar kegiatan pelatihan aktif yang tersedia untuk Anda ikuti sekarang.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendedTrainings.map((trn) => {
                const trnUsesSamr = isSamrTraining(trn);
                return (
                  <div
                    key={trn.id}
                    className="bg-white border border-[#dee2e6] rounded-xl p-5 flex flex-col justify-between gap-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
                  >
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-mono text-[#0f6cbf] font-semibold">
                        {trn.code} · {trnUsesSamr ? 'Model 4 Level SAMR' : 'Modul Berurutan Standar'}
                      </p>
                      <h4 className="text-sm font-bold text-[#212529]">{trn.name}</h4>
                      <p className="text-xs text-[#6c757d] line-clamp-3 leading-relaxed">
                        {trn.description}
                      </p>
                      <p className="text-[11px] text-[#6c757d] pt-1">
                        Jadwal: {trn.startDate} s.d. {trn.endDate} · Kuota {trn.quota}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-[#e9ecef]">
                      <span className="text-[11px] text-[#6c757d]">
                        {trn.requireApproval ? 'Verifikasi Panitia' : 'Pendaftaran Langsung Aktif'}
                      </span>
                      <button
                        type="button"
                        disabled={enrollingId === trn.id}
                        onClick={() => void handleQuickEnrollRecommended(trn.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {enrollingId === trn.id ? 'Mendaftar...' : 'Daftar & Ikuti Kegiatan'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  const courseEnrollments = enrollments.filter((e) => e.trainingId === selectedTraining.id);
  const filteredEnrollments = courseEnrollments.filter((enr) => {
    const q = participantSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      enr.userName.toLowerCase().includes(q) ||
      enr.instansi.toLowerCase().includes(q) ||
      (enr.npsn || '').toLowerCase().includes(q) ||
      enr.kabupatenKota.toLowerCase().includes(q)
    );
  });

  const pretestBank = questionBanks.find(
    (b) => b.trainingId === selectedTraining.id && b.kind === 'assessment',
  );
  const activeQuizBank = activeItem?.material
    ? getMaterialQuizBank(activeItem.material)
    : questionBanks.find(
        (b) =>
          b.trainingId === selectedTraining.id &&
          b.levelNumber === activeLevelNumber &&
          b.kind === 'quiz' &&
          !b.materialId,
      ) ||
      questionBanks.find(
        (b) =>
          b.trainingId === selectedTraining.id &&
          b.levelNumber === activeLevelNumber &&
          b.kind === 'quiz',
      );
  const hasDedicatedMaterialQuiz = Boolean(
    activeItem?.material &&
      questionBanks.some(
        (b) =>
          b.trainingId === selectedTraining.id &&
          b.kind === 'quiz' &&
          b.materialId === activeItem.material!.id,
      ),
  );
  const evalBank = questionBanks.find(
    (b) =>
      b.trainingId === selectedTraining.id &&
      b.levelNumber === activeLevelNumber &&
      b.kind === 'evaluation',
  );
  const evalScopeMaterials = usesSamr
    ? trainingMaterials.filter((m) => m.levelNumber === activeLevelNumber)
    : trainingMaterials;
  const completedEvalScopeMaterials = evalScopeMaterials.filter((m) => isMaterialCompleted(m.id));
  const remainingEvalScopeMaterials = evalScopeMaterials.filter((m) => !isMaterialCompleted(m.id));
  const allEvalMaterialsDone =
    evalScopeMaterials.length === 0 || remainingEvalScopeMaterials.length === 0;

  const userCertificate = certificates.find(
    (c) =>
      c.trainingId === selectedTraining.id &&
      c.userId === currentUser.uid &&
      c.status === 'valid',
  );

  const toggleSection = (secId: string) => {
    setOpenSectionIds((prev) =>
      prev.includes(secId) ? prev.filter((id) => id !== secId) : [...prev, secId],
    );
  };

  const handleSelectItem = (item: SidebarItem) => {
    if (item.locked && !isStaff) {
      showToast(
        'info',
        `Level ${item.levelNumber} masih terkunci. Selesaikan Asesmen Awal atau level sebelumnya terlebih dahulu.`,
      );
      return;
    }
    setActiveItemId(item.id);
    setTopTab('kursus');
    setMobileSidebarOpen(false);
    if (!openSectionIds.includes(item.sectionId)) {
      setOpenSectionIds((prev) => [...prev, item.sectionId]);
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await submitPracticalTask({
      trainingId: selectedTraining.id,
      levelNumber: activeLevelNumber,
      ...taskForm,
    });
    if (res.ok) {
      markActivitySeen(`tugas_${activeLevelNumber}`);
    }
  };

  const handleReflectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await saveLevelReflection({
      trainingId: selectedTraining.id,
      levelNumber: activeLevelNumber,
      ...reflectionForm,
    });
    if (res.ok) {
      markActivitySeen(`refleksi_${activeLevelNumber}`);
    }
  };

  const handleAddFacilitatorNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    const targetProf = profiles.find((p) => p.uid === noteTargetUid);
    const res = await createFacilitatorNote({
      trainingId: selectedTraining.id,
      levelNumber: activeLevelNumber,
      participantUid: noteTargetUid,
      participantName: noteTargetUid === 'all' ? 'Seluruh Peserta' : targetProf?.fullName || 'Peserta',
      content: noteContent.trim(),
    });
    if (res.ok) setNoteContent('');
  };

  // Susun soal Asesmen Awal otomatis dari seluruh materi aktif milik kegiatan ini
  const handleSyncPretestFromMaterials = async () => {
    setSyncingPretest(true);
    try {
      const materialDigest = trainingMaterials
        .map(
          (m, idx) =>
            `${idx + 1}. ${m.title}\nDeskripsi: ${m.description}\nRingkasan Isi: ${m.contentBody}`,
        )
        .join('\n\n')
        .slice(0, 12000);

      const response = await fetch('/api/gemini/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Ringkasan Materi ${selectedTraining.name}`,
          description: selectedTraining.description,
          contentBody:
            materialDigest ||
            `Kegiatan: ${selectedTraining.name}. Deskripsi: ${selectedTraining.description}`,
          trainingName: selectedTraining.name,
          levelLabel: usesSamr
            ? 'Pemetaan 4 Level SAMR (Substitution, Augmentation, Modification, Redefinition)'
            : `Asesmen Awal Kegiatan ${selectedTraining.code}`,
          usesSamr,
          assessmentCount: 5,
          quizCount: 0,
          evaluationCount: 0,
        }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        assessmentQuestions?: Array<{
          prompt: string;
          options: string[];
          correctIndex: number;
          explanation: string;
        }>;
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.assessmentQuestions?.length) {
        showToast(
          'error',
          payload.error ||
            'Gagal menyusun soal Asesmen Awal otomatis dari materi. Periksa koneksi atau konfigurasi API.',
        );
        return;
      }

      const ts = Date.now().toString(36);
      const rawList = payload.assessmentQuestions;
      const weight = Math.round(100 / rawList.length);
      const optLetters = ['a', 'b', 'c', 'd'];
      const items: QuestionItem[] = [];
      const keys: AnswerKeyEntry[] = [];

      rawList.forEach((raw, idx) => {
        const qId = `as_sync_${ts}_${idx + 1}`;
        const options = raw.options.slice(0, 4).map((text, optIdx) => ({
          id: `${qId}_${optLetters[optIdx] || optIdx}`,
          text,
        }));
        const safeCorrect = Math.max(0, Math.min(options.length - 1, raw.correctIndex || 0));
        items.push({
          id: qId,
          type: 'pilihan_ganda',
          prompt: raw.prompt,
          weight,
          options,
        });
        keys.push({
          questionId: qId,
          correctOptionIds: [options[safeCorrect]?.id || options[0].id],
          acceptedTextAnswers: [],
          explanation: raw.explanation,
        });
      });

      const nowIso = new Date().toISOString();
      const nextBank: QuestionBank = pretestBank
        ? {
            ...pretestBank,
            title: (usesSamr
              ? `Asesmen Awal Kompetensi SAMR — ${selectedTraining.code}`
              : `Asesmen Awal — ${selectedTraining.name}`
            ).slice(0, 200),
            description: `Soal asesmen awal yang disusun langsung dari materi kegiatan "${selectedTraining.name}".`.slice(
              0,
              1000,
            ),
            questions: items,
            updatedAt: nowIso,
          }
        : {
            id: `qb_assess_${selectedTraining.id.slice(0, 12)}_${ts}`,
            trainingId: selectedTraining.id,
            levelNumber: 0,
            kind: 'assessment',
            title: (usesSamr
              ? `Asesmen Awal Kompetensi SAMR — ${selectedTraining.code}`
              : `Asesmen Awal — ${selectedTraining.name}`
            ).slice(0, 200),
            description: `Soal asesmen awal yang disusun langsung dari materi kegiatan "${selectedTraining.name}".`.slice(
              0,
              1000,
            ),
            durationMinutes: 20,
            maxAttempts: 2,
            passingScore: 0,
            shuffleQuestions: true,
            showExplanation: true,
            isActive: true,
            questions: items,
            createdAt: nowIso,
            updatedAt: nowIso,
          };

      await saveQuestionBank(nextBank, keys);
      showToast(
        'success',
        `${items.length} soal Asesmen Awal berhasil disusun sesuai materi kegiatan "${selectedTraining.name}".`,
      );
    } catch {
      showToast('error', 'Terjadi kendala saat menyusun soal Asesmen Awal otomatis.');
    } finally {
      setSyncingPretest(false);
    }
  };

  // Susun soal Kuis khusus untuk 1 materi tertentu
  const handleGenerateQuizForMaterial = async (mat: LearningMaterial) => {
    setSyncingMaterialQuizId(mat.id);
    try {
      const response = await fetch('/api/gemini/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: mat.title,
          description: mat.description,
          contentBody: mat.contentBody || `${mat.title}. ${mat.description}`,
          fileName: mat.fileName,
          fileUrl: mat.fileUrl,
          trainingName: selectedTraining.name,
          levelLabel: usesSamr ? `Level ${mat.levelNumber}` : `Materi ${selectedTraining.code}`,
          usesSamr,
          assessmentCount: 0,
          quizCount: 5,
          evaluationCount: 0,
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        quizQuestions?: Array<{
          prompt: string;
          options: string[];
          correctIndex: number;
          explanation: string;
        }>;
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.quizQuestions?.length) {
        showToast(
          'error',
          payload.error || 'Gagal menyusun soal kuis otomatis untuk materi ini. Silakan coba lagi.',
        );
        return;
      }

      const ts = Date.now().toString(36);
      const rawList = payload.quizQuestions;
      const weight = Math.round(100 / rawList.length);
      const optLetters = ['a', 'b', 'c', 'd'];
      const items: QuestionItem[] = [];
      const keys: AnswerKeyEntry[] = [];
      rawList.forEach((raw, idx) => {
        const qId = `qz_mat_${ts}_${idx + 1}`;
        const options = raw.options.slice(0, 4).map((text, optIdx) => ({
          id: `${qId}_${optLetters[optIdx] || optIdx}`,
          text,
        }));
        const safeCorrect = Math.max(0, Math.min(options.length - 1, raw.correctIndex || 0));
        items.push({
          id: qId,
          type: 'pilihan_ganda',
          prompt: raw.prompt,
          weight,
          options,
        });
        keys.push({
          questionId: qId,
          correctOptionIds: [options[safeCorrect]?.id || options[0].id],
          acceptedTextAnswers: [],
          explanation: raw.explanation,
        });
      });

      const existingMatBank = questionBanks.find(
        (b) =>
          b.trainingId === selectedTraining.id &&
          b.kind === 'quiz' &&
          b.materialId === mat.id,
      );
      const nowIso = new Date().toISOString();
      const safeSuffix = mat.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(-18);
      const lvObj = trainingLevels.find((l) => l.levelNumber === mat.levelNumber);
      const nextBank: QuestionBank = existingMatBank
        ? {
            ...existingMatBank,
            title: `Kuis: ${mat.title}`.slice(0, 200),
            materialId: mat.id,
            questions: items,
            updatedAt: nowIso,
          }
        : {
            id: `qb_${selectedTraining.id.slice(0, 10)}_quiz_${safeSuffix}`,
            trainingId: selectedTraining.id,
            levelNumber: mat.levelNumber,
            materialId: mat.id,
            kind: 'quiz',
            title: `Kuis: ${mat.title}`.slice(0, 200),
            description: `Kuis pemahaman khusus setelah mempelajari materi "${mat.title}".`.slice(
              0,
              1000,
            ),
            durationMinutes: 20,
            maxAttempts: 3,
            passingScore: lvObj?.minQuizScore ?? 75,
            shuffleQuestions: true,
            showExplanation: true,
            isActive: true,
            questions: items,
            createdAt: nowIso,
            updatedAt: nowIso,
          };

      await saveQuestionBank(nextBank, keys);
      showToast('success', `${items.length} soal kuis khusus materi "${mat.title}" berhasil dibuat.`);
    } catch {
      showToast('error', 'Terjadi kendala saat menyusun kuis materi otomatis.');
    } finally {
      setSyncingMaterialQuizId(null);
    }
  };

  // Susun Evaluasi Akhir Keseluruhan dari SELURUH materi aktif kegiatan/level
  const handleSyncEvaluationFromAllMaterials = async () => {
    setSyncingEvaluation(true);
    try {
      const materialDigest = evalScopeMaterials
        .map(
          (m, idx) =>
            `=== Materi ${idx + 1}: ${m.title} ===\nDeskripsi: ${m.description}\nIsi: ${m.contentBody}`,
        )
        .join('\n\n')
        .slice(0, 22000);

      const response = await fetch('/api/gemini/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Evaluasi Akhir Keseluruhan — ${selectedTraining.name}`,
          description: `Mencakup seluruh ${evalScopeMaterials.length} materi pembelajaran pada kegiatan ${selectedTraining.name}.`,
          contentBody:
            materialDigest ||
            `Kegiatan: ${selectedTraining.name}. Deskripsi: ${selectedTraining.description}`,
          trainingName: selectedTraining.name,
          levelLabel: usesSamr
            ? `Evaluasi Akhir Level ${activeLevelNumber} (${LEVEL_SHORT_NAMES[activeLevelNumber]})`
            : `Evaluasi Akhir Keseluruhan Materi (${selectedTraining.code})`,
          usesSamr,
          assessmentCount: 0,
          quizCount: 0,
          evaluationCount: 8,
        }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        evaluationQuestions?: Array<{
          prompt: string;
          options: string[];
          correctIndex: number;
          explanation: string;
        }>;
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.evaluationQuestions?.length) {
        showToast(
          'error',
          payload.error || 'Gagal menyusun Evaluasi Akhir Keseluruhan. Silakan coba lagi.',
        );
        return;
      }

      const ts = Date.now().toString(36);
      const rawList = payload.evaluationQuestions;
      const weight = Math.round(100 / rawList.length);
      const optLetters = ['a', 'b', 'c', 'd'];
      const items: QuestionItem[] = [];
      const keys: AnswerKeyEntry[] = [];
      rawList.forEach((raw, idx) => {
        const qId = `ev_all_${ts}_${idx + 1}`;
        const options = raw.options.slice(0, 4).map((text, optIdx) => ({
          id: `${qId}_${optLetters[optIdx] || optIdx}`,
          text,
        }));
        const safeCorrect = Math.max(0, Math.min(options.length - 1, raw.correctIndex || 0));
        items.push({
          id: qId,
          type: 'pilihan_ganda',
          prompt: raw.prompt,
          weight,
          options,
        });
        keys.push({
          questionId: qId,
          correctOptionIds: [options[safeCorrect]?.id || options[0].id],
          acceptedTextAnswers: [],
          explanation: raw.explanation,
        });
      });

      const nowIso = new Date().toISOString();
      const nextBank: QuestionBank = evalBank
        ? {
            ...evalBank,
            title: (usesSamr
              ? `Evaluasi Akhir Keseluruhan — Level ${activeLevelNumber}`
              : `Evaluasi Akhir Keseluruhan — ${selectedTraining.name}`
            ).slice(0, 200),
            description: `Evaluasi komprehensif yang mencakup seluruh ${evalScopeMaterials.length} materi kegiatan "${selectedTraining.name}".`.slice(
              0,
              1000,
            ),
            questions: items,
            updatedAt: nowIso,
          }
        : {
            id: `qb_eval_${selectedTraining.id.slice(0, 10)}_L${activeLevelNumber}_${ts}`,
            trainingId: selectedTraining.id,
            levelNumber: activeLevelNumber,
            kind: 'evaluation',
            title: (usesSamr
              ? `Evaluasi Akhir Keseluruhan — Level ${activeLevelNumber}`
              : `Evaluasi Akhir Keseluruhan — ${selectedTraining.name}`
            ).slice(0, 200),
            description: `Evaluasi komprehensif yang mencakup seluruh ${evalScopeMaterials.length} materi kegiatan "${selectedTraining.name}".`.slice(
              0,
              1000,
            ),
            durationMinutes: 35,
            maxAttempts: 2,
            passingScore: activeLevelObj?.minEvaluationScore ?? 75,
            shuffleQuestions: true,
            showExplanation: true,
            isActive: true,
            questions: items,
            createdAt: nowIso,
            updatedAt: nowIso,
          };

      await saveQuestionBank(nextBank, keys);
      showToast(
        'success',
        `${items.length} soal Evaluasi Akhir Keseluruhan berhasil disusun dari seluruh materi.`,
      );
    } catch {
      showToast('error', 'Terjadi kendala saat menyusun Evaluasi Akhir Keseluruhan.');
    } finally {
      setSyncingEvaluation(false);
    }
  };

  const toEmbeddableUrl = (url: string): string => {
    const trimmed = url.trim();
    const gdriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
    if (gdriveMatch) {
      return `https://drive.google.com/file/d/${gdriveMatch[1]}/preview`;
    }
    if (/docs\.google\.com\/(document|presentation|spreadsheets)\/d\//i.test(trimmed)) {
      return trimmed.replace(/\/(edit|view).*$/i, '/preview');
    }
    return trimmed;
  };

  const getDownloadHref = (fileUrl: string): string => {
    if (viewerDownloadUrl && openViewerMaterialId === activeItem?.material?.id) {
      return viewerDownloadUrl;
    }
    if (fileUrl.startsWith('/api/materials/files/')) {
      const cleanPath = fileUrl.split('?')[0];
      return `${cleanPath}?download=1`;
    }
    return fileUrl;
  };

  const handleOpenMaterialViewer = async (mat: LearningMaterial, forceOpen = false) => {
    if (!forceOpen && openViewerMaterialId === mat.id && viewerState === 'ready') {
      setOpenViewerMaterialId(null);
      setViewerState('idle');
      setViewerTextBody(null);
      setViewerResolvedUrl(null);
      setViewerDownloadUrl(null);
      setViewerUploadError('');
      return;
    }

    setOpenViewerMaterialId(mat.id);
    setViewerState('loading');
    setViewerTextBody(null);
    setViewerResolvedUrl(null);
    setViewerDownloadUrl(null);
    setViewerUploadError('');

    if (!isStaff && enrollment && !isMaterialCompleted(mat.id)) {
      void markMaterialProgress(mat, 'dipelajari');
    }

    const resolved = await resolveMaterialFileForViewing({
      fileUrl: mat.fileUrl || '',
      fileName: mat.fileName || mat.title,
      contentType: mat.contentType,
      toEmbeddableUrl,
    });

    if (!resolved.ok) {
      setViewerState(resolved.reason === 'error' ? 'error' : 'expired');
      return;
    }

    setViewerTextBody(resolved.textBody ?? null);
    setViewerResolvedUrl(resolved.objectUrl || resolved.externalUrl || mat.fileUrl || null);
    setViewerDownloadUrl(resolved.downloadUrl || null);
    setViewerState('ready');
  };

  const handleReuploadMaterialFile = async (
    mat: LearningMaterial,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setViewerUploadError('');
    setReuploadingMatId(mat.id);
    setViewerUploadProgress(`Mempersiapkan "${file.name}"...`);

    try {
      const uploadRes = await uploadMaterialFilePersistent(file, (pct, label) => {
        setViewerUploadProgress(`${label} (${pct}%)`);
      });

      if (!uploadRes.ok || !uploadRes.fileUrl) {
        const msg =
          uploadRes.error ||
          'Gagal mengunggah berkas materi. Pastikan ukuran <= 10 MB atau gunakan tautan Google Drive.';
        setViewerUploadError(msg);
        showToast('error', msg);
        return;
      }

      const lowerName = file.name.toLowerCase();
      const nextType = lowerName.endsWith('.pdf')
        ? 'pdf'
        : lowerName.endsWith('.ppt') || lowerName.endsWith('.pptx')
          ? 'ppt'
          : lowerName.match(/\.(png|jpg|jpeg|webp)$/)
            ? 'gambar'
            : lowerName.endsWith('.mp4') || lowerName.endsWith('.webm')
              ? 'video'
              : lowerName.endsWith('.txt') || lowerName.endsWith('.md') || lowerName.endsWith('.csv')
                ? 'teks'
                : mat.contentType;

      setViewerUploadProgress('Menyimpan tautan berkas ke data materi...');
      const saveRes = await saveMaterial({
        id: mat.id,
        trainingId: mat.trainingId,
        levelId: mat.levelId,
        levelNumber: mat.levelNumber,
        title: mat.title,
        description: mat.description,
        contentType: nextType,
        contentBody: mat.contentBody,
        fileUrl: uploadRes.fileUrl,
        fileName: file.name,
        orderIndex: mat.orderIndex,
        durationMinutes: mat.durationMinutes,
        isMandatory: mat.isMandatory,
        isActive: mat.isActive,
        allowDownload: mat.allowDownload,
        isPrivateBucket: mat.isPrivateBucket,
      });

      if (!saveRes.ok) {
        const msg =
          saveRes.message ||
          'Berkas terunggah, tetapi gagal menyimpan ke daftar materi. Periksa hak akses akun Anda.';
        setViewerUploadError(msg);
        showToast('error', msg);
        return;
      }

      // Langsung tampilkan berkas yang baru diunggah tanpa menunggu jeda sinkronisasi
      let inlineText: string | null = null;
      if (
        nextType === 'teks' ||
        lowerName.endsWith('.txt') ||
        lowerName.endsWith('.md') ||
        lowerName.endsWith('.csv')
      ) {
        try {
          inlineText = await file.text();
        } catch {
          inlineText = null;
        }
      }

      setViewerTextBody(inlineText);
      setViewerResolvedUrl(uploadRes.objectUrl || uploadRes.fileUrl);
      setViewerDownloadUrl(uploadRes.objectUrl || uploadRes.fileUrl);
      setOpenViewerMaterialId(mat.id);
      setViewerState('ready');
      setViewerUploadError('');
      showToast(
        'success',
        uploadRes.storedInCloud
          ? `Berkas "${file.name}" tersimpan permanen di Cloud Database dan langsung terbuka!`
          : `Berkas "${file.name}" berhasil diunggah dan langsung terbuka!`,
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Terjadi kendala saat mengunggah ulang berkas.';
      setViewerUploadError(msg);
      showToast('error', msg);
    } finally {
      setReuploadingMatId(null);
      setViewerUploadProgress('');
    }
  };

  const handleSaveInlineMaterialLink = async (mat: LearningMaterial) => {
    const cleaned = inlineLinkInput.trim();
    if (!/^https?:\/\//i.test(cleaned)) {
      setViewerUploadError(
        'Masukkan tautan yang valid diawali https:// (misalnya tautan Google Drive, Slides, Docs, PDF, atau YouTube).',
      );
      return;
    }
    setViewerUploadError('');
    setSavingInlineLink(true);
    try {
      const lower = cleaned.toLowerCase();
      const nextType = extractYoutubeEmbedUrl(cleaned)
        ? 'youtube'
        : lower.endsWith('.pdf')
          ? 'pdf'
          : mat.contentType;
      const saveRes = await saveMaterial({
        id: mat.id,
        trainingId: mat.trainingId,
        levelId: mat.levelId,
        levelNumber: mat.levelNumber,
        title: mat.title,
        description: mat.description,
        contentType: nextType,
        contentBody: mat.contentBody,
        fileUrl: cleaned,
        fileName: mat.fileName || mat.title,
        orderIndex: mat.orderIndex,
        durationMinutes: mat.durationMinutes,
        isMandatory: mat.isMandatory,
        isActive: mat.isActive,
        allowDownload: mat.allowDownload,
        isPrivateBucket: false,
      });
      if (!saveRes.ok) {
        const msg = saveRes.message || 'Gagal menyimpan tautan materi.';
        setViewerUploadError(msg);
        showToast('error', msg);
        return;
      }
      setInlineLinkInput('');
      setViewerTextBody(null);
      setViewerResolvedUrl(toEmbeddableUrl(cleaned));
      setViewerDownloadUrl(cleaned);
      setOpenViewerMaterialId(mat.id);
      setViewerState('ready');
      showToast('success', 'Tautan materi berhasil disimpan dan langsung dibuka!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan tautan materi.';
      setViewerUploadError(msg);
      showToast('error', msg);
    } finally {
      setSavingInlineLink(false);
    }
  };

  const activeSamrMeta = SAMR_LEVEL_META[activeLevelNumber];

  const levelNotes = facilitatorNotes.filter(
    (n) =>
      n.trainingId === selectedTraining.id &&
      n.levelNumber === activeLevelNumber &&
      (isStaff || n.participantUid === 'all' || n.participantUid === currentUser.uid),
  );
  const levelSchedules = schedules.filter(
    (s) =>
      s.trainingId === selectedTraining.id &&
      (s.levelNumber === 0 || s.levelNumber === activeLevelNumber),
  );
  const trainingAnnouncements = announcements.filter(
    (a) => a.trainingId === selectedTraining.id && a.isPublished,
  );

  // Render Left Edge Sidebar (matching /public/assets/aistudio/image_13f2e2b0.png!)
  const sidebarContent = (
    <div className="h-full flex flex-col bg-white">
      {/* Mobile Header */}
      <div className="lg:hidden px-4 py-3 border-b border-[#dee2e6] flex items-center justify-between">
        <span className="text-xs font-bold text-[#212529]">Daftar Materi & Aktivitas</span>
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          className="p-1 text-[#6c757d]"
          aria-label="Tutup daftar aktivitas"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav aria-label="Menu materi dan aktivitas LMS" className="flex-1 overflow-y-auto p-3 space-y-2">
        {sections.map((sec) => {
          const isOpen = openSectionIds.includes(sec.id);
          const hasActiveChild = activeItem?.sectionId === sec.id && topTab === 'kursus';
          return (
            <div key={sec.id} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleSection(sec.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-bold flex items-center justify-between gap-2 transition-colors ${
                  hasActiveChild
                    ? 'bg-[#0f6cbf] text-white shadow-xs'
                    : 'text-[#212529] hover:bg-[#f4f6f9]'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate">{sec.title}</span>
                </span>
                {sec.locked && !isStaff ? (
                  <Lock className={`w-3.5 h-3.5 shrink-0 ${hasActiveChild ? 'text-blue-100' : 'text-[#adb5bd]'}`} />
                ) : sec.optional && !isStaff ? (
                  <span
                    className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      hasActiveChild
                        ? 'bg-white/20 text-white'
                        : 'bg-[#f1f3f5] text-[#6c757d]'
                    }`}
                  >
                    Opsional
                  </span>
                ) : usesSamr &&
                  !isStaff &&
                  enrollment &&
                  enrollment.startingLevel >= 1 &&
                  sec.levelNumber === enrollment.startingLevel ? (
                  <span
                    className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      hasActiveChild
                        ? 'bg-white/20 text-white'
                        : 'bg-[#e7f1fa] text-[#0f6cbf]'
                    }`}
                  >
                    Level Anda
                  </span>
                ) : null}
              </button>

              {isOpen && (
                <div className="pl-2 space-y-0.5">
                  {sec.items.map((item) => {
                    const isCurrent = activeItem?.id === item.id && topTab === 'kursus';
                    const isVisuallyLocked = (item.locked || item.prereqLocked) && !isStaff;
                    const isMaterialQuiz = item.kind === 'kuis' && Boolean(item.material);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectItem(item)}
                        className={`w-full text-left py-2 rounded-md text-[13px] leading-snug flex items-start gap-2.5 transition-colors ${
                          isMaterialQuiz ? 'pl-6 pr-3 text-[12px]' : 'px-3'
                        } ${
                          isCurrent
                            ? 'bg-[#0f6cbf] text-white font-semibold'
                            : item.locked && !isStaff
                              ? 'text-[#adb5bd] cursor-not-allowed'
                              : isVisuallyLocked
                                ? 'text-[#6c757d] hover:bg-[#f4f6f9]'
                                : 'text-[#495057] hover:bg-[#f4f6f9] hover:text-[#212529]'
                        }`}
                      >
                        <span className="mt-1 shrink-0">
                          {isVisuallyLocked ? (
                            <Lock
                              className={`w-3 h-3 ${isCurrent ? 'text-blue-100' : 'text-[#adb5bd]'}`}
                            />
                          ) : item.done ? (
                            <span
                              className={`block w-3 h-3 rounded-full ${
                                isCurrent ? 'bg-[#20c997] ring-2 ring-white/40' : 'bg-[#198754]'
                              }`}
                            />
                          ) : (
                            <span
                              className={`block w-3 h-3 rounded-full border-2 ${
                                isCurrent ? 'border-white' : 'border-[#adb5bd]'
                              }`}
                            />
                          )}
                        </span>
                        <span className="flex-1 min-w-0 break-words">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Tombol Cepat Tanya AI (QnA) di Sidebar */}
        <div className="pt-3 mt-3 border-t border-[#e9ecef] space-y-2">
          <Link
            to={`/qna?training=${selectedTraining.id}`}
            onClick={() => setMobileSidebarOpen(false)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0b5394] bg-[#f0f7ff] hover:bg-[#dcebfb] border border-[#b6d4fe] rounded-lg transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Tanya AI · QnA Materi & Kebijakan
          </Link>

          {isStaff && (
            <button
              type="button"
              onClick={() => {
                setEditingMaterialObj(null);
                setUploadTargetLevelNum(activeLevelNumber);
                setShowUploadModal(true);
                setMobileSidebarOpen(false);
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0f6cbf] bg-[#e7f1fa] hover:bg-[#d0e3f7] rounded-lg transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              + Input Materi & Soal Otomatis
            </button>
          )}
        </div>
      </nav>
    </div>
  );

  return (
    <div className="flex-1 flex min-h-[calc(100vh-68px)] bg-[#f4f6f9]">
      {/* SIDEBAR KIRI MENEMPEL TEPI LAYAR (Desktop >= lg) */}
      <aside className="hidden lg:block w-[290px] xl:w-[305px] shrink-0 bg-white border-r border-[#dee2e6] sticky top-[68px] h-[calc(100vh-68px)] overflow-hidden">
        {sidebarContent}
      </aside>

      {/* DRAWER SIDEBAR MOBILE */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-[300px] max-w-[85vw] h-full bg-white shadow-xl">{sidebarContent}</div>
          <button
            type="button"
            aria-label="Tutup panel materi"
            className="flex-1 bg-slate-900/40"
            onClick={() => setMobileSidebarOpen(false)}
          />
        </div>
      )}

      {/* AREA KONTEN UTAMA KANAN */}
      <div className="flex-1 min-w-0 px-5 sm:px-8 lg:px-10 py-6 space-y-5">
        {/* Header Judul Kegiatan & Pemilih Kegiatan */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#6c757d]">
              <span className="font-mono font-semibold text-[#0f6cbf]">{selectedTraining.code}</span>
              <span>·</span>
              <span>
                {usesSamr
                  ? 'Model Adaptif 4 Level SAMR (Khusus Pemanfaatan Digitalisasi Pembelajaran)'
                  : 'Modul Berurutan Standar PAMANDAI EDU'}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-[26px] font-extrabold text-[#212529] tracking-tight leading-tight">
              {selectedTraining.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0f6cbf] bg-white border border-[#ced4da] rounded-lg"
            >
              <ListChecks className="w-4 h-4" />
              Daftar Materi
            </button>

            <select
              aria-label="Pilih kegiatan pelatihan"
              value={selectedTraining.id}
              onChange={(e) => handleTrainingSwitch(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-white border border-[#ced4da] rounded-lg text-[#212529] max-w-[260px] focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
            >
              {visibleTrainings.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} — {t.name}
                </option>
              ))}
            </select>

            <Link
              to={`/qna?training=${selectedTraining.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0b5394] bg-[#e7f1fa] hover:bg-[#d0e3f7] border border-[#b6d4fe] rounded-lg transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Tanya AI (QnA)
            </Link>

            {isStaff && (
              <button
                type="button"
                onClick={() => {
                  setEditingMaterialObj(null);
                  setUploadTargetLevelNum(activeLevelNumber);
                  setShowUploadModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Input Materi & Soal Otomatis
              </button>
            )}

            {showManagementFeatures && canManage && onOpenCreateTraining && (
              <button
                type="button"
                onClick={onOpenCreateTraining}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#198754] hover:bg-[#146c43] rounded-lg whitespace-nowrap transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Kegiatan
              </button>
            )}

            {showManagementFeatures && canManage && onRequestDeleteTraining && (
              <button
                type="button"
                onClick={() => onRequestDeleteTraining(selectedTraining)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg whitespace-nowrap transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Kegiatan
              </button>
            )}
          </div>
        </div>

        {/* Tab Horizontal Bergaris Bawah: Kursus | Peserta | Nilai | Rekaman Aktivitas | Tautan | Kelola */}
        <div className="border-b border-[#dee2e6] flex items-center gap-2 overflow-x-auto">
          {(
            [
              ['kursus', 'Kursus'],
              ['peserta', `Peserta (${courseEnrollments.length})`],
              ['nilai', 'Nilai'],
              ...(canMonitor ? ([['aktivitas', 'Rekaman Aktivitas']] as const) : []),
              ['tautan', 'Link Daftar & Login'],
              ...(showManagementFeatures && canManage ? ([['kelola', 'Kelola Kegiatan']] as const) : []),
            ] as Array<[WorkspaceTopTab, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTopTab(key)}
              className={`px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
                topTab === key
                  ? 'border-[#0f6cbf] text-[#0f6cbf] font-semibold'
                  : 'border-transparent text-[#6c757d] hover:text-[#212529]'
              }`}
            >
              {key === 'aktivitas' && <Activity className="w-3.5 h-3.5" />}
              {key === 'tautan' && <Link2 className="w-3.5 h-3.5" />}
              {key === 'kelola' && <Settings2 className="w-3.5 h-3.5" />}
              {label}
            </button>
          ))}
        </div>

        {/* ============================================================== */}
        {/* TAB 1: KURSUS (Kartu Aktivitas Bersih Persis Screenshot!)      */}
        {/* ============================================================== */}
        {topTab === 'kursus' && activeItem && (
          <div className="space-y-4">
            {/* Banner pendaftaran jika peserta belum terdaftar */}
            {!isStaff && !enrollment && (
              <div className="bg-white border border-[#b6d4fe] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[#0b5394]">
                  Anda sedang melihat pratinjau kegiatan ini. Daftar sekarang agar progres belajar & sertifikat tersimpan.
                </p>
                <button
                  type="button"
                  onClick={() => void enrollInTraining(selectedTraining.id)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg"
                >
                  Daftar Kegiatan Ini
                </button>
              </div>
            )}

            {/* Kartu Aktivitas Utama */}
            <section className="bg-white border border-[#dee2e6] rounded-xl p-6 sm:p-7 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-5">
              {/* Badge Status Penyelesaian ala Screenshot: "✓ Selesai: Melihat aktivitas ini" */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {activeItem.done ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#d1e7dd] text-[#0f5132] text-xs font-semibold">
                    ✓ Selesai: Aktivitas telah diselesaikan
                  </span>
                ) : activeItem.prereqLocked && !isStaff ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                    <Lock className="w-3.5 h-3.5" />
                    Terkunci: Selesaikan materi prasyarat terlebih dahulu
                  </span>
                ) : activeItem.kind === 'pretest' ||
                  activeItem.kind === 'kuis' ||
                  activeItem.kind === 'evaluasi' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#e7f1fa] border border-[#b6d4fe] text-[#0b5394] text-xs font-semibold">
                    Kerjakan instrumen untuk menyelesaikan aktivitas ini
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        activeItem.kind === 'material' &&
                        activeItem.material &&
                        !isStaff &&
                        enrollment
                      ) {
                        void markMaterialProgress(activeItem.material, 'selesai');
                      }
                      markActivitySeen(activeItem.id);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#f8f9fa] border border-[#ced4da] hover:border-[#198754] hover:text-[#198754] text-xs font-semibold text-[#495057] transition-colors"
                  >
                    Tandai sebagai selesai
                  </button>
                )}

                {usesSamr &&
                  activeLevelSummary &&
                  !isStaff &&
                  enrollment &&
                  enrollment.startingLevel >= 1 &&
                  !activeItem.optional &&
                  activeItem.sectionId.startsWith('sec_samr_') && (
                    <button
                      type="button"
                      disabled={!activeLevelSummary.canUnlockNext}
                      onClick={() =>
                        void verifyAndUnlockLevel(selectedTraining.id, activeLevelNumber)
                      }
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#198754] hover:bg-[#146c43] text-white disabled:bg-[#e9ecef] disabled:text-[#6c757d]"
                    >
                      {activeLevelSummary.status === 'lulus'
                        ? `Level ${activeLevelNumber} Lulus`
                        : activeLevelNumber === 4
                          ? 'Verifikasi Kelulusan & Sertifikat'
                          : `Verifikasi & Buka Level ${activeLevelNumber + 1}`}
                    </button>
                  )}
              </div>

              {/* Banner Informasi Materi Referensi Opsional (Level di bawah level penempatan SAMR) */}
              {usesSamr &&
                activeItem.optional &&
                !isStaff &&
                enrollment &&
                enrollment.startingLevel > 1 && (
                  <div className="p-3.5 rounded-xl bg-[#f8f9fa] border border-[#ced4da] flex flex-wrap items-center justify-between gap-3 text-xs text-[#495057]">
                    <div className="space-y-0.5">
                      <p className="font-bold text-[#212529]">
                        Materi Referensi Opsional (Tidak Wajib) — Level {activeLevelNumber} ({LEVEL_SHORT_NAMES[activeLevelNumber]})
                      </p>
                      <p>
                        Hasil asesmen awal menempatkan Anda pada{' '}
                        <strong className="text-[#0f6cbf]">
                          Level {enrollment.startingLevel} ({LEVEL_SHORT_NAMES[enrollment.startingLevel]})
                        </strong>
                        . Materi level di bawahnya ini tetap terbuka untuk dipelajari sebagai pengayaan, tetapi tidak wajib diselesaikan.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const targetLv = enrollment.currentLevel || enrollment.startingLevel;
                        const targetItem = findFirstItemForLevel(targetLv);
                        if (targetItem) handleSelectItem(targetItem);
                      }}
                      className="shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg"
                    >
                      Ke Level Wajib (Level {enrollment.currentLevel || enrollment.startingLevel}) »
                    </button>
                  </div>
                )}

              {/* KONTEN BERDASARKAN JENIS AKTIVITAS */}
              {activeItem.kind === 'panduan' && (
                <div className="space-y-4 text-sm text-[#212529] leading-relaxed">
                  <p>
                    Selamat datang pada modul{' '}
                    <strong className="font-bold">Memahami Konteks</strong> di LMS{' '}
                    <strong className="font-bold">PAMANDAI EDU</strong>. Seluruh materi wajib
                    dipelajari secara berurutan.
                  </p>
                  <p className="text-[#495057]">{selectedTraining.description}</p>
                  {selectedTraining.guidelines && (
                    <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#e9ecef] text-xs text-[#495057] whitespace-pre-line leading-relaxed">
                      {selectedTraining.guidelines}
                    </div>
                  )}
                  {usesSamr && (
                    <div className="p-4 rounded-xl bg-[#e7f1fa]/70 border border-[#b6d4fe] text-xs text-[#0b5394]">
                      <strong>Catatan Khusus Model SAMR:</strong> Kegiatan{' '}
                      <em>Pemanfaatan Digitalisasi Pembelajaran</em> menerapkan penempatan adaptif
                      4 Level SAMR (Substitution, Augmentation, Modification, Redefinition) berdasarkan
                      hasil Pretest / Asesmen Awal Anda.
                    </div>
                  )}
                </div>
              )}

              {activeItem.kind === 'pretest' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-[#212529]">
                        {usesSamr
                          ? 'Asesmen Awal Kompetensi SAMR (Pretest)'
                          : `Asesmen Awal — ${selectedTraining.name}`}
                      </h2>
                      <p className="text-xs text-[#6c757d] mt-1">
                        {usesSamr
                          ? 'Soal asesmen awal ini memetakan level SAMR awal Anda (Level 1 Substitution s.d. Level 4 Redefinition) pada kegiatan Digitalisasi Pembelajaran.'
                          : `Kerjakan asesmen awal ini untuk memetakan pemahaman awal Anda terhadap materi kegiatan "${selectedTraining.name}" sebelum mempelajari modul.`}
                      </p>
                    </div>
                    {isStaff && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={syncingPretest}
                          onClick={() => void handleSyncPretestFromMaterials()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg disabled:opacity-60"
                        >
                          {syncingPretest ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          {syncingPretest
                            ? 'Menyusun Soal Asesmen...'
                            : 'Susun Soal Asesmen Awal dari Materi Kegiatan'}
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Kartu Hasil Penempatan Level SAMR & Akses Langsung ke Level yang Ditentukan */}
                  {usesSamr && !isStaff && enrollment && enrollment.startingLevel >= 1 && (
                    <div className="p-4 sm:p-5 rounded-xl bg-[#e7f1fa] border border-[#9ec5fe] flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1 max-w-2xl">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#0b5394]">
                          Hasil Penempatan Asesmen Awal SAMR
                        </p>
                        <h3 className="text-base font-extrabold text-[#212529]">
                          Anda ditempatkan pada Level {enrollment.startingLevel}:{' '}
                          {LEVEL_SHORT_NAMES[enrollment.startingLevel]}
                        </h3>
                        <p className="text-xs text-[#343a40] leading-relaxed">
                          {enrollment.startingLevel === 1 ? (
                            <>
                              Silakan mulai mempelajari dan menyelesaikan seluruh aktivitas secara
                              berurutan dari <strong>Level 1 (Substitution)</strong> hingga{' '}
                              <strong>Level 4 (Redefinition)</strong>.
                            </>
                          ) : (
                            <>
                              Anda dapat langsung memulai kegiatan dan mengakses materi dari{' '}
                              <strong>
                                Level {enrollment.startingLevel} ({LEVEL_SHORT_NAMES[enrollment.startingLevel]})
                              </strong>
                              {enrollment.startingLevel < 4
                                ? ' hingga Level 4 (Redefinition)'
                                : ''}
                              . Materi{' '}
                              <strong>
                                {enrollment.startingLevel === 2
                                  ? 'Level 1'
                                  : `Level 1 s.d. Level ${enrollment.startingLevel - 1}`}
                              </strong>{' '}
                              tetap terbuka untuk dibuka kapan saja sebagai referensi (tidak wajib).
                            </>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const targetItem = findFirstItemForLevel(enrollment.startingLevel);
                          if (targetItem) {
                            handleSelectItem(targetItem);
                          }
                        }}
                        className="px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg shadow-xs transition-colors"
                      >
                        Mulai Materi Level {enrollment.startingLevel} Sekarang »
                      </button>
                    </div>
                  )}

                  {pretestBank ? (
                    <QuestionRunner
                      key={pretestBank.id}
                      bank={pretestBank}
                      existingAttempts={attempts.filter(
                        (a) => a.bankId === pretestBank.id && a.userId === currentUser?.uid,
                      )}
                      onCompleted={() => {
                        markActivitySeen('pretest');
                        setOpenSectionIds((prev) =>
                          Array.from(
                            new Set([
                              ...prev,
                              'sec_samr_1',
                              'sec_samr_2',
                              'sec_samr_3',
                              'sec_samr_4',
                            ]),
                          ),
                        );
                      }}
                    />
                  ) : (
                    <div className="p-5 rounded-xl bg-[#f8f9fa] border border-[#dee2e6] space-y-2.5 text-xs text-[#495057]">
                      <p>
                        Instrumen Asesmen Awal belum tersedia untuk kegiatan ini.
                      </p>
                      {isStaff && (
                        <button
                          type="button"
                          disabled={syncingPretest}
                          onClick={() => void handleSyncPretestFromMaterials()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Buat Soal Asesmen Awal dari Materi Sekarang
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeItem.kind === 'pengantar' && (
                <div className="space-y-4 text-sm text-[#212529] leading-relaxed">
                  <h2 className="text-lg font-bold">{activeItem.label}</h2>
                  <p className="text-[#495057]">{selectedTraining.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-lg bg-[#f8f9fa] border border-[#e9ecef]">
                      <p className="text-[#6c757d]">Penyelenggara</p>
                      <p className="font-semibold text-[#212529] mt-0.5">
                        {selectedTraining.organizer}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[#f8f9fa] border border-[#e9ecef]">
                      <p className="text-[#6c757d]">Jadwal Pelaksanaan</p>
                      <p className="font-semibold font-mono text-[#212529] mt-0.5">
                        {selectedTraining.startDate} s.d. {selectedTraining.endDate}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[#f8f9fa] border border-[#e9ecef]">
                      <p className="text-[#6c757d]">Lokasi / Moda</p>
                      <p className="font-semibold text-[#212529] mt-0.5">
                        {selectedTraining.location}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeItem.kind === 'material' && (
                <div className="space-y-4">
                  {activeItem.material ? (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-[#6c757d]">
                            Materi{' '}
                            {Math.max(
                              1,
                              evalScopeMaterials.findIndex((m) => m.id === activeItem.material!.id) +
                                1,
                            )}{' '}
                            dari {evalScopeMaterials.length} ·{' '}
                            {activeItem.material.contentType.toUpperCase()} ·{' '}
                            {activeItem.material.durationMinutes} menit
                            {activeItem.material.isMandatory ? ' · Materi Wajib' : ''}
                          </p>
                          <h2 className="text-lg font-bold text-[#212529] mt-0.5">
                            {activeItem.material.title}
                          </h2>
                          {activeItem.material.description && (
                            <p className="text-xs text-[#6c757d] mt-1">
                              {activeItem.material.description}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {isStaff && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMaterialObj(activeItem.material!);
                                  setUploadTargetLevelNum(activeItem.material!.levelNumber);
                                  setShowUploadModal(true);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#495057] bg-[#f8f9fa] border border-[#ced4da] hover:bg-white rounded-lg"
                              >
                                <PenLine className="w-3.5 h-3.5" />
                                Ubah / Ganti Berkas
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMaterialObj(null);
                                  setUploadTargetLevelNum(activeLevelNumber);
                                  setShowUploadModal(true);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#0f6cbf] bg-[#e7f1fa] hover:bg-[#d0e3f7] rounded-lg"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Tambah Materi Lain
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteMaterial(activeItem.material!.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Hapus
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {activeItem.material.contentBody && (
                        <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#e9ecef] text-sm text-[#212529] whitespace-pre-line leading-relaxed">
                          {activeItem.material.contentBody}
                        </div>
                      )}

                      {activeItem.material.fileUrl && (
                        <div className="space-y-3">
                          {extractYoutubeEmbedUrl(activeItem.material.fileUrl) ? (
                            <div className="aspect-video w-full rounded-xl overflow-hidden border border-[#dee2e6] bg-black">
                              <iframe
                                title={activeItem.material.title}
                                src={extractYoutubeEmbedUrl(activeItem.material.fileUrl) || ''}
                                className="w-full h-full"
                                allowFullScreen
                              />
                            </div>
                          ) : activeItem.material.contentType === 'gambar' &&
                            /^https?:\/\//i.test(activeItem.material.fileUrl) ? (
                            <img
                              src={activeItem.material.fileUrl}
                              alt={activeItem.material.title}
                              className="max-h-96 rounded-xl border border-[#dee2e6] object-contain"
                            />
                          ) : (
                            <div className="space-y-3">
                              <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#dee2e6] flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2 text-[#212529] min-w-0">
                                  <FileText className="w-4 h-4 text-[#0f6cbf] shrink-0" />
                                  <span className="font-semibold truncate">
                                    {activeItem.material.fileName || activeItem.material.fileUrl}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <a
                                    href={activeItem.material.fileUrl}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      void handleOpenMaterialViewer(activeItem.material!);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0f6cbf] text-white font-semibold rounded-lg hover:bg-[#0b5394] cursor-pointer"
                                  >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    {openViewerMaterialId === activeItem.material.id &&
                                    viewerState === 'ready'
                                      ? 'Tutup Pratinjau'
                                      : 'Buka Materi'}
                                  </a>
                                  {activeItem.material.allowDownload &&
                                    !activeItem.material.fileUrl.startsWith('blob:') &&
                                    !activeItem.material.fileUrl.startsWith('cloudfile://') &&
                                    !activeItem.material.fileUrl.startsWith('localfile://') && (
                                      <a
                                        href={getDownloadHref(activeItem.material.fileUrl)}
                                        download={activeItem.material.fileName || 'materi'}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#ced4da] text-[#212529] font-semibold rounded-lg hover:bg-white"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        Unduh
                                      </a>
                                    )}
                                </div>
                              </div>

                              {/* Pratinjau / Viewer Materi Langsung di Dalam LMS */}
                              {openViewerMaterialId === activeItem.material.id && (
                                <div className="rounded-xl border border-[#b6d4fe] bg-white overflow-hidden shadow-xs">
                                  <div className="px-4 py-2.5 bg-[#e7f1fa]/70 border-b border-[#b6d4fe] flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <span className="font-bold text-[#0b5394] flex items-center gap-1.5">
                                      <FileText className="w-3.5 h-3.5" />
                                      Pembaca Materi: {activeItem.material.fileName || activeItem.material.title}
                                    </span>
                                    <div className="flex items-center gap-3">
                                      {viewerState === 'ready' && (viewerDownloadUrl || viewerResolvedUrl) && (
                                        <>
                                          <a
                                            href={viewerDownloadUrl || viewerResolvedUrl || '#'}
                                            download={activeItem.material.fileName || 'materi'}
                                            className="inline-flex items-center gap-1 text-[#0f6cbf] hover:underline font-semibold"
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                            Unduh
                                          </a>
                                          <a
                                            href={viewerResolvedUrl || activeItem.material.fileUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-[#0f6cbf] hover:underline font-semibold"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            Tab Baru
                                          </a>
                                        </>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenViewerMaterialId(null);
                                          setViewerState('idle');
                                          setViewerUploadError('');
                                        }}
                                        className="text-[#495057] hover:text-[#212529] p-0.5"
                                        aria-label="Tutup pembaca materi"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>

                                  {viewerState === 'loading' && (
                                    <div className="p-8 text-center text-xs text-[#6c757d] flex items-center justify-center gap-2">
                                      <Loader2 className="w-4 h-4 animate-spin text-[#0f6cbf]" />
                                      Memuat berkas materi dari Cloud Database...
                                    </div>
                                  )}

                                  {viewerState === 'expired' && (
                                    <div className="p-5 bg-amber-50 space-y-3.5 text-xs text-amber-950">
                                      <div className="space-y-1">
                                        <p className="font-bold text-sm text-amber-900">
                                          Berkas materi belum tersimpan di Cloud Database (unggahan sesi lama).
                                        </p>
                                        <p className="leading-relaxed text-amber-800">
                                          {isStaff
                                            ? 'Unggah ulang berkas di bawah ini (maks. 10 MB untuk penyimpanan permanen Cloud Firestore) atau tempel tautan Google Drive / Google Slides / PDF agar berkas tersimpan permanen dan langsung terbuka untuk seluruh peserta.'
                                            : 'Hubungi fasilitator atau admin kegiatan untuk mengunggah ulang berkas materi ini ke Cloud Database.'}
                                        </p>
                                      </div>

                                      {viewerUploadProgress && (
                                        <div className="p-2.5 rounded-lg bg-[#e7f1fa] border border-[#b6d4fe] text-[#0b5394] font-semibold flex items-center gap-2">
                                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                          <span>{viewerUploadProgress}</span>
                                        </div>
                                      )}

                                      {viewerUploadError && (
                                        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 font-medium">
                                          {viewerUploadError}
                                        </div>
                                      )}

                                      {isStaff && (
                                        <div className="space-y-3 pt-1">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <label className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg cursor-pointer">
                                              {reuploadingMatId === activeItem.material.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                              ) : (
                                                <Upload className="w-3.5 h-3.5" />
                                              )}
                                              {reuploadingMatId === activeItem.material.id
                                                ? 'Menyimpan ke Cloud...'
                                                : 'Unggah Berkas Permanen (Cloud)'}
                                              <input
                                                type="file"
                                                disabled={reuploadingMatId === activeItem.material.id}
                                                className="hidden"
                                                accept=".pdf,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.ppt,.pptx,.doc,.docx,.mp4,.webm"
                                                onChange={(e) =>
                                                  void handleReuploadMaterialFile(
                                                    activeItem.material!,
                                                    e,
                                                  )
                                                }
                                              />
                                            </label>
                                            <span className="text-[11px] text-amber-800">
                                              Format: PDF, PPT/PPTX, DOC/DOCX, Gambar, Teks, Video (disarankan &le; 10 MB)
                                            </span>
                                          </div>

                                          <div className="pt-2.5 border-t border-amber-200/80 space-y-1.5">
                                            <p className="font-semibold text-amber-900">
                                              Atau tempel tautan materi (Google Drive / Google Slides / PDF / YouTube):
                                            </p>
                                            <div className="flex flex-col sm:flex-row gap-2">
                                              <input
                                                type="text"
                                                value={inlineLinkInput}
                                                onChange={(e) => setInlineLinkInput(e.target.value)}
                                                placeholder="https://drive.google.com/file/d/... atau https://..."
                                                className="flex-1 px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                                              />
                                              <button
                                                type="button"
                                                disabled={savingInlineLink || !inlineLinkInput.trim()}
                                                onClick={() =>
                                                  void handleSaveInlineMaterialLink(
                                                    activeItem.material!,
                                                  )
                                                }
                                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#198754] hover:bg-[#146c43] rounded-lg disabled:opacity-50 whitespace-nowrap"
                                              >
                                                {savingInlineLink ? (
                                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                  <Link2 className="w-3.5 h-3.5" />
                                                )}
                                                Simpan &amp; Buka Tautan
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {viewerState === 'error' && (
                                    <div className="p-5 bg-red-50 text-xs text-red-800 space-y-2.5">
                                      <p className="font-semibold">
                                        Berkas tidak dapat dimuat saat ini.
                                      </p>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <a
                                          href={getDownloadHref(activeItem.material.fileUrl)}
                                          download={activeItem.material.fileName || 'materi'}
                                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0f6cbf] text-white font-semibold rounded-lg"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                          Unduh Berkas Langsung
                                        </a>
                                        {isStaff && (
                                          <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-red-300 text-red-800 font-semibold rounded-lg cursor-pointer hover:bg-red-100/50">
                                            <Upload className="w-3.5 h-3.5" />
                                            Unggah Ulang ke Cloud
                                            <input
                                              type="file"
                                              className="hidden"
                                              accept=".pdf,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.ppt,.pptx,.doc,.docx,.mp4,.webm"
                                              onChange={(e) =>
                                                void handleReuploadMaterialFile(
                                                  activeItem.material!,
                                                  e,
                                                )
                                              }
                                            />
                                          </label>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {viewerState === 'ready' && (() => {
                                    const mat = activeItem.material!;
                                    const activeSrc =
                                      viewerResolvedUrl || toEmbeddableUrl(mat.fileUrl);
                                    const activeDownload =
                                      viewerDownloadUrl || getDownloadHref(mat.fileUrl);
                                    const lowerName = (mat.fileName || mat.fileUrl).toLowerCase();
                                    const isPdf =
                                      mat.contentType === 'pdf' || lowerName.endsWith('.pdf');
                                    const isImage =
                                      mat.contentType === 'gambar' ||
                                      /\.(png|jpg|jpeg|webp)$/.test(lowerName);
                                    const isVideo =
                                      mat.contentType === 'video' ||
                                      /\.(mp4|webm)$/.test(lowerName);
                                    const isOffice =
                                      /\.(ppt|pptx|doc|docx)$/.test(lowerName) ||
                                      mat.contentType === 'ppt';

                                    if (viewerTextBody !== null) {
                                      return (
                                        <div className="p-5 max-h-[540px] overflow-y-auto text-sm text-[#212529] whitespace-pre-wrap leading-relaxed bg-[#fcfcfd]">
                                          {viewerTextBody}
                                        </div>
                                      );
                                    }
                                    if (isImage) {
                                      return (
                                        <div className="p-4 bg-[#f8f9fa] flex justify-center">
                                          <img
                                            src={activeSrc}
                                            alt={mat.title}
                                            className="max-h-[560px] rounded-lg object-contain"
                                          />
                                        </div>
                                      );
                                    }
                                    if (isVideo) {
                                      return (
                                        <div className="bg-black">
                                          <video
                                            controls
                                            src={activeSrc}
                                            className="w-full max-h-[520px]"
                                          />
                                        </div>
                                      );
                                    }
                                    if (isPdf) {
                                      return (
                                        <div className="bg-white">
                                          <object
                                            data={activeSrc}
                                            type="application/pdf"
                                            className="w-full h-[560px] bg-white"
                                          >
                                            <iframe
                                              title={mat.title}
                                              src={activeSrc}
                                              className="w-full h-[560px] bg-white"
                                            />
                                          </object>
                                          <div className="px-4 py-2 bg-[#f8f9fa] border-t border-[#e9ecef] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#495057]">
                                            <span>
                                              Jika pratinjau PDF tidak tampil karena pembatasan browser, klik Unduh atau Buka di Tab Baru.
                                            </span>
                                            <div className="flex items-center gap-2">
                                              <a
                                                href={activeDownload}
                                                download={mat.fileName || 'materi.pdf'}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0f6cbf] text-white font-semibold rounded"
                                              >
                                                <Download className="w-3 h-3" />
                                                Unduh PDF
                                              </a>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    }
                                    if (isOffice && mat.fileUrl.startsWith('http')) {
                                      return (
                                        <iframe
                                          title={mat.title}
                                          src={`https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(mat.fileUrl)}`}
                                          className="w-full h-[560px] bg-white"
                                        />
                                      );
                                    }
                                    if (isOffice) {
                                      return (
                                        <div className="p-5 space-y-3 text-xs text-[#495057]">
                                          <p>
                                            Berkas presentasi/dokumen{' '}
                                            <strong className="text-[#212529]">{mat.fileName}</strong>{' '}
                                            tersimpan permanen dan siap diunduh untuk dibuka di perangkat Anda.
                                          </p>
                                          <a
                                            href={activeDownload}
                                            download={mat.fileName || 'materi'}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f6cbf] hover:bg-[#0b5394] text-white font-semibold rounded-lg"
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                            Unduh &amp; Buka {mat.fileName || 'Berkas'}
                                          </a>
                                        </div>
                                      );
                                    }
                                    return (
                                      <iframe
                                        title={mat.title}
                                        src={activeSrc}
                                        className="w-full h-[560px] bg-white"
                                      />
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* CTA Langsung ke Kuis Materi Setelah Selesai Mempelajari Materi Ini */}
                      {(() => {
                        const mat = activeItem.material!;
                        const matQuiz = getMaterialQuizBank(mat);
                        const hasOwnQuiz = questionBanks.some(
                          (b) =>
                            b.trainingId === selectedTraining.id &&
                            b.kind === 'quiz' &&
                            b.materialId === mat.id,
                        );
                        return (
                          <div className="p-4 rounded-xl bg-[#e7f1fa]/70 border border-[#b6d4fe] flex flex-wrap items-center justify-between gap-3">
                            <div className="text-xs text-[#0b5394] space-y-0.5">
                              <p className="font-bold flex items-center gap-1.5">
                                <ClipboardCheck className="w-4 h-4" />
                                Aktivitas Kuis Setelah Materi Ini
                                {matQuiz && (
                                  <span className="font-mono text-[11px] font-semibold text-[#0f5132] bg-[#d1e7dd] px-2 py-0.5 rounded">
                                    {matQuiz.questions.length} soal siap
                                  </span>
                                )}
                              </p>
                              <p className="text-[#495057]">
                                {matQuiz
                                  ? isMaterialCompleted(mat.id)
                                    ? 'Materi ini telah selesai dipelajari. Silakan kerjakan kuis pemahaman untuk menguji penguasaan materi ini.'
                                    : 'Setelah selesai mempelajari materi di atas, klik tombol di samping untuk menandai selesai dan langsung mengerjakan Kuis Materi.'
                                  : isStaff
                                    ? 'Belum ada soal kuis untuk materi ini. Klik "Buat Kuis Otomatis" untuk menyusun soal kuis dari materi ini.'
                                    : 'Soal kuis untuk materi ini sedang disiapkan oleh fasilitator.'}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {isStaff && !hasOwnQuiz && (
                                <button
                                  type="button"
                                  disabled={syncingMaterialQuizId === mat.id}
                                  onClick={() => void handleGenerateQuizForMaterial(mat)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg whitespace-nowrap disabled:opacity-60"
                                >
                                  {syncingMaterialQuizId === mat.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-3.5 h-3.5" />
                                  )}
                                  {syncingMaterialQuizId === mat.id
                                    ? 'Menyusun Kuis...'
                                    : 'Buat Kuis Otomatis'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!isStaff && enrollment && !isMaterialCompleted(mat.id)) {
                                    await markMaterialProgress(mat, 'selesai');
                                  }
                                  markActivitySeen(`mat_${mat.id}`);
                                  setActiveItemId(`kuis_mat_${mat.id}`);
                                  setTopTab('kursus');
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#198754] hover:bg-[#146c43] rounded-lg whitespace-nowrap"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                {isMaterialCompleted(mat.id)
                                  ? 'Kerjakan Kuis Materi Ini »'
                                  : 'Selesai Materi & Lanjut Kuis »'}
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="text-center py-6 space-y-3">
                      <BookOpen className="w-8 h-8 text-[#adb5bd] mx-auto" />
                      <p className="text-sm text-[#6c757d]">
                        Belum ada materi pembelajaran yang diunggah pada bagian ini.
                      </p>
                      {isStaff && (
                        <button
                          type="button"
                          onClick={() => {
                            setUploadTargetLevelNum(activeLevelNumber);
                            setShowUploadModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg"
                        >
                          <Sparkles className="w-4 h-4" />
                          Input Materi & Buat Soal Kuis/Evaluasi Otomatis
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeItem.kind === 'demonstrasi' && activeLevelObj && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-[#212529] flex items-center gap-2">
                    <MonitorPlay className="w-5 h-5 text-[#0f6cbf]" />
                    Video & Demonstrasi PID — Level {activeLevelNumber} (
                    {LEVEL_SHORT_NAMES[activeLevelNumber]})
                  </h2>
                  {activeLevelObj.demoVideoUrl &&
                  extractYoutubeEmbedUrl(activeLevelObj.demoVideoUrl) ? (
                    <div className="aspect-video w-full rounded-xl overflow-hidden border border-[#dee2e6] bg-black">
                      <iframe
                        title="Demonstrasi PID"
                        src={extractYoutubeEmbedUrl(activeLevelObj.demoVideoUrl) || ''}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  ) : null}
                  <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#e9ecef] text-sm text-[#212529] whitespace-pre-line leading-relaxed">
                    {activeLevelObj.demoGuide || activeSamrMeta.pidExample}
                  </div>
                </div>
              )}

              {(activeItem.kind === 'eksplorasi' || activeItem.kind === 'nalar_kritis') && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-[#212529]">
                    {activeItem.kind === 'nalar_kritis'
                      ? 'Nalar Kritis — Studi Kasus & Analisis Praktik'
                      : `Eksplorasi PID — Level ${activeLevelNumber} (${LEVEL_SHORT_NAMES[activeLevelNumber]})`}
                  </h2>
                  <p className="text-sm text-[#495057] leading-relaxed">
                    {activeItem.kind === 'nalar_kritis'
                      ? `Analisis studi kasus implementasi materi "${selectedTraining.name}" di satuan pendidikan. Identifikasi tantangan utama, langkah pemecahan masalah berbasis bukti, serta rencana tindak lanjut yang paling efektif.`
                      : activeSamrMeta.definition}
                  </p>
                  <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#e9ecef] space-y-2 text-xs text-[#212529]">
                    <p className="font-bold text-[#0f6cbf]">Daftar Poin Eksplorasi & Analisis:</p>
                    <ul className="list-disc pl-5 space-y-1.5 text-[#495057]">
                      {(activeItem.kind === 'nalar_kritis'
                        ? [
                            `Identifikasi permasalahan nyata yang relevan dengan topik ${selectedTraining.name} di satuan pendidikan Anda.`,
                            'Bandingkan kondisi aktual kelas/sekolah dengan indikator capaian pada materi pelatihan.',
                            'Rumuskan minimal dua alternatif solusi beserta analisis manfaat dan kendalanya.',
                            'Susun langkah tindak lanjut terukur yang dapat diterapkan pada siklus pembelajaran berikutnya.',
                          ]
                        : activeSamrMeta.activities
                      ).map((act, i) => (
                        <li key={i}>{act}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {activeItem.kind === 'diskusi' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#212529] flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-[#0f6cbf]" />
                      Forum Berbagi Praktik Baik
                    </h2>
                    <p className="text-xs text-[#6c757d] mt-1">
                      Bagikan pengalaman, hasil uji coba, atau pertanyaan Anda agar dapat ditanggapi rekan peserta dan fasilitator.
                    </p>
                  </div>

                  <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                    {forumPosts.map((post) => (
                      <div
                        key={post.id}
                        className="p-4 rounded-xl bg-[#f8f9fa] border border-[#e9ecef] space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#212529]">
                            {post.authorName}{' '}
                            <span className="font-normal text-[#0f6cbf]">({post.authorRole})</span>
                          </span>
                          <span className="text-[#6c757d]">{post.createdAt}</span>
                        </div>
                        <p className="text-sm text-[#495057] leading-relaxed">{post.text}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddForumPost} className="space-y-2.5">
                    <textarea
                      rows={3}
                      required
                      value={newForumText}
                      onChange={(e) => setNewForumText(e.target.value)}
                      placeholder="Tulis tanggapan atau praktik baik Anda di forum diskusi ini..."
                      className="w-full px-3.5 py-2.5 text-sm border border-[#ced4da] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Kirim ke Forum
                    </button>
                  </form>
                </div>
              )}

              {activeItem.kind === 'analisis_diskusi' && (
                <form onSubmit={handleSaveSynthesis} className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#212529]">
                      Sintesis Hasil Kolaborasi
                    </h2>
                    <p className="text-xs text-[#6c757d] mt-1">
                      Tuliskan rangkuman pembelajaran utama dan ide adaptasi dari forum diskusi bersama rekan guru.
                    </p>
                  </div>
                  <textarea
                    rows={5}
                    required
                    value={synthesisText}
                    onChange={(e) => setSynthesisText(e.target.value)}
                    placeholder="Tuliskan sintesis hasil diskusi dan rencana penerapan di kelas Anda..."
                    className="w-full px-3.5 py-2.5 text-sm border border-[#ced4da] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#198754] hover:bg-[#146c43] rounded-lg"
                  >
                    Simpan Sintesis Kolaborasi
                  </button>
                </form>
              )}

              {activeItem.kind === 'tugas_praktik' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-bold text-[#212529] flex items-center gap-2">
                      <Upload className="w-5 h-5 text-[#0f6cbf]" />
                      Tugas Praktik & Pengumpulan Hasil Karya
                    </h2>
                    <p className="text-xs text-[#6c757d] mt-1">
                      {activeLevelObj?.taskInstructions ||
                        (usesSamr
                          ? activeSamrMeta.practicalProduct
                          : `Unggah produk hasil praktik penerapan materi kegiatan "${selectedTraining.name}" beserta dokumentasi implementasinya.`)}
                    </p>
                  </div>

                  {/* Rubrik Penilaian */}
                  <div className="border border-[#e9ecef] rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-[#f8f9fa] border-b border-[#e9ecef] text-xs font-bold text-[#212529]">
                      Rubrik Penilaian Fasilitator (Skala 1–4)
                    </div>
                    <div className="divide-y divide-[#e9ecef] text-xs">
                      {(usesSamr
                        ? DEFAULT_SAMR_RUBRIC
                        : [
                            { id: 'c1', label: 'Kesesuaian Produk dengan Materi Kegiatan', weight: 30 },
                            { id: 'c2', label: 'Ketepatan Analisis & Strategi Penerapan', weight: 25 },
                            { id: 'c3', label: 'Dampak terhadap Kualitas Pembelajaran', weight: 25 },
                            { id: 'c4', label: 'Kelengkapan Dokumentasi & Refleksi', weight: 20 },
                          ]
                      ).map((c) => (
                        <div key={c.id} className="px-4 py-2 flex items-center justify-between gap-2">
                          <span className="text-[#495057]">{c.label}</span>
                          <span className="font-mono font-semibold text-[#0f6cbf]">{c.weight}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!isStaff ? (
                    <form onSubmit={(e) => void handleTaskSubmit(e)} className="space-y-3 text-xs">
                      {existingTaskSub && (
                        <div className="p-3.5 rounded-xl bg-[#f8f9fa] border border-[#dee2e6] space-y-1">
                          <p className="font-bold text-[#212529]">
                            Status Pengumpulan:{' '}
                            <span className="uppercase text-[#0f6cbf]">{existingTaskSub.status}</span>
                            {existingTaskSub.weightedScore > 0
                              ? ` · Skor Rubrik: ${existingTaskSub.weightedScore}/100`
                              : ''}
                          </p>
                          {existingTaskSub.facilitatorFeedback && (
                            <p className="text-[#495057]">
                              Catatan Fasilitator: {existingTaskSub.facilitatorFeedback}
                            </p>
                          )}
                          {existingTaskSub.rubricScores.length > 0 && (
                            <div className="pt-1 flex flex-wrap gap-2">
                              {existingTaskSub.rubricScores.map((rs) => (
                                <span
                                  key={rs.criterionId}
                                  className="px-2 py-0.5 rounded bg-white border border-[#dee2e6] text-[11px]"
                                >
                                  {rs.criterionLabel}: {RUBRIC_SCALE_LABELS[rs.score]}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="block font-semibold text-[#212529] mb-1">
                          Judul Produk / Karya Praktik
                        </label>
                        <input
                          required
                          minLength={2}
                          type="text"
                          value={taskForm.title}
                          onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                          placeholder="Contoh: Modul Ajar & Media Interaktif Kelas VIII"
                          className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#212529] mb-1">
                          Deskripsi Implementasi
                        </label>
                        <textarea
                          required
                          minLength={5}
                          rows={3}
                          value={taskForm.description}
                          onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                          placeholder="Jelaskan langkah penerapan di kelas dan dampaknya bagi peserta didik..."
                          className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-[#212529] mb-1">
                            Tautan Berkas Produk (Google Drive / PDF / Video)
                          </label>
                          <input
                            type="url"
                            value={taskForm.productUrl}
                            onChange={(e) => setTaskForm({ ...taskForm, productUrl: e.target.value })}
                            placeholder="https://..."
                            className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-[#212529] mb-1">
                            Tautan Foto / Dokumentasi Kelas
                          </label>
                          <input
                            type="url"
                            value={taskForm.docMediaUrl}
                            onChange={(e) => setTaskForm({ ...taskForm, docMediaUrl: e.target.value })}
                            placeholder="https://..."
                            className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg"
                      >
                        {existingTaskSub ? 'Perbarui Pengumpulan Praktik' : 'Kumpulkan Tugas Praktik'}
                      </button>
                    </form>
                  ) : (
                    <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#e9ecef] flex flex-wrap items-center justify-between gap-3 text-xs">
                      <span>
                        Pengumpulan peserta pada bagian ini:{' '}
                        <strong>
                          {
                            taskSubmissions.filter(
                              (s) =>
                                s.trainingId === selectedTraining.id &&
                                s.levelNumber === activeLevelNumber,
                            ).length
                          }{' '}
                          karya
                        </strong>
                      </span>
                      <Link
                        to="/asesmen-kuis?tab=rubrik"
                        className="px-3.5 py-2 font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg"
                      >
                        Buka Validasi & Rubrik Fasilitator
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {activeItem.kind === 'kuis' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-[#212529] flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-[#0f6cbf]" />
                        {activeItem.material
                          ? `Kuis Pemahaman — ${activeItem.material.title}`
                          : 'Kuis Pemahaman'}
                      </h2>
                      <p className="text-xs text-[#6c757d] mt-0.5">
                        {activeItem.material
                          ? `Kuis ini diberikan langsung setelah Anda menyelesaikan materi "${activeItem.material.title}".`
                          : 'Soal kuis otomatis diperbarui setiap kali materi baru diunggah oleh fasilitator atau panitia.'}
                      </p>
                    </div>
                    {isStaff && (
                      <div className="flex flex-wrap items-center gap-2">
                        {activeItem.material && (
                          <button
                            type="button"
                            disabled={syncingMaterialQuizId === activeItem.material.id}
                            onClick={() => void handleGenerateQuizForMaterial(activeItem.material!)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg disabled:opacity-60"
                          >
                            {syncingMaterialQuizId === activeItem.material.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            {syncingMaterialQuizId === activeItem.material.id
                              ? 'Menyusun Kuis...'
                              : hasDedicatedMaterialQuiz
                                ? 'Perbarui Soal Kuis Materi Ini'
                                : 'Buat Kuis Otomatis Khusus Materi Ini'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setUploadTargetLevelNum(activeLevelNumber);
                            setShowUploadModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0f6cbf] bg-[#e7f1fa] hover:bg-[#d0e3f7] rounded-lg"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Input Materi Baru
                        </button>
                      </div>
                    )}
                  </div>

                  {!isStaff && activeItem.material && !isMaterialCompleted(activeItem.material.id) ? (
                    <div className="p-5 rounded-xl bg-amber-50 border border-amber-300 space-y-3">
                      <div className="flex items-start gap-3">
                        <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs">
                          <p className="font-bold text-amber-900 text-sm">
                            Kuis Materi Belum Terbuka
                          </p>
                          <p className="text-amber-800 leading-relaxed">
                            Pelajari dan tandai selesai materi{' '}
                            <strong>&quot;{activeItem.material.title}&quot;</strong> terlebih dahulu
                            agar Anda dapat mengerjakan kuis materi ini.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveItemId(`mat_${activeItem.material!.id}`)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        Buka Materi: {activeItem.material.title} »
                      </button>
                    </div>
                  ) : activeQuizBank ? (
                    <QuestionRunner
                      key={activeQuizBank.id}
                      bank={activeQuizBank}
                      existingAttempts={attempts.filter(
                        (a) => a.bankId === activeQuizBank.id && a.userId === currentUser?.uid,
                      )}
                      onCompleted={() => markActivitySeen(activeItem.id)}
                    />
                  ) : (
                    <div className="p-5 rounded-xl bg-[#f8f9fa] border border-[#dee2e6] space-y-2.5 text-xs text-[#495057]">
                      <p>
                        Belum ada soal kuis untuk materi ini.
                      </p>
                      {isStaff && activeItem.material && (
                        <button
                          type="button"
                          disabled={syncingMaterialQuizId === activeItem.material.id}
                          onClick={() => void handleGenerateQuizForMaterial(activeItem.material!)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Buat Soal Kuis Otomatis untuk Materi Ini
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeItem.kind === 'evaluasi' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-[#212529] flex items-center gap-2">
                        <Award className="w-5 h-5 text-[#198754]" />
                        {usesSamr
                          ? `Evaluasi Akhir Keseluruhan — Level ${activeLevelNumber}`
                          : 'Evaluasi Akhir Keseluruhan'}
                      </h2>
                      <p className="text-xs text-[#6c757d] mt-0.5">
                        Evaluasi komprehensif yang mencakup seluruh materi kegiatan ({completedEvalScopeMaterials.length}/{evalScopeMaterials.length} materi selesai dipelajari).
                      </p>
                    </div>
                    {isStaff && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={syncingEvaluation}
                          onClick={() => void handleSyncEvaluationFromAllMaterials()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#198754] hover:bg-[#146c43] rounded-lg disabled:opacity-60"
                        >
                          {syncingEvaluation ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          {syncingEvaluation
                            ? 'Menyusun Evaluasi...'
                            : 'Susun Evaluasi dari Seluruh Materi'}
                        </button>
                      </div>
                    )}
                  </div>

                  {!isStaff && !allEvalMaterialsDone ? (
                    <div className="p-5 rounded-xl bg-amber-50 border border-amber-300 space-y-4">
                      <div className="flex items-start gap-3">
                        <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs">
                          <p className="font-bold text-amber-900 text-sm">
                            Evaluasi Akhir Keseluruhan Belum Terbuka ({completedEvalScopeMaterials.length}/{evalScopeMaterials.length} Materi Selesai)
                          </p>
                          <p className="text-amber-800 leading-relaxed">
                            Evaluasi Akhir Keseluruhan hanya dapat dikerjakan setelah Anda selesai
                            mempelajari seluruh materi pada kegiatan ini. Selesaikan{' '}
                            <strong>{remainingEvalScopeMaterials.length} materi tersisa</strong> di
                            bawah ini:
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {evalScopeMaterials.map((mat, idx) => {
                          const done = isMaterialCompleted(mat.id);
                          return (
                            <div
                              key={mat.id}
                              className="p-3 rounded-lg bg-white border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {done ? (
                                  <CheckCircle2 className="w-4 h-4 text-[#198754] shrink-0" />
                                ) : (
                                  <span className="w-4 h-4 rounded-full border-2 border-amber-400 shrink-0" />
                                )}
                                <span
                                  className={`font-medium ${
                                    done ? 'text-[#0f5132] line-through' : 'text-[#212529]'
                                  }`}
                                >
                                  Materi {idx + 1}: {mat.title}
                                </span>
                              </div>
                              {done ? (
                                <span className="text-[11px] font-semibold text-[#198754]">
                                  Selesai
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setActiveItemId(`mat_${mat.id}`)}
                                  className="px-3 py-1 text-[11px] font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-md"
                                >
                                  Pelajari Materi »
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : evalBank ? (
                    <QuestionRunner
                      key={evalBank.id}
                      bank={evalBank}
                      existingAttempts={attempts.filter(
                        (a) => a.bankId === evalBank.id && a.userId === currentUser?.uid,
                      )}
                      onCompleted={() => markActivitySeen(`evaluasi_${activeLevelNumber}`)}
                    />
                  ) : (
                    <div className="p-5 rounded-xl bg-[#f8f9fa] border border-[#dee2e6] space-y-2.5 text-xs text-[#495057]">
                      <p>
                        Belum ada soal Evaluasi Akhir Keseluruhan pada bagian ini. Unggah materi atau susun soal evaluasi otomatis dari seluruh materi.
                      </p>
                      {isStaff && (
                        <button
                          type="button"
                          disabled={syncingEvaluation}
                          onClick={() => void handleSyncEvaluationFromAllMaterials()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#198754] hover:bg-[#146c43] rounded-lg"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Susun Evaluasi Akhir dari Seluruh Materi Sekarang
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeItem.kind === 'refleksi' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-bold text-[#212529] flex items-center gap-2">
                      <PenLine className="w-5 h-5 text-[#0f6cbf]" />
                      Refleksi & Pendampingan Pembelajaran
                    </h2>
                  </div>

                  {!isStaff && (
                    <form onSubmit={(e) => void handleReflectionSubmit(e)} className="space-y-3 text-xs">
                      <div>
                        <label className="block font-semibold text-[#212529] mb-1">
                          Pengalaman Belajar Utama
                        </label>
                        <textarea
                          required
                          minLength={5}
                          rows={2}
                          value={reflectionForm.learningExperience}
                          onChange={(e) =>
                            setReflectionForm({ ...reflectionForm, learningExperience: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-[#212529] mb-1">
                            Kendala / Tantangan di Sekolah
                          </label>
                          <textarea
                            rows={2}
                            value={reflectionForm.challenges}
                            onChange={(e) =>
                              setReflectionForm({ ...reflectionForm, challenges: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-[#212529] mb-1">
                            Kompetensi Baru yang Dikuasai
                          </label>
                          <textarea
                            rows={2}
                            value={reflectionForm.competenciesGained}
                            onChange={(e) =>
                              setReflectionForm({
                                ...reflectionForm,
                                competenciesGained: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block font-semibold text-[#212529] mb-1">
                          Rencana Tindak Lanjut di Satuan Pendidikan
                        </label>
                        <textarea
                          required
                          minLength={5}
                          rows={2}
                          value={reflectionForm.schoolImplementationPlan}
                          onChange={(e) =>
                            setReflectionForm({
                              ...reflectionForm,
                              schoolImplementationPlan: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#198754] hover:bg-[#146c43] rounded-lg"
                      >
                        Simpan Refleksi Pembelajaran
                      </button>
                    </form>
                  )}

                  {/* Jadwal, Pengumuman & Catatan Fasilitator */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#e9ecef] text-xs">
                    <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#e9ecef] space-y-2">
                      <p className="font-bold text-[#212529] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#0f6cbf]" />
                        Jadwal Pendampingan ({levelSchedules.length})
                      </p>
                      {levelSchedules.length === 0 ? (
                        <p className="text-[#6c757d]">Belum ada jadwal sesi khusus.</p>
                      ) : (
                        levelSchedules.slice(0, 3).map((sch) => (
                          <div key={sch.id} className="p-2.5 bg-white rounded-lg border border-[#e9ecef]">
                            <p className="font-semibold text-[#212529]">{sch.title}</p>
                            <p className="text-[#6c757d]">
                              {sch.sessionDate} · {sch.startTime}–{sch.endTime} · {sch.mode.toUpperCase()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#e9ecef] space-y-2">
                      <p className="font-bold text-[#212529] flex items-center gap-1.5">
                        <Megaphone className="w-3.5 h-3.5 text-[#0f6cbf]" />
                        Pengumuman & Catatan Fasilitator
                      </p>
                      {trainingAnnouncements.slice(0, 2).map((ann) => (
                        <div key={ann.id} className="p-2.5 bg-white rounded-lg border border-[#e9ecef]">
                          <p className="font-semibold text-[#212529]">{ann.title}</p>
                          <p className="text-[#6c757d]">{ann.body}</p>
                        </div>
                      ))}
                      {levelNotes.slice(0, 3).map((n) => (
                        <div key={n.id} className="p-2.5 bg-white rounded-lg border border-[#e9ecef]">
                          <p className="font-semibold text-[#0f6cbf]">
                            {n.authorName} → {n.participantName}
                          </p>
                          <p className="text-[#495057]">{n.content}</p>
                        </div>
                      ))}
                      {isStaff && (
                        <form onSubmit={(e) => void handleAddFacilitatorNote(e)} className="pt-2 space-y-2">
                          <select
                            value={noteTargetUid}
                            onChange={(e) => setNoteTargetUid(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-[#ced4da] rounded-lg"
                          >
                            <option value="all">Semua Peserta</option>
                            {courseEnrollments.map((enr) => (
                              <option key={enr.userId} value={enr.userId}>
                                {enr.userName}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={noteContent}
                              onChange={(e) => setNoteContent(e.target.value)}
                              placeholder="Tulis catatan pendampingan..."
                              className="flex-1 px-2.5 py-1.5 bg-white border border-[#ced4da] rounded-lg"
                            />
                            <button
                              type="submit"
                              className="px-3 py-1.5 bg-[#0f6cbf] text-white font-semibold rounded-lg"
                            >
                              Kirim
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>

                  {userCertificate && (
                    <div className="p-4 rounded-xl bg-[#d1e7dd] border border-[#a3cfbb] flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-[#0f5132]">
                        <p className="font-bold">Sertifikat Digital Anda Sudah Terbit!</p>
                        <p className="font-mono mt-0.5">{userCertificate.certificateNumber}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void generateCertificatePdf(userCertificate, {
                            appName: institutionSettings.appName || institutionSettings.institutionName,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#198754] hover:bg-[#146c43] rounded-lg"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Unduh Sertifikat PDF
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* GARIS PEMISAH & TOMBOL AKTIVITAS BERIKUTNYA (Persis Screenshot!) */}
              <div className="pt-5 border-t border-[#e9ecef] flex flex-wrap items-center justify-between gap-3">
                <div>
                  {prevItem && (
                    <button
                      type="button"
                      onClick={() => handleSelectItem(prevItem)}
                      className="px-4 py-2 text-xs font-semibold text-[#495057] border border-[#ced4da] hover:bg-[#f8f9fa] rounded-lg"
                    >
                      « Sebelumnya: {prevItem.label}
                    </button>
                  )}
                </div>
                {nextItem && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        activeItem.kind !== 'pretest' &&
                        activeItem.kind !== 'kuis' &&
                        activeItem.kind !== 'evaluasi'
                      ) {
                        markActivitySeen(activeItem.id);
                      }
                      if (
                        activeItem.kind === 'material' &&
                        activeItem.material &&
                        !isStaff &&
                        enrollment
                      ) {
                        await markMaterialProgress(activeItem.material, 'selesai');
                      }
                      handleSelectItem(nextItem);
                    }}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg shadow-xs transition-colors"
                  >
                    Aktivitas berikutnya: {nextItem.label} »
                  </button>
                )}
              </div>
            </section>

            {/* Rekomendasi Kegiatan Selanjutnya untuk Peserta (tidak bercampur di daftar kegiatan diikuti) */}
            {!canMonitor && recommendedTrainings.length > 0 && (
              <section className="bg-white border border-[#dee2e6] rounded-xl p-5 space-y-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#212529]">
                      Rekomendasi Kegiatan yang Bisa Diikuti Selanjutnya
                    </h3>
                    <p className="text-xs text-[#6c757d] mt-0.5">
                      Program pelatihan aktif lainnya untuk meningkatkan kompetensi Anda setelah atau berdampingan dengan kegiatan saat ini.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendedTrainings.map((trn) => (
                    <div
                      key={trn.id}
                      className="p-4 rounded-xl border border-[#dee2e6] bg-[#f8f9fa] flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <p className="text-[11px] font-mono font-semibold text-[#0f6cbf]">
                          {trn.code} · {isSamrTraining(trn) ? 'Model 4 Level SAMR' : 'Modul Berurutan Standar'}
                        </p>
                        <p className="text-sm font-bold text-[#212529]">{trn.name}</p>
                        <p className="text-xs text-[#6c757d] line-clamp-2">{trn.description}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#e9ecef]">
                        <span className="text-[11px] text-[#6c757d]">
                          {trn.startDate} s.d. {trn.endDate}
                        </span>
                        <button
                          type="button"
                          disabled={enrollingId === trn.id}
                          onClick={() => void handleQuickEnrollRecommended(trn.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {enrollingId === trn.id ? 'Mendaftar...' : 'Daftar Kegiatan Ini'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: PESERTA                                                 */}
        {/* ============================================================== */}
        {topTab === 'peserta' && (() => {
          const handleExportParticipantsExcel = () => {
            const rows: Array<Record<string, string | number>> = filteredEnrollments.map((enr, idx) => {
              const prof = profiles.find((p) => p.uid === enr.userId);
              const base: Record<string, string | number> = {
                No: idx + 1,
                'Nama Peserta': enr.userName,
                Email: prof?.email || '-',
                'Satuan Pendidikan': enr.instansi,
                NPSN: enr.npsn || prof?.npsn || '-',
                'Kab/Kota': enr.kabupatenKota,
                Jenjang: enr.jenjangPendidikan || prof?.jenjangPendidikan || '-',
                'Mata Pelajaran': enr.mataPelajaran || prof?.mataPelajaran || '-',
              };
              if (usesSamr) {
                base['Level SAMR Aktif'] =
                  enr.currentLevel > 0
                    ? `Level ${enr.currentLevel} (${LEVEL_SHORT_NAMES[enr.currentLevel as 1 | 2 | 3 | 4]})`
                    : 'Belum Asesmen';
              }
              base['Progres (%)'] = `${enr.overallProgress}%`;
              base.Status = enr.status.toUpperCase();
              return base;
            });
            exportMonitoringToExcel(rows, `daftar-peserta-${selectedTraining.code.toLowerCase()}.xlsx`);
            showToast('success', `Daftar peserta (${rows.length} baris) berhasil diunduh ke Excel.`);
          };

          const handleExportParticipantsPdf = () => {
            const columns = [
              'No',
              'Nama Peserta',
              'Satuan Pendidikan',
              'NPSN',
              'Kab/Kota',
              ...(usesSamr ? ['Level SAMR'] : []),
              'Progres',
              'Status',
            ];
            const rows = filteredEnrollments.map((enr, idx) => {
              const prof = profiles.find((p) => p.uid === enr.userId);
              return [
                idx + 1,
                enr.userName,
                enr.instansi,
                enr.npsn || prof?.npsn || '-',
                enr.kabupatenKota,
                ...(usesSamr
                  ? [enr.currentLevel > 0 ? `L${enr.currentLevel} ${LEVEL_SHORT_NAMES[enr.currentLevel as 1 | 2 | 3 | 4]}` : 'Belum']
                  : []),
                `${enr.overallProgress}%`,
                enr.status.toUpperCase(),
              ];
            });
            exportMonitoringToPdf({
              fileName: `daftar-peserta-${selectedTraining.code.toLowerCase()}.pdf`,
              title: `Daftar Peserta — ${selectedTraining.name}`,
              subtitle: `${institutionSettings.institutionName} · Kode: ${selectedTraining.code}`,
              summaryLines: [
                `Total Peserta: ${rows.length} · Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`,
              ],
              columns,
              rows,
            });
            showToast('success', `Daftar peserta (${rows.length} baris) berhasil diunduh ke PDF.`);
          };

          return (
            <section className="bg-white border border-[#dee2e6] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="p-5 border-b border-[#e9ecef] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#212529]">
                    Daftar Peserta Kegiatan ({courseEnrollments.length})
                  </h2>
                  <p className="text-xs text-[#6c757d]">
                    Peserta terdaftar pada {selectedTraining.name}.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-60">
                    <Search className="w-4 h-4 text-[#adb5bd] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={participantSearch}
                      onChange={(e) => setParticipantSearch(e.target.value)}
                      placeholder="Cari nama, sekolah, atau NPSN..."
                      className="w-full pl-9 pr-3 py-2 text-xs border border-[#ced4da] rounded-lg"
                    />
                  </div>
                  {canMonitor && (
                    <>
                      <button
                        type="button"
                        onClick={handleExportParticipantsExcel}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#198754] bg-[#e8f5ee] hover:bg-[#d1e7dd] border border-[#a3cfbb] rounded-lg whitespace-nowrap"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Unduh Excel
                      </button>
                      <button
                        type="button"
                        onClick={handleExportParticipantsPdf}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#212529] bg-white hover:bg-[#f8f9fa] border border-[#ced4da] rounded-lg whitespace-nowrap"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Unduh PDF
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8f9fa] border-b border-[#e9ecef] text-[#6c757d]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Nama Peserta</th>
                      <th className="py-3 px-4 font-semibold">Satuan Pendidikan & Wilayah</th>
                      {usesSamr && <th className="py-3 px-4 font-semibold">Level SAMR Aktif</th>}
                      <th className="py-3 px-4 font-semibold text-right">Progres</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e9ecef]">
                    {filteredEnrollments.map((enr) => {
                      const prof = profiles.find((p) => p.uid === enr.userId);
                      const npsnVal = enr.npsn || prof?.npsn;
                      return (
                        <tr key={enr.id} className="hover:bg-[#f8f9fa]">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-[#212529]">{enr.userName}</p>
                            {canMonitor && prof?.email && (
                              <p className="text-[11px] text-[#6c757d]">{prof.email}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[#495057]">
                            <div>
                              {enr.instansi} · {enr.kabupatenKota}
                            </div>
                            {npsnVal && (
                              <div className="text-[11px] font-mono text-[#6c757d]">
                                NPSN: {npsnVal}
                              </div>
                            )}
                          </td>
                          {usesSamr && (
                            <td className="py-3 px-4 font-mono text-[#0f6cbf]">
                              {enr.currentLevel > 0
                                ? `Level ${enr.currentLevel} (${LEVEL_SHORT_NAMES[enr.currentLevel as 1 | 2 | 3 | 4]})`
                                : 'Belum Asesmen'}
                            </td>
                          )}
                          <td className="py-3 px-4 text-right font-mono tabular-nums">
                            {enr.overallProgress}%
                          </td>
                          <td className="py-3 px-4 uppercase font-semibold text-[#198754]">
                            {enr.status}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredEnrollments.length === 0 && (
                      <tr>
                        <td colSpan={usesSamr ? 5 : 4} className="py-8 px-4 text-center text-[#6c757d]">
                          Tidak ada data peserta yang cocok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })()}

        {/* ============================================================== */}
        {/* TAB 3: NILAI                                                   */}
        {/* ============================================================== */}
        {topTab === 'nilai' && (() => {
          const gradeRows = courseEnrollments.map((enr) => {
            const prof = profiles.find((p) => p.uid === enr.userId);
            const qList = attempts.filter(
              (a) =>
                a.trainingId === selectedTraining.id &&
                a.userId === enr.userId &&
                a.kind === 'quiz' &&
                a.gradingStatus === 'selesai',
            );
            const eList = attempts.filter(
              (a) =>
                a.trainingId === selectedTraining.id &&
                a.userId === enr.userId &&
                a.kind === 'evaluation' &&
                a.gradingStatus === 'selesai',
            );
            const pList = taskSubmissions.filter(
              (s) =>
                s.trainingId === selectedTraining.id &&
                s.userId === enr.userId &&
                s.weightedScore > 0,
            );
            const avgQ =
              qList.length > 0
                ? Math.round(qList.reduce((s, a) => s + a.finalScore, 0) / qList.length)
                : null;
            const avgE =
              eList.length > 0
                ? Math.round(eList.reduce((s, a) => s + a.finalScore, 0) / eList.length)
                : null;
            const avgP =
              pList.length > 0
                ? Math.round(pList.reduce((s, a) => s + a.weightedScore, 0) / pList.length)
                : null;
            return { enr, prof, avgQ, avgE, avgP };
          });

          const handleExportGradesExcel = () => {
            const rows: Array<Record<string, string | number>> = gradeRows.map(
              ({ enr, prof, avgQ, avgE, avgP }, idx) => {
                const base: Record<string, string | number> = {
                  No: idx + 1,
                  'Nama Peserta': enr.userName,
                  'Satuan Pendidikan': enr.instansi,
                  NPSN: enr.npsn || prof?.npsn || '-',
                  'Kab/Kota': enr.kabupatenKota,
                  Pretest: enr.assessmentScore >= 0 ? enr.assessmentScore : '-',
                };
                if (usesSamr) {
                  base['Level SAMR'] =
                    enr.startingLevel > 0 ? `L${enr.startingLevel} -> L${enr.currentLevel}` : '-';
                }
                base['Rata-rata Kuis'] = avgQ ?? '-';
                base['Rata-rata Evaluasi'] = avgE ?? '-';
                base['Nilai Praktik'] = avgP ?? '-';
                base['Progres (%)'] = `${enr.overallProgress}%`;
                base.Status = enr.status.toUpperCase();
                return base;
              },
            );
            exportMonitoringToExcel(rows, `rekap-nilai-${selectedTraining.code.toLowerCase()}.xlsx`);
            showToast('success', `Rekap nilai (${rows.length} peserta) berhasil diunduh ke Excel.`);
          };

          const handleExportGradesPdf = () => {
            const columns = [
              'No',
              'Peserta',
              'Satuan Pendidikan',
              'Pretest',
              ...(usesSamr ? ['SAMR'] : []),
              'Kuis',
              'Evaluasi',
              'Praktik',
              'Status',
            ];
            const rows = gradeRows.map(({ enr, avgQ, avgE, avgP }, idx) => [
              idx + 1,
              enr.userName,
              enr.instansi,
              enr.assessmentScore >= 0 ? enr.assessmentScore : '-',
              ...(usesSamr
                ? [enr.startingLevel > 0 ? `L${enr.startingLevel}->L${enr.currentLevel}` : '-']
                : []),
              avgQ ?? '-',
              avgE ?? '-',
              avgP ?? '-',
              enr.status.toUpperCase(),
            ]);
            exportMonitoringToPdf({
              fileName: `rekap-nilai-${selectedTraining.code.toLowerCase()}.pdf`,
              title: `Buku Nilai Peserta — ${selectedTraining.name}`,
              subtitle: `${institutionSettings.institutionName} · Kode: ${selectedTraining.code}`,
              summaryLines: [
                `Total Peserta: ${rows.length} · Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`,
              ],
              columns,
              rows,
            });
            showToast('success', `Buku nilai (${rows.length} peserta) berhasil diunduh ke PDF.`);
          };

          return (
            <section className="bg-white border border-[#dee2e6] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="p-5 border-b border-[#e9ecef] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#212529]">
                    {canMonitor ? 'Buku Nilai Peserta Kegiatan' : 'Buku Nilai Saya'}
                  </h2>
                  <p className="text-xs text-[#6c757d]">
                    Rekap nilai Pretest, Kuis Pemahaman, Rubrik Praktik, dan Evaluasi Pembelajaran.
                  </p>
                </div>
                {canMonitor && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportGradesExcel}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#198754] bg-[#e8f5ee] hover:bg-[#d1e7dd] border border-[#a3cfbb] rounded-lg whitespace-nowrap"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Unduh Nilai Excel
                    </button>
                    <button
                      type="button"
                      onClick={handleExportGradesPdf}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#212529] bg-white hover:bg-[#f8f9fa] border border-[#ced4da] rounded-lg whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Unduh Nilai PDF
                    </button>
                    {isStaff && (
                      <Link
                        to="/asesmen-kuis?tab=rubrik"
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg whitespace-nowrap"
                      >
                        Kelola Nilai & Rubrik
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {!canMonitor && enrollment ? (
                <div className="p-5 space-y-4">
                  <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#dee2e6] flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[#6c757d]">
                        {usesSamr ? 'Asesmen Awal Diagnostik SAMR' : 'Pretest Awal Kegiatan'}
                      </p>
                      <p className="font-bold text-[#212529] mt-0.5">
                        {usesSamr && enrollment.startingLevel >= 1
                          ? `Penempatan: Level ${enrollment.startingLevel} (${LEVEL_NAMES[enrollment.startingLevel as 1 | 2 | 3 | 4]})`
                          : enrollment.assessmentScore >= 0
                            ? 'Pretest selesai dikerjakan'
                            : 'Belum dikerjakan'}
                      </p>
                    </div>
                    <span className="text-lg font-mono font-bold text-[#0f6cbf]">
                      {enrollment.assessmentScore >= 0 ? `${enrollment.assessmentScore} / 100` : '—'}
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-[#dee2e6] rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f8f9fa] border-b border-[#e9ecef] text-[#6c757d]">
                        <tr>
                          <th className="py-3 px-4 font-semibold">
                            {usesSamr ? 'Level SAMR' : 'Modul Pembelajaran'}
                          </th>
                          <th className="py-3 px-4 font-semibold text-right">Rubrik Praktik</th>
                          <th className="py-3 px-4 font-semibold text-right">Nilai Kuis</th>
                          <th className="py-3 px-4 font-semibold text-right">Nilai Evaluasi</th>
                          <th className="py-3 px-4 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e9ecef]">
                        {(usesSamr ? levelSummaries : levelSummaries.slice(0, 1)).map(
                          ({ level, summary }) => (
                            <tr key={level.id}>
                              <td className="py-3 px-4 font-semibold text-[#212529]">
                                {usesSamr
                                  ? `Level ${level.levelNumber} · ${LEVEL_SHORT_NAMES[level.levelNumber]}`
                                  : selectedTraining.name}
                              </td>
                              <td className="py-3 px-4 text-right font-mono">
                                {summary.practiceScore ?? '—'}
                              </td>
                              <td className="py-3 px-4 text-right font-mono">
                                {summary.bestQuizScore ?? '—'}
                              </td>
                              <td className="py-3 px-4 text-right font-mono">
                                {summary.bestEvalScore ?? '—'}
                              </td>
                              <td
                                className={`py-3 px-4 font-semibold ${STATUS_LABEL_MAP[summary.status].tone}`}
                              >
                                {STATUS_LABEL_MAP[summary.status].text}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8f9fa] border-b border-[#e9ecef] text-[#6c757d]">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Peserta</th>
                        <th className="py-3 px-4 font-semibold text-right">Pretest</th>
                        {usesSamr && <th className="py-3 px-4 font-semibold">Level SAMR</th>}
                        <th className="py-3 px-4 font-semibold text-right">Rata-rata Kuis</th>
                        <th className="py-3 px-4 font-semibold text-right">Rata-rata Evaluasi</th>
                        <th className="py-3 px-4 font-semibold text-right">Nilai Praktik</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e9ecef]">
                      {gradeRows.map(({ enr, avgQ, avgE, avgP }) => (
                        <tr key={enr.id} className="hover:bg-[#f8f9fa]">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-[#212529]">{enr.userName}</p>
                            <p className="text-[11px] text-[#6c757d]">{enr.instansi}</p>
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {enr.assessmentScore >= 0 ? enr.assessmentScore : '—'}
                          </td>
                          {usesSamr && (
                            <td className="py-3 px-4 font-mono text-[#0f6cbf]">
                              {enr.startingLevel > 0 ? `L${enr.startingLevel} → L${enr.currentLevel}` : '—'}
                            </td>
                          )}
                          <td className="py-3 px-4 text-right font-mono">{avgQ ?? '—'}</td>
                          <td className="py-3 px-4 text-right font-mono">{avgE ?? '—'}</td>
                          <td className="py-3 px-4 text-right font-mono">{avgP ?? '—'}</td>
                          <td className="py-3 px-4 uppercase font-semibold text-[#198754]">
                            {enr.status}
                          </td>
                        </tr>
                      ))}
                      {gradeRows.length === 0 && (
                        <tr>
                          <td colSpan={usesSamr ? 7 : 6} className="py-8 px-4 text-center text-[#6c757d]">
                            Belum ada data nilai peserta pada kegiatan ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })()}

        {/* ============================================================== */}
        {/* TAB 4: REKAMAN AKTIVITAS PESERTA (Admin/Panitia/Fasilitator/Supervisor) */}
        {/* ============================================================== */}
        {topTab === 'aktivitas' && canMonitor && (() => {
          const courseLogs = activityLogs
            .filter((log) => !log.trainingId || log.trainingId === selectedTraining.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

          const filteredLogs = courseLogs.filter((log) => {
            const q = activitySearch.trim().toLowerCase();
            if (q) {
              const hit =
                log.actorName.toLowerCase().includes(q) ||
                log.action.toLowerCase().includes(q) ||
                log.details.toLowerCase().includes(q);
              if (!hit) return false;
            }
            if (activityFilter === 'asesmen') {
              return (
                log.action.includes('ASESMEN') ||
                log.action.includes('KUIS') ||
                log.action.includes('EVALUASI')
              );
            }
            if (activityFilter === 'materi') {
              return log.action.includes('MATERI') || log.action.includes('LEVEL');
            }
            if (activityFilter === 'lainnya') {
              return (
                !log.action.includes('ASESMEN') &&
                !log.action.includes('KUIS') &&
                !log.action.includes('EVALUASI') &&
                !log.action.includes('MATERI') &&
                !log.action.includes('LEVEL')
              );
            }
            return true;
          });

          const courseAttemptsCount = attempts.filter(
            (a) => a.trainingId === selectedTraining.id,
          ).length;
          const courseDoneMatCount = materialProgress.filter(
            (p) => p.trainingId === selectedTraining.id && p.status === 'selesai',
          ).length;
          const activeActorsCount = new Set(
            courseLogs.filter((l) => l.actorRole === 'peserta').map((l) => l.actorUid),
          ).size;

          const handleExportLogsExcel = () => {
            const rows: Array<Record<string, string | number>> = filteredLogs.map((log, idx) => ({
              No: idx + 1,
              Waktu: log.createdAt.slice(0, 19).replace('T', ' '),
              'Nama Pengguna': log.actorName,
              Peran: ROLE_LABELS[log.actorRole as UserRole] || log.actorRole,
              Aksi: log.action,
              'Rincian Aktivitas': log.details,
            }));
            exportMonitoringToExcel(
              rows,
              `rekaman-aktivitas-${selectedTraining.code.toLowerCase()}.xlsx`,
            );
            showToast('success', `Rekaman aktivitas (${rows.length} log) berhasil diunduh ke Excel.`);
          };

          const handleExportLogsPdf = () => {
            const columns = ['No', 'Waktu', 'Pengguna', 'Peran', 'Aksi', 'Rincian'];
            const rows = filteredLogs.map((log, idx) => [
              idx + 1,
              log.createdAt.slice(0, 16).replace('T', ' '),
              log.actorName,
              ROLE_LABELS[log.actorRole as UserRole] || log.actorRole,
              log.action,
              log.details,
            ]);
            exportMonitoringToPdf({
              fileName: `rekaman-aktivitas-${selectedTraining.code.toLowerCase()}.pdf`,
              title: `Rekaman Aktivitas Peserta — ${selectedTraining.name}`,
              subtitle: `${institutionSettings.institutionName} · Kode: ${selectedTraining.code}`,
              summaryLines: [
                `Total Rekaman: ${rows.length} · Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`,
              ],
              columns,
              rows,
            });
            showToast('success', `Rekaman aktivitas (${rows.length} log) berhasil diunduh ke PDF.`);
          };

          return (
            <section className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white border border-[#dee2e6] rounded-xl p-4">
                  <p className="text-xs text-[#6c757d]">Total Rekaman Aktivitas</p>
                  <p className="text-2xl font-bold text-[#212529] tabular-nums mt-1">
                    {courseLogs.length}
                  </p>
                </div>
                <div className="bg-white border border-[#dee2e6] rounded-xl p-4">
                  <p className="text-xs text-[#6c757d]">Peserta Terekam Aktif</p>
                  <p className="text-2xl font-bold text-[#0f6cbf] tabular-nums mt-1">
                    {activeActorsCount}
                  </p>
                </div>
                <div className="bg-white border border-[#dee2e6] rounded-xl p-4">
                  <p className="text-xs text-[#6c757d]">Materi Diselesaikan</p>
                  <p className="text-2xl font-bold text-[#198754] tabular-nums mt-1">
                    {courseDoneMatCount}
                  </p>
                </div>
                <div className="bg-white border border-[#dee2e6] rounded-xl p-4">
                  <p className="text-xs text-[#6c757d]">Asesmen/Kuis/Evaluasi Dikirim</p>
                  <p className="text-2xl font-bold text-[#212529] tabular-nums mt-1">
                    {courseAttemptsCount}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#dee2e6] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                <div className="p-5 border-b border-[#e9ecef] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-[#212529]">
                      Rekaman Aktivitas Peserta & Sistem ({filteredLogs.length})
                    </h2>
                    <p className="text-xs text-[#6c757d]">
                      Jejak audit waktu nyata seluruh aktivitas belajar, pengiriman kuis/evaluasi, dan pembaruan progres pada {selectedTraining.name}.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-56">
                      <Search className="w-4 h-4 text-[#adb5bd] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={activitySearch}
                        onChange={(e) => setActivitySearch(e.target.value)}
                        placeholder="Cari peserta atau aktivitas..."
                        className="w-full pl-9 pr-3 py-2 text-xs border border-[#ced4da] rounded-lg"
                      />
                    </div>
                    <select
                      aria-label="Filter jenis aktivitas"
                      value={activityFilter}
                      onChange={(e) =>
                        setActivityFilter(e.target.value as 'all' | 'asesmen' | 'materi' | 'lainnya')
                      }
                      className="px-3 py-2 text-xs border border-[#ced4da] rounded-lg bg-white text-[#212529]"
                    >
                      <option value="all">Semua Aktivitas</option>
                      <option value="asesmen">Asesmen, Kuis & Evaluasi</option>
                      <option value="materi">Materi & Level</option>
                      <option value="lainnya">Pendaftaran, Tugas & Lainnya</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleExportLogsExcel}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#198754] bg-[#e8f5ee] hover:bg-[#d1e7dd] border border-[#a3cfbb] rounded-lg whitespace-nowrap"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Unduh Excel
                    </button>
                    <button
                      type="button"
                      onClick={handleExportLogsPdf}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#212529] bg-white hover:bg-[#f8f9fa] border border-[#ced4da] rounded-lg whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Unduh PDF
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8f9fa] border-b border-[#e9ecef] text-[#6c757d]">
                      <tr>
                        <th className="py-3 px-4 font-semibold whitespace-nowrap">Waktu</th>
                        <th className="py-3 px-4 font-semibold">Pengguna</th>
                        <th className="py-3 px-4 font-semibold">Aktivitas</th>
                        <th className="py-3 px-4 font-semibold">Rincian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e9ecef]">
                      {filteredLogs.slice(0, 120).map((log) => (
                        <tr key={log.id} className="hover:bg-[#f8f9fa]">
                          <td className="py-3 px-4 font-mono text-[#6c757d] whitespace-nowrap">
                            {log.createdAt.slice(0, 19).replace('T', ' ')}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-[#212529]">{log.actorName}</p>
                            <p className="text-[11px] text-[#6c757d]">
                              {ROLE_LABELS[log.actorRole as UserRole] || log.actorRole}
                            </p>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] font-semibold text-[#0f6cbf] whitespace-nowrap">
                            {log.action}
                          </td>
                          <td className="py-3 px-4 text-[#495057]">{log.details}</td>
                        </tr>
                      ))}
                      {filteredLogs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 px-4 text-center text-[#6c757d]">
                            Belum ada rekaman aktivitas yang sesuai filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          );
        })()}

        {/* ============================================================== */}
        {/* TAB 5: TAUTAN PENDAFTARAN & LOGIN (Peserta/Fasilitator/Panitia) */}
        {/* ============================================================== */}
        {topTab === 'tautan' && (
          <section className="bg-white border border-[#dee2e6] rounded-xl p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <AccessLinksPanel training={selectedTraining} />
          </section>
        )}

        {/* ============================================================== */}
        {/* TAB 6: KELOLA KEGIATAN (Admin/Panitia)                         */}
        {/* ============================================================== */}
        {topTab === 'kelola' && showManagementFeatures && canManage && renderManagementTab && (
          <div>{renderManagementTab(selectedTraining)}</div>
        )}
      </div>

      {/* Modal Input Materi + Pembuatan Soal Kuis & Evaluasi Otomatis */}
      {showUploadModal && activeLevelObj && (
        <MaterialUploadModal
          key={editingMaterialObj?.id || 'new_mat'}
          open={showUploadModal}
          onClose={() => {
            setShowUploadModal(false);
            setEditingMaterialObj(null);
          }}
          training={selectedTraining}
          level={
            trainingLevels.find((l) => l.levelNumber === uploadTargetLevelNum) || activeLevelObj
          }
          usesSamr={usesSamr}
          existingMaterialsCount={trainingMaterials.length}
          editingMaterial={editingMaterialObj}
        />
      )}
    </div>
  );
}
