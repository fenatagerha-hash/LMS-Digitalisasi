import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  BookOpen,
  Bot,
  ChevronRight,
  Landmark,
  Loader2,
  MessageSquareText,
  MonitorPlay,
  RotateCcw,
  Send,
  Sparkles,
  User,
} from 'lucide-react';
import { useLms } from '../context/LmsContext';
import { isSamrTraining, LEVEL_SHORT_NAMES, ROLE_LABELS } from '../types/lms';

type QnaTopic = 'semua' | 'digitalisasi' | 'samr' | 'pid' | 'kebijakan' | 'lms';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  modelUsed?: string;
}

const TOPIC_OPTIONS: Array<{
  id: QnaTopic;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'semua',
    label: 'Semua Topik',
    desc: 'Materi Digitalisasi Pembelajaran, SAMR, PID & Kebijakan',
    icon: Sparkles,
  },
  {
    id: 'digitalisasi',
    label: 'Digitalisasi Pembelajaran',
    desc: 'Pedagogi digital, Kurikulum Merdeka & Pembelajaran Mendalam',
    icon: BookOpen,
  },
  {
    id: 'samr',
    label: 'Model 4 Level SAMR',
    desc: 'Substitution, Augmentation, Modification & Redefinition',
    icon: ChevronRight,
  },
  {
    id: 'pid',
    label: 'Papan Interaktif Digital',
    desc: 'Operasional PID/IFP, anotasi, kolaborasi & perawatan',
    icon: MonitorPlay,
  },
  {
    id: 'kebijakan',
    label: 'Kebijakan & Tata Kelola',
    desc: 'Kebijakan TIK Kemendikdasmen, BAST, aset & etika digital',
    icon: Landmark,
  },
  {
    id: 'lms',
    label: 'Panduan Aktivitas LMS',
    desc: 'Asesmen awal, penempatan level 1–4, kuis & sertifikat',
    icon: MessageSquareText,
  },
];

const QUICK_PROMPTS: Array<{ topic: QnaTopic; label: string; question: string }> = [
  {
    topic: 'samr',
    label: 'Perbedaan 4 Level SAMR',
    question:
      'Jelaskan perbedaan Level 1 Substitution, Level 2 Augmentation, Level 3 Modification, dan Level 4 Redefinition pada model SAMR beserta contoh penerapannya di kelas.',
  },
  {
    topic: 'pid',
    label: 'Optimalisasi Papan Interaktif Digital (PID)',
    question:
      'Bagaimana langkah praktis memanfaatkan Papan Interaktif Digital (PID) agar pembelajaran lebih aktif, kolaboratif, dan tidak sekadar menjadi layar proyektor biasa?',
  },
  {
    topic: 'kebijakan',
    label: 'Kebijakan & Tata Kelola Bantuan Perangkat TIK',
    question:
      'Apa saja prinsip kebijakan digitalisasi pembelajaran dan tata kelola pemanfaatan bantuan perangkat TIK/PID di satuan pendidikan, termasuk terkait BAST dan pencatatan inventaris sekolah?',
  },
  {
    topic: 'lms',
    label: 'Aturan Penempatan Level Setelah Asesmen Awal',
    question:
      'Jika hasil asesmen awal menempatkan saya di Level 2 atau Level 3, materi level mana saja yang wajib saya selesaikan dan apakah materi di level bawahnya masih boleh saya buka?',
  },
  {
    topic: 'digitalisasi',
    label: 'Pembelajaran Mendalam Berbasis Digital',
    question:
      'Bagaimana merancang pembelajaran mendalam (deep learning) berbasis digital yang selaras dengan Kurikulum Merdeka untuk jenjang SD/SMP/SMA?',
  },
  {
    topic: 'kebijakan',
    label: 'Keamanan Data & Etika Digital di Sekolah',
    question:
      'Bagaimana penerapan keamanan data peserta didik dan etika pemanfaatan teknologi digital serta AI dalam proses pembelajaran di satuan pendidikan?',
  },
];

/**
 * Merender teks markdown ringan (heading, poin bullet/bernomor, cetak tebal) secara aman tanpa raw HTML injection.
 */
