import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { Award, Download, ExternalLink, ImagePlus, Palette, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { useLms } from '../context/LmsContext';
import { ASSET_CERT_SEAL } from '../data/seedDataset';
import { CertificateTemplateOptions, generateCertificatePdf } from '../lib/exporters';
import { CertificateRecord, LEVEL_NAMES } from '../types/lms';

function CertificatePreviewCard({
  cert,
  template,
}: {
  cert: CertificateRecord;
  template?: CertificateTemplateOptions;
}) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const verifyPath = `/verifikasi/${encodeURIComponent(cert.certificateNumber)}`;

  useEffect(() => {
    const fullUrl = `${window.location.origin}${verifyPath}`;
    QRCode.toDataURL(fullUrl, { width: 140, margin: 1 })
      .then(setQrUrl)
      .catch(() => setQrUrl(''));
  }, [verifyPath]);

  const lvlName = LEVEL_NAMES[(cert.completedLevel as 1 | 2 | 3 | 4) || 4] || 'Redefinition (Redefinisi)';
  const logoSrc = template?.logoUrl || ASSET_CERT_SEAL;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-start gap-4">
          <img
            src={logoSrc}
            alt="Logo resmi sertifikat LMS Pelatihan Digitalisasi Pembelajaran"
            referrerPolicy="no-referrer"
            className="w-14 h-14 object-contain rounded-lg border border-slate-200 p-1 bg-white shrink-0"
          />
          <div>
            <p className="text-[11px] font-semibold text-[#0F2544] uppercase">
              {template?.templateTitle || 'SERTIFIKAT KELULUSAN'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {cert.organizer} · Diterbitkan {cert.issuedDate}
            </p>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">{cert.participantName}</h2>
            <p className="text-xs text-slate-700 mt-0.5">{cert.trainingName}</p>
            <p className="text-xs font-mono text-slate-500 mt-1">{cert.certificateNumber}</p>
          </div>
        </div>

        {qrUrl && (
          <div className="text-center shrink-0">
            <img
              src={qrUrl}
              alt={`QR verifikasi ${cert.certificateNumber}`}
              className="w-20 h-20 border border-slate-200 rounded-md p-1 bg-white"
            />
            <p className="text-[10px] text-slate-500 mt-1">QR Verifikasi</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-slate-600">
          Penanggung Jawab: <span className="font-semibold text-slate-900">{cert.signerName}</span> ·
          Kelulusan Level {cert.completedLevel} ({lvlName})
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={verifyPath}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Halaman Verifikasi Publik
          </Link>
          <button
            type="button"
            onClick={() => void generateCertificatePdf(cert, template)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0F2544] hover:bg-slate-800 rounded-lg"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export function CertificatesPage() {
  const {
    currentUser,
    effectiveRole,
    certificates,
    trainings,
    institutionSettings,
    updateTraining,
    showToast,
  } = useLms();

  const canConfigureTemplate = effectiveRole === 'super_admin' || effectiveRole === 'admin_kegiatan';
  const [selectedTrnId, setSelectedTrnId] = useState(trainings[0]?.id || '');
  const selectedTraining = trainings.find((t) => t.id === selectedTrnId) || trainings[0] || null;

  const [tplForm, setTplForm] = useState({
    certTemplateTitle: selectedTraining?.certTemplateTitle || 'SERTIFIKAT KOMPETENSI DIGITALISASI PEMBELAJARAN',
    certTemplateSubtitle:
      selectedTraining?.certTemplateSubtitle ||
      'Telah menyelesaikan program pelatihan pemanfaatan Papan Interaktif Digital (PID) berbasis model SAMR pada LMS PELATIHAN DIGITALISASI PEMBELAJARAN.',
    certAccentColor: (selectedTraining?.certAccentColor || 'navy') as 'navy' | 'blue' | 'gold',
    certLogoUrl: selectedTraining?.certLogoUrl || '',
    signerName: selectedTraining?.signerName || '',
    signerTitle: selectedTraining?.signerTitle || '',
  });

  useEffect(() => {
    if (!selectedTraining) return;
    setTplForm({
      certTemplateTitle: selectedTraining.certTemplateTitle || 'SERTIFIKAT KOMPETENSI DIGITALISASI PEMBELAJARAN',
      certTemplateSubtitle:
        selectedTraining.certTemplateSubtitle ||
        'Telah menyelesaikan program pelatihan pemanfaatan Papan Interaktif Digital (PID) berbasis model SAMR pada LMS PELATIHAN DIGITALISASI PEMBELAJARAN.',
      certAccentColor: selectedTraining.certAccentColor || 'navy',
      certLogoUrl: selectedTraining.certLogoUrl || '',
      signerName: selectedTraining.signerName,
      signerTitle: selectedTraining.signerTitle,
    });
  }, [selectedTraining]);

  if (!currentUser || !effectiveRole) return null;

  const visibleCerts =
    effectiveRole === 'peserta'
      ? certificates.filter((c) => c.userId === currentUser.uid)
      : certificates;

  const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 240;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let dataUrl = canvas.toDataURL('image/png');
        if (dataUrl.length > 150000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        }
        if (dataUrl.length > 190000) {
          showToast('error', 'Ukuran gambar logo terlalu besar setelah kompresi. Gunakan file logo PNG/JPG yang lebih kecil.');
          return;
        }
        setTplForm((prev) => ({ ...prev, certLogoUrl: dataUrl }));
        showToast('info', 'Pratinjau logo penyelenggara diperbarui. Klik "Simpan Template Sertifikat" untuk menerapkan.');
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTraining) return;
    await updateTraining(selectedTraining.id, {
      certTemplateTitle: tplForm.certTemplateTitle.trim().slice(0, 120),
      certTemplateSubtitle: tplForm.certTemplateSubtitle.trim().slice(0, 300),
      certAccentColor: tplForm.certAccentColor,
      certLogoUrl: tplForm.certLogoUrl.slice(0, 200000),
      signerName: tplForm.signerName.trim().slice(0, 120),
      signerTitle: tplForm.signerTitle.trim().slice(0, 160),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sertifikat Digital & Verifikasi QR</h1>
          <p className="text-sm text-slate-600 mt-1">
            Setiap sertifikat memiliki nomor unik, QR Code verifikasi publik berdata minimum, template resmi yang dapat disesuaikan, dan berkas PDF siap unduh.
          </p>
        </div>
        <Link
          to="/verifikasi"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg whitespace-nowrap"
        >
          <ShieldCheck className="w-4 h-4" />
          Buka Portal Verifikasi Publik
        </Link>
      </div>

      {/* Pengaturan Template Sertifikat untuk Admin */}
      {canConfigureTemplate && selectedTraining && (
        <form
          onSubmit={(e) => void handleSaveTemplate(e)}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-blue-700" />
              <h2 className="text-base font-bold text-slate-900">Pengaturan Template Sertifikat</h2>
            </div>
            <select
              value={selectedTraining.id}
              onChange={(e) => setSelectedTrnId(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              {trainings.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} — {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Judul Sertifikat</label>
              <input
                required
                maxLength={120}
                type="text"
                value={tplForm.certTemplateTitle}
                onChange={(e) => setTplForm({ ...tplForm, certTemplateTitle: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Tema Bingkai PDF</label>
              <select
                value={tplForm.certAccentColor}
                onChange={(e) =>
                  setTplForm({
                    ...tplForm,
                    certAccentColor: e.target.value as 'navy' | 'blue' | 'gold',
                  })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="navy">Navy Blue Resmi (Default)</option>
                <option value="blue">Royal Blue Modern</option>
                <option value="gold">Emas Kehormatan</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block font-medium text-slate-700 mb-1">
                Keterangan / Subjudul Kelulusan
              </label>
              <input
                maxLength={300}
                type="text"
                value={tplForm.certTemplateSubtitle}
                onChange={(e) => setTplForm({ ...tplForm, certTemplateSubtitle: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nama Penanggung Jawab</label>
              <input
                required
                maxLength={120}
                type="text"
                value={tplForm.signerName}
                onChange={(e) => setTplForm({ ...tplForm, signerName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">
                Jabatan Penanggung Jawab
              </label>
              <input
                required
                maxLength={160}
                type="text"
                value={tplForm.signerTitle}
                onChange={(e) => setTplForm({ ...tplForm, signerTitle: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-3 pt-2 border-t border-slate-100">
              <label className="block font-medium text-slate-700 mb-2">
                Logo Lembaga Penyelenggara pada Sertifikat PDF
              </label>
              <div className="flex flex-wrap items-center gap-4">
                <img
                  src={tplForm.certLogoUrl || ASSET_CERT_SEAL}
                  alt="Pratinjau logo sertifikat"
                  className="w-14 h-14 object-contain rounded-lg border border-slate-200 p-1 bg-white"
                />
                <div className="flex flex-wrap items-center gap-2.5">
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer">
                    <ImagePlus className="w-3.5 h-3.5" />
                    Unggah Logo (PNG/JPG)
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleUploadLogo}
                      className="hidden"
                    />
                  </label>
                  {tplForm.certLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setTplForm({ ...tplForm, certLogoUrl: '' })}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-300 hover:bg-slate-50 rounded-lg"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset ke Emblem Default
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-slate-500">
                  Otomatis diubah ukurannya (maks. lebar 240px) agar ringan dan tercetak tajam pada PDF.
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F2544] hover:bg-slate-800 rounded-lg"
            >
              <Save className="w-3.5 h-3.5" />
              Simpan Template Sertifikat
            </button>
          </div>
        </form>
      )}

      {visibleCerts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <Award className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">Belum Ada Sertifikat Diterbitkan</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Sertifikat diterbitkan otomatis setelah peserta memenuhi seluruh standar kelulusan materi wajib, tugas praktik PID, kuis, evaluasi akhir, dan refleksi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {visibleCerts.map((cert) => {
            const trn = trainings.find((t) => t.id === cert.trainingId);
            return (
              <CertificatePreviewCard
                key={cert.certificateNumber}
                cert={cert}
                template={{
                  templateTitle: trn?.certTemplateTitle,
                  templateSubtitle: trn?.certTemplateSubtitle,
                  accentColor: trn?.certAccentColor || 'navy',
                  appName: institutionSettings.appName,
                  logoUrl: trn?.certLogoUrl,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
