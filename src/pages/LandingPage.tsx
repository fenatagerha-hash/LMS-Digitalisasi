import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  GraduationCap,
  Layers,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { ASSET_HERO_PID_SAMR } from '../data/seedDataset';
import { useLms } from '../context/LmsContext';
import { SAMR_LEVEL_META } from '../types/lms';

const LMS_GOALS = [
  {
    num: '01',
    title: 'Pemetaan Kemampuan Awal PID',
    desc: 'Mengukur kesiapan guru dalam mengoperasikan dan mengintegrasikan Papan Interaktif Digital melalui asesmen diagnostik awal.',
  },
  {
    num: '02',
    title: 'Penempatan Level SAMR Adaptif',
    desc: 'Menempatkan peserta langsung pada Level 1 Substitution hingga Level 4 Redefinition sesuai hasil asesmen tanpa mengulang level dasar.',
  },
  {
    num: '03',
    title: 'Pembelajaran Terstruktur 8 Komponen',
    desc: 'Setiap level menyajikan orientasi, materi, demonstrasi PID, tugas praktik, kuis, evaluasi, refleksi, dan verifikasi kelulusan.',
  },
  {
    num: '04',
    title: 'Praktik Nyata & Rubrik Skala 1–4',
    desc: 'Peserta mengunggah produk pembelajaran serta dokumentasi praktik PID yang dinilai fasilitator dengan rubrik 6 aspek.',
  },
  {
    num: '05',
    title: 'Pengukuran Kenaikan Kompetensi',
    desc: 'Membandingkan capaian asesmen awal terhadap hasil evaluasi akhir, kuis pemahaman, dan skor rubrik praktik di setiap level.',
  },
  {
    num: '06',
    title: 'Monitoring Multi-Dimensi',
    desc: 'Memantau perkembangan guru secara individu maupun kelompok berdasarkan kegiatan, jenjang pendidikan, sekolah, dan kabupaten/kota.',
  },
  {
    num: '07',
    title: 'Sertifikat Digital Ber-QR Publik',
    desc: 'Menerbitkan sertifikat kompetensi bernomor unik dengan kode QR yang dapat diverifikasi keabsahannya secara terbuka.',
  },
];

const GUIDE_STEPS = [
  {
    step: '1',
    title: 'Registrasi & Verifikasi Akun',
    desc: 'Daftar sebagai peserta dengan memilih kegiatan aktif, asal sekolah, jenjang pendidikan, dan mata pelajaran.',
  },
  {
    step: '2',
    title: 'Kerjakan Asesmen Awal Kompetensi',
    desc: 'Selesaikan asesmen diagnostik SAMR untuk mendapatkan rekomendasi level awal (Substitution, Augmentation, Modification, atau Redefinition).',
  },
  {
    step: '3',
    title: 'Pelajari Materi & Demonstrasi PID',
    desc: 'Akses modul bacaan, video demonstrasi penggunaan Papan Interaktif Digital, dan contoh implementasi kelas pada level aktif.',
  },
  {
    step: '4',
    title: 'Unggah Praktik, Kuis, Evaluasi & Refleksi',
    desc: 'Kirim produk praktik PID untuk dinilai rubrik fasilitator, tuntaskan kuis & evaluasi (KKM 75), serta simpan refleksi penerapan di kelas.',
  },
  {
    step: '5',
    title: 'Buka Level Berikutnya & Unduh Sertifikat',
    desc: 'Setelah syarat level terpenuhi, level berikutnya terbuka otomatis hingga lulus Level 4 dan memperoleh sertifikat PDF ber-QR.',
  },
];

