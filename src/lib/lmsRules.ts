import {
  AnswerKeyEntry,
  AttemptRecord,
  LearningLevel,
  LearningMaterial,
  LevelCardStatus,
  LevelEvaluationSummary,
  LevelReflection,
  MaterialProgress,
  QuestionBank,
  RubricAspectScore,
  ScoreRange,
  TaskSubmission,
  TrainingEnrollment,
  UserAnswerMap,
} from '../types/lms';

/**
 * Validasi rentang skor asesmen awal:
 * - Harus mencakup tepat 4 level (1..4)
 * - Harus mulai dari 0 dan berakhir di 100
 * - Tidak boleh tumpang tindih dan tidak boleh memiliki celah
 */
export function validateScoreRanges(ranges: ScoreRange[]): { valid: boolean; error?: string } {
  if (ranges.length !== 4) {
    return { valid: false, error: 'Konfigurasi wajib terdiri dari 4 level (Level 1 sampai Level 4).' };
  }
  const sorted = [...ranges].sort((a, b) => a.level - b.level);
  for (let i = 0; i < 4; i++) {
    if (sorted[i].level !== i + 1) {
      return { valid: false, error: 'Urutan level harus berurutan dari 1 hingga 4.' };
    }
    if (Number.isNaN(sorted[i].min) || Number.isNaN(sorted[i].max)) {
      return { valid: false, error: 'Nilai batas minimum dan maksimum harus berupa angka.' };
    }
    if (sorted[i].min < 0 || sorted[i].max > 100) {
      return { valid: false, error: 'Rentang nilai harus berada dalam batas 0 sampai 100.' };
    }
    if (sorted[i].min > sorted[i].max) {
      return {
        valid: false,
        error: `Level ${sorted[i].level}: batas bawah (${sorted[i].min}) melebihi batas atas (${sorted[i].max}).`,
      };
    }
  }

  if (sorted[0].min !== 0) {
    return { valid: false, error: 'Rentang Level 1 harus dimulai tepat dari angka 0.' };
  }
  if (sorted[3].max !== 100) {
    return { valid: false, error: 'Rentang Level 4 harus berakhir tepat pada angka 100.' };
  }

  for (let i = 1; i < 4; i++) {
    const prevMax = sorted[i - 1].max;
    const currMin = sorted[i].min;
    const diff = Number((currMin - prevMax).toFixed(2));
    if (currMin <= prevMax) {
      return {
        valid: false,
        error: `Rentang Level ${i} dan Level ${i + 1} saling tumpang tindih (${prevMax} vs ${currMin}).`,
      };
    }
    if (diff > 1.0 && Math.abs(diff - 0.01) > 0.001) {
      return {
        valid: false,
        error: `Terdapat celah nilai antara Level ${i} (maks ${prevMax}) dan Level ${i + 1} (min ${currMin}).`,
      };
    }
  }

  return { valid: true };
}

/**
 * Menentukan starting_level dari skor persentase asesmen awal (0..100).
 * Default SAMR: 0..40 = Level 1 (Substitution), 41..60 = Level 2 (Augmentation),
 * 61..80 = Level 3 (Modification), 81..100 = Level 4 (Redefinition).
 */
export function resolveStartingLevel(score: number, ranges: ScoreRange[]): 1 | 2 | 3 | 4 {
  const clamped = Math.max(0, Math.min(100, Number(score.toFixed(2))));
  const sorted = [...ranges].sort((a, b) => a.level - b.level);
  for (const r of sorted) {
    if (clamped >= r.min && clamped <= r.max) {
      return r.level;
    }
  }
  if (clamped <= 40) return 1;
  if (clamped <= 60) return 2;
  if (clamped <= 80) return 3;
  return 4;
}

/**
 * Menghitung skor terbobot (0..100) dari rubrik skala 1..4.
 */
