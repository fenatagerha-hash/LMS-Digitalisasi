import {
  ActivityLogRecord,
  AnnouncementRecord,
  AnswerKeyDocument,
  AttemptRecord,
  CertificateRecord,
  DEFAULT_SCORE_RANGES,
  FacilitatorNote,
  InstitutionSettings,
  LearningLevel,
  LearningMaterial,
  LevelReflection,
  MaterialProgress,
  QuestionBank,
  TaskSubmission,
  TrainingEnrollment,
  TrainingProgram,
  TrainingSchedule,
  UserProfile,
} from '../types/lms';

export const ASSET_HERO_PID_SAMR = '/src/assets/images/hero_pid_samr_classroom_1795147097851.jpg';
export const ASSET_HERO_TRAINING = '/src/assets/images/hero_lms_training_1795100978420.jpg';
export const ASSET_BANNER_LITERASI = '/src/assets/images/banner_literasi_digital_1795100936836.jpg';
export const ASSET_CERT_SEAL = '/src/assets/images/seal_sertifikat_lms_1795100937028.jpg';

const BASE_ISO = '2026-10-15T08:00:00.000Z';

export const DEFAULT_INSTITUTION_SETTINGS: InstitutionSettings = {
  id: 'default',
  appName: 'LMS PELATIHAN DIGITALISASI PEMBELAJARAN',
  tagline: 'Platform Peningkatan Kompetensi Guru Berbasis Model SAMR',
  institutionName: 'Balai Pengembangan Kompetensi Guru & Digitalisasi Pembelajaran',
  address: 'Jl. Merdeka Selatan No. 18, Jakarta Pusat 10110',
  website: 'https://lms-samr-pid.belajar.id',
  supportEmail: 'layanan@lms-samr-pid.belajar.id',
  certificatePrefix: 'SAMR',
  updatedAt: BASE_ISO,
};

export interface SeedDataset {
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
}

const PARTICIPANT_SEEDS: Array<{
  uid: string;
  name: string;
  email: string;
  instansi: string;
  kota: string;
  jabatan: string;
  jenjang: string;
  mapel: string;
  statusPeserta: string;
  t1Status: 'menunggu' | 'disetujui' | 'aktif' | 'lulus';
  t1Score: number;
  t1Start: number;
  t1Curr: number;
  t1Done: number[];
}> = [
  { uid: 'peserta_01', name: 'Aulia Rahmawati, S.Pd.', email: 'aulia.rahmawati@guru.belajar.id', instansi: 'SDN 04 Coblong', kota: 'Bandung', jabatan: 'Guru Kelas', jenjang: 'SD', mapel: 'Tematik / IPAS', statusPeserta: 'Guru PNS', t1Status: 'aktif', t1Score: 30, t1Start: 1, t1Curr: 1, t1Done: [] },
  { uid: 'peserta_02', name: 'Bagas Prakoso, M.Pd.', email: 'bagas.prakoso@guru.belajar.id', instansi: 'SMPN 19 Jakarta', kota: 'Jakarta Pusat', jabatan: 'Guru Mata Pelajaran', jenjang: 'SMP', mapel: 'Matematika', statusPeserta: 'Guru PPPK', t1Status: 'aktif', t1Score: 52, t1Start: 2, t1Curr: 2, t1Done: [] },
  { uid: 'peserta_03', name: 'Citra Dewi Lestari, S.Si.', email: 'citra.lestari@guru.belajar.id', instansi: 'SMAN 3 Yogyakarta', kota: 'Yogyakarta', jabatan: 'Guru Penggerak', jenjang: 'SMA', mapel: 'Fisika', statusPeserta: 'Guru PNS', t1Status: 'aktif', t1Score: 74, t1Start: 3, t1Curr: 3, t1Done: [] },
  { uid: 'peserta_04', name: 'Dimas Saputra, M.Kom.', email: 'dimas.saputra@guru.belajar.id', instansi: 'SMKN 2 Surabaya', kota: 'Surabaya', jabatan: 'Guru Produktif RPL', jenjang: 'SMK', mapel: 'Informatika', statusPeserta: 'Guru PNS', t1Status: 'lulus', t1Score: 90, t1Start: 4, t1Curr: 4, t1Done: [4] },
  { uid: 'peserta_05', name: 'Eka Putri Maharani, S.Pd.', email: 'eka.maharani@guru.belajar.id', instansi: 'SMAN 1 Semarang', kota: 'Semarang', jabatan: 'Guru Mata Pelajaran', jenjang: 'SMA', mapel: 'Biologi', statusPeserta: 'Guru PPPK', t1Status: 'lulus', t1Score: 76, t1Start: 3, t1Curr: 4, t1Done: [3, 4] },
  { uid: 'peserta_06', name: 'Fajar Nugroho, S.Pd.', email: 'fajar.nugroho@guru.belajar.id', instansi: 'SMPN 4 Malang', kota: 'Malang', jabatan: 'Wakil Kurikulum', jenjang: 'SMP', mapel: 'IPA Terpadu', statusPeserta: 'Guru PNS', t1Status: 'aktif', t1Score: 58, t1Start: 2, t1Curr: 3, t1Done: [2] },
  { uid: 'peserta_07', name: 'Gita Savitri, S.Pd.', email: 'gita.savitri@guru.belajar.id', instansi: 'SDN 2 Sanur', kota: 'Denpasar', jabatan: 'Guru Kelas', jenjang: 'SD', mapel: 'Bahasa Indonesia', statusPeserta: 'Guru Honorer', t1Status: 'disetujui', t1Score: -1, t1Start: 0, t1Curr: 0, t1Done: [] },
  { uid: 'peserta_08', name: 'Hadi Wibowo, S.T.', email: 'hadi.wibowo@guru.belajar.id', instansi: 'SMKN 1 Medan', kota: 'Medan', jabatan: 'Guru Teknik Elektro', jenjang: 'SMK', mapel: 'Teknik Elektronika', statusPeserta: 'Guru PPPK', t1Status: 'menunggu', t1Score: -1, t1Start: 0, t1Curr: 0, t1Done: [] },
  { uid: 'peserta_09', name: 'Intan Permatasari, M.Pd.', email: 'intan.permata@guru.belajar.id', instansi: 'SMPN 6 Makassar', kota: 'Makassar', jabatan: 'Guru Mata Pelajaran', jenjang: 'SMP', mapel: 'Bahasa Inggris', statusPeserta: 'Guru PNS', t1Status: 'aktif', t1Score: 35, t1Start: 1, t1Curr: 2, t1Done: [1] },
  { uid: 'peserta_10', name: 'Joko Santoso, S.Pd.', email: 'joko.santoso@guru.belajar.id', instansi: 'SDN 012 Samarinda', kota: 'Samarinda', jabatan: 'Guru Kelas', jenjang: 'SD', mapel: 'Matematika SD', statusPeserta: 'Guru PPPK', t1Status: 'aktif', t1Score: 48, t1Start: 2, t1Curr: 2, t1Done: [] },
  { uid: 'peserta_11', name: 'Kartika Sari, M.Pd.', email: 'kartika.sari@guru.belajar.id', instansi: 'SMAN 1 Bekasi', kota: 'Bekasi', jabatan: 'Koordinator Lab Digital', jenjang: 'SMA', mapel: 'Kimia', statusPeserta: 'Guru PNS', t1Status: 'lulus', t1Score: 85, t1Start: 4, t1Curr: 4, t1Done: [4] },
  { uid: 'peserta_12', name: 'Lukman Hakim, S.Pd.', email: 'lukman.hakim@guru.belajar.id', instansi: 'SMKN 5 Surabaya', kota: 'Surabaya', jabatan: 'Guru Produktif', jenjang: 'SMK', mapel: 'Desain Komunikasi Visual', statusPeserta: 'Guru Tetap Yayasan', t1Status: 'aktif', t1Score: 66, t1Start: 3, t1Curr: 3, t1Done: [] },
  { uid: 'peserta_13', name: 'Maya Anggraini, S.Pd.', email: 'maya.anggraini@guru.belajar.id', instansi: 'SDN 1 Banda Aceh', kota: 'Banda Aceh', jabatan: 'Guru Kelas', jenjang: 'SD', mapel: 'Tematik', statusPeserta: 'Guru PPPK', t1Status: 'aktif', t1Score: 28, t1Start: 1, t1Curr: 1, t1Done: [] },
  { uid: 'peserta_14', name: 'Nanda Kurniawan, S.Pd.', email: 'nanda.kurniawan@guru.belajar.id', instansi: 'SMPN 115 Jakarta', kota: 'Jakarta Selatan', jabatan: 'Guru Mata Pelajaran', jenjang: 'SMP', mapel: 'IPS Terpadu', statusPeserta: 'Guru PNS', t1Status: 'disetujui', t1Score: -1, t1Start: 0, t1Curr: 0, t1Done: [] },
  { uid: 'peserta_15', name: 'Olivia Handayani, M.Pd.', email: 'olivia.handayani@guru.belajar.id', instansi: 'SMAN 5 Bandung', kota: 'Bandung', jabatan: 'Guru Mata Pelajaran', jenjang: 'SMA', mapel: 'Geografi', statusPeserta: 'Guru PNS', t1Status: 'aktif', t1Score: 72, t1Start: 3, t1Curr: 4, t1Done: [3] },
  { uid: 'peserta_16', name: 'Prasetyo Utomo, S.Pd.', email: 'prasetyo.utomo@guru.belajar.id', instansi: 'SMKN 7 Semarang', kota: 'Semarang', jabatan: 'Guru Teknik Mesin', jenjang: 'SMK', mapel: 'CAD / Gambar Teknik', statusPeserta: 'Guru PPPK', t1Status: 'menunggu', t1Score: -1, t1Start: 0, t1Curr: 0, t1Done: [] },
  { uid: 'peserta_17', name: 'Qori Amalia, S.Pd.', email: 'qori.amalia@guru.belajar.id', instansi: 'SMPN 1 Sleman', kota: 'Sleman', jabatan: 'Guru Informatika', jenjang: 'SMP', mapel: 'Informatika', statusPeserta: 'Guru PNS', t1Status: 'aktif', t1Score: 55, t1Start: 2, t1Curr: 2, t1Done: [] },
  { uid: 'peserta_18', name: 'Reza Mahendra, M.Pd.', email: 'reza.mahendra@guru.belajar.id', instansi: 'SMAN 8 Pekanbaru', kota: 'Pekanbaru', jabatan: 'Guru Mata Pelajaran', jenjang: 'SMA', mapel: 'Ekonomi', statusPeserta: 'Guru PNS', t1Status: 'aktif', t1Score: 82, t1Start: 4, t1Curr: 4, t1Done: [] },
  { uid: 'peserta_19', name: 'Sinta Nurhaliza, M.Pd.', email: 'sinta.nurhaliza@guru.belajar.id', instansi: 'SMAN 2 Bogor', kota: 'Bogor', jabatan: 'Guru Penggerak', jenjang: 'SMA', mapel: 'Bahasa Indonesia', statusPeserta: 'Guru PNS', t1Status: 'lulus', t1Score: 62, t1Start: 3, t1Curr: 4, t1Done: [3, 4] },
  { uid: 'peserta_20', name: 'Taufik Hidayatullah, S.Pd.', email: 'taufik.hidayat@guru.belajar.id', instansi: 'SDN 3 Mataram', kota: 'Mataram', jabatan: 'Guru Kelas', jenjang: 'SD', mapel: 'PJOK & IPAS', statusPeserta: 'Guru PPPK', t1Status: 'aktif', t1Score: 38, t1Start: 1, t1Curr: 1, t1Done: [] },
];

