import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  GraduationCap,
  KeyRound,
  Link2,
  Shield,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useLms } from '../context/LmsContext';
import {
  isSamrTraining,
  JENJANG_OPTIONS,
  REGISTRATION_ROLE_META,
  RegistrationRoleSlug,
  STATUS_PESERTA_OPTIONS,
} from '../types/lms';

type AuthTab = 'login' | 'register' | 'reset';

const DEMO_ROLES = [
  {
    uid: 'super_admin_01',
    slug: 'panitia' as const,
    roleTitle: 'Super Admin [DEMO]',
    person: 'Raka Pratama',
    email: 'fenatagerha@gmail.com',
  },
  {
    uid: 'admin_keg_01',
    slug: 'panitia' as const,
    roleTitle: 'Panitia / Admin Kegiatan [DEMO]',
    person: 'Dewi Anggraeni',
    email: 'dewi.admin@lmsdigital.id',
  },
  {
    uid: 'fasilitator_01',
    slug: 'fasilitator' as const,
    roleTitle: 'Fasilitator PID [DEMO]',
    person: 'Dr. Budi Hartono',
    email: 'budi.fasilitator@lmsdigital.id',
  },
  {
    uid: 'peserta_07',
    slug: 'peserta' as const,
    roleTitle: 'Peserta (Belum Asesmen) [DEMO]',
    person: 'Gita Savitri, S.Pd.',
    email: 'gita.savitri@guru.belajar.id',
  },
  {
    uid: 'peserta_01',
    slug: 'peserta' as const,
    roleTitle: 'Peserta (Level 1 Substitution) [DEMO]',
    person: 'Aulia Rahmawati, S.Pd.',
    email: 'aulia.rahmawati@guru.belajar.id',
  },
  {
    uid: 'peserta_03',
    slug: 'peserta' as const,
    roleTitle: 'Peserta (Level 3 Modification) [DEMO]',
    person: 'Citra Dewi Lestari, S.Si.',
    email: 'citra.lestari@guru.belajar.id',
  },
  {
    uid: 'peserta_04',
    slug: 'peserta' as const,
    roleTitle: 'Peserta (Lulus Level 4) [DEMO]',
    person: 'Dimas Saputra, M.Kom.',
    email: 'dimas.saputra@guru.belajar.id',
  },
  {
    uid: 'pemantau_01',
    slug: 'panitia' as const,
    roleTitle: 'Supervisor (Akses Baca) [DEMO]',
    person: 'Ir. Bambang Suryadi',
    email: 'bambang.pemantau@lmsdigital.id',
  },
];

function parseRoleSlug(raw?: string): RegistrationRoleSlug | null {
  if (raw === 'peserta' || raw === 'fasilitator' || raw === 'panitia') return raw;
  return null;
}

