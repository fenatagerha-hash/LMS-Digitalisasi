import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { buildSeedDataset, SeedDataset } from '../data/seedDataset';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  calculateRubricWeightedScore,
  evaluateLevelStatus,
  generateUniqueCertificateNumber,
  gradeSubmission,
  resolveStartingLevel,
  validateScoreRanges,
} from '../lib/lmsRules';
import {
  ActivityLogRecord,
  AnnouncementRecord,
  AnswerKeyDocument,
  AnswerKeyEntry,
  AttemptRecord,
  CertificateRecord,
  DEFAULT_SCORE_RANGES,
  FacilitatorNote,
  InstitutionSettings,
  isSamrTraining,
  LearningLevel,
  LearningMaterial,
  LevelReflection,
  MaterialProgress,
  QuestionBank,
  QuestionItem,
  RubricAspectScore,
  ScoreRange,
  TaskSubmission,
  TrainingEnrollment,
  TrainingProgram,
  TrainingSchedule,
  UserAnswerMap,
  UserProfile,
  UserRole,
} from '../types/lms';
import { ParsedParticipantRow } from '../lib/exporters';

function tsToIso(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'seconds' in val) {
    const secs = Number((val as { seconds: number }).seconds);
    return new Date(secs * 1000).toISOString();
  }
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export interface ActionResult {
  ok: boolean;
  message: string;
  data?: unknown;
}

interface LmsContextValue {
  // Auth & Persistence Mode
  authReady: boolean;
  firebaseUser: FirebaseUser | null;
  isLiveDatabase: boolean;
  isBootstrappedAdmin: boolean;
  isDemoMode: boolean;
  currentUser: UserProfile | null;
  effectiveRole: UserRole | null;
  activeDemoUid: string | null;
  seedingBusy: boolean;
  toast: { type: 'success' | 'error' | 'info'; text: string } | null;
  clearToast: () => void;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;

  // Data collections
  profiles: UserProfile[];
  trainings: TrainingProgram[];
  levels: LearningLevel[];
  materials: LearningMaterial[];
  questionBanks: QuestionBank[];
  answerKeys: AnswerKeyDocument[];
  enrollments: TrainingEnrollment[];
  materialProgress: MaterialProgress[];
  attempts: AttemptRecord[];
  taskSubmissions: TaskSubmission[];
  levelReflections: LevelReflection[];
  certificates: CertificateRecord[];
  announcements: AnnouncementRecord[];
  activityLogs: ActivityLogRecord[];
  schedules: TrainingSchedule[];
  facilitatorNotes: FacilitatorNote[];
  institutionSettings: InstitutionSettings;

  // Auth actions
  loginWithGoogle: () => Promise<void>;
  loginWithEmailDemo: (email: string, password: string) => ActionResult;
  enterDemoAccount: (uid: string) => void;
  switchSimulatedUser: (uid: string | null) => void;
  logout: () => Promise<void>;
  seedCloudFirestore: () => Promise<ActionResult>;

  // Account & Profile actions
  registerParticipantSelf: (payload: {
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
    trainingId: string;
    role?: 'peserta' | 'fasilitator' | 'admin_kegiatan';
  }) => Promise<ActionResult>;
  updateOwnProfile: (payload: {
    fullName: string;
    phone: string;
    instansi: string;
    npsn?: string;
    kabupatenKota: string;
    jabatan: string;
    jenjangPendidikan?: string;
    mataPelajaran?: string;
    statusPeserta?: string;
  }) => Promise<ActionResult>;
  createAccountByAdmin: (payload: {
    fullName: string;
    email: string;
    phone: string;
    instansi: string;
    kabupatenKota: string;
    jabatan: string;
    role: UserRole;
  }) => Promise<ActionResult>;
  toggleAccountActive: (uid: string, isActive: boolean) => Promise<ActionResult>;
  updateAccountRole: (uid: string, role: UserRole) => Promise<ActionResult>;
  importParticipantsFromExcel: (
    trainingId: string,
    rows: ParsedParticipantRow[],
  ) => Promise<ActionResult>;

  // Training CRUD & Level Management
  createTraining: (payload: Omit<TrainingProgram, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) => Promise<ActionResult>;
  updateTraining: (trainingId: string, patch: Partial<TrainingProgram>) => Promise<ActionResult>;
  deleteTraining: (trainingId: string) => Promise<ActionResult>;
  updateScoreRanges: (trainingId: string, ranges: ScoreRange[]) => Promise<ActionResult>;
  updateLearningLevel: (levelId: string, patch: Partial<LearningLevel>) => Promise<ActionResult>;

  // Enrollments & Sequential Learning
  enrollInTraining: (trainingId: string, userId?: string) => Promise<ActionResult>;
  approveOrRejectEnrollment: (
    enrollmentId: string,
    decision: 'disetujui' | 'ditolak',
  ) => Promise<ActionResult>;
  adminOverrideLevel: (
    enrollmentId: string,
    targetLevel: 1 | 2 | 3 | 4,
    reason: string,
  ) => Promise<ActionResult>;

  // Materials
  saveMaterial: (
    payload: Omit<LearningMaterial, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'> & { id?: string },
  ) => Promise<ActionResult>;
  deleteMaterial: (materialId: string) => Promise<ActionResult>;
  markMaterialProgress: (
    material: LearningMaterial,
    status: 'dipelajari' | 'selesai',
  ) => Promise<ActionResult>;

  // Assessments, Quizzes, Evaluations
  saveQuestionBank: (bank: QuestionBank, answers: AnswerKeyEntry[]) => Promise<ActionResult>;
  submitBankAttempt: (params: {
    bank: QuestionBank;
    answers: UserAnswerMap;
  }) => Promise<ActionResult>;
  gradeManualAttempt: (params: {
    attemptId: string;
    manualScore: number;
    feedback: string;
  }) => Promise<ActionResult>;
  verifyAndUnlockLevel: (trainingId: string, levelNumber: 1 | 2 | 3 | 4) => Promise<ActionResult>;

  // Tugas Praktik PID, Rubrik Penilaian (1-4), & Refleksi Level SAMR
  submitPracticalTask: (payload: {
    trainingId: string;
    levelNumber: 1 | 2 | 3 | 4;
    title: string;
    description: string;
    productUrl: string;
    productFileName: string;
    docMediaUrl: string;
    docMediaName?: string;
  }) => Promise<ActionResult>;
  gradePracticalTask: (payload: {
    submissionId: string;
    rubricScores: RubricAspectScore[];
    status: 'lulus' | 'perlu_perbaikan';
    facilitatorFeedback: string;
  }) => Promise<ActionResult>;
  saveLevelReflection: (payload: {
    trainingId: string;
    levelNumber: 1 | 2 | 3 | 4;
    learningExperience: string;
    challenges: string;
    competenciesGained: string;
    schoolImplementationPlan: string;
  }) => Promise<ActionResult>;