function renderInlineBold(line: string, keyPrefix: string): React.ReactNode[] {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={`${keyPrefix}_b_${idx}`} className="font-semibold text-[#111827]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={`${keyPrefix}_t_${idx}`}>{part}</React.Fragment>;
  });
}

function FormattedAssistantText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2.5 text-[13.5px] leading-relaxed text-[#212529]">
      {blocks.map((block, bIdx) => {
        const lines = block
          .split('\n')
          .map((l) => l.trimEnd())
          .filter((l) => l.trim().length > 0);
        if (lines.length === 0) return null;

        const isBulletList = lines.every((l) => /^[-*•]\s+/.test(l.trim()));
        if (isBulletList) {
          return (
            <ul key={`blk_${bIdx}`} className="list-disc pl-5 space-y-1">
              {lines.map((line, lIdx) => (
                <li key={`li_${bIdx}_${lIdx}`}>
                  {renderInlineBold(line.trim().replace(/^[-*•]\s+/, ''), `ul_${bIdx}_${lIdx}`)}
                </li>
              ))}
            </ul>
          );
        }

        const isNumberedList = lines.every((l) => /^\d+[.)]\s+/.test(l.trim()));
        if (isNumberedList) {
          return (
            <ol key={`blk_${bIdx}`} className="list-decimal pl-5 space-y-1">
              {lines.map((line, lIdx) => (
                <li key={`oli_${bIdx}_${lIdx}`}>
                  {renderInlineBold(line.trim().replace(/^\d+[.)]\s+/, ''), `ol_${bIdx}_${lIdx}`)}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <div key={`blk_${bIdx}`} className="space-y-1">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (/^#{1,4}\s+/.test(trimmed)) {
                return (
                  <p
                    key={`h_${bIdx}_${lIdx}`}
                    className="font-bold text-[#0b5394] text-sm pt-1"
                  >
                    {renderInlineBold(trimmed.replace(/^#{1,4}\s+/, ''), `hd_${bIdx}_${lIdx}`)}
                  </p>
                );
              }
              if (/^[-*•]\s+/.test(trimmed)) {
                return (
                  <p key={`bl_${bIdx}_${lIdx}`} className="pl-3">
                    • {renderInlineBold(trimmed.replace(/^[-*•]\s+/, ''), `bl_${bIdx}_${lIdx}`)}
                  </p>
                );
              }
              return (
                <p key={`p_${bIdx}_${lIdx}`}>
                  {renderInlineBold(trimmed, `p_${bIdx}_${lIdx}`)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function QnaChatPage() {
  const { currentUser, effectiveRole, trainings, enrollments, materials } = useLms();
  const [searchParams] = useSearchParams();
  const queryTrainingId = searchParams.get('training') || '';

  const canSeeAllTrainings =
    effectiveRole === 'super_admin' ||
    effectiveRole === 'admin_kegiatan' ||
    effectiveRole === 'fasilitator' ||
    effectiveRole === 'pemantau';

  const visibleTrainings = useMemo(() => {
    if (!currentUser) return [];
    if (canSeeAllTrainings) return trainings;
    const enrolledIds = new Set(
      enrollments
        .filter((e) => e.userId === currentUser.uid && e.status !== 'ditolak')
        .map((e) => e.trainingId),
    );
    const mine = trainings.filter((t) => enrolledIds.has(t.id));
    return mine.length > 0 ? mine : trainings.filter((t) => isSamrTraining(t));
  }, [trainings, enrollments, currentUser, canSeeAllTrainings]);

  const [selectedTrainingId, setSelectedTrainingId] = useState<string>(
    queryTrainingId || visibleTrainings[0]?.id || '',
  );
  const [topic, setTopic] = useState<QnaTopic>('semua');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (queryTrainingId && visibleTrainings.some((t) => t.id === queryTrainingId)) {
      setSelectedTrainingId(queryTrainingId);
    } else if (!selectedTrainingId && visibleTrainings[0]) {
      setSelectedTrainingId(visibleTrainings[0].id);
    }
  }, [queryTrainingId, visibleTrainings, selectedTrainingId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const activeTraining = useMemo(
    () => visibleTrainings.find((t) => t.id === selectedTrainingId) || null,
    [visibleTrainings, selectedTrainingId],
  );

  const activeTrainingMaterials = useMemo(() => {
    if (!activeTraining) return [];
    return materials
      .filter((m) => m.trainingId === activeTraining.id && m.isActive)
      .sort((a, b) => a.levelNumber - b.levelNumber || a.orderIndex - b.orderIndex);
  }, [materials, activeTraining]);

  const activeEnrollment = useMemo(() => {
    if (!currentUser || !activeTraining) return null;
    return (
      enrollments.find(
        (e) => e.trainingId === activeTraining.id && e.userId === currentUser.uid,
      ) || null
    );
  }, [enrollments, activeTraining, currentUser]);

  const sendQuestion = async (rawText: string, overrideTopic?: QnaTopic) => {
    const cleaned = rawText.trim();
    if (!cleaned || sending) return;

    const effectiveTopic = overrideTopic || topic;
    if (overrideTopic) setTopic(overrideTopic);

    const nowTime = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: cleaned,
      timestamp: nowTime,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setErrorMsg(null);
    setLastFailedQuestion(null);
    setSending(true);

    try {
      const levelSummary = activeEnrollment
        ? activeEnrollment.startingLevel >= 1
          ? `Terdaftar pada kegiatan ini. Penempatan awal: Level ${activeEnrollment.startingLevel} (${LEVEL_SHORT_NAMES[activeEnrollment.startingLevel]}), level aktif saat ini: Level ${activeEnrollment.currentLevel || activeEnrollment.startingLevel}, progres ${activeEnrollment.overallProgress}%.`
          : 'Terdaftar pada kegiatan ini, belum menyelesaikan Asesmen Awal.'
        : undefined;

      const res = await fetch('/api/gemini/qna-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: cleaned,
          topic: effectiveTopic,
          history: messages.slice(-10).map((m) => ({
            role: m.role,
            text: m.text,
          })),
          context: {
            trainingName: activeTraining?.name,
            trainingCode: activeTraining?.code,
            userRole: effectiveRole ? ROLE_LABELS[effectiveRole] : undefined,
            levelSummary,
            materials: activeTrainingMaterials.slice(0, 16).map((m) => ({
              title: m.title,
              levelNumber: m.levelNumber,
              description: m.description,
            })),
          },
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        reply?: string;
        modelUsed?: string;
        error?: string;
      };

      if (!res.ok || !data.reply) {
        const errText =
          data.error ||
          'Layanan Gemini AI belum dapat merespons saat ini. Silakan coba kirim ulang pertanyaan Anda.';
        setErrorMsg(errText);
        setLastFailedQuestion(cleaned);
        return;
      }

      const replyTime = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `m_${Date.now()}`,
          role: 'model',
          text: data.reply!,
          timestamp: replyTime,
          modelUsed: data.modelUsed,
        },
      ]);
    } catch (err) {
      const errText =
        err instanceof Error
          ? `Gagal terhubung ke server Gemini AI: ${err.message}`
          : 'Gagal terhubung ke server Gemini AI. Periksa koneksi lalu coba lagi.';
      setErrorMsg(errText);
      setLastFailedQuestion(cleaned);
    } finally {
      setSending(false);
    }
  };

  const handleRetryLast = () => {
    if (!lastFailedQuestion || sending) return;
    // Hapus pesan user terakhir yang gagal agar tidak duplikat saat mengirim ulang
    setMessages((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].role === 'user') {
        return prev.slice(0, -1);
      }
      return prev;
    });
    const retryText = lastFailedQuestion;
    setTimeout(() => {
      void sendQuestion(retryText);
    }, 0);
  };

  const handleResetChat = () => {
    setMessages([]);
    setErrorMsg(null);
    setLastFailedQuestion(null);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* PANEL KIRI: Fokus Topik, Konteks Kegiatan & Pertanyaan Cepat */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-[84px]">
          <div className="bg-white border border-[#dee2e6] rounded-xl p-4 space-y-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#0f6cbf] text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-extrabold text-[#212529] leading-tight">
                  QnA & Chatbot Gemini AI
                </h1>
                <p className="text-[11px] text-[#6c757d]">
                  Digitalisasi Pembelajaran & Kebijakan
                </p>
              </div>
            </div>

            {/* Pemilih Konteks Kegiatan LMS */}
            <div className="pt-2 border-t border-[#e9ecef] space-y-1.5">
              <label
                htmlFor="qna-training-context"
                className="block text-[11px] font-bold text-[#495057]"
              >
                Tautkan Konteks Materi Kegiatan
              </label>
              <select
                id="qna-training-context"
                value={selectedTrainingId}
                onChange={(e) => setSelectedTrainingId(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-[#ced4da] rounded-lg text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#0f6cbf]"
              >
                <option value="">Umum (Digitalisasi & Kebijakan)</option>
                {visibleTrainings.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} — {t.name}
                  </option>
                ))}
              </select>
              {activeTraining && (
                <p className="text-[11px] text-[#6c757d] leading-snug">
                  {activeTrainingMaterials.length} materi aktif terhubung sebagai referensi jawaban AI.
                </p>
              )}
            </div>

            {/* Fokus Topik */}
            <div className="pt-2 border-t border-[#e9ecef] space-y-1.5">
              <p className="text-[11px] font-bold text-[#495057]">Fokus Pembahasan</p>
              <div className="space-y-1">
                {TOPIC_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = topic === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTopic(opt.id)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg border transition-colors flex items-start gap-2 ${
                        active
                          ? 'bg-[#e7f1fa] border-[#9ec5fe] text-[#0b5394]'
                          : 'bg-white border-transparent hover:bg-[#f8f9fa] text-[#495057]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-tight">{opt.label}</p>
                        <p className="text-[10.5px] text-[#6c757d] leading-snug mt-0.5">
                          {opt.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {activeTraining && (
              <div className="pt-2 border-t border-[#e9ecef]">
                <Link
                  to={`/kegiatan?training=${activeTraining.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f6cbf] hover:underline"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Kembali ke Ruang Kegiatan
                </Link>
              </div>
            )}
          </div>
        </aside>

        {/* PANEL KANAN: Ruang Percakapan Chatbot Gemini AI */}
        <section className="lg:col-span-8 xl:col-span-9 bg-white border border-[#dee2e6] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col min-h-[calc(100vh-140px)] max-h-[calc(100vh-116px)] overflow-hidden">
          {/* Header Chat */}
          <div className="px-5 py-3.5 border-b border-[#e9ecef] bg-[#f8f9fa] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#e7f1fa] border border-[#b6d4fe] text-[#0f6cbf] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-[#212529]">
                    Asisten QnA PAMANDAI EDU
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#e7f1fa] text-[#0b5394] text-[10.5px] font-semibold">
                    <Sparkles className="w-3 h-3" />
                    Ditautkan Gemini AI
                  </span>
                </div>
                <p className="text-[11px] text-[#6c757d] truncate">
                  {activeTraining
                    ? `Konteks aktif: ${activeTraining.code} — ${activeTraining.name}`
                    : 'Tanya jawab seputar Digitalisasi Pembelajaran, SAMR, PID & Kebijakan Pendidikan'}
                </p>
              </div>
            </div>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleResetChat}
                disabled={sending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#495057] bg-white hover:bg-[#f1f3f5] border border-[#ced4da] rounded-lg transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Percakapan Baru
              </button>
            )}
          </div>

          {/* Area Pesan */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-[#fcfdff]">
            {messages.length === 0 ? (
              <div className="max-w-2xl mx-auto py-4 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#e7f1fa] border border-[#b6d4fe] text-[#0f6cbf] flex items-center justify-center mx-auto">
                    <MessageSquareText className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-extrabold text-[#212529]">
                    Ada yang ingin ditanyakan tentang Digitalisasi Pembelajaran?
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6c757d] leading-relaxed">
                    Ajukan pertanyaan terkait materi pelatihan, model adaptif 4 Level SAMR,
                    pemanfaatan Papan Interaktif Digital (PID), kebijakan transformasi digital
                    pendidikan, tata kelola BAST perangkat TIK, atau panduan aktivitas di LMS.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-[#495057]">
                    Contoh Pertanyaan yang Sering Diajukan
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {QUICK_PROMPTS.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        disabled={sending}
                        onClick={() => void sendQuestion(item.question, item.topic)}
                        className="text-left p-3.5 rounded-xl bg-white border border-[#dee2e6] hover:border-[#0f6cbf] hover:bg-[#f8fbff] transition-colors space-y-1 group"
                      >
                        <p className="text-xs font-bold text-[#0b5394] group-hover:text-[#0f6cbf]">
                          {item.label}
                        </p>
                        <p className="text-[11.5px] text-[#6c757d] line-clamp-2 leading-snug">
                          {item.question}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded-lg bg-[#e7f1fa] border border-[#b6d4fe] text-[#0f6cbf] flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`max-w-[86%] sm:max-w-[78%] rounded-xl px-4 py-3 ${
                          isUser
                            ? 'bg-[#0f6cbf] text-white shadow-xs'
                            : 'bg-white border border-[#dee2e6] text-[#212529] shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
                        }`}
                      >
                        {isUser ? (
                          <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">
                            {msg.text}
                          </p>
                        ) : (
                          <FormattedAssistantText text={msg.text} />
                        )}
                        <div
                          className={`mt-2 flex items-center justify-between gap-3 text-[10.5px] ${
                            isUser ? 'text-blue-100' : 'text-[#6c757d]'
                          }`}
                        >
                          <span>{isUser ? currentUser?.fullName || 'Anda' : 'Asisten Gemini AI'}</span>
                          <span>{msg.timestamp}</span>
                        </div>
                      </div>

                      {isUser && (
                        <div className="w-8 h-8 rounded-lg bg-[#0b5394] text-white flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {sending && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#e7f1fa] border border-[#b6d4fe] text-[#0f6cbf] flex items-center justify-center shrink-0">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="bg-white border border-[#dee2e6] rounded-xl px-4 py-3 text-xs text-[#495057] flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0f6cbf]" />
                      Gemini AI sedang menyusun jawaban sesuai materi & kebijakan...
                    </div>
                  </div>
                )}
              </>
            )}

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex flex-wrap items-center justify-between gap-3 text-xs text-red-800">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
                {lastFailedQuestion && (
                  <button
                    type="button"
                    onClick={handleRetryLast}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
                  >
                    Coba Kirim Ulang
                  </button>
                )}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Pertanyaan */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendQuestion(input);
            }}
            className="p-4 border-t border-[#e9ecef] bg-white space-y-2"
          >
            <div className="flex items-end gap-2.5">
              <textarea
                rows={2}
                value={input}
                disabled={sending}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendQuestion(input);
                  }
                }}
                placeholder="Tulis pertanyaan Anda tentang materi Digitalisasi Pembelajaran, SAMR, PID, atau kebijakan terkait... (Tekan Enter untuk kirim)"
                className="flex-1 px-3.5 py-2.5 text-sm bg-[#f8f9fa] border border-[#ced4da] rounded-xl text-[#212529] placeholder:text-[#6c757d] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f6cbf] resize-none"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 text-xs sm:text-sm font-semibold text-white bg-[#0f6cbf] hover:bg-[#0b5394] disabled:bg-[#adb5bd] rounded-xl shadow-xs transition-colors shrink-0"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Kirim
              </button>
            </div>
            <p className="text-[11px] text-[#6c757d]">
              Jawaban disusun menggunakan <strong>Gemini AI</strong> berdasarkan ruang lingkup
              Digitalisasi Pembelajaran, kebijakan pendidikan terkait, dan materi kegiatan aktif.
              Untuk nomor peraturan resmi terbaru, selalu konfirmasi melalui kanal resmi Kemendikdasmen.
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