export function calculateRubricWeightedScore(scores: RubricAspectScore[]): number {
  if (scores.length === 0) return 0;
  const totalWeight = scores.reduce((acc, s) => acc + (Number(s.weight) || 0), 0);
  if (totalWeight <= 0) return 0;
  const weighted = scores.reduce((acc, s) => acc + (s.score / 4) * (Number(s.weight) || 0), 0);
  return Math.round((weighted / totalWeight) * 100);
}

/**
 * Penilaian otomatis soal objektif & deteksi kebutuhan penilaian manual untuk isian singkat.
 */
export function gradeSubmission(
  bank: QuestionBank,
  answerKey: AnswerKeyEntry[],
  userAnswers: UserAnswerMap,
): {
  autoScore: number;
  percentage: number;
  passed: boolean;
  gradingStatus: 'selesai' | 'menunggu_manual';
  perQuestionResults: Record<
    string,
    { correct: boolean; earned: number; maxWeight: number; explanation: string; pendingManual: boolean }
  >;
} {
  const keyMap = new Map<string, AnswerKeyEntry>();
  for (const entry of answerKey) {
    keyMap.set(entry.questionId, entry);
  }

  let totalWeight = 0;
  let earnedTotal = 0;
  let hasManualPending = false;
  const perQuestionResults: Record<
    string,
    { correct: boolean; earned: number; maxWeight: number; explanation: string; pendingManual: boolean }
  > = {};

  for (const q of bank.questions) {
    totalWeight += q.weight;
    const key = keyMap.get(q.id);
    const ans = userAnswers[q.id] || {};
    const explanation = key?.explanation || '';

    if (q.type === 'pilihan_ganda' || q.type === 'benar_salah') {
      const selected = (ans.selectedOptionIds || [])[0] || '';
      const expected = key?.correctOptionIds?.[0] || '';
      const isCorrect = selected !== '' && selected === expected;
      const earned = isCorrect ? q.weight : 0;
      earnedTotal += earned;
      perQuestionResults[q.id] = {
        correct: isCorrect,
        earned,
        maxWeight: q.weight,
        explanation,
        pendingManual: false,
      };
    } else if (q.type === 'pilihan_ganda_kompleks') {
      const selectedSet = new Set(ans.selectedOptionIds || []);
      const expectedSet = new Set(key?.correctOptionIds || []);
      const isCorrect =
        expectedSet.size > 0 &&
        selectedSet.size === expectedSet.size &&
        [...expectedSet].every((id) => selectedSet.has(id));
      const earned = isCorrect ? q.weight : 0;
      earnedTotal += earned;
      perQuestionResults[q.id] = {
        correct: isCorrect,
        earned,
        maxWeight: q.weight,
        explanation,
        pendingManual: false,
      };
    } else {
      const rawText = (ans.textAnswer || '').trim().toLowerCase();
      if (q.requiresManualGrading) {
        hasManualPending = true;
        perQuestionResults[q.id] = {
          correct: false,
          earned: 0,
          maxWeight: q.weight,
          explanation,
          pendingManual: true,
        };
      } else {
        const accepted = (key?.acceptedTextAnswers || []).map((t) => t.trim().toLowerCase());
        const isCorrect = rawText.length > 0 && accepted.some((acc) => rawText.includes(acc));
        const earned = isCorrect ? q.weight : 0;
        earnedTotal += earned;
        perQuestionResults[q.id] = {
          correct: isCorrect,
          earned,
          maxWeight: q.weight,
          explanation,
          pendingManual: false,
        };
      }
    }
  }

  const percentage = totalWeight > 0 ? Math.round((earnedTotal / totalWeight) * 10000) / 100 : 0;
  const gradingStatus: 'selesai' | 'menunggu_manual' = hasManualPending ? 'menunggu_manual' : 'selesai';
  const passed = gradingStatus === 'selesai' && percentage >= bank.passingScore;

  return {
    autoScore: percentage,
    percentage,
    passed,
    gradingStatus,
    perQuestionResults,
  };
}

