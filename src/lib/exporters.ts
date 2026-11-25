import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import { ASSET_CERT_SEAL } from '../data/seedDataset';
import { CertificateRecord } from '../types/lms';

export interface ParsedParticipantRow {
  rowNumber: number;
  fullName: string;
  email: string;
  phone: string;
  instansi: string;
  kabupatenKota: string;
  jabatan: string;
  jenjangPendidikan?: string;
  mataPelajaran?: string;
  valid: boolean;
  errorReason: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Mengurai file Excel (.xlsx/.xls/.csv) untuk impor peserta massal dengan validasi,
 * deteksi duplikat email (baik terhadap database maupun di dalam file), pratinjau, dan laporan gagal.
 */
export async function parseParticipantExcel(
  file: File,
  existingEmails: Set<string>,
): Promise<{
  rows: ParsedParticipantRow[];
  validCount: number;
  failedCount: number;
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], validCount: 0, failedCount: 0 };
  }
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const seenInFile = new Set<string>();
  const rows: ParsedParticipantRow[] = raw.map((item, index) => {
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        const matchKey = Object.keys(item).find(
          (ok) => ok.trim().toLowerCase() === k.toLowerCase(),
        );
        if (matchKey !== undefined && String(item[matchKey]).trim() !== '') {
          return String(item[matchKey]).trim();
        }
      }
      return '';
    };

    const fullName = pick('nama', 'nama_lengkap', 'full_name', 'fullName', 'Nama Lengkap');
    const email = pick('email', 'Email', 'surel').toLowerCase();
    const phone = pick('telepon', 'no_hp', 'phone', 'hp', 'No HP');
    const instansi = pick('instansi', 'sekolah', 'unit_kerja', 'organisasi', 'Instansi', 'Asal Sekolah');
    const kabupatenKota = pick('kabupaten_kota', 'kota', 'kabupaten', 'Kabupaten/Kota');
    const jabatan = pick('jabatan', 'posisi', 'Jabatan');
    const jenjangPendidikan = pick('jenjang', 'jenjang_pendidikan', 'Jenjang Pendidikan', 'Jenjang');
    const mataPelajaran = pick('mata_pelajaran', 'mapel', 'Mata Pelajaran');

    const errors: string[] = [];
    if (fullName.length < 2) errors.push('Nama lengkap wajib diisi (min. 2 karakter)');
    if (!email || !EMAIL_RE.test(email)) errors.push('Format email tidak valid');
    if (email && existingEmails.has(email)) errors.push('Email sudah terdaftar di database');
    if (email && seenInFile.has(email)) errors.push('Email duplikat di dalam file impor');
    if (email) seenInFile.add(email);

    return {
      rowNumber: index + 2,
      fullName,
      email,
      phone,
      instansi: instansi || 'Sekolah Mitra',
      kabupatenKota: kabupatenKota || 'Indonesia',
      jabatan: jabatan || 'Guru',
      jenjangPendidikan: jenjangPendidikan || 'SMA',
      mataPelajaran: mataPelajaran || 'Umum',
      valid: errors.length === 0,
      errorReason: errors.join('; '),
    };
  });

  const validCount = rows.filter((r) => r.valid).length;
  return { rows, validCount, failedCount: rows.length - validCount };
}

export function downloadImportTemplateExcel(): void {
  const sample = [
    {
      'Nama Lengkap': 'Andi Wijaya, S.Pd.',
      Email: 'andi.wijaya@guru.belajar.id',
      'No HP': '081299001122',
      'Asal Sekolah': 'SMAN 1 Semarang',
      'Jenjang Pendidikan': 'SMA',
      'Mata Pelajaran': 'Fisika',
      'Kabupaten/Kota': 'Semarang',
      Jabatan: 'Guru Mata Pelajaran',
    },
    {
      'Nama Lengkap': 'Rina Oktaviani, M.Pd.',
      Email: 'rina.oktaviani@guru.belajar.id',
      'No HP': '081299003344',
      'Asal Sekolah': 'SMPN 2 Bandung',
      'Jenjang Pendidikan': 'SMP',
      'Mata Pelajaran': 'Matematika',
      'Kabupaten/Kota': 'Bandung',
      Jabatan: 'Guru Penggerak',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sample);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Peserta');
  XLSX.writeFile(wb, 'Template-Impor-Peserta-LMS-SAMR.xlsx');
}

export function exportMonitoringToExcel(
  rows: Array<Record<string, string | number>>,
  fileName = 'Laporan-Monitoring-LMS.xlsx',
): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Monitoring');
  XLSX.writeFile(wb, fileName);
}

