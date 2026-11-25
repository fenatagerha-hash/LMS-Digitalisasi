import React, { useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  FileUp,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { useLms } from '../context/LmsContext';
import { isInternalMaterialUrl, uploadMaterialFilePersistent } from '../lib/materialFileStorage';
import {
  AnswerKeyEntry,
  LearningLevel,
  LearningMaterial,
  MaterialContentType,
  QuestionBank,
  QuestionItem,
  TrainingProgram,
} from '../types/lms';

const CONTENT_TYPE_LABELS: Record<MaterialContentType, string> = {
  teks: 'Materi Teks / Bacaan',
  pdf: 'Dokumen PDF',
  ppt: 'Slide Presentasi (PPT / PPTX)',
  gambar: 'Gambar / Infografis',
  video: 'Video Pembelajaran',
  youtube: 'YouTube Embed',
  tautan: 'Tautan Eksternal',
  interaktif: 'Materi Interaktif URL',
};

interface GeneratedQuestionRaw {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface GenerateApiResult {
  ok: boolean;
  modelUsed?: string;
  summary: string;
  assessmentQuestions: GeneratedQuestionRaw[];
  quizQuestions: GeneratedQuestionRaw[];
  evaluationQuestions: GeneratedQuestionRaw[];
  error?: string;
}

interface MaterialUploadModalProps {
  open: boolean;
  onClose: () => void;
  training: TrainingProgram;
  level: LearningLevel;
  usesSamr: boolean;
  existingMaterialsCount: number;
  editingMaterial?: LearningMaterial | null;
  onGeneratedSuccess?: (info: {
    assessmentCount: number;
    quizCount: number;
    evalCount: number;
    summary: string;
  }) => void;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas yang dipilih.'));
    reader.readAsDataURL(file);
  });
}

function buildQuestionItems(
  rawList: GeneratedQuestionRaw[],
  prefix: string,
): { items: QuestionItem[]; keys: AnswerKeyEntry[] } {
  const ts = Date.now().toString(36);
  const weight = rawList.length > 0 ? Math.round(100 / rawList.length) : 20;
  const items: QuestionItem[] = [];
  const keys: AnswerKeyEntry[] = [];

  rawList.forEach((raw, idx) => {
    const qId = `${prefix}_${ts}_${idx + 1}`;
    const optLetters = ['a', 'b', 'c', 'd'];
    const options = raw.options.slice(0, 4).map((text, optIdx) => ({
      id: `${qId}_${optLetters[optIdx] || optIdx}`,
      text,
    }));
    const safeCorrectIdx = Math.max(0, Math.min(options.length - 1, raw.correctIndex || 0));
    const correctOptId = options[safeCorrectIdx]?.id || options[0].id;

    items.push({
      id: qId,
      type: 'pilihan_ganda',
      prompt: raw.prompt,
      weight,
      options,
    });
    keys.push({
      questionId: qId,
      correctOptionIds: [correctOptId],
      acceptedTextAnswers: [],
      explanation: raw.explanation,
    });
  });

  return { items, keys };
}

