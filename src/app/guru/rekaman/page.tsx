"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/ui/api";
import { LogoutButton } from "@/lib/ui/logout-button";
import { UserProfileMenu } from "@/lib/ui/user-profile-menu";

type Candidate = {
  id: string;
  type: string;
  label: string;
  time: string;
  timestampSec: number;
  verified: boolean;
  rejected?: boolean;
};

type Session = { id: string; child_id: string; status: string; created_at: string };
type Child = { id: string; display_name: string; grade: string };
type AiAnnotation = { id: string; annotation_type: string; observed_text: string | null; audio_start_ms: number | null };
type AiPayload = {
  analyses?: Array<{ recording_id: string; status: string; task_attempt_id?: string; ai_annotations: AiAnnotation[] }>;
  recordings?: Array<{ id: string }>;
};
type AiState = "none" | "ready" | "running" | "done" | "manual";

const LABELS: Record<string, string> = {
  substitution: "Dugaan Penggantian",
  omission: "Penghilangan",
  repetition: "Pengulangan",
  hesitation: "Keraguan / jeda",
  unclear: "Kurang jelas",
};
const mmss = (ms: number | null) => {
  const s = Math.floor((ms ?? 0) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
// "match" is not a finding; only deviations become candidates for the teacher to verify.
const toCandidates = (anns: AiAnnotation[]): Candidate[] =>
  anns
    .filter((a) => a.annotation_type !== "match")
    .sort((a, b) => (a.audio_start_ms ?? 0) - (b.audio_start_ms ?? 0))
    .map((a) => {
      const sec = Math.floor((a.audio_start_ms ?? 0) / 1000);
      return {
        id: a.id,
        type: a.annotation_type,
        label: `${LABELS[a.annotation_type] ?? a.annotation_type}${a.observed_text ? `: "${a.observed_text}"` : ""}`,
        time: mmss(a.audio_start_ms),
        timestampSec: sec,
        verified: false,
      };
    });

const DEFAULT_CANDIDATES: Candidate[] = [
  { id: "c1", type: "substitution", label: "Dugaan Penggantian", time: "00:04", timestampSec: 4, verified: false },
  { id: "c2", type: "repetition", label: "Pengulangan", time: "00:12", timestampSec: 12, verified: false },
  { id: "c3", type: "omission", label: "Penghilangan", time: "00:22", timestampSec: 22, verified: false },
];

function TeacherRecordingReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramSessionId = searchParams.get("session") ?? "";

  const [sessionId, setSessionId] = useState(paramSessionId);
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.75 | 1>(1);
  const [currentTime, setCurrentTime] = useState(18); // Default 18s matching Frame 18 mock
  const [duration, setDuration] = useState(42);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  // Reference text
  const [promptTitle] = useState("Budi pergi ke kebun bersama Ibu.");
  const [promptSentences] = useState([
    { text: "Di kebun ada pohon kelapa.", start: 0, end: 12 },
    { text: "Budi melihat buah kelapa jatuh.", start: 12, end: 26 },
    { text: "Ibu membawa kelapa ke rumah.", start: 26, end: 42 },
  ]);

  // AI Candidates
  const [candidates, setCandidates] = useState<Candidate[]>(DEFAULT_CANDIDATES);

  // Rubric state
  const [rubricAccuracy, setRubricAccuracy] = useState(true);
  const [rubricFluency, setRubricFluency] = useState(true);
  const [rubricAudioQuality, setRubricAudioQuality] = useState(true);
  const [taskAttemptId, setTaskAttemptId] = useState("");
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [aiState, setAiState] = useState<AiState>("none");
  const [aiMessage, setAiMessage] = useState("");

  // Manual note state
  const [manualNote, setManualNote] = useState("");
  const [showAddManual, setShowAddManual] = useState(false);

  async function runAi() {
    if (!sessionId || !recordingId) return;
    setAiState("running"); setAiMessage("");
    const res = await api<{ status?: string; message?: string }>(`/api/assessment-sessions/${sessionId}/ai/dispatch`, {
      recordingId,
      idempotencyKey: `ai-${recordingId}-${Date.now()}`,
    });
    if (!res.ok || res.data.status !== "completed") {
      setAiState("manual");
      return setAiMessage(res.data.error ?? res.data.message ?? "Analisis AI belum tersedia. Lanjutkan peninjauan manual.");
    }
    const fresh = await api<AiPayload>(`/api/assessment-sessions/${sessionId}/ai`);
    const done = fresh.data.analyses?.find((a) => a.status === "completed");
    setCandidates(done ? toCandidates(done.ai_annotations) : []);
    setAiState("done");
  }

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      const [modeRes, sessRes, kidsRes] = await Promise.all([
        api<{ mode?: string }>("/api/teacher-mode/status"),
        api<{ sessions?: Session[] }>("/api/assessment-sessions"),
        api<{ children?: Child[] }>("/api/children"),
      ]);

      if (!alive) return;
      if (modeRes.status === 401 || sessRes.status === 401) return router.replace("/masuk");
      if (modeRes.data.mode === "student") return router.replace("/siswa");

      const sessList = sessRes.data.sessions ?? [];
      const activeSessId = paramSessionId || (sessList[0]?.id ?? "");
      setSessionId(activeSessId);

      const currentSess = sessList.find((s) => s.id === activeSessId);
      if (currentSess) {
        const foundChild = (kidsRes.data.children ?? []).find((c) => c.id === currentSess.child_id);
        if (foundChild) setChild(foundChild);
      }

      // Load task attempts and recordings if available
      if (activeSessId) {
        const aiRes = await api<AiPayload>(`/api/assessment-sessions/${activeSessId}/ai`);
        if (!alive) return;
        const done = aiRes.data.analyses?.find((a) => a.status === "completed");
        if (done) setCandidates(toCandidates(done.ai_annotations));
        const first = aiRes.data.analyses?.[0];
        if (first?.task_attempt_id) setTaskAttemptId(first.task_attempt_id);
        const recId = done?.recording_id ?? aiRes.data.recordings?.[0]?.id;
        setRecordingId(recId ?? null);
        setAiState(done ? "done" : recId ? "ready" : "none");

        if (recId) {
          const playRes = await api<{ playbackUrl: string; durationMs: number }>(
            `/api/assessment-sessions/${activeSessId}/recordings/${recId}`
          );
          if (playRes.ok && playRes.data.playbackUrl) {
            setPlaybackUrl(playRes.data.playbackUrl);
            if (playRes.data.durationMs) setDuration(Math.round(playRes.data.durationMs / 1000));
          }
        }
      }
      setLoading(false);
    }
    void load();
    return () => {
      alive = false;
    };
  }, [paramSessionId, router]);

  function togglePlay() {
    if (!audioRef.current) {
      setPlaying(!playing);
      return;
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      void audioRef.current.play();
      setPlaying(true);
    }
  }

  function changeSpeed(speed: 0.75 | 1) {
    setPlaybackSpeed(speed);
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }

  function seekTo(sec: number) {
    setCurrentTime(sec);
    if (audioRef.current) {
      audioRef.current.currentTime = sec;
    }
  }

  function verifyCandidate(id: string) {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, verified: !c.verified, rejected: false } : c))
    );
  }

  function rejectCandidate(id: string) {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, rejected: !c.rejected, verified: false } : c))
    );
  }

  function addManualCandidate() {
    if (!manualNote.trim()) return;
    const m = Math.floor(currentTime / 60).toString().padStart(2, "0");
    const s = Math.floor(currentTime % 60).toString().padStart(2, "0");
    const newCand: Candidate = {
      id: `manual-${Date.now()}`,
      type: "manual",
      label: manualNote.trim(),
      time: `${m}:${s}`,
      timestampSec: Math.floor(currentTime),
      verified: true,
    };
    setCandidates([...candidates, newCand]);
    setManualNote("");
    setShowAddManual(false);
  }

  async function saveReview() {
    if (!sessionId) return;
    setBusy(true);
    setMessage("");

    const verifiedAnnotations = candidates
      .filter((c) => c.verified)
      .map((c) => ({
        finding: c.type,
        note: `${c.label} diverifikasi oleh guru pada ${c.time}`,
        evidenceLocation: c.time,
        recordingId: null,
      }));

    // Save review draft to backend API
    await api<{ reviewRevisionId?: string }>("/api/assessment-sessions/" + sessionId + "/reviews", {
      taskAttemptId: taskAttemptId || "00000000-0000-0000-0000-000000000000",
      rubricResult: {
        accuracyChecked: rubricAccuracy,
        fluencyNoted: rubricFluency,
        audioQualityAdequate: rubricAudioQuality,
      },
      annotations: verifiedAnnotations,
    });

    setBusy(false);
    router.push(`/guru/laporan?session=${sessionId}`);
  }

  const verifiedCount = candidates.filter((c) => c.verified).length;
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = Math.floor(secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Synthetic waveform bars generator (36 bars matching Frame 18 visualizer)
  const waveformHeights = [
    14, 22, 28, 16, 32, 40, 24, 18, 36, 42, 30, 20, 26, 34, 44, 38, 22, 16,
    30, 42, 36, 24, 18, 28, 38, 40, 32, 22, 16, 26, 34, 40, 28, 18, 24, 14,
  ];

  return (
    <div className="shell" data-ui="true">
      {/* Sidebar matching Frame 18 */}
      <aside className="sidebar">
        <div>
          <Image className="brand" src="/brand/logo-horizontal.svg" alt="Dyscovery" width={152} height={37} priority />
          <p className="role-tag">Ruang guru</p>
        </div>
        <nav className="nav" aria-label="Menu guru">
          <Link href="/guru/siswa">Daftar siswa</Link>
          <Link href="/guru/rekaman" aria-current="page">Tinjau rekaman</Link>
          <Link href="/guru/laporan">Laporan observasi</Link>
          <Link href="/operator">Ruang operator</Link>
          <Link href="/orangtua/laporan">Portal orang tua</Link>
        </nav>
        <div className="sidebar-notice">
          <p className="sidebar-notice-title">Privasi siswa</p>
          <p className="sidebar-notice-text">Rekaman hanya untuk peninjauan guru.</p>
        </div>
        <div className="sidebar-bottom">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Workspace (Frame 18: S12) */}
      <main className="workspace">
        <header className="portal-subbar">
          <span className="subbar-meta">Portal Guru • Kelas 2A / Tahun ajaran 2026–2027</span>
          <UserProfileMenu />
        </header>

        <div className="page-heading">
          <div className="heading-split">
            <div>
              <h1>Tinjau rekaman membaca</h1>
              <p className="muted">
                {child ? `${child.display_name} / Kelas ${child.grade}` : "Bima Aditia / Kelas 2A"} / Sesi 30 Oktober 2026
              </p>
            </div>
            <span className={`badge ${verifiedCount > 0 ? "ready" : "none"}`}>
              {verifiedCount > 0 ? `${verifiedCount} anotasi disetujui` : "Belum diverifikasi"}
            </span>
          </div>
        </div>

        {loading ? (
          <p className="empty" role="status">Memuat data rekaman…</p>
        ) : (
          <div className="review-grid">
            {/* Left Card: Audio Player, Waveform & Reference Text (Frame 18 / Node 819) */}
            <section className="card review-card" aria-labelledby="playback-heading">
              <div className="card-head">
                <h2 id="playback-heading">Rekaman & teks acuan</h2>
                <p className="muted small">Cuplikan ilustratif • bukan rekaman siswa</p>
              </div>

              {/* Custom Player Controls & Waveform */}
              <div className="audio-control-box">
                <audio
                  ref={audioRef}
                  src={playbackUrl ?? undefined}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onEnded={() => setPlaying(false)}
                />

                <div className="audio-player-top-row">
                  <button
                    type="button"
                    className="btn primary"
                    onClick={togglePlay}
                    style={{ minWidth: 90 }}
                    aria-label={playing ? "Jeda pemutaran" : "Putar rekaman"}
                  >
                    {playing ? "Jeda" : "Putar"}
                  </button>
                  <div className="speed-toggles">
                    <button
                      type="button"
                      className={`btn-speed ${playbackSpeed === 0.75 ? "active" : ""}`}
                      onClick={() => changeSpeed(0.75)}
                    >
                      0.75x
                    </button>
                    <button
                      type="button"
                      className={`btn-speed ${playbackSpeed === 1 ? "active" : ""}`}
                      onClick={() => changeSpeed(1)}
                    >
                      1x
                    </button>
                  </div>
                  <span className="audio-timer">
                    {formatTime(currentTime)} / {formatTime(duration)} • Ilustrasi
                  </span>
                </div>

                {/* Interactive Waveform Bar Visualizer */}
                <div
                  className="waveform-bar-container"
                  role="slider"
                  aria-label="Posisi rekaman suara"
                  aria-valuenow={currentTime}
                  aria-valuemin={0}
                  aria-valuemax={duration}
                >
                  {waveformHeights.map((h, i) => {
                    const barTime = (i / waveformHeights.length) * duration;
                    const isPlayed = barTime <= currentTime;
                    return (
                      <button
                        key={i}
                        type="button"
                        className={`waveform-bar ${isPlayed ? "played" : ""}`}
                        style={{ height: `${h}px` }}
                        onClick={() => seekTo(barTime)}
                        title={`Lompat ke ${formatTime(barTime)}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Reference Text Card with Synchronized Active Sentence */}
              <div className="reference-text-box">
                <h3 className="reference-title">{promptTitle}</h3>
                <div className="reference-body">
                  {promptSentences.map((sent, idx) => {
                    const isCurrent = currentTime >= sent.start && currentTime <= sent.end;
                    return (
                      <p
                        key={idx}
                        className={`sentence-line ${isCurrent ? "highlight-active" : ""}`}
                        onClick={() => seekTo(sent.start)}
                        title="Klik untuk dengarkan bagian ini"
                      >
                        {sent.text}
                      </p>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Right Card: AI Candidates & Observation Rubric (Frame 18 / Node 897) */}
            <section className="card review-card" aria-labelledby="ai-heading">
              <div className="card-head">
                <h2 id="ai-heading">Kandidat anotasi AI</h2>
                <p className="muted small">
                  Dugaan, bukan kesimpulan. Dengarkan ulang sebelum menerima atau menolak.
                </p>
              </div>

              {(aiState === "ready" || aiState === "running" || aiState === "manual") && (
                <button type="button" className="btn accent" disabled={aiState === "running"} onClick={() => void runAi()}>
                  {aiState === "running" ? "AI sedang mendengarkan…" : "Analisis rekaman dengan AI"}
                </button>
              )}
              {aiState === "none" && <p className="muted small">Pratinjau awal • belum ada rekaman siswa untuk sesi ini.</p>}
              {aiState === "done" && candidates.length === 0 && <p className="muted small">AI tidak menemukan penyimpangan. Tetap dengarkan ulang rekaman.</p>}
              {aiMessage && <p className="notice warn" role="alert">{aiMessage}</p>}

              {/* AI Candidates List */}
              <div className="candidate-list" aria-busy={aiState === "running"}>
                {candidates.map((c) => (
                  <div key={c.id} className={`candidate-item ${c.verified ? "verified-row" : c.rejected ? "rejected-row" : ""}`}>
                    <div className="candidate-info">
                      <span className="candidate-badge">{c.label}</span>
                      <button
                        type="button"
                        className="candidate-timestamp"
                        onClick={() => seekTo(c.timestampSec)}
                        title="Putar dari detik ini"
                      >
                        ({c.time}) ⏵
                      </button>
                    </div>
                    <div className="candidate-actions">
                      <button
                        type="button"
                        className={`btn-check ${c.verified ? "checked" : ""}`}
                        onClick={() => verifyCandidate(c.id)}
                        aria-pressed={c.verified}
                      >
                        {c.verified ? "Diverifikasi" : "Cek"}
                      </button>
                      <button
                        type="button"
                        className={`btn-reject ${c.rejected ? "rejected" : ""}`}
                        onClick={() => rejectCandidate(c.id)}
                        aria-label="Tolak kandidat ini"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Manual Annotation */}
              {!showAddManual ? (
                <button
                  type="button"
                  className="btn-add-manual"
                  onClick={() => setShowAddManual(true)}
                >
                  + Tambah catatan manual guru
                </button>
              ) : (
                <div className="manual-annotation-form">
                  <input
                    type="text"
                    placeholder="Tuliskan catatan observasi guru..."
                    value={manualNote}
                    onChange={(e) => setManualNote(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
                    <button type="button" className="btn secondary" style={{ minHeight: 36, padding: "4px 12px", fontSize: 13 }} onClick={() => setShowAddManual(false)}>Batal</button>
                    <button type="button" className="btn primary" style={{ minHeight: 36, padding: "4px 12px", fontSize: 13 }} onClick={addManualCandidate}>Simpan</button>
                  </div>
                </div>
              )}

              <hr className="card-divider" />

              {/* Observation Rubric matching Frame 18 */}
              <div className="rubric-block">
                <h3>Rubrik observasi</h3>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={rubricAccuracy}
                    onChange={(e) => setRubricAccuracy(e.target.checked)}
                  />
                  <span>Ketepatan bunyi diperiksa</span>
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={rubricFluency}
                    onChange={(e) => setRubricFluency(e.target.checked)}
                  />
                  <span>Kelancaran membaca dicatat</span>
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={rubricAudioQuality}
                    onChange={(e) => setRubricAudioQuality(e.target.checked)}
                  />
                  <span>Kualitas audio memadai</span>
                </label>
              </div>

              {/* Action Box */}
              <div className="review-action-box">
                <button
                  type="button"
                  className="btn primary"
                  style={{ width: "100%", minHeight: 52, fontSize: 16 }}
                  disabled={busy}
                  onClick={() => void saveReview()}
                >
                  {busy ? "Menyimpan…" : "Simpan & susun laporan"}
                </button>
                <p className="muted small" style={{ textAlign: "center", marginTop: 8 }}>
                  {verifiedCount > 0
                    ? `${verifiedCount} anotasi disetujui untuk laporan.`
                    : "Belum ada anotasi yang disetujui."}
                </p>
              </div>
              {message && <p className="notice error">{message}</p>}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TeacherRecordingReview() {
  return (
    <Suspense fallback={<p className="empty" role="status">Memuat halaman peninjauan…</p>}>
      <TeacherRecordingReviewContent />
    </Suspense>
  );
}
