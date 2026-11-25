import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Database,
  FolderKanban,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  MessageSquareText,
  Settings2,
  ShieldCheck,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { useLms } from '../context/LmsContext';
import { ROLE_LABELS, UserRole } from '../types/lms';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  group: 'primary' | 'admin';
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Beranda',
    icon: Home,
    roles: ['super_admin', 'admin_kegiatan', 'fasilitator', 'peserta', 'pemantau'],
    group: 'primary',
  },
  {
    to: '/pembelajaran',
    label: 'Pelatihan Saya',
    icon: BookOpen,
    roles: ['peserta', 'fasilitator', 'admin_kegiatan', 'super_admin'],
    group: 'primary',
  },
  {
    to: '/kegiatan',
    label: 'Kegiatan',
    icon: FolderKanban,
    roles: ['super_admin', 'admin_kegiatan', 'fasilitator', 'peserta', 'pemantau'],
    group: 'primary',
  },
  {
    to: '/monitoring',
    label: 'Monitoring',
    icon: BarChart3,
    roles: ['super_admin', 'admin_kegiatan', 'fasilitator', 'pemantau'],
    group: 'primary',
  },
  {
    to: '/sertifikat',
    label: 'Sertifikat',
    icon: Award,
    roles: ['peserta', 'pemantau'],
    group: 'primary',
  },
  {
    to: '/qna',
    label: 'Tanya AI (QnA)',
    icon: MessageSquareText,
    roles: ['super_admin', 'admin_kegiatan', 'fasilitator', 'peserta', 'pemantau'],
    group: 'primary',
  },
  // Menu Administrasi (dropdown rapi di navbar agar tidak sesak)
  {
    to: '/asesmen-kuis',
    label: 'Soal, Kuis & Rubrik Praktik',
    icon: ClipboardCheck,
    roles: ['super_admin', 'admin_kegiatan', 'fasilitator'],
    group: 'admin',
  },
  {
    to: '/pengguna',
    label: 'Manajemen Akun & Impor Excel',
    icon: Users,
    roles: ['super_admin', 'admin_kegiatan'],
    group: 'admin',
  },
  {
    to: '/sertifikat',
    label: 'Kelola Sertifikat Digital',
    icon: Award,
    roles: ['super_admin', 'admin_kegiatan'],
    group: 'admin',
  },
  {
    to: '/pengujian',
    label: 'Skema SQL & Pengujian Sistem',
    icon: Database,
    roles: ['super_admin', 'admin_kegiatan', 'fasilitator', 'pemantau'],
    group: 'admin',
  },
];