export function MaterialUploadModal({
  open,
  onClose,
  training,
  level,
  usesSamr,
  existingMaterialsCount,
  editingMaterial,
  onGeneratedSuccess,
}: MaterialUploadModalProps) {
  const { questionBanks, answerKeys, saveMaterial, saveQuestionBank, showToast } = useLms();

  const [savedMaterial, setSavedMaterial] = useState<LearningMaterial | null>(
    editingMaterial || null,
  );
  const [addedInSession, setAddedInSession] = useState(0);

  const [title, setTitle] = useState(editingMaterial?.title || '');
  const [description, setDescription] = useState(editingMaterial?.description || '');
  const [contentType, setContentType] = useState<MaterialContentType>(
    editingMaterial?.contentType || 'pdf',
  );
  const [contentBody, setContentBody] = useState(editingMaterial?.contentBody || '');
  const [fileUrl, setFileUrl] = useState(editingMaterial?.fileUrl || '');
  const [fileName, setFileName] = useState(editingMaterial?.fileName || '');
  const [orderIndex, setOrderIndex] = useState(
    editingMaterial?.orderIndex || existingMaterialsCount + 1,
  );
  const [durationMinutes, setDurationMinutes] = useState(editingMaterial?.durationMinutes || 25);
  const [isMandatory, setIsMandatory] = useState(editingMaterial?.isMandatory ?? true);
  const [allowDownload, setAllowDownload] = useState(editingMaterial?.allowDownload ?? true);
  const [isPrivateBucket, setIsPrivateBucket] = useState(
    editingMaterial?.isPrivateBucket ?? true,
  );

  // Uploaded binary payload for server-side Gemini extraction
  const [uploadedBase64, setUploadedBase64] = useState('');
  const [uploadedMimeType, setUploadedMimeType] = useState('');

  // Auto-generate Asesmen Awal, Kuis per Materi & Evaluasi Akhir Keseluruhan
  const [autoGenerateQuestions, setAutoGenerateQuestions] = useState(true);
  const [assessmentCount, setAssessmentCount] = useState(4);
  const [quizCount, setQuizCount] = useState(5);
  const [evaluationCount, setEvaluationCount] = useState(4);
  const [mergeMode, setMergeMode] = useState<'replace' | 'append'>(
    existingMaterialsCount > 0 ? 'append' : 'replace',
  );

  const [submitting, setSubmitting] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadProgressPct, setUploadProgressPct] = useState(0);
  const [statusStep, setStatusStep] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedPreview, setGeneratedPreview] = useState<GenerateApiResult | null>(null);

  if (!open) return null;

  const resetForNextMaterial = () => {
    const nextIdx = existingMaterialsCount + addedInSession + 1;
    setSavedMaterial(null);
    setTitle('');
    setDescription('');
    setContentType('pdf');
    setContentBody('');
    setFileUrl('');
    setFileName('');
    setUploadedBase64('');
    setUploadedMimeType('');
    setOrderIndex(nextIdx);
    setDurationMinutes(25);
    setMergeMode('append');
    setErrorMsg('');
    setStatusStep('');
    setGeneratedPreview(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');

    setFileName(file.name);
    setIsPrivateBucket(true);

    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
    }

    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith('.pdf')) setContentType('pdf');
    else if (lowerName.endsWith('.ppt') || lowerName.endsWith('.pptx')) setContentType('ppt');
    else if (lowerName.match(/\.(png|jpg|jpeg|webp)$/)) setContentType('gambar');
    else if (lowerName.endsWith('.mp4') || lowerName.endsWith('.webm')) setContentType('video');
    else if (lowerName.endsWith('.txt') || lowerName.endsWith('.md') || lowerName.endsWith('.csv')) {
      setContentType('teks');
    }

    if (file.size > 18 * 1024 * 1024) {
      setUploadedBase64('');
      setUploadedMimeType('');
      setFileUrl('');
      setErrorMsg(
        'Ukuran berkas melebihi 18 MB. Kompres berkas atau gunakan kolom URL Eksternal (Google Drive / YouTube).',
      );
      return;
    }

    setFileUploading(true);
    setUploadProgressPct(5);
    try {
      const uploadRes = await uploadMaterialFilePersistent(file, (pct, label) => {
        setUploadProgressPct(pct);
        setStatusStep(label);
      });

      if (!uploadRes.ok || !uploadRes.fileUrl) {
        setFileUrl('');
        setUploadedBase64('');
        const errText =
          uploadRes.error ||
          'Berkas gagal diunggah permanen. Coba ulangi atau gunakan tautan Google Drive.';
        setErrorMsg(errText);
        showToast('error', errText);
        return;
      }

      setFileUrl(uploadRes.fileUrl);
      setUploadedMimeType(uploadRes.mimeType);

      if (file.size <= 12 * 1024 * 1024) {
        try {
          const base64 = await readFileAsBase64(file);
          setUploadedBase64(base64);
        } catch {
          setUploadedBase64('');
        }
      } else {
        setUploadedBase64('');
      }

      // Isi pratinjau teks otomatis untuk berkas .txt / .md / .csv
      if (
        file.type.startsWith('text/') ||
        lowerName.endsWith('.txt') ||
        lowerName.endsWith('.md') ||
        lowerName.endsWith('.csv')
      ) {
        try {
          const text = await file.text();
          if (!contentBody.trim()) {
            setContentBody(text.slice(0, 12000));
          }
        } catch {
          // Abaikan jika gagal membaca sebagai teks
        }
      }

      showToast(
        'success',
        uploadRes.storedInCloud
          ? `Berkas "${file.name}" tersimpan permanen di Cloud Database dan siap dibuka peserta.`
          : `Berkas "${file.name}" berhasil diunggah dan siap dibuka peserta.`,
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Terjadi kendala saat mengunggah berkas materi.';
      setFileUrl('');
      setErrorMsg(msg);
      showToast('error', msg);
    } finally {
      setFileUploading(false);
      setUploadProgressPct(0);
      setStatusStep('');
    }
  };

  const upsertBankQuestions = async (
    kind: 'assessment' | 'quiz' | 'evaluation',
    rawQuestions: GeneratedQuestionRaw[],
    targetMaterial: LearningMaterial,
  ) => {
    const targetLevelNum = kind === 'assessment' ? 0 : level.levelNumber;

    // Untuk kuis: selalu terikat khusus pada 1 materi (materialId) agar peserta mendapat kuis khusus setiap selesai 1 materi
    const existingBank = questionBanks.find((b) => {
      if (kind === 'assessment') {
        return b.trainingId === training.id && b.kind === 'assessment';
      }
      if (kind === 'quiz') {
        return (
          b.trainingId === training.id &&
          b.kind === 'quiz' &&
          b.materialId === targetMaterial.id
        );
      }
      return (
        b.trainingId === training.id &&
        b.levelNumber === level.levelNumber &&
        b.kind === 'evaluation'
      );
    });
    const existingKey = existingBank
      ? answerKeys.find((a) => a.id === existingBank.id)
      : undefined;

    const prefix =
      kind === 'assessment' ? 'as_auto' : kind === 'quiz' ? 'qz_mat' : 'ev_auto';
    const { items: newItems, keys: newKeys } = buildQuestionItems(rawQuestions, prefix);

    // Kuis per materi mengganti/memperbarui kuis materi tersebut; Asesmen & Evaluasi Keseluruhan mengikuti mergeMode
    const shouldAppend = kind !== 'quiz' && mergeMode === 'append' && Boolean(existingBank);
    const combinedQuestions =
      shouldAppend && existingBank
        ? [...existingBank.questions, ...newItems].slice(0, 40)
        : newItems;
    const combinedAnswers =
      shouldAppend && existingKey
        ? [...existingKey.answers, ...newKeys].slice(0, 40)
        : newKeys;

    const nowIso = new Date().toISOString();
    const safeMatSuffix = targetMaterial.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(-18);
    const bankId =
      existingBank?.id ||
      (kind === 'quiz'
        ? `qb_${training.id.slice(0, 10)}_quiz_${safeMatSuffix}`
        : `qb_${training.id.slice(0, 10)}_${kind}_L${targetLevelNum}_${Date.now().toString(36)}`);

    const generatedTitle =
      kind === 'assessment'
        ? usesSamr
          ? `Asesmen Awal Kompetensi SAMR — ${training.code}`
          : `Asesmen Awal — ${training.name}`
        : kind === 'quiz'
          ? `Kuis: ${targetMaterial.title}`
          : usesSamr
            ? `Evaluasi Akhir — Level ${level.levelNumber}`
            : `Evaluasi Akhir Keseluruhan — ${training.code}`;

    const kindDescLabel =
      kind === 'assessment'
        ? 'asesmen awal (pretest)'
        : kind === 'quiz'
          ? `kuis pemahaman khusus setelah mempelajari materi "${targetMaterial.title}"`
          : 'evaluasi akhir keseluruhan materi kegiatan';

    const nextBank: QuestionBank = existingBank
      ? {
          ...existingBank,
          title: kind === 'quiz' ? generatedTitle.slice(0, 200) : existingBank.title,
          ...(kind === 'quiz' ? { materialId: targetMaterial.id } : {}),
          questions: combinedQuestions,
          updatedAt: nowIso,
        }
      : {
          id: bankId,
          trainingId: training.id,
          levelNumber: targetLevelNum,
          ...(kind === 'quiz' ? { materialId: targetMaterial.id } : {}),
          kind,
          title: generatedTitle.slice(0, 200),
          description: `Soal ${kindDescLabel} yang disusun otomatis dari materi "${targetMaterial.title}".`.slice(
            0,
            1000,
          ),
          durationMinutes: kind === 'evaluation' ? 35 : 20,
          maxAttempts: kind === 'quiz' ? 3 : 2,
          passingScore:
            kind === 'assessment'
              ? 0
              : kind === 'quiz'
                ? level.minQuizScore
                : level.minEvaluationScore,
          shuffleQuestions: true,
          showExplanation: true,
          isActive: true,
          questions: combinedQuestions,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

    await saveQuestionBank(nextBank, combinedAnswers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      setStatusStep(
        savedMaterial
          ? 'Memperbarui data materi pembelajaran...'
          : 'Menyimpan materi pembelajaran...',
      );
      const matRes = await saveMaterial({
        id: savedMaterial?.id || editingMaterial?.id,
        trainingId: training.id,
        levelId: level.id,
        levelNumber: level.levelNumber,
        title: title.trim(),
        description: description.trim(),
        contentType,
        contentBody: contentBody.trim(),
        fileUrl: fileUrl.trim(),
        fileName: fileName.trim(),
        orderIndex,
        durationMinutes,
        isMandatory,
        isActive: true,
        allowDownload,
        isPrivateBucket,
      });

      if (!matRes.ok || !matRes.data) {
        setErrorMsg(matRes.message || 'Gagal menyimpan materi.');
        setSubmitting(false);
        return;
      }

      const persistedMaterial = matRes.data as LearningMaterial;
      const wasNew = !savedMaterial && !editingMaterial;
      setSavedMaterial(persistedMaterial);
      if (wasNew) {
        setAddedInSession((c) => c + 1);
      }

      if (!autoGenerateQuestions) {
        setSubmitting(false);
        onClose();
        return;
      }

      setStatusStep(
        'Menganalisis materi & menyusun soal Asesmen Awal, Kuis Materi Ini, serta Evaluasi Akhir Keseluruhan...',
      );

      const response = await fetch('/api/gemini/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: persistedMaterial.title,
          description: persistedMaterial.description,
          contentBody: persistedMaterial.contentBody,
          fileName: persistedMaterial.fileName,
          fileUrl: persistedMaterial.fileUrl,
          mimeType: uploadedMimeType,
          fileBase64: uploadedBase64,
          trainingName: training.name,
          levelLabel: usesSamr ? level.title : `Modul Kegiatan ${training.code}`,
          usesSamr,
          assessmentCount,
          quizCount,
          evaluationCount,
        }),
      });

      let payload: GenerateApiResult;
      try {
        payload = (await response.json()) as GenerateApiResult;
      } catch {
        payload = {
          ok: false,
          summary: '',
          assessmentQuestions: [],
          quizQuestions: [],
          evaluationQuestions: [],
          error:
            'Layanan penyusun soal sedang sibuk sementara. Materi Anda sudah tersimpan — silakan klik "Coba Buat Soal Lagi".',
        };
      }

      if (!response.ok || !payload.ok) {
        setErrorMsg(
          payload.error ||
            'Materi sudah tersimpan dengan aman, namun penyusunan soal otomatis sedang mengalami gangguan sementara. Silakan klik "Coba Buat Soal Lagi".',
        );
        setSubmitting(false);
        return;
      }

      setStatusStep('Menyimpan Kuis Materi, Asesmen Awal & Evaluasi Akhir ke sistem...');
      const generatedAssess = Array.isArray(payload.assessmentQuestions)
        ? payload.assessmentQuestions
        : [];
      const generatedQuiz = Array.isArray(payload.quizQuestions) ? payload.quizQuestions : [];
      const generatedEval = Array.isArray(payload.evaluationQuestions)
        ? payload.evaluationQuestions
        : [];

      if (generatedAssess.length > 0) {
        await upsertBankQuestions('assessment', generatedAssess, persistedMaterial);
      }
      if (generatedQuiz.length > 0) {
        await upsertBankQuestions('quiz', generatedQuiz, persistedMaterial);
      }
      if (generatedEval.length > 0) {
        await upsertBankQuestions('evaluation', generatedEval, persistedMaterial);
      }

      setGeneratedPreview({
        ...payload,
        assessmentQuestions: generatedAssess,
        quizQuestions: generatedQuiz,
        evaluationQuestions: generatedEval,
      });
      onGeneratedSuccess?.({
        assessmentCount: generatedAssess.length,
        quizCount: generatedQuiz.length,
        evalCount: generatedEval.length,
        summary: payload.summary,
      });
      showToast(
        'success',
        `Materi disimpan! ${generatedQuiz.length} soal Kuis Materi, ${generatedAssess.length} soal Asesmen Awal, dan ${generatedEval.length} soal Evaluasi Akhir berhasil dibuat.`,
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal menghubungi layanan penyusun soal otomatis. Silakan coba lagi.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
      setStatusStep('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#dee2e6] rounded-xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="px-6 py-4 border-b border-[#e9ecef] flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-bold text-[#212529] flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-[#0f6cbf]" />
              {editingMaterial
                ? 'Ubah Materi Pembelajaran'
                : `Input Materi #${orderIndex} & Buat Soal Otomatis`}
            </h2>
            <p className="text-xs text-[#6c757d] mt-0.5">
              {usesSamr
                ? `${training.code} · Level ${level.levelNumber} · 1 kegiatan dapat memiliki banyak materi`
                : `${training.code} · Eksplorasi Materi Kegiatan · 1 kegiatan dapat memiliki banyak materi`}
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Tutup modal"
            className="text-[#6c757d] hover:text-[#212529] p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {generatedPreview ? (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-xl bg-[#d1e7dd] border border-[#a3cfbb] text-[#0f5132] flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm">
                  Materi &quot;{savedMaterial?.title || title}&quot; tersimpan bersama Kuis Materi, Asesmen Awal, dan Evaluasi Akhir!
                </p>
                {generatedPreview.summary && (
                  <p className="leading-relaxed">{generatedPreview.summary}</p>
                )}
              </div>
            </div>

            {generatedPreview.assessmentQuestions.length > 0 && (
              <div className="border border-[#b6d4fe] rounded-xl p-4 space-y-2.5 bg-[#e7f1fa]/50">
                <p className="text-xs font-bold text-[#0b5394]">
                  Soal Asesmen Awal / Pretest ({generatedPreview.assessmentQuestions.length} butir)
                </p>
                <ol className="space-y-2 text-xs text-[#212529] list-decimal pl-4">
                  {generatedPreview.assessmentQuestions.map((q, i) => (
                    <li key={i} className="leading-snug">
                      {q.prompt}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-[#dee2e6] rounded-xl p-4 space-y-2.5 bg-[#f8f9fa]">
                <p className="text-xs font-bold text-[#0f6cbf]">
                  Kuis Khusus Materi Ini ({generatedPreview.quizQuestions.length} butir)
                </p>
                <p className="text-[11px] text-[#6c757d]">
                  Otomatis tampil kepada peserta tepat setelah selesai mempelajari materi ini.
                </p>
                <ol className="space-y-2 text-xs text-[#212529] list-decimal pl-4">
                  {generatedPreview.quizQuestions.map((q, i) => (
                    <li key={i} className="leading-snug">
                      {q.prompt}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="border border-[#dee2e6] rounded-xl p-4 space-y-2.5 bg-[#f8f9fa]">
                <p className="text-xs font-bold text-[#198754]">
                  Evaluasi Akhir Keseluruhan ({generatedPreview.evaluationQuestions.length} butir)
                </p>
                <p className="text-[11px] text-[#6c757d]">
                  Terbuka bagi peserta setelah menyelesaikan seluruh materi kegiatan.
                </p>
                <ol className="space-y-2 text-xs text-[#212529] list-decimal pl-4">
                  {generatedPreview.evaluationQuestions.map((q, i) => (
                    <li key={i} className="leading-snug">
                      {q.prompt}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-[#e9ecef]">
              {!editingMaterial ? (
                <button
                  type="button"
                  onClick={resetForNextMaterial}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#0f6cbf] bg-[#e7f1fa] hover:bg-[#d5e7f7] border border-[#b6d4fe] rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Materi Berikutnya
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg"
              >
                Selesai & Lihat di LMS
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#212529] mb-1">
                  Judul Materi
                </label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Materi 1 — Pengenalan Konsep & Praktik Utama"
                  className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#212529] mb-1">
                  Jenis Konten
                </label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as MaterialContentType)}
                  className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg bg-white"
                >
                  {Object.entries(CONTENT_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#212529] mb-1">
                Deskripsi Singkat
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ringkasan capaian yang dipelajari peserta dari materi ini"
                className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg"
              />
            </div>

            {/* Unggah Berkas Materi */}
            <div className="p-4 rounded-xl bg-[#f8f9fa] border border-dashed border-[#0f6cbf]/50 space-y-2.5">
              <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#0f6cbf]">
                <span className="flex items-center gap-2">
                  <FileUp className="w-4 h-4" />
                  Unggah Berkas Materi (PDF, PPT/PPTX, DOC/DOCX, TXT/MD, Gambar, Video)
                </span>
                <span className="text-[11px] font-normal text-[#6c757d]">Maks. 10 MB Cloud</span>
              </div>
              <input
                type="file"
                disabled={fileUploading || submitting}
                accept=".pdf,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.ppt,.pptx,.doc,.docx,.mp4,.webm"
                onChange={(e) => void handleFileChange(e)}
                className="w-full text-xs text-[#495057] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[#0f6cbf] file:text-white file:font-semibold hover:file:bg-[#0b5394] disabled:opacity-60"
              />
              {fileUploading && (
                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-[#dee2e6] overflow-hidden">
                    <div
                      className="h-full bg-[#0f6cbf] transition-all duration-200"
                      style={{ width: `${Math.max(8, uploadProgressPct)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#0b5394] font-medium flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {statusStep || 'Mengunggah berkas permanen...'} ({uploadProgressPct}%)
                  </p>
                </div>
              )}
              {!fileUploading && fileName && fileUrl && !fileUrl.startsWith('blob:') && (
                <p className="text-[11px] text-[#0f5132] bg-[#d1e7dd]/70 border border-[#a3cfbb] rounded-md px-2.5 py-1.5 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Berkas tersimpan permanen: <span className="font-mono">{fileName}</span>
                    {uploadedBase64 ? ' · Siap dibaca untuk soal otomatis.' : ''}
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#212529] mb-1">
                Isi Materi / Teks Modul (digunakan juga sebagai sumber soal otomatis)
              </label>
              <textarea
                rows={4}
                value={contentBody}
                onChange={(e) => setContentBody(e.target.value)}
                placeholder="Tempelkan poin-poin inti materi, transkrip, atau penjelasan pembelajaran di sini..."
                className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-[#212529] mb-1">
                  URL Eksternal (Opsional)
                </label>
                <input
                  type="text"
                  value={isInternalMaterialUrl(fileUrl) ? '' : fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/... (opsional)"
                  className="w-full px-3 py-2 text-sm border border-[#ced4da] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#212529] mb-1">Urutan</label>
                <input
                  type="number"
                  min={1}
                  value={orderIndex}
                  onChange={(e) => setOrderIndex(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono border border-[#ced4da] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#212529] mb-1">
                  Durasi (menit)
                </label>
                <input
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono border border-[#ced4da] rounded-lg"
                />
              </div>
            </div>

            {/* Kotak Pembuatan Soal Asesmen Awal, Kuis per Materi & Evaluasi Akhir Otomatis */}
            <div className="p-4 rounded-xl bg-[#e7f1fa]/70 border border-[#b6d4fe] space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoGenerateQuestions}
                  onChange={(e) => setAutoGenerateQuestions(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#0f6cbf]"
                />
                <div>
                  <span className="text-xs font-bold text-[#0b5394] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Buat Kuis Khusus Materi Ini, Asesmen Awal & Evaluasi Akhir otomatis
                  </span>
                  <span className="block text-[11px] text-[#495057] mt-0.5">
                    Setiap materi otomatis memiliki aktivitas Kuis Pemahaman tersendiri setelah selesai dipelajari, dan soal Evaluasi Akhir Keseluruhan diakumulasi untuk seluruh materi kegiatan.
                  </span>
                </div>
              </label>

              {autoGenerateQuestions && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#b6d4fe]/70 text-xs">
                  <div>
                    <label className="block font-semibold text-[#212529] mb-1">
                      Jumlah Soal Asesmen Awal
                    </label>
                    <select
                      value={assessmentCount}
                      onChange={(e) => setAssessmentCount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#ced4da] rounded-lg"
                    >
                      {[0, 3, 4, 5, 6, 8].map((n) => (
                        <option key={n} value={n}>
                          {n === 0 ? 'Lewati Asesmen Awal' : `${n} soal asesmen awal`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#212529] mb-1">
                      Jumlah Soal Kuis Materi Ini
                    </label>
                    <select
                      value={quizCount}
                      onChange={(e) => setQuizCount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#ced4da] rounded-lg"
                    >
                      {[3, 4, 5, 6, 8, 10].map((n) => (
                        <option key={n} value={n}>
                          {n} soal kuis materi ini
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#212529] mb-1">
                      Kontribusi Soal Evaluasi Akhir
                    </label>
                    <select
                      value={evaluationCount}
                      onChange={(e) => setEvaluationCount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#ced4da] rounded-lg"
                    >
                      {[0, 3, 4, 5, 6, 8].map((n) => (
                        <option key={n} value={n}>
                          {n === 0 ? 'Lewati Evaluasi Akhir' : `${n} soal evaluasi keseluruhan`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#212529] mb-1">
                      Mode Asesmen &amp; Evaluasi Akhir
                    </label>
                    <select
                      value={mergeMode}
                      onChange={(e) => setMergeMode(e.target.value as 'replace' | 'append')}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#ced4da] rounded-lg"
                    >
                      <option value="append">Gabungkan dengan soal materi sebelumnya (Disarankan)</option>
                      <option value="replace">Ganti seluruh bank soal dari materi ini</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-[#212529]">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={isMandatory}
                  onChange={(e) => setIsMandatory(e.target.checked)}
                />
                Materi Wajib
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(e) => setAllowDownload(e.target.checked)}
                />
                Izinkan Unduh
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={isPrivateBucket}
                  onChange={(e) => setIsPrivateBucket(e.target.checked)}
                />
                Bucket Privat
              </label>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-1.5">
                {savedMaterial && (
                  <p className="font-bold text-[#0f5132] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Materi &quot;{savedMaterial.title}&quot; sudah tersimpan dengan aman di kegiatan ini.
                  </p>
                )}
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            )}

            {statusStep && (
              <div className="p-3 rounded-lg bg-[#e7f1fa] border border-[#b6d4fe] text-xs text-[#0b5394] flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>{statusStep}</span>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-[#e9ecef]">
              <button
                type="button"
                disabled={submitting || fileUploading}
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#495057] border border-[#ced4da] rounded-lg hover:bg-[#f8f9fa]"
              >
                {savedMaterial ? 'Tutup (Materi Sudah Tersimpan)' : 'Batal'}
              </button>
              <button
                type="submit"
                disabled={submitting || fileUploading}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg disabled:opacity-60"
              >
                {submitting || fileUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : savedMaterial && errorMsg ? (
                  <RefreshCw className="w-3.5 h-3.5" />
                ) : null}
                {fileUploading
                  ? `Menunggu Unggah Berkas (${uploadProgressPct}%)...`
                  : savedMaterial && errorMsg && autoGenerateQuestions
                    ? 'Coba Buat Soal Lagi'
                    : autoGenerateQuestions
                      ? 'Simpan Materi & Buat Soal Otomatis'
                      : 'Simpan Materi'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
