export type UserRole =
  | 'super_admin'
  | 'admin_kegiatan'
  | 'fasilitator'
  | 'peserta'
  | 'pemantau';

export type TrainingStatus = 'draft' | 'aktif' | 'selesai' | 'arsip';

export type ExecutionMode = 'daring' | 'luring' | 'hybrid';

export type EnrollmentStatus =
  | 'menunggu'
  | 'disetujui'
  | 'ditolak'
  | 'aktif'
  | 'lulus';

export type LevelCardStatus =
  | 'tidak_diwajibkan'
  | 'belum_terbuka'
  | 'terbuka'
  | 'sedang_dipelajari'
  | 'menunggu_evaluasi'
  | 'lulus'
  | 'belum_lulus';

export type PracticeSubmissionStatus =
  | 'menunggu_penilaian'
  | 'lulus'
  | 'perlu_perbaikan';

export type MaterialContentType =
  | 'teks'
  | 'pdf'
  | 'ppt'
  | 'gambar'
  | 'video'
  | 'youtube'
  | 'tautan'
  | 'interaktif';

export type QuestionType =
  | 'pilihan_ganda'
  | 'benar_salah'
  | 'pilihan_ganda_kompleks'
  | 'isian_singkat';

export type BankKind = 'assessment' | 'quiz' | 'evaluation';

