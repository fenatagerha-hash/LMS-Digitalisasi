import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY belum terkonfigurasi. Silakan periksa API key pada panel Settings > Secrets.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientGeminiError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('503') ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('500') ||
    lower.includes('internal') ||
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout') ||
    lower.includes('fetch failed')
  );
}

function formatFriendlyGeminiError(rawMessage: string): { status: number; message: string } {
  let extracted = rawMessage;
  try {
    const jsonStart = rawMessage.indexOf('{');
    if (jsonStart !== -1) {
      const parsed = JSON.parse(rawMessage.slice(jsonStart)) as {
        error?: { code?: number; message?: string; status?: string };
      };
      if (parsed?.error?.message) {
        extracted = `${parsed.error.code || ''} ${parsed.error.status || ''} ${parsed.error.message}`.trim();
      }
    }
  } catch {
    // Keep raw message if not JSON
  }

  const lower = extracted.toLowerCase();
  if (rawMessage.includes('GEMINI_API_KEY')) {
    return { status: 500, message: rawMessage };
  }
  if (
    lower.includes('503') ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded')
  ) {
    return {
      status: 503,
      message:
        'Layanan AI penyusun soal sedang mengalami lonjakan trafik sementara (503). Materi Anda tetap aman tersimpan — silakan klik "Coba Buat Soal Lagi" dalam beberapa detik.',
    };
  }
  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return {
      status: 429,
      message:
        'Batas permintaan layanan AI sementara tercapai (429). Materi Anda tetap tersimpan — tunggu sebentar lalu klik "Coba Buat Soal Lagi".',
    };
  }
  if (lower.includes('403') || lower.includes('permission_denied')) {
    return {
      status: 403,
      message: 'Akses ke layanan AI ditolak (403). Periksa konfigurasi API key Anda.',
    };
  }
  return {
    status: 500,
    message: `Gagal menyusun soal otomatis saat ini: ${extracted.slice(0, 220)}`,
  };
}

interface GenerateQuestionsRequest {
  title?: string;
  description?: string;
  contentBody?: string;
  fileName?: string;
  fileUrl?: string;
  mimeType?: string;
  fileBase64?: string;
  trainingName?: string;
  levelLabel?: string;
  usesSamr?: boolean;
  assessmentCount?: number;
  quizCount?: number;
  evaluationCount?: number;
}

const SUPPORTED_INLINE_MIME_PREFIXES = ['image/'];
const SUPPORTED_INLINE_MIMES = new Set(['application/pdf']);
const TEXT_MIMES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'application/json',
]);

const MATERIALS_UPLOAD_DIR = path.resolve(__dirname, 'uploads', 'materials');
const ALLOWED_MATERIAL_EXTENSIONS = new Set([
  '.pdf',
  '.txt',
  '.md',
  '.csv',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.ppt',
  '.pptx',
  '.doc',
  '.docx',
  '.mp4',
  '.webm',
]);
const EXT_TO_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

function getMimeByFileName(name: string): string {
  const ext = path.extname(name).toLowerCase();
  return EXT_TO_MIME[ext] || 'application/octet-stream';
}

function readStoredMaterialFile(fileUrl: string): { base64: string; mimeType: string; fileName: string } | null {
  const prefix = '/api/materials/files/';
  if (!fileUrl.startsWith(prefix)) return null;
  const rawName = decodeURIComponent(fileUrl.slice(prefix.length).split('?')[0] || '');
  const safeName = path.basename(rawName);
  if (!/^[a-zA-Z0-9._-]+$/.test(safeName)) return null;
  const fullPath = path.join(MATERIALS_UPLOAD_DIR, safeName);
  if (!fs.existsSync(fullPath)) return null;
  const stat = fs.statSync(fullPath);
  if (stat.size > 15 * 1024 * 1024) return null;
  const buf = fs.readFileSync(fullPath);
  const rawMime = getMimeByFileName(safeName).split(';')[0].trim();
  return {
    base64: buf.toString('base64'),
    mimeType: rawMime,
    fileName: safeName,
  };
}