export function exportMonitoringToPdf(params: {
  title: string;
  subtitle: string;
  summaryLines: string[];
  columns: string[];
  rows: Array<Array<string | number>>;
  fileName?: string;
}): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(params.title, 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(params.subtitle, 14, 24);

  let y = 32;
  doc.setFontSize(9);
  for (const line of params.summaryLines) {
    doc.text(line, 14, y);
    y += 5;
  }

  y += 4;
  const colWidth = Math.floor(268 / Math.max(1, params.columns.length));
  doc.setFillColor(15, 23, 42);
  doc.rect(14, y, 269, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  params.columns.forEach((col, i) => {
    doc.text(String(col).slice(0, 20), 16 + i * colWidth, y + 5.5);
  });

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  params.rows.slice(0, 28).forEach((row, rIdx) => {
    if (y > 190) {
      doc.addPage();
      y = 20;
    }
    if (rIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4, 269, 6.5, 'F');
    }
    row.forEach((cell, cIdx) => {
      doc.text(String(cell).slice(0, 24), 16 + cIdx * colWidth, y);
    });
    y += 6.5;
  });

  doc.save(params.fileName || 'Laporan-Monitoring-LMS.pdf');
}

async function imageUrlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export interface CertificateTemplateOptions {
  templateTitle?: string;
  templateSubtitle?: string;
  accentColor?: 'navy' | 'blue' | 'gold';
  appName?: string;
  logoUrl?: string;
}

const LEVEL_LABEL_MAP: Record<number, string> = {
  1: 'Substitution (Substitusi)',
  2: 'Augmentation (Augmentasi)',
  3: 'Modification (Modifikasi)',
  4: 'Redefinition (Redefinisi)',
};

export async function generateCertificatePdf(
  cert: CertificateRecord,
  template?: CertificateTemplateOptions,
): Promise<void> {
  const verifyUrl = `${window.location.origin}/verifikasi/${encodeURIComponent(cert.certificateNumber)}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 220, margin: 1 });
  const customLogo = template?.logoUrl?.trim();
  const logoDataUrl = customLogo
    ? customLogo.startsWith('data:image/')
      ? customLogo
      : await imageUrlToDataUrl(customLogo)
    : await imageUrlToDataUrl(ASSET_CERT_SEAL);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const w = 297;
  const h = 210;

  const accent = template?.accentColor || 'navy';
  const primaryRgb: [number, number, number] =
    accent === 'blue' ? [29, 78, 216] : accent === 'gold' ? [120, 82, 24] : [15, 37, 68];
  const secondaryRgb: [number, number, number] =
    accent === 'blue' ? [59, 130, 246] : accent === 'gold' ? [180, 145, 78] : [5, 150, 105];

  // Latar & bingkai resmi
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, w, h, 'F');

  doc.setDrawColor(...primaryRgb);
  doc.setLineWidth(1.4);
  doc.rect(10, 10, w - 20, h - 20);

  doc.setDrawColor(...secondaryRgb);
  doc.setLineWidth(0.5);
  doc.rect(14, 14, w - 28, h - 28);

  if (logoDataUrl) {
    const imgFmt = logoDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
    try {
      doc.addImage(logoDataUrl, imgFmt, w / 2 - 13, 19, 26, 26);
    } catch {
      // Abaikan jika format logo eksternal tidak kompatibel
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryRgb);
  doc.text(
    (template?.appName || 'LMS PELATIHAN DIGITALISASI PEMBELAJARAN').toUpperCase(),
    w / 2,
    51,
    { align: 'center' },
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(cert.organizer.toUpperCase(), w / 2, 57, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...primaryRgb);
  doc.text(
    (template?.templateTitle || 'SERTIFIKAT KOMPETENSI SAMR').toUpperCase(),
    w / 2,
    69,
    { align: 'center' },
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Nomor Sertifikat: ${cert.certificateNumber}`, w / 2, 77, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.text('Diberikan kepada:', w / 2, 91, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(15, 23, 42);
  doc.text(cert.participantName, w / 2, 104, { align: 'center' });

  doc.setDrawColor(203, 213, 225);
  doc.line(w / 2 - 60, 108, w / 2 + 60, 108);

  const lvlName = LEVEL_LABEL_MAP[cert.completedLevel] || 'Redefinition (Redefinisi)';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    template?.templateSubtitle ||
      `Telah menyelesaikan dan dinyatakan LULUS pada Level ${cert.completedLevel} (${lvlName}) dalam kegiatan:`,
    w / 2,
    118,
    { align: 'center' },
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(29, 78, 216);
  doc.text(cert.trainingName, w / 2, 128, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Capaian Kompetensi SAMR: Level ${cert.completedLevel} · ${lvlName}`, w / 2, 136, {
    align: 'center',
  });

  // Area QR Verifikasi di kiri bawah
  doc.addImage(qrDataUrl, 'PNG', 26, 146, 32, 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Pindai QR untuk verifikasi publik', 26, 182);
  doc.text(cert.certificateNumber, 26, 186);

  // Penandatangan di kanan bawah
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Diterbitkan pada ${cert.issuedDate}`, w - 65, 152, { align: 'center' });

  doc.setDrawColor(203, 213, 225);
  doc.line(w - 95, 168, w - 35, 168);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(cert.signerName || 'Penanggung Jawab Program', w - 65, 174, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(cert.signerTitle || cert.organizer, w - 65, 180, { align: 'center' });

  doc.save(`Sertifikat-${cert.certificateNumber}.pdf`);
}
