"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/ui/api";
import { LogoutButton } from "@/lib/ui/logout-button";

type Candidate = { id: string; type: string; label: string; time: string; verified: boolean };
type Session = { id: string; child_id: string; status: string; created_at: string };
type Child = { id: string; display_name: string; grade: string };

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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(42);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  // Reference text
  const [promptTitle] = useState("Budi pergi ke kebun bersama Ibu.");
  const [promptText] = useState(
    "Di kebun ada pohon kelapa. Budi melihat buah kelapa jatuh. Ibu membawa kelapa ke rumah."
  );

  // AI Candidates
  const [candidates, setCandidates] = useState<Candidate[]>([
    { id: "c1", type: "substitution", label: "Dugaan Penggantian", time: "00:04", verified: false },
    { id: "c2", type: "repetition", label: "Pengulangan", time: "00:12", verified: false },
    { id: "c3", type: "omission", label: "Penghilangan", time: "00:22", verified: false },
  ]);

  // Rubric state
  const [rubricAccuracy, setRubricAccuracy] = useState(true);
  const [rubricFluency, setRubricFluency] = useState(true);
  const [rubricAudioQuality, setRubricAudioQuality] = useState(true);
  const [taskAttemptId] = useState("");

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
      // ponytail: fallback prototype audio and annotations; upgrade when live WebRTC/streaming is connected.
      if (activeSessId) {
        const aiRes = await api<{
          analyses?: Array<{
            recording_id: string;
            ai_annotations: Array<{ id: string; annotation_type: string; observed_text: string }>;
          }>;
        }>(`/api/assessment-sessions/${activeSessId}/ai`);

        if (aiRes.ok && aiRes.data.analyses && aiRes.data.analyses.length > 0) {
          const recId = aiRes.data.analyses[0].recording_id;
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
      }
      setLoading(false);
    }
    void load();
    return () => {
      alive = false;
    };
  }, [paramSessionId, router]);

  function togglePlay() {
    if (!audioRef.current) return;
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

  function toggleCandidate(id: string) {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, verified: !c.verified } : c))
    );
  }

  async function saveReview() {
    if (!sessionId) return;
    setBusy(true);
    setMessage("");

    const verifiedAnnotations = candidates
      .filter((c) => c.verified)
      .map((c) => ({
        finding: c.type,
        note: `Terverifikasi oleh guru pada ${c.time}`,
        evidenceLocation: c.time,
        recordingId: null,
      }));

    // Save review draft
    const res = await api<{ reviewRevisionId?: string }>("/api/assessment-sessions/" + sessionId + "/reviews", {
      taskAttemptId: taskAttemptId || "00000000-0000-0000-0000-000000000000",
      rubricResult: {
        accuracyChecked: rubricAccuracy,
        fluencyNoted: rubricFluency,
        audioQualityAdequate: rubricAudioQuality,
      },
      annotations: verifiedAnnotations,
    });

    setBusy(false);
    if (!res.ok) {
      // In prototype mode with synthetic task attempt fallback
      router.push(`/guru/laporan?session=${sessionId}`);
      return;
    }

    router.push(`/guru/laporan?session=${sessionId}`);
  }

  const verifiedCount = candidates.filter((c) => c.verified).length;
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = Math.floor(secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <Image className="brand" src="/brand/logo-horizontal.svg" alt="Dyscovery" width={152} height={37} priority />
          <p className="role-tag">Ruang guru</p>
        </div>
        <nav className="nav" aria-label="Menu guru">
          <Link href="/guru/siswa">Daftar siswa</Link>
          <Link href="/guru/rekaman" aria-current="page">Tinjau rekaman</Link>
          <Link href="/guru/laporan">Laporan observasi</Link>
        </nav>
        <div className="sidebar-notice">
          <p className="sidebar-notice-title">Privasi siswa</p>
          <p className="sidebar-notice-text">Rekaman hanya untuk peninjauan guru.</p>
        </div>
        <div className="sidebar-bottom">
          <LogoutButton />
        </div>
      </aside>

      <main className="workspace">
        <header className="portal-subbar">
          <span className="subbar-meta">Portal Guru • Kelas 2A / Tahun ajaran 2026–2027</span>
          <div className="user-badge" aria-label="Profil guru">GR</div>
        </header>

        <div className="page-heading">
          <div className="heading-split">
            <div>
              <h1>Tinjau rekaman membaca</h1>
              <p className="muted">
                {child ? `${child.display_name} / Kelas ${child.grade}` : "Siswa Contoh A / Kelas 2A"} • Sesi 29 Oktober 2026
              </p>
            </div>
            <span className="badge ready">
              {verifiedCount > 0 ? `${verifiedCount} anotasi disetujui` : "Belum diverifikasi"}
            </span>
          </div>
        </div>

        {loading ? (
          <p className="empty" role="status">Memuat data rekaman…</p>
        ) : (
          <div className="review-grid">
            {/* Left Card: Audio Player & Reference Text (Frame 18 / Node 819) */}
            <section className="card review-card" aria-labelledby="playback-heading">
              <div className="card-head">
                <h2 id="playback-heading">Rekaman & teks acuan</h2>
                <p className="muted small">Cuplikan ilustratif • bukan rekaman siswa</p>
              </div>

              {/* Custom Player Controls */}
              <div className="audio-control-box">
                <audio
                  ref={audioRef}
                  src={playbackUrl ?? undefined}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onEnded={() => setPlaying(false)}
                />
                <button
                  type="button"
                  className="btn primary"
                  onClick={togglePlay}
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

              {/* Reference Text Card */}
              <div className="reference-text-box">
                <h3 className="reference-title">{promptTitle}</h3>
                <p className="reference-body">{promptText}</p>
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

              {/* AI Candidates List */}
              <div className="candidate-list">
                {candidates.map((c) => (
                  <div key={c.id} className="candidate-item">
                    <span className="candidate-badge">{c.label} ({c.time})</span>
                    <button
                      type="button"
                      className={`btn-check ${c.verified ? "checked" : ""}`}
                      onClick={() => toggleCandidate(c.id)}
                      aria-pressed={c.verified}
                    >
                      {c.verified ? "Diverifikasi ✓" : "Cek"}
                    </button>
                  </div>
                ))}
              </div>

              <hr className="card-divider" />

              {/* Rubric */}
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
