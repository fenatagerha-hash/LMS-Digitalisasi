import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Link2, Shield, UserCheck, Users } from 'lucide-react';
import { TrainingProgram } from '../types/lms';
import { useLms } from '../context/LmsContext';

interface AccessLinksPanelProps {
  training?: TrainingProgram | null;
  compact?: boolean;
}

interface RoleLinkGroup {
  slug: 'peserta' | 'fasilitator' | 'panitia';
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentBg: string;
  accentText: string;
}

const ROLE_GROUPS: RoleLinkGroup[] = [
  {
    slug: 'peserta',
    title: 'Peserta / Guru',
    subtitle: 'Pendaftaran mandiri peserta pelatihan & tautan masuk ruang belajar LMS.',
    icon: Users,
    accentBg: 'bg-[#e7f1fa]',
    accentText: 'text-[#0f6cbf]',
  },
  {
    slug: 'fasilitator',
    title: 'Fasilitator / Narasumber',
    subtitle: 'Tautan registrasi dan masuk fasilitator untuk membimbing materi & menilai praktik.',
    icon: UserCheck,
    accentBg: 'bg-emerald-50',
    accentText: 'text-[#198754]',
  },
  {
    slug: 'panitia',
    title: 'Panitia / Admin Kegiatan',
    subtitle: 'Tautan registrasi dan masuk panitia untuk mengelola jadwal, peserta, dan laporan.',
    icon: Shield,
    accentBg: 'bg-amber-50',
    accentText: 'text-amber-700',
  },
];

export function AccessLinksPanel({ training, compact = false }: AccessLinksPanelProps) {
  const { showToast } = useLms();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://pamandai-edu.app';
  const query = training ? `?kegiatan=${encodeURIComponent(training.id)}` : '';

  const copyLink = async (key: string, url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      showToast('success', `${label} berhasil disalin ke papan klip.`);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2200);
    } catch {
      showToast('info', `Salin tautan secara manual: ${url}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#212529] flex items-center gap-2">
            <Link2 className="w-4 h-4 text-[#0f6cbf]" />
            Tautan Pendaftaran & Login Peran
          </h3>
          <p className="text-xs text-[#6c757d] mt-1">
            {training
              ? `Bagikan tautan khusus kegiatan "${training.name}" (${training.code}) untuk Peserta, Fasilitator, dan Panitia.`
              : 'Bagikan tautan pendaftaran dan masuk terpisah sesuai peran pengguna LMS PAMANDAI EDU.'}
          </p>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 ${
          compact ? 'md:grid-cols-3 gap-3' : 'lg:grid-cols-3 gap-4'
        }`}
      >
        {ROLE_GROUPS.map((group) => {
          const Icon = group.icon;
          const registerUrl = `${origin}/daftar/${group.slug}${query}`;
          const loginUrl = `${origin}/login/${group.slug}${query}`;
          const regKey = `reg_${group.slug}`;
          const logKey = `log_${group.slug}`;

          return (
            <div
              key={group.slug}
              className="bg-white border border-[#dee2e6] rounded-xl p-4 flex flex-col justify-between gap-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-lg ${group.accentBg} ${group.accentText} flex items-center justify-center shrink-0`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#212529]">{group.title}</h4>
                    <p className="text-[11px] text-[#6c757d] leading-snug">{group.subtitle}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {/* Link Pendaftaran */}
                <div className="space-y-1">
                  <label className="block font-semibold text-[#495057]">
                    Link Pendaftaran {group.title.split(' / ')[0]}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={registerUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="flex-1 min-w-0 px-2.5 py-1.5 font-mono text-[11px] bg-[#f8f9fa] border border-[#ced4da] rounded-lg text-[#212529]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        void copyLink(
                          regKey,
                          registerUrl,
                          `Link Pendaftaran ${group.title.split(' / ')[0]}`,
                        )
                      }
                      title="Salin link pendaftaran"
                      className="p-2 rounded-lg bg-[#0f6cbf] hover:bg-[#0b5394] text-white shrink-0 transition-colors"
                    >
                      {copiedKey === regKey ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={`/daftar/${group.slug}${query}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Buka halaman pendaftaran"
                      className="p-2 rounded-lg border border-[#ced4da] text-[#495057] hover:bg-[#f4f6f9] shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Link Login */}
                <div className="space-y-1">
                  <label className="block font-semibold text-[#495057]">
                    Link Login {group.title.split(' / ')[0]}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={loginUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="flex-1 min-w-0 px-2.5 py-1.5 font-mono text-[11px] bg-[#f8f9fa] border border-[#ced4da] rounded-lg text-[#212529]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        void copyLink(
                          logKey,
                          loginUrl,
                          `Link Login ${group.title.split(' / ')[0]}`,
                        )
                      }
                      title="Salin link login"
                      className="p-2 rounded-lg bg-[#198754] hover:bg-[#146c43] text-white shrink-0 transition-colors"
                    >
                      {copiedKey === logKey ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={`/login/${group.slug}${query}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Buka halaman login"
                      className="p-2 rounded-lg border border-[#ced4da] text-[#495057] hover:bg-[#f4f6f9] shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
