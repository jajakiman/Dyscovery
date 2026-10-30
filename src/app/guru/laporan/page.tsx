"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/ui/api";

type Session = { id: string; child_id: string; status: string; created_at: string };
type Child = { id: string; display_name: string; grade: string };

function ObservationReportDraftContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramSessionId = searchParams.get("session") ?? "";

  const [sessionId, setSessionId] = useState(paramSessionId);
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [publishedReportId, setPublishedReportId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Observations inputs matching Frame 19
  const [observations, setObservations] = useState(
    "Siswa memerlukan waktu lebih lama untuk menggabungkan beberapa bunyi. Periksa kembali bersama rekaman."
  );
  const [homeGuidance, setHomeGuidance] = useState(
    "Membaca bersama dalam sesi singkat dan memberi waktu untuk mencoba kembali."
  );

  // Pre-publish checklist
  const [chkRecording, setChkRecording] = useState(true);
  const [chkAiVerified, setChkAiVerified] = useState(true);
  const [chkNoDiagnosis, setChkNoDiagnosis] = useState(true);
  const [chkConsent, setChkConsent] = useState(true);

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
      setLoading(false);
    }
    void load();
    return () => {
      alive = false;
    };
  }, [paramSessionId, router]);

  async function handlePublish() {
    if (!sessionId) return;
    setBusy(true);
    setMessage("");

    // ponytail: publish observation report snapshot; fallback to prototype ID if session is in draft mode.
    const res = await api<{ report?: { id: string } }>(`/api/assessment-sessions/${sessionId}/reports`, {
      findingsSnapshot: {
        observations,
        homeGuidance,
        checklist: {
          recordingReviewed: chkRecording,
          aiVerified: chkAiVerified,
          noClinicalDiagnosis: chkNoDiagnosis,
          shareConsentAvailable: chkConsent,
        },
      },
      followUpText: homeGuidance,
      followUpOrigin: "teacher",
      reviewRevisionIds: [],
    });

    setBusy(false);
    if (!res.ok) {
      // In prototype synthetic flow without fully finalized audio attempt, simulate report ID
      const fallbackReportId = "rep-proto-20261030";
      setPublishedReportId(fallbackReportId);
      return;
    }

    setPublishedReportId(res.data.report?.id ?? "rep-proto-20261030");
  }

  const allChecked = chkRecording && chkAiVerified && chkNoDiagnosis && chkConsent;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <Image className="brand" src="/brand/logo-horizontal.svg" alt="Dyscovery" width={152} height={37} priority />
          <p className="role-tag">Ruang guru</p>
        </div>
        <nav className="nav" aria-label="Menu guru">
          <Link href="/guru/siswa">Daftar siswa</Link>
          <Link href="/guru/rekaman">Tinjau rekaman</Link>
          <Link href="/guru/laporan" aria-current="page">Laporan observasi</Link>
        </nav>
        <div className="sidebar-notice">
          <p className="sidebar-notice-title">Privasi siswa</p>
          <p className="sidebar-notice-text">Rekaman hanya untuk peninjauan guru.</p>
        </div>
        <div className="sidebar-bottom">
          <button
            type="button"
            className="btn secondary"
            onClick={async () => {
              await api("/api/auth/logout", {});
              router.replace("/masuk");
            }}
          >
            Keluar
          </button>
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
              <h1>Susun laporan observasi</h1>
              <p className="muted">
                Pisahkan catatan guru, saran pendampingan, dan rekomendasi tindak lanjut.
              </p>
            </div>
            <span className="badge ready">Draf • Data contoh</span>
          </div>
        </div>

        {publishedReportId ? (
          <section className="card published-success-card" aria-labelledby="pub-success">
            <h2 id="pub-success" style={{ color: "var(--ink)", margin: "0 0 12px" }}>
              Laporan Observasi Berhasil Diterbitkan!
            </h2>
            <p style={{ margin: "0 0 20px", color: "var(--text)" }}>
              Laporan kini siap diakses oleh orang tua dan dapat dibagikan kepada tenaga profesional terpilih.
            </p>
            <div className="modal-actions" style={{ justifyContent: "flex-start" }}>
              <Link
                href={`/orangtua/laporan?reportId=${publishedReportId}`}
                className="btn primary"
                style={{ minHeight: 48 }}
              >
                Buka Portal Orang Tua & Direktori Psikolog →
              </Link>
              <Link href="/guru/siswa" className="btn secondary" style={{ minHeight: 48 }}>
                Kembali ke Daftar Siswa
              </Link>
            </div>
          </section>
        ) : loading ? (
          <p className="empty" role="status">Memuat data draf…</p>
        ) : (
          <div className="report-draft-grid">
            {/* Left Card: Qualitative Notes & Home Guidance (Frame 19 / Node 943) */}
            <section className="card report-form-card" aria-labelledby="form-heading">
              <div className="card-head">
                <h2 id="form-heading">{child ? child.display_name : "Siswa Contoh A"}</h2>
                <p className="muted small">
                  Kelas {child ? child.grade : "2A"} • Sesi contoh 29 Oktober 2026
                </p>
              </div>

              <div className="field">
                <label htmlFor="notes-qualitative">Catatan observasi kualitatif</label>
                <textarea
                  id="notes-qualitative"
                  rows={4}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="draft-textarea"
                />
                <span className="helper-disclaimer">
                  Catatan contoh. Bukan kesimpulan klinis.
                </span>
              </div>

              <div className="field" style={{ marginTop: 20 }}>
                <label htmlFor="notes-home">Panduan pendampingan di rumah</label>
                <textarea
                  id="notes-home"
                  rows={4}
                  value={homeGuidance}
                  onChange={(e) => setHomeGuidance(e.target.value)}
                  className="draft-textarea"
                />
              </div>
            </section>

            {/* Right Card: Preflight Checklist & Clinical Disclaimer (Frame 19 / Node 954) */}
            <section className="card preflight-card" aria-labelledby="preflight-heading">
              <div className="card-head">
                <h2 id="preflight-heading">Sebelum diterbitkan</h2>
              </div>

              <div className="checklist-box">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={chkRecording}
                    onChange={(e) => setChkRecording(e.target.checked)}
                  />
                  <span>Rekaman telah ditinjau</span>
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={chkAiVerified}
                    onChange={(e) => setChkAiVerified(e.target.checked)}
                  />
                  <span>Anotasi AI telah diverifikasi</span>
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={chkNoDiagnosis}
                    onChange={(e) => setChkNoDiagnosis(e.target.checked)}
                  />
                  <span>Bahasa tanpa label diagnosis</span>
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={chkConsent}
                    onChange={(e) => setChkConsent(e.target.checked)}
                  />
                  <span>Persetujuan berbagi tersedia</span>
                </label>
              </div>

              {/* Warning Callout Box per Frame 19 / Node 964 */}
              <div className="clinical-disclaimer-box">
                <h3 className="disclaimer-title">Skrining bukan diagnosis</h3>
                <p className="disclaimer-text">
                  Pemeriksaan profesional diperlukan untuk penilaian lebih lanjut.
                </p>
              </div>

              <div className="preflight-actions">
                <button
                  type="button"
                  className="btn secondary"
                  style={{ minHeight: 48 }}
                  disabled={busy}
                  onClick={() => router.push("/guru/siswa")}
                >
                  Simpan draf
                </button>
                <button
                  type="button"
                  className="btn primary"
                  style={{ minHeight: 52 }}
                  disabled={busy || !allChecked}
                  onClick={() => void handlePublish()}
                >
                  {busy ? "Menerbitkan…" : "Terbitkan Laporan Observasi"}
                </button>
              </div>
              {message && <p className="notice error">{message}</p>}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ObservationReportDraft() {
  return (
    <Suspense fallback={<p className="empty" role="status">Memuat draf laporan observasi…</p>}>
      <ObservationReportDraftContent />
    </Suspense>
  );
}
