import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Plus,
  Search,
  Upload,
  UserCheck,
  UserX,
  X,
  XCircle,
} from 'lucide-react';
import { useLms } from '../context/LmsContext';
import {
  downloadImportTemplateExcel,
  ParsedParticipantRow,
  parseParticipantExcel,
} from '../lib/exporters';
import { ROLE_LABELS, UserRole } from '../types/lms';

export function UsersImportPage() {
  const {
    effectiveRole,
    profiles,
    trainings,
    createAccountByAdmin,
    toggleAccountActive,
    updateAccountRole,
    importParticipantsFromExcel,
    showToast,
  } = useLms();

  const isSuperAdmin = effectiveRole === 'super_admin';

  const [tab, setTab] = useState<'accounts' | 'import'>('accounts');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Tambah akun manual
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    instansi: '',
    kabupatenKota: '',
    jabatan: '',
    role: 'peserta' as UserRole,
  });

  // Impor Excel state
  const [importTrainingId, setImportTrainingId] = useState(trainings[0]?.id || '');
  const [parsedRows, setParsedRows] = useState<ParsedParticipantRow[]>([]);
  const [importStats, setImportStats] = useState<{ valid: number; failed: number } | null>(null);
  const [fileName, setFileName] = useState('');

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return profiles.filter((p) => {
      if (roleFilter !== 'all' && p.role !== roleFilter) return false;
      if (!q) return true;
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.instansi.toLowerCase().includes(q) ||
        p.kabupatenKota.toLowerCase().includes(q)
      );
    });
  }, [profiles, search, roleFilter]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createAccountByAdmin(form);
    if (res.ok) {
      setShowAddModal(false);
      setForm({
        fullName: '',
        email: '',
        phone: '',
        instansi: '',
        kabupatenKota: '',
        jabatan: '',
        role: 'peserta',
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const existingEmails = new Set(profiles.map((p) => p.email.toLowerCase()));
    try {
      const parsed = await parseParticipantExcel(file, existingEmails);
      setParsedRows(parsed.rows);
      setImportStats({ valid: parsed.validCount, failed: parsed.failedCount });
      showToast(
        'info',
        `Pratinjau selesai: ${parsed.validCount} baris valid, ${parsed.failedCount} baris gagal validasi.`,
      );
    } catch {
      showToast('error', 'Berkas tidak dapat dibaca. Pastikan format .xlsx, .xls, atau .csv.');
    }
  };

  const handleProcessImport = async () => {
    if (!importTrainingId) {
      showToast('error', 'Pilih kegiatan tujuan terlebih dahulu.');
      return;
    }
    const res = await importParticipantsFromExcel(importTrainingId, parsedRows);
    if (res.ok) {
      setParsedRows([]);
      setImportStats(null);
      setFileName('');
    }
  };

  // Simulasi cepat uji pratinjau Excel (termasuk contoh duplikat & format salah)
  const loadSampleImportPreview = () => {
    const existingEmails = new Set(profiles.map((p) => p.email.toLowerCase()));
    const firstExisting = profiles.find((p) => p.role === 'peserta')?.email || 'aulia.rahmawati@instansi.go.id';
    const sampleRows: ParsedParticipantRow[] = [
      {
        rowNumber: 2,
        fullName: 'Wahyu Setiawan',
        email: `wahyu.setiawan.${Date.now().toString().slice(-3)}@instansi.go.id`,
        phone: '081277001122',
        instansi: 'Dinas Kominfo Jawa Timur',
        kabupatenKota: 'Surabaya',
        jabatan: 'Analis Layanan Digital',
        valid: true,
        errorReason: '',
      },
      {
        rowNumber: 3,
        fullName: 'Dewi Kartikasari',
        email: `dewi.kartika.${Date.now().toString().slice(-3)}@instansi.go.id`,
        phone: '081277003344',
        instansi: 'Bappeda Kota Semarang',
        kabupatenKota: 'Semarang',
        jabatan: 'Perencana Pertama',
        valid: true,
        errorReason: '',
      },
      {
        rowNumber: 4,
        fullName: 'Duplikat Terdeteksi',
        email: firstExisting,
        phone: '081200000001',
        instansi: 'Dinas Kominfo Jawa Barat',
        kabupatenKota: 'Bandung',
        jabatan: 'Staf',
        valid: !existingEmails.has(firstExisting.toLowerCase()),
        errorReason: existingEmails.has(firstExisting.toLowerCase())
          ? 'Email sudah terdaftar di database'
          : '',
      },
      {
        rowNumber: 5,
        fullName: 'B',
        email: 'email-tidak-valid',
        phone: '',
        instansi: 'Umum',
        kabupatenKota: 'Jakarta',
        jabatan: 'Peserta',
        valid: false,
        errorReason: 'Nama lengkap wajib diisi (min. 2 karakter); Format email tidak valid',
      },
    ];
    setFileName('Simulasi-Impor-Peserta.xlsx');
    setParsedRows(sampleRows);
    const valid = sampleRows.filter((r) => r.valid).length;
    setImportStats({ valid, failed: sampleRows.length - valid });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Akun & Impor Peserta Excel</h1>
          <p className="text-sm text-slate-600 mt-1">
            Kelola aktivasi pengguna, penetapan peran, serta impor peserta massal dengan validasi duplikat dan pratinjau baris gagal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setTab('accounts')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                tab === 'accounts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Daftar Akun ({profiles.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('import')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                tab === 'import' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Impor Peserta Excel
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Akun
          </button>
        </div>
      </div>

      {tab === 'accounts' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, email, instansi, atau kabupaten/kota..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">Semua Peran</option>
              {Object.entries(ROLE_LABELS).map(([k, lbl]) => (
                <option key={k} value={k}>
                  {lbl}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-2.5 pr-4 font-medium">Nama & Email</th>
                  <th className="py-2.5 pr-4 font-medium">Instansi & Wilayah</th>
                  <th className="py-2.5 pr-4 font-medium">Peran</th>
                  <th className="py-2.5 pr-4 font-medium">Status</th>
                  <th className="py-2.5 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProfiles.map((p) => (
                  <tr key={p.uid} className="hover:bg-slate-50">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-900">{p.fullName}</p>
                      <p className="text-slate-500 font-mono text-[11px]">{p.email}</p>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      <p>{p.instansi}</p>
                      <p className="text-slate-400">{p.kabupatenKota}</p>
                    </td>
                    <td className="py-3 pr-4">
                      {isSuperAdmin ? (
                        <select
                          aria-label={`Ubah peran ${p.fullName}`}
                          value={p.role}
                          onChange={(e) => void updateAccountRole(p.uid, e.target.value as UserRole)}
                          className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                        >
                          {Object.entries(ROLE_LABELS).map(([k, lbl]) => (
                            <option key={k} value={k}>
                              {lbl}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-medium text-slate-800">{ROLE_LABELS[p.role]}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`font-semibold ${
                          p.isActive ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {p.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => void toggleAccountActive(p.uid, !p.isActive)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border ${
                          p.isActive
                            ? 'border-red-200 text-red-700 hover:bg-red-50'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {p.isActive ? (
                          <>
                            <UserX className="w-3.5 h-3.5" /> Nonaktifkan
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" /> Aktifkan
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'import' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                Impor Peserta Massal dari Excel (.xlsx / .csv)
              </h2>
              <p className="text-xs text-slate-600">
                Sistem otomatis memvalidasi nama, format email, mendeteksi email duplikat (terhadap database & antar-baris), menampilkan pratinjau, serta merinci baris yang gagal.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={downloadImportTemplateExcel}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh Template Excel
              </button>
              <button
                type="button"
                onClick={loadSampleImportPreview}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg"
              >
                Muat Contoh Uji Validasi
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Kegiatan Pelatihan Tujuan
              </label>
              <select
                value={importTrainingId}
                onChange={(e) => setImportTrainingId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {trainings.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} — {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Pilih File Excel (.xlsx, .xls, .csv)
              </label>
              <label className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-dashed border-slate-400 rounded-lg cursor-pointer hover:bg-slate-100">
                <Upload className="w-4 h-4" />
                <span>{fileName || 'Unggah Berkas Excel'}</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => void handleFileChange(e)}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {importStats && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-slate-900">
                    Total Baris: <span className="font-mono">{parsedRows.length}</span>
                  </span>
                  <span className="font-semibold text-emerald-700">
                    Siap Diproses: <span className="font-mono">{importStats.valid}</span>
                  </span>
                  <span className="font-semibold text-red-700">
                    Gagal Validasi: <span className="font-mono">{importStats.failed}</span>
                  </span>
                </div>
                <button
                  type="button"
                  disabled={importStats.valid === 0}
                  onClick={() => void handleProcessImport()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-40"
                >
                  Proses Impor {importStats.valid} Peserta Valid
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Baris</th>
                      <th className="py-2 pr-3 font-medium">Nama Lengkap</th>
                      <th className="py-2 pr-3 font-medium">Email</th>
                      <th className="py-2 pr-3 font-medium">Instansi / Kota</th>
                      <th className="py-2 font-medium">Status & Laporan Validasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row) => (
                      <tr key={row.rowNumber} className={row.valid ? '' : 'bg-red-50/40'}>
                        <td className="py-2.5 pr-3 font-mono text-slate-500">#{row.rowNumber}</td>
                        <td className="py-2.5 pr-3 font-medium text-slate-900">{row.fullName || '—'}</td>
                        <td className="py-2.5 pr-3 font-mono text-slate-700">{row.email || '—'}</td>
                        <td className="py-2.5 pr-3 text-slate-600">
                          {row.instansi} · {row.kabupatenKota}
                        </td>
                        <td className="py-2.5">
                          {row.valid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                              <XCircle className="w-3.5 h-3.5 shrink-0" /> {row.errorReason}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Tambah Akun */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={(e) => void handleAddAccount(e)}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Tambah Akun Pengguna Baru</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap</label>
              <input
                required
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Instansi</label>
                <input
                  required
                  type="text"
                  value={form.instansi}
                  onChange={(e) => setForm({ ...form, instansi: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Kabupaten/Kota</label>
                <input
                  required
                  type="text"
                  value={form.kabupatenKota}
                  onChange={(e) => setForm({ ...form, kabupatenKota: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Peran Akun</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="peserta">Peserta</option>
                <option value="fasilitator">Fasilitator</option>
                <option value="pemantau">Supervisor</option>
                <option value="admin_kegiatan">Admin Kegiatan</option>
                {isSuperAdmin && <option value="super_admin">Super Admin</option>}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
              >
                Simpan Akun
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
