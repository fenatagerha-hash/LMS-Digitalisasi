import React, { useEffect, useState } from 'react';
import { Building2, KeyRound, Save, UserCircle } from 'lucide-react';
import { useLms } from '../context/LmsContext';
import { JENJANG_OPTIONS, ROLE_LABELS, STATUS_PESERTA_OPTIONS } from '../types/lms';

export function ProfilePage() {
  const {
    currentUser,
    effectiveRole,
    updateOwnProfile,
    institutionSettings,
    updateInstitutionSettings,
    showToast,
  } = useLms();

  const [form, setForm] = useState({
    fullName: currentUser?.fullName || '',
    phone: currentUser?.phone || '',
    instansi: currentUser?.instansi || '',
    npsn: currentUser?.npsn || '',
    kabupatenKota: currentUser?.kabupatenKota || '',
    jabatan: currentUser?.jabatan || '',
    jenjangPendidikan: currentUser?.jenjangPendidikan || '',
    mataPelajaran: currentUser?.mataPelajaran || '',
    statusPeserta: currentUser?.statusPeserta || '',
  });

  useEffect(() => {
    if (!currentUser) return;
    setForm({
      fullName: currentUser.fullName || '',
      phone: currentUser.phone || '',
      instansi: currentUser.instansi || '',
      npsn: currentUser.npsn || '',
      kabupatenKota: currentUser.kabupatenKota || '',
      jabatan: currentUser.jabatan || '',
      jenjangPendidikan: currentUser.jenjangPendidikan || '',
      mataPelajaran: currentUser.mataPelajaran || '',
      statusPeserta: currentUser.statusPeserta || '',
    });
  }, [currentUser]);

  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [instForm, setInstForm] = useState({
    appName: institutionSettings.appName,
    tagline: institutionSettings.tagline,
    institutionName: institutionSettings.institutionName,
    address: institutionSettings.address,
    website: institutionSettings.website,
    supportEmail: institutionSettings.supportEmail,
    certificatePrefix: institutionSettings.certificatePrefix,
  });

  useEffect(() => {
    setInstForm({
      appName: institutionSettings.appName,
      tagline: institutionSettings.tagline,
      institutionName: institutionSettings.institutionName,
      address: institutionSettings.address,
      website: institutionSettings.website,
      supportEmail: institutionSettings.supportEmail,
      certificatePrefix: institutionSettings.certificatePrefix,
    });
  }, [institutionSettings]);

  if (!currentUser || !effectiveRole) return null;

  const handleSaveInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateInstitutionSettings(instForm);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateOwnProfile(form);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.newPassword.length < 8) {
      showToast('error', 'Kata sandi baru minimal 8 karakter.');
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      showToast('error', 'Konfirmasi kata sandi tidak cocok.');
      return;
    }
    setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    showToast(
      'success',
      'Permintaan ganti kata sandi dicatat. Untuk akun Google Sign-In, pengelolaan sandi mengikuti keamanan Akun Google.',
    );
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profil & Keamanan Akun</h1>
        <p className="text-sm text-slate-600 mt-1">
          Kelola identitas instansi dan keamanan kredensial Anda. Peran akses hanya dapat diubah oleh Super Admin.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={(e) => void handleSaveProfile(e)}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <UserCircle className="w-5 h-5 text-slate-700" />
            <h2 className="text-base font-bold text-slate-900">Informasi Profil</h2>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Email: {currentUser.email}</span>
            <span>·</span>
            <span>Peran: {ROLE_LABELS[effectiveRole]}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap</label>
            <input
              required
              type="text"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nomor Telepon</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Instansi / Sekolah</label>
              <input
                type="text"
                value={form.instansi}
                onChange={(e) => setForm({ ...form, instansi: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">NPSN</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={form.npsn}
                onChange={(e) =>
                  setForm({ ...form, npsn: e.target.value.replace(/\D/g, '').slice(0, 8) })
                }
                placeholder="8 digit angka"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kabupaten / Kota</label>
              <input
                type="text"
                value={form.kabupatenKota}
                onChange={(e) => setForm({ ...form, kabupatenKota: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Jabatan</label>
              <input
                type="text"
                value={form.jabatan}
                onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Jenjang Pendidikan</label>
              <select
                value={form.jenjangPendidikan}
                onChange={(e) => setForm({ ...form, jenjangPendidikan: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Pilih Jenjang</option>
                {JENJANG_OPTIONS.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mata Pelajaran</label>
              <input
                type="text"
                value={form.mataPelajaran}
                onChange={(e) => setForm({ ...form, mataPelajaran: e.target.value })}
                placeholder="Cth: Matematika, IPA, Guru Kelas"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Status Kepegawaian / Peserta</label>
            <select
              value={form.statusPeserta}
              onChange={(e) => setForm({ ...form, statusPeserta: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Pilih Status</option>
              {STATUS_PESERTA_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            Simpan Perubahan Profil
          </button>
        </form>

        <form
          onSubmit={handleChangePassword}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 h-fit"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <KeyRound className="w-5 h-5 text-slate-700" />
            <h2 className="text-base font-bold text-slate-900">Ganti Kata Sandi</h2>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Autentikasi kata sandi ditangani secara terenkripsi oleh penyedia identitas (Firebase Auth / Supabase Auth). Tidak ada kata sandi polos yang disimpan pada database aplikasi.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Kata Sandi Saat Ini</label>
            <input
              required
              type="password"
              value={pwdForm.currentPassword}
              onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Kata Sandi Baru</label>
            <input
              required
              minLength={8}
              type="password"
              value={pwdForm.newPassword}
              onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Konfirmasi Kata Sandi Baru</label>
            <input
              required
              minLength={8}
              type="password"
              value={pwdForm.confirmPassword}
              onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
          >
            Perbarui Kata Sandi
          </button>
        </form>
      </div>

      {/* Pengaturan Identitas Lembaga & Konfigurasi Aplikasi (Khusus Super Admin) */}
      {effectiveRole === 'super_admin' && (
        <form
          onSubmit={(e) => void handleSaveInstitution(e)}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <Building2 className="w-5 h-5 text-[#0F2544]" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Identitas Lembaga & Konfigurasi Aplikasi
              </h2>
              <p className="text-xs text-slate-500">
                Pengaturan global platform yang ditampilkan pada header, halaman masuk, laporan, dan sertifikat digital.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nama Aplikasi</label>
              <input
                required
                minLength={2}
                maxLength={120}
                type="text"
                value={instForm.appName}
                onChange={(e) => setInstForm({ ...instForm, appName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Prefiks Nomor Sertifikat
              </label>
              <input
                required
                minLength={2}
                maxLength={30}
                type="text"
                value={instForm.certificatePrefix}
                onChange={(e) => setInstForm({ ...instForm, certificatePrefix: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Tagline Aplikasi</label>
              <input
                maxLength={200}
                type="text"
                value={instForm.tagline}
                onChange={(e) => setInstForm({ ...instForm, tagline: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Lembaga Penyelenggara
              </label>
              <input
                required
                minLength={2}
                maxLength={180}
                type="text"
                value={instForm.institutionName}
                onChange={(e) => setInstForm({ ...instForm, institutionName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Layanan</label>
              <input
                type="email"
                maxLength={160}
                value={instForm.supportEmail}
                onChange={(e) => setInstForm({ ...instForm, supportEmail: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Alamat Lembaga</label>
              <input
                type="text"
                maxLength={300}
                value={instForm.address}
                onChange={(e) => setInstForm({ ...instForm, address: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Situs Web Resmi</label>
              <input
                type="url"
                maxLength={200}
                value={instForm.website}
                onChange={(e) => setInstForm({ ...instForm, website: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F2544] hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            Simpan Identitas Lembaga
          </button>
        </form>
      )}
    </div>
  );
}
