import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, ExternalLink, FileCheck2, Plus, Save, Trash2 } from 'lucide-react';
import { useLms } from '../context/LmsContext';
import { calculateRubricWeightedScore } from '../lib/lmsRules';
import {
  AnswerKeyEntry,
  BankKind,
  DEFAULT_SAMR_RUBRIC,
  LEVEL_SHORT_NAMES,
  QuestionBank,
  QuestionItem,
  QuestionType,
  RUBRIC_SCALE_LABELS,
  RubricAspectScore,
  TaskSubmission,
} from '../types/lms';

const KIND_LABELS: Record<BankKind, string> = {
  assessment: 'Asesmen Awal',
  quiz: 'Kuis Level',
  evaluation: 'Evaluasi Akhir',
};

const QTYPE_LABELS: Record<QuestionType, string> = {
  pilihan_ganda: 'Pilihan Ganda',
  benar_salah: 'Benar / Salah',
  pilihan_ganda_kompleks: 'Pilihan Ganda Kompleks',
  isian_singkat: 'Isian Singkat',
};

function buildInitialRubricRows(sub: TaskSubmission): RubricAspectScore[] {
  return DEFAULT_SAMR_RUBRIC.map((crit) => {
    const existing = sub.rubricScores.find((r) => r.criterionId === crit.id);
    return {
      criterionId: crit.id,
      criterionLabel: crit.label,
      weight: crit.weight,
      score: existing?.score || 3,
      comment: existing?.comment || '',
    };
  });
}