async function startServer() {
  fs.mkdirSync(MATERIALS_UPLOAD_DIR, { recursive: true });
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'pamandai-edu-lms' });
  });

  // Unggah berkas materi biner langsung (tanpa overhead base64 JSON)
  app.post(
    '/api/materials/upload-raw',
    express.raw({ type: '*/*', limit: '20mb' }),
    (req, res) => {
      try {
        const rawHeaderName = String(req.headers['x-file-name'] || '').trim();
        let decodedName = rawHeaderName;
        try {
          decodedName = decodeURIComponent(rawHeaderName);
        } catch {
          decodedName = rawHeaderName;
        }
        const originalName = path.basename(decodedName || 'materi.pdf');
        const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

        if (!originalName || buffer.length === 0) {
          res.status(400).json({ ok: false, error: 'Berkas materi kosong atau tidak terbaca.' });
          return;
        }

        const ext = path.extname(originalName).toLowerCase();
        if (!ALLOWED_MATERIAL_EXTENSIONS.has(ext)) {
          res.status(400).json({
            ok: false,
            error: `Format berkas "${ext || 'tidak dikenal'}" tidak didukung. Gunakan PDF, PPT/PPTX, DOC/DOCX, TXT/MD, Gambar, atau Video MP4.`,
          });
          return;
        }

        if (buffer.length > 18 * 1024 * 1024) {
          res.status(400).json({
            ok: false,
            error: 'Ukuran berkas harus maksimal 18 MB.',
          });
          return;
        }

        const safeStem =
          path
            .basename(originalName, ext)
            .replace(/[^a-zA-Z0-9_-]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 60) || 'materi';
        const storedName = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}_${safeStem}${ext}`;
        const targetPath = path.join(MATERIALS_UPLOAD_DIR, storedName);
        fs.writeFileSync(targetPath, buffer);

        res.json({
          ok: true,
          storedName,
          fileName: originalName,
          fileUrl: `/api/materials/files/${encodeURIComponent(storedName)}`,
          mimeType: getMimeByFileName(storedName),
          sizeBytes: buffer.length,
        });
      } catch (err) {
        console.error('[api/materials/upload-raw] Error:', err);
        res.status(500).json({ ok: false, error: 'Gagal menyimpan berkas materi di server.' });
      }
    },
  );

  // Unggah berkas materi permanen (kompatibel JSON base64)
  app.post('/api/materials/upload', (req, res) => {
    try {
      const body = (req.body || {}) as {
        fileName?: string;
        mimeType?: string;
        fileBase64?: string;
      };
      const originalName = path.basename(String(body.fileName || '').trim());
      const base64 = String(body.fileBase64 || '').trim();
      if (!originalName || !base64) {
        res.status(400).json({ ok: false, error: 'Nama berkas dan isi berkas wajib diisi.' });
        return;
      }

      const ext = path.extname(originalName).toLowerCase();
      if (!ALLOWED_MATERIAL_EXTENSIONS.has(ext)) {
        res.status(400).json({
          ok: false,
          error: `Format berkas "${ext || 'tidak dikenal'}" tidak didukung. Gunakan PDF, PPT/PPTX, DOC/DOCX, TXT/MD, Gambar, atau Video MP4.`,
        });
        return;
      }

      const buffer = Buffer.from(base64, 'base64');
      if (buffer.length === 0 || buffer.length > 18 * 1024 * 1024) {
        res.status(400).json({
          ok: false,
          error: 'Ukuran berkas harus antara 1 byte hingga 18 MB.',
        });
        return;
      }

      const safeStem =
        path
          .basename(originalName, ext)
          .replace(/[^a-zA-Z0-9_-]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 60) || 'materi';
      const storedName = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}_${safeStem}${ext}`;
      const targetPath = path.join(MATERIALS_UPLOAD_DIR, storedName);
      fs.writeFileSync(targetPath, buffer);

      res.json({
        ok: true,
        storedName,
        fileName: originalName,
        fileUrl: `/api/materials/files/${encodeURIComponent(storedName)}`,
        mimeType: getMimeByFileName(storedName),
        sizeBytes: buffer.length,
      });
    } catch (err) {
      console.error('[api/materials/upload] Error:', err);
      res.status(500).json({ ok: false, error: 'Gagal menyimpan berkas materi di server.' });
    }
  });

  // Sajikan berkas materi secara inline (untuk viewer PDF/gambar/video) atau unduhan (?download=1)
  app.get('/api/materials/files/:storedName', (req, res) => {
    try {
      const safeName = path.basename(String(req.params.storedName || ''));
      if (!safeName || !/^[a-zA-Z0-9._-]+$/.test(safeName)) {
        res.status(400).json({ error: 'Nama berkas tidak valid.' });
        return;
      }
      const targetPath = path.join(MATERIALS_UPLOAD_DIR, safeName);
      if (!fs.existsSync(targetPath)) {
        res.status(404).json({ error: 'Berkas materi tidak ditemukan di server.' });
        return;
      }
      const stat = fs.statSync(targetPath);
      const mime = getMimeByFileName(safeName);
      const isDownload = req.query.download === '1';
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Length', String(stat.size));
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader(
        'Content-Disposition',
        `${isDownload ? 'attachment' : 'inline'}; filename="${safeName}"`,
      );
      if (req.method === 'HEAD') {
        res.status(200).end();
        return;
      }
      fs.createReadStream(targetPath).pipe(res);
    } catch (err) {
      console.error('[api/materials/files] Error:', err);
      res.status(500).json({ error: 'Gagal membuka berkas materi.' });
    }
  });

  app.post('/api/gemini/generate-questions', async (req, res) => {
    try {
      const body = (req.body || {}) as GenerateQuestionsRequest;
      const title = (body.title || '').trim();
      const description = (body.description || '').trim();
      const contentBody = (body.contentBody || '').trim();
      let fileName = (body.fileName || '').trim();
      const fileUrl = (body.fileUrl || '').trim();
      let mimeType = (body.mimeType || '').trim().toLowerCase();
      let fileBase64 = (body.fileBase64 || '').trim();
      const trainingName = (body.trainingName || 'Kegiatan Pelatihan').trim();
      const levelLabel = (body.levelLabel || 'Modul Pembelajaran').trim();
      const usesSamr = Boolean(body.usesSamr);

      if (!fileBase64 && fileUrl.startsWith('/api/materials/files/')) {
        const stored = readStoredMaterialFile(fileUrl);
        if (stored) {
          fileBase64 = stored.base64;
          mimeType = stored.mimeType;
          if (!fileName) fileName = stored.fileName;
        }
      }

      const assessmentCount = Math.max(
        0,
        Math.min(10, Math.round(body.assessmentCount === undefined ? 4 : Number(body.assessmentCount))),
      );
      const quizCount = Math.max(
        0,
        Math.min(10, Math.round(body.quizCount === undefined ? 5 : Number(body.quizCount))),
      );
      const evaluationCount = Math.max(
        0,
        Math.min(10, Math.round(body.evaluationCount === undefined ? 5 : Number(body.evaluationCount))),
      );

      if (!title && !contentBody && !fileBase64) {
        res.status(400).json({
          error: 'Judul materi, isi ringkasan, atau berkas materi wajib diisi untuk membuat soal.',
        });
        return;
      }

      if (assessmentCount === 0 && quizCount === 0 && evaluationCount === 0) {
        res.status(400).json({
          error: 'Minimal salah satu jumlah soal (Asesmen Awal, Kuis, atau Evaluasi) harus lebih dari 0.',
        });
        return;
      }

      const ai = getGeminiClient();

      const parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      let extractedFileText = '';
      if (fileBase64 && mimeType) {
        const isInlineSupported =
          SUPPORTED_INLINE_MIMES.has(mimeType) ||
          SUPPORTED_INLINE_MIME_PREFIXES.some((p) => mimeType.startsWith(p));

        if (isInlineSupported) {
          parts.push({
            inlineData: {
              mimeType,
              data: fileBase64,
            },
          });
        } else if (
          TEXT_MIMES.has(mimeType) ||
          fileName.endsWith('.txt') ||
          fileName.endsWith('.md') ||
          fileName.endsWith('.csv')
        ) {
          try {
            extractedFileText = Buffer.from(fileBase64, 'base64')
              .toString('utf8')
              .slice(0, 20000);
          } catch {
            extractedFileText = '';
          }
        }
      }

      const samrDirective = usesSamr
        ? 'Kegiatan ini adalah pelatihan Digitalisasi Pembelajaran berbasis 4 Level SAMR (Substitution, Augmentation, Modification, Redefinition). Kaitkan soal secara relevan dengan materi dan level SAMR tersebut.'
        : 'PENTING: Kegiatan ini BUKAN pelatihan model SAMR. JANGAN menyebut istilah SAMR, Substitution, Augmentation, Modification, Redefinition, ataupun Papan Interaktif Digital (PID) kecuali jika benar-benar tertulis di dalam materi yang diunggah. Fokus 100% pada isi materi kegiatan ini.';

      const promptText = [
        `Kegiatan Pelatihan: ${trainingName}`,
        `Bagian / Modul: ${levelLabel}`,
        `Judul Materi: ${title || fileName || 'Materi Pelatihan'}`,
        description ? `Deskripsi Singkat: ${description}` : '',
        fileName ? `Nama Berkas Terlampir: ${fileName}` : '',
        contentBody ? `\n=== ISI MATERI ===\n${contentBody.slice(0, 24000)}` : '',
        extractedFileText ? `\n=== KONTEN BERKAS ===\n${extractedFileText}` : '',
        `\nKonteks Khusus: ${samrDirective}`,
        `\nTugas Anda:`,
        `1. Pahami secara mendalam materi di atas (termasuk berkas PDF/gambar terlampir jika ada).`,
        `2. Susun ringkasan singkat materi (2-3 kalimat) dalam Bahasa Indonesia.`,
        assessmentCount > 0
          ? `3. Buat TEPAT ${assessmentCount} soal pilihan ganda untuk "Asesmen Awal (Pretest)" guna memetakan kesiapan dan pemahaman awal peserta terhadap konsep inti dari materi kegiatan ini.`
          : `3. Kembalikan array kosong [] untuk assessmentQuestions.`,
        quizCount > 0
          ? `4. Buat TEPAT ${quizCount} soal pilihan ganda untuk "Kuis Pemahaman" (tingkat pemahaman & aplikasi konsep langsung dari materi ini).`
          : `4. Kembalikan array kosong [] untuk quizQuestions.`,
        evaluationCount > 0
          ? `5. Buat TEPAT ${evaluationCount} soal pilihan ganda untuk "Evaluasi Akhir Keseluruhan" (tingkat analisis, studi kasus, dan penerapan praktis di kelas/instansi berdasarkan keseluruhan materi).`
          : `5. Kembalikan array kosong [] untuk evaluationQuestions.`,
        `6. Setiap soal WAJIB memiliki tepat 4 pilihan jawaban (options), index jawaban benar (correctIndex bernilai 0, 1, 2, atau 3), dan pembahasan singkat (explanation) dalam Bahasa Indonesia yang jelas dan pedagogis.`,
        `7. Jangan membuat soal yang identik antara Asesmen Awal, Kuis Pemahaman, dan Evaluasi Akhir.`,
      ]
        .filter(Boolean)
        .join('\n');

      parts.push({ text: promptText });

      const questionSchema = {
        type: Type.OBJECT,
        properties: {
          prompt: {
            type: Type.STRING,
            description: 'Teks pertanyaan pilihan ganda yang jelas dalam Bahasa Indonesia.',
          },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Tepat 4 teks pilihan jawaban tanpa awalan huruf A/B/C/D.',
          },
          correctIndex: {
            type: Type.INTEGER,
            description: 'Indeks pilihan yang benar (0, 1, 2, atau 3).',
          },
          explanation: {
            type: Type.STRING,
            description: 'Pembahasan singkat mengapa jawaban tersebut benar berdasarkan materi.',
          },
        },
        required: ['prompt', 'options', 'correctIndex', 'explanation'],
      };

      const baseConfig = {
        systemInstruction:
          'Anda adalah Desainer Instruksional dan Asesor Kompetensi Guru senior untuk LMS PAMANDAI EDU Kemendikdasmen. Seluruh keluaran harus dalam Bahasa Indonesia baku, akurat, bebas halusinasi, dan sepenuhnya berlandaskan materi kegiatan yang diunggah.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: 'Ringkasan 2-3 kalimat dari materi yang diunggah.',
            },
            assessmentQuestions: {
              type: Type.ARRAY,
              items: questionSchema,
              description: 'Daftar soal Asesmen Awal (Pretest) sesuai materi kegiatan.',
            },
            quizQuestions: {
              type: Type.ARRAY,
              items: questionSchema,
              description: 'Daftar soal Kuis Pemahaman.',
            },
            evaluationQuestions: {
              type: Type.ARRAY,
              items: questionSchema,
              description: 'Daftar soal Evaluasi Akhir Pembelajaran.',
            },
          },
          required: ['summary', 'assessmentQuestions', 'quizQuestions', 'evaluationQuestions'],
        },
      };

      const modelPlans: Array<{
        model: string;
        attempts: number;
        thinkingConfig?: { thinkingLevel: ThinkingLevel };
      }> = [
        {
          model: 'gemini-4-hydrogen',
          attempts: 2,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
        {
          model: 'gemini-3.1-flash-lite',
          attempts: 2,
        },
      ];

      let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
      let modelUsed = '';
      let lastError: unknown = null;

      for (const plan of modelPlans) {
        for (let attempt = 1; attempt <= plan.attempts; attempt++) {
          try {
            response = await ai.models.generateContent({
              model: plan.model,
              contents: { parts },
              config: plan.thinkingConfig
                ? { ...baseConfig, thinkingConfig: plan.thinkingConfig }
                : baseConfig,
            });
            modelUsed = plan.model;
            break;
          } catch (err) {
            lastError = err;
            const errMsg = err instanceof Error ? err.message : String(err);
            const transient = isTransientGeminiError(errMsg);
            console.warn(
              `[api/gemini/generate-questions] Model ${plan.model} percobaan ${attempt}/${plan.attempts} gagal: ${errMsg.slice(0, 200)}`,
            );
            if (!transient) {
              throw err;
            }
            if (attempt < plan.attempts) {
              await sleep(900 * attempt);
            }
          }
        }
        if (response) break;
        await sleep(500);
      }

      if (!response) {
        throw lastError instanceof Error
          ? lastError
          : new Error('503 UNAVAILABLE: Layanan AI sedang sibuk.');
      }

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({
          error: 'Model tidak mengembalikan respons soal. Silakan klik "Coba Buat Soal Lagi".',
        });
        return;
      }

      const parsed = JSON.parse(rawText) as {
        summary?: string;
        assessmentQuestions?: Array<{
          prompt: string;
          options: string[];
          correctIndex: number;
          explanation: string;
        }>;
        quizQuestions?: Array<{
          prompt: string;
          options: string[];
          correctIndex: number;
          explanation: string;
        }>;
        evaluationQuestions?: Array<{
          prompt: string;
          options: string[];
          correctIndex: number;
          explanation: string;
        }>;
      };

      const sanitizeQuestions = (
        list:
          | Array<{
              prompt: string;
              options: string[];
              correctIndex: number;
              explanation: string;
            }>
          | undefined,
      ) =>
        (Array.isArray(list) ? list : [])
          .filter(
            (q) =>
              q &&
              typeof q.prompt === 'string' &&
              q.prompt.trim().length > 0 &&
              Array.isArray(q.options) &&
              q.options.length >= 2,
          )
          .map((q) => {
            const opts = q.options
              .slice(0, 4)
              .map((o) => String(o || '').replace(/^[A-Da-d][.)]\s*/, '').trim());
            while (opts.length < 4) {
              opts.push(`Pilihan ${opts.length + 1}`);
            }
            const idx = Math.max(0, Math.min(opts.length - 1, Number(q.correctIndex) || 0));
            return {
              prompt: q.prompt.trim(),
              options: opts,
              correctIndex: idx,
              explanation: String(q.explanation || 'Sesuai konsep pada materi pembelajaran.').trim(),
            };
          });

      res.json({
        ok: true,
        modelUsed,
        summary: String(parsed.summary || '').trim(),
        assessmentQuestions: sanitizeQuestions(parsed.assessmentQuestions),
        quizQuestions: sanitizeQuestions(parsed.quizQuestions),
        evaluationQuestions: sanitizeQuestions(parsed.evaluationQuestions),
      });
    } catch (err: unknown) {
      const rawMessage =
        err instanceof Error ? err.message : 'Terjadi galat saat menyusun soal dari materi.';
      const friendly = formatFriendlyGeminiError(rawMessage);
      console.error('[api/gemini/generate-questions] Error:', rawMessage);
      res.status(friendly.status).json({ error: friendly.message });
    }
  });

  app.post('/api/gemini/qna-chat', async (req, res) => {
    try {
      const body = (req.body || {}) as {
        message?: string;
        history?: Array<{ role?: string; text?: string }>;
        topic?: string;
        context?: {
          trainingName?: string;
          trainingCode?: string;
          userRole?: string;
          levelSummary?: string;
          materials?: Array<{ title?: string; levelNumber?: number; description?: string }>;
        };
      };

      const userMessage = String(body.message || '').trim();
      if (!userMessage) {
        res.status(400).json({ error: 'Pertanyaan tidak boleh kosong.' });
        return;
      }
      if (userMessage.length > 4000) {
        res.status(400).json({ error: 'Pertanyaan terlalu panjang (maksimal 4.000 karakter).' });
        return;
      }

      const ai = getGeminiClient();

      const topicMap: Record<string, string> = {
        semua: 'Seluruh cakupan Digitalisasi Pembelajaran, Model SAMR, Papan Interaktif Digital (PID), Kebijakan Pendidikan terkait, dan panduan LMS.',
        digitalisasi: 'Materi Digitalisasi Pembelajaran, Pedagogi Digital, Kurikulum Merdeka, dan Pembelajaran Mendalam.',
        samr: 'Model Adaptif 4 Level SAMR (Level 1 Substitution, Level 2 Augmentation, Level 3 Modification, Level 4 Redefinition) beserta asesmen dan penempatan level.',
        pid: 'Pemanfaatan Papan Interaktif Digital (PID / Interactive Flat Panel / IFP), fitur whiteboard interaktif, anotasi, integrasi media, serta pemeliharaan perangkat di kelas.',
        kebijakan: 'Kebijakan Digitalisasi Pembelajaran Kemendikdasmen, tata kelola bantuan perangkat TIK/PID & BAST, keamanan data, literasi digital, dan etika pemanfaatan TIK di satuan pendidikan.',
        lms: 'Alur belajar di LMS PAMANDAI EDU (asesmen awal, penempatan level 1-4, materi opsional di bawah level penempatan, kuis materi, tugas praktik, evaluasi akhir, dan sertifikat).',
      };
      const topicFocus = topicMap[String(body.topic || 'semua')] || topicMap.semua;

      const ctx = body.context || {};
      const materialsBlock =
        Array.isArray(ctx.materials) && ctx.materials.length > 0
          ? ctx.materials
              .slice(0, 18)
              .map(
                (m, i) =>
                  `${i + 1}. [Level ${Number(m.levelNumber) || 1}] ${String(m.title || '').slice(0, 140)}${
                    m.description ? ` — ${String(m.description).slice(0, 180)}` : ''
                  }`,
              )
              .join('\n')
          : 'Belum ada daftar materi spesifik yang dilampirkan.';

      const systemInstruction = [
        'Anda adalah Asisten QnA resmi PAMANDAI EDU yang ditautkan dengan Gemini AI untuk membantu peserta, fasilitator, panitia/admin, dan supervisor pelatihan.',
        'Fokus utama Anda adalah menjawab pertanyaan secara akurat, praktis, dan terstruktur mengenai:',
        '1. Materi Digitalisasi Pembelajaran: strategi pembelajaran digital, Kurikulum Merdeka & Pembelajaran Mendalam (Deep Learning), desain asesmen digital, kolaborasi & karya digital peserta didik.',
        '2. Model Adaptif 4 Level SAMR: Level 1 Substitution (Penggantian), Level 2 Augmentation (Peningkatan), Level 3 Modification (Modifikasi), dan Level 4 Redefinition (Redefinisi), termasuk contoh penerapan nyata di kelas.',
        '3. Pemanfaatan Papan Interaktif Digital (PID / Interactive Flat Panel / IFP): operasional dasar, anotasi, screen mirroring, integrasi konten interaktif, perawatan, dan troubleshooting ringan di satuan pendidikan.',
        '4. Kebijakan Pendidikan terkait Digitalisasi Pembelajaran: kebijakan transformasi digital Kemendikdasmen, tata kelola dan pemanfaatan bantuan perangkat TIK/PID sekolah (termasuk prinsip BAST, pencatatan aset/inventaris sekolah, pemanfaatan optimal untuk pembelajaran), literasi digital, perlindungan data pribadi peserta didik, dan etika pemanfaatan AI/TIK di sekolah.',
        '5. Alur LMS PAMANDAI EDU: peserta mengerjakan Asesmen Awal untuk pemetaan level SAMR (0-40% Level 1, 41-60% Level 2, 61-80% Level 3, 81-100% Level 4). Peserta yang ditempatkan di Level 2/3/4 langsung mengakses dan menyelesaikan mulai dari level penempatannya hingga Level 4, sementara materi di level bawah tetap terbuka sebagai referensi dan tidak wajib diselesaikan. Setiap selesai mempelajari materi tersedia kuis materi, serta evaluasi akhir setelah materi level selesai.',
        '',
        `Fokus topik sesi saat ini: ${topicFocus}`,
        ctx.trainingName
          ? `Konteks kegiatan aktif pengguna: ${ctx.trainingCode ? `[${ctx.trainingCode}] ` : ''}${ctx.trainingName}`
          : 'Konteks kegiatan aktif: Umum (Digitalisasi Pembelajaran).',
        ctx.userRole ? `Peran pengguna di LMS: ${ctx.userRole}` : '',
        ctx.levelSummary ? `Status penempatan/progres pengguna: ${ctx.levelSummary}` : '',
        `Daftar materi pada kegiatan yang dipilih:\n${materialsBlock}`,
        '',
        'Pedoman jawaban:',
        '- Jawab dalam Bahasa Indonesia yang jelas, ramah, profesional, dan langsung bisa dipraktikkan oleh pendidik/tenaga kependidikan.',
        '- Gunakan struktur yang rapi (paragraf ringkas, poin-poin bernomor/bullet, atau langkah praktis bila relevan).',
        '- JANGAN mengarang nomor peraturan/undang-undang/Permendikdasmen tertentu apabila tidak 100% yakin; jelaskan prinsip kebijakannya secara akurat dan sarankan verifikasi nomor regulasi terbaru melalui laman JDIH Kemendikdasmen bila pengguna memerlukan nomor pasal resmi.',
        '- Jika pertanyaan berada di luar lingkup Digitalisasi Pembelajaran, pendidikan, atau kebijakan terkait, sampaikan dengan sopan dan arahkan kembali ke topik pelatihan serta kebijakan digitalisasi pembelajaran.',
      ]
        .filter(Boolean)
        .join('\n');

      const sanitizedHistory = Array.isArray(body.history)
        ? body.history
            .filter(
              (item) =>
                item &&
                (item.role === 'user' || item.role === 'model') &&
                typeof item.text === 'string' &&
                item.text.trim().length > 0,
            )
            .slice(-12)
            .map((item) => ({
              role: item.role as 'user' | 'model',
              parts: [{ text: item.text!.trim().slice(0, 3000) }],
            }))
        : [];

      const contents = [
        ...sanitizedHistory,
        {
          role: 'user' as const,
          parts: [{ text: userMessage }],
        },
      ];

      const modelPlans: Array<{
        model: string;
        attempts: number;
        thinkingConfig?: { thinkingLevel: ThinkingLevel };
      }> = [
        {
          model: 'gemini-4-hydrogen',
          attempts: 2,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
        {
          model: 'gemini-3.1-flash-lite',
          attempts: 2,
        },
      ];

      let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
      let modelUsed = '';
      let lastError: unknown = null;

      for (const plan of modelPlans) {
        for (let attempt = 1; attempt <= plan.attempts; attempt++) {
          try {
            response = await ai.models.generateContent({
              model: plan.model,
              contents,
              config: {
                systemInstruction,
                ...(plan.thinkingConfig ? { thinkingConfig: plan.thinkingConfig } : {}),
              },
            });
            modelUsed = plan.model;
            break;
          } catch (err) {
            lastError = err;
            const errMsg = err instanceof Error ? err.message : String(err);
            const transient = isTransientGeminiError(errMsg);
            console.warn(
              `[api/gemini/qna-chat] Model ${plan.model} percobaan ${attempt}/${plan.attempts} gagal: ${errMsg.slice(0, 200)}`,
            );
            if (!transient) {
              throw err;
            }
            if (attempt < plan.attempts) {
              await sleep(800 * attempt);
            }
          }
        }
        if (response) break;
        await sleep(400);
      }

      if (!response) {
        throw lastError instanceof Error
          ? lastError
          : new Error('503 UNAVAILABLE: Layanan Gemini AI sedang mengalami lonjakan trafik.');
      }

      const replyText = (response.text ?? '').trim();
      if (!replyText) {
        res.status(502).json({
          error: 'Gemini AI tidak mengembalikan jawaban. Silakan kirim ulang pertanyaan Anda.',
        });
        return;
      }

      res.json({
        ok: true,
        reply: replyText,
        modelUsed,
      });
    } catch (err: unknown) {
      const rawMessage =
        err instanceof Error ? err.message : 'Terjadi kendala saat menghubungi layanan Gemini AI.';
      const lower = rawMessage.toLowerCase();
      let status = 500;
      let message = `Gagal memproses pertanyaan di Gemini AI saat ini: ${rawMessage.slice(0, 220)}`;
      if (rawMessage.includes('GEMINI_API_KEY')) {
        status = 500;
        message = rawMessage;
      } else if (
        lower.includes('503') ||
        lower.includes('unavailable') ||
        lower.includes('high demand') ||
        lower.includes('overloaded')
      ) {
        status = 503;
        message =
          'Layanan Gemini AI sedang mengalami lonjakan trafik sementara (503). Silakan tunggu beberapa detik lalu coba kirim ulang pertanyaan Anda.';
      } else if (
        lower.includes('429') ||
        lower.includes('resource_exhausted') ||
        lower.includes('quota')
      ) {
        status = 429;
        message =
          'Batas permintaan Gemini AI sementara tercapai (429). Silakan tunggu sebentar lalu kirim ulang pertanyaan Anda.';
      } else if (lower.includes('403') || lower.includes('permission_denied')) {
        status = 403;
        message = 'Akses ke layanan Gemini AI ditolak (403). Periksa konfigurasi API key pada server.';
      }
      console.error('[api/gemini/qna-chat] Error:', rawMessage);
      res.status(status).json({ error: message });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('/{*splat}', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PAMANDAI EDU] Server berjalan pada http://0.0.0.0:${PORT}`);
  });
}

void startServer();
