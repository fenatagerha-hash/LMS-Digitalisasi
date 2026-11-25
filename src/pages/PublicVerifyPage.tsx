import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useLms } from '../context/LmsContext';
import { CertificateRecord } from '../types/lms';

export function PublicVerifyPage() {
  const { certificateNumber: routeCertNo } = useParams();
  const navigate = useNavigate();
  const { lookupCertificatePublic, certificates, institutionSettings } = useLms();

  const [queryNo, setQueryNo] = useState(routeCertNo || '');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(Boolean(routeCertNo));
  const [result, setResult] = useState<CertificateRecord | null>(null);

  const runLookup = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setSearched(true);
    try {
      const found = await lookupCertificatePublic(trimmed);
      setResult(found);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeCertNo) {
      setQueryNo(routeCertNo);
      void runLookup(routeCertNo);
    }
  }, [routeCertNo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryNo.trim()) return;
    navigate(`/verifikasi/${encodeURIComponent(queryNo.trim())}`);
    void runLookup(queryNo);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <header className="bg-[#0F2544] text-white border-b border-slate-800 px-6 lg:px-10 h-16 flex items-center justify-between gap-6">
        <Link to="/" className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap">
          {institutionSettings.appName}
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-100 hover:text-white whitespace-nowrap"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Portal
        </Link>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-12 space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700">
            <ShieldCheck className="w-4 h-4" />
            Verifikasi Publik Sertifikat Digital
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Cek Keabsahan Nomor Sertifikat
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Masukkan nomor sertifikat atau pindai QR Code pada dokumen PDF. Halaman publik ini hanya menampilkan informasi verifikasi minimum demi menjaga privasi peserta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={queryNo}
            onChange={(e) => setQueryNo(e.target.value)}
            placeholder="Contoh: LMS-2026-TD2026A-0401"
            className="flex-1 px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Memeriksa...' : 'Verifikasi'}
          </button>
        </form>

        {/* Contoh nomor sertifikat yang tersedia untuk kemudahan pengujian */}
        {certificates.length > 0 && !searched && (
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
            <span>Contoh nomor sertifikat valid:</span>
            {certificates.slice(0, 3).map((c) => (
              <button
                key={c.certificateNumber}
                type="button"
                onClick={() => {
                  setQueryNo(c.certificateNumber);
                  navigate(`/verifikasi/${encodeURIComponent(c.certificateNumber)}`);
                  void runLookup(c.certificateNumber);
                }}
                className="font-mono text-blue-700 hover:underline"
              >
                {c.certificateNumber}
              </button>
            ))}
          </div>
        )}

        {searched && !loading && result && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <CheckCircle2
                  className={`w-6 h-6 shrink-0 ${
                    result.status === 'valid' ? 'text-emerald-600' : 'text-red-600'
                  }`}
                />
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {result.status === 'valid'
                      ? 'Sertifikat Terverifikasi Sah'
                      : 'Sertifikat Telah Dicabut'}
                  </h2>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    {result.certificateNumber}
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-semibold ${
                  result.status === 'valid' ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {result.status === 'valid' ? 'STATUS: VALID' : 'STATUS: DICABUT'}
              </span>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Nama Peserta</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{result.participantName}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Tanggal Penerbitan</dt>
                <dd className="font-mono text-slate-900 mt-0.5">{result.issuedDate}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Nama Kegiatan Pelatihan</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{result.trainingName}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Penyelenggara</dt>
                <dd className="text-slate-800 mt-0.5">{result.organizer}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Penanggung Jawab</dt>
                <dd className="text-slate-800 mt-0.5">{result.signerName}</dd>
              </div>
            </dl>
          </div>
        )}

        {searched && !loading && !result && (
          <div className="bg-white border border-red-200 rounded-xl p-6 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Sertifikat Tidak Ditemukan</h2>
              <p className="text-xs text-slate-600 mt-1">
                Nomor <span className="font-mono font-semibold">{queryNo}</span> tidak tercatat pada basis data sertifikat {institutionSettings.appName}. Periksa kembali penulisan nomor.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