export function LoginPage({ initialTab = 'login' }: { initialTab?: AuthTab }) {
  const {
    loginWithGoogle,
    loginWithEmailDemo,
    enterDemoAccount,
    registerParticipantSelf,
    trainings,
    institutionSettings,
    showToast,
  } = useLms();
  const navigate = useNavigate();
  const { roleSlug: rawRoleSlug } = useParams<{ roleSlug?: string }>();
  const [searchParams] = useSearchParams();

  const roleSlug = parseRoleSlug(rawRoleSlug);
  const activeRoleMeta = roleSlug ? REGISTRATION_ROLE_META[roleSlug] : null;
  const tabFromQuery = searchParams.get('tab');
  const trainingFromQuery = searchParams.get('kegiatan') || searchParams.get('training');

  const [tab, setTab] = useState<AuthTab>(
    tabFromQuery === 'register' || initialTab === 'register' ? 'register' : initialTab,
  );
  const [selectedRegisterRole, setSelectedRegisterRole] = useState<RegistrationRoleSlug>(
    roleSlug || 'peserta',
  );
  const [busy, setBusy] = useState(false);
  const [showDemoList, setShowDemoList] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    setTab(tabFromQuery === 'register' || initialTab === 'register' ? 'register' : initialTab);
  }, [initialTab, tabFromQuery]);

  useEffect(() => {
    if (roleSlug) {
      setSelectedRegisterRole(roleSlug);
    }
  }, [roleSlug]);

  const resolvedDefaultTrainingId =
    (trainingFromQuery && trainings.some((t) => t.id === trainingFromQuery)
      ? trainingFromQuery
      : trainings[0]?.id) || 'trn_digital_01';

  const [regForm, setRegForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    instansi: '',
    npsn: '',
    kabupatenKota: '',
    jabatan: activeRoleMeta?.defaultJabatan || 'Guru Mata Pelajaran',
    jenjangPendidikan: 'SMA/MA',
    mataPelajaran: '',
    statusPeserta: 'Guru ASN (PNS)',
    trainingId: resolvedDefaultTrainingId,
  });

  useEffect(() => {
    setRegForm((prev) => ({
      ...prev,
      trainingId: resolvedDefaultTrainingId,
      jabatan: REGISTRATION_ROLE_META[selectedRegisterRole].defaultJabatan,
    }));
  }, [resolvedDefaultTrainingId, selectedRegisterRole]);

  const [regResult, setRegResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const selectedTrainingObj = trainings.find((t) => t.id === regForm.trainingId) || trainings[0];

  const handleGoogleLogin = async () => {
    setBusy(true);
    try {
      await loginWithGoogle();
      navigate(trainingFromQuery ? `/kegiatan?training=${trainingFromQuery}` : '/kegiatan');
    } finally {
      setBusy(false);
    }
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const res = loginWithEmailDemo(loginEmail, loginPassword);
    if (res.ok) {
      navigate(trainingFromQuery ? `/kegiatan?training=${trainingFromQuery}` : '/kegiatan');
    }
  };

  const handleDemoEnter = (uid: string) => {
    enterDemoAccount(uid);
    navigate(trainingFromQuery ? `/kegiatan?training=${trainingFromQuery}` : '/kegiatan');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegResult(null);
    if (regForm.password.trim().length < 6) {
      setRegResult({ ok: false, message: 'Kata sandi minimal 6 karakter.' });
      return;
    }
    if (selectedRegisterRole === 'peserta' && !/^[0-9]{8}$/.test(regForm.npsn.trim())) {
      setRegResult({
        ok: false,
        message: 'NPSN wajib terdiri dari 8 digit angka (contoh: 20219271).',
      });
      return;
    }
    const targetRoleMeta = REGISTRATION_ROLE_META[selectedRegisterRole];
    const targetRole = targetRoleMeta.role as 'peserta' | 'fasilitator' | 'admin_kegiatan';

    const res = await registerParticipantSelf({
      ...regForm,
      npsn: selectedRegisterRole === 'peserta' ? regForm.npsn.trim() : '',
      role: targetRole,
    });
    setRegResult(res);
    if (res.ok && res.data && typeof res.data === 'object' && 'uid' in res.data) {
      const uid = String((res.data as { uid: string }).uid);
      const chosenTrainingId = regForm.trainingId;
      setRegForm({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        instansi: '',
        npsn: '',
        kabupatenKota: '',
        jabatan: targetRoleMeta.defaultJabatan,
        jenjangPendidikan: 'SMA/MA',
        mataPelajaran: '',
        statusPeserta: 'Guru ASN (PNS)',
        trainingId: resolvedDefaultTrainingId,
      });
      enterDemoAccount(uid);
      if (targetRole === 'peserta') {
        navigate(`/kegiatan?training=${chosenTrainingId}&aktivitas=pretest`);
      } else {
        navigate(`/kegiatan?training=${chosenTrainingId}`);
      }
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.includes('@')) {
      showToast('error', 'Masukkan alamat email yang valid.');
      return;
    }
    setResetSent(true);
    showToast(
      'info',
      `Tautan pemulihan kata sandi disiapkan untuk ${resetEmail}. Pada mode Google Sign-In, kelola sandi melalui Akun Google.`,
    );
  };

  const copyPortalUrl = async (path: string, label: string) => {
    const url = `${window.location.origin}${path}${trainingFromQuery ? `?kegiatan=${trainingFromQuery}` : ''}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(path);
      showToast('success', `${label} berhasil disalin.`);
      window.setTimeout(() => setCopiedSlug(null), 1800);
    } catch {
      showToast('info', url);
    }
  };

  const filteredDemoRoles = roleSlug
    ? DEMO_ROLES.filter((r) => r.slug === roleSlug)
    : DEMO_ROLES;

  const regRoleMeta = REGISTRATION_ROLE_META[selectedRegisterRole];

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-[#212529] flex flex-col">
      {/* PAMANDAI EDU White 68px Top Navbar */}
      <header className="h-[68px] bg-white border-b border-[#dee2e6] shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="max-w-[1360px] mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
          <Link to="/" className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <div className="w-9 h-9 rounded-lg bg-[#0f6cbf] text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <span className="block font-display text-[15px] font-extrabold tracking-tight text-[#212529] whitespace-nowrap">
                PAMANDAI EDU
              </span>
              <span className="block text-[11px] font-bold text-[#0f6cbf] whitespace-nowrap">
                Kemendikdasmen
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#495057]">
            <Link to="/" className="hover:text-[#0f6cbf] transition-colors whitespace-nowrap shrink-0">
              Beranda
            </Link>
            <Link
              to="/login/peserta"
              className={`hover:text-[#0f6cbf] transition-colors whitespace-nowrap shrink-0 ${
                roleSlug === 'peserta' ? 'text-[#0f6cbf] font-semibold' : ''
              }`}
            >
              Portal Peserta
            </Link>
            <Link
              to="/login/fasilitator"
              className={`hover:text-[#0f6cbf] transition-colors whitespace-nowrap shrink-0 ${
                roleSlug === 'fasilitator' ? 'text-[#0f6cbf] font-semibold' : ''
              }`}
            >
              Portal Fasilitator
            </Link>
            <Link
              to="/login/panitia"
              className={`hover:text-[#0f6cbf] transition-colors whitespace-nowrap shrink-0 ${
                roleSlug === 'panitia' ? 'text-[#0f6cbf] font-semibold' : ''
              }`}
            >
              Portal Panitia
            </Link>
            <Link to="/verifikasi" className="hover:text-[#0f6cbf] transition-colors whitespace-nowrap shrink-0">
              Verifikasi Sertifikat
            </Link>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setTab(tab === 'register' ? 'login' : 'register')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {tab === 'register'
                ? `Masuk ${activeRoleMeta ? activeRoleMeta.shortLabel : 'Sistem'}`
                : `Daftar ${activeRoleMeta ? activeRoleMeta.shortLabel : 'Akun'}`}
            </button>
          </div>
        </div>
      </header>

      {/* Kartu Login & Pendaftaran Terpusat ala PAMANDAI EDU */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">
        <div
          className={`w-full ${
            tab === 'register' ? 'max-w-[660px]' : 'max-w-[500px]'
          } bg-white border border-[#dee2e6] rounded-xl shadow-[0_4px_20px_rgba(15,23,42,0.06)] overflow-hidden`}
        >
          {/* Header Kartu Terpusat */}
          <div className="px-6 sm:px-8 pt-7 pb-5 text-center border-b border-[#e9ecef]">
            <div className="w-12 h-12 rounded-xl bg-[#0f6cbf] text-white flex items-center justify-center mx-auto shadow-xs">
              {roleSlug === 'fasilitator' ? (
                <UserCheck className="w-6 h-6" />
              ) : roleSlug === 'panitia' ? (
                <Shield className="w-6 h-6" />
              ) : (
                <GraduationCap className="w-6 h-6" />
              )}
            </div>
            <h1 className="mt-3 font-display text-xl font-bold text-[#212529]">
              {activeRoleMeta
                ? tab === 'register'
                  ? `Pendaftaran ${activeRoleMeta.label}`
                  : `Login ${activeRoleMeta.label}`
                : 'PAMANDAI EDU'}
            </h1>
            <p className="mt-1 text-xs text-[#6c757d]">
              {activeRoleMeta
                ? activeRoleMeta.description
                : `${institutionSettings.appName}`}
            </p>
            {trainingFromQuery && selectedTrainingObj && (
              <p className="mt-2 inline-block px-3 py-1 rounded-md bg-[#e7f1fa] text-[#0f6cbf] text-[11px] font-semibold">
                Kegiatan: {selectedTrainingObj.code} — {selectedTrainingObj.name}
              </p>
            )}

            {/* Tab Kontrol Segmen */}
            <div className="mt-5 flex items-center gap-1 p-1 bg-[#f4f6f9] border border-[#e9ecef] rounded-lg">
              <button
                type="button"
                onClick={() => setTab('login')}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  tab === 'login'
                    ? 'bg-white text-[#0f6cbf] shadow-xs'
                    : 'text-[#6c757d] hover:text-[#212529]'
                }`}
              >
                Masuk {activeRoleMeta ? activeRoleMeta.shortLabel : ''}
              </button>
              <button
                type="button"
                onClick={() => setTab('register')}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  tab === 'register'
                    ? 'bg-white text-[#0f6cbf] shadow-xs'
                    : 'text-[#6c757d] hover:text-[#212529]'
                }`}
              >
                Daftar {activeRoleMeta ? activeRoleMeta.shortLabel : 'Akun'}
              </button>
              <button
                type="button"
                onClick={() => setTab('reset')}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  tab === 'reset'
                    ? 'bg-white text-[#0f6cbf] shadow-xs'
                    : 'text-[#6c757d] hover:text-[#212529]'
                }`}
              >
                Lupa Sandi
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {tab === 'login' && (
              <div className="space-y-5">
                <form onSubmit={handleEmailLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1">
                      Email {activeRoleMeta ? activeRoleMeta.shortLabel : 'Akun'}
                    </label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder={
                        roleSlug === 'fasilitator'
                          ? 'budi.fasilitator@lmsdigital.id'
                          : roleSlug === 'panitia'
                            ? 'dewi.admin@lmsdigital.id'
                            : 'nama@guru.belajar.id'
                      }
                      className="w-full px-3.5 py-2.5 text-sm border border-[#ced4da] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6cbf] focus:border-[#0f6cbf]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1">
                      Kata Sandi
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Masukkan kata sandi (uji: pamandai2026)"
                      className="w-full px-3.5 py-2.5 text-sm border border-[#ced4da] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6cbf] focus:border-[#0f6cbf]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    Masuk sebagai {activeRoleMeta ? activeRoleMeta.shortLabel : 'Pengguna LMS'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-[#e9ecef] w-full" />
                  <span className="bg-white px-3 text-[11px] text-[#6c757d] whitespace-nowrap">
                    atau autentikasi cloud permanen
                  </span>
                  <div className="border-t border-[#e9ecef] w-full" />
                </div>

                <button
                  type="button"
                  onClick={() => void handleGoogleLogin()}
                  disabled={busy}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-[#212529] bg-white border border-[#ced4da] hover:bg-[#f4f6f9] rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <ShieldCheck className="w-4 h-4 text-[#0f6cbf]" />
                  {busy ? 'Menghubungkan Akun Google...' : 'Masuk dengan Akun Google (Cloud)'}
                </button>

                {/* Panel Ringkas Akun Demo */}
                <div className="pt-4 border-t border-[#e9ecef]">
                  <button
                    type="button"
                    onClick={() => setShowDemoList((v) => !v)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-[#495057] hover:text-[#0f6cbf]"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#0f6cbf]" />
                      Akses Cepat Pengujian{' '}
                      {activeRoleMeta ? activeRoleMeta.shortLabel : '5 Peran'} [DEMO]
                    </span>
                    {showDemoList ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {showDemoList && (
                    <div className="mt-3 space-y-1.5">
                      {filteredDemoRoles.map((item) => (
                        <button
                          key={item.uid}
                          type="button"
                          onClick={() => handleDemoEnter(item.uid)}
                          className="w-full text-left px-3 py-2 rounded-lg border border-[#e9ecef] bg-[#f8f9fa] hover:border-[#0f6cbf] hover:bg-[#e7f1fa]/50 transition-colors flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#212529] truncate">
                              {item.roleTitle}
                            </p>
                            <p className="text-[11px] text-[#6c757d] truncate">
                              {item.person} · <span className="font-mono">{item.email}</span>
                            </p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-[#0f6cbf] shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'register' && (
              <form onSubmit={(e) => void handleRegister(e)} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-[#212529] flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-[#0f6cbf]" />
                      Formulir Pendaftaran {regRoleMeta.label}
                    </h2>
                    <p className="text-xs text-[#6c757d] mt-1">{regRoleMeta.description}</p>
                  </div>
                </div>

                {/* Pilihan Peran Pendaftaran jika dibuka dari /daftar umum */}
                {!roleSlug && (
                  <div className="grid grid-cols-3 gap-2">
                    {(['peserta', 'fasilitator', 'panitia'] as const).map((slug) => {
                      const meta = REGISTRATION_ROLE_META[slug];
                      const active = selectedRegisterRole === slug;
                      return (
                        <button
                          key={slug}
                          type="button"
                          onClick={() => setSelectedRegisterRole(slug)}
                          className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                            active
                              ? 'border-[#0f6cbf] bg-[#e7f1fa] text-[#0f6cbf]'
                              : 'border-[#dee2e6] bg-white text-[#495057] hover:bg-[#f8f9fa]'
                          }`}
                        >
                          {meta.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#212529] mb-1">
                    Pilih Kegiatan Pelatihan
                  </label>
                  <select
                    required
                    value={regForm.trainingId}
                    onChange={(e) => setRegForm({ ...regForm, trainingId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                  >
                    {trainings
                      .filter((t) => t.status === 'aktif')
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.code} — {t.name}
                          {isSamrTraining(t) ? ' (Model SAMR)' : ' (Modul Standar)'}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1">
                      Nama Lengkap & Gelar
                    </label>
                    <input
                      required
                      minLength={2}
                      type="text"
                      value={regForm.fullName}
                      onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                      placeholder="Rizky Ramadhan, S.Pd."
                      className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1">
                      Email Aktif
                    </label>
                    <input
                      required
                      type="email"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      placeholder="nama@belajar.id"
                      className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1">
                      Kata Sandi
                    </label>
                    <input
                      required
                      minLength={6}
                      type="password"
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      placeholder="Minimal 6 karakter"
                      className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1">
                      No. Telepon / WA
                    </label>
                    <input
                      type="tel"
                      value={regForm.phone}
                      onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                      placeholder="0812xxxxxxxx"
                      className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                    />
                  </div>
                </div>

                {selectedRegisterRole === 'peserta' ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#212529] mb-1">
                          Satuan Pendidikan / Sekolah
                        </label>
                        <input
                          required
                          type="text"
                          value={regForm.instansi}
                          onChange={(e) => setRegForm({ ...regForm, instansi: e.target.value })}
                          placeholder="SMAN 1 Bandung"
                          className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#212529] mb-1">
                          NPSN (Nomor Pokok Sekolah Nasional)
                        </label>
                        <input
                          required
                          type="text"
                          inputMode="numeric"
                          minLength={8}
                          maxLength={8}
                          pattern="[0-9]{8}"
                          value={regForm.npsn}
                          onChange={(e) =>
                            setRegForm({
                              ...regForm,
                              npsn: e.target.value.replace(/\D/g, '').slice(0, 8),
                            })
                          }
                          placeholder="8 digit angka (cth: 20219271)"
                          className="w-full px-3 py-2 text-sm font-mono border border-[#ced4da] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#212529] mb-1">
                          Kabupaten / Kota
                        </label>
                        <input
                          required
                          type="text"
                          value={regForm.kabupatenKota}
                          onChange={(e) =>
                            setRegForm({ ...regForm, kabupatenKota: e.target.value })
                          }
                          placeholder="Bandung"
                          className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#212529] mb-1">
                          Jenjang Pendidikan
                        </label>
                        <select
                          value={regForm.jenjangPendidikan}
                          onChange={(e) =>
                            setRegForm({ ...regForm, jenjangPendidikan: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                        >
                          {JENJANG_OPTIONS.map((j) => (
                            <option key={j} value={j}>
                              {j}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#212529] mb-1">
                          Mata Pelajaran
                        </label>
                        <input
                          type="text"
                          value={regForm.mataPelajaran}
                          onChange={(e) =>
                            setRegForm({ ...regForm, mataPelajaran: e.target.value })
                          }
                          placeholder="Fisika / Tematik"
                          className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#212529] mb-1">
                          Status Peserta
                        </label>
                        <select
                          value={regForm.statusPeserta}
                          onChange={(e) =>
                            setRegForm({ ...regForm, statusPeserta: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                        >
                          {STATUS_PESERTA_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#212529] mb-1">
                          Unit Kerja / Instansi
                        </label>
                        <input
                          required
                          type="text"
                          value={regForm.instansi}
                          onChange={(e) => setRegForm({ ...regForm, instansi: e.target.value })}
                          placeholder="BBGP / Dinas Pendidikan"
                          className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#212529] mb-1">
                          Kabupaten / Kota
                        </label>
                        <input
                          required
                          type="text"
                          value={regForm.kabupatenKota}
                          onChange={(e) =>
                            setRegForm({ ...regForm, kabupatenKota: e.target.value })
                          }
                          placeholder="Bandung"
                          className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#212529] mb-1">
                        Jabatan / Bidang Tugas
                      </label>
                      <input
                        required
                        type="text"
                        value={regForm.jabatan}
                        onChange={(e) => setRegForm({ ...regForm, jabatan: e.target.value })}
                        placeholder={regRoleMeta.defaultJabatan}
                        className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                      />
                    </div>
                  </>
                )}

                {regResult && (
                  <div
                    className={`p-3 rounded-lg text-xs border ${
                      regResult.ok
                        ? 'bg-emerald-50 border-emerald-200 text-[#198754]'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    {regResult.message}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg transition-colors"
                >
                  Daftar sebagai {regRoleMeta.shortLabel} & Masuk LMS
                </button>
              </form>
            )}

            {tab === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-[#212529] flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#0f6cbf]" />
                    Pemulihan Kata Sandi
                  </h2>
                  <p className="text-xs text-[#6c757d] mt-1 leading-relaxed">
                    Masukkan alamat email akun terdaftar untuk menerima tautan reset kata sandi.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#212529] mb-1">
                    Email Terdaftar
                  </label>
                  <input
                    required
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="nama@guru.belajar.id"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#ced4da] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                  />
                </div>
                {resetSent && (
                  <div className="p-3 rounded-lg bg-[#e7f1fa] border border-[#b6d4fe] text-xs text-[#0b5394]">
                    Instruksi pemulihan kata sandi untuk{' '}
                    <span className="font-semibold">{resetEmail}</span> telah dicatat.
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg transition-colors"
                >
                  Kirim Instruksi Pemulihan
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Kartu Tautan Pendaftaran & Login Khusus Peran (Peserta · Fasilitator · Panitia) */}
        <div className="w-full max-w-[780px] bg-white border border-[#dee2e6] rounded-xl p-5 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-bold text-[#212529] flex items-center gap-1.5 mb-3">
            <Link2 className="w-4 h-4 text-[#0f6cbf]" />
            Tautan Resmi Pendaftaran & Login Peran (Peserta, Fasilitator, Panitia)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {(['peserta', 'fasilitator', 'panitia'] as const).map((slug) => {
              const meta = REGISTRATION_ROLE_META[slug];
              const q = trainingFromQuery ? `?kegiatan=${trainingFromQuery}` : '';
              return (
                <div
                  key={slug}
                  className="p-3 rounded-lg border border-[#e9ecef] bg-[#f8f9fa] space-y-2"
                >
                  <p className="font-bold text-[#212529]">{meta.label}</p>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <Link
                        to={`/daftar/${slug}${q}`}
                        className="text-[#0f6cbf] hover:underline font-medium"
                      >
                        Daftar {meta.shortLabel} →
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          void copyPortalUrl(`/daftar/${slug}`, `Link Daftar ${meta.shortLabel}`)
                        }
                        title={`Salin link daftar ${meta.shortLabel}`}
                        className="p-1 text-[#6c757d] hover:text-[#0f6cbf]"
                      >
                        {copiedSlug === `/daftar/${slug}` ? (
                          <Check className="w-3.5 h-3.5 text-[#198754]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <Link
                        to={`/login/${slug}${q}`}
                        className="text-[#198754] hover:underline font-medium"
                      >
                        Login {meta.shortLabel} →
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          void copyPortalUrl(`/login/${slug}`, `Link Login ${meta.shortLabel}`)
                        }
                        title={`Salin link login ${meta.shortLabel}`}
                        className="p-1 text-[#6c757d] hover:text-[#198754]"
                      >
                        {copiedSlug === `/login/${slug}` ? (
                          <Check className="w-3.5 h-3.5 text-[#198754]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-[#6c757d] text-center">
          Ingin mengecek keaslian sertifikat pelatihan?{' '}
          <Link to="/verifikasi" className="font-semibold text-[#0f6cbf] hover:underline">
            Buka Verifikasi Sertifikat Publik
          </Link>
        </p>
      </main>
    </div>
  );
}