const DEMO_SWITCH_ACCOUNTS = [
  { uid: 'super_admin_01', label: 'Super Admin [DEMO] — Raka Pratama' },
  { uid: 'admin_keg_01', label: 'Admin Kegiatan [DEMO] — Dewi Anggraeni' },
  { uid: 'fasilitator_01', label: 'Fasilitator PID [DEMO] — Dr. Budi Hartono' },
  { uid: 'peserta_07', label: 'Guru (Belum Asesmen) — Gita Savitri, S.Pd.' },
  { uid: 'peserta_01', label: 'Guru (L1 Substitution) — Aulia Rahmawati, S.Pd.' },
  { uid: 'peserta_02', label: 'Guru (L2 Augmentation) — Bagas Prakoso, M.Pd.' },
  { uid: 'peserta_03', label: 'Guru (L3 Modification) — Citra Dewi Lestari, S.Si.' },
  { uid: 'peserta_04', label: 'Guru (Lulus L4 Redefinition) — Dimas Saputra, M.Kom.' },
  { uid: 'pemantau_01', label: 'Supervisor (Akses Baca) [DEMO] — Ir. Bambang Suryadi' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const {
    currentUser,
    effectiveRole,
    isLiveDatabase,
    isBootstrappedAdmin,
    isDemoMode,
    activeDemoUid,
    switchSimulatedUser,
    logout,
    toast,
    clearToast,
    seedCloudFirestore,
    seedingBusy,
    trainings,
    institutionSettings,
  } = useLms();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setAdminMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  if (!currentUser || !effectiveRole) return null;

  const primaryNav = NAV_ITEMS.filter(
    (item) => item.group === 'primary' && item.roles.includes(effectiveRole),
  );
  const adminNav = NAV_ITEMS.filter(
    (item) => item.group === 'admin' && item.roles.includes(effectiveRole),
  );
  const allVisibleNav = [...primaryNav, ...adminNav];
  const currentNav = allVisibleNav.find((n) => location.pathname.startsWith(n.to));
  const isAdminRouteActive = adminNav.some((n) => location.pathname.startsWith(n.to));
  const isCoursePage =
    location.pathname.startsWith('/pembelajaran') || location.pathname.startsWith('/kegiatan');

  const initials = currentUser.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-[#212529] flex flex-col">
      {/* PAMANDAI EDU Top Navbar — Putih, tinggi 68px, tanpa sidebar SaaS permanen */}
      <header className="sticky top-0 z-40 h-[68px] bg-white border-b border-[#dee2e6] shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
        <div className="max-w-[1360px] mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6">
          {/* Zona Kiri: Logo & Nama Platform */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden p-2 -ml-2 text-[#212529] hover:bg-[#f4f6f9] rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/dashboard" className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
              <div className="w-9 h-9 rounded-lg bg-[#0f6cbf] text-white flex items-center justify-center shadow-xs shrink-0">
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
          </div>

          {/* Zona Tengah: Menu Navigasi Horizontal */}
          <nav
            aria-label="Navigasi utama"
            className="hidden lg:flex items-center gap-1 h-full"
          >
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `relative h-full inline-flex items-center px-3.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-[#0f6cbf] font-semibold after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[3px] after:bg-[#0f6cbf] after:rounded-t'
                      : 'text-[#495057] hover:text-[#0f6cbf] hover:bg-[#f4f6f9]/70'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}

            {adminNav.length > 0 && (
              <div className="relative h-full flex items-center" ref={adminMenuRef}>
                <button
                  type="button"
                  onClick={() => setAdminMenuOpen((v) => !v)}
                  className={`relative h-full inline-flex items-center gap-1 px-3.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isAdminRouteActive
                      ? 'text-[#0f6cbf] font-semibold after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[3px] after:bg-[#0f6cbf] after:rounded-t'
                      : 'text-[#495057] hover:text-[#0f6cbf] hover:bg-[#f4f6f9]/70'
                  }`}
                >
                  <Settings2 className="w-4 h-4" />
                  Administrasi
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {adminMenuOpen && (
                  <div className="absolute left-0 top-[62px] w-64 bg-white border border-[#dee2e6] rounded-xl shadow-lg py-1.5 z-50">
                    {adminNav.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setAdminMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                              isActive
                                ? 'bg-[#e7f1fa] text-[#0f6cbf] font-semibold'
                                : 'text-[#212529] hover:bg-[#f4f6f9]'
                            }`
                          }
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Zona Kanan: Profil Pengguna & Menu Akun */}
          <div className="flex items-center gap-3 shrink-0">
            {isLiveDatabase && isBootstrappedAdmin && trainings.length === 0 && (
              <button
                type="button"
                disabled={seedingBusy}
                onClick={() => void seedCloudFirestore()}
                className="hidden sm:inline-flex px-3 py-1.5 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
              >
                {seedingBusy ? 'Menyimpan...' : 'Isi Data Awal Cloud'}
              </button>
            )}

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border border-[#dee2e6] bg-white hover:bg-[#f4f6f9] transition-colors whitespace-nowrap shrink-0"
              >
                <span className="w-8 h-8 rounded-full bg-[#0f6cbf] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {initials || 'U'}
                </span>
                <span className="hidden sm:block text-left max-w-[150px]">
                  <span className="block text-xs font-semibold text-[#212529] truncate leading-tight">
                    {currentUser.fullName}
                  </span>
                  <span className="block text-[11px] text-[#6c757d] truncate leading-tight">
                    {ROLE_LABELS[effectiveRole]}
                  </span>
                </span>
                <ChevronDown className="w-4 h-4 text-[#6c757d] shrink-0" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-[54px] w-72 bg-white border border-[#dee2e6] rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="px-4 py-3 bg-[#f4f6f9] border-b border-[#dee2e6]">
                    <p className="text-sm font-bold text-[#212529] truncate">{currentUser.fullName}</p>
                    <p className="text-xs text-[#6c757d] truncate mt-0.5">
                      {ROLE_LABELS[effectiveRole]} · {currentUser.instansi || 'Umum'}
                    </p>
                  </div>

                  {(isDemoMode || isBootstrappedAdmin) && (
                    <div className="px-4 py-3 border-b border-[#dee2e6] bg-white">
                      <label
                        htmlFor="navbar-role-switch"
                        className="block text-[11px] font-semibold text-[#495057] mb-1.5"
                      >
                        Pratinjau Peran Pengujian (5 Role)
                      </label>
                      <select
                        id="navbar-role-switch"
                        value={activeDemoUid || ''}
                        onChange={(e) => {
                          switchSimulatedUser(e.target.value || null);
                          setProfileMenuOpen(false);
                        }}
                        className="w-full text-xs bg-[#f4f6f9] border border-[#ced4da] rounded-lg px-2.5 py-2 text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                      >
                        {isBootstrappedAdmin && (
                          <option value="">Akun Google Utama (Super Admin)</option>
                        )}
                        {DEMO_SWITCH_ACCOUNTS.map((acc) => (
                          <option key={acc.uid} value={acc.uid}>
                            {acc.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="py-1.5">
                    <Link
                      to="/profil"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#212529] hover:bg-[#f4f6f9]"
                    >
                      <UserCircle className="w-4 h-4 text-[#6c757d]" />
                      Profil & Keamanan
                    </Link>
                    <Link
                      to="/beranda"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#212529] hover:bg-[#f4f6f9]"
                    >
                      <Home className="w-4 h-4 text-[#6c757d]" />
                      Portal Publik
                    </Link>
                    <Link
                      to="/verifikasi"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#212529] hover:bg-[#f4f6f9]"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#6c757d]" />
                      Verifikasi Sertifikat
                    </Link>
                  </div>

                  <div className="border-t border-[#dee2e6] p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        void logout();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Keluar Sesi
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Drawer Navigasi Mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-72 max-w-[85vw] h-full bg-white shadow-xl flex flex-col">
            <div className="h-[68px] px-4 border-b border-[#dee2e6] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0f6cbf] text-white flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span className="font-display text-sm font-bold text-[#212529]">PAMANDAI EDU</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Tutup menu"
                className="p-1.5 text-[#6c757d] hover:text-[#212529] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {allVisibleNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={`${item.group}-${item.to}`}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                        isActive
                          ? 'bg-[#e7f1fa] text-[#0f6cbf] font-semibold'
                          : 'text-[#212529] hover:bg-[#f4f6f9]'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {(isDemoMode || isBootstrappedAdmin) && (
              <div className="p-3 border-t border-[#dee2e6] bg-[#f4f6f9]">
                <label className="block text-[11px] font-semibold text-[#495057] mb-1">
                  Pratinjau Peran Pengujian
                </label>
                <select
                  value={activeDemoUid || ''}
                  onChange={(e) => {
                    switchSimulatedUser(e.target.value || null);
                    setMobileOpen(false);
                  }}
                  className="w-full text-xs bg-white border border-[#ced4da] rounded-lg px-2.5 py-2 text-[#212529]"
                >
                  {isBootstrappedAdmin && (
                    <option value="">Akun Google Utama (Super Admin)</option>
                  )}
                  {DEMO_SWITCH_ACCOUNTS.map((acc) => (
                    <option key={acc.uid} value={acc.uid}>
                      {acc.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button
            type="button"
            aria-label="Tutup overlay menu"
            className="flex-1 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* Peringatan Jujur Mode Demonstrasi Lokal */}
      {isDemoMode && (
        <div className="bg-[#fff8e6] border-b border-amber-200 px-4 sm:px-6 lg:px-8 py-2 text-xs text-amber-950">
          <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-2">
            <span>
              Mode Demonstrasi Lokal aktif — perubahan hanya tersimpan pada sesi peramban ini. Masuk menggunakan akun Google untuk penyimpanan cloud permanen.
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="font-semibold text-[#0f6cbf] hover:underline whitespace-nowrap"
            >
              Masuk Akun Google
            </button>
          </div>
        </div>
      )}

      {/* Breadcrumb standar untuk halaman non-kursus (halaman kursus merender breadcrumb + header khusus) */}
      {!isCoursePage && (
        <div className="bg-white border-b border-[#e9ecef]">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#6c757d] truncate">
              <Link to="/dashboard" className="hover:text-[#0f6cbf] whitespace-nowrap">
                Beranda
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-[#adb5bd] shrink-0" />
              <span className="whitespace-nowrap">{ROLE_LABELS[effectiveRole]}</span>
              {currentNav && currentNav.to !== '/dashboard' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-[#adb5bd] shrink-0" />
                  <span className="font-semibold text-[#212529] truncate">{currentNav.label}</span>
                </>
              )}
            </nav>
            <span className="hidden md:inline text-xs text-[#6c757d] truncate">
              {institutionSettings.appName}
            </span>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-[#212529] text-white px-4 py-3 rounded-xl shadow-lg flex items-start gap-3 text-sm">
          <CheckCircle2
            className={`w-4 h-4 mt-0.5 shrink-0 ${
              toast.type === 'error'
                ? 'text-red-400'
                : toast.type === 'info'
                  ? 'text-sky-400'
                  : 'text-emerald-400'
            }`}
          />
          <span className="leading-snug">{toast.text}</span>
          <button
            type="button"
            onClick={clearToast}
            aria-label="Tutup notifikasi"
            className="text-slate-400 hover:text-white ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Konten Utama: Full-bleed untuk ruang LMS (/kegiatan & /pembelajaran) agar sidebar kiri menempel tepi layar */}
      <main
        className={
          isCoursePage
            ? 'flex-1 w-full flex flex-col'
            : 'flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6'
        }
      >
        {children}
      </main>

      {/* Footer Ringan PAMANDAI EDU */}
      {!isCoursePage && (
        <footer className="mt-auto bg-white border-t border-[#dee2e6] py-4 px-4 sm:px-6 lg:px-8 text-xs text-[#6c757d]">
          <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-2">
            <span>
              PAMANDAI EDU · {institutionSettings.appName}
            </span>
            <div className="flex items-center gap-4">
              <Link to="/beranda" className="hover:text-[#0f6cbf]">
                Beranda Publik
              </Link>
              <Link to="/verifikasi" className="hover:text-[#0f6cbf]">
                Verifikasi Sertifikat
              </Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
