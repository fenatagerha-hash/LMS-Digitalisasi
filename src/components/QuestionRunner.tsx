import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, HelpCircle, Save, Send, XCircle } from 'lucide-react';
import { AttemptRecord, LEVEL_NAMES, QuestionBank, UserAnswerMap } from '../types/lms';
import { useLms } from '../context/LmsContext';

interface Props {
  bank: QuestionBank;
  existingAttempts: AttemptRecord[];
  onCompleted?: () => void;
}

export function QuestionRunner({ bank, existingAttempts, onCompleted }: Props) {
  const { currentUser, effectiveRole, submitBankAttempt, showToast } = useLms();
  const draftKey = `lms_draft_${bank.id}_${currentUser?.uid || 'anon'}`;

  const [started, setStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(bank.durationMinutes * 60);
  const [answers, setAnswers] = useState<UserAnswerMap>(() => {
    try {
      const saved = window.localStorage.getItem(draftKey);
      return saved ? (JSON.parse(saved) as UserAnswerMap) : {};
    } catch {
      return {};
    }
  });
  const answersRef = useRef<UserAnswerMap>(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<{
    attempt: AttemptRecord;
    perQuestionResults: Record<
      string,
      { correct: boolean; earned: number; maxWeight: number; explanation: string; pendingManual: boolean }
    >;
  } | null>(null);

  // Reset saat berpindah instrumen soal
  useEffect(() => {
    setStarted(false);
    setSecondsLeft(bank.durationMinutes * 60);
    setSubmitError(null);
    setLastSubmission(null);
    try {
      const saved = window.localStorage.getItem(draftKey);
      const parsed = saved ? (JSON.parse(saved) as UserAnswerMap) : {};
      setAnswers(parsed);
      answersRef.current = parsed;
    } catch {
      setAnswers({});
      answersRef.current = {};
    }
  }, [bank.id, bank.durationMinutes, draftKey]);

  const displayQuestions = useMemo(() => {
    if (!bank.shuffleQuestions) return bank.questions;
    return [...bank.questions].sort((a, b) => a.id.localeCompare(b.id));
  }, [bank.questions, bank.shuffleQuestions]);

  const answeredCount = useMemo(() => {
    return displayQuestions.filter((q) => {
      const a = answers[q.id];
      if (!a) return false;
      if (q.type === 'isian_singkat') return Boolean(a.textAnswer && a.textAnswer.trim().length > 0);
      return Boolean(a.selectedOptionIds && a.selectedOptionIds.length > 0);
    }).length;
  }, [displayQuestions, answers]);

  const isStaffPreview =
    effectiveRole === 'super_admin' ||
    effectiveRole === 'admin_kegiatan' ||
    effectiveRole === 'fasilitator';
  const attemptsRemaining = isStaffPreview
    ? Math.max(1, bank.maxAttempts - existingAttempts.length)
    : Math.max(0, bank.maxAttempts - existingAttempts.length);

  // Timer hitung mundur
  useEffect(() => {
    if (!started || submitting) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          void handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [started, submitting]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSaveDraft = () => {
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(answers));
      showToast('info', 'Jawaban sementara berhasil disimpan.');
    } catch {
      showToast('error', 'Gagal menyimpan draf jawaban.');
    }
  };

  const setSingleOption = (qId: string, optId: string) => {
    setSubmitError(null);
    setAnswers((prev) => ({ ...prev, [qId]: { selectedOptionIds: [optId] } }));
  };

  const toggleMultiOption = (qId: string, optId: string) => {
    setSubmitError(null);
    setAnswers((prev) => {
      const curr = prev[qId]?.selectedOptionIds || [];
      const next = curr.includes(optId) ? curr.filter((x) => x !== optId) : [...curr, optId];
      return { ...prev, [qId]: { selectedOptionIds: next } };
    });
  };

  const setTextAnswer = (qId: string, text: string) => {
    setSubmitError(null);
    setAnswers((prev) => ({ ...prev, [qId]: { textAnswer: text } }));
  };

  const handleSubmit = async (autoTimeout = false) => {
    if (submitting) return;
    setSubmitError(null);

    const latestAnswers = answersRef.current;
    if (!autoTimeout && displayQuestions.length > 0) {
      const countAnswered = displayQuestions.filter((q) => {
        const a = latestAnswers[q.id];
        if (!a) return false;
        if (q.type === 'isian_singkat') return Boolean(a.textAnswer && a.textAnswer.trim().length > 0);
        return Boolean(a.selectedOptionIds && a.selectedOptionIds.length > 0);
      }).length;
      if (countAnswered === 0) {
        const msg = 'Pilih atau isi minimal satu jawaban terlebih dahulu sebelum menekan Kirim Jawaban.';
        setSubmitError(msg);
        showToast('error', msg);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await submitBankAttempt({ bank, answers: latestAnswers });
      if (res.ok && res.data && typeof res.data === 'object') {
        const payload = res.data as {
          attempt: AttemptRecord;
          perQuestionResults: Record<
            string,
            {
              correct: boolean;
              earned: number;
              maxWeight: number;
              explanation: string;
              pendingManual: boolean;
            }
          >;
        };
        setLastSubmission(payload);
        setStarted(false);
        setSubmitError(null);
        try {
          window.localStorage.removeItem(draftKey);
        } catch {
          // Abaikan bila localStorage terbatas
        }
        if (autoTimeout) {
          showToast('info', 'Waktu habis — jawaban Anda telah dikirim otomatis.');
        }
        onCompleted?.();
      } else {
        const errMsg =
          res.message || 'Jawaban gagal dikirim. Pastikan koneksi stabil lalu coba klik Kirim Jawaban kembali.';
        setSubmitError(errMsg);
        showToast('error', errMsg);
      }
    } catch (err) {
      const errMsg =
        err instanceof Error
          ? `Terjadi kendala saat mengirim jawaban: ${err.message}`
          : 'Terjadi kendala saat mengirim jawaban. Silakan coba lagi.';
      setSubmitError(errMsg);
      showToast('error', errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header info instrumen */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500">
              {bank.kind === 'assessment'
                ? 'Asesmen Awal Penempatan'
                : bank.kind === 'quiz'
                  ? `Kuis Level ${bank.levelNumber}`
                  : `Evaluasi Akhir Level ${bank.levelNumber}`}
              {' · '}
              {bank.questions.length} soal · Durasi {bank.durationMinutes} menit · Maks. {bank.maxAttempts} percobaan
              {bank.passingScore > 0 ? ` · Nilai minimum ${bank.passingScore}` : ''}
            </p>
            <h3 className="text-lg font-bold text-slate-900 mt-1">{bank.title}</h3>
            <p className="text-xs text-slate-600 mt-1">{bank.description}</p>
          </div>

          {started ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 text-white font-mono text-sm tabular-nums">
              <Clock className="w-4 h-4 text-amber-400" />
              {formatTimer(secondsLeft)}
            </div>
          ) : (
            <button
              type="button"
              disabled={attemptsRemaining <= 0}
              onClick={() => {
                setSecondsLeft(bank.durationMinutes * 60);
                setLastSubmission(null);
                setSubmitError(null);
                setStarted(true);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg transition-colors whitespace-nowrap disabled:opacity-40"
            >
              {attemptsRemaining <= 0
                ? 'Batas Percobaan Tercapai'
                : existingAttempts.length > 0
                  ? `Mulai Percobaan Ke-${existingAttempts.length + 1}`
                  : 'Mulai Mengerjakan'}
            </button>
          )}
        </div>
      </div>

      {/* Mode pengerjaan aktif */}
      {started && (
        <div className="space-y-4">
          {displayQuestions.map((q, idx) => {
            const ans = answers[q.id] || {};
            return (
              <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                    <span className="font-mono text-slate-500 mr-2">{idx + 1}.</span>
                    {q.prompt}
                  </p>
                  <span className="text-xs font-mono text-slate-500 whitespace-nowrap">
                    Bobot {q.weight}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500">
                  {q.type === 'pilihan_ganda' && 'Pilih satu jawaban paling tepat'}
                  {q.type === 'benar_salah' && 'Tentukan pernyataan Benar atau Salah'}
                  {q.type === 'pilihan_ganda_kompleks' && 'Pilih semua jawaban yang benar (lebih dari satu)'}
                  {q.type === 'isian_singkat' &&
                    (q.requiresManualGrading
                      ? 'Isian singkat (dinilai manual oleh fasilitator)'
                      : 'Tuliskan jawaban singkat yang tepat')}
                </p>

                {(q.type === 'pilihan_ganda' || q.type === 'benar_salah') && (
                  <div className="space-y-2 pt-1">
                    {q.options.map((opt) => {
                      const checked = (ans.selectedOptionIds || [])[0] === opt.id;
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer text-sm transition-colors ${
                            checked
                              ? 'border-[#0f6cbf] bg-[#e7f1fa]/70 text-slate-900'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            checked={checked}
                            onChange={() => setSingleOption(q.id, opt.id)}
                            className="mt-0.5"
                          />
                          <span>{opt.text}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {q.type === 'pilihan_ganda_kompleks' && (
                  <div className="space-y-2 pt-1">
                    {q.options.map((opt) => {
                      const checked = (ans.selectedOptionIds || []).includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer text-sm transition-colors ${
                            checked
                              ? 'border-[#0f6cbf] bg-[#e7f1fa]/70 text-slate-900'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMultiOption(q.id, opt.id)}
                            className="mt-0.5"
                          />
                          <span>{opt.text}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {q.type === 'isian_singkat' && (
                  <input
                    type="text"
                    value={ans.textAnswer || ''}
                    onChange={(e) => setTextAnswer(q.id, e.target.value)}
                    placeholder="Ketik jawaban Anda di sini..."
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
                  />
                )}
              </div>
            );
          })}

          {submitError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Pengiriman Jawaban Belum Berhasil</p>
                <p className="mt-0.5">{submitError}</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
              >
                <Save className="w-4 h-4" />
                Simpan Jawaban Sementara
              </button>
              <span className="text-xs text-slate-500 font-medium tabular-nums">
                Terjawab:{' '}
                <strong className="text-slate-900">
                  {answeredCount} / {displayQuestions.length}
                </strong>{' '}
                soal
              </span>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit(false)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Mengirim & Menilai Jawaban...' : 'Kirim Jawaban'}
            </button>
          </div>
        </div>
      )}

      {/* Hasil & Pembahasan setelah kirim */}
      {lastSubmission && (
        <div className="bg-white border border-emerald-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                Jawaban Berhasil Dikirim · Percobaan #{lastSubmission.attempt.attemptNumber}
              </p>
              <h4 className="text-xl font-bold text-slate-900 tabular-nums mt-1">
                Skor Akhir: {lastSubmission.attempt.percentage}%
              </h4>
              <p className="text-xs text-slate-600 mt-1">{lastSubmission.attempt.feedback}</p>
            </div>
            {lastSubmission.attempt.assignedLevel > 0 ? (
              <div className="text-right">
                <p className="text-xs text-slate-500">Penempatan Level Awal</p>
                <p className="text-base font-bold text-blue-700">
                  Level {lastSubmission.attempt.assignedLevel} ·{' '}
                  {LEVEL_NAMES[lastSubmission.attempt.assignedLevel as 1 | 2 | 3 | 4]}
                </p>
              </div>
            ) : (
              <span
                className={`text-sm font-bold ${
                  lastSubmission.attempt.gradingStatus === 'menunggu_manual'
                    ? 'text-amber-700'
                    : lastSubmission.attempt.passed
                      ? 'text-emerald-700'
                      : 'text-red-700'
                }`}
              >
                {lastSubmission.attempt.gradingStatus === 'menunggu_manual'
                  ? 'MENUNGGU PENILAIAN MANUAL'
                  : lastSubmission.attempt.passed
                    ? 'LULUS'
                    : 'BELUM LULUS'}
              </span>
            )}
          </div>

          {bank.showExplanation && (
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-800">Pembahasan Jawaban</h5>
              {bank.questions.map((q, idx) => {
                const r = lastSubmission.perQuestionResults[q.id];
                if (!r) return null;
                return (
                  <div key={q.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        Soal {idx + 1}: {q.prompt}
                      </span>
                      {r.pendingManual ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold whitespace-nowrap">
                          <HelpCircle className="w-3.5 h-3.5" /> Menunggu Fasilitator
                        </span>
                      ) : r.correct ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold whitespace-nowrap">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Benar (+{r.earned})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 font-semibold whitespace-nowrap">
                          <XCircle className="w-3.5 h-3.5" /> Kurang Tepat (0/{r.maxWeight})
                        </span>
                      )}
                    </div>
                    {r.explanation && <p className="text-slate-600">{r.explanation}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Riwayat Percobaan */}
      {existingAttempts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h4 className="text-sm font-bold text-slate-900">Riwayat Percobaan ({existingAttempts.length}/{bank.maxAttempts})</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">Percobaan</th>
                  <th className="py-2 pr-4 font-medium">Waktu</th>
                  <th className="py-2 pr-4 font-medium text-right">Nilai</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {existingAttempts.map((att) => (
                  <tr key={att.id}>
                    <td className="py-2.5 pr-4 font-mono">#{att.attemptNumber}</td>
                    <td className="py-2.5 pr-4 font-mono text-slate-500">
                      {att.createdAt.slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono font-semibold tabular-nums">
                      {att.finalScore}%
                    </td>
                    <td className="py-2.5 pr-4 font-semibold">
                      {att.gradingStatus === 'menunggu_manual'
                        ? 'Menunggu Manual'
                        : att.kind === 'assessment'
                          ? `Level ${att.assignedLevel}`
                          : att.passed
                            ? 'Lulus'
                            : 'Belum Lulus'}
                    </td>
                    <td className="py-2.5 text-slate-600">{att.feedback}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