export interface ScoreRange {
  level: 1 | 2 | 3 | 4;
  min: number;
  max: number;
  label: string;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  instansi: string;
  npsn?: string;
  kabupatenKota: string;
  jabatan: string;
  jenjangPendidikan?: string;
  mataPelajaran?: string;
  statusPeserta?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingProgram {
  id: string;
  code: string;
  name: string;
  description: string;
  organizer: string;
  startDate: string;
  endDate: string;
  location: string;
  executionMode?: ExecutionMode;
  quota: number;
  status: TrainingStatus;
  requireApproval: boolean;
  bannerUrl: string;
  scoreRanges: ScoreRange[];
  adminUids: string[];
  facilitatorUids: string[];
  monitorUids: string[];
  signerName: string;
  signerTitle: string;
  visibility: 'public_catalog' | 'restricted';
  /** Model 4 Level SAMR hanya berlaku khusus untuk kegiatan Pemanfaatan Digitalisasi Pembelajaran */
  usesSamrLevels?: boolean;
  progressionPolicy?: 'sequential' | 'assigned_only';
  guidelines?: string;
  certTemplateTitle?: string;
  certTemplateSubtitle?: string;
  certAccentColor?: 'navy' | 'blue' | 'gold';
  certLogoUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingEnrollment {
  id: string;
  trainingId: string;
  userId: string;
  userName: string;
  instansi: string;
  npsn?: string;
  kabupatenKota: string;
  jenjangPendidikan?: string;
  mataPelajaran?: string;
  status: EnrollmentStatus;
  startingLevel: number; // 0 = belum asesmen, 1..4
  currentLevel: number; // 0..4
  unlockedLevels: number[];
  completedLevels: number[];
  assessmentScore: number; // -1 jika belum asesmen
  overallProgress: number; // 0..100
  certificateNumber: string;
  approvedBy: string;
  enrolledAt: string;
  updatedAt: string;
}

export interface LearningLevel {
  id: string;
  trainingId: string;
  levelNumber: 1 | 2 | 3 | 4;
  title: string;
  slug: 'dasar' | 'berkembang' | 'lanjut' | 'mahir';
  description: string;
  learningObjectives: string;
  learningOutcomes: string;
  facilitatorUid: string;
  facilitatorName: string;
  durationHours: number;
  minQuizScore: number;
  minEvaluationScore: number;
  demoGuide?: string;
  demoVideoUrl?: string;
  taskInstructions?: string;
  taskSteps?: string;
  taskSampleOutput?: string;
  requirePracticeValidation?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LearningMaterial {
  id: string;
  trainingId: string;
  levelId: string;
  levelNumber: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  contentType: MaterialContentType;
  contentBody: string;
  fileUrl: string;
  fileName: string;
  orderIndex: number;
  durationMinutes: number;
  isMandatory: boolean;
  isActive: boolean;
  allowDownload: boolean;
  isPrivateBucket: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialProgress {
  id: string;
  trainingId: string;
  levelId: string;
  levelNumber: number;
  materialId: string;
  userId: string;
  status: 'belum' | 'dipelajari' | 'selesai';
  createdAt: string;
  updatedAt: string;
}

export interface RubricCriterion {
  id: string;
  label: string;
  weight: number; // total 100
}

export interface RubricAspectScore {
  criterionId: string;
  criterionLabel: string;
  weight: number;
  score: 1 | 2 | 3 | 4;
  comment: string;
}

export interface TaskSubmission {
  id: string;
  trainingId: string;
  levelNumber: 1 | 2 | 3 | 4;
  userId: string;
  userName: string;
  title: string;
  description: string;
  productUrl: string;
  productFileName: string;
  docMediaUrl: string;
  docMediaName: string;
  status: PracticeSubmissionStatus;
  rubricScores: RubricAspectScore[];
  weightedScore: number; // 0..100
  facilitatorFeedback: string;
  gradedBy: string;
  gradedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface LevelReflection {
  id: string;
  trainingId: string;
  levelNumber: 1 | 2 | 3 | 4;
  userId: string;
  userName: string;
  learningExperience: string;
  challenges: string;
  competenciesGained: string;
  schoolImplementationPlan: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionItem {
  id: string;
  type: QuestionType;
  prompt: string;
  weight: number;
  options: QuestionOption[];
  requiresManualGrading?: boolean;
  answerHash?: string;
}

export interface AnswerKeyEntry {
  questionId: string;
  correctOptionIds: string[];
  acceptedTextAnswers: string[];
  explanation: string;
}

export interface QuestionBank {
  id: string;
  trainingId: string;
  levelNumber: number; // 0 untuk asesmen awal, 1..4 untuk kuis/evaluasi
  materialId?: string; // Opsional: menautkan kuis secara spesifik ke satu materi
  kind: BankKind;
  title: string;
  description: string;
  durationMinutes: number;
  maxAttempts: number;
  passingScore: number;
  shuffleQuestions: boolean;
  showExplanation: boolean;
  isActive: boolean;
  questions: QuestionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AnswerKeyDocument {
  id: string;
  trainingId: string;
  kind: BankKind;
  answers: AnswerKeyEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface UserAnswerMap {
  [questionId: string]: {
    selectedOptionIds?: string[];
    textAnswer?: string;
  };
}

export interface AttemptRecord {
  id: string;
  trainingId: string;
  bankId: string;
  kind: BankKind;
  levelNumber: number;
  userId: string;
  userName: string;
  attemptNumber: number;
  answers: UserAnswerMap;
  autoScore: number;
  manualScore: number;
  finalScore: number;
  percentage: number;
  passed: boolean;
  assignedLevel: number;
  gradingStatus: 'selesai' | 'menunggu_manual';
  feedback: string;
  gradedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateRecord {
  certificateNumber: string;
  trainingId: string;
  trainingName: string;
  organizer: string;
  userId: string;
  participantName: string;
  completedLevel: number;
  issuedDate: string;
  signerName: string;
  signerTitle: string;
  status: 'valid' | 'dicabut';
  createdAt: string;
}

export interface ActivityLogRecord {
  id: string;
  trainingId: string;
  actorUid: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  overrideReason: string;
  createdAt: string;
}

export interface AnnouncementRecord {
  id: string;
  trainingId: string;
  title: string;
  body: string;
  authorUid: string;
  authorName: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingSchedule {
  id: string;
  trainingId: string;
  levelNumber: number; // 0 = Umum / Asesmen, 1..4 = Level spesifik
  title: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  facilitatorName: string;
  mode: 'daring' | 'luring' | 'mandiri';
  locationOrUrl: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacilitatorNote {
  id: string;
  trainingId: string;
  levelNumber: number;
  participantUid: string; // uid spesifik atau 'all' untuk semua peserta level
  participantName: string;
  authorUid: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface InstitutionSettings {
  id: string;
  appName: string;
  tagline: string;
  institutionName: string;
  address: string;
  website: string;
  supportEmail: string;
  certificatePrefix: string;
  updatedAt: string;
}

export interface LevelEvaluationSummary {
  levelNumber: 1 | 2 | 3 | 4;
  status: LevelCardStatus;
  isBelowStartingLevel: boolean;
  mandatoryTotal: number;
  mandatoryCompleted: number;
  allMandatoryDone: boolean;
  practiceSubmitted: boolean;
  practicePassed: boolean;
  practiceStatus: 'belum' | PracticeSubmissionStatus;
  practiceScore: number | null;
  reflectionDone: boolean;
  bestQuizScore: number | null;
  quizPassed: boolean;
  bestEvalScore: number | null;
  evalPassed: boolean;
  pendingManualGrading: boolean;
  canUnlockNext: boolean;
  missingRequirements: string[];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin_kegiatan: 'Admin Kegiatan',
  fasilitator: 'Fasilitator',
  peserta: 'Peserta',
  pemantau: 'Supervisor',
};

export const LEVEL_NAMES: Record<1 | 2 | 3 | 4, string> = {
  1: 'Substitution (Substitusi)',
  2: 'Augmentation (Augmentasi)',
  3: 'Modification (Modifikasi)',
  4: 'Redefinition (Redefinisi)',
};

export const LEVEL_SHORT_NAMES: Record<1 | 2 | 3 | 4, string> = {
  1: 'Substitution',
  2: 'Augmentation',
  3: 'Modification',
  4: 'Redefinition',
};

export interface SamrLevelMeta {
  level: 1 | 2 | 3 | 4;
  name: string;
  indonesianName: string;
  definition: string;
  pidExample: string;
  competencies: string[];
  activities: string[];
  practicalProduct: string;
  recommendedFocus: string;
}

export const SAMR_LEVEL_META: Record<1 | 2 | 3 | 4, SamrLevelMeta> = {
  1: {
    level: 1,
    name: 'Substitution',
    indonesianName: 'Substitusi',
    definition:
      'Teknologi menggantikan alat lama tanpa perubahan fungsi utama pembelajaran.',
    pidExample:
      'Guru menuliskan materi pelajaran dan menampilkan bahan ajar di aplikasi papan tulis Papan Interaktif Digital (PID).',
    competencies: [
      'Mengenali bagian dan fungsi dasar PID',
      'Mengoperasikan perangkat PID secara aman',
      'Menggunakan PID sebagai pengganti papan tulis konvensional',
      'Menampilkan materi pembelajaran digital (PDF/PPT)',
      'Menyimpan dan membuka kembali catatan papan tulis',
    ],
    activities: [
      'Mengenali bagian perangkat dan fungsi dasar PID',
      'Mengoperasikan aplikasi papan tulis digital',
      'Menulis dan menggambar konsep menggunakan stylus PID',
      'Menampilkan dokumen pembelajaran di layar PID',
      'Menyimpan dan membagikan materi sederhana dari PID',
    ],
    practicalProduct:
      'Materi pembelajaran sederhana yang ditulis, disusun, dan disimpan langsung menggunakan Papan Interaktif Digital (PID).',
    recommendedFocus:
      'Fokus pada penguasaan pengoperasian dasar PID, penulisan digital, serta penayangan dokumen ajar dengan lancar.',
  },
  2: {
    level: 2,
    name: 'Augmentation',
    indonesianName: 'Augmentasi',
    definition:
      'Teknologi menggantikan alat lama dengan peningkatan fungsi yang memperkaya penyajian materi.',
    pidExample:
      'Guru menggunakan fitur anotasi berwarna, zoom, penyorotan (spotlight), dan sisipan video pada PID untuk menekankan bagian penting.',
    competencies: [
      'Menggunakan fitur anotasi dan penandaan warna secara efektif',
      'Memanfaatkan zoom, penyorotan (spotlight), dan penggaris/alat geometri PID',
      'Mengintegrasikan gambar, video, dan dokumen dalam satu kanvas ajar',
      'Memanfaatkan fitur tangkapan layar (screenshot) untuk pembahasan ulang',
      'Meningkatkan kualitas visual dan interaktivitas penyajian materi',
    ],
    activities: [
      'Menggunakan anotasi berlapis untuk menjelaskan konsep utama',
      'Memperbesar objek pembelajaran detail dengan fitur zoom PID',
      'Menambahkan gambar ilmiah dan video pendek ke papan ajar',
      'Memanfaatkan tangkapan layar untuk merangkum diskusi kelas',
      'Menyusun presentasi pembelajaran interaktif berbasis PID',
    ],
    practicalProduct:
      'Materi presentasi pembelajaran interaktif yang memanfaatkan anotasi, zoom, tangkapan layar, serta integrasi gambar/video di PID.',
    recommendedFocus:
      'Fokus pada optimalisasi fitur peningkatan fungsi PID (anotasi, zoom, multimedia) agar penjelasan materi lebih bermakna.',
  },
  3: {
    level: 3,
    name: 'Modification',
    indonesianName: 'Modifikasi',
    definition:
      'Teknologi memungkinkan desain ulang tugas pembelajaran secara signifikan dan kolaboratif.',
    pidExample:
      'Murid berkolaborasi langsung menyusun rangkaian listrik virtual di PID dan menggeser komponen secara bersamaan untuk memecahkan masalah.',
    competencies: [
      'Merancang skenario pembelajaran kolaboratif berbasis multi-sentuh PID',
      'Mengembangkan aktivitas interaktif yang melibatkan murid aktif di depan papan',
      'Mengintegrasikan simulasi digital ke dalam kegiatan inti pembelajaran',
      'Mengembangkan tugas dan LKPD digital interaktif berbasis pemecahan masalah',
      'Memfasilitasi kolaborasi dan refleksi langsung antar peserta didik',
    ],
    activities: [
      'Membuat aktivitas kolaboratif multi-sentuh menggunakan PID',
      'Mengintegrasikan simulasi pembelajaran virtual (IPA/Matematika/IPS)',
      'Merancang tantangan pemecahan masalah kontekstual di PID',
      'Menyusun LKPD digital interaktif yang dikerjakan bersama di kelas',
      'Mengembangkan rancangan pembelajaran berbasis proyek (PjBL) dengan PID',
    ],
    practicalProduct:
      'Rancangan pembelajaran (RPP/Modul Ajar) dan media/LKPD interaktif berbasis PID yang mendesain ulang aktivitas belajar secara kolaboratif.',
    recommendedFocus:
      'Fokus pada perancangan ulang aktivitas belajar murid agar aktif berkolaborasi, memanipulasi objek virtual, dan memecahkan masalah di PID.',
  },
  4: {
    level: 4,
    name: 'Redefinition',
    indonesianName: 'Redefinisi',
    definition:
      'Teknologi menciptakan tugas dan pengalaman belajar baru yang sebelumnya sulit atau tidak mungkin dilakukan.',
    pidExample:
      'Murid mengubah nilai baterai atau hambatan pada rangkaian virtual di PID, mengamati grafik arus listrik real-time, lalu mempublikasikan laporan percobaan secara daring.',
    competencies: [
      'Merancang pengalaman belajar transformatif baru berbasis PID',
      'Mengembangkan skenario eksperimen dan simulasi virtual real-time',
      'Memanfaatkan PID untuk eksplorasi variabel dan analisis data langsung',
      'Mengintegrasikan kolaborasi lintas ruang dan publikasi karya secara daring',
      'Mengevaluasi dampak inovasi pembelajaran digital terhadap capaian murid',
    ],
    activities: [
      'Mengembangkan eksperimen virtual manipulasi variabel di PID',
      'Membuat simulasi pembelajaran interaktif dengan perekaman data real-time',
      'Mengembangkan proyek digital kolaboratif lintas kelas/sekolah',
      'Memfasilitasi pengumpulan, visualisasi, dan analisis data eksperimen murid',
      'Mempublikasikan artefak dan hasil percobaan pembelajaran secara daring',
    ],
    practicalProduct:
      'Produk pembelajaran inovatif berbasis PID lengkap dengan skenario eksperimen virtual, analisis data langsung, dan publikasi daring hasil karya murid.',
    recommendedFocus:
      'Fokus pada penciptaan pengalaman belajar transformatif melalui eksperimen virtual, eksplorasi data real-time, dan publikasi kolaboratif daring.',
  },
};

export const DEFAULT_SCORE_RANGES: ScoreRange[] = [
  { level: 1, min: 0, max: 40, label: 'Level 1 · Substitution (Substitusi)' },
  { level: 2, min: 40.01, max: 60, label: 'Level 2 · Augmentation (Augmentasi)' },
  { level: 3, min: 60.01, max: 80, label: 'Level 3 · Modification (Modifikasi)' },
  { level: 4, min: 80.01, max: 100, label: 'Level 4 · Redefinition (Redefinisi)' },
];

export const DEFAULT_SAMR_RUBRIC: RubricCriterion[] = [
  { id: 'c1', label: 'Kesesuaian produk dengan tujuan pembelajaran', weight: 20 },
  { id: 'c2', label: 'Ketepatan penggunaan fitur Papan Interaktif Digital (PID)', weight: 20 },
  { id: 'c3', label: 'Kualitas desain dan struktur pembelajaran', weight: 15 },
  { id: 'c4', label: 'Tingkat interaktivitas dan pelibatan peserta didik', weight: 15 },
  { id: 'c5', label: 'Kreativitas dan inovasi penyajian', weight: 15 },
  { id: 'c6', label: 'Kesesuaian dengan karakteristik level SAMR', weight: 15 },
];

export const RUBRIC_SCALE_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: '1 — Perlu bimbingan',
  2: '2 — Mulai berkembang',
  3: '3 — Cakap',
  4: '4 — Sangat baik',
};

export const JENJANG_OPTIONS = ['PAUD/TK', 'SD/MI', 'SMP/MTs', 'SMA/MA', 'SMK', 'SLB', 'Perguruan Tinggi', 'Lainnya'];
export const STATUS_PESERTA_OPTIONS = ['Guru ASN (PNS)', 'Guru PPPK', 'Guru Non-ASN', 'Kepala Sekolah', 'Pengawas Sekolah', 'Tenaga Kependidikan'];

export type RegistrationRoleSlug = 'peserta' | 'fasilitator' | 'panitia';

export const REGISTRATION_ROLE_META: Record<
  RegistrationRoleSlug,
  {
    slug: RegistrationRoleSlug;
    role: UserRole;
    label: string;
    shortLabel: string;
    description: string;
    defaultJabatan: string;
  }
> = {
  peserta: {
    slug: 'peserta',
    role: 'peserta',
    label: 'Peserta / Guru',
    shortLabel: 'Peserta',
    description: 'Guru, kepala sekolah, atau tenaga kependidikan yang mengikuti pelatihan.',
    defaultJabatan: 'Guru Mata Pelajaran',
  },
  fasilitator: {
    slug: 'fasilitator',
    role: 'fasilitator',
    label: 'Fasilitator / Narasumber',
    shortLabel: 'Fasilitator',
    description: 'Widyaiswara atau pengajar yang membimbing materi, praktik, dan validasi tugas.',
    defaultJabatan: 'Fasilitator Pelatihan',
  },
  panitia: {
    slug: 'panitia',
    role: 'admin_kegiatan',
    label: 'Panitia / Admin Kegiatan',
    shortLabel: 'Panitia',
    description: 'Pengelola operasional kegiatan, jadwal, verifikasi peserta, dan pelaporan.',
    defaultJabatan: 'Panitia Penyelenggara',
  },
};

/**
 * Level SAMR hanya berlaku khusus untuk kegiatan "Digitalisasi Pembelajaran".
 * Kegiatan pelatihan lainnya menggunakan alur modul berurutan standar tanpa level SAMR.
 */
export function isSamrTraining(
  training?: Pick<TrainingProgram, 'usesSamrLevels' | 'name' | 'code'> | null,
): boolean {
  if (!training) return false;
  if (typeof training.usesSamrLevels === 'boolean') {
    return training.usesSamrLevels;
  }
  const haystack = `${training.name || ''} ${training.code || ''}`.toLowerCase();
  return (
    haystack.includes('digitalisasi pembelajaran') ||
    haystack.includes('samr-pid')
  );
}