  // Announcements, Schedules, Notes, Settings & Certificates
  createAnnouncement: (trainingId: string, title: string, body: string) => Promise<ActionResult>;
  createSchedule: (
    payload: Omit<TrainingSchedule, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<ActionResult>;
  deleteSchedule: (scheduleId: string) => Promise<ActionResult>;
  createFacilitatorNote: (payload: {
    trainingId: string;
    levelNumber: number;
    participantUid: string;
    participantName: string;
    content: string;
  }) => Promise<ActionResult>;
  updateInstitutionSettings: (
    patch: Omit<InstitutionSettings, 'id' | 'updatedAt'>,
  ) => Promise<ActionResult>;
  lookupCertificatePublic: (certificateNumber: string) => Promise<CertificateRecord | null>;
}

const LmsContext = createContext<LmsContextValue | null>(null);

export function LmsProvider({ children }: { children: React.ReactNode }) {
  const initialSeed = useMemo<SeedDataset>(() => buildSeedDataset(), []);

  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [firebaseUserRole, setFirebaseUserRole] = useState<UserRole | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activeDemoUid, setActiveDemoUid] = useState<string | null>(null);
  const [seedingBusy, setSeedingBusy] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null,
  );

  // State koleksi
  const [profiles, setProfiles] = useState<UserProfile[]>(initialSeed.profiles);
  const [trainings, setTrainings] = useState<TrainingProgram[]>(initialSeed.trainings);
  const [levels, setLevels] = useState<LearningLevel[]>(initialSeed.levels);
  const [materials, setMaterials] = useState<LearningMaterial[]>(initialSeed.materials);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>(initialSeed.questionBanks);
  const [answerKeys, setAnswerKeys] = useState<AnswerKeyDocument[]>(initialSeed.answerKeys);
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>(initialSeed.enrollments);
  const [materialProgress, setMaterialProgress] = useState<MaterialProgress[]>(
    initialSeed.materialProgress,
  );
  const [attempts, setAttempts] = useState<AttemptRecord[]>(initialSeed.attempts);
  const [taskSubmissions, setTaskSubmissions] = useState<TaskSubmission[]>(
    initialSeed.taskSubmissions,
  );
  const [levelReflections, setLevelReflections] = useState<LevelReflection[]>(
    initialSeed.levelReflections,
  );
  const [certificates, setCertificates] = useState<CertificateRecord[]>(initialSeed.certificates);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>(
    initialSeed.announcements,
  );
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>(initialSeed.activityLogs);
  const [schedules, setSchedules] = useState<TrainingSchedule[]>(initialSeed.schedules);
  const [facilitatorNotes, setFacilitatorNotes] = useState<FacilitatorNote[]>(
    initialSeed.facilitatorNotes,
  );
  const [institutionSettings, setInstitutionSettings] = useState<InstitutionSettings>(
    initialSeed.institutionSettings,
  );

  const isLiveDatabase = Boolean(firebaseUser) && !isDemoMode;
  const isBootstrappedAdmin = Boolean(
    firebaseUser?.email === BOOTSTRAPPED_ADMIN_EMAIL && firebaseUser?.emailVerified,
  );
  const isAdminUser =
    isBootstrappedAdmin ||
    firebaseUserRole === 'super_admin' ||
    firebaseUserRole === 'admin_kegiatan';
  const isStaffUser = isAdminUser || firebaseUserRole === 'fasilitator';
  const isMonitoringUser = isStaffUser || firebaseUserRole === 'pemantau';

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    window.setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const clearToast = () => setToast(null);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setIsDemoMode(false);
        try {
          const profRef = doc(db, 'profiles', user.uid);
          const snap = await getDoc(profRef);
          if (!snap.exists()) {
            const role: UserRole =
              user.email === BOOTSTRAPPED_ADMIN_EMAIL && user.emailVerified
                ? 'super_admin'
                : 'peserta';
            const displayName = user.displayName?.trim() || user.email?.split('@')[0] || 'Pengguna LMS';
            await setDoc(profRef, {
              uid: user.uid,
              fullName: displayName.slice(0, 120),
              email: user.email || `${user.uid}@lms.local`,
              phone: '',
              instansi: role === 'super_admin' ? 'Pusat Pengembangan Kompetensi Digital' : 'Peserta Umum',
              kabupatenKota: 'Jakarta Pusat',
              jabatan: role === 'super_admin' ? 'Super Admin LMS' : 'Peserta Pelatihan',
              role,
              isActive: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            await setDoc(doc(db, 'public_profiles', user.uid), {
              uid: user.uid,
              displayName: displayName.slice(0, 120),
              role,
              instansi: role === 'super_admin' ? 'Pusat Pengembangan Kompetensi Digital' : 'Peserta Umum',
              kabupatenKota: 'Jakarta Pusat',
              isActive: true,
              isPublic: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            setFirebaseUserRole(role);
          } else {
            const existingRole = (snap.data()?.role as UserRole) || 'peserta';
            setFirebaseUserRole(existingRole);
          }
        } catch (err) {
          console.error('Gagal sinkronisasi profil awal:', err);
          setFirebaseUserRole(
            user.email === BOOTSTRAPPED_ADMIN_EMAIL && user.emailVerified ? 'super_admin' : 'peserta',
          );
        }
      } else {
        setFirebaseUserRole(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Firestore real-time subscriptions ketika login dengan Firebase Auth
  useEffect(() => {
    if (!authReady || !firebaseUser || isDemoMode) return;

    const unsubs: Array<() => void> = [];
    const uid = firebaseUser.uid;

    const attach = <T,>(
      qRef: ReturnType<typeof query> | ReturnType<typeof collection>,
      path: string,
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      mapper: (data: Record<string, unknown>, id: string) => T,
    ) => {
      const u = onSnapshot(
        qRef,
        (snap) => {
          const list = snap.docs.map((d) => mapper(d.data() as Record<string, unknown>, d.id));
          setter(list);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, path);
        },
      );
      unsubs.push(u);
    };

    attach<UserProfile>(
      isAdminUser
        ? collection(db, 'profiles')
        : query(collection(db, 'profiles'), where('uid', '==', uid)),
      'profiles',
      setProfiles,
      (d, id) => ({
        uid: String(d.uid || id),
        fullName: String(d.fullName || ''),
        email: String(d.email || ''),
        phone: String(d.phone || ''),
        instansi: String(d.instansi || ''),
        npsn: typeof d.npsn === 'string' ? d.npsn : undefined,
        kabupatenKota: String(d.kabupatenKota || ''),
        jabatan: String(d.jabatan || ''),
        jenjangPendidikan: typeof d.jenjangPendidikan === 'string' ? d.jenjangPendidikan : undefined,
        mataPelajaran: typeof d.mataPelajaran === 'string' ? d.mataPelajaran : undefined,
        statusPeserta: typeof d.statusPeserta === 'string' ? d.statusPeserta : undefined,
        role: (d.role as UserRole) || 'peserta',
        isActive: Boolean(d.isActive),
        createdAt: tsToIso(d.createdAt),
        updatedAt: tsToIso(d.updatedAt),
      }),
    );

    attach<TrainingProgram>(
      isMonitoringUser
        ? collection(db, 'training_programs')
        : query(collection(db, 'training_programs'), where('visibility', '==', 'public_catalog')),
      'training_programs',
      setTrainings,
      (d, id) => ({
        id: String(d.id || id),
        code: String(d.code || ''),
        name: String(d.name || ''),
        description: String(d.description || ''),
        organizer: String(d.organizer || ''),
        startDate: String(d.startDate || ''),
        endDate: String(d.endDate || ''),
        location: String(d.location || ''),
        executionMode:
          d.executionMode === 'daring' || d.executionMode === 'luring' || d.executionMode === 'hybrid'
            ? d.executionMode
            : 'hybrid',
        quota: Number(d.quota || 50),
        status: (d.status as TrainingProgram['status']) || 'aktif',
        requireApproval: Boolean(d.requireApproval),
        bannerUrl: String(d.bannerUrl || ''),
        scoreRanges: Array.isArray(d.scoreRanges)
          ? (d.scoreRanges as ScoreRange[])
          : DEFAULT_SCORE_RANGES,
        adminUids: Array.isArray(d.adminUids) ? (d.adminUids as string[]) : [],
        facilitatorUids: Array.isArray(d.facilitatorUids) ? (d.facilitatorUids as string[]) : [],
        monitorUids: Array.isArray(d.monitorUids) ? (d.monitorUids as string[]) : [],
        signerName: String(d.signerName || ''),
        signerTitle: String(d.signerTitle || ''),
        visibility: (d.visibility as 'public_catalog' | 'restricted') || 'public_catalog',
        progressionPolicy:
          d.progressionPolicy === 'assigned_only' ? 'assigned_only' : 'sequential',
        guidelines: typeof d.guidelines === 'string' ? d.guidelines : undefined,
        certTemplateTitle: typeof d.certTemplateTitle === 'string' ? d.certTemplateTitle : undefined,
        certTemplateSubtitle:
          typeof d.certTemplateSubtitle === 'string' ? d.certTemplateSubtitle : undefined,
        certAccentColor:
          d.certAccentColor === 'blue' || d.certAccentColor === 'gold' ? d.certAccentColor : 'navy',
        certLogoUrl: typeof d.certLogoUrl === 'string' ? d.certLogoUrl : undefined,
        createdBy: String(d.createdBy || ''),
        createdAt: tsToIso(d.createdAt),
        updatedAt: tsToIso(d.updatedAt),
      }),
    );

    attach<LearningLevel>(
      isMonitoringUser
        ? collection(db, 'learning_levels')
        : query(collection(db, 'learning_levels'), where('isActive', '==', true)),
      'learning_levels',
      setLevels,
      (d, id) => ({
        id: String(d.id || id),
        trainingId: String(d.trainingId || ''),
        levelNumber: Number(d.levelNumber || 1) as 1 | 2 | 3 | 4,
        title: String(d.title || ''),
        slug: (d.slug as LearningLevel['slug']) || 'dasar',
        description: String(d.description || ''),
        learningObjectives: String(d.learningObjectives || ''),
        learningOutcomes: String(d.learningOutcomes || ''),
        facilitatorUid: String(d.facilitatorUid || ''),
        facilitatorName: String(d.facilitatorName || ''),
        durationHours: Number(d.durationHours || 8),
        minQuizScore: Number(d.minQuizScore || 75),
        minEvaluationScore: Number(d.minEvaluationScore || 75),
        demoGuide: typeof d.demoGuide === 'string' ? d.demoGuide : undefined,
        demoVideoUrl: typeof d.demoVideoUrl === 'string' ? d.demoVideoUrl : undefined,
        taskInstructions: typeof d.taskInstructions === 'string' ? d.taskInstructions : undefined,
        taskSteps: typeof d.taskSteps === 'string' ? d.taskSteps : undefined,
        taskSampleOutput: typeof d.taskSampleOutput === 'string' ? d.taskSampleOutput : undefined,
        requirePracticeValidation:
          typeof d.requirePracticeValidation === 'boolean' ? d.requirePracticeValidation : true,
        isActive: Boolean(d.isActive),
        createdAt: tsToIso(d.createdAt),
        updatedAt: tsToIso(d.updatedAt),
      }),
    );

    attach<LearningMaterial>(
      isStaffUser
        ? collection(db, 'learning_materials')
        : query(collection(db, 'learning_materials'), where('isActive', '==', true)),
      'learning_materials',
      setMaterials,
      (d, id) => ({
        id: String(d.id || id),
        trainingId: String(d.trainingId || ''),
        levelId: String(d.levelId || ''),
        levelNumber: Number(d.levelNumber || 1) as 1 | 2 | 3 | 4,
        title: String(d.title || ''),
        description: String(d.description || ''),
        contentType: (d.contentType as LearningMaterial['contentType']) || 'teks',
        contentBody: String(d.contentBody || ''),
        fileUrl: String(d.fileUrl || ''),
        fileName: String(d.fileName || ''),
        orderIndex: Number(d.orderIndex || 1),
        durationMinutes: Number(d.durationMinutes || 15),
        isMandatory: Boolean(d.isMandatory),
        isActive: Boolean(d.isActive),
        allowDownload: Boolean(d.allowDownload),
        isPrivateBucket: Boolean(d.isPrivateBucket),
        createdBy: String(d.createdBy || ''),
        createdAt: tsToIso(d.createdAt),
        updatedAt: tsToIso(d.updatedAt),
      }),
    );

    attach<TrainingEnrollment>(
      isMonitoringUser
        ? collection(db, 'training_enrollments')
        : query(collection(db, 'training_enrollments'), where('userId', '==', uid)),
      'training_enrollments',
      setEnrollments,
      (d, id) => ({
        id: String(d.id || id),
        trainingId: String(d.trainingId || ''),
        userId: String(d.userId || ''),
        userName: String(d.userName || ''),
        instansi: String(d.instansi || ''),
        npsn: typeof d.npsn === 'string' ? d.npsn : undefined,
        kabupatenKota: String(d.kabupatenKota || ''),
        jenjangPendidikan: typeof d.jenjangPendidikan === 'string' ? d.jenjangPendidikan : undefined,
        mataPelajaran: typeof d.mataPelajaran === 'string' ? d.mataPelajaran : undefined,
        status: (d.status as TrainingEnrollment['status']) || 'menunggu',
        startingLevel: Number(d.startingLevel || 0),
        currentLevel: Number(d.currentLevel || 0),
        unlockedLevels: Array.isArray(d.unlockedLevels) ? (d.unlockedLevels as number[]) : [],
        completedLevels: Array.isArray(d.completedLevels) ? (d.completedLevels as number[]) : [],
        assessmentScore: Number(d.assessmentScore ?? -1),
        overallProgress: Number(d.overallProgress || 0),
        certificateNumber: String(d.certificateNumber || ''),
        approvedBy: String(d.approvedBy || ''),
        enrolledAt: tsToIso(d.enrolledAt),
        updatedAt: tsToIso(d.updatedAt),
      }),
    );

    attach<MaterialProgress>(
      isMonitoringUser
        ? collection(db, 'material_progress')
        : query(collection(db, 'material_progress'), where('userId', '==', uid)),
      'material_progress',
      setMaterialProgress,
      (d, id) => ({
        id: String(d.id || id),
        trainingId: String(d.trainingId || ''),
        levelId: String(d.levelId || ''),
        levelNumber: Number(d.levelNumber || 1),
        materialId: String(d.materialId || ''),
        userId: String(d.userId || ''),
        status: (d.status as MaterialProgress['status']) || 'belum',
        createdAt: tsToIso(d.createdAt),
        updatedAt: tsToIso(d.updatedAt),
      }),
    );

    attach<QuestionBank>(
      isStaffUser
        ? collection(db, 'question_banks')
        : query(collection(db, 'question_banks'), where('isActive', '==', true)),
      'question_banks',
      setQuestionBanks,
      (d, id) => ({
        id: String(d.id || id),
        trainingId: String(d.trainingId || ''),
        levelNumber: Number(d.levelNumber || 0),
        ...(d.materialId ? { materialId: String(d.materialId) } : {}),
        kind: (d.kind as QuestionBank['kind']) || 'quiz',
        title: String(d.title || ''),
        description: String(d.description || ''),
        durationMinutes: Number(d.durationMinutes || 20),
        maxAttempts: Number(d.maxAttempts || 2),
        passingScore: Number(d.passingScore || 70),
        shuffleQuestions: Boolean(d.shuffleQuestions),
        showExplanation: Boolean(d.showExplanation),
        isActive: Boolean(d.isActive),
        questions: Array.isArray(d.questions) ? (d.questions as QuestionBank['questions']) : [],
        createdAt: tsToIso(d.createdAt),
        updatedAt: tsToIso(d.updatedAt),
      }),
    );

    if (isStaffUser) {
      attach<AnswerKeyDocument>(
        collection(db, 'answer_keys'),
        'answer_keys',
        setAnswerKeys,
        (d, id) => ({
          id: String(d.id || id),
          trainingId: String(d.trainingId || ''),
          kind: (d.kind as AnswerKeyDocument['kind']) || 'quiz',
          answers: Array.isArray(d.answers) ? (d.answers as AnswerKeyEntry[]) : [],
          createdAt: tsToIso(d.createdAt),
          updatedAt: tsToIso(d.updatedAt),
        }),
      );
    }

    attach<AttemptRecord>(
      isMonitoringUser
        ? collection(db, 'attempts')
        : query(collection(db, 'attempts'), where('userId', '==', uid)),
      'attempts',
      setAttempts,
      (d, id) => ({
        id: String(d.id || id),
        trainingId: String(d.trainingId || ''),
        bankId: String(d.bankId || ''),
        kind: (d.kind as AttemptRecord['kind']) || 'quiz',
        levelNumber: Number(d.levelNumber || 0),
        userId: String(d.userId || ''),
        userName: String(d.userName || ''),
        attemptNumber: Number(d.attemptNumber || 1),
        answers: (d.answers as UserAnswerMap) || {},
        autoScore: Number(d.autoScore || 0),
        manualScore: Number(d.manualScore || 0),
        finalScore: Number(d.finalScore || 0),
        percentage: Number(d.percentage || 0),
        passed: Boolean(d.passed),
        assignedLevel: Number(d.assignedLevel || 0),
        gradingStatus: (d.gradingStatus as AttemptRecord['gradingStatus']) || 'selesai',
        feedback: String(d.feedback || ''),
        gradedBy: String(d.gradedBy || ''),
        createdAt: tsToIso(d.createdAt),
        updatedAt: tsToIso(d.updatedAt),
      }),
    );

    attach<CertificateRecord>(
      isMonitoringUser
        ? collection(db, 'certificates')
        : query(collection(db, 'certificates'), where('userId', '==', uid)),
      'certificates',
      setCertificates,
      (d, id) => ({
        certificateNumber: String(d.certificateNumber || id),
        trainingId: String(d.trainingId || ''),
        trainingName: String(d.trainingName || ''),
        organizer: String(d.organizer || ''),
        userId: String(d.userId || ''),
        participantName: String(d.participantName || ''),
        completedLevel: Number(d.completedLevel || 4),
        issuedDate: String(d.issuedDate || ''),
        signerName: String(d.signerName || ''),
        signerTitle: String(d.signerTitle || ''),
        status: (d.status as 'valid' | 'dicabut') || 'valid',
        createdAt: tsToIso(d.createdAt),
      }),
    );

    attach<AnnouncementRecord>(
      isMonitoringUser
        ? collection(db, 'announcements')
        : query(collection(db, 'announcements'), where('isPublished', '==', true)),
      'announcements',
      setAnnouncements,
      (d, id) => ({
        id: String(d.id || id),
        trainingId: String(d.trainingId || ''),
        title: String(d.title || ''),
        body: String(d.body || ''),
        authorUid: String(d.authorUid || ''),
        authorName: String(d.authorName || ''),
        isPublished: Boolean(d.isPublished),
        createdAt: tsToIso(d.createdAt),
        updatedAt: tsToIso(d.updatedAt),
      }),
    );

    attach<ActivityLogRecord>(
      isMonitoringUser
        ? collection(db, 'activity_logs')
        : query(collection(db, 'activity_logs'), where('actorUid', '==', uid)),
      'activity_logs',
      setActivityLogs,
      (d, id) => ({
        id: String(d.id || id),
        trainingId: String(d.trainingId || ''),
        actorUid: String(d.actorUid || ''),
        actorName: String(d.actorName || ''),
        actorRole: String(d.actorRole || ''),
        action: String(d.action || ''),
        targetType: String(d.targetType || ''),
        targetId: String(d.targetId || ''),
        details: String(d.details || ''),
        overrideReason: String(d.overrideReason || ''),
        createdAt: tsToIso(d.createdAt),
      }),
    );

    attach<TrainingSchedule>(
      isBootstrappedAdmin
        ? collection(db, 'training_schedules')
        : query(collection(db, 'training_schedules'), where('levelNumber', '>=', 0)),
      'training_schedules',
      setSchedules,
      (d, id) => ({
        id: String(d.id || id),
        trainingId: String(d.trainingId || ''),
        levelNumber: Number(d.levelNumber || 0),
        title: String(d.title || ''),
        sessionDate: String(d.sessionDate || ''),
        startTime: String(d.startTime || ''),
        endTime: String(d.endTime || ''),
        facilitatorName: String(d.facilitatorName || ''),
        mode: (d.mode as TrainingSchedule['mode']) || 'daring',
        locationOrUrl: String(d.locationOrUrl || ''),
        notes: String(d.notes || ''),
        createdAt: tsToIso(d.createdAt),
        updatedAt: tsToIso(d.updatedAt),
      }),
    );

    attach<FacilitatorNote>(
      isBootstrappedAdmin
        ? collection(db, 'facilitator_notes')
        : query(collection(db, 'facilitator_notes'), where('participantUid', 'in', [uid, 'all'])),
      'facilitator_notes',
      setFacilitatorNotes,
      (d, id) => ({
        id: String(d.id || id),
        trainingId: String(d.trainingId || ''),
        levelNumber: Number(d.levelNumber || 1),
        participantUid: String(d.participantUid || 'all'),
        participantName: String(d.participantName || ''),
        authorUid: String(d.authorUid || ''),
        authorName: String(d.authorName || ''),
        content: String(d.content || ''),
        createdAt: tsToIso(d.createdAt),
      }),
    );

    attach<TaskSubmission>(
      isMonitoringUser
        ? collection(db, 'task_submissions')
        : query(collection(db, 'task_submissions'), where('userId', '==', uid)),
      'task_submissions',
      setTaskSubmissions,
      (d, id) => ({
        id: String(d.id || id),
        trainingId: String(d.trainingId || ''),
        levelNumber: Number(d.levelNumber || 1) as 1 | 2 | 3 | 4,
        userId: String(d.userId || ''),
        userName: String(d.userName || ''),
        title: String(d.title || ''),
        description: String(d.description || ''),
        productUrl: String(d.productUrl || ''),
        productFileName: String(d.productFileName || ''),
        docMediaUrl: String(d.docMediaUrl || ''),
        docMediaName: String(d.docMediaName || ''),
        status: (d.status as TaskSubmission['status']) || 'menunggu_penilaian',
        rubricScores: Array.isArray(d.rubricScores) ? (d.rubricScores as RubricAspectScore[]) : [],
        weightedScore: Number(d.weightedScore || 0),
        facilitatorFeedback: String(d.facilitatorFeedback || ''),
        gradedBy: String(d.gradedBy || ''),
        gradedByName: String(d.gradedByName || ''),
        createdAt: tsToIso(d.createdAt),
        updatedAt: tsToIso(d.updatedAt),
      }),
    );

    attach<LevelReflection>(
      isMonitoringUser
        ? collection(db, 'level_reflections')
        : query(collection(db, 'level_reflections'), where('userId', '==', uid)),
      'level_reflections',
      setLevelReflections,
      (d, id) => ({
        id: String(d.id || id),
        trainingId: String(d.trainingId || ''),
        levelNumber: Number(d.levelNumber || 1) as 1 | 2 | 3 | 4,
        userId: String(d.userId || ''),
        userName: String(d.userName || ''),
        learningExperience: String(d.learningExperience || ''),
        challenges: String(d.challenges || ''),
        competenciesGained: String(d.competenciesGained || ''),
        schoolImplementationPlan: String(d.schoolImplementationPlan || ''),
        createdAt: tsToIso(d.createdAt),
        updatedAt: tsToIso(d.updatedAt),
      }),
    );

    const unsubSettings = onSnapshot(
      doc(db, 'institution_settings', 'default'),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setInstitutionSettings({
            id: 'default',
            appName: String(d.appName || initialSeed.institutionSettings.appName),
            tagline: String(d.tagline || initialSeed.institutionSettings.tagline),
            institutionName: String(
              d.institutionName || initialSeed.institutionSettings.institutionName,
            ),
            address: String(d.address || ''),
            website: String(d.website || ''),
            supportEmail: String(d.supportEmail || ''),
            certificatePrefix: String(d.certificatePrefix || 'PMD'),
            updatedAt: tsToIso(d.updatedAt),
          });
        }
      },
      () => {
        // Fallback aman ke konfigurasi default
      },
    );
    unsubs.push(unsubSettings);

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [authReady, firebaseUser, isDemoMode, isBootstrappedAdmin, isAdminUser, isStaffUser, isMonitoringUser]);

  // Auto-seed Firestore sekali jika Super Admin masuk ke database kosong
  useEffect(() => {
    if (!isLiveDatabase || !isBootstrappedAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'training_programs'));
        if (!cancelled && snap.empty) {
          await seedCloudFirestore();
        }
      } catch (err) {
        console.error('Cek inisialisasi data Firestore:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLiveDatabase, isBootstrappedAdmin]);

  // Resolusi pengguna aktif (Live Firebase Auth atau Simulasi/Demo)
  const currentUser = useMemo<UserProfile | null>(() => {
    if (activeDemoUid) {
      return profiles.find((p) => p.uid === activeDemoUid) || null;
    }
    if (firebaseUser) {
      const existing = profiles.find((p) => p.uid === firebaseUser.uid);
      if (existing) return existing;
      return {
        uid: firebaseUser.uid,
        fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Pengguna LMS',
        email: firebaseUser.email || '',
        phone: '',
        instansi: isBootstrappedAdmin ? 'Pusat Pengembangan Kompetensi Digital' : 'Peserta Pelatihan',
        kabupatenKota: 'Jakarta Pusat',
        jabatan: isBootstrappedAdmin ? 'Super Admin' : 'Peserta',
        role: isBootstrappedAdmin ? 'super_admin' : 'peserta',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return null;
  }, [activeDemoUid, firebaseUser, profiles, isBootstrappedAdmin]);

  const effectiveRole = currentUser?.role || null;

  const logActivity = async (params: {
    trainingId?: string;
    action: string;
    targetType: string;
    targetId: string;
    details: string;
    overrideReason?: string;
  }) => {
    const id = makeId('log');
    const actor = currentUser;
    const record: ActivityLogRecord = {
      id,
      trainingId: params.trainingId || '',
      actorUid: actor?.uid || firebaseUser?.uid || 'sistem',
      actorName: actor?.fullName || 'Sistem LMS',
      actorRole: actor?.role || 'super_admin',
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      details: params.details.slice(0, 1000),
      overrideReason: (params.overrideReason || '').slice(0, 500),
      createdAt: new Date().toISOString(),
    };
    if (isLiveDatabase && !activeDemoUid) {
      try {
        await setDoc(doc(db, 'activity_logs', id), {
          ...record,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Gagal mencatat log aktivitas ke Firestore, fallback ke state lokal:', err);
        setActivityLogs((prev) => [record, ...prev]);
      }
    } else {
      setActivityLogs((prev) => [record, ...prev]);
    }
  };

  // Seed Firestore lengkap (hanya bootstrapped admin)
  const seedCloudFirestore = async (): Promise<ActionResult> => {
    if (!isLiveDatabase || !isBootstrappedAdmin) {
      return { ok: false, message: 'Inisialisasi database cloud hanya tersedia untuk Super Admin terautentikasi.' };
    }
    setSeedingBusy(true);
    try {
      const seed = buildSeedDataset();
      // Batch 1: training_programs & learning_levels & profiles
      const b1 = writeBatch(db);
      for (const trn of seed.trainings) {
        b1.set(doc(db, 'training_programs', trn.id), {
          ...trn,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const p of seed.profiles) {
        if (p.uid === 'super_admin_01') continue; // akun super admin nyata menggunakan firebaseUser.uid
        b1.set(doc(db, 'profiles', p.uid), {
          ...p,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        b1.set(doc(db, 'public_profiles', p.uid), {
          uid: p.uid,
          displayName: p.fullName,
          role: p.role,
          instansi: p.instansi,
          kabupatenKota: p.kabupatenKota,
          isActive: p.isActive,
          isPublic: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await b1.commit();

      // Batch 2: levels, materials, question_banks, answer_keys
      const b2 = writeBatch(db);
      for (const lv of seed.levels) {
        b2.set(doc(db, 'learning_levels', lv.id), {
          ...lv,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const mat of seed.materials) {
        b2.set(doc(db, 'learning_materials', mat.id), {
          ...mat,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const qb of seed.questionBanks) {
        b2.set(doc(db, 'question_banks', qb.id), {
          ...qb,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const ak of seed.answerKeys) {
        b2.set(doc(db, 'answer_keys', ak.id), {
          ...ak,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await b2.commit();

      // Batch 3: enrollments, material_progress, attempts, certificates, announcements, logs
      const b3 = writeBatch(db);
      for (const enr of seed.enrollments) {
        b3.set(doc(db, 'training_enrollments', enr.id), {
          ...enr,
          enrolledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const mp of seed.materialProgress) {
        b3.set(doc(db, 'material_progress', mp.id), {
          ...mp,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const att of seed.attempts) {
        b3.set(doc(db, 'attempts', att.id), {
          ...att,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const cert of seed.certificates) {
        b3.set(doc(db, 'certificates', cert.certificateNumber), {
          ...cert,
          createdAt: serverTimestamp(),
        });
      }
      for (const ann of seed.announcements) {
        b3.set(doc(db, 'announcements', ann.id), {
          ...ann,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const lg of seed.activityLogs) {
        b3.set(doc(db, 'activity_logs', lg.id), {
          ...lg,
          createdAt: serverTimestamp(),
        });
      }
      for (const sch of seed.schedules) {
        b3.set(doc(db, 'training_schedules', sch.id), {
          ...sch,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const nt of seed.facilitatorNotes) {
        b3.set(doc(db, 'facilitator_notes', nt.id), {
          ...nt,
          createdAt: serverTimestamp(),
        });
      }
      for (const sub of seed.taskSubmissions) {
        b3.set(doc(db, 'task_submissions', sub.id), {
          ...sub,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const ref of seed.levelReflections) {
        b3.set(doc(db, 'level_reflections', ref.id), {
          ...ref,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      b3.set(doc(db, 'institution_settings', 'default'), {
        ...seed.institutionSettings,
        updatedAt: serverTimestamp(),
      });
      await b3.commit();

      showToast('success', 'Data awal LMS SAMR-PID (2 kegiatan, 8 level, tugas praktik, refleksi, & 29 akun) berhasil disimpan ke Firestore.');
      return { ok: true, message: 'Seed Firestore berhasil.' };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'seed_batch');
    } finally {
      setSeedingBusy(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setIsDemoMode(false);
      setActiveDemoUid(null);
      showToast('success', 'Berhasil masuk menggunakan akun Google terverifikasi.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk dengan Google.';
      showToast('error', `Autentikasi gagal: ${msg}`);
    }
  };

  const loginWithEmailDemo: LmsContextValue['loginWithEmailDemo'] = (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      const msg = 'Email dan kata sandi wajib diisi.';
      showToast('error', msg);
      return { ok: false, message: msg };
    }
    if (password.trim().length < 6) {
      const msg = 'Kata sandi minimal 6 karakter (akun demo: pamandai2026).';
      showToast('error', msg);
      return { ok: false, message: msg };
    }
    const found = profiles.find((p) => p.email.toLowerCase() === cleanEmail);
    if (!found) {
      const msg = 'Akun tidak ditemukan. Periksa alamat email atau gunakan daftar akun pengujian di bawah.';
      showToast('error', msg);
      return { ok: false, message: msg };
    }
    if (!found.isActive) {
      const msg = 'Akun Anda sedang dinonaktifkan oleh Administrator.';
      showToast('error', msg);
      return { ok: false, message: msg };
    }
    setIsDemoMode(true);
    setActiveDemoUid(found.uid);
    showToast('success', `Selamat datang, ${found.fullName}. Peran otomatis terdeteksi: ${found.role}.`);
    return { ok: true, message: 'Login berhasil.' };
  };

  const enterDemoAccount = (uid: string) => {
    setIsDemoMode(true);
    setActiveDemoUid(uid);
    const found = profiles.find((p) => p.uid === uid);
    if (found) {
      showToast('info', `Masuk mode pengujian lokal sebagai ${found.fullName}.`);
    }
  };

  const switchSimulatedUser = (uid: string | null) => {
    setActiveDemoUid(uid);
    if (!uid) {
      showToast('info', 'Kembali ke akun autentikasi utama Anda.');
    } else {
      const found = profiles.find((p) => p.uid === uid);
      if (found) showToast('info', `Beralih pratinjau peran ke ${found.fullName} (${found.role}).`);
    }
  };

  const logout = async () => {
    if (firebaseUser) {
      await signOut(auth);
    }
    setIsDemoMode(false);
    setActiveDemoUid(null);
    showToast('info', 'Anda telah keluar dari sesi LMS.');
  };

  // Registrasi melalui tautan pendaftaran Peserta, Fasilitator, atau Panitia (TIDAK pernah memberi hak super_admin)
  const registerParticipantSelf: LmsContextValue['registerParticipantSelf'] = async (payload) => {
    const cleanEmail = payload.email.trim().toLowerCase();
    if (profiles.some((p) => p.email.toLowerCase() === cleanEmail)) {
      return { ok: false, message: 'Email sudah terdaftar di sistem.' };
    }
    const targetTraining = trainings.find((t) => t.id === payload.trainingId);
    if (!targetTraining) {
      return { ok: false, message: 'Kegiatan pelatihan yang dipilih tidak ditemukan.' };
    }

    const assignedRole: 'peserta' | 'fasilitator' | 'admin_kegiatan' =
      payload.role === 'fasilitator' || payload.role === 'admin_kegiatan'
        ? payload.role
        : 'peserta';
    const uidPrefix =
      assignedRole === 'fasilitator'
        ? 'fasilitator'
        : assignedRole === 'admin_kegiatan'
          ? 'panitia'
          : 'peserta';

    const cleanNpsn = (payload.npsn || '').replace(/\D/g, '').slice(0, 16);
    const newUid = makeId(uidPrefix);
    const nowIso = new Date().toISOString();
    const newProfile: UserProfile = {
      uid: newUid,
      fullName: payload.fullName.trim(),
      email: cleanEmail,
      phone: payload.phone.trim(),
      instansi: payload.instansi.trim() || 'Sekolah Mitra',
      ...(cleanNpsn ? { npsn: cleanNpsn } : {}),
      kabupatenKota: payload.kabupatenKota.trim() || 'Indonesia',
      jabatan:
        payload.jabatan.trim() ||
        (assignedRole === 'fasilitator'
          ? 'Fasilitator Pelatihan'
          : assignedRole === 'admin_kegiatan'
            ? 'Panitia Penyelenggara'
            : 'Guru'),
      jenjangPendidikan: (payload.jenjangPendidikan || 'SMA').trim(),
      mataPelajaran: (payload.mataPelajaran || 'Umum').trim(),
      statusPeserta:
        (payload.statusPeserta ||
          (assignedRole === 'fasilitator'
            ? 'Widyaiswara / Fasilitator'
            : assignedRole === 'admin_kegiatan'
              ? 'Panitia Kegiatan'
              : 'Guru')).trim(),
      role: assignedRole,
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const usesSamr = isSamrTraining(targetTraining);
    const enrId = makeId('enr');
    const initialStatus = targetTraining.requireApproval ? 'menunggu' : 'disetujui';
    const newEnrollment: TrainingEnrollment | null =
      assignedRole === 'peserta'
        ? {
            id: enrId,
            trainingId: targetTraining.id,
            userId: newUid,
            userName: newProfile.fullName,
            instansi: newProfile.instansi,
            ...(cleanNpsn ? { npsn: cleanNpsn } : {}),
            kabupatenKota: newProfile.kabupatenKota,
            jenjangPendidikan: newProfile.jenjangPendidikan,
            mataPelajaran: newProfile.mataPelajaran,
            status: usesSamr ? initialStatus : initialStatus === 'disetujui' ? 'aktif' : 'menunggu',
            startingLevel: usesSamr ? 0 : 1,
            currentLevel: usesSamr ? 0 : 1,
            unlockedLevels: usesSamr ? [] : [1, 2, 3, 4],
            completedLevels: [],
            assessmentScore: -1,
            overallProgress: 0,
            certificateNumber: '',
            approvedBy: initialStatus === 'disetujui' ? 'auto_system' : '',
            enrolledAt: nowIso,
            updatedAt: nowIso,
          }
        : null;

    if (isLiveDatabase && isBootstrappedAdmin) {
      try {
        await setDoc(doc(db, 'profiles', newUid), {
          ...newProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'public_profiles', newUid), {
          uid: newUid,
          displayName: newProfile.fullName,
          role: assignedRole,
          instansi: newProfile.instansi,
          kabupatenKota: newProfile.kabupatenKota,
          isActive: true,
          isPublic: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        if (newEnrollment) {
          await setDoc(doc(db, 'training_enrollments', enrId), {
            ...newEnrollment,
            enrolledAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else if (assignedRole === 'fasilitator') {
          const nextFac = Array.from(new Set([...targetTraining.facilitatorUids, newUid])).slice(0, 20);
          await updateDoc(doc(db, 'training_programs', targetTraining.id), {
            facilitatorUids: nextFac,
            updatedAt: serverTimestamp(),
          });
        } else if (assignedRole === 'admin_kegiatan') {
          const nextAdm = Array.from(new Set([...targetTraining.adminUids, newUid])).slice(0, 10);
          await updateDoc(doc(db, 'training_programs', targetTraining.id), {
            adminUids: nextAdm,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `profiles/${newUid}`);
      }
    } else {
      setProfiles((prev) => [newProfile, ...prev]);
      if (newEnrollment) {
        setEnrollments((prev) => [newEnrollment, ...prev]);
      } else if (assignedRole === 'fasilitator') {
        setTrainings((prev) =>
          prev.map((t) =>
            t.id === targetTraining.id
              ? { ...t, facilitatorUids: Array.from(new Set([...t.facilitatorUids, newUid])) }
              : t,
          ),
        );
      } else if (assignedRole === 'admin_kegiatan') {
        setTrainings((prev) =>
          prev.map((t) =>
            t.id === targetTraining.id
              ? { ...t, adminUids: Array.from(new Set([...t.adminUids, newUid])) }
              : t,
          ),
        );
      }
    }

    await logActivity({
      trainingId: targetTraining.id,
      action:
        assignedRole === 'fasilitator'
          ? 'REGISTRASI_FASILITATOR'
          : assignedRole === 'admin_kegiatan'
            ? 'REGISTRASI_PANITIA'
            : 'REGISTRASI_MANDIRI',
      targetType: newEnrollment ? 'enrollment' : 'profile',
      targetId: newEnrollment ? enrId : newUid,
      details: `${newProfile.fullName} mendaftar sebagai ${assignedRole} pada ${targetTraining.code}.`,
    });

    const msg =
      assignedRole === 'fasilitator'
        ? `Pendaftaran Fasilitator berhasil dan terhubung ke kegiatan ${targetTraining.code}.`
        : assignedRole === 'admin_kegiatan'
          ? `Pendaftaran Panitia (Admin Kegiatan) berhasil dan terhubung ke kegiatan ${targetTraining.code}.`
          : initialStatus === 'menunggu'
            ? 'Pendaftaran peserta berhasil dikirim dan berstatus Menunggu Persetujuan Panitia.'
            : usesSamr
              ? 'Pendaftaran peserta berhasil! Silakan kerjakan Asesmen Awal SAMR.'
              : 'Pendaftaran peserta berhasil! Anda dapat langsung masuk ke ruang pembelajaran kegiatan.';
    showToast('success', msg);
    return { ok: true, message: msg, data: { uid: newUid, role: assignedRole, enrollmentId: newEnrollment?.id || '' } };
  };

  const updateOwnProfile: LmsContextValue['updateOwnProfile'] = async (payload) => {
    if (!currentUser) return { ok: false, message: 'Sesi pengguna tidak ditemukan.' };
    if (isLiveDatabase && !activeDemoUid) {
      try {
        await updateDoc(doc(db, 'profiles', currentUser.uid), {
          fullName: payload.fullName.trim().slice(0, 120),
          phone: payload.phone.trim().slice(0, 32),
          instansi: payload.instansi.trim().slice(0, 160),
          ...(payload.npsn !== undefined
            ? { npsn: payload.npsn.replace(/\D/g, '').slice(0, 16) }
            : {}),
          kabupatenKota: payload.kabupatenKota.trim().slice(0, 120),
          jabatan: payload.jabatan.trim().slice(0, 120),
          ...(payload.jenjangPendidikan !== undefined
            ? { jenjangPendidikan: payload.jenjangPendidikan.trim().slice(0, 40) }
            : {}),
          ...(payload.mataPelajaran !== undefined
            ? { mataPelajaran: payload.mataPelajaran.trim().slice(0, 120) }
            : {}),
          ...(payload.statusPeserta !== undefined
            ? { statusPeserta: payload.statusPeserta.trim().slice(0, 60) }
            : {}),
          updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'public_profiles', currentUser.uid), {
          displayName: payload.fullName.trim().slice(0, 120),
          instansi: payload.instansi.trim().slice(0, 160),
          kabupatenKota: payload.kabupatenKota.trim().slice(0, 120),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `profiles/${currentUser.uid}`);
      }
    } else {
      setProfiles((prev) =>
        prev.map((p) =>
          p.uid === currentUser.uid
            ? { ...p, ...payload, updatedAt: new Date().toISOString() }
            : p,
        ),
      );
    }
    showToast('success', 'Profil berhasil diperbarui.');
    return { ok: true, message: 'Profil diperbarui.' };
  };

  const createAccountByAdmin: LmsContextValue['createAccountByAdmin'] = async (payload) => {
    if (effectiveRole !== 'super_admin' && effectiveRole !== 'admin_kegiatan') {
      return { ok: false, message: 'Anda tidak memiliki kewenangan menambah akun.' };
    }
    if (effectiveRole === 'admin_kegiatan' && payload.role === 'super_admin') {
      return { ok: false, message: 'Admin Kegiatan tidak dapat membuat akun Super Admin.' };
    }
    const cleanEmail = payload.email.trim().toLowerCase();
    if (profiles.some((p) => p.email.toLowerCase() === cleanEmail)) {
      return { ok: false, message: 'Email sudah terdaftar.' };
    }
    const uid = makeId(payload.role);
    const nowIso = new Date().toISOString();
    const record: UserProfile = {
      uid,
      fullName: payload.fullName.trim(),
      email: cleanEmail,
      phone: payload.phone.trim(),
      instansi: payload.instansi.trim(),
      kabupatenKota: payload.kabupatenKota.trim(),
      jabatan: payload.jabatan.trim(),
      role: payload.role,
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (isLiveDatabase && isBootstrappedAdmin) {
      try {
        await setDoc(doc(db, 'profiles', uid), {
          ...record,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'public_profiles', uid), {
          uid,
          displayName: record.fullName,
          role: record.role,
          instansi: record.instansi,
          kabupatenKota: record.kabupatenKota,
          isActive: true,
          isPublic: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `profiles/${uid}`);
      }
    } else {
      setProfiles((prev) => [record, ...prev]);
    }
    await logActivity({
      action: 'BUAT_AKUN',
      targetType: 'profile',
      targetId: uid,
      details: `Membuat akun ${record.fullName} dengan peran ${record.role}.`,
    });
    showToast('success', `Akun ${record.fullName} berhasil ditambahkan.`);
    return { ok: true, message: 'Akun berhasil dibuat.' };
  };

  const toggleAccountActive: LmsContextValue['toggleAccountActive'] = async (uid, isActive) => {
    if (effectiveRole !== 'super_admin' && effectiveRole !== 'admin_kegiatan') {
      return { ok: false, message: 'Tidak berwenang mengubah status akun.' };
    }
    if (isLiveDatabase && isBootstrappedAdmin) {
      try {
        await updateDoc(doc(db, 'profiles', uid), { isActive, updatedAt: serverTimestamp() });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `profiles/${uid}`);
      }
    } else {
      setProfiles((prev) => prev.map((p) => (p.uid === uid ? { ...p, isActive } : p)));
    }
    await logActivity({
      action: isActive ? 'AKTIVASI_AKUN' : 'NONAKTIF_AKUN',
      targetType: 'profile',
      targetId: uid,
      details: `Status akun diubah menjadi ${isActive ? 'Aktif' : 'Nonaktif'}.`,
    });
    showToast('success', `Status akun berhasil ${isActive ? 'diaktifkan' : 'dinonaktifkan'}.`);
    return { ok: true, message: 'Status akun diperbarui.' };
  };

  const updateAccountRole: LmsContextValue['updateAccountRole'] = async (uid, role) => {
    if (effectiveRole !== 'super_admin') {
      return { ok: false, message: 'Hanya Super Admin yang berwenang mengubah peran akun.' };
    }
    if (isLiveDatabase && isBootstrappedAdmin) {
      try {
        await updateDoc(doc(db, 'profiles', uid), { role, updatedAt: serverTimestamp() });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `profiles/${uid}`);
      }
    } else {
      setProfiles((prev) => prev.map((p) => (p.uid === uid ? { ...p, role } : p)));
    }
    await logActivity({
      action: 'UBAH_PERAN',
      targetType: 'profile',
      targetId: uid,
      details: `Peran akun diubah menjadi ${role}.`,
    });
    showToast('success', 'Peran pengguna diperbarui.');
    return { ok: true, message: 'Peran diperbarui.' };
  };

  const importParticipantsFromExcel: LmsContextValue['importParticipantsFromExcel'] = async (
    trainingId,
    rows,
  ) => {
    if (effectiveRole !== 'super_admin' && effectiveRole !== 'admin_kegiatan') {
      return { ok: false, message: 'Hanya Admin yang dapat mengimpor peserta.' };
    }
    const validRows = rows.filter((r) => r.valid);
    if (validRows.length === 0) {
      return { ok: false, message: 'Tidak ada baris valid untuk diproses.' };
    }
    const nowIso = new Date().toISOString();
    const newProfiles: UserProfile[] = [];
    const newEnrollments: TrainingEnrollment[] = [];

    for (const row of validRows) {
      const uid = makeId('imp_peserta');
      const enrId = makeId('enr_imp');
      newProfiles.push({
        uid,
        fullName: row.fullName,
        email: row.email,
        phone: row.phone,
        instansi: row.instansi,
        kabupatenKota: row.kabupatenKota,
        jabatan: row.jabatan,
        jenjangPendidikan: row.jenjangPendidikan || 'SMA',
        mataPelajaran: row.mataPelajaran || 'Umum',
        statusPeserta: 'Guru',
        role: 'peserta',
        isActive: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      newEnrollments.push({
        id: enrId,
        trainingId,
        userId: uid,
        userName: row.fullName,
        instansi: row.instansi,
        kabupatenKota: row.kabupatenKota,
        jenjangPendidikan: row.jenjangPendidikan || 'SMA',
        mataPelajaran: row.mataPelajaran || 'Umum',
        status: 'disetujui',
        startingLevel: 0,
        currentLevel: 0,
        unlockedLevels: [],
        completedLevels: [],
        assessmentScore: -1,
        overallProgress: 0,
        certificateNumber: '',
        approvedBy: currentUser?.uid || 'admin',
        enrolledAt: nowIso,
        updatedAt: nowIso,
      });
    }

    if (isLiveDatabase && isBootstrappedAdmin) {
      try {
        const batch = writeBatch(db);
        for (const p of newProfiles) {
          batch.set(doc(db, 'profiles', p.uid), {
            ...p,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          batch.set(doc(db, 'public_profiles', p.uid), {
            uid: p.uid,
            displayName: p.fullName,
            role: 'peserta',
            instansi: p.instansi,
            kabupatenKota: p.kabupatenKota,
            isActive: true,
            isPublic: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        for (const e of newEnrollments) {
          batch.set(doc(db, 'training_enrollments', e.id), {
            ...e,
            enrolledAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'excel_import_batch');
      }
    } else {
      setProfiles((prev) => [...newProfiles, ...prev]);
      setEnrollments((prev) => [...newEnrollments, ...prev]);
    }

    await logActivity({
      trainingId,
      action: 'IMPOR_EXCEL_PESERTA',
      targetType: 'training_program',
      targetId: trainingId,
      details: `Mengimpor ${validRows.length} peserta valid dari Excel (${rows.length - validRows.length} baris dilewati/gagal).`,
    });
    showToast('success', `${validRows.length} peserta berhasil diimpor dan langsung disetujui.`);
    return { ok: true, message: `${validRows.length} peserta berhasil diimpor.` };
  };

  // CRUD Kegiatan (otomatis membuat 4 level default + asesmen awal)
  const createTraining: LmsContextValue['createTraining'] = async (payload) => {
    if (effectiveRole !== 'super_admin' && effectiveRole !== 'admin_kegiatan') {
      return { ok: false, message: 'Tidak berwenang membuat kegiatan.' };
    }
    const cleanCode = payload.code.trim().slice(0, 40);
    const cleanName = payload.name.trim().slice(0, 200);
    const cleanOrganizer = payload.organizer.trim().slice(0, 160);
    if (cleanCode.length < 2) {
      const msg = 'Kode kegiatan wajib diisi minimal 2 karakter.';
      showToast('error', msg);
      return { ok: false, message: msg };
    }
    if (cleanName.length < 3) {
      const msg = 'Nama kegiatan wajib diisi minimal 3 karakter.';
      showToast('error', msg);
      return { ok: false, message: msg };
    }
    if (cleanOrganizer.length < 2) {
      const msg = 'Nama penyelenggara wajib diisi minimal 2 karakter.';
      showToast('error', msg);
      return { ok: false, message: msg };
    }
    const validation = validateScoreRanges(payload.scoreRanges);
    if (!validation.valid) {
      showToast('error', validation.error || 'Rentang skor tidak valid.');
      return { ok: false, message: validation.error || 'Rentang skor tidak valid.' };
    }
    const id = makeId('trn');
    const nowIso = new Date().toISOString();
    const safeQuota = Math.max(1, Math.min(10000, Math.round(Number(payload.quota) || 100)));
    const record: TrainingProgram = {
      ...payload,
      id,
      code: cleanCode,
      name: cleanName,
      description: (payload.description || '').trim().slice(0, 2000),
      organizer: cleanOrganizer,
      startDate: (payload.startDate || '').slice(0, 30),
      endDate: (payload.endDate || '').slice(0, 30),
      location: (payload.location || '').trim().slice(0, 160),
      quota: safeQuota,
      bannerUrl: (payload.bannerUrl || '').slice(0, 500),
      adminUids: (payload.adminUids || []).slice(0, 10),
      facilitatorUids: (payload.facilitatorUids || []).slice(0, 20),
      monitorUids: (payload.monitorUids || []).slice(0, 10),
      signerName: (payload.signerName || '').trim().slice(0, 120),
      signerTitle: (payload.signerTitle || '').trim().slice(0, 160),
      createdBy: currentUser?.uid || 'super_admin_01',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const usesSamr = isSamrTraining(record);
    record.usesSamrLevels = usesSamr;

    const samrSlugs: Array<{ n: 1 | 2 | 3 | 4; slug: LearningLevel['slug']; label: string }> = [
      { n: 1, slug: 'dasar', label: 'Substitution (Substitusi)' },
      { n: 2, slug: 'berkembang', label: 'Augmentation (Augmentasi)' },
      { n: 3, slug: 'lanjut', label: 'Modification (Modifikasi)' },
      { n: 4, slug: 'mahir', label: 'Redefinition (Redefinisi)' },
    ];
    const standardSlugs: Array<{ n: 1 | 2 | 3 | 4; slug: LearningLevel['slug']; label: string }> = [
      { n: 1, slug: 'dasar', label: 'Eksplorasi Konsep Dasar' },
      { n: 2, slug: 'berkembang', label: 'Pendalaman Materi & Praktik' },
      { n: 3, slug: 'lanjut', label: 'Analisis & Kolaborasi' },
      { n: 4, slug: 'mahir', label: 'Implementasi & Evaluasi' },
    ];
    const activeSlugs = usesSamr ? samrSlugs : standardSlugs;

    const newLevels: LearningLevel[] = activeSlugs.map((s) => ({
      id: `lvl_${id}_${s.n}`,
      trainingId: id,
      levelNumber: s.n,
      title: (usesSamr
        ? `Level ${s.n}: ${s.label} — ${cleanCode}`
        : `Modul ${s.n}: ${s.label} — ${cleanCode}`
      ).slice(0, 160),
      slug: s.slug,
      description: (usesSamr
        ? `Kompetensi tahap ${s.label} pada kegiatan ${cleanName}.`
        : `Bagian pembelajaran ${s.label} pada kegiatan ${cleanName}.`
      ).slice(0, 1000),
      learningObjectives: (usesSamr
        ? `Menguasai konsep dan praktik PID Level ${s.n} (${s.label}).`
        : `Memahami dan menerapkan materi ${s.label} pada kegiatan ${cleanName}.`
      ).slice(0, 1500),
      learningOutcomes: (usesSamr
        ? `Menyelesaikan tugas praktik PID, kuis, evaluasi, dan refleksi Level ${s.n}.`
        : `Menyelesaikan eksplorasi materi, tugas praktik, kuis, evaluasi, dan refleksi Modul ${s.n}.`
      ).slice(0, 1500),
      facilitatorUid: (record.facilitatorUids[0] || '').slice(0, 128),
      facilitatorName: (
        profiles.find((p) => p.uid === record.facilitatorUids[0])?.fullName || 'Tim Fasilitator'
      ).slice(0, 120),
      durationHours: 6 + s.n * 2,
      minQuizScore: 75,
      minEvaluationScore: 75,
      demoGuide: usesSamr
        ? `1. Siapkan perangkat Papan Interaktif Digital (PID) dan bahan ajar Level ${s.n}.\n2. Praktikkan fitur sesuai indikator tahap ${s.label}.\n3. Dokumentasikan hasil praktik di kelas.`
        : `1. Pelajari bahan bacaan utama kegiatan ${cleanName}.\n2. Identifikasi konsep kunci pada tahap ${s.label}.\n3. Catat rencana penerapan nyata di satuan pendidikan.`,
      demoVideoUrl: '',
      taskInstructions: usesSamr
        ? `Unggah produk praktik pembelajaran PID untuk Level ${s.n} (${s.label}) beserta dokumentasi implementasi.`
        : `Unggah produk praktik atau rancangan implementasi sesuai materi "${cleanName}" pada tahap ${s.label}.`,
      taskSteps: usesSamr
        ? '1. Rancang aktivitas pembelajaran.\n2. Laksanakan praktik di PID.\n3. Unggah tautan produk & dokumentasi.'
        : '1. Pelajari materi kegiatan.\n2. Susun rancangan atau bukti praktik sesuai topik.\n3. Unggah tautan karya & dokumentasi.',
      taskSampleOutput: usesSamr
        ? `Portofolio Praktik PID Level ${s.n} (${s.label}).`
        : `Karya Praktik ${cleanName} — Modul ${s.n}.`,
      requirePracticeValidation: true,
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    }));

    // Buat Bank Soal Asesmen Awal default yang disesuaikan dengan kegiatan baru (non-SAMR bebas SAMR/PID!)
    const assessBankId = `qb_assess_${id}`;
    const topicSummary = record.description || cleanName;
    const defaultAssessQuestions: QuestionItem[] = usesSamr
      ? [
          {
            id: `${assessBankId}_q1`,
            type: 'pilihan_ganda',
            prompt:
              'Pada model SAMR, penggunaan Papan Interaktif Digital sekadar menggantikan papan tulis konvensional tanpa fitur tambahan termasuk tahap:',
            weight: 25,
            options: [
              { id: `${assessBankId}_q1_a`, text: 'Substitution (Substitusi)' },
              { id: `${assessBankId}_q1_b`, text: 'Augmentation (Augmentasi)' },
              { id: `${assessBankId}_q1_c`, text: 'Modification (Modifikasi)' },
              { id: `${assessBankId}_q1_d`, text: 'Redefinition (Redefinisi)' },
            ],
          },
          {
            id: `${assessBankId}_q2`,
            type: 'pilihan_ganda',
            prompt:
              'Menambahkan kuis cepat, anotasi berwarna, dan umpan balik langsung pada PID sehingga proses belajar lebih fungsional mencerminkan tahap:',
            weight: 25,
            options: [
              { id: `${assessBankId}_q2_a`, text: 'Substitution (Substitusi)' },
              { id: `${assessBankId}_q2_b`, text: 'Augmentation (Augmentasi)' },
              { id: `${assessBankId}_q2_c`, text: 'Modification (Modifikasi)' },
              { id: `${assessBankId}_q2_d`, text: 'Redefinition (Redefinisi)' },
            ],
          },
          {
            id: `${assessBankId}_q3`,
            type: 'pilihan_ganda',
            prompt:
              'Merancang ulang aktivitas kelompok secara signifikan menggunakan kanvas kolaboratif PID merupakan contoh tahap:',
            weight: 25,
            options: [
              { id: `${assessBankId}_q3_a`, text: 'Substitution (Substitusi)' },
              { id: `${assessBankId}_q3_b`, text: 'Augmentation (Augmentasi)' },
              { id: `${assessBankId}_q3_c`, text: 'Modification (Modifikasi)' },
              { id: `${assessBankId}_q3_d`, text: 'Redefinition (Redefinisi)' },
            ],
          },
          {
            id: `${assessBankId}_q4`,
            type: 'pilihan_ganda',
            prompt:
              'Menciptakan pengalaman belajar lintas sekolah/narasumber yang sebelumnya mustahil dilakukan tanpa teknologi digital termasuk tahap:',
            weight: 25,
            options: [
              { id: `${assessBankId}_q4_a`, text: 'Substitution (Substitusi)' },
              { id: `${assessBankId}_q4_b`, text: 'Augmentation (Augmentasi)' },
              { id: `${assessBankId}_q4_c`, text: 'Modification (Modifikasi)' },
              { id: `${assessBankId}_q4_d`, text: 'Redefinition (Redefinisi)' },
            ],
          },
        ]
      : [
          {
            id: `${assessBankId}_q1`,
            type: 'pilihan_ganda',
            prompt: `Apa tujuan utama pelaksanaan asesmen awal sebelum mempelajari materi pada kegiatan "${cleanName}"?`,
            weight: 25,
            options: [
              {
                id: `${assessBankId}_q1_a`,
                text: 'Memetakan pemahaman dan kebutuhan belajar awal peserta terhadap materi kegiatan',
              },
              {
                id: `${assessBankId}_q1_b`,
                text: 'Menentukan nilai akhir kelulusan sebelum materi dipelajari',
              },
              {
                id: `${assessBankId}_q1_c`,
                text: 'Menggantikan seluruh tugas praktik dan evaluasi akhir',
              },
              {
                id: `${assessBankId}_q1_d`,
                text: 'Membatasi peserta agar tidak berdiskusi di forum',
              },
            ],
          },
          {
            id: `${assessBankId}_q2`,
            type: 'pilihan_ganda',
            prompt: `Berdasarkan ruang lingkup kegiatan "${cleanName}", langkah paling tepat saat mempelajari modul secara mandiri adalah:`,
            weight: 25,
            options: [
              {
                id: `${assessBankId}_q2_a`,
                text: 'Menghubungkan konsep materi dengan tantangan nyata pembelajaran di satuan pendidikan',
              },
              {
                id: `${assessBankId}_q2_b`,
                text: 'Melewati seluruh materi bacaan dan langsung mencetak sertifikat',
              },
              {
                id: `${assessBankId}_q2_c`,
                text: 'Menghafal definisi tanpa merencanakan penerapan di kelas',
              },
              {
                id: `${assessBankId}_q2_d`,
                text: 'Menghindari umpan balik dari rekan peserta dan fasilitator',
              },
            ],
          },
          {
            id: `${assessBankId}_q3`,
            type: 'pilihan_ganda',
            prompt: `Dalam konteks "${topicSummary.slice(0, 120)}", bagaimana peran forum diskusi dan refleksi bagi peserta pelatihan?`,
            weight: 25,
            options: [
              {
                id: `${assessBankId}_q3_a`,
                text: 'Berbagi praktik baik, menganalisis kendala, dan memperkuat rencana tindak lanjut',
              },
              {
                id: `${assessBankId}_q3_b`,
                text: 'Sekadar mengisi daftar hadir tanpa meninjau masukan rekan guru',
              },
              {
                id: `${assessBankId}_q3_c`,
                text: 'Menggantikan seluruh kebutuhan bahan ajar utama',
              },
              {
                id: `${assessBankId}_q3_d`,
                text: 'Hanya digunakan oleh panitia untuk arsip administrasi',
              },
            ],
          },
          {
            id: `${assessBankId}_q4`,
            type: 'pilihan_ganda',
            prompt: `Indikator utama keberhasilan penerapan hasil pelatihan "${cleanName}" di satuan pendidikan adalah:`,
            weight: 25,
            options: [
              {
                id: `${assessBankId}_q4_a`,
                text: 'Terjadinya perbaikan nyata pada praktik kerja/pembelajaran yang terdokumentasi dan terevaluasi',
              },
              {
                id: `${assessBankId}_q4_b`,
                text: 'Banyaknya berkas yang diunduh tanpa pernah dipraktikkan',
              },
              {
                id: `${assessBankId}_q4_c`,
                text: 'Selesainya pelatihan dalam waktu tersingkat tanpa mengerjakan tugas praktik',
              },
              {
                id: `${assessBankId}_q4_d`,
                text: 'Tidak adanya perubahan strategi sebelum dan sesudah pelatihan',
              },
            ],
          },
        ];

    const defaultAssessAnswers: AnswerKeyEntry[] = usesSamr
      ? [
          {
            questionId: `${assessBankId}_q1`,
            correctOptionIds: [`${assessBankId}_q1_a`],
            acceptedTextAnswers: [],
            explanation: 'Substitution adalah penggantian alat secara langsung tanpa perubahan fungsional.',
          },
          {
            questionId: `${assessBankId}_q2`,
            correctOptionIds: [`${assessBankId}_q2_b`],
            acceptedTextAnswers: [],
            explanation: 'Augmentation menambahkan peningkatan fungsional seperti anotasi dan umpan balik cepat.',
          },
          {
            questionId: `${assessBankId}_q3`,
            correctOptionIds: [`${assessBankId}_q3_c`],
            acceptedTextAnswers: [],
            explanation: 'Modification merancang ulang tugas belajar secara signifikan melalui kolaborasi aktif.',
          },
          {
            questionId: `${assessBankId}_q4`,
            correctOptionIds: [`${assessBankId}_q4_d`],
            acceptedTextAnswers: [],
            explanation: 'Redefinition menciptakan aktivitas baru yang sebelumnya tidak mungkin dilakukan tanpa teknologi.',
          },
        ]
      : [
          {
            questionId: `${assessBankId}_q1`,
            correctOptionIds: [`${assessBankId}_q1_a`],
            acceptedTextAnswers: [],
            explanation: 'Asesmen awal berfungsi memetakan pemahaman awal peserta sesuai materi kegiatan.',
          },
          {
            questionId: `${assessBankId}_q2`,
            correctOptionIds: [`${assessBankId}_q2_a`],
            acceptedTextAnswers: [],
            explanation: 'Pembelajaran bermakna mengaitkan konsep materi dengan praktik nyata di satuan pendidikan.',
          },
          {
            questionId: `${assessBankId}_q3`,
            correctOptionIds: [`${assessBankId}_q3_a`],
            acceptedTextAnswers: [],
            explanation: 'Forum diskusi dan refleksi memperkaya solusi melalui kolaborasi dan sintesis praktik baik.',
          },
          {
            questionId: `${assessBankId}_q4`,
            correctOptionIds: [`${assessBankId}_q4_a`],
            acceptedTextAnswers: [],
            explanation: 'Keberhasilan pelatihan diukur dari implementasi nyata yang berdampak dan terdokumentasi.',
          },
        ];

    const newAssessBank: QuestionBank = {
      id: assessBankId,
      trainingId: id,
      levelNumber: 0,
      kind: 'assessment',
      title: (usesSamr
        ? `Asesmen Awal Kompetensi SAMR — ${cleanCode}`
        : `Asesmen Awal — ${cleanName}`
      ).slice(0, 200),
      description: (usesSamr
        ? `Asesmen awal diagnostik 4 Level SAMR untuk kegiatan ${cleanName}.`
        : `Asesmen awal pemahaman peserta untuk kegiatan ${cleanName}. Unggah materi kegiatan untuk memperbarui soal secara otomatis.`
      ).slice(0, 1000),
      durationMinutes: 20,
      maxAttempts: 2,
      passingScore: 0,
      shuffleQuestions: true,
      showExplanation: true,
      isActive: true,
      questions: defaultAssessQuestions,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const newAssessKey: AnswerKeyDocument = {
      id: assessBankId,
      trainingId: id,
      kind: 'assessment',
      answers: defaultAssessAnswers,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Buat bank soal Kuis Pemahaman & Evaluasi Akhir awal agar langsung tersedia
    const quizBankId = `qb_${id.slice(0, 12)}_quiz_L1`;
    const evalBankId = `qb_${id.slice(0, 12)}_eval_L1`;
    const starterQuizQuestions: QuestionItem[] = usesSamr
      ? [
          {
            id: `qz_${id.slice(0, 8)}_1`,
            type: 'pilihan_ganda',
            prompt: `Pada kegiatan "${record.name}", ciri utama penerapan tahap Substitution (Level 1 SAMR) adalah...`,
            weight: 34,
            options: [
              { id: `qz_${id.slice(0, 8)}_1a`, text: 'Perangkat digital menggantikan media tulis/papan lama secara langsung tanpa mengubah fungsi inti pembelajaran' },
              { id: `qz_${id.slice(0, 8)}_1b`, text: 'Merancang ulang seluruh tugas menjadi kolaborasi lintas negara' },
              { id: `qz_${id.slice(0, 8)}_1c`, text: 'Menghilangkan interaksi guru di dalam kelas' },
              { id: `qz_${id.slice(0, 8)}_1d`, text: 'Menggunakan teknologi hanya untuk administrasi sekolah' },
            ],
          },
          {
            id: `qz_${id.slice(0, 8)}_2`,
            type: 'pilihan_ganda',
            prompt: 'Langkah awal terbaik saat menyiapkan materi ajar digital pada Papan Interaktif Digital (PID) adalah...',
            weight: 33,
            options: [
              { id: `qz_${id.slice(0, 8)}_2a`, text: 'Menyelaraskan bahan tayang dengan tujuan pembelajaran dan keterbacaan visual di kelas' },
              { id: `qz_${id.slice(0, 8)}_2b`, text: 'Memasukkan seluruh teks buku paket ke dalam satu halaman slide' },
              { id: `qz_${id.slice(0, 8)}_2c`, text: 'Menonaktifkan fitur anotasi agar layar tetap statis' },
              { id: `qz_${id.slice(0, 8)}_2d`, text: 'Mengabaikan kesiapan jaringan dan perangkat sebelum mengajar' },
            ],
          },
          {
            id: `qz_${id.slice(0, 8)}_3`,
            type: 'pilihan_ganda',
            prompt: 'Manfaat langsung anotasi digital pada materi pembelajaran adalah...',
            weight: 33,
            options: [
              { id: `qz_${id.slice(0, 8)}_3a`, text: 'Guru dapat menyorot konsep kunci secara real-time dan menyimpan catatan hasil belajar untuk dibagikan ke siswa' },
              { id: `qz_${id.slice(0, 8)}_3b`, text: 'Menggantikan kebutuhan evaluasi pemahaman peserta didik' },
              { id: `qz_${id.slice(0, 8)}_3c`, text: 'Membatasi siswa untuk bertanya selama sesi pembelajaran' },
              { id: `qz_${id.slice(0, 8)}_3d`, text: 'Menghapus kebutuhan perencanaan pembelajaran guru' },
            ],
          },
        ]
      : [
          {
            id: `qz_${id.slice(0, 8)}_1`,
            type: 'pilihan_ganda',
            prompt: `Apa tujuan utama mempelajari materi pada kegiatan "${record.name}"?`,
            weight: 34,
            options: [
              { id: `qz_${id.slice(0, 8)}_1a`, text: 'Memahami konsep inti dan menerapkannya secara terukur dalam praktik pembelajaran/kerja nyata' },
              { id: `qz_${id.slice(0, 8)}_1b`, text: 'Menghafal definisi tanpa menerapkan di satuan pendidikan' },
              { id: `qz_${id.slice(0, 8)}_1c`, text: 'Sekadar memenuhi daftar hadir pelatihan' },
              { id: `qz_${id.slice(0, 8)}_1d`, text: 'Menunda implementasi sampai seluruh fasilitas sempurna' },
            ],
          },
          {
            id: `qz_${id.slice(0, 8)}_2`,
            type: 'pilihan_ganda',
            prompt: `Langkah yang tepat setelah mempelajari satu materi pada "${record.name}" adalah...`,
            weight: 33,
            options: [
              { id: `qz_${id.slice(0, 8)}_2a`, text: 'Mengecek pemahaman melalui kuis materi dan mencatat poin penerapan di kelas/instansi' },
              { id: `qz_${id.slice(0, 8)}_2b`, text: 'Langsung melewatkan materi berikutnya tanpa refleksi' },
              { id: `qz_${id.slice(0, 8)}_2c`, text: 'Mengabaikan hasil umpan balik latihan' },
              { id: `qz_${id.slice(0, 8)}_2d`, text: 'Menghindari diskusi bersama rekan peserta' },
            ],
          },
          {
            id: `qz_${id.slice(0, 8)}_3`,
            type: 'pilihan_ganda',
            prompt: 'Indikator bahwa seorang peserta telah memahami materi pembelajaran dengan baik adalah...',
            weight: 33,
            options: [
              { id: `qz_${id.slice(0, 8)}_3a`, text: 'Mampu menjelaskan kembali prinsip utama dan menyusun rencana penerapan kontekstual' },
              { id: `qz_${id.slice(0, 8)}_3b`, text: 'Hanya mengunduh berkas materi tanpa membacanya' },
              { id: `qz_${id.slice(0, 8)}_3c`, text: 'Menyalin jawaban tanpa memahami alasannya' },
              { id: `qz_${id.slice(0, 8)}_3d`, text: 'Tidak melakukan evaluasi terhadap hasil belajarnya' },
            ],
          },
        ];

    const starterQuizAnswers: AnswerKeyEntry[] = starterQuizQuestions.map((q) => ({
      questionId: q.id,
      correctOptionIds: [q.options[0].id],
      acceptedTextAnswers: [],
      explanation: `Pilihan A mencerminkan pemahaman yang tepat sesuai capaian kegiatan "${record.name}".`,
    }));

    const starterEvalQuestions: QuestionItem[] = [
      {
        id: `ev_${id.slice(0, 8)}_1`,
        type: 'pilihan_ganda',
        prompt: `Studi Kasus: Setelah menyelesaikan seluruh materi "${record.name}", bagaimana strategi terbaik untuk memastikan dampak berkelanjutan di satuan pendidikan Anda?`,
        weight: 50,
        options: [
          { id: `ev_${id.slice(0, 8)}_1a`, text: 'Menyusun rencana tindak lanjut terukur, menguji coba di kelas, dan merefleksikan hasilnya bersama rekan sejawat' },
          { id: `ev_${id.slice(0, 8)}_1b`, text: 'Menyimpan modul sebagai arsip pribadi tanpa dibagikan atau dipraktikkan' },
          { id: `ev_${id.slice(0, 8)}_1c`, text: 'Menunggu instruksi khusus sebelum menerapkan hal sederhana' },
          { id: `ev_${id.slice(0, 8)}_1d`, text: 'Mengubah seluruh jadwal sekolah tanpa koordinasi' },
        ],
      },
      {
        id: `ev_${id.slice(0, 8)}_2`,
        type: 'pilihan_ganda',
        prompt: `Dalam mengevaluasi keberhasilan penerapan materi "${record.name}", bukti yang paling valid adalah...`,
        weight: 50,
        options: [
          { id: `ev_${id.slice(0, 8)}_2a`, text: 'Dokumentasi praktik nyata, keterlibatan aktif peserta didik, serta perbaikan capaian belajar' },
          { id: `ev_${id.slice(0, 8)}_2b`, text: 'Banyaknya halaman materi yang dicetak' },
          { id: `ev_${id.slice(0, 8)}_2c`, text: 'Lamanya waktu membuka aplikasi tanpa hasil karya' },
          { id: `ev_${id.slice(0, 8)}_2d`, text: 'Jumlah tautan yang disimpan tanpa diuji coba' },
        ],
      },
    ];

    const starterEvalAnswers: AnswerKeyEntry[] = starterEvalQuestions.map((q) => ({
      questionId: q.id,
      correctOptionIds: [q.options[0].id],
      acceptedTextAnswers: [],
      explanation: 'Evaluasi berbasis bukti praktik nyata dan refleksi berkelanjutan menunjukkan penguasaan komprehensif.',
    }));

    const newQuizBank: QuestionBank = {
      id: quizBankId,
      trainingId: id,
      levelNumber: 1,
      kind: 'quiz',
      title: `Kuis Pemahaman — ${record.code}`.slice(0, 200),
      description: `Kuis pemahaman awal kegiatan "${record.name}". Otomatis dilengkapi soal khusus setiap kali materi diunggah.`.slice(
        0,
        1000,
      ),
      durationMinutes: 20,
      maxAttempts: 3,
      passingScore: 75,
      shuffleQuestions: true,
      showExplanation: true,
      isActive: true,
      questions: starterQuizQuestions,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const newQuizKey: AnswerKeyDocument = {
      id: quizBankId,
      trainingId: id,
      kind: 'quiz',
      answers: starterQuizAnswers,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const newEvalBank: QuestionBank = {
      id: evalBankId,
      trainingId: id,
      levelNumber: 1,
      kind: 'evaluation',
      title: `Evaluasi Akhir Keseluruhan — ${record.code}`.slice(0, 200),
      description: `Evaluasi akhir keseluruhan untuk kegiatan "${record.name}" setelah seluruh materi selesai dipelajari.`.slice(
        0,
        1000,
      ),
      durationMinutes: 35,
      maxAttempts: 2,
      passingScore: 75,
      shuffleQuestions: true,
      showExplanation: true,
      isActive: true,
      questions: starterEvalQuestions,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const newEvalKey: AnswerKeyDocument = {
      id: evalBankId,
      trainingId: id,
      kind: 'evaluation',
      answers: starterEvalAnswers,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const canWriteCloudAdmin =
      isLiveDatabase &&
      !activeDemoUid &&
      (isBootstrappedAdmin ||
        currentUser?.role === 'super_admin' ||
        currentUser?.role === 'admin_kegiatan');

    if (canWriteCloudAdmin) {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'training_programs', id), {
          ...record,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        for (const lv of newLevels) {
          batch.set(doc(db, 'learning_levels', lv.id), {
            ...lv,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        for (const [bDoc, kDoc] of [
          [newAssessBank, newAssessKey],
          [newQuizBank, newQuizKey],
          [newEvalBank, newEvalKey],
        ] as const) {
          batch.set(doc(db, 'question_banks', bDoc.id), {
            ...bDoc,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          batch.set(doc(db, 'answer_keys', kDoc.id), {
            ...kDoc,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `training_programs/${id}`);
      }
    } else {
      setTrainings((prev) => [record, ...prev]);
      setLevels((prev) => [...prev, ...newLevels]);
      setQuestionBanks((prev) => [...prev, newAssessBank, newQuizBank, newEvalBank]);
      setAnswerKeys((prev) => [...prev, newAssessKey, newQuizKey, newEvalKey]);
    }

    await logActivity({
      trainingId: id,
      action: 'BUAT_KEGIATAN',
      targetType: 'training_program',
      targetId: id,
      details: usesSamr
        ? `Membuat kegiatan baru ${record.code} — ${record.name} beserta 4 level SAMR dan asesmen awal.`
        : `Membuat kegiatan baru ${record.code} — ${record.name} beserta modul standar dan asesmen awal.`,
    });
    showToast(
      'success',
      usesSamr
        ? `Kegiatan "${record.name}" berhasil dibuat beserta 4 Level SAMR dan Asesmen Awal.`
        : `Kegiatan "${record.name}" berhasil dibuat beserta modul standar dan Asesmen Awal.`,
    );
    return { ok: true, message: 'Kegiatan berhasil dibuat.', data: record };
  };

  const updateTraining: LmsContextValue['updateTraining'] = async (trainingId, patch) => {
    if (effectiveRole !== 'super_admin' && effectiveRole !== 'admin_kegiatan') {
      return { ok: false, message: 'Tidak berwenang mengubah kegiatan.' };
    }
    if (patch.scoreRanges) {
      const check = validateScoreRanges(patch.scoreRanges);
      if (!check.valid) return { ok: false, message: check.error || 'Rentang skor tidak valid.' };
    }
    if (isLiveDatabase && isBootstrappedAdmin) {
      try {
        await updateDoc(doc(db, 'training_programs', trainingId), {
          ...patch,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `training_programs/${trainingId}`);
      }
    } else {
      setTrainings((prev) =>
        prev.map((t) =>
          t.id === trainingId ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
        ),
      );
    }
    await logActivity({
      trainingId,
      action: 'UBAH_KEGIATAN',
      targetType: 'training_program',
      targetId: trainingId,
      details: `Memperbarui konfigurasi kegiatan ${trainingId}.`,
    });
    showToast('success', 'Perubahan kegiatan berhasil disimpan.');
    return { ok: true, message: 'Kegiatan diperbarui.' };
  };

  const deleteTraining: LmsContextValue['deleteTraining'] = async (trainingId) => {
    if (effectiveRole !== 'super_admin' && effectiveRole !== 'admin_kegiatan') {
      return { ok: false, message: 'Hanya Super Admin atau Admin Kegiatan yang dapat menghapus kegiatan.' };
    }
    const targetTraining = trainings.find((t) => t.id === trainingId);
    const relatedLevelIds = levels
      .filter((lv) => lv.trainingId === trainingId)
      .map((lv) => lv.id);

    const canWriteCloudAdmin =
      isLiveDatabase &&
      !activeDemoUid &&
      (isBootstrappedAdmin ||
        currentUser?.role === 'super_admin' ||
        currentUser?.role === 'admin_kegiatan');

    if (canWriteCloudAdmin) {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'training_programs', trainingId));
        for (const lvId of relatedLevelIds) {
          batch.delete(doc(db, 'learning_levels', lvId));
        }
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `training_programs/${trainingId}`);
      }
    } else {
      setTrainings((prev) => prev.filter((t) => t.id !== trainingId));
      setLevels((prev) => prev.filter((l) => l.trainingId !== trainingId));
      setMaterials((prev) => prev.filter((m) => m.trainingId !== trainingId));
      setEnrollments((prev) => prev.filter((e) => e.trainingId !== trainingId));
      setSchedules((prev) => prev.filter((s) => s.trainingId !== trainingId));
      setAnnouncements((prev) => prev.filter((a) => a.trainingId !== trainingId));
      setQuestionBanks((prev) => prev.filter((q) => q.trainingId !== trainingId));
    }
    await logActivity({
      trainingId,
      action: 'HAPUS_KEGIATAN',
      targetType: 'training_program',
      targetId: trainingId,
      details: `Menghapus kegiatan ${targetTraining ? `${targetTraining.code} — ${targetTraining.name}` : trainingId}.`,
    });
    showToast(
      'success',
      `Kegiatan ${targetTraining ? `"${targetTraining.name}" ` : ''}berhasil dihapus.`,
    );
    return { ok: true, message: 'Kegiatan dihapus.' };
  };

  const updateScoreRanges: LmsContextValue['updateScoreRanges'] = async (trainingId, ranges) => {
    const check = validateScoreRanges(ranges);
    if (!check.valid) {
      showToast('error', check.error || 'Rentang skor tidak valid.');
      return { ok: false, message: check.error || 'Rentang skor tidak valid.' };
    }
    return updateTraining(trainingId, { scoreRanges: ranges });
  };

  const updateLearningLevel: LmsContextValue['updateLearningLevel'] = async (levelId, patch) => {
    if (effectiveRole !== 'super_admin' && effectiveRole !== 'admin_kegiatan') {
      return { ok: false, message: 'Tidak berwenang mengubah konfigurasi level.' };
    }
    if (isLiveDatabase && isBootstrappedAdmin) {
      try {
        await updateDoc(doc(db, 'learning_levels', levelId), {
          ...patch,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `learning_levels/${levelId}`);
      }
    } else {
      setLevels((prev) =>
        prev.map((lv) =>
          lv.id === levelId ? { ...lv, ...patch, updatedAt: new Date().toISOString() } : lv,
        ),
      );
    }
    showToast('success', 'Pengaturan level pembelajaran berhasil disimpan.');
    return { ok: true, message: 'Level diperbarui.' };
  };

  // Enroll peserta ke kegiatan (mendukung 1 peserta mengikuti beberapa kegiatan)
  const enrollInTraining: LmsContextValue['enrollInTraining'] = async (trainingId, userId) => {
    const uid = userId || currentUser?.uid;
    if (!uid) return { ok: false, message: 'Pengguna belum masuk.' };
    const profile = profiles.find((p) => p.uid === uid) || currentUser;
    const training = trainings.find((t) => t.id === trainingId);
    if (!profile || !training) return { ok: false, message: 'Data kegiatan tidak ditemukan.' };
    if (enrollments.some((e) => e.trainingId === trainingId && e.userId === uid)) {
      return { ok: false, message: 'Anda sudah terdaftar pada kegiatan ini.' };
    }
    const enrId = makeId('enr');
    const nowIso = new Date().toISOString();
    const usesSamr = isSamrTraining(training);
    const initialStatus = training.requireApproval ? 'menunggu' : 'disetujui';
    const record: TrainingEnrollment = {
      id: enrId,
      trainingId,
      userId: uid,
      userName: profile.fullName,
      instansi: profile.instansi,
      kabupatenKota: profile.kabupatenKota,
      status: usesSamr ? initialStatus : initialStatus === 'disetujui' ? 'aktif' : 'menunggu',
      startingLevel: usesSamr ? 0 : 1,
      currentLevel: usesSamr ? 0 : 1,
      unlockedLevels: usesSamr ? [] : [1, 2, 3, 4],
      completedLevels: [],
      assessmentScore: -1,
      overallProgress: 0,
      certificateNumber: '',
      approvedBy: '',
      enrolledAt: nowIso,
      updatedAt: nowIso,
    };

    if (isLiveDatabase) {
      try {
        await setDoc(doc(db, 'training_enrollments', enrId), {
          ...record,
          enrolledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `training_enrollments/${enrId}`);
      }
    } else {
      setEnrollments((prev) => [record, ...prev]);
    }
    await logActivity({
      trainingId,
      action: 'DAFTAR_KEGIATAN',
      targetType: 'enrollment',
      targetId: enrId,
      details: `${profile.fullName} mendaftar ke kegiatan ${training.code} (${initialStatus}).`,
    });
    showToast(
      'success',
      initialStatus === 'menunggu'
        ? 'Pendaftaran terkirim. Menunggu verifikasi Admin Kegiatan.'
        : 'Berhasil mendaftar! Anda dapat langsung mengerjakan Asesmen Awal.',
    );
    return { ok: true, message: 'Pendaftaran berhasil.' };
  };

  const approveOrRejectEnrollment: LmsContextValue['approveOrRejectEnrollment'] = async (
    enrollmentId,
    decision,
  ) => {
    if (effectiveRole !== 'super_admin' && effectiveRole !== 'admin_kegiatan') {
      return { ok: false, message: 'Hanya Admin yang dapat memverifikasi pendaftaran.' };
    }
    const enr = enrollments.find((e) => e.id === enrollmentId);
    if (!enr) return { ok: false, message: 'Data pendaftaran tidak ditemukan.' };
    if (isLiveDatabase && isBootstrappedAdmin) {
      try {
        await updateDoc(doc(db, 'training_enrollments', enrollmentId), {
          status: decision,
          approvedBy: currentUser?.uid || 'admin',
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `training_enrollments/${enrollmentId}`);
      }
    } else {
      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === enrollmentId
            ? {
                ...e,
                status: decision,
                approvedBy: currentUser?.uid || 'admin',
                updatedAt: new Date().toISOString(),
              }
            : e,
        ),
      );
    }
    await logActivity({
      trainingId: enr.trainingId,
      action: decision === 'disetujui' ? 'PERSETUJUAN_PESERTA' : 'PENOLAKAN_PESERTA',
      targetType: 'enrollment',
      targetId: enrollmentId,
      details: `Pendaftaran ${enr.userName} ${decision}.`,
    });
    showToast('success', `Pendaftaran ${enr.userName} telah ${decision}.`);
    return { ok: true, message: `Pendaftaran ${decision}.` };
  };

  // Admin Override Level dengan pencatatan alasan, waktu, dan identitas petugas
  const adminOverrideLevel: LmsContextValue['adminOverrideLevel'] = async (
    enrollmentId,
    targetLevel,
    reason,
  ) => {
    if (effectiveRole !== 'super_admin' && effectiveRole !== 'admin_kegiatan') {
      return { ok: false, message: 'Hanya Admin berwenang yang dapat melakukan override level.' };
    }
    if (reason.trim().length < 8) {
      return { ok: false, message: 'Alasan override wajib diisi minimal 8 karakter untuk audit.' };
    }
    const enr = enrollments.find((e) => e.id === enrollmentId);
    if (!enr) return { ok: false, message: 'Data kepesertaan tidak ditemukan.' };
    const nextUnlocked = Array.from(new Set([...enr.unlockedLevels, targetLevel])).sort();
    const nextStart = enr.startingLevel === 0 ? targetLevel : enr.startingLevel;

    if (isLiveDatabase && isBootstrappedAdmin) {
      try {
        await updateDoc(doc(db, 'training_enrollments', enrollmentId), {
          status: 'aktif',
          startingLevel: nextStart,
          currentLevel: targetLevel,
          unlockedLevels: nextUnlocked,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `training_enrollments/${enrollmentId}`);
      }
    } else {
      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === enrollmentId
            ? {
                ...e,
                status: 'aktif',
                startingLevel: nextStart,
                currentLevel: targetLevel,
                unlockedLevels: nextUnlocked,
                updatedAt: new Date().toISOString(),
              }
            : e,
        ),
      );
    }

    await logActivity({
      trainingId: enr.trainingId,
      action: 'OVERRIDE_LEVEL_ADMIN',
      targetType: 'enrollment',
      targetId: enrollmentId,
      details: `Override akses Level ${targetLevel} untuk ${enr.userName} oleh ${currentUser?.fullName || 'Admin'}.`,
      overrideReason: reason.trim(),
    });
    showToast('success', `Override Level ${targetLevel} berhasil dicatat dalam log audit.`);
    return { ok: true, message: 'Override level berhasil.' };
  };

  // Materi CRUD & Progress
  const saveMaterial: LmsContextValue['saveMaterial'] = async (payload) => {
    if (
      effectiveRole !== 'super_admin' &&
      effectiveRole !== 'admin_kegiatan' &&
      effectiveRole !== 'fasilitator'
    ) {
      return { ok: false, message: 'Tidak berwenang mengelola materi.' };
    }
    const isEdit = Boolean(payload.id);
    const id = payload.id || makeId('mat');
    const nowIso = new Date().toISOString();
    const safeTitle = payload.title.trim().slice(0, 200);
    if (safeTitle.length < 2) {
      return { ok: false, message: 'Judul materi minimal 2 karakter.' };
    }
    const existingMat = isEdit ? materials.find((m) => m.id === id) : undefined;
    const record: LearningMaterial = {
      ...payload,
      id,
      title: safeTitle,
      description: (payload.description || '').trim().slice(0, 1000),
      contentBody: (payload.contentBody || '').trim().slice(0, 15000),
      fileUrl: (payload.fileUrl || '').trim().slice(0, 1000),
      fileName: (payload.fileName || '').trim().slice(0, 255),
      orderIndex: Math.max(1, Math.min(200, Math.round(Number(payload.orderIndex) || 1))),
      durationMinutes: Math.max(1, Math.min(600, Math.round(Number(payload.durationMinutes) || 15))),
      createdBy: existingMat?.createdBy || currentUser?.uid || 'fasilitator_01',
      createdAt: existingMat?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    const canWriteCloudStaff =
      isLiveDatabase &&
      !activeDemoUid &&
      (isBootstrappedAdmin ||
        currentUser?.role === 'super_admin' ||
        currentUser?.role === 'admin_kegiatan' ||
        currentUser?.role === 'fasilitator');

    if (canWriteCloudStaff) {
      try {
        if (isEdit) {
          try {
            await updateDoc(doc(db, 'learning_materials', id), {
              title: record.title,
              description: record.description,
              contentType: record.contentType,
              contentBody: record.contentBody,
              fileUrl: record.fileUrl,
              fileName: record.fileName,
              orderIndex: record.orderIndex,
              durationMinutes: record.durationMinutes,
              isMandatory: record.isMandatory,
              isActive: record.isActive,
              allowDownload: record.allowDownload,
              isPrivateBucket: record.isPrivateBucket,
              updatedAt: serverTimestamp(),
            });
          } catch (updateErr: unknown) {
            const errCode = (updateErr as { code?: string })?.code || '';
            if (errCode === 'not-found') {
              await setDoc(doc(db, 'learning_materials', id), {
                ...record,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            } else {
              throw updateErr;
            }
          }
        } else {
          await setDoc(doc(db, 'learning_materials', id), {
            ...record,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `learning_materials/${id}`);
        return {
          ok: false,
          message: 'Gagal menyimpan materi ke database. Pastikan akun Anda berhak mengelola materi.',
        };
      }
    } else {
      setMaterials((prev) =>
        isEdit ? prev.map((m) => (m.id === id ? record : m)) : [...prev, record],
      );
    }

    await logActivity({
      trainingId: record.trainingId,
      action: isEdit ? 'UBAH_MATERI' : 'TAMBAH_MATERI',
      targetType: 'learning_material',
      targetId: id,
      details: `${isEdit ? 'Memperbarui' : 'Menambahkan'} materi "${record.title}" (${record.contentType}) pada Level ${record.levelNumber}.`,
    });
    showToast('success', `Materi "${record.title}" berhasil disimpan.`);
    return { ok: true, message: 'Materi tersimpan.', data: record };
  };

  const deleteMaterial: LmsContextValue['deleteMaterial'] = async (materialId) => {
    if (
      effectiveRole !== 'super_admin' &&
      effectiveRole !== 'admin_kegiatan' &&
      effectiveRole !== 'fasilitator'
    ) {
      return { ok: false, message: 'Tidak berwenang menghapus materi.' };
    }
    const canWriteCloudStaff =
      isLiveDatabase &&
      !activeDemoUid &&
      (isBootstrappedAdmin ||
        currentUser?.role === 'super_admin' ||
        currentUser?.role === 'admin_kegiatan' ||
        currentUser?.role === 'fasilitator');
    if (canWriteCloudStaff) {
      try {
        await deleteDoc(doc(db, 'learning_materials', materialId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `learning_materials/${materialId}`);
      }
    } else {
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));
    }
    showToast('success', 'Materi dihapus.');
    return { ok: true, message: 'Materi dihapus.' };
  };

  const markMaterialProgress: LmsContextValue['markMaterialProgress'] = async (
    material,
    status,
  ) => {
    if (!currentUser) return { ok: false, message: 'Silakan masuk terlebih dahulu.' };
    const trn = trainings.find((t) => t.id === material.trainingId);
    const enr = enrollments.find(
      (e) => e.trainingId === material.trainingId && e.userId === currentUser.uid,
    );
    const isBelowStarting =
      Boolean(enr) && enr!.startingLevel > 1 && material.levelNumber < enr!.startingLevel;
    if (
      isSamrTraining(trn) &&
      enr &&
      !enr.unlockedLevels.includes(material.levelNumber) &&
      !isBelowStarting
    ) {
      return {
        ok: false,
        message: `Akses ditolak: Level ${material.levelNumber} belum terbuka bagi Anda.`,
      };
    }

    const existing = materialProgress.find(
      (p) => p.materialId === material.id && p.userId === currentUser.uid,
    );
    const id = existing?.id || `prog_${material.id}_${currentUser.uid}`;
    const nowIso = new Date().toISOString();
    const record: MaterialProgress = {
      id,
      trainingId: material.trainingId,
      levelId: material.levelId,
      levelNumber: material.levelNumber,
      materialId: material.id,
      userId: currentUser.uid,
      status,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    if (isLiveDatabase && !activeDemoUid) {
      try {
        if (existing) {
          await updateDoc(doc(db, 'material_progress', id), {
            status,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'material_progress', id), {
            ...record,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `material_progress/${id}`);
      }
    } else {
      setMaterialProgress((prev) =>
        existing ? prev.map((p) => (p.id === id ? record : p)) : [...prev, record],
      );
    }

    if (status === 'selesai') {
      showToast('success', `Materi "${material.title}" ditandai selesai.`);
    }
    return { ok: true, message: 'Progres materi tersimpan.' };
  };

  // Bank Soal CRUD
  const saveQuestionBank: LmsContextValue['saveQuestionBank'] = async (bank, answers) => {
    if (
      effectiveRole !== 'super_admin' &&
      effectiveRole !== 'admin_kegiatan' &&
      effectiveRole !== 'fasilitator'
    ) {
      return { ok: false, message: 'Tidak berwenang mengelola soal.' };
    }
    const nowIso = new Date().toISOString();
    const bankDoc: QuestionBank = {
      id: bank.id,
      trainingId: bank.trainingId,
      levelNumber: bank.levelNumber,
      ...(bank.materialId ? { materialId: bank.materialId.slice(0, 128) } : {}),
      kind: bank.kind,
      title: bank.title.trim().slice(0, 200),
      description: (bank.description || '').trim().slice(0, 1000),
      durationMinutes: Math.max(5, Math.min(240, Math.round(Number(bank.durationMinutes) || 20))),
      maxAttempts: Math.max(1, Math.min(20, Math.round(Number(bank.maxAttempts) || 3))),
      passingScore: Math.max(0, Math.min(100, Number(bank.passingScore) || 0)),
      shuffleQuestions: Boolean(bank.shuffleQuestions),
      showExplanation: Boolean(bank.showExplanation),
      isActive: Boolean(bank.isActive),
      questions: bank.questions.slice(0, 40),
      createdAt: bank.createdAt || nowIso,
      updatedAt: nowIso,
    };
    const keyDoc: AnswerKeyDocument = {
      id: bank.id,
      trainingId: bank.trainingId,
      kind: bank.kind,
      answers: answers.slice(0, 40),
      createdAt: bank.createdAt || nowIso,
      updatedAt: nowIso,
    };

    const canWriteCloudBank =
      isLiveDatabase &&
      !activeDemoUid &&
      (isBootstrappedAdmin ||
        currentUser?.role === 'super_admin' ||
        currentUser?.role === 'admin_kegiatan' ||
        currentUser?.role === 'fasilitator');

    if (canWriteCloudBank) {
      try {
        const existsBank = questionBanks.some((b) => b.id === bank.id);
        if (existsBank) {
          try {
            await updateDoc(doc(db, 'question_banks', bank.id), {
              levelNumber: bankDoc.levelNumber,
              ...(bankDoc.materialId ? { materialId: bankDoc.materialId } : {}),
              kind: bankDoc.kind,
              title: bankDoc.title,
              description: bankDoc.description,
              durationMinutes: bankDoc.durationMinutes,
              maxAttempts: bankDoc.maxAttempts,
              passingScore: bankDoc.passingScore,
              shuffleQuestions: bankDoc.shuffleQuestions,
              showExplanation: bankDoc.showExplanation,
              isActive: bankDoc.isActive,
              questions: bankDoc.questions,
              updatedAt: serverTimestamp(),
            });
          } catch (updateErr: unknown) {
            const errCode = (updateErr as { code?: string })?.code || '';
            if (errCode === 'not-found') {
              await setDoc(doc(db, 'question_banks', bank.id), {
                ...bankDoc,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            } else {
              throw updateErr;
            }
          }
        } else {
          await setDoc(doc(db, 'question_banks', bank.id), {
            ...bankDoc,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        const existsKey = answerKeys.some((a) => a.id === bank.id);
        if (existsKey) {
          try {
            await updateDoc(doc(db, 'answer_keys', bank.id), {
              trainingId: keyDoc.trainingId,
              kind: keyDoc.kind,
              answers: keyDoc.answers,
              updatedAt: serverTimestamp(),
            });
          } catch (updateErr: unknown) {
            const errCode = (updateErr as { code?: string })?.code || '';
            if (errCode === 'not-found') {
              await setDoc(doc(db, 'answer_keys', bank.id), {
                ...keyDoc,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            } else {
              throw updateErr;
            }
          }
        } else {
          await setDoc(doc(db, 'answer_keys', bank.id), {
            ...keyDoc,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `question_banks/${bank.id}`);
        return { ok: false, message: 'Gagal menyimpan bank soal ke database.' };
      }
    } else {
      setQuestionBanks((prev) =>
        prev.some((b) => b.id === bank.id)
          ? prev.map((b) => (b.id === bank.id ? bankDoc : b))
          : [...prev, bankDoc],
      );
      setAnswerKeys((prev) =>
        prev.some((a) => a.id === bank.id)
          ? prev.map((a) => (a.id === bank.id ? keyDoc : a))
          : [...prev, keyDoc],
      );
    }
    showToast('success', `Instrumen "${bank.title}" dan kunci jawaban terisolasi berhasil disimpan.`);
    return { ok: true, message: 'Bank soal tersimpan.' };
  };

  // Submit Asesmen Awal / Kuis / Evaluasi
  const submitBankAttempt: LmsContextValue['submitBankAttempt'] = async ({ bank, answers }) => {
    if (!currentUser) return { ok: false, message: 'Silakan masuk terlebih dahulu.' };
    const isStaffActor =
      effectiveRole === 'super_admin' ||
      effectiveRole === 'admin_kegiatan' ||
      effectiveRole === 'fasilitator';
    const enr = enrollments.find(
      (e) => e.trainingId === bank.trainingId && e.userId === currentUser.uid,
    );
    if (!isStaffActor) {
      if (!enr) return { ok: false, message: 'Anda belum terdaftar pada kegiatan ini.' };
      if (enr.status === 'menunggu' || enr.status === 'ditolak') {
        return { ok: false, message: 'Status pendaftaran Anda belum disetujui oleh Admin Kegiatan.' };
      }
    }
    const targetTraining = trainings.find((t) => t.id === bank.trainingId);
    const isBelowStarting =
      Boolean(enr) && enr!.startingLevel > 1 && bank.levelNumber < enr!.startingLevel;
    if (
      !isStaffActor &&
      enr &&
      isSamrTraining(targetTraining) &&
      bank.kind !== 'assessment' &&
      !enr.unlockedLevels.includes(bank.levelNumber) &&
      !isBelowStarting
    ) {
      return {
        ok: false,
        message: `Akses ditolak: Level ${bank.levelNumber} belum terbuka secara sekuensial.`,
      };
    }

    if (bank.kind === 'quiz' && bank.materialId && effectiveRole === 'peserta') {
      const matDone = materialProgress.some(
        (p) =>
          p.trainingId === bank.trainingId &&
          p.userId === currentUser.uid &&
          p.materialId === bank.materialId &&
          p.status === 'selesai',
      );
      if (!matDone) {
        return {
          ok: false,
          message:
            'Pelajari dan tandai materi terkait selesai terlebih dahulu sebelum mengerjakan kuis materi ini.',
        };
      }
    }

    if (bank.kind === 'evaluation' && effectiveRole === 'peserta') {
      const scopeMaterials = materials.filter(
        (m) =>
          m.trainingId === bank.trainingId &&
          m.isActive &&
          (!isSamrTraining(targetTraining) || m.levelNumber === bank.levelNumber),
      );
      if (scopeMaterials.length > 0) {
        const doneIds = new Set(
          materialProgress
            .filter(
              (p) =>
                p.trainingId === bank.trainingId &&
                p.userId === currentUser.uid &&
                p.status === 'selesai',
            )
            .map((p) => p.materialId),
        );
        const unfinished = scopeMaterials.filter((m) => !doneIds.has(m.id));
        if (unfinished.length > 0) {
          return {
            ok: false,
            message: `Selesaikan seluruh materi terlebih dahulu (${scopeMaterials.length - unfinished.length}/${scopeMaterials.length} materi selesai) sebelum mengerjakan Evaluasi Akhir Keseluruhan.`,
          };
        }
      }
    }

    const prevAttempts = attempts.filter(
      (a) => a.bankId === bank.id && a.userId === currentUser.uid,
    );
    if (!isStaffActor && prevAttempts.length >= bank.maxAttempts) {
      return {
        ok: false,
        message: `Batas percobaan (${bank.maxAttempts}x) untuk instrumen ini telah tercapai.`,
      };
    }

    // Ambil kunci jawaban dari state lokal, seed internal, atau single-doc lookup Firestore
    let keyDoc =
      answerKeys.find((k) => k.id === bank.id) ||
      initialSeed.answerKeys.find((k) => k.id === bank.id);
    if (!keyDoc && isLiveDatabase) {
      try {
        const keySnap = await getDoc(doc(db, 'answer_keys', bank.id));
        if (keySnap.exists()) {
          const kd = keySnap.data();
          keyDoc = {
            id: String(kd.id || keySnap.id),
            trainingId: String(kd.trainingId || bank.trainingId),
            kind: (kd.kind as AnswerKeyDocument['kind']) || bank.kind,
            answers: Array.isArray(kd.answers) ? (kd.answers as AnswerKeyEntry[]) : [],
            createdAt: tsToIso(kd.createdAt),
            updatedAt: tsToIso(kd.updatedAt),
          };
        }
      } catch (err) {
        console.warn('Gagal mengambil kunci jawaban dari Firestore:', err);
      }
    }

    const safeAnswers: UserAnswerMap = answers && typeof answers === 'object' ? answers : {};
    const graded = gradeSubmission(bank, keyDoc?.answers || [], safeAnswers);

    const training = trainings.find((t) => t.id === bank.trainingId);
    const trainingUsesSamr = isSamrTraining(training);
    const assignedLevel =
      bank.kind === 'assessment'
        ? trainingUsesSamr
          ? resolveStartingLevel(graded.percentage, training?.scoreRanges || DEFAULT_SCORE_RANGES)
          : 1
        : 0;

    const attemptId = makeId('att');
    const nowIso = new Date().toISOString();
    const safeUserName =
      (currentUser.fullName || currentUser.email || 'Peserta LMS').trim().slice(0, 120) ||
      'Peserta LMS';
    const nextAttemptNumber = Math.min(20, prevAttempts.length + 1);
    const record: AttemptRecord = {
      id: attemptId,
      trainingId: bank.trainingId,
      bankId: bank.id,
      kind: bank.kind,
      levelNumber: bank.levelNumber,
      userId: currentUser.uid,
      userName: safeUserName.length >= 2 ? safeUserName : `${safeUserName} LMS`,
      attemptNumber: nextAttemptNumber,
      answers: safeAnswers,
      autoScore: graded.autoScore,
      manualScore: 0,
      finalScore: graded.percentage,
      percentage: graded.percentage,
      passed: bank.kind === 'assessment' ? true : graded.passed,
      assignedLevel,
      gradingStatus: graded.gradingStatus,
      feedback:
        bank.kind === 'assessment'
          ? trainingUsesSamr
            ? `Skor asesmen awal ${graded.percentage}%. Penempatan otomatis: Level ${assignedLevel}.`
            : `Asesmen awal selesai dengan skor ${graded.percentage}%. Silakan lanjutkan mempelajari materi kegiatan.`
          : graded.gradingStatus === 'menunggu_manual'
            ? 'Jawaban objektif telah dihitung. Menunggu penilaian manual fasilitator untuk soal isian.'
            : graded.passed
              ? `Selamat! Anda memenuhi nilai minimum (${bank.passingScore}).`
              : `Nilai ${graded.percentage}% belum mencapai standar kelulusan (${bank.passingScore}%).`,
      gradedBy: graded.gradingStatus === 'selesai' ? 'sistem' : '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (isLiveDatabase && !activeDemoUid) {
      try {
        await setDoc(doc(db, 'attempts', attemptId), {
          ...record,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Simpan attempt ke Firestore gagal, menyimpan ke state lokal:', err);
      }
      setAttempts((prev) =>
        prev.some((a) => a.id === record.id) ? prev : [record, ...prev],
      );
    } else {
      setAttempts((prev) => [record, ...prev]);
    }

    // Jika Asesmen Awal pada peserta terdaftar: tetapkan startingLevel & level terbuka
    if (
      enr &&
      bank.kind === 'assessment' &&
      (enr.startingLevel === 0 || enr.assessmentScore < 0)
    ) {
      const nextUnlocked = trainingUsesSamr ? [assignedLevel] : [1, 2, 3, 4];
      const updatedEnr: TrainingEnrollment = {
        ...enr,
        status: 'aktif',
        startingLevel: assignedLevel,
        currentLevel: assignedLevel,
        unlockedLevels: nextUnlocked,
        assessmentScore: graded.percentage,
        updatedAt: nowIso,
      };
      if (isLiveDatabase && !activeDemoUid) {
        try {
          await updateDoc(doc(db, 'training_enrollments', enr.id), {
            status: 'aktif',
            startingLevel: assignedLevel,
            currentLevel: assignedLevel,
            unlockedLevels: nextUnlocked,
            assessmentScore: graded.percentage,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          console.warn('Pembaruan enrollment asesmen awal gagal di Firestore, memperbarui state lokal:', err);
        }
        setEnrollments((prev) => prev.map((e) => (e.id === enr.id ? updatedEnr : e)));
      } else {
        setEnrollments((prev) => prev.map((e) => (e.id === enr.id ? updatedEnr : e)));
      }
      await logActivity({
        trainingId: bank.trainingId,
        action: 'PENEMPATAN_ASESMEN_AWAL',
        targetType: 'enrollment',
        targetId: enr.id,
        details: trainingUsesSamr
          ? `${currentUser.fullName} memperoleh skor ${graded.percentage}% dan ditempatkan pada Level ${assignedLevel} SAMR.`
          : `${currentUser.fullName} menyelesaikan asesmen awal kegiatan dengan skor ${graded.percentage}%.`,
      });
    } else {
      await logActivity({
        trainingId: bank.trainingId,
        action:
          bank.kind === 'assessment'
            ? 'KIRIM_ASESMEN_AWAL'
            : bank.kind === 'quiz'
              ? 'KIRIM_KUIS'
              : 'KIRIM_EVALUASI',
        targetType: 'attempt',
        targetId: attemptId,
        details: `${currentUser.fullName} mengirim ${bank.title} (skor: ${graded.percentage}%, status: ${graded.passed ? 'Lulus' : graded.gradingStatus}).`,
      });
    }

    showToast('success', record.feedback);
    return {
      ok: true,
      message: record.feedback,
      data: { attempt: record, perQuestionResults: graded.perQuestionResults },
    };
  };

  // Penilaian Manual Fasilitator / Admin untuk soal isian
  const gradeManualAttempt: LmsContextValue['gradeManualAttempt'] = async ({
    attemptId,
    manualScore,
    feedback,
  }) => {
    if (
      effectiveRole !== 'super_admin' &&
      effectiveRole !== 'admin_kegiatan' &&
      effectiveRole !== 'fasilitator'
    ) {
      return { ok: false, message: 'Hanya Fasilitator atau Admin yang dapat menilai manual.' };
    }
    const att = attempts.find((a) => a.id === attemptId);
    if (!att) return { ok: false, message: 'Data percobaan tidak ditemukan.' };
    const bank = questionBanks.find((b) => b.id === att.bankId);
    const passing = bank?.passingScore ?? 70;
    const finalScore = Math.min(100, Math.max(0, Number(manualScore)));
    const passed = finalScore >= passing;

    if (isLiveDatabase && isStaffUser && !activeDemoUid) {
      try {
        await updateDoc(doc(db, 'attempts', attemptId), {
          manualScore: finalScore,
          finalScore,
          percentage: finalScore,
          passed,
          gradingStatus: 'selesai',
          feedback: feedback.trim().slice(0, 1000),
          gradedBy: currentUser?.uid || 'fasilitator',
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `attempts/${attemptId}`);
      }
    } else {
      setAttempts((prev) =>
        prev.map((a) =>
          a.id === attemptId
            ? {
                ...a,
                manualScore: finalScore,
                finalScore,
                percentage: finalScore,
                passed,
                gradingStatus: 'selesai',
                feedback: feedback.trim(),
                gradedBy: currentUser?.uid || 'fasilitator',
                updatedAt: new Date().toISOString(),
              }
            : a,
        ),
      );
    }

    await logActivity({
      trainingId: att.trainingId,
      action: 'PENILAIAN_MANUAL',
      targetType: 'attempt',
      targetId: attemptId,
      details: `Penilaian manual untuk ${att.userName}: skor akhir ${finalScore}% (${passed ? 'Lulus' : 'Belum Lulus'}).`,
    });
    showToast('success', `Penilaian manual berhasil disimpan (Skor: ${finalScore}%).`);
    return { ok: true, message: 'Penilaian manual tersimpan.' };
  };

  // Verifikasi kelulusan level & pembukaan level berikutnya / penerbitan sertifikat
  const verifyAndUnlockLevel: LmsContextValue['verifyAndUnlockLevel'] = async (
    trainingId,
    levelNumber,
  ) => {
    if (!currentUser) return { ok: false, message: 'Silakan masuk terlebih dahulu.' };
    const enr = enrollments.find(
      (e) => e.trainingId === trainingId && e.userId === currentUser.uid,
    );
    const level = levels.find((l) => l.trainingId === trainingId && l.levelNumber === levelNumber);
    const training = trainings.find((t) => t.id === trainingId);
    if (!enr || !level || !training) {
      return { ok: false, message: 'Data kepesertaan atau level tidak ditemukan.' };
    }

    const summary = evaluateLevelStatus({
      enrollment: enr,
      level,
      materials,
      progressList: materialProgress,
      attempts,
      taskSubmissions,
      reflections: levelReflections,
    });

    if (!summary.canUnlockNext) {
      const reason = summary.missingRequirements.join(' · ');
      showToast('error', `Syarat Level ${levelNumber} belum terpenuhi: ${reason}`);
      return { ok: false, message: reason };
    }

    const nowIso = new Date().toISOString();
    const completedSet = Array.from(new Set([...enr.completedLevels, levelNumber])).sort();
    const isAssignedOnly = training.progressionPolicy === 'assigned_only';
    const shouldGraduateNow = isAssignedOnly || levelNumber >= 4;

    if (!shouldGraduateNow) {
      const nextLevel = (levelNumber + 1) as 1 | 2 | 3 | 4;
      const unlockedSet = Array.from(new Set([...enr.unlockedLevels, nextLevel])).sort();
      const totalNeeded = Math.max(1, 5 - Math.max(1, enr.startingLevel));
      const newProgress = Math.min(95, Math.round((completedSet.length / totalNeeded) * 100));

      if (isLiveDatabase && !activeDemoUid) {
        try {
          await updateDoc(doc(db, 'training_enrollments', enr.id), {
            status: 'aktif',
            currentLevel: Math.max(enr.currentLevel, nextLevel),
            unlockedLevels: unlockedSet,
            completedLevels: completedSet,
            overallProgress: newProgress,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `training_enrollments/${enr.id}`);
        }
      } else {
        setEnrollments((prev) =>
          prev.map((e) =>
            e.id === enr.id
              ? {
                  ...e,
                  status: 'aktif',
                  currentLevel: Math.max(e.currentLevel, nextLevel),
                  unlockedLevels: unlockedSet,
                  completedLevels: completedSet,
                  overallProgress: newProgress,
                  updatedAt: nowIso,
                }
              : e,
          ),
        );
      }

      await logActivity({
        trainingId,
        action: 'BUKA_LEVEL_BERIKUTNYA',
        targetType: 'enrollment',
        targetId: enr.id,
        details: `${currentUser.fullName} lulus Level ${levelNumber} dan membuka Level ${nextLevel} secara sekuensial.`,
      });
      showToast('success', `Selamat! Level ${levelNumber} lulus. Level ${nextLevel} kini terbuka.`);
      return { ok: true, message: `Level ${nextLevel} terbuka.` };
    }

    // Lulus tingkat akhir (Level 4 atau level rekomendasi bila kebijakan assigned_only) -> terbitkan sertifikat digital unik!
    const certNumber =
      enr.certificateNumber || generateUniqueCertificateNumber(training.code, currentUser.uid);
    const certRecord: CertificateRecord = {
      certificateNumber: certNumber,
      trainingId,
      trainingName: training.name,
      organizer: training.organizer,
      userId: currentUser.uid,
      participantName: currentUser.fullName,
      completedLevel: levelNumber,
      issuedDate: nowIso.slice(0, 10),
      signerName: training.signerName || 'Penanggung Jawab Pelatihan',
      signerTitle: training.signerTitle || training.organizer,
      status: 'valid',
      createdAt: nowIso,
    };

    if (isLiveDatabase && !activeDemoUid) {
      try {
        await setDoc(doc(db, 'certificates', certNumber), {
          ...certRecord,
          createdAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'training_enrollments', enr.id), {
          status: 'lulus',
          completedLevels: completedSet,
          overallProgress: 100,
          certificateNumber: certNumber,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `certificates/${certNumber}`);
      }
    } else {
      setCertificates((prev) =>
        prev.some((c) => c.certificateNumber === certNumber) ? prev : [certRecord, ...prev],
      );
      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === enr.id
            ? {
                ...e,
                status: 'lulus',
                completedLevels: completedSet,
                overallProgress: 100,
                certificateNumber: certNumber,
                updatedAt: nowIso,
              }
            : e,
        ),
      );
    }

    await logActivity({
      trainingId,
      action: 'TERBIT_SERTIFIKAT',
      targetType: 'certificate',
      targetId: certNumber,
      details: `Sertifikat ${certNumber} diterbitkan otomatis untuk ${currentUser.fullName} setelah menuntaskan Level ${levelNumber}.`,
    });
    showToast('success', `Selamat! Anda dinyatakan LULUS Level ${levelNumber}. Sertifikat ${certNumber} telah diterbitkan.`);
    return { ok: true, message: `Sertifikat ${certNumber} diterbitkan.`, data: certRecord };
  };

  // Unggah / Perbarui Tugas Praktik PID Peserta
  const submitPracticalTask: LmsContextValue['submitPracticalTask'] = async (payload) => {
    if (!currentUser) return { ok: false, message: 'Silakan masuk terlebih dahulu.' };
    const cleanTitle = payload.title.trim().slice(0, 200);
    const cleanDesc = payload.description.trim().slice(0, 3000);
    if (cleanTitle.length < 3 || cleanDesc.length < 10) {
      const msg = 'Judul (min. 3 karakter) dan deskripsi praktik (min. 10 karakter) wajib diisi.';
      showToast('error', msg);
      return { ok: false, message: msg };
    }
    const existing = taskSubmissions.find(
      (s) =>
        s.trainingId === payload.trainingId &&
        s.levelNumber === payload.levelNumber &&
        s.userId === currentUser.uid,
    );
    const id = existing?.id || `sub_${payload.trainingId}_l${payload.levelNumber}_${currentUser.uid}`;
    const nowIso = new Date().toISOString();
    const record: TaskSubmission = {
      id,
      trainingId: payload.trainingId,
      levelNumber: payload.levelNumber,
      userId: currentUser.uid,
      userName: currentUser.fullName.slice(0, 120),
      title: cleanTitle,
      description: cleanDesc,
      productUrl: payload.productUrl.trim().slice(0, 1000),
      productFileName: payload.productFileName.trim().slice(0, 255),
      docMediaUrl: payload.docMediaUrl.trim().slice(0, 1000),
      docMediaName: (payload.docMediaName || '').trim().slice(0, 255),
      status: 'menunggu_penilaian',
      rubricScores: existing?.rubricScores || [],
      weightedScore: existing?.weightedScore || 0,
      facilitatorFeedback: existing?.facilitatorFeedback || '',
      gradedBy: existing?.gradedBy || '',
      gradedByName: existing?.gradedByName || '',
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    if (isLiveDatabase && !activeDemoUid) {
      try {
        if (existing) {
          await updateDoc(doc(db, 'task_submissions', id), {
            title: record.title,
            description: record.description,
            productUrl: record.productUrl,
            productFileName: record.productFileName,
            docMediaUrl: record.docMediaUrl,
            docMediaName: record.docMediaName,
            status: 'menunggu_penilaian',
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'task_submissions', id), {
            ...record,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `task_submissions/${id}`);
      }
    } else {
      setTaskSubmissions((prev) =>
        existing ? prev.map((s) => (s.id === id ? record : s)) : [record, ...prev],
      );
    }

    await logActivity({
      trainingId: payload.trainingId,
      action: existing ? 'REVISI_TUGAS_PRAKTIK' : 'UNGGAH_TUGAS_PRAKTIK',
      targetType: 'task_submission',
      targetId: id,
      details: `${currentUser.fullName} mengunggah produk praktik PID Level ${payload.levelNumber}: "${cleanTitle}".`,
    });
    showToast('success', 'Tugas praktik PID berhasil dikirim dan menunggu penilaian rubrik fasilitator.');
    return { ok: true, message: 'Tugas praktik tersimpan.', data: record };
  };

  // Penilaian Rubrik Praktik Skala 1–4 oleh Fasilitator / Admin
  const gradePracticalTask: LmsContextValue['gradePracticalTask'] = async (payload) => {
    if (
      effectiveRole !== 'super_admin' &&
      effectiveRole !== 'admin_kegiatan' &&
      effectiveRole !== 'fasilitator'
    ) {
      return { ok: false, message: 'Hanya Fasilitator atau Admin yang berwenang menilai rubrik praktik.' };
    }
    const sub = taskSubmissions.find((s) => s.id === payload.submissionId);
    if (!sub) return { ok: false, message: 'Data kiriman praktik tidak ditemukan.' };
    const weightedScore = calculateRubricWeightedScore(payload.rubricScores);
    const nowIso = new Date().toISOString();
    const cleanFeedback = payload.facilitatorFeedback.trim().slice(0, 2000);

    if (isLiveDatabase && isBootstrappedAdmin) {
      try {
        await updateDoc(doc(db, 'task_submissions', sub.id), {
          rubricScores: payload.rubricScores,
          weightedScore,
          status: payload.status,
          facilitatorFeedback: cleanFeedback,
          gradedBy: currentUser?.uid || 'fasilitator',
          gradedByName: (currentUser?.fullName || 'Fasilitator').slice(0, 120),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `task_submissions/${sub.id}`);
      }
    } else {
      setTaskSubmissions((prev) =>
        prev.map((s) =>
          s.id === sub.id
            ? {
                ...s,
                rubricScores: payload.rubricScores,
                weightedScore,
                status: payload.status,
                facilitatorFeedback: cleanFeedback,
                gradedBy: currentUser?.uid || 'fasilitator',
                gradedByName: currentUser?.fullName || 'Fasilitator',
                updatedAt: nowIso,
              }
            : s,
        ),
      );
    }

    await logActivity({
      trainingId: sub.trainingId,
      action: 'PENILAIAN_RUBRIK_PRAKTIK',
      targetType: 'task_submission',
      targetId: sub.id,
      details: `${currentUser?.fullName || 'Fasilitator'} menilai praktik Level ${sub.levelNumber} milik ${sub.userName}: skor rubrik ${weightedScore}/100 (${payload.status}).`,
    });
    showToast(
      'success',
      `Penilaian rubrik untuk ${sub.userName} tersimpan (Skor ${weightedScore}/100 · ${payload.status === 'lulus' ? 'Lulus' : 'Perlu Perbaikan'}).`,
    );
    return { ok: true, message: 'Penilaian rubrik tersimpan.' };
  };

  // Simpan Refleksi Pembelajaran Level SAMR (4 Bagian)
  const saveLevelReflection: LmsContextValue['saveLevelReflection'] = async (payload) => {
    if (!currentUser) return { ok: false, message: 'Silakan masuk terlebih dahulu.' };
    const cleanExp = payload.learningExperience.trim().slice(0, 2000);
    const cleanPlan = payload.schoolImplementationPlan.trim().slice(0, 2000);
    if (cleanExp.length < 5 || cleanPlan.length < 5) {
      const msg = 'Pengalaman belajar dan rencana penerapan di sekolah wajib diisi (min. 5 karakter).';
      showToast('error', msg);
      return { ok: false, message: msg };
    }
    const existing = levelReflections.find(
      (r) =>
        r.trainingId === payload.trainingId &&
        r.levelNumber === payload.levelNumber &&
        r.userId === currentUser.uid,
    );
    const id = existing?.id || `ref_${payload.trainingId}_l${payload.levelNumber}_${currentUser.uid}`;
    const nowIso = new Date().toISOString();
    const record: LevelReflection = {
      id,
      trainingId: payload.trainingId,
      levelNumber: payload.levelNumber,
      userId: currentUser.uid,
      userName: currentUser.fullName.slice(0, 120),
      learningExperience: cleanExp,
      challenges: payload.challenges.trim().slice(0, 2000),
      competenciesGained: payload.competenciesGained.trim().slice(0, 2000),
      schoolImplementationPlan: cleanPlan,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    if (isLiveDatabase && !activeDemoUid) {
      try {
        if (existing) {
          await updateDoc(doc(db, 'level_reflections', id), {
            learningExperience: record.learningExperience,
            challenges: record.challenges,
            competenciesGained: record.competenciesGained,
            schoolImplementationPlan: record.schoolImplementationPlan,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'level_reflections', id), {
            ...record,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `level_reflections/${id}`);
      }
    } else {
      setLevelReflections((prev) =>
        existing ? prev.map((r) => (r.id === id ? record : r)) : [record, ...prev],
      );
    }

    await logActivity({
      trainingId: payload.trainingId,
      action: 'SIMPAN_REFLEKSI_LEVEL',
      targetType: 'level_reflection',
      targetId: id,
      details: `${currentUser.fullName} menyimpan refleksi pembelajaran Level ${payload.levelNumber}.`,
    });
    showToast('success', `Refleksi pembelajaran Level ${payload.levelNumber} berhasil disimpan.`);
    return { ok: true, message: 'Refleksi tersimpan.', data: record };
  };

  const createAnnouncement: LmsContextValue['createAnnouncement'] = async (
    trainingId,
    title,
    body,
  ) => {
    if (!currentUser) return { ok: false, message: 'Belum login.' };
    const id = makeId('ann');
    const nowIso = new Date().toISOString();
    const record: AnnouncementRecord = {
      id,
      trainingId,
      title: title.trim(),
      body: body.trim(),
      authorUid: currentUser.uid,
      authorName: currentUser.fullName,
      isPublished: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    if (isLiveDatabase && isBootstrappedAdmin) {
      try {
        await setDoc(doc(db, 'announcements', id), {
          ...record,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `announcements/${id}`);
      }
    } else {
      setAnnouncements((prev) => [record, ...prev]);
    }
    showToast('success', 'Pengumuman dipublikasikan.');
    return { ok: true, message: 'Pengumuman diterbitkan.' };
  };

  const createSchedule: LmsContextValue['createSchedule'] = async (payload) => {
    if (effectiveRole !== 'super_admin' && effectiveRole !== 'admin_kegiatan') {
      return { ok: false, message: 'Hanya Admin yang dapat mengelola jadwal kegiatan.' };
    }
    const cleanTitle = payload.title.trim().slice(0, 200);
    if (cleanTitle.length < 2) {
      showToast('error', 'Judul sesi jadwal minimal 2 karakter.');
      return { ok: false, message: 'Judul sesi jadwal minimal 2 karakter.' };
    }
    const id = makeId('sch');
    const nowIso = new Date().toISOString();
    const record: TrainingSchedule = {
      id,
      trainingId: payload.trainingId,
      levelNumber: Math.max(0, Math.min(4, Math.round(Number(payload.levelNumber) || 0))),
      title: cleanTitle,
      sessionDate: payload.sessionDate.slice(0, 30),
      startTime: payload.startTime.slice(0, 20),
      endTime: payload.endTime.slice(0, 20),
      facilitatorName: payload.facilitatorName.trim().slice(0, 120),
      mode: payload.mode,
      locationOrUrl: payload.locationOrUrl.trim().slice(0, 500),
      notes: payload.notes.trim().slice(0, 1000),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    if (isLiveDatabase && isBootstrappedAdmin) {
      try {
        await setDoc(doc(db, 'training_schedules', id), {
          ...record,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `training_schedules/${id}`);
      }
    } else {
      setSchedules((prev) => [...prev, record]);
    }
    await logActivity({
      trainingId: payload.trainingId,
      action: 'TAMBAH_JADWAL',
      targetType: 'training_schedule',
      targetId: id,
      details: `Menambahkan jadwal "${record.title}" pada ${record.sessionDate}.`,
    });
    showToast('success', 'Jadwal pembelajaran berhasil ditambahkan.');
    return { ok: true, message: 'Jadwal ditambahkan.' };
  };

  const deleteSchedule: LmsContextValue['deleteSchedule'] = async (scheduleId) => {
    if (effectiveRole !== 'super_admin' && effectiveRole !== 'admin_kegiatan') {
      return { ok: false, message: 'Tidak berwenang menghapus jadwal.' };
    }
    if (isLiveDatabase && isBootstrappedAdmin) {
      try {
        await deleteDoc(doc(db, 'training_schedules', scheduleId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `training_schedules/${scheduleId}`);
      }
    } else {
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    }
    showToast('success', 'Jadwal pembelajaran dihapus.');
    return { ok: true, message: 'Jadwal dihapus.' };
  };

  const createFacilitatorNote: LmsContextValue['createFacilitatorNote'] = async (payload) => {
    if (
      effectiveRole !== 'super_admin' &&
      effectiveRole !== 'admin_kegiatan' &&
      effectiveRole !== 'fasilitator'
    ) {
      return { ok: false, message: 'Hanya Fasilitator atau Admin yang dapat menulis catatan pembelajaran.' };
    }
    if (!currentUser) return { ok: false, message: 'Sesi pengguna tidak ditemukan.' };
    const cleanContent = payload.content.trim().slice(0, 1500);
    if (cleanContent.length < 2) {
      showToast('error', 'Isi catatan minimal 2 karakter.');
      return { ok: false, message: 'Isi catatan minimal 2 karakter.' };
    }
    const id = makeId('note');
    const nowIso = new Date().toISOString();
    const record: FacilitatorNote = {
      id,
      trainingId: payload.trainingId,
      levelNumber: Math.max(0, Math.min(4, Math.round(Number(payload.levelNumber) || 1))),
      participantUid: payload.participantUid || 'all',
      participantName: (payload.participantName || 'Semua Peserta').slice(0, 120),
      authorUid: currentUser.uid,
      authorName: currentUser.fullName.slice(0, 120),
      content: cleanContent,
      createdAt: nowIso,
    };
    if (isLiveDatabase && isBootstrappedAdmin) {
      try {
        await setDoc(doc(db, 'facilitator_notes', id), {
          ...record,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `facilitator_notes/${id}`);
      }
    } else {
      setFacilitatorNotes((prev) => [record, ...prev]);
    }
    await logActivity({
      trainingId: payload.trainingId,
      action: 'CATATAN_FASILITATOR',
      targetType: 'facilitator_note',
      targetId: id,
      details: `${currentUser.fullName} mengirim catatan pembelajaran untuk ${record.participantName} (Level ${record.levelNumber}).`,
    });
    showToast('success', 'Catatan & umpan balik pembelajaran berhasil dikirim.');
    return { ok: true, message: 'Catatan tersimpan.' };
  };

  const updateInstitutionSettings: LmsContextValue['updateInstitutionSettings'] = async (patch) => {
    if (effectiveRole !== 'super_admin') {
      return { ok: false, message: 'Hanya Super Admin yang berwenang mengubah identitas lembaga.' };
    }
    const nowIso = new Date().toISOString();
    const record: InstitutionSettings = {
      id: 'default',
      appName: patch.appName.trim().slice(0, 120) || 'PAMANDAI DIGITALISASI PEMBELAJARAN',
      tagline: patch.tagline.trim().slice(0, 200),
      institutionName: patch.institutionName.trim().slice(0, 180) || 'Lembaga Pelatihan',
      address: patch.address.trim().slice(0, 300),
      website: patch.website.trim().slice(0, 200),
      supportEmail: patch.supportEmail.trim().slice(0, 160),
      certificatePrefix: patch.certificatePrefix.trim().toUpperCase().slice(0, 30) || 'PMD',
      updatedAt: nowIso,
    };
    if (isLiveDatabase && isBootstrappedAdmin) {
      try {
        await setDoc(doc(db, 'institution_settings', 'default'), {
          ...record,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'institution_settings/default');
      }
    } else {
      setInstitutionSettings(record);
    }
    await logActivity({
      action: 'UBAH_IDENTITAS_LEMBAGA',
      targetType: 'institution_settings',
      targetId: 'default',
      details: `Memperbarui identitas lembaga (${record.institutionName}) dan konfigurasi aplikasi.`,
    });
    showToast('success', 'Identitas lembaga & konfigurasi aplikasi berhasil disimpan.');
    return { ok: true, message: 'Pengaturan lembaga disimpan.' };
  };

  const lookupCertificatePublic: LmsContextValue['lookupCertificatePublic'] = async (certNo) => {
    const clean = certNo.trim();
    if (!clean) return null;
    try {
      const snap = await getDoc(doc(db, 'certificates', clean));
      if (snap.exists()) {
        const d = snap.data();
        return {
          certificateNumber: String(d.certificateNumber || snap.id),
          trainingId: String(d.trainingId || ''),
          trainingName: String(d.trainingName || ''),
          organizer: String(d.organizer || ''),
          userId: String(d.userId || ''),
          participantName: String(d.participantName || ''),
          completedLevel: Number(d.completedLevel || 4),
          issuedDate: String(d.issuedDate || ''),
          signerName: String(d.signerName || ''),
          signerTitle: String(d.signerTitle || ''),
          status: (d.status as 'valid' | 'dicabut') || 'valid',
          createdAt: tsToIso(d.createdAt),
        };
      }
    } catch {
      // Fallback ke data lokal jika belum tersinkron atau dalam mode uji lokal
    }
    return certificates.find((c) => c.certificateNumber.toLowerCase() === clean.toLowerCase()) || null;
  };

  const value: LmsContextValue = {
    authReady,
    firebaseUser,
    isLiveDatabase,
    isBootstrappedAdmin,
    isDemoMode,
    currentUser,
    effectiveRole,
    activeDemoUid,
    seedingBusy,
    toast,
    clearToast,
    showToast,
    profiles,
    trainings,
    levels,
    materials,
    questionBanks,
    answerKeys,
    enrollments,
    materialProgress,
    attempts,
    taskSubmissions,
    levelReflections,
    certificates,
    announcements,
    activityLogs,
    schedules,
    facilitatorNotes,
    institutionSettings,
    loginWithGoogle,
    loginWithEmailDemo,
    enterDemoAccount,
    switchSimulatedUser,
    logout,
    seedCloudFirestore,
    registerParticipantSelf,
    updateOwnProfile,
    createAccountByAdmin,
    toggleAccountActive,
    updateAccountRole,
    importParticipantsFromExcel,
    createTraining,
    updateTraining,
    deleteTraining,
    updateScoreRanges,
    updateLearningLevel,
    enrollInTraining,
    approveOrRejectEnrollment,
    adminOverrideLevel,
    saveMaterial,
    deleteMaterial,
    markMaterialProgress,
    saveQuestionBank,
    submitBankAttempt,
    gradeManualAttempt,
    verifyAndUnlockLevel,
    submitPracticalTask,
    gradePracticalTask,
    saveLevelReflection,
    createAnnouncement,
    createSchedule,
    deleteSchedule,
    createFacilitatorNote,
    updateInstitutionSettings,
    lookupCertificatePublic,
  };

  return <LmsContext.Provider value={value}>{children}</LmsContext.Provider>;
}

export function useLms(): LmsContextValue {
  const ctx = useContext(LmsContext);
  if (!ctx) {
    throw new Error('useLms harus dipanggil di dalam LmsProvider');
  }
  return ctx;
}