export function AssessmentQuizManagePage() {
  const {
    trainings,
    questionBanks,
    answerKeys,
    attempts,
    taskSubmissions,
    saveQuestionBank,
    gradeManualAttempt,
    gradePracticalTask,
  } = useLms();

  const [searchParams] = useSearchParams();
  const initialTabParam = searchParams.get('tab');
  const [tab, setTab] = useState<'banks' | 'manual' | 'rubrik'>(
    initialTabParam === 'rubrik' ? 'rubrik' : initialTabParam === 'manual' ? 'manual' : 'banks',
  );

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'rubrik' || t === 'manual' || t === 'banks') {
      setTab(t);
    }
  }, [searchParams]);

  const [filterTrainingId, setFilterTrainingId] = useState(trainings[0]?.id || '');
  const [selectedBankId, setSelectedBankId] = useState<string>(
    questionBanks.find((b) => b.trainingId === (trainings[0]?.id || ''))?.id || '',
  );

  // State penilaian manual isian
  const [manualScores, setManualScores] = useState<Record<string, { score: number; feedback: string }>>({});

  // State penilaian rubrik praktik PID
  const [rubricTrainingFilter, setRubricTrainingFilter] = useState<string>('all');
  const [rubricStatusFilter, setRubricStatusFilter] = useState<string>('menunggu_penilaian');
  const [rubricDrafts, setRubricDrafts] = useState<
    Record<string, { scores: RubricAspectScore[]; feedback: string }>
  >({});

  // State tambah soal cepat ke bank terpilih
  const [newQ, setNewQ] = useState({
    type: 'pilihan_ganda' as QuestionType,
    prompt: '',
    weight: 20,
    optA: '',
    optB: '',
    optC: '',
    optD: '',
    correctOpt: 'a',
    acceptedText: '',
    requiresManualGrading: false,
    explanation: '',
  });

  const filteredBanks = questionBanks.filter((b) => b.trainingId === filterTrainingId);
  const selectedBank =
    filteredBanks.find((b) => b.id === selectedBankId) || filteredBanks[0] || null;
  const selectedKeyDoc = selectedBank
    ? answerKeys.find((k) => k.id === selectedBank.id)
    : undefined;

  const pendingManualAttempts = attempts.filter((a) => a.gradingStatus === 'menunggu_manual');
  const pendingRubricCount = taskSubmissions.filter((s) => s.status === 'menunggu_penilaian').length;
  const filteredSubmissions = taskSubmissions.filter((s) => {
    if (rubricTrainingFilter !== 'all' && s.trainingId !== rubricTrainingFilter) return false;
    if (rubricStatusFilter !== 'semua' && s.status !== rubricStatusFilter) return false;
    return true;
  });

  const getRubricDraft = (sub: TaskSubmission) =>
    rubricDrafts[sub.id] || {
      scores: buildInitialRubricRows(sub),
      feedback: sub.facilitatorFeedback || '',
    };

  const updateRubricCriterion = (
    sub: TaskSubmission,
    criterionId: string,
    patch: Partial<RubricAspectScore>,
  ) => {
    const current = getRubricDraft(sub);
    const nextScores = current.scores.map((row) =>
      row.criterionId === criterionId ? { ...row, ...patch } : row,
    );
    setRubricDrafts((prev) => ({
      ...prev,
      [sub.id]: { ...current, scores: nextScores },
    }));
  };

  const handleUpdateBankSetting = async (patch: Partial<QuestionBank>) => {
    if (!selectedBank) return;
    await saveQuestionBank({ ...selectedBank, ...patch }, selectedKeyDoc?.answers || []);
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank) return;
    const qId = `${selectedBank.id}_q${Date.now().toString(36)}`;
    let options: QuestionItem['options'] = [];
    let correctOptionIds: string[] = [];
    let acceptedTextAnswers: string[] = [];

    if (newQ.type === 'pilihan_ganda' || newQ.type === 'pilihan_ganda_kompleks') {
      options = [
        { id: 'a', text: newQ.optA || 'Pilihan A' },
        { id: 'b', text: newQ.optB || 'Pilihan B' },
        { id: 'c', text: newQ.optC || 'Pilihan C' },
        { id: 'd', text: newQ.optD || 'Pilihan D' },
      ];
      correctOptionIds = newQ.correctOpt
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    } else if (newQ.type === 'benar_salah') {
      options = [
        { id: 'true', text: 'Benar' },
        { id: 'false', text: 'Salah' },
      ];
      correctOptionIds = [newQ.correctOpt === 'false' ? 'false' : 'true'];
    } else {
      acceptedTextAnswers = newQ.acceptedText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const qItem: QuestionItem = {
      id: qId,
      type: newQ.type,
      prompt: newQ.prompt.trim(),
      weight: Number(newQ.weight) || 10,
      options,
      requiresManualGrading: newQ.type === 'isian_singkat' ? newQ.requiresManualGrading : false,
    };
    const keyEntry: AnswerKeyEntry = {
      questionId: qId,
      correctOptionIds,
      acceptedTextAnswers,
      explanation: newQ.explanation.trim(),
    };

    const updatedBank: QuestionBank = {
      ...selectedBank,
      questions: [...selectedBank.questions, qItem],
    };
    const updatedKeys = [...(selectedKeyDoc?.answers || []), keyEntry];
    const res = await saveQuestionBank(updatedBank, updatedKeys);
    if (res.ok) {
      setNewQ({
        type: 'pilihan_ganda',
        prompt: '',
        weight: 20,
        optA: '',
        optB: '',
        optC: '',
        optD: '',
        correctOpt: 'a',
        acceptedText: '',
        requiresManualGrading: false,
        explanation: '',
      });
    }
  };

  const handleRemoveQuestion = async (qId: string) => {
    if (!selectedBank) return;
    await saveQuestionBank(
      { ...selectedBank, questions: selectedBank.questions.filter((q) => q.id !== qId) },
      (selectedKeyDoc?.answers || []).filter((k) => k.questionId !== qId),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asesmen Awal, Kuis & Evaluasi</h1>
          <p className="text-sm text-slate-600 mt-1">
            Kelola instrumen soal (4 tipe soal), bobot, durasi, percobaan, serta lakukan koreksi manual soal isian. Kunci jawaban disimpan terpisah dan terisolasi dari peserta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('banks')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              tab === 'banks' ? 'bg-white text-[#0F2544] shadow-sm' : 'text-slate-600'
            }`}
          >
            Bank Soal & Pengaturan
          </button>
          <button
            type="button"
            onClick={() => setTab('rubrik')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              tab === 'rubrik' ? 'bg-white text-[#0F2544] shadow-sm' : 'text-slate-600'
            }`}
          >
            Penilaian Rubrik Praktik ({pendingRubricCount})
          </button>
          <button
            type="button"
            onClick={() => setTab('manual')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              tab === 'manual' ? 'bg-white text-[#0F2544] shadow-sm' : 'text-slate-600'
            }`}
          >
            Koreksi Manual ({pendingManualAttempts.length})
          </button>
        </div>
      </div>

      {tab === 'banks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar daftar bank soal */}
          <div className="lg:col-span-4 space-y-4">
            <select
              value={filterTrainingId}
              onChange={(e) => {
                setFilterTrainingId(e.target.value);
                const first = questionBanks.find((b) => b.trainingId === e.target.value);
                setSelectedBankId(first?.id || '');
              }}
              className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg"
            >
              {trainings.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} — {t.name}
                </option>
              ))}
            </select>

            <div className="space-y-2">
              {filteredBanks.map((b) => {
                const active = selectedBank?.id === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBankId(b.id)}
                    className={`w-full text-left p-3.5 rounded-xl border bg-white transition-colors ${
                      active ? 'border-blue-700 ring-1 ring-blue-700' : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <p className="text-[11px] text-slate-500">
                      {KIND_LABELS[b.kind]}
                      {b.levelNumber > 0 ? ` · Level ${b.levelNumber}` : ''} · {b.isActive ? 'Aktif' : 'Nonaktif'}
                    </p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{b.title}</p>
                    <p className="text-[11px] font-mono text-slate-500 mt-1">
                      {b.questions.length} soal · {b.durationMinutes} mnt · KKM {b.passingScore}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail & editor bank soal */}
          <div className="lg:col-span-8 space-y-6">
            {selectedBank && (
              <>
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                    <div>
                      <p className="text-xs text-slate-500">
                        {KIND_LABELS[selectedBank.kind]}
                        {selectedBank.levelNumber > 0 ? ` · Level ${selectedBank.levelNumber}` : ''}
                      </p>
                      <h2 className="text-lg font-bold text-slate-900">{selectedBank.title}</h2>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedBank.isActive}
                        onChange={(e) => void handleUpdateBankSetting({ isActive: e.target.checked })}
                      />
                      Instrumen Aktif
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1">Durasi (menit)</label>
                      <input
                        type="number"
                        min={5}
                        value={selectedBank.durationMinutes}
                        onChange={(e) =>
                          void handleUpdateBankSetting({ durationMinutes: Number(e.target.value) })
                        }
                        className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Batas Percobaan</label>
                      <input
                        type="number"
                        min={1}
                        value={selectedBank.maxAttempts}
                        onChange={(e) =>
                          void handleUpdateBankSetting({ maxAttempts: Number(e.target.value) })
                        }
                        className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Nilai Kelulusan</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={selectedBank.passingScore}
                        onChange={(e) =>
                          void handleUpdateBankSetting({ passingScore: Number(e.target.value) })
                        }
                        className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded-md"
                      />
                    </div>
                    <div className="flex flex-col justify-end gap-1.5">
                      <label className="flex items-center gap-1.5 text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedBank.shuffleQuestions}
                          onChange={(e) =>
                            void handleUpdateBankSetting({ shuffleQuestions: e.target.checked })
                          }
                        />
                        Acak Soal
                      </label>
                      <label className="flex items-center gap-1.5 text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedBank.showExplanation}
                          onChange={(e) =>
                            void handleUpdateBankSetting({ showExplanation: e.target.checked })
                          }
                        />
                        Tampilkan Pembahasan
                      </label>
                    </div>
                  </div>
                </div>

                {/* Daftar soal & kunci jawaban (khusus staf) */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    Daftar Soal ({selectedBank.questions.length})
                  </h3>
                  <div className="space-y-3">
                    {selectedBank.questions.map((q, idx) => {
                      const key = selectedKeyDoc?.answers.find((a) => a.questionId === q.id);
                      return (
                        <div key={q.id} className="p-4 rounded-lg border border-slate-200 space-y-2 text-xs">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-semibold text-slate-900">
                              {idx + 1}. {q.prompt}
                            </p>
                            <button
                              type="button"
                              onClick={() => void handleRemoveQuestion(q.id)}
                              className="text-red-600 hover:text-red-800 shrink-0"
                              aria-label="Hapus soal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-slate-500">
                            {QTYPE_LABELS[q.type]} · Bobot {q.weight}
                            {q.requiresManualGrading ? ' · Penilaian Manual' : ''}
                          </p>
                          {key && (
                            <p className="text-emerald-800 font-mono">
                              Kunci (terisolasi):{' '}
                              {key.correctOptionIds.length > 0
                                ? key.correctOptionIds.join(', ').toUpperCase()
                                : key.acceptedTextAnswers.join(' / ') || 'Dinilai manual'}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Form tambah soal baru */}
                <form
                  onSubmit={(e) => void handleAddQuestion(e)}
                  className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                >
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-blue-700" />
                    Tambah Soal Baru ke {selectedBank.title}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 mb-1">Tipe Soal</label>
                      <select
                        value={newQ.type}
                        onChange={(e) =>
                          setNewQ({ ...newQ, type: e.target.value as QuestionType })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      >
                        {Object.entries(QTYPE_LABELS).map(([k, lbl]) => (
                          <option key={k} value={k}>
                            {lbl}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">Bobot Nilai</label>
                      <input
                        required
                        type="number"
                        min={1}
                        value={newQ.weight}
                        onChange={(e) => setNewQ({ ...newQ, weight: Number(e.target.value) })}
                        className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">
                        {newQ.type === 'isian_singkat'
                          ? 'Kata Kunci Jawaban (pisah koma)'
                          : newQ.type === 'benar_salah'
                            ? 'Kunci (true / false)'
                            : 'Kunci Opsi (cth: a atau a,c)'}
                      </label>
                      {newQ.type === 'isian_singkat' ? (
                        <input
                          type="text"
                          value={newQ.acceptedText}
                          onChange={(e) => setNewQ({ ...newQ, acceptedText: e.target.value })}
                          placeholder="rbac, otorisasi"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        />
                      ) : (
                        <input
                          required
                          type="text"
                          value={newQ.correctOpt}
                          onChange={(e) => setNewQ({ ...newQ, correctOpt: e.target.value })}
                          placeholder={newQ.type === 'benar_salah' ? 'true' : 'a'}
                          className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Pertanyaan</label>
                    <textarea
                      required
                      rows={2}
                      value={newQ.prompt}
                      onChange={(e) => setNewQ({ ...newQ, prompt: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  {(newQ.type === 'pilihan_ganda' || newQ.type === 'pilihan_ganda_kompleks') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <input
                        required
                        placeholder="Opsi A"
                        value={newQ.optA}
                        onChange={(e) => setNewQ({ ...newQ, optA: e.target.value })}
                        className="px-3 py-2 border border-slate-300 rounded-lg"
                      />
                      <input
                        required
                        placeholder="Opsi B"
                        value={newQ.optB}
                        onChange={(e) => setNewQ({ ...newQ, optB: e.target.value })}
                        className="px-3 py-2 border border-slate-300 rounded-lg"
                      />
                      <input
                        required
                        placeholder="Opsi C"
                        value={newQ.optC}
                        onChange={(e) => setNewQ({ ...newQ, optC: e.target.value })}
                        className="px-3 py-2 border border-slate-300 rounded-lg"
                      />
                      <input
                        required
                        placeholder="Opsi D"
                        value={newQ.optD}
                        onChange={(e) => setNewQ({ ...newQ, optD: e.target.value })}
                        className="px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  )}

                  {newQ.type === 'isian_singkat' && (
                    <label className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={newQ.requiresManualGrading}
                        onChange={(e) =>
                          setNewQ({ ...newQ, requiresManualGrading: e.target.checked })
                        }
                      />
                      Memerlukan penilaian manual oleh Fasilitator
                    </label>
                  )}

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Pembahasan (opsional)</label>
                    <input
                      type="text"
                      value={newQ.explanation}
                      onChange={(e) => setNewQ({ ...newQ, explanation: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Tambahkan Soal
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'manual' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-700" />
            <h2 className="text-base font-bold text-slate-900">
              Antrean Penilaian Manual Soal Isian ({pendingManualAttempts.length})
            </h2>
          </div>

          {pendingManualAttempts.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              Seluruh percobaan kuis dan evaluasi telah selesai dinilai.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingManualAttempts.map((att) => {
                const state = manualScores[att.id] || { score: 80, feedback: 'Jawaban baik dan sesuai konsep.' };
                const bank = questionBanks.find((b) => b.id === att.bankId);
                return (
                  <div key={att.id} className="p-4 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{att.userName}</p>
                        <p className="text-slate-500">
                          {bank?.title || att.bankId} · Percobaan #{att.attemptNumber} · Nilai Objektif Awal: {att.autoScore}%
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
                      <p className="font-semibold text-slate-700">Jawaban Isian Peserta:</p>
                      {Object.entries(att.answers).map(([qId, a]) =>
                        a.textAnswer ? (
                          <p key={qId} className="text-slate-800">
                            “{a.textAnswer}”
                          </p>
                        ) : null,
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end text-xs">
                      <div className="sm:col-span-3">
                        <label className="block text-slate-600 mb-1">Nilai Akhir (0–100)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={state.score}
                          onChange={(e) =>
                            setManualScores({
                              ...manualScores,
                              [att.id]: { ...state, score: Number(e.target.value) },
                            })
                          }
                          className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div className="sm:col-span-6">
                        <label className="block text-slate-600 mb-1">Umpan Balik Fasilitator</label>
                        <input
                          type="text"
                          value={state.feedback}
                          onChange={(e) =>
                            setManualScores({
                              ...manualScores,
                              [att.id]: { ...state, feedback: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <button
                          type="button"
                          onClick={() =>
                            void gradeManualAttempt({
                              attemptId: att.id,
                              manualScore: state.score,
                              feedback: state.feedback,
                            })
                          }
                          className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg"
                        >
                          Simpan Nilai Akhir
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'rubrik' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-blue-700" />
                Penilaian Rubrik Tugas Praktik PID (Skala 1–4)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tinjau produk praktik pemanfaatan Papan Interaktif Digital peserta, berikan skor 1–4 pada 6 aspek rubrik SAMR, serta umpan balik perbaikan atau kelulusan.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={rubricTrainingFilter}
                onChange={(e) => setRubricTrainingFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">Semua Kegiatan</option>
                {trainings.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code}
                  </option>
                ))}
              </select>
              <select
                value={rubricStatusFilter}
                onChange={(e) => setRubricStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="menunggu_penilaian">Menunggu Penilaian ({pendingRubricCount})</option>
                <option value="perlu_perbaikan">Perlu Perbaikan</option>
                <option value="lulus">Sudah Lulus</option>
                <option value="semua">Semua Kiriman ({taskSubmissions.length})</option>
              </select>
            </div>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              Tidak ada kiriman praktik pada filter status ini.
            </div>
          ) : (
            <div className="space-y-6">
              {filteredSubmissions.map((sub) => {
                const draft = getRubricDraft(sub);
                const liveScore = calculateRubricWeightedScore(draft.scores);
                const trn = trainings.find((t) => t.id === sub.trainingId);
                return (
                  <div key={sub.id} className="border border-slate-200 rounded-xl p-5 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4 pb-3 border-b border-slate-100">
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500">
                          <span className="font-mono font-semibold text-slate-700">{trn?.code || sub.trainingId}</span>
                          {' · '}
                          Level {sub.levelNumber} ({LEVEL_SHORT_NAMES[sub.levelNumber]})
                          {' · '}
                          <span
                            className={`font-semibold ${
                              sub.status === 'lulus'
                                ? 'text-emerald-700'
                                : sub.status === 'perlu_perbaikan'
                                  ? 'text-red-700'
                                  : 'text-amber-700'
                            }`}
                          >
                            {sub.status === 'lulus'
                              ? 'Lulus'
                              : sub.status === 'perlu_perbaikan'
                                ? 'Perlu Perbaikan'
                                : 'Menunggu Penilaian'}
                          </span>
                        </p>
                        <h3 className="text-base font-bold text-slate-900">
                          {sub.userName} — {sub.title}
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">{sub.description}</p>
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                          {sub.productUrl && (
                            <a
                              href={sub.productUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Produk: {sub.productFileName || 'Buka Tautan Produk'}
                            </a>
                          )}
                          {sub.docMediaUrl && (
                            <a
                              href={sub.docMediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Dokumentasi: {sub.docMediaName || 'Lihat Foto/Video'}
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-right shrink-0">
                        <p className="text-[11px] text-slate-500">Skor Rubrik Terbobot</p>
                        <p className="text-2xl font-bold font-mono text-[#0F2544] tabular-nums">
                          {liveScore}
                          <span className="text-xs font-normal text-slate-500"> / 100</span>
                        </p>
                      </div>
                    </div>

                    {/* Tabel 6 Aspek Rubrik Skala 1-4 */}
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">6 Aspek Rubrik Penilaian Praktik PID</span>
                        <span>
                          Skala: 1 = Perlu bimbingan · 2 = Mulai berkembang · 3 = Cakap · 4 = Sangat baik
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                        {draft.scores.map((row, idx) => (
                          <div
                            key={row.criterionId}
                            className="p-3 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center text-xs"
                          >
                            <div className="lg:col-span-5">
                              <p className="font-semibold text-slate-900">
                                {idx + 1}. {row.criterionLabel}
                              </p>
                              <p className="text-[11px] text-slate-500 font-mono">Bobot {row.weight}%</p>
                            </div>
                            <div className="lg:col-span-3 flex items-center gap-1.5">
                              {([1, 2, 3, 4] as const).map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  title={RUBRIC_SCALE_LABELS[val]}
                                  onClick={() =>
                                    updateRubricCriterion(sub, row.criterionId, { score: val })
                                  }
                                  className={`w-8 h-8 rounded-md font-mono font-bold text-xs transition-colors border ${
                                    row.score === val
                                      ? 'bg-[#0F2544] text-white border-[#0F2544]'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                            <div className="lg:col-span-4">
                              <input
                                type="text"
                                value={row.comment}
                                onChange={(e) =>
                                  updateRubricCriterion(sub, row.criterionId, { comment: e.target.value })
                                }
                                placeholder="Catatan singkat aspek ini (opsional)..."
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Umpan balik & tombol keputusan */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                      <div className="lg:col-span-8">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Umpan Balik Menyeluruh Fasilitator
                        </label>
                        <textarea
                          rows={2}
                          value={draft.feedback}
                          onChange={(e) =>
                            setRubricDrafts((prev) => ({
                              ...prev,
                              [sub.id]: { ...draft, feedback: e.target.value },
                            }))
                          }
                          placeholder="Tulis apresiasi capaian dan arahan perbaikan konkret pemanfaatan PID..."
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div className="lg:col-span-4 flex flex-wrap sm:flex-nowrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void gradePracticalTask({
                              submissionId: sub.id,
                              rubricScores: draft.scores,
                              status: 'perlu_perbaikan',
                              facilitatorFeedback:
                                draft.feedback ||
                                'Mohon lengkapi produk praktik dan dokumentasi sesuai catatan aspek rubrik.',
                            })
                          }
                          className="flex-1 px-3 py-2 text-xs font-semibold text-red-700 bg-white border border-red-300 hover:bg-red-50 rounded-lg whitespace-nowrap"
                        >
                          Minta Perbaikan
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void gradePracticalTask({
                              submissionId: sub.id,
                              rubricScores: draft.scores,
                              status: 'lulus',
                              facilitatorFeedback:
                                draft.feedback ||
                                'Produk praktik PID memenuhi standar kompetensi level SAMR dengan baik.',
                            })
                          }
                          className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap"
                        >
                          Luluskan Praktik
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