export function buildSeedDataset(): SeedDataset {
  const staffProfiles: UserProfile[] = [
    {
      uid: 'super_admin_01',
      fullName: 'Raka Pratama (Super Admin) [DEMO]',
      email: 'fenatagerha@gmail.com',
      phone: '08111000001',
      instansi: 'Balai Pengembangan Kompetensi Guru & Digitalisasi Pembelajaran',
      kabupatenKota: 'Jakarta Pusat',
      jabatan: 'Kepala Arsitektur Platform LMS SAMR',
      jenjangPendidikan: 'Lainnya',
      mataPelajaran: 'Manajemen LMS',
      statusPeserta: 'Pengelola Program',
      role: 'super_admin',
      isActive: true,
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      uid: 'admin_keg_01',
      fullName: 'Dewi Anggraeni [DEMO]',
      email: 'dewi.admin@lmsdigital.id',
      phone: '08111000011',
      instansi: 'Balai Pengembangan Kompetensi Guru & Digitalisasi Pembelajaran',
      kabupatenKota: 'Jakarta Pusat',
      jabatan: 'Admin Kegiatan Pelatihan PID SAMR',
      jenjangPendidikan: 'Lainnya',
      mataPelajaran: 'Koordinasi Pelatihan',
      statusPeserta: 'Pengelola Program',
      role: 'admin_kegiatan',
      isActive: true,
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      uid: 'admin_keg_02',
      fullName: 'Arif Budiman [DEMO]',
      email: 'arif.admin@lmsdigital.id',
      phone: '08111000012',
      instansi: 'Direktorat Inovasi Pembelajaran Digital',
      kabupatenKota: 'Bandung',
      jabatan: 'Admin Kegiatan Literasi Data',
      jenjangPendidikan: 'Lainnya',
      mataPelajaran: 'Koordinasi Pelatihan',
      statusPeserta: 'Pengelola Program',
      role: 'admin_kegiatan',
      isActive: true,
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      uid: 'fasilitator_01',
      fullName: 'Dr. Budi Hartono [DEMO]',
      email: 'budi.fasilitator@lmsdigital.id',
      phone: '08111000021',
      instansi: 'Balai Guru Penggerak Jawa Barat',
      kabupatenKota: 'Bandung',
      jabatan: 'Fasilitator PID Level Substitution & Augmentation',
      jenjangPendidikan: 'SMA',
      mataPelajaran: 'Teknologi Pembelajaran',
      statusPeserta: 'Widyaiswara',
      role: 'fasilitator',
      isActive: true,
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      uid: 'fasilitator_02',
      fullName: 'Nadia Kusumawati, M.Pd. [DEMO]',
      email: 'nadia.fasilitator@lmsdigital.id',
      phone: '08111000022',
      instansi: 'Pusat Kurikulum & Pembelajaran Digital',
      kabupatenKota: 'Jakarta Selatan',
      jabatan: 'Fasilitator PID Level Modification & Redefinition',
      jenjangPendidikan: 'SMA',
      mataPelajaran: 'Desain Pembelajaran SAMR',
      statusPeserta: 'Widyaiswara',
      role: 'fasilitator',
      isActive: true,
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      uid: 'fasilitator_03',
      fullName: 'Yusuf Ramadhan, M.Sc. [DEMO]',
      email: 'yusuf.fasilitator@lmsdigital.id',
      phone: '08111000023',
      instansi: 'Pusat Analitik Pendidikan',
      kabupatenKota: 'Yogyakarta',
      jabatan: 'Fasilitator Literasi Data & Asesmen',
      jenjangPendidikan: 'SMK',
      mataPelajaran: 'Informatika & Data',
      statusPeserta: 'Widyaiswara',
      role: 'fasilitator',
      isActive: true,
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      uid: 'fasilitator_04',
      fullName: 'Larasati Wulandari, M.Pd. [DEMO]',
      email: 'larasati.fasilitator@lmsdigital.id',
      phone: '08111000024',
      instansi: 'Direktorat Inovasi Pembelajaran Digital',
      kabupatenKota: 'Surabaya',
      jabatan: 'Fasilitator Evaluasi & Rubrik Praktik',
      jenjangPendidikan: 'SMP',
      mataPelajaran: 'Evaluasi Pembelajaran',
      statusPeserta: 'Widyaiswara',
      role: 'fasilitator',
      isActive: true,
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      uid: 'pemantau_01',
      fullName: 'Ir. Bambang Suryadi [DEMO]',
      email: 'bambang.pemantau@lmsdigital.id',
      phone: '08111000031',
      instansi: 'Inspektorat Penjaminan Mutu Pendidikan',
      kabupatenKota: 'Jakarta Pusat',
      jabatan: 'Supervisor Penjaminan Mutu Pelatihan',
      jenjangPendidikan: 'Lainnya',
      mataPelajaran: 'Penjaminan Mutu',
      statusPeserta: 'Pengawas Sekolah',
      role: 'pemantau',
      isActive: true,
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      uid: 'pemantau_02',
      fullName: 'Sri Wahyuningsih, M.Si. [DEMO]',
      email: 'sri.pemantau@lmsdigital.id',
      phone: '08111000032',
      instansi: 'Badan Akreditasi & Evaluasi Kompetensi Guru',
      kabupatenKota: 'Semarang',
      jabatan: 'Evaluator Program Nasional',
      jenjangPendidikan: 'Lainnya',
      mataPelajaran: 'Monitoring & Evaluasi',
      statusPeserta: 'Pengawas Sekolah',
      role: 'pemantau',
      isActive: true,
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
  ];

  const participantProfiles: UserProfile[] = PARTICIPANT_SEEDS.map((p, idx) => ({
    uid: p.uid,
    fullName: p.name,
    email: p.email,
    phone: `08123456${String(1000 + idx)}`,
    instansi: p.instansi,
    kabupatenKota: p.kota,
    jabatan: p.jabatan,
    jenjangPendidikan: p.jenjang,
    mataPelajaran: p.mapel,
    statusPeserta: p.statusPeserta,
    role: 'peserta',
    isActive: true,
    createdAt: BASE_ISO,
    updatedAt: BASE_ISO,
  }));

  const profiles = [...staffProfiles, ...participantProfiles];

  const trainings: TrainingProgram[] = [
    {
      id: 'trn_digital_01',
      code: 'SAMR-PID-2026',
      name: 'Pemanfaatan Digitalisasi Pembelajaran — Papan Interaktif Digital (PID) [DEMO]',
      description:
        'Program peningkatan kompetensi guru berbasis model SAMR (Substitution, Augmentation, Modification, Redefinition) khusus untuk kegiatan Pemanfaatan Digitalisasi Pembelajaran menggunakan Papan Interaktif Digital (PID) di kelas.',
      organizer: 'Balai Pengembangan Kompetensi Guru & Digitalisasi Pembelajaran',
      startDate: '2026-10-01',
      endDate: '2026-12-20',
      location: 'Hybrid — Ruang Praktik PID & Platform LMS',
      executionMode: 'hybrid',
      quota: 120,
      status: 'aktif',
      requireApproval: true,
      bannerUrl: ASSET_HERO_PID_SAMR,
      scoreRanges: DEFAULT_SCORE_RANGES,
      adminUids: ['admin_keg_01'],
      facilitatorUids: ['fasilitator_01', 'fasilitator_02'],
      monitorUids: ['pemantau_01', 'pemantau_02'],
      signerName: 'Dr. Hendra Kusuma, M.Pd.',
      signerTitle: 'Kepala Balai Pengembangan Kompetensi Guru',
      visibility: 'public_catalog',
      usesSamrLevels: true,
      progressionPolicy: 'sequential',
      guidelines:
        '1. Kerjakan Asesmen Awal Kompetensi untuk memetakan level SAMR awal Anda (Level 1 Substitution hingga Level 4 Redefinition).\n2. Level di bawah level rekomendasi Anda berstatus Tidak Diwajibkan sehingga Anda dapat langsung fokus pada level sesuai kebutuhan.\n3. Di setiap level, tuntaskan 8 komponen: Orientasi, Materi, Demonstrasi PID, Tugas Praktik (dinilai rubrik skala 1–4), Kuis Pemahaman, Evaluasi Kompetensi, Refleksi, dan Verifikasi Kelulusan.\n4. Nilai kelulusan minimum kuis dan evaluasi default adalah 75. Setelah lulus Level 4, sertifikat digital ber-QR akan diterbitkan otomatis.',
      certTemplateTitle: 'SERTIFIKAT KOMPETENSI MODEL SAMR',
      certTemplateSubtitle:
        'Telah menuntaskan Pelatihan Pemanfaatan Papan Interaktif Digital berbasis Model SAMR.',
      certAccentColor: 'navy',
      certLogoUrl: '',
      createdBy: 'super_admin_01',
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      id: 'trn_data_02',
      code: 'ASESMEN-DIG-2026',
      name: 'Desain Asesmen Digital & Analitik Kelas Interaktif [DEMO]',
      description:
        'Pelatihan lanjutan bagi guru dan pengawas sekolah dalam merancang asesmen formatif digital, menganalisis hasil belajar siswa, dan menyusun tindak lanjut diferensiasi menggunakan alur modul berurutan (non-SAMR).',
      organizer: 'Direktorat Inovasi Pembelajaran Digital',
      startDate: '2026-11-01',
      endDate: '2027-01-30',
      location: 'Daring — Platform LMS PAMANDAI EDU',
      executionMode: 'daring',
      quota: 80,
      status: 'aktif',
      requireApproval: false,
      bannerUrl: ASSET_BANNER_LITERASI,
      scoreRanges: DEFAULT_SCORE_RANGES,
      adminUids: ['admin_keg_02', 'admin_keg_01'],
      facilitatorUids: ['fasilitator_03', 'fasilitator_04'],
      monitorUids: ['pemantau_02'],
      signerName: 'Prof. Dr. Ratna Wijaya, M.Pd.',
      signerTitle: 'Direktur Inovasi Pembelajaran Digital',
      visibility: 'public_catalog',
      usesSamrLevels: false,
      progressionPolicy: 'sequential',
      guidelines:
        '1. Pelatihan ini menggunakan alur modul berurutan standar PAMANDAI EDU (Memahami Konteks, Eksplorasi Materi, Nalar Kritis, Diskusi dan Kolaborasi, Analisis Hasil Diskusi, serta Latihan dan Berkarya).\n2. Seluruh materi dan aktivitas dapat diakses berurutan tanpa penguncian level SAMR.\n3. Kerjakan Pretest, pelajari materi, ikuti diskusi, dan selesaikan Kuis serta Evaluasi Akhir untuk memperoleh sertifikat.',
      certTemplateTitle: 'SERTIFIKAT KOMPETENSI ASESMEN DIGITAL',
      certTemplateSubtitle:
        'Dinyatakan memenuhi capaian kompetensi Desain Asesmen Digital & Analitik Kelas Interaktif.',
      certAccentColor: 'blue',
      certLogoUrl: '',
      createdBy: 'super_admin_01',
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
  ];

  const levels: LearningLevel[] = [
    // Kegiatan 1: Pelatihan PID Berbasis Model SAMR
    {
      id: 'lvl_trn01_1',
      trainingId: 'trn_digital_01',
      levelNumber: 1,
      title: 'Level 1 — Substitution (Substitusi PID)',
      slug: 'dasar',
      description:
        'Pemanfaatan Papan Interaktif Digital sebagai pengganti langsung papan tulis konvensional tanpa perubahan mendasar pada metode mengajar.',
      learningObjectives:
        'Mengoperasikan fungsi dasar PID (kalibrasi, pena digital, penghapus, penayangan slide/PDF) secara lancar dan ergonomis di depan kelas.',
      learningOutcomes:
        'Peserta menghasilkan 1 materi ajar digital teranotasi serta foto dokumentasi praktik dasar penggunaan PID di kelas.',
      facilitatorUid: 'fasilitator_01',
      facilitatorName: 'Dr. Budi Hartono [DEMO]',
      durationHours: 8,
      minQuizScore: 75,
      minEvaluationScore: 75,
      demoGuide:
        '1. Nyalakan panel PID, pilih sumber input (Android OS internal atau HDMI laptop), lalu lakukan kalibrasi sentuhan 4 titik.\n2. Buka aplikasi Whiteboard bawaan PID, pilih ketebalan pena, warna kontras tinggi (navy/hitam di latar putih), dan aktifkan penggaris/bentuk geometri.\n3. Impor file PDF/PPT bahan ajar ke layar PID, berikan anotasi poin penting di atas slide, lalu simpan tangkapan layar ke folder kelas sebagai catatan siswa.',
      demoVideoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
      taskInstructions:
        'Siapkan 1 bahan ajar digital (slide presentasi atau lembar PDF minimal 5 halaman) yang telah diberi anotasi langsung menggunakan Papan Interaktif Digital, dilengkapi minimal 1 foto atau tautan video singkat (1–2 menit) saat Anda mengoperasikan PID.',
      taskSteps:
        '1. Pilih 1 topik pelajaran yang Anda ampu.\n2. Tampilkan bahan ajar di layar PID dan tambahkan anotasi penjelasan menggunakan pena digital.\n3. Ekspor hasil anotasi menjadi PDF/gambar dan ambil dokumentasi foto/video singkat.\n4. Unggah tautan produk dan dokumentasi pada formulir Tugas Praktik di bawah ini.',
      taskSampleOutput:
        'Slide Materi Pecahan Senilai (PDF 6 halaman teranotasi PID) + Foto praktik menyorot konsep di layar PID.',
      requirePracticeValidation: true,
      isActive: true,
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      id: 'lvl_trn01_2',
      trainingId: 'trn_digital_01',
      levelNumber: 2,
      title: 'Level 2 — Augmentation (Augmentasi PID)',
      slug: 'berkembang',
      description:
        'Pemanfaatan fitur fungsional PID (multimedia terintegrasi, anotasi interaktif, pemutaran video, simulasi 2D/3D, dan kuis langsung) untuk meningkatkan efektivitas penyampaian materi.',
      learningObjectives:
        'Merancang penyajian materi interaktif yang memadukan video, diagram bergerak, dan kuis cepat secara terpadu pada layar PID.',
      learningOutcomes:
        'Peserta menghasilkan paket media ajar interaktif berbasis PID beserta panduan penggunaannya di kelas.',
      facilitatorUid: 'fasilitator_01',
      facilitatorName: 'Dr. Budi Hartono [DEMO]',
      durationHours: 10,
      minQuizScore: 75,
      minEvaluationScore: 75,
      demoGuide:
        '1. Aktifkan mode Split-Screen pada PID: sisi kiri menampilkan simulasi interaktif (mis. PhET / GeoGebra), sisi kanan menampilkan papan anotasi rumus.\n2. Sisipkan video eksperimen berdurasi 2 menit, lakukan jeda pada detik kunci untuk mencoret diagram gaya/alur langsung di atas bingkai video.\n3. Jalankan kuis cepat 3 soal melalui QR Code di layar PID agar seluruh siswa langsung menjawab dan melihat grafik pemahaman kelas secara real-time.',
      demoVideoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
      taskInstructions:
        'Buat 1 bahan ajar interaktif (mengintegrasikan minimal 1 multimedia/simulasi + fitur anotasi PID + 1 aktivitas kuis interaktif langsung) beserta dokumentasi uji coba di kelas/microteaching.',
      taskSteps:
        '1. Rancang alur penyajian 15 menit menggunakan mode split-screen atau multimedia tersemat pada PID.\n2. Integrasikan kuis cepat interaktif untuk mengecek pemahaman siswa.\n3. Rekam/dokumentasikan praktik penggunaan fitur augmentasi PID.\n4. Unggah tautan bahan ajar interaktif dan dokumentasi praktik.',
      taskSampleOutput:
        'Presentasi Interaktif Rangkaian Listrik + Simulasi PhET + Kuis QR 5 soal dengan rekap hasil instan.',
      requirePracticeValidation: true,
      isActive: true,
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      id: 'lvl_trn01_3',
      trainingId: 'trn_digital_01',
      levelNumber: 3,
      title: 'Level 3 — Modification (Modifikasi Pembelajaran)',
      slug: 'lanjut',
      description:
        'Merancang ulang aktivitas pembelajaran secara signifikan melalui kolaborasi multi-sentuh siswa pada PID, peta konsep bersama, pemecahan masalah kelompok, dan umpan balik real-time.',
      learningObjectives:
        'Mendesain skenario pembelajaran kolaboratif berpusat pada siswa di mana PID berfungsi sebagai ruang kerja bersama.',
      learningOutcomes:
        'Peserta menyusun RPP/Modul Ajar berbasis PID Level Modifikasi beserta bukti kolaborasi siswa.',
      facilitatorUid: 'fasilitator_02',
      facilitatorName: 'Nadia Kusumawati, M.Pd. [DEMO]',
      durationHours: 12,
      minQuizScore: 75,
      minEvaluationScore: 75,
      demoGuide:
        '1. Bagi kanvas PID menjadi 4 zona kerja kelompok (multi-touch / papan kolaboratif daring yang ditampilkan di PID).\n2. Siswa mengirim ide, foto hasil percobaan, atau grafik kelompok dari perangkat mereka ke layar PID secara serentak.\n3. Fasilitasi sesi umpan balik sejawat: kelompok lain memberi catatan tempel digital (sticky notes) dan memperbaiki argumen secara langsung di depan kelas.',
      demoVideoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
      taskInstructions:
        'Susun RPP/Modul Ajar (1 pertemuan lengkap) yang memodifikasi peran siswa menjadi kolaborator aktif di layar PID, dilengkapi lembar kerja digital dan bukti hasil kolaborasi/microteaching.',
      taskSteps:
        '1. Tentukan capaian pembelajaran yang menuntut analisis atau pemecahan masalah kelompok.\n2. Rancang alur aktivitas kolaborasi multi-pengguna pada PID beserta rubrik keaktifan siswa.\n3. Lakukan uji coba/simulasi dan kumpulkan bukti hasil papan kolaborasi siswa.\n4. Unggah RPP/Modul Ajar serta dokumentasi foto/video kolaborasi.',
      taskSampleOutput:
        'Modul Ajar Modifikasi Fisika Hukum Ohm + Papan Kolaborasi 4 Kelompok + Rekaman Diskusi Kelas.',
      requirePracticeValidation: true,
      isActive: true,
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      id: 'lvl_trn01_4',
      trainingId: 'trn_digital_01',
      levelNumber: 4,
      title: 'Level 4 — Redefinition (Redefinisi Pembelajaran)',
      slug: 'mahir',
      description:
        'Menciptakan pengalaman belajar inovatif yang sebelumnya mustahil dilakukan tanpa PID — meliputi kelas kolaboratif lintas sekolah/pakar daring, proyek multimedia interaktif, dan publikasi karya autentik siswa.',
      learningObjectives:
        'Merancang proyek pembelajaran transformatif berbasis PID yang menghubungkan kelas dengan narasumber/komunitas global dan menghasilkan karya digital terpublikasi.',
      learningOutcomes:
        'Peserta menghasilkan desain proyek inovatif Level Redefinition, dokumentasi implementasi, serta laporan refleksi dampak pembelajaran.',
      facilitatorUid: 'fasilitator_02',
      facilitatorName: 'Nadia Kusumawati, M.Pd. [DEMO]',
      durationHours: 14,
      minQuizScore: 75,
      minEvaluationScore: 75,
      demoGuide:
        '1. Hubungkan PID dengan konferensi video lintas sekolah/narasumber praktisi industri sambil berbagi kanvas desain bersama secara sinkron.\n2. Bimbing siswa menggabungkan simulasi data real-time, narasi video, dan anotasi interaktif menjadi pameran digital yang dapat diakses orang tua/publik melalui QR.\n3. Dokumentasikan proses asesmen autentik dan umpan balik dari audiens eksternal.',
      demoVideoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
      taskInstructions:
        'Rancang dan implementasikan 1 Proyek Pembelajaran Inovatif Level Redefinition memanfaatkan PID (kolaborasi lintas kelas/narasumber eksternal atau pameran karya digital interaktif siswa), lengkap dengan bukti karya dan laporan dampak.',
      taskSteps:
        '1. Rancang proyek autentik yang tidak mungkin terlaksana tanpa teknologi PID dan konektivitas kolaboratif.\n2. Laksanakan sesi proyek/kolaborasi lintas pihak dan rekam dokumentasinya.\n3. Publikasikan karya siswa pada portal/tautan kelas dan kumpulkan umpan balik.\n4. Unggah dokumen desain proyek, tautan karya, dan dokumentasi implementasi.',
      taskSampleOutput:
        'Proyek Kolaborasi Lintas Sekolah "Peta Kualitas Air Daerah" di PID + Sesi Pakar Daring + Portofolio Digital Siswa.',
      requirePracticeValidation: true,
      isActive: true,
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    // Kegiatan 2 — Non-SAMR (Modul Berurutan Standar Literasi Data & Analitik Pembelajaran)
    {
      id: 'lvl_trn02_1',
      trainingId: 'trn_data_02',
      levelNumber: 1,
      title: 'Modul 1 — Desain Instrumen Asesmen Formatif Digital',
      slug: 'dasar',
      description: 'Menyusun instrumen asesmen formatif digital yang selaras dengan tujuan pembelajaran.',
      learningObjectives: 'Merancang butir soal diagnostik dan formatif digital secara sistematis.',
      learningOutcomes: 'Peserta menghasilkan 1 instrumen asesmen formatif digital siap pakai.',
      facilitatorUid: 'fasilitator_03',
      facilitatorName: 'Yusuf Ramadhan, M.Sc. [DEMO]',
      durationHours: 6,
      minQuizScore: 75,
      minEvaluationScore: 75,
      demoGuide: '1. Susun kisi-kisi indikator pembelajaran.\n2. Buat instrumen formatif digital dan uji coba bersama rekan sejawat.',
      demoVideoUrl: '',
      taskInstructions: 'Unggah 1 rancangan instrumen asesmen formatif digital (minimal 5 butir) beserta indikatornya.',
      taskSteps: '1. Susun 5 soal formatif.\n2. Unggah tautan instrumen.',
      taskSampleOutput: 'Instrumen Asesmen Formatif Digital 5 Soal.',
      requirePracticeValidation: false,
      isActive: true,
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      id: 'lvl_trn02_2',
      trainingId: 'trn_data_02',
      levelNumber: 2,
      title: 'Modul 2 — Analisis Butir Soal & Umpan Balik Cepat',
      slug: 'berkembang',
      description: 'Membaca distribusi skor, daya pembeda, dan peta miskonsepsi siswa dari hasil asesmen digital.',
      learningObjectives: 'Mengidentifikasi pola kesulitan belajar siswa melalui grafik hasil asesmen.',
      learningOutcomes: 'Peserta menyusun laporan analisis hasil belajar kelas berbasis data.',
      facilitatorUid: 'fasilitator_03',
      facilitatorName: 'Yusuf Ramadhan, M.Sc. [DEMO]',
      durationHours: 8,
      minQuizScore: 75,
      minEvaluationScore: 75,
      demoGuide: '1. Ekspor rekap skor asesmen formatif.\n2. Petakan 2 indikator dengan tingkat ketuntasan terendah.',
      demoVideoUrl: '',
      taskInstructions: 'Unggah analisis hasil asesmen formatif kelas dan rencana umpan balik.',
      taskSteps: '1. Ekspor grafik skor.\n2. Catat 2 miskonsepsi utama beserta tindak lanjutnya.',
      taskSampleOutput: 'Ringkasan Analisis Butir Soal Kelas.',
      requirePracticeValidation: false,
      isActive: true,
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      id: 'lvl_trn02_3',
      trainingId: 'trn_data_02',
      levelNumber: 3,
      title: 'Modul 3 — Diferensiasi Pembelajaran Berbasis Data',
      slug: 'lanjut',
      description: 'Merancang kelompok belajar diferensiasi berdasarkan sinyal analitik asesmen.',
      learningObjectives: 'Mengelompokkan tugas pengayaan dan remedial secara adaptif sesuai kesiapan siswa.',
      learningOutcomes: 'Peserta menyusun skenario pembelajaran terdiferensiasi berbasis data.',
      facilitatorUid: 'fasilitator_04',
      facilitatorName: 'Larasati Wulandari, M.Pd. [DEMO]',
      durationHours: 10,
      minQuizScore: 75,
      minEvaluationScore: 75,
      demoGuide: '1. Petakan capaian siswa ke 3 profil kesiapan belajar.\n2. Rancang aktivitas kolaboratif sesuai kebutuhan kelompok.',
      demoVideoUrl: '',
      taskInstructions: 'Susun rencana diferensiasi kelas berbasis data asesmen awal.',
      taskSteps: '1. Kelompokkan profil capaian.\n2. Rancang 3 aktivitas berbeda (bimbingan, reguler, pengayaan).',
      taskSampleOutput: 'Matriks Diferensiasi Pembelajaran.',
      requirePracticeValidation: false,
      isActive: true,
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      id: 'lvl_trn02_4',
      trainingId: 'trn_data_02',
      levelNumber: 4,
      title: 'Modul 4 — Portofolio Analitik & Pelaporan Autentik',
      slug: 'mahir',
      description: 'Membangun sistem refleksi dan portofolio perkembangan belajar siswa berkelanjutan.',
      learningObjectives: 'Mengintegrasikan asesmen formatif, rubrik kinerja, dan refleksi siswa dalam pelaporan.',
      learningOutcomes: 'Peserta menghasilkan rancangan pelaporan perkembangan belajar autentik sekolah.',
      facilitatorUid: 'fasilitator_04',
      facilitatorName: 'Larasati Wulandari, M.Pd. [DEMO]',
      durationHours: 12,
      minQuizScore: 75,
      minEvaluationScore: 75,
      demoGuide: '1. Rancang format portofolio perkembangan siswa.\n2. Presentasikan laporan dampak kepada komunitas belajar.',
      demoVideoUrl: '',
      taskInstructions: 'Susun proposal implementasi portofolio digital & analitik kelas.',
      taskSteps: '1. Susun kerangka indikator.\n2. Unggah dokumen rancangan.',
      taskSampleOutput: 'Proposal Portofolio Analitik Sekolah.',
      requirePracticeValidation: false,
      isActive: true,
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
  ];

  const materials: LearningMaterial[] = [
    // TRN 01 Level 1 — Substitution
    {
      id: 'mat_t1_l1_01',
      trainingId: 'trn_digital_01',
      levelId: 'lvl_trn01_1',
      levelNumber: 1,
      title: 'Mengenal Anatomi & Pengoperasian Dasar Papan Interaktif Digital (PID)',
      description: 'Panduan lengkap menyalakan, mengkalibrasi layar sentuh, memilih sumber input, dan perawatan harian PID.',
      contentType: 'teks',
      contentBody:
        'Pada tahap Substitution (Substitusi) dalam model SAMR, Papan Interaktif Digital (PID) menggantikan papan tulis kapur/spidol serta proyektor konvensional secara langsung tanpa mengubah struktur metode mengajar.\n\nKompetensi operasional dasar yang wajib dikuasai guru:\n1. Pengaturan perangkat keras: menyalakan panel dengan aman, memastikan koneksi HDMI/USB-Touch atau sistem operasi internal aktif, serta kalibrasi titik sentuh.\n2. Navigasi kanvas Whiteboard: memilih jenis pena digital, mengatur kontras warna agar terbaca jelas dari bangku belakang, menggunakan penggaris/bentuk geometri, serta menghapus dengan telapak tangan.\n3. Penyimpanan catatan kelas: mengekspor coretan papan tulis ke format PDF atau membagikan lewat QR Code sehingga siswa fokus menyimak tanpa tergesa menyalin.',
      fileUrl: '',
      fileName: '',
      orderIndex: 1,
      durationMinutes: 20,
      isMandatory: true,
      isActive: true,
      allowDownload: false,
      isPrivateBucket: false,
      createdBy: 'fasilitator_01',
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      id: 'mat_t1_l1_02',
      trainingId: 'trn_digital_01',
      levelId: 'lvl_trn01_1',
      levelNumber: 1,
      title: 'Modul PDF: Panduan Praktis Anotasi Slide & PDF pada PID',
      description: 'Daftar periksa penyiapan tata letak slide beresolusi tinggi dan teknik anotasi di layar PID.',
      contentType: 'pdf',
      contentBody: 'Unduh atau baca modul panduan praktis tata letak font minimal 24pt, kontras warna kelas, dan alur anotasi dokumen PDF pada PID.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: 'Panduan-Anotasi-PID-Substitution.pdf',
      orderIndex: 2,
      durationMinutes: 25,
      isMandatory: true,
      isActive: true,
      allowDownload: true,
      isPrivateBucket: true,
      createdBy: 'fasilitator_01',
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      id: 'mat_t1_l1_03',
      trainingId: 'trn_digital_01',
      levelId: 'lvl_trn01_1',
      levelNumber: 1,
      title: 'Video Pengayaan: Ergonomi Mengajar di Depan Papan Interaktif Digital',
      description: 'Tips posisi berdiri, pencahayaan ruang kelas, dan interaksi visual dengan siswa saat menggunakan PID.',
      contentType: 'youtube',
      contentBody: 'Simak praktik baik penataan posisi guru agar tidak membelakangi siswa terlalu lama saat menulis di PID.',
      fileUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
      fileName: '',
      orderIndex: 3,
      durationMinutes: 15,
      isMandatory: false,
      isActive: true,
      allowDownload: false,
      isPrivateBucket: false,
      createdBy: 'fasilitator_01',
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    // TRN 01 Level 2 — Augmentation
    {
      id: 'mat_t1_l2_01',
      trainingId: 'trn_digital_01',
      levelId: 'lvl_trn01_2',
      levelNumber: 2,
      title: 'Integrasi Multimedia, Split-Screen & Simulasi Interaktif pada PID',
      description: 'Meningkatkan fungsionalitas penyajian materi dengan simulasi sains/matematika dan anotasi langsung di atas video.',
      contentType: 'teks',
      contentBody:
        'Tahap Augmentation (Augmentasi) menandai peningkatan fungsional yang nyata dibandingkan media cetak atau papan tulis biasa. Guru tetap memimpin penyampaian konsep, namun fitur digital memperkaya kejelasan dan kecepatan umpan balik.\n\nTiga strategi utama Augmentation dengan PID:\n1. Mode Split-Screen: menampilkan simulasi interaktif (PhET, GeoGebra, peta digital) berdampingan dengan kanvas anotasi rumus.\n2. Anotasi di atas video pembelajaran: menjeda video eksperimen pada titik krusial lalu menandai vektor gaya, organ biologis, atau struktur kalimat langsung di layar.\n3. Kuis cepat real-time: menayangkan pertanyaan pemantik dengan QR Code agar siswa merespons serentak dan miskonsepsi segera dibahas di kelas.',
      fileUrl: '',
      fileName: '',
      orderIndex: 1,
      durationMinutes: 30,
      isMandatory: true,
      isActive: true,
      allowDownload: false,
      isPrivateBucket: false,
      createdBy: 'fasilitator_01',
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      id: 'mat_t1_l2_02',
      trainingId: 'trn_digital_01',
      levelId: 'lvl_trn01_2',
      levelNumber: 2,
      title: 'Slide PPTX: Merancang Bahan Ajar Interaktif & Kuis Instan',
      description: 'Template alur 15 menit pengajaran interaktif berbasis PID untuk berbagai mata pelajaran.',
      contentType: 'ppt',
      contentBody: 'Gunakan template presentasi interaktif ini untuk menyusun bahan ajar Level Augmentation Anda.',
      fileUrl: 'https://docs.google.com/presentation/',
      fileName: 'Template-Bahan-Ajar-Augmentation-PID.pptx',
      orderIndex: 2,
      durationMinutes: 20,
      isMandatory: true,
      isActive: true,
      allowDownload: true,
      isPrivateBucket: true,
      createdBy: 'fasilitator_01',
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    // TRN 01 Level 3 — Modification
    {
      id: 'mat_t1_l3_01',
      trainingId: 'trn_digital_01',
      levelId: 'lvl_trn01_3',
      levelNumber: 3,
      title: 'Desain Pembelajaran Kolaboratif Multi-Pengguna Berbasis PID',
      description: 'Menggeser peran PID dari alat presentasi guru menjadi kanvas kolaborasi aktif dan pemecahan masalah kelompok siswa.',
      contentType: 'teks',
      contentBody:
        'Pada tahap Modification (Modifikasi), teknologi PID mengubah secara signifikan desain tugas belajar. Siswa tidak lagi pasif menyimak di bangku, melainkan memanipulasi objek, membandingkan hipotesis kelompok, dan memberi umpan balik langsung pada kanvas kelas.\n\nLangkah perancangan Modul Ajar Level Modification:\n1. Rancang masalah kontekstual terbuka yang membutuhkan pembagian peran dalam kelompok.\n2. Siapkan zona kerja kolaboratif pada PID (screen-casting dari perangkat kelompok atau multi-touch langsung di layar).\n3. Sediakan protokol umpan balik sejawat (peer review) menggunakan sticky notes digital sehingga siswa merevisi solusinya berdasarkan argumen ilmiah.',
      fileUrl: '',
      fileName: '',
      orderIndex: 1,
      durationMinutes: 35,
      isMandatory: true,
      isActive: true,
      allowDownload: false,
      isPrivateBucket: false,
      createdBy: 'fasilitator_02',
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      id: 'mat_t1_l3_02',
      trainingId: 'trn_digital_01',
      levelId: 'lvl_trn01_3',
      levelNumber: 3,
      title: 'Infografis Alur Kelas Kolaboratif & Screen-Casting Kelompok',
      description: 'Visualisasi alur kerja 4 kelompok siswa menuju kanvas utama PID.',
      contentType: 'gambar',
      contentBody: 'Pelajari tata letak ruang kelas dan alur sinkronisasi karya kelompok ke layar PID.',
      fileUrl: ASSET_HERO_PID_SAMR,
      fileName: 'alur-kolaborasi-pid-modification.jpg',
      orderIndex: 2,
      durationMinutes: 15,
      isMandatory: true,
      isActive: true,
      allowDownload: true,
      isPrivateBucket: false,
      createdBy: 'fasilitator_02',
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    // TRN 01 Level 4 — Redefinition
    {
      id: 'mat_t1_l4_01',
      trainingId: 'trn_digital_01',
      levelId: 'lvl_trn01_4',
      levelNumber: 4,
      title: 'Transformasi Kelas: Proyek Lintas Sekolah & Pameran Karya Digital',
      description: 'Merancang pengalaman belajar autentik yang mustahil diwujudkan tanpa ekosistem PID dan jejaring kolaboratif.',
      contentType: 'teks',
      contentBody:
        'Tahap Redefinition (Redefinisi) adalah puncak model SAMR, di mana PID memungkinkan terciptanya aktivitas belajar yang sama sekali baru. Contoh konkret di sekolah Indonesia:\n\n1. Sesi kolaborasi sinkron antar-sekolah di provinsi berbeda menggunakan kanvas bersama dan konferensi video di layar PID.\n2. Menghadirkan narasumber praktisi/ilmuwan untuk meninjau rancangan purwarupa siswa secara langsung pada papan digital.\n3. Publikasi pameran proyek multimedia interaktif siswa (infografis, data observasi real-time, video penjelasan) yang dapat diulas masyarakat dan orang tua.\n\nGuru pada level ini juga berperan sebagai penggerak komunitas belajar di sekolah untuk mendiseminasikan praktik baik pemanfaatan PID.',
      fileUrl: '',
      fileName: '',
      orderIndex: 1,
      durationMinutes: 40,
      isMandatory: true,
      isActive: true,
      allowDownload: false,
      isPrivateBucket: false,
      createdBy: 'fasilitator_02',
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      id: 'mat_t1_l4_02',
      trainingId: 'trn_digital_01',
      levelId: 'lvl_trn01_4',
      levelNumber: 4,
      title: 'Referensi Interaktif: Panduan Proyek Autentik & Rubrik Penilaian',
      description: 'Kerangka evaluasi proyek transformatif berbasis SAMR Level Redefinition.',
      contentType: 'interaktif',
      contentBody: 'Gunakan panduan rubrik autentik ini saat merancang proyek Level 4 Anda.',
      fileUrl: 'https://phet.colorado.edu/in/',
      fileName: '',
      orderIndex: 2,
      durationMinutes: 25,
      isMandatory: true,
      isActive: true,
      allowDownload: false,
      isPrivateBucket: false,
      createdBy: 'fasilitator_02',
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    // TRN 02 Level 1..4
    {
      id: 'mat_t2_l1_01',
      trainingId: 'trn_data_02',
      levelId: 'lvl_trn02_1',
      levelNumber: 1,
      title: 'Prinsip Dasar Asesmen Formatif Digital di Layar Kelas',
      description: 'Menyusun butir soal diagnostik yang ringkas dan mudah dibaca di PID.',
      contentType: 'teks',
      contentBody: 'Asesmen formatif digital membantu guru memetakan pemahaman siswa tanpa menunggu akhir semester.',
      fileUrl: '',
      fileName: '',
      orderIndex: 1,
      durationMinutes: 20,
      isMandatory: true,
      isActive: true,
      allowDownload: false,
      isPrivateBucket: false,
      createdBy: 'fasilitator_03',
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      id: 'mat_t2_l2_01',
      trainingId: 'trn_data_02',
      levelId: 'lvl_trn02_2',
      levelNumber: 2,
      title: 'Membaca Grafik Distribusi Jawaban & Miskonsepsi Siswa',
      description: 'Teknik mengidentifikasi pola kesalahan siswa secara cepat dari dasbor kuis.',
      contentType: 'tautan',
      contentBody: 'Pelajari cara menafsirkan persentase penguasaan per indikator sebelum melanjutkan ke topik baru.',
      fileUrl: 'https://www.bps.go.id/',
      fileName: '',
      orderIndex: 1,
      durationMinutes: 25,
      isMandatory: true,
      isActive: true,
      allowDownload: false,
      isPrivateBucket: false,
      createdBy: 'fasilitator_03',
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      id: 'mat_t2_l3_01',
      trainingId: 'trn_data_02',
      levelId: 'lvl_trn02_3',
      levelNumber: 3,
      title: 'Skenario Diferensiasi Kelompok Berdasarkan Skor Diagnostik',
      description: 'Menyusun aktivitas bertingkat untuk kelompok dasar, berkembang, dan pengayaan.',
      contentType: 'teks',
      contentBody: 'Diferensiasi konten dan proses berbasis data memastikan tidak ada siswa tertinggal maupun bosan.',
      fileUrl: '',
      fileName: '',
      orderIndex: 1,
      durationMinutes: 20,
      isMandatory: true,
      isActive: true,
      allowDownload: false,
      isPrivateBucket: false,
      createdBy: 'fasilitator_04',
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      id: 'mat_t2_l4_01',
      trainingId: 'trn_data_02',
      levelId: 'lvl_trn02_4',
      levelNumber: 4,
      title: 'Portofolio Digital Berkelanjutan & Laporan Dampak Pembelajaran',
      description: 'Menyusun dokumentasi perkembangan kompetensi siswa secara longitudinal.',
      contentType: 'teks',
      contentBody: 'Portofolio digital terpadu memadukan hasil asesmen, karya praktik, dan refleksi diri siswa.',
      fileUrl: '',
      fileName: '',
      orderIndex: 1,
      durationMinutes: 30,
      isMandatory: true,
      isActive: true,
      allowDownload: false,
      isPrivateBucket: false,
      createdBy: 'fasilitator_04',
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
  ];

  const questionBanks: QuestionBank[] = [];
  const answerKeys: AnswerKeyDocument[] = [];

  for (const trn of trainings) {
    const assessId = `bank_assess_${trn.id}`;
    const trnUsesSamr = trn.usesSamrLevels === true;

    if (trnUsesSamr) {
      questionBanks.push({
        id: assessId,
        trainingId: trn.id,
        levelNumber: 0,
        kind: 'assessment',
        title: `Asesmen Awal Kompetensi SAMR — ${trn.code}`,
        description:
          'Asesmen diagnostik awal untuk memetakan kemampuan pemanfaatan Papan Interaktif Digital (PID) dan menempatkan Anda pada Level SAMR yang paling sesuai (Level 1 Substitution s.d. Level 4 Redefinition).',
        durationMinutes: 25,
        maxAttempts: 2,
        passingScore: 0,
        shuffleQuestions: false,
        showExplanation: true,
        isActive: true,
        questions: [
          {
            id: `${assessId}_q1`,
            type: 'pilihan_ganda',
            prompt:
              'Seorang guru menggunakan Papan Interaktif Digital (PID) semata-mata untuk menayangkan berkas PDF buku teks dan menulis definisi dengan pena digital seperti di papan tulis biasa. Dalam model SAMR, praktik ini termasuk level:',
            weight: 25,
            options: [
              { id: 'a', text: 'Substitution (Substitusi)' },
              { id: 'b', text: 'Augmentation (Augmentasi)' },
              { id: 'c', text: 'Modification (Modifikasi)' },
              { id: 'd', text: 'Redefinition (Redefinisi)' },
            ],
          },
          {
            id: `${assessId}_q2`,
            type: 'benar_salah',
            prompt:
              'Menayangkan simulasi eksperimen interaktif (seperti PhET) berdampingan dengan anotasi rumus dan kuis cepat real-time di PID merupakan contoh tahap Augmentation karena memberikan peningkatan fungsional yang nyata.',
            weight: 25,
            options: [
              { id: 'true', text: 'Benar' },
              { id: 'false', text: 'Salah' },
            ],
          },
          {
            id: `${assessId}_q3`,
            type: 'pilihan_ganda_kompleks',
            prompt:
              'Pilih DUA karakteristik pembelajaran pada level Modification dan Redefinition saat memanfaatkan PID di kelas:',
            weight: 25,
            options: [
              { id: 'a', text: 'Siswa berkolaborasi langsung pada kanvas PID untuk membandingkan solusi dan memberi umpan balik sejawat' },
              { id: 'b', text: 'Guru hanya memproyeksikan slide teks statis tanpa interaksi siswa sepanjang jam pelajaran' },
              { id: 'c', text: 'Kelas terhubung lintas sekolah atau dengan narasumber ahli secara sinkron di PID untuk mempublikasikan karya autentik' },
              { id: 'd', text: 'Papan Interaktif Digital dimatikan dan diganti dikte lisan penuh' },
            ],
          },
          {
            id: `${assessId}_q4`,
            type: 'isian_singkat',
            prompt:
              'Sebutkan nama tingkat tertinggi (Level 4) dalam model kompetensi SAMR (tuliskan dalam bahasa Inggris atau Indonesia, mis. Redefinition / Redefinisi):',
            weight: 25,
            options: [],
            requiresManualGrading: false,
          },
        ],
        createdAt: BASE_ISO,
        updatedAt: BASE_ISO,
      });

      answerKeys.push({
        id: assessId,
        trainingId: trn.id,
        kind: 'assessment',
        answers: [
          {
            questionId: `${assessId}_q1`,
            correctOptionIds: ['a'],
            acceptedTextAnswers: [],
            explanation:
              'Penggantian langsung papan tulis/buku cetak tanpa perubahan fungsional signifikan berada pada tahap Substitution (Level 1).',
          },
          {
            questionId: `${assessId}_q2`,
            correctOptionIds: ['true'],
            acceptedTextAnswers: [],
            explanation:
              'Benar. Fitur multimedia, simulasi interaktif, dan umpan balik instan merupakan ciri utama Augmentation (Level 2).',
          },
          {
            questionId: `${assessId}_q3`,
            correctOptionIds: ['a', 'c'],
            acceptedTextAnswers: [],
            explanation:
              'Kolaborasi aktif siswa merancang ulang tugas (Modification) dan kolaborasi lintas sekolah/publikasi karya autentik (Redefinition).',
          },
          {
            questionId: `${assessId}_q4`,
            correctOptionIds: [],
            acceptedTextAnswers: ['redefinition', 'redefinisi'],
            explanation:
              'Level 4 SAMR adalah Redefinition (Redefinisi), yaitu penciptaan pengalaman belajar baru yang sebelumnya mustahil tanpa teknologi.',
          },
        ],
        createdAt: BASE_ISO,
        updatedAt: BASE_ISO,
      });

      const samrNames = ['Substitution', 'Augmentation', 'Modification', 'Redefinition'];
      for (const lvlNum of [1, 2, 3, 4] as const) {
        const quizId = `bank_quiz_${trn.id}_l${lvlNum}`;
        const evalId = `bank_eval_${trn.id}_l${lvlNum}`;
        const samrLabel = samrNames[lvlNum - 1];

        questionBanks.push({
          id: quizId,
          trainingId: trn.id,
          levelNumber: lvlNum,
          kind: 'quiz',
          title: `Kuis Pemahaman Level ${lvlNum} (${samrLabel})`,
          description: `Kuis formatif untuk menguji pemahaman konsep dan praktik PID pada tahap ${samrLabel}. Nilai lulus minimum: 75.`,
          durationMinutes: 15,
          maxAttempts: 3,
          passingScore: 75,
          shuffleQuestions: false,
          showExplanation: true,
          isActive: true,
          questions: [
            {
              id: `${quizId}_q1`,
              type: 'pilihan_ganda',
              prompt: `Pada Level ${lvlNum} (${samrLabel}), fokus utama pemanfaatan Papan Interaktif Digital (PID) dalam pembelajaran adalah:`,
              weight: 40,
              options: [
                {
                  id: 'a',
                  text:
                    lvlNum === 1
                      ? 'Mengoperasikan fungsi dasar PID (tulis, anotasi, tayang slide) secara lancar dan ergonomis'
                      : lvlNum === 2
                        ? 'Mengintegrasikan multimedia, simulasi, dan kuis cepat pada PID untuk meningkatkan efektivitas penyajian'
                        : lvlNum === 3
                          ? 'Merancang ulang aktivitas kelas menjadi kolaborasi aktif siswa dengan umpan balik langsung di PID'
                          : 'Menciptakan proyek transformatif lintas kelas/narasumber serta publikasi karya autentik siswa melalui PID',
                },
                { id: 'b', text: 'Menghindari interaksi siswa agar layar PID tidak disentuh sama sekali' },
                { id: 'c', text: 'Menggunakan PID hanya sebagai jam dinding digital di sudut kelas' },
                { id: 'd', text: 'Menghilangkan seluruh tujuan pembelajaran dari modul ajar' },
              ],
            },
            {
              id: `${quizId}_q2`,
              type: 'benar_salah',
              prompt:
                'Selain menyelesaikan materi dan kuis, peserta perlu melakukan praktik nyata dengan PID serta mengisi refleksi pembelajaran agar kompetensi benar-benar terwujud di kelas.',
              weight: 30,
              options: [
                { id: 'true', text: 'Benar' },
                { id: 'false', text: 'Salah' },
              ],
            },
            {
              id: `${quizId}_q3`,
              type: 'isian_singkat',
              prompt: `Tuliskan singkatan kerangka kerja 4 level integrasi teknologi pembelajaran yang digunakan pada kegiatan Digitalisasi Pembelajaran ini (4 huruf):`,
              weight: 30,
              options: [],
              requiresManualGrading: false,
            },
          ],
          createdAt: BASE_ISO,
          updatedAt: BASE_ISO,
        });

        answerKeys.push({
          id: quizId,
          trainingId: trn.id,
          kind: 'quiz',
          answers: [
            {
              questionId: `${quizId}_q1`,
              correctOptionIds: ['a'],
              acceptedTextAnswers: [],
              explanation: `Pilihan A merangkum capaian inti tahap ${samrLabel} pada pemanfaatan Papan Interaktif Digital.`,
            },
            {
              questionId: `${quizId}_q2`,
              correctOptionIds: ['true'],
              acceptedTextAnswers: [],
              explanation: 'Benar. Pembelajaran berbasis praktik PID dan refleksi terstruktur menjamin transfer kompetensi ke kelas nyata.',
            },
            {
              questionId: `${quizId}_q3`,
              correctOptionIds: [],
              acceptedTextAnswers: ['samr'],
              explanation: 'SAMR adalah singkatan dari Substitution, Augmentation, Modification, dan Redefinition.',
            },
          ],
          createdAt: BASE_ISO,
          updatedAt: BASE_ISO,
        });

        questionBanks.push({
          id: evalId,
          trainingId: trn.id,
          levelNumber: lvlNum,
          kind: 'evaluation',
          title: `Evaluasi Kompetensi Level ${lvlNum} (${samrLabel})`,
          description: `Evaluasi sumatif kompetensi PID tahap ${samrLabel}. Nilai lulus minimum: 75.`,
          durationMinutes: 25,
          maxAttempts: 2,
          passingScore: 75,
          shuffleQuestions: false,
          showExplanation: true,
          isActive: true,
          questions: [
            {
              id: `${evalId}_q1`,
              type: 'pilihan_ganda',
              prompt: `Manakah indikator keberhasilan paling tepat ketika guru menerapkan PID pada Level ${lvlNum} (${samrLabel})?`,
              weight: 40,
              options: [
                {
                  id: 'a',
                  text: 'Tujuan pembelajaran tercapai lebih bermakna, alat PID sesuai tahap SAMR, dan terdapat dokumentasi praktik serta refleksi',
                },
                { id: 'b', text: 'Slide berisi teks padat berukuran sangat kecil tanpa visual maupun anotasi' },
                { id: 'c', text: 'Siswa dilarang bertanya selama layar PID menyala' },
                { id: 'd', text: 'Tidak ada keterkaitan antara konten di PID dan indikator pembelajaran' },
              ],
            },
            {
              id: `${evalId}_q2`,
              type: 'pilihan_ganda_kompleks',
              prompt: 'Pilih DUA aspek penting dalam Rubrik Penilaian Praktik PID pada kegiatan ini:',
              weight: 35,
              options: [
                { id: 'a', text: 'Kesesuaian dengan tujuan pembelajaran & ketepatan pemanfaatan fitur PID' },
                { id: 'b', text: 'Keterlibatan aktif siswa & kesesuaian desain aktivitas dengan level SAMR' },
                { id: 'c', text: 'Harga merek perangkat PID yang paling mahal di kelas' },
                { id: 'd', text: 'Jumlah warna acak terbanyak tanpa memperhatikan keterbacaan' },
              ],
            },
            {
              id: `${evalId}_q3`,
              type: 'benar_salah',
              prompt:
                'Jika hasil asesmen awal menempatkan guru langsung pada Level 3 (Modification), maka Level 1 dan Level 2 tidak diwajibkan, dan guru cukup menuntaskan Level 3 serta Level 4 untuk lulus.',
              weight: 25,
              options: [
                { id: 'true', text: 'Benar' },
                { id: 'false', text: 'Salah' },
              ],
            },
          ],
          createdAt: BASE_ISO,
          updatedAt: BASE_ISO,
        });

        answerKeys.push({
          id: evalId,
          trainingId: trn.id,
          kind: 'evaluation',
          answers: [
            {
              questionId: `${evalId}_q1`,
              correctOptionIds: ['a'],
              acceptedTextAnswers: [],
              explanation: 'Pemanfaatan PID harus selalu berakar pada tujuan pembelajaran, ketepatan tahap SAMR, dan refleksi dampak.',
            },
            {
              questionId: `${evalId}_q2`,
              correctOptionIds: ['a', 'b'],
              acceptedTextAnswers: [],
              explanation: 'Rubrik menilai kesesuaian tujuan, ketepatan fitur PID, inovasi, keterlibatan siswa, kesesuaian SAMR, dan dokumentasi.',
            },
            {
              questionId: `${evalId}_q3`,
              correctOptionIds: ['true'],
              acceptedTextAnswers: [],
              explanation: 'Benar. Pembelajaran adaptif berbasis asesmen awal tidak mewajibkan level di bawah level rekomendasi.',
            },
          ],
          createdAt: BASE_ISO,
          updatedAt: BASE_ISO,
        });
      }
    } else {
      // Non-SAMR Training (mis. Literasi Data & Analitik Pembelajaran Adaptif):
      // Soal Asesmen Awal, Kuis, dan Evaluasi 100% sesuai materi kegiatan (TANPA SAMR/PID!)
      questionBanks.push({
        id: assessId,
        trainingId: trn.id,
        levelNumber: 0,
        kind: 'assessment',
        title: `Asesmen Awal — ${trn.name}`,
        description: `Asesmen awal untuk memetakan pemahaman dasar peserta terkait materi ${trn.name} sebelum mulai mengeksplorasi modul kegiatan.`,
        durationMinutes: 20,
        maxAttempts: 2,
        passingScore: 0,
        shuffleQuestions: false,
        showExplanation: true,
        isActive: true,
        questions: [
          {
            id: `${assessId}_q1`,
            type: 'pilihan_ganda',
            prompt:
              'Tujuan utama pelaksanaan asesmen formatif digital di tengah proses pembelajaran adalah:',
            weight: 25,
            options: [
              { id: 'a', text: 'Memetakan pemahaman dan miskonsepsi siswa secara cepat untuk menentukan tindak lanjut pembelajaran' },
              { id: 'b', text: 'Menentukan peringkat juara kelas di akhir semester tanpa memberikan umpan balik' },
              { id: 'c', text: 'Mengganti seluruh kegiatan tatap muka dengan ujian pilihan ganda' },
              { id: 'd', text: 'Menyimpan nilai mentah tanpa pernah dibahas bersama siswa' },
            ],
          },
          {
            id: `${assessId}_q2`,
            type: 'pilihan_ganda',
            prompt:
              'Ketika hasil analitik kuis menunjukkan 68% siswa menjawab salah pada satu indikator konsep yang sama, langkah tindak lanjut paling tepat bagi guru adalah:',
            weight: 25,
            options: [
              { id: 'a', text: 'Melakukan klarifikasi miskonsepsi secara klasikal dengan contoh konkret sebelum melanjutkan ke materi berikutnya' },
              { id: 'b', text: 'Mengabaikan hasil tersebut dan langsung memberikan ujian akhir bab' },
              { id: 'c', text: 'Menghapus indikator tersebut dari tujuan pembelajaran' },
              { id: 'd', text: 'Menurunkan standar penilaian tanpa pendampingan belajar' },
            ],
          },
          {
            id: `${assessId}_q3`,
            type: 'benar_salah',
            prompt:
              'Pembelajaran terdiferensiasi berbasis data berarti guru mengelompokkan dukungan belajar (bimbingan, reguler, pengayaan) sesuai bukti kesiapan belajar siswa, bukan menyamaratakan semua tugas.',
            weight: 25,
            options: [
              { id: 'true', text: 'Benar' },
              { id: 'false', text: 'Salah' },
            ],
          },
          {
            id: `${assessId}_q4`,
            type: 'pilihan_ganda',
            prompt:
              'Indikator utama kualitas instrumen asesmen formatif yang baik adalah:',
            weight: 25,
            options: [
              { id: 'a', text: 'Selaras langsung dengan tujuan pembelajaran, jelas redaksinya, dan mampu mendiagnosis pemahaman siswa' },
              { id: 'b', text: 'Memiliki jumlah soal sebanyak mungkin tanpa memperhatikan kisi-kisi' },
              { id: 'c', text: 'Menggunakan istilah sulit agar mayoritas siswa gagal menjawab' },
              { id: 'd', text: 'Tidak memerlukan rubrik atau kriteria ketercapaian' },
            ],
          },
        ],
        createdAt: BASE_ISO,
        updatedAt: BASE_ISO,
      });

      answerKeys.push({
        id: assessId,
        trainingId: trn.id,
        kind: 'assessment',
        answers: [
          {
            questionId: `${assessId}_q1`,
            correctOptionIds: ['a'],
            acceptedTextAnswers: [],
            explanation: 'Asesmen formatif berfungsi memetakan proses belajar dan miskonsepsi agar guru dapat menyesuaikan strategi mengajar.',
          },
          {
            questionId: `${assessId}_q2`,
            correctOptionIds: ['a'],
            acceptedTextAnswers: [],
            explanation: 'Kesalahan mayoritas kelas menandakan perlunya penguatan konsep bersama sebelum melanjutkan materi.',
          },
          {
            questionId: `${assessId}_q3`,
            correctOptionIds: ['true'],
            acceptedTextAnswers: [],
            explanation: 'Benar. Diferensiasi berbasis data menyesuaikan dukungan, proses, atau produk belajar berdasarkan kesiapan siswa.',
          },
          {
            questionId: `${assessId}_q4`,
            correctOptionIds: ['a'],
            acceptedTextAnswers: [],
            explanation: 'Keselarasan dengan tujuan pembelajaran dan daya diagnostik merupakan fondasi asesmen formatif yang bermutu.',
          },
        ],
        createdAt: BASE_ISO,
        updatedAt: BASE_ISO,
      });

      const quizId = `bank_quiz_${trn.id}_l1`;
      const evalId = `bank_eval_${trn.id}_l1`;

      questionBanks.push({
        id: quizId,
        trainingId: trn.id,
        levelNumber: 1,
        kind: 'quiz',
        title: `Kuis Pemahaman — ${trn.code}`,
        description: `Kuis pemahaman materi ${trn.name}. Nilai lulus minimum: 75.`,
        durationMinutes: 15,
        maxAttempts: 3,
        passingScore: 75,
        shuffleQuestions: false,
        showExplanation: true,
        isActive: true,
        questions: [
          {
            id: `${quizId}_q1`,
            type: 'pilihan_ganda',
            prompt:
              'Dalam analisis butir soal formatif, informasi apa yang paling membantu guru menyusun kelompok remedial?',
            weight: 35,
            options: [
              { id: 'a', text: 'Pemetaan indikator kompetensi yang belum dikuasai oleh masing-masing siswa' },
              { id: 'b', text: 'Urutan abjad nama siswa di daftar hadir' },
              { id: 'c', text: 'Warna tema formulir kuis digital yang digunakan' },
              { id: 'd', text: 'Waktu pendaftaran akun LMS peserta' },
            ],
          },
          {
            id: `${quizId}_q2`,
            type: 'pilihan_ganda',
            prompt:
              'Manakah strategi umpan balik yang paling efektif setelah asesmen formatif digital selesai?',
            weight: 35,
            options: [
              { id: 'a', text: 'Memberikan umpan balik spesifik pada langkah yang perlu diperbaiki beserta contoh latihan terarah' },
              { id: 'b', text: 'Hanya menampilkan angka skor akhir tanpa pembahasan' },
              { id: 'c', text: 'Menunda pembahasan hingga akhir tahun ajaran' },
              { id: 'd', text: 'Menghukum siswa dengan nilai terendah di depan kelas' },
            ],
          },
          {
            id: `${quizId}_q3`,
            type: 'benar_salah',
            prompt:
              'Data asesmen awal dan formatif dapat digunakan untuk membagi aktivitas belajar menjadi kelompok bimbingan terstruktur, praktik mandiri, dan tantangan pengayaan.',
            weight: 30,
            options: [
              { id: 'true', text: 'Benar' },
              { id: 'false', text: 'Salah' },
            ],
          },
        ],
        createdAt: BASE_ISO,
        updatedAt: BASE_ISO,
      });

      answerKeys.push({
        id: quizId,
        trainingId: trn.id,
        kind: 'quiz',
        answers: [
          {
            questionId: `${quizId}_q1`,
            correctOptionIds: ['a'],
            acceptedTextAnswers: [],
            explanation: 'Pemetaan per indikator memungkinkan guru menargetkan bimbingan remedial tepat pada miskonsepsi siswa.',
          },
          {
            questionId: `${quizId}_q2`,
            correctOptionIds: ['a'],
            acceptedTextAnswers: [],
            explanation: 'Umpan balik yang spesifik, segera, dan konstruktif mempercepat perbaikan pemahaman siswa.',
          },
          {
            questionId: `${quizId}_q3`,
            correctOptionIds: ['true'],
            acceptedTextAnswers: [],
            explanation: 'Benar. Pengelompokan fleksibel berbasis data merupakan inti pembelajaran adaptif.',
          },
        ],
        createdAt: BASE_ISO,
        updatedAt: BASE_ISO,
      });

      questionBanks.push({
        id: evalId,
        trainingId: trn.id,
        levelNumber: 1,
        kind: 'evaluation',
        title: `Evaluasi Pembelajaran — ${trn.code}`,
        description: `Evaluasi akhir studi kasus untuk kegiatan ${trn.name}. Nilai lulus minimum: 75.`,
        durationMinutes: 25,
        maxAttempts: 2,
        passingScore: 75,
        shuffleQuestions: false,
        showExplanation: true,
        isActive: true,
        questions: [
          {
            id: `${evalId}_q1`,
            type: 'pilihan_ganda',
            prompt:
              'Studi Kasus: Di sebuah kelas terdapat 8 siswa belum memahami konsep dasar, 18 siswa berada pada tahap cukup, dan 6 siswa sudah sangat mahir. Bagaimana rancangan tindak lanjut diferensiasi berbasis data yang paling tepat?',
            weight: 50,
            options: [
              { id: 'a', text: 'Memberikan bimbingan bertahap untuk 8 siswa, latihan terpandu untuk 18 siswa, serta proyek pengayaan analitis untuk 6 siswa mahir' },
              { id: 'b', text: 'Memberikan soal yang sama persis tanpa pendampingan agar adil' },
              { id: 'c', text: 'Meminta 8 siswa belajar sendiri tanpa umpan balik guru' },
              { id: 'd', text: 'Menghentikan seluruh materi agar hanya menunggu 6 siswa mahir' },
            ],
          },
          {
            id: `${evalId}_q2`,
            type: 'pilihan_ganda',
            prompt:
              'Dalam pelaporan portofolio perkembangan belajar autentik kepada orang tua dan sekolah, komponen paling bermakna yang perlu disertakan adalah:',
            weight: 50,
            options: [
              { id: 'a', text: 'Tren perkembangan capaian indikator, bukti karya siswa, catatan kekuatan, dan rekomendasi tindak lanjut belajar' },
              { id: 'b', text: 'Daftar peringkat nomor urut siswa dari tertinggi ke terendah semata' },
              { id: 'c', text: 'Rekap jumlah klik siswa tanpa konteks pemahaman materi' },
              { id: 'd', text: 'Nilai tunggal tanpa penjelasan kompetensi yang telah maupun belum tercapai' },
            ],
          },
        ],
        createdAt: BASE_ISO,
        updatedAt: BASE_ISO,
      });

      answerKeys.push({
        id: evalId,
        trainingId: trn.id,
        kind: 'evaluation',
        answers: [
          {
            questionId: `${evalId}_q1`,
            correctOptionIds: ['a'],
            acceptedTextAnswers: [],
            explanation: 'Diferensiasi yang efektif menyediakan jalur bimbingan, praktik terpandu, dan pengayaan sesuai bukti kesiapan belajar.',
          },
          {
            questionId: `${evalId}_q2`,
            correctOptionIds: ['a'],
            acceptedTextAnswers: [],
            explanation: 'Pelaporan autentik menampilkan perkembangan kompetensi, bukti nyata karya, dan rencana tindak lanjut yang konstruktif.',
          },
        ],
        createdAt: BASE_ISO,
        updatedAt: BASE_ISO,
      });
    }
  }

  const enrollments: TrainingEnrollment[] = [];
  const certificates: CertificateRecord[] = [];
  const attempts: AttemptRecord[] = [];
  const materialProgress: MaterialProgress[] = [];
  const taskSubmissions: TaskSubmission[] = [];
  const levelReflections: LevelReflection[] = [];

  for (const p of PARTICIPANT_SEEDS) {
    const unlocked: number[] = [];
    if (p.t1Start >= 1) {
      for (let lv = p.t1Start; lv <= p.t1Curr; lv++) {
        unlocked.push(lv);
      }
    }
    const certNo = p.t1Status === 'lulus' ? `SAMR-2026-PID-${p.uid.slice(-2).toUpperCase()}01` : '';
    const totalNeeded = p.t1Start >= 1 ? 5 - p.t1Start : 4;
    const overallProgress =
      p.t1Status === 'lulus'
        ? 100
        : p.t1Start === 0
          ? 0
          : Math.min(95, Math.round((p.t1Done.length / totalNeeded) * 100) + 18);

    enrollments.push({
      id: `enr_t1_${p.uid}`,
      trainingId: 'trn_digital_01',
      userId: p.uid,
      userName: p.name,
      instansi: p.instansi,
      kabupatenKota: p.kota,
      jenjangPendidikan: p.jenjang,
      mataPelajaran: p.mapel,
      status: p.t1Status,
      startingLevel: p.t1Start,
      currentLevel: p.t1Curr,
      unlockedLevels: unlocked,
      completedLevels: p.t1Done,
      assessmentScore: p.t1Score,
      overallProgress,
      certificateNumber: certNo,
      approvedBy: p.t1Status === 'menunggu' ? '' : 'admin_keg_01',
      enrolledAt: BASE_ISO,
      updatedAt: BASE_ISO,
    });

    if (p.t1Score >= 0) {
      attempts.push({
        id: `att_assess_t1_${p.uid}`,
        trainingId: 'trn_digital_01',
        bankId: 'bank_assess_trn_digital_01',
        kind: 'assessment',
        levelNumber: 0,
        userId: p.uid,
        userName: p.name,
        attemptNumber: 1,
        answers: {},
        autoScore: p.t1Score,
        manualScore: 0,
        finalScore: p.t1Score,
        percentage: p.t1Score,
        passed: true,
        assignedLevel: p.t1Start,
        gradingStatus: 'selesai',
        feedback: `Ditempatkan pada Level ${p.t1Start} SAMR berdasarkan skor asesmen awal ${p.t1Score}.`,
        gradedBy: 'sistem',
        createdAt: BASE_ISO,
        updatedAt: BASE_ISO,
      });
    }

    if (p.t1Done.length > 0) {
      for (const doneLvl of p.t1Done) {
        const evalScore = Math.min(98, 82 + doneLvl * 3);
        attempts.push({
          id: `att_quiz_t1_l${doneLvl}_${p.uid}`,
          trainingId: 'trn_digital_01',
          bankId: `bank_quiz_trn_digital_01_l${doneLvl}`,
          kind: 'quiz',
          levelNumber: doneLvl,
          userId: p.uid,
          userName: p.name,
          attemptNumber: 1,
          answers: {},
          autoScore: 86,
          manualScore: 0,
          finalScore: 86,
          percentage: 86,
          passed: true,
          assignedLevel: 0,
          gradingStatus: 'selesai',
          feedback: 'Memenuhi standar kelulusan kuis (>= 75).',
          gradedBy: 'sistem',
          createdAt: BASE_ISO,
          updatedAt: BASE_ISO,
        });
        attempts.push({
          id: `att_eval_t1_l${doneLvl}_${p.uid}`,
          trainingId: 'trn_digital_01',
          bankId: `bank_eval_trn_digital_01_l${doneLvl}`,
          kind: 'evaluation',
          levelNumber: doneLvl,
          userId: p.uid,
          userName: p.name,
          attemptNumber: 1,
          answers: {},
          autoScore: evalScore,
          manualScore: 0,
          finalScore: evalScore,
          percentage: evalScore,
          passed: true,
          assignedLevel: 0,
          gradingStatus: 'selesai',
          feedback: 'Lulus evaluasi kompetensi level SAMR.',
          gradedBy: 'sistem',
          createdAt: BASE_ISO,
          updatedAt: BASE_ISO,
        });

        taskSubmissions.push({
          id: `sub_t1_l${doneLvl}_${p.uid}`,
          trainingId: 'trn_digital_01',
          levelNumber: doneLvl as 1 | 2 | 3 | 4,
          userId: p.uid,
          userName: p.name,
          title: `Produk Praktik PID Level ${doneLvl} — ${p.mapel}`,
          description: `Implementasi pemanfaatan PID pada mata pelajaran ${p.mapel} di ${p.instansi} sesuai indikator Level ${doneLvl} SAMR.`,
          productUrl: 'https://drive.google.com/file/d/contoh-produk-pid-samr/view',
          productFileName: `Produk-PID-Level${doneLvl}-${p.uid}.pdf`,
          docMediaUrl: 'https://photos.google.com/contoh-dokumentasi-kelas-pid',
          docMediaName: `Dokumentasi-Kelas-Level${doneLvl}.jpg`,
          status: 'lulus',
          rubricScores: [
            { criterionId: 'c1', criterionLabel: 'Kesesuaian produk dengan tujuan pembelajaran', weight: 20, score: 4, comment: 'Sangat selaras dengan capaian pembelajaran.' },
            { criterionId: 'c2', criterionLabel: 'Ketepatan penggunaan fitur Papan Interaktif Digital (PID)', weight: 20, score: 4, comment: 'Pemanfaatan fitur PID lancar dan efektif.' },
            { criterionId: 'c3', criterionLabel: 'Kualitas desain dan struktur pembelajaran', weight: 15, score: 3, comment: 'Desain pembelajaran menarik dan terstruktur.' },
            { criterionId: 'c4', criterionLabel: 'Tingkat interaktivitas dan pelibatan peserta didik', weight: 15, score: 4, comment: 'Siswa terlibat aktif pada aktivitas layar.' },
            { criterionId: 'c5', criterionLabel: 'Kreativitas dan inovasi penyajian', weight: 15, score: 4, comment: 'Tepat mencerminkan tahap SAMR target.' },
            { criterionId: 'c6', criterionLabel: 'Kesesuaian dengan karakteristik level SAMR', weight: 15, score: 3, comment: 'Dokumentasi jelas dan informatif.' },
          ],
          weightedScore: 93,
          facilitatorFeedback: 'Praktik sangat baik dan siap direplikasi pada komunitas belajar sekolah.',
          gradedBy: doneLvl <= 2 ? 'fasilitator_01' : 'fasilitator_02',
          gradedByName: doneLvl <= 2 ? 'Dr. Budi Hartono [DEMO]' : 'Nadia Kusumawati, M.Pd. [DEMO]',
          createdAt: BASE_ISO,
          updatedAt: BASE_ISO,
        });

        levelReflections.push({
          id: `ref_t1_l${doneLvl}_${p.uid}`,
          trainingId: 'trn_digital_01',
          levelNumber: doneLvl as 1 | 2 | 3 | 4,
          userId: p.uid,
          userName: p.name,
          learningExperience: `Memahami strategi konkret pemanfaatan fitur PID untuk tahap Level ${doneLvl} pada pembelajaran ${p.mapel}.`,
          challenges: 'Penyesuaian manajemen waktu kelas saat transisi dari penjelasan guru ke aktivitas layar siswa.',
          competenciesGained: 'Siswa lebih antusias memvisualisasikan konsep abstrak secara langsung di depan kelas.',
          schoolImplementationPlan: `Akan diterapkan rutin 2 kali per minggu pada kelas ${p.jenjang} di ${p.instansi}.`,
          createdAt: BASE_ISO,
          updatedAt: BASE_ISO,
        });
      }
    }

    // Contoh tugas praktik menunggu penilaian fasilitator (peserta_01 & peserta_03)
    if (p.uid === 'peserta_01') {
      taskSubmissions.push({
        id: 'sub_t1_l1_peserta_01',
        trainingId: 'trn_digital_01',
        levelNumber: 1,
        userId: p.uid,
        userName: p.name,
        title: 'Slide Anotasi PID: Siklus Air & Ekosistem SD Kelas 5 [DEMO]',
        description:
          'Bahan ajar PDF 6 halaman yang telah diberi anotasi langkah siklus air menggunakan pena digital PID dan diekspor untuk catatan siswa.',
        productUrl: 'https://drive.google.com/file/d/contoh-anotasi-sdn04/view',
        productFileName: 'Anotasi-PID-Siklus-Air-Aulia.pdf',
        docMediaUrl: 'https://photos.google.com/contoh-foto-praktik-sdn04',
        docMediaName: 'Foto-Praktik-SDN04.jpg',
        status: 'menunggu_penilaian',
        rubricScores: [],
        weightedScore: 0,
        facilitatorFeedback: '',
        gradedBy: '',
        gradedByName: '',
        createdAt: BASE_ISO,
        updatedAt: BASE_ISO,
      });
    }

    if (p.uid === 'peserta_03') {
      taskSubmissions.push({
        id: 'sub_t1_l3_peserta_03',
        trainingId: 'trn_digital_01',
        levelNumber: 3,
        userId: p.uid,
        userName: p.name,
        title: 'Modul Ajar Kolaboratif Hukum Ohm Multi-Sentuh di PID [DEMO]',
        description:
          'Skenario 4 kelompok siswa membandingkan hasil pengukuran tegangan-arus pada kanvas kolaboratif PID dengan sesi peer feedback.',
        productUrl: 'https://drive.google.com/file/d/contoh-modul-hukum-ohm/view',
        productFileName: 'Modul-Modifikasi-PID-Citra.pdf',
        docMediaUrl: 'https://youtu.be/M7lc1UVf-VE',
        docMediaName: 'Video-Praktik-Hukum-Ohm.mp4',
        status: 'menunggu_penilaian',
        rubricScores: [],
        weightedScore: 0,
        facilitatorFeedback: '',
        gradedBy: '',
        gradedByName: '',
        createdAt: BASE_ISO,
        updatedAt: BASE_ISO,
      });
    }

    // Contoh tugas praktik perlu perbaikan (peserta_02)
    if (p.uid === 'peserta_02') {
      taskSubmissions.push({
        id: 'sub_t1_l2_peserta_02',
        trainingId: 'trn_digital_01',
        levelNumber: 2,
        userId: p.uid,
        userName: p.name,
        title: 'Bahan Ajar Grafik Fungsi Kuadrat dengan GeoGebra di PID [DEMO]',
        description: 'Presentasi interaktif menampilkan pergeseran parabola menggunakan GeoGebra di layar PID.',
        productUrl: 'https://drive.google.com/file/d/contoh-geogebra-bagas/view',
        productFileName: 'Fungsi-Kuadrat-PID-Bagas.pptx',
        docMediaUrl: '',
        docMediaName: '',
        status: 'perlu_perbaikan',
        rubricScores: [
          { criterionId: 'c1', criterionLabel: 'Kesesuaian produk dengan tujuan pembelajaran', weight: 20, score: 3, comment: 'Sesuai KD Matematika SMP.' },
          { criterionId: 'c2', criterionLabel: 'Ketepatan penggunaan fitur Papan Interaktif Digital (PID)', weight: 20, score: 3, comment: 'Simulasi GeoGebra berjalan baik.' },
          { criterionId: 'c3', criterionLabel: 'Kualitas desain dan struktur pembelajaran', weight: 15, score: 2, comment: 'Tambahkan kuis interaktif singkat untuk cek pemahaman.' },
          { criterionId: 'c4', criterionLabel: 'Tingkat interaktivitas dan pelibatan peserta didik', weight: 15, score: 2, comment: 'Belum tampak interaksi siswa langsung di layar.' },
          { criterionId: 'c5', criterionLabel: 'Kreativitas dan inovasi penyajian', weight: 15, score: 3, comment: 'Sudah mengarah ke Augmentation.' },
          { criterionId: 'c6', criterionLabel: 'Kesesuaian dengan karakteristik level SAMR', weight: 15, score: 1, comment: 'Tautan foto/video dokumentasi praktik belum dilampirkan.' },
        ],
        weightedScore: 60,
        facilitatorFeedback:
          'Simulasi GeoGebra sudah bagus. Mohon tambahkan 1 aktivitas kuis cepat dan unggah foto/video dokumentasi praktik agar dapat lulus Level 2.',
        gradedBy: 'fasilitator_01',
        gradedByName: 'Dr. Budi Hartono [DEMO]',
        createdAt: BASE_ISO,
        updatedAt: BASE_ISO,
      });
    }

    // Contoh peserta butuh bantuan fasilitator (nilai kuis di bawah standar pada peserta_13)
    if (p.uid === 'peserta_13') {
      attempts.push({
        id: 'att_quiz_t1_l1_peserta_13_fail',
        trainingId: 'trn_digital_01',
        bankId: 'bank_quiz_trn_digital_01_l1',
        kind: 'quiz',
        levelNumber: 1,
        userId: p.uid,
        userName: p.name,
        attemptNumber: 1,
        answers: {},
        autoScore: 40,
        manualScore: 0,
        finalScore: 40,
        percentage: 40,
        passed: false,
        assignedLevel: 0,
        gradingStatus: 'selesai',
        feedback: 'Perlu mengulang materi anatomi dasar PID sebelum percobaan berikutnya.',
        gradedBy: 'sistem',
        createdAt: BASE_ISO,
        updatedAt: BASE_ISO,
      });
    }

    // Contoh antrean penilaian manual untuk fasilitator (peserta_02)
    if (p.uid === 'peserta_02') {
      attempts.push({
        id: 'att_quiz_t1_l2_peserta_02_manual',
        trainingId: 'trn_digital_01',
        bankId: 'bank_quiz_trn_digital_01_l2',
        kind: 'quiz',
        levelNumber: 2,
        userId: p.uid,
        userName: p.name,
        attemptNumber: 1,
        answers: {
          bank_quiz_trn_digital_01_l2_q3: {
            textAnswer: 'SAMR (Substitution, Augmentation, Modification, Redefinition)',
          },
        },
        autoScore: 70,
        manualScore: 0,
        finalScore: 70,
        percentage: 70,
        passed: false,
        assignedLevel: 0,
        gradingStatus: 'menunggu_manual',
        feedback: '',
        gradedBy: '',
        createdAt: BASE_ISO,
        updatedAt: BASE_ISO,
      });
    }

    if (certNo) {
      certificates.push({
        certificateNumber: certNo,
        trainingId: 'trn_digital_01',
        trainingName: 'Pelatihan Pemanfaatan Papan Interaktif Digital dalam Pembelajaran [DEMO]',
        organizer: 'Balai Pengembangan Kompetensi Guru & Digitalisasi Pembelajaran',
        userId: p.uid,
        participantName: p.name,
        completedLevel: 4,
        issuedDate: '2026-11-12',
        signerName: 'Dr. Hendra Kusuma, M.Pd.',
        signerTitle: 'Kepala Balai Pengembangan Kompetensi Guru',
        status: 'valid',
        createdAt: BASE_ISO,
      });
    }
  }

  // Multi-kegiatan: 6 peserta juga terdaftar di Kegiatan 2
  PARTICIPANT_SEEDS.slice(0, 6).forEach((p, idx) => {
    const score = [35, 55, 78, 88, 64, 42][idx];
    const startLvl = score <= 40 ? 1 : score <= 60 ? 2 : score <= 80 ? 3 : 4;
    enrollments.push({
      id: `enr_t2_${p.uid}`,
      trainingId: 'trn_data_02',
      userId: p.uid,
      userName: p.name,
      instansi: p.instansi,
      kabupatenKota: p.kota,
      jenjangPendidikan: p.jenjang,
      mataPelajaran: p.mapel,
      status: 'aktif',
      startingLevel: startLvl,
      currentLevel: startLvl,
      unlockedLevels: [startLvl],
      completedLevels: [],
      assessmentScore: score,
      overallProgress: 25,
      certificateNumber: '',
      approvedBy: 'admin_keg_02',
      enrolledAt: BASE_ISO,
      updatedAt: BASE_ISO,
    });
  });

  // Progres materi awal untuk peserta_01
  materialProgress.push({
    id: 'prog_t1_l1_m1_peserta_01',
    trainingId: 'trn_digital_01',
    levelId: 'lvl_trn01_1',
    levelNumber: 1,
    materialId: 'mat_t1_l1_01',
    userId: 'peserta_01',
    status: 'selesai',
    createdAt: BASE_ISO,
    updatedAt: BASE_ISO,
  });

  const announcements: AnnouncementRecord[] = [
    {
      id: 'ann_01',
      trainingId: 'trn_digital_01',
      title: 'Panduan Asesmen Awal & Jalur Adaptif Model SAMR',
      body: 'Peserta yang telah disetujui dimohon segera mengerjakan Asesmen Awal Kompetensi. Sistem akan menempatkan Anda langsung pada Level Substitution, Augmentation, Modification, atau Redefinition sesuai hasil asesmen.',
      authorUid: 'admin_keg_01',
      authorName: 'Dewi Anggraeni [DEMO]',
      isPublished: true,
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      id: 'ann_02',
      trainingId: 'trn_digital_01',
      title: 'Klinik Pendampingan Praktik Papan Interaktif Digital (PID)',
      body: 'Fasilitator membuka sesi demonstrasi langsung dan review rubrik tugas praktik setiap hari Kamis pukul 14.00 WIB. Pastikan dokumentasi foto/video praktik Anda dapat diakses.',
      authorUid: 'fasilitator_01',
      authorName: 'Dr. Budi Hartono [DEMO]',
      isPublished: true,
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
  ];

  const activityLogs: ActivityLogRecord[] = [
    {
      id: 'log_seed_01',
      trainingId: 'trn_digital_01',
      actorUid: 'admin_keg_01',
      actorName: 'Dewi Anggraeni [DEMO]',
      actorRole: 'admin_kegiatan',
      action: 'PERSETUJUAN_PESERTA',
      targetType: 'enrollment',
      targetId: 'enr_t1_peserta_01',
      details: 'Menyetujui pendaftaran Aulia Rahmawati, S.Pd. pada kegiatan SAMR-PID-2026.',
      overrideReason: '',
      createdAt: BASE_ISO,
    },
    {
      id: 'log_seed_02',
      trainingId: 'trn_digital_01',
      actorUid: 'peserta_04',
      actorName: 'Dimas Saputra, M.Kom.',
      actorRole: 'peserta',
      action: 'TERBIT_SERTIFIKAT',
      targetType: 'certificate',
      targetId: 'SAMR-2026-PID-0401',
      details: 'Sertifikat digital kompetensi SAMR diterbitkan otomatis setelah lulus seluruh syarat Level 4 (Redefinition).',
      overrideReason: '',
      createdAt: BASE_ISO,
    },
    {
      id: 'log_seed_03',
      trainingId: 'trn_digital_01',
      actorUid: 'super_admin_01',
      actorName: 'Raka Pratama (Super Admin) [DEMO]',
      actorRole: 'super_admin',
      action: 'INISIALISASI_SISTEM',
      targetType: 'training_program',
      targetId: 'trn_digital_01',
      details: 'Konfigurasi 4 level SAMR (0-40 Substitution, 40.01-60 Augmentation, 60.01-80 Modification, 80.01-100 Redefinition) aktif.',
      overrideReason: '',
      createdAt: BASE_ISO,
    },
  ];

  const schedules: TrainingSchedule[] = [
    {
      id: 'sch_01',
      trainingId: 'trn_digital_01',
      levelNumber: 0,
      title: 'Orientasi Program & Pelaksanaan Asesmen Awal SAMR',
      sessionDate: '2026-11-22',
      startTime: '09:00',
      endTime: '10:30',
      facilitatorName: 'Dewi Anggraeni [DEMO]',
      mode: 'daring',
      locationOrUrl: 'Ruang Konferensi Virtual LMS SAMR #1',
      notes: 'Penjelasan alur penempatan level adaptif dan rubrik penilaian praktik PID.',
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      id: 'sch_02',
      trainingId: 'trn_digital_01',
      levelNumber: 1,
      title: 'Demonstrasi Langsung: Pengoperasian & Anotasi Dasar PID (Level 1–2)',
      sessionDate: '2026-11-26',
      startTime: '13:30',
      endTime: '15:30',
      facilitatorName: 'Dr. Budi Hartono [DEMO]',
      mode: 'luring',
      locationOrUrl: 'Lab Microteaching PID & Ruang Daring',
      notes: 'Praktik kalibrasi layar, split-screen simulasi PhET, dan pembuatan kuis instan.',
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      id: 'sch_03',
      trainingId: 'trn_digital_01',
      levelNumber: 3,
      title: 'Workshop Kelas Kolaboratif & Proyek Lintas Sekolah (Level 3–4)',
      sessionDate: '2026-12-03',
      startTime: '10:00',
      endTime: '12:00',
      facilitatorName: 'Nadia Kusumawati, M.Pd. [DEMO]',
      mode: 'luring',
      locationOrUrl: 'Balai Kompetensi Guru · Ruang Praktik PID B',
      notes: 'Simulasi kanvas multi-pengguna dan penyusunan proyek Redefinition.',
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
    {
      id: 'sch_04',
      trainingId: 'trn_data_02',
      levelNumber: 2,
      title: 'Klinik Analisis Butir Soal & Umpan Balik Real-Time',
      sessionDate: '2026-11-28',
      startTime: '14:00',
      endTime: '16:00',
      facilitatorName: 'Yusuf Ramadhan, M.Sc. [DEMO]',
      mode: 'daring',
      locationOrUrl: 'Ruang Virtual Analitik Kelas',
      notes: 'Pendampingan interpretasi grafik capaian siswa untuk diferensiasi.',
      createdAt: BASE_ISO,
      updatedAt: BASE_ISO,
    },
  ];

  const facilitatorNotes: FacilitatorNote[] = [
    {
      id: 'note_01',
      trainingId: 'trn_digital_01',
      levelNumber: 1,
      participantUid: 'peserta_01',
      participantName: 'Aulia Rahmawati, S.Pd.',
      authorUid: 'fasilitator_01',
      authorName: 'Dr. Budi Hartono [DEMO]',
      content:
        'Materi pertama sudah selesai dan produk praktik sudah diunggah. Selesaikan modul PDF kedua serta kuis pemahaman Level 1 sambil menunggu review rubrik praktik.',
      createdAt: BASE_ISO,
    },
    {
      id: 'note_02',
      trainingId: 'trn_digital_01',
      levelNumber: 2,
      participantUid: 'all',
      participantName: 'Semua Peserta Level 2 (Augmentation)',
      authorUid: 'fasilitator_01',
      authorName: 'Dr. Budi Hartono [DEMO]',
      content:
        'Pastikan bahan ajar interaktif Level 2 memadukan minimal 1 simulasi/video dan 1 kuis cepat, serta lampirkan dokumentasi praktik agar memenuhi seluruh aspek rubrik.',
      createdAt: BASE_ISO,
    },
    {
      id: 'note_03',
      trainingId: 'trn_digital_01',
      levelNumber: 3,
      participantUid: 'all',
      participantName: 'Semua Peserta Level 3 (Modification)',
      authorUid: 'fasilitator_02',
      authorName: 'Nadia Kusumawati, M.Pd. [DEMO]',
      content:
        'Fokus utama Level 3 adalah menggeser kendali aktivitas ke siswa melalui kolaborasi di layar PID. Sertakan skenario peer feedback dalam Modul Ajar Anda.',
      createdAt: BASE_ISO,
    },
  ];

  return {
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
    institutionSettings: DEFAULT_INSTITUTION_SETTINGS,
  };
}