export default function LandingPage() {
  const { currentUser, trainings, institutionSettings } = useLms();
  const [activeSamr, setActiveSamr] = useState<1 | 2 | 3 | 4>(1);
  const selectedMeta = SAMR_LEVEL_META[activeSamr];
  const publicTrainings = trainings.filter((t) => t.status !== 'arsip');

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-[#212529]">
      {/* PAMANDAI EDU Top Bar — 68px White Navbar, 3-Zone Contract */}
      <header className="sticky top-0 z-30 h-[68px] border-b border-[#dee2e6] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="mx-auto flex h-full max-w-[1360px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0f6cbf] text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-display text-base font-bold tracking-tight text-[#212529] whitespace-nowrap">
              PAMANDAI EDU
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-[#495057] lg:flex">
            <a href="#tentang" className="hover:text-[#0f6cbf] transition-colors whitespace-nowrap shrink-0">
              Tentang LMS
            </a>
            <a href="#model-samr" className="hover:text-[#0f6cbf] transition-colors whitespace-nowrap shrink-0">
              Model SAMR
            </a>
            <a href="#kegiatan" className="hover:text-[#0f6cbf] transition-colors whitespace-nowrap shrink-0">
              Kegiatan
            </a>
            <a href="#panduan" className="hover:text-[#0f6cbf] transition-colors whitespace-nowrap shrink-0">
              Panduan
            </a>
            <Link to="/verifikasi" className="hover:text-[#0f6cbf] transition-colors whitespace-nowrap shrink-0">
              Verifikasi
            </Link>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            {currentUser ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-[#0f6cbf] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0b5394] transition-colors whitespace-nowrap shrink-0"
              >
                Pelatihan Saya
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f6cbf] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0b5394] transition-colors whitespace-nowrap shrink-0"
              >
                Masuk Sistem
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Editorial Split */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-16">
          <div className="lg:col-span-6 space-y-6">
            <div className="text-xs font-semibold uppercase tracking-widest text-[#059669]">
              {institutionSettings.institutionName}
            </div>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-[#0F2544] sm:text-4xl lg:text-[42px]">
              {institutionSettings.appName}
            </h1>
            <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
              {institutionSettings.tagline}. Dirancang khusus untuk memetakan, melatih, dan mengevaluasi kompetensi guru dalam memanfaatkan{' '}
              <strong className="font-semibold text-slate-900">Papan Interaktif Digital (PID)</strong>{' '}
              secara adaptif dari tahap Substitution hingga Redefinition.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                to={currentUser ? '/kegiatan?aktivitas=pretest' : '/daftar'}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0F2544] px-5 py-3 text-sm font-semibold text-white hover:bg-[#173660] transition-colors"
              >
                <ClipboardCheck className="h-4 w-4" />
                {currentUser ? 'Buka Kegiatan & Asesmen Awal' : 'Daftar & Mulai Pelatihan'}
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
              >
                Masuk / Coba Akun Demo
              </Link>
              <Link
                to="/verifikasi"
                className="inline-flex items-center gap-1.5 px-2 py-2 text-sm font-medium text-[#1D4ED8] hover:underline"
              >
                <ShieldCheck className="h-4 w-4" />
                Verifikasi Sertifikat QR
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-slate-200 pt-6">
              <div>
                <div className="font-display text-2xl font-bold text-[#0F2544] tabular-nums">4 Level</div>
                <div className="text-xs text-slate-500">Kerangka SAMR Adaptif</div>
              </div>
              <div>
                <div className="font-display text-2xl font-bold text-[#1D4ED8] tabular-nums">8 Tahap</div>
                <div className="text-xs text-slate-500">Orientasi s.d. Refleksi</div>
              </div>
              <div>
                <div className="font-display text-2xl font-bold text-[#059669] tabular-nums">6 Aspek</div>
                <div className="text-xs text-slate-500">Rubrik Praktik Skala 1–4</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
              <img
                src={ASSET_HERO_PID_SAMR}
                alt="Guru memanfaatkan Papan Interaktif Digital (PID) pada pembelajaran interaktif berbasis SAMR"
                className="aspect-[16/10] w-full object-cover"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-5 py-3.5 text-xs text-slate-600">
                <span className="font-semibold text-[#0F2544]">
                  Praktik Kelas Papan Interaktif Digital (PID)
                </span>
                <span>Substitution · Augmentation · Modification · Redefinition</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tentang LMS — 7 Tujuan Utama */}
      <section id="tentang" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-widest text-[#1D4ED8]">
            Tentang LMS
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold text-[#0F2544] sm:text-3xl">
            Tujuan Utama Pelatihan Digitalisasi Pembelajaran
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Platform ini mengintegrasikan pemetaan awal, pembelajaran terdiferensiasi, praktik nyata PID, penilaian rubrik fasilitator, serta pelaporan akuntabel bagi lembaga penyelenggara.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LMS_GOALS.map((goal) => (
            <div
              key={goal.num}
              className="rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300"
            >
              <div className="font-mono text-xs font-bold text-[#059669] tabular-nums">
                {goal.num}
              </div>
              <h3 className="mt-2 font-display text-sm font-bold text-[#0F2544]">{goal.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{goal.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Model SAMR Interaktif */}
      <section id="model-samr" className="border-y border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="text-xs font-semibold uppercase tracking-widest text-[#059669]">
                Model Kompetensi SAMR · Khusus Kegiatan Digitalisasi Pembelajaran
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold text-[#0F2544] sm:text-3xl">
                Empat Level Pemanfaatan Papan Interaktif Digital (PID)
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Khusus diterapkan pada kegiatan Digitalisasi Pembelajaran. Pilih salah satu level di bawah untuk melihat definisi, rentang skor asesmen awal, contoh praktik PID, kompetensi target, serta produk praktik yang dihasilkan peserta.
              </p>
            </div>
            <Link
              to={currentUser ? '/kegiatan?training=trn_digital_01&aktivitas=pretest' : '/login'}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1D4ED8] hover:underline"
            >
              Ukur level Anda lewat Asesmen Awal
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([1, 2, 3, 4] as const).map((lv) => {
              const meta = SAMR_LEVEL_META[lv];
              const isSelected = activeSamr === lv;
              const scoreLabel =
                lv === 1 ? '0–40' : lv === 2 ? '41–60' : lv === 3 ? '61–80' : '81–100';
              return (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setActiveSamr(lv)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? 'border-[#0F2544] bg-[#0F2544] text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className={isSelected ? 'text-emerald-300' : 'text-[#1D4ED8]'}>
                      LEVEL {lv}
                    </span>
                    <span className="font-mono tabular-nums opacity-85">
                      Skor {scoreLabel}
                    </span>
                  </div>
                  <div className="mt-1.5 font-display text-lg font-bold">{meta.name}</div>
                  <div className={`text-xs ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                    {meta.indonesianName}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-6 lg:p-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="lg:col-span-5 space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
                  Level {selectedMeta.level} · Rentang Skor Asesmen Awal{' '}
                  {selectedMeta.level === 1
                    ? '0–40'
                    : selectedMeta.level === 2
                      ? '41–60'
                      : selectedMeta.level === 3
                        ? '61–80'
                        : '81–100'}
                </div>
                <h3 className="font-display text-2xl font-bold text-[#0F2544]">
                  {selectedMeta.name} ({selectedMeta.indonesianName})
                </h3>
                <p className="text-sm leading-relaxed text-slate-700">{selectedMeta.definition}</p>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                    Target Produk Praktik PID
                  </div>
                  <p className="mt-1 text-sm font-medium text-emerald-950">
                    {selectedMeta.practicalProduct}
                  </p>
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0F2544]">
                    <Compass className="h-4 w-4 text-[#1D4ED8]" />
                    Contoh & Aktivitas Pemanfaatan PID
                  </div>
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700 border border-slate-100">
                    {selectedMeta.pidExample}
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {selectedMeta.activities.slice(0, 3).map((act, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0F2544]">
                    <Layers className="h-4 w-4 text-[#1D4ED8]" />
                    Kompetensi Utama Level {selectedMeta.level}
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {selectedMeta.competencies.map((comp, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]" />
                        <span>{comp}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    {selectedMeta.recommendedFocus}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Informasi Kegiatan Pelatihan Aktif */}
      <section id="kegiatan" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-[#1D4ED8]">
              Informasi Kegiatan
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-[#0F2544] sm:text-3xl">
              Program Pelatihan Digitalisasi Pembelajaran Aktif
            </h2>
          </div>
          <Link
            to="/daftar"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1D4ED8] hover:underline"
          >
            Registrasi Peserta Baru
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {publicTrainings.map((trn) => (
            <div
              key={trn.id}
              className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div>
                {trn.bannerUrl && (
                  <img
                    src={trn.bannerUrl}
                    alt={trn.name}
                    className="h-44 w-full object-cover border-b border-slate-200"
                  />
                )}
                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-[#1D4ED8]">{trn.code}</span>
                    <span>·</span>
                    <span className="capitalize">{trn.executionMode || 'hybrid'}</span>
                    <span>·</span>
                    <span className="font-semibold text-[#059669]">
                      {trn.status === 'aktif' ? 'Pendaftaran Dibuka' : trn.status}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-lg font-bold text-[#0F2544]">
                    {trn.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{trn.description}</p>
                  <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        {trn.startDate} s.d. {trn.endDate}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{trn.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        Penyelenggara: {trn.organizer} · Kuota {trn.quota} peserta
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">
                <span className="text-xs text-slate-500">
                  {trn.requireApproval
                    ? 'Verifikasi Admin Kegiatan'
                    : 'Pendaftaran Langsung Aktif'}
                </span>
                <Link
                  to={currentUser ? `/pembelajaran?training=${trn.id}` : `/daftar?training=${trn.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F2544] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#173660]"
                >
                  {currentUser ? 'Masuk Ruang Belajar' : 'Daftar Kegiatan Ini'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Panduan Penggunaan */}
      <section id="panduan" className="border-t border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-widest text-[#059669]">
              Panduan Penggunaan
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-[#0F2544] sm:text-3xl">
              Alur Pembelajaran Adaptif Hingga Sertifikasi
            </h2>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-5">
            {GUIDE_STEPS.map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F2544] font-mono text-sm font-bold text-white tabular-nums">
                  {item.step}
                </div>
                <h3 className="mt-3 font-display text-sm font-bold text-[#0F2544]">{item.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-[#0F2544] p-6 text-white sm:flex-row sm:items-center sm:p-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                <Award className="h-4 w-4" />
                Siap Mengukur Level Kompetensi SAMR Anda?
              </div>
              <h3 className="font-display text-xl font-bold">
                Masuk dengan akun Google atau coba seluruh 5 peran melalui akun pengujian [DEMO].
              </h3>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#0F2544] hover:bg-slate-100"
              >
                <BookOpen className="h-4 w-4" />
                Masuk ke LMS
              </Link>
              <Link
                to="/verifikasi"
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Verifikasi Sertifikat
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-[#F8FAFC] py-8 text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div>
            <div className="font-semibold text-[#0F2544]">{institutionSettings.appName}</div>
            <div className="mt-0.5">
              {institutionSettings.institutionName} · {institutionSettings.address}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span>Layanan: {institutionSettings.supportEmail}</span>
            <span>·</span>
            <Link to="/verifikasi" className="text-[#1D4ED8] hover:underline">
              Verifikasi Sertifikat
            </Link>
            <span>·</span>
            <Link to="/login" className="text-[#1D4ED8] hover:underline">
              Login Pengguna
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
