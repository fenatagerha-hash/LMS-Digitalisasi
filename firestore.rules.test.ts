/**
 * Security Rules Verification Specification (Dirty Dozen Adversarial Suite)
 * Mirrors the 12 adversarial payloads defined in security_spec.md.
 * Run against the Firebase Emulator Suite (`firebase emulators:exec`).
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  actor: { uid: string | null; email?: string; email_verified?: boolean };
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Privilege Escalation on Registration',
    collectionPath: 'profiles/user_peserta_1',
    operation: 'create',
    actor: { uid: 'user_peserta_1', email: 'peserta1@example.com', email_verified: true },
    payload: {
      uid: 'user_peserta_1',
      fullName: 'Penyerang',
      email: 'peserta1@example.com',
      phone: '08123456789',
      instansi: 'Dinas X',
      kabupatenKota: 'Bandung',
      jabatan: 'Staf',
      role: 'super_admin',
      isActive: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow Role Update',
    collectionPath: 'profiles/user_peserta_1',
    operation: 'update',
    actor: { uid: 'user_peserta_1', email: 'peserta1@example.com', email_verified: true },
    payload: { fullName: 'Budi', role: 'admin_kegiatan' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'PII Cross-Read',
    collectionPath: 'profiles/user_peserta_1',
    operation: 'get',
    actor: { uid: 'user_peserta_2', email: 'peserta2@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Answer Key Theft',
    collectionPath: 'answer_keys/bank_asesmen_01',
    operation: 'get',
    actor: { uid: 'user_peserta_1', email: 'peserta1@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Self-Approved Enrollment',
    collectionPath: 'training_enrollments/enr_fake_01',
    operation: 'create',
    actor: { uid: 'user_peserta_1', email: 'peserta1@example.com', email_verified: true },
    payload: {
      id: 'enr_fake_01',
      trainingId: 'trn_01',
      userId: 'user_peserta_1',
      userName: 'Budi',
      instansi: 'Dinas X',
      kabupatenKota: 'Bandung',
      status: 'disetujui',
      startingLevel: 4,
      currentLevel: 4,
      unlockedLevels: [1, 2, 3, 4],
      completedLevels: [],
      assessmentScore: 95,
      overallProgress: 0,
      certificateNumber: '',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Orphaned Enrollment',
    collectionPath: 'training_enrollments/enr_orphan_01',
    operation: 'create',
    actor: { uid: 'user_peserta_1', email: 'peserta1@example.com', email_verified: true },
    payload: {
      id: 'enr_orphan_01',
      trainingId: 'trn_nonexistent_999',
      userId: 'user_peserta_1',
      userName: 'Budi',
      status: 'menunggu',
      startingLevel: 0,
      currentLevel: 0,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Sequential Level Jump (1 -> 4)',
    collectionPath: 'training_enrollments/enr_active_01',
    operation: 'update',
    actor: { uid: 'user_peserta_1', email: 'peserta1@example.com', email_verified: true },
    payload: { currentLevel: 4, unlockedLevels: [1, 4] },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Score Tampering on Attempt',
    collectionPath: 'attempts/att_quiz_01',
    operation: 'update',
    actor: { uid: 'user_peserta_1', email: 'peserta1@example.com', email_verified: true },
    payload: { finalScore: 100, percentage: 100, passed: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Terminal Graduation Tampering',
    collectionPath: 'training_enrollments/enr_lulus_01',
    operation: 'update',
    actor: { uid: 'user_peserta_1', email: 'peserta1@example.com', email_verified: true },
    payload: { overallProgress: 50 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Audit Log Erasure',
    collectionPath: 'activity_logs/log_01',
    operation: 'delete',
    actor: { uid: 'admin_1', email: 'fenatagerha@gmail.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Public Certificate Scraping',
    collectionPath: 'certificates',
    operation: 'list',
    actor: { uid: null },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Email Spoof & Ghost Field Injection',
    collectionPath: 'profiles/user_peserta_1',
    operation: 'update',
    actor: { uid: 'attacker', email: 'fenatagerha@gmail.com', email_verified: false },
    payload: { fullName: 'Spoof', isVerified: true },
    expected: 'PERMISSION_DENIED',
  },
];