/**
 * Evaluasi aturan adaptive sequential learning & syarat kelulusan per level SAMR:
 * 1. Semua materi wajib selesai
 * 2. Tugas praktik diunggah & dinilai lulus oleh fasilitator (bila diwajibkan pada level)
 * 3. Nilai kuis >= minQuizScore (default 75)
 * 4. Nilai evaluasi kompetensi >= minEvaluationScore (default 75)
 * 5. Refleksi pembelajaran terisi
 */
export function evaluateLevelStatus(params: {
  enrollment: TrainingEnrollment;
  level: LearningLevel;
  materials: LearningMaterial[];
  progressList: MaterialProgress[];
  attempts: AttemptRecord[];
  taskSubmissions?: TaskSubmission[];
  reflections?: LevelReflection[];
}): LevelEvaluationSummary {
  const {
    enrollment,
    level,
    materials,
    progressList,
    attempts,
    taskSubmissions = [],
    reflections = [],
  } = params;
  const lvlNum = level.levelNumber;

  const isBelowStartingLevel = enrollment.startingLevel > 1 && lvlNum < enrollment.startingLevel;

  const levelMaterials = materials.filter(
    (m) => m.trainingId === enrollment.trainingId && m.levelNumber === lvlNum && m.isActive,
  );
  const mandatoryMaterials = levelMaterials.filter((m) => m.isMandatory);
  const completedMatIds = new Set(
    progressList
      .filter(
        (p) =>
          p.trainingId === enrollment.trainingId &&
          p.userId === enrollment.userId &&
          p.levelNumber === lvlNum &&
          p.status === 'selesai',
      )
      .map((p) => p.materialId),
  );
  const startedMatCount = progressList.filter(
    (p) =>
      p.trainingId === enrollment.trainingId &&
      p.userId === enrollment.userId &&
      p.levelNumber === lvlNum &&
      (p.status === 'dipelajari' || p.status === 'selesai'),
  ).length;

  const mandatoryCompleted = mandatoryMaterials.filter((m) => completedMatIds.has(m.id)).length;
  const allMandatoryDone = mandatoryCompleted >= mandatoryMaterials.length;

  const userSubmission = taskSubmissions.find(
    (s) =>
      s.trainingId === enrollment.trainingId &&
      s.userId === enrollment.userId &&
      s.levelNumber === lvlNum,
  );
  const requirePractice = level.requirePracticeValidation !== false;
  const practiceSubmitted = Boolean(userSubmission);
  const practiceStatus = userSubmission ? userSubmission.status : 'belum';
  const practiceScore = userSubmission && userSubmission.weightedScore > 0 ? userSubmission.weightedScore : null;
  const practicePassed = !requirePractice || userSubmission?.status === 'lulus';

  const reflectionDone = reflections.some(
    (r) =>
      r.trainingId === enrollment.trainingId &&
      r.userId === enrollment.userId &&
      r.levelNumber === lvlNum,
  );

  const quizAttempts = attempts.filter(
    (a) =>
      a.trainingId === enrollment.trainingId &&
      a.userId === enrollment.userId &&
      a.levelNumber === lvlNum &&
      a.kind === 'quiz',
  );
  const evalAttempts = attempts.filter(
    (a) =>
      a.trainingId === enrollment.trainingId &&
      a.userId === enrollment.userId &&
      a.levelNumber === lvlNum &&
      a.kind === 'evaluation',
  );

  const pendingManualGrading =
    [...quizAttempts, ...evalAttempts].some((a) => a.gradingStatus === 'menunggu_manual') ||
    (requirePractice && practiceStatus === 'menunggu_penilaian');

  const gradedQuizScores = quizAttempts
    .filter((a) => a.gradingStatus === 'selesai')
    .map((a) => a.finalScore);
  const bestQuizScore = gradedQuizScores.length > 0 ? Math.max(...gradedQuizScores) : null;
  const quizPassed = bestQuizScore !== null && bestQuizScore >= level.minQuizScore;

  const gradedEvalScores = evalAttempts
    .filter((a) => a.gradingStatus === 'selesai')
    .map((a) => a.finalScore);
  const bestEvalScore = gradedEvalScores.length > 0 ? Math.max(...gradedEvalScores) : null;
  const evalPassed = bestEvalScore !== null && bestEvalScore >= level.minEvaluationScore;

  const missingRequirements: string[] = [];
  if (!allMandatoryDone) {
    missingRequirements.push(
      `Materi wajib belum selesai (${mandatoryCompleted}/${mandatoryMaterials.length})`,
    );
  }
  if (requirePractice) {
    if (!practiceSubmitted) {
      missingRequirements.push('Produk tugas praktik PID belum diunggah');
    } else if (practiceStatus === 'menunggu_penilaian') {
      missingRequirements.push('Tugas praktik menunggu validasi & penilaian rubrik fasilitator');
    } else if (practiceStatus === 'perlu_perbaikan') {
      missingRequirements.push('Tugas praktik perlu perbaikan sesuai catatan fasilitator');
    }
  }
  if (bestQuizScore === null) {
    missingRequirements.push('Kuis pemahaman level belum dikerjakan');
  } else if (!quizPassed) {
    missingRequirements.push(`Nilai kuis (${bestQuizScore}) di bawah standar kelulusan (${level.minQuizScore})`);
  }
  if (bestEvalScore === null) {
    missingRequirements.push('Evaluasi kompetensi belum dikerjakan');
  } else if (!evalPassed) {
    missingRequirements.push(
      `Nilai evaluasi (${bestEvalScore}) di bawah standar kelulusan (${level.minEvaluationScore})`,
    );
  }
  if (!reflectionDone) {
    missingRequirements.push('Refleksi pembelajaran level belum diisi');
  }

  const isUnlocked = enrollment.unlockedLevels.includes(lvlNum);
  const isAlreadyCompleted = enrollment.completedLevels.includes(lvlNum);

  let status: LevelCardStatus = 'belum_terbuka';
  if (isAlreadyCompleted) {
    status = 'lulus';
  } else if (isBelowStartingLevel && !isUnlocked) {
    status = 'tidak_diwajibkan';
  } else if (!isUnlocked) {
    status = 'belum_terbuka';
  } else if (
    allMandatoryDone &&
    practicePassed &&
    quizPassed &&
    evalPassed &&
    reflectionDone &&
    !pendingManualGrading
  ) {
    status = 'lulus';
  } else if (practiceStatus === 'perlu_perbaikan') {
    status = 'belum_lulus';
  } else if (pendingManualGrading || (allMandatoryDone && quizPassed && bestEvalScore === null)) {
    status = 'menunggu_evaluasi';
  } else if (
    (bestQuizScore !== null && !quizPassed) ||
    (bestEvalScore !== null && !evalPassed)
  ) {
    status = 'belum_lulus';
  } else if (startedMatCount > 0 || quizAttempts.length > 0 || practiceSubmitted || reflectionDone) {
    status = 'sedang_dipelajari';
  } else {
    status = 'terbuka';
  }

  return {
    levelNumber: lvlNum,
    status,
    isBelowStartingLevel,
    mandatoryTotal: mandatoryMaterials.length,
    mandatoryCompleted,
    allMandatoryDone,
    practiceSubmitted,
    practicePassed,
    practiceStatus,
    practiceScore,
    reflectionDone,
    bestQuizScore,
    quizPassed,
    bestEvalScore,
    evalPassed,
    pendingManualGrading,
    canUnlockNext:
      isUnlocked &&
      allMandatoryDone &&
      practicePassed &&
      quizPassed &&
      evalPassed &&
      reflectionDone &&
      !pendingManualGrading,
    missingRequirements,
  };
}

export function generateUniqueCertificateNumber(trainingCode: string, userId: string): string {
  const year = new Date().getFullYear();
  const cleanCode = trainingCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
  const cleanUser = userId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-4);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `LMS-${year}-${cleanCode}-${cleanUser}-${rand}`;
}

export function extractYoutubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}
