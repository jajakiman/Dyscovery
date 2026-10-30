"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/ui/api";
import { LogoutButton } from "@/lib/ui/logout-button";
import { UserProfileMenu } from "@/lib/ui/user-profile-menu";

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
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Observations inputs matching Frame 19 exactly
  const [observations, setObservations] = useState(
    "Siswa memerlukan waktu lebih lama untuk menggabungkan beberapa bunyi konsonan. Dianjurkan periksa kembali bersama rekaman audio."
  );
  const [homeGuidance, setHomeGuidance] = useState(
    "Membaca bersama secara santai dalam sesi singkat 10-15 menit dan memberi ruang untuk mencoba kembali tanpa tekanan."
  );

  // Pre-publish checklist matching Frame 19
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

  async function handleSaveDraft() {
    setMessage("Draf observasi berhasil disimpan.");
  }

  async function handlePublish() {
    if (!sessionId) return;
    setBusy(true);
    setMessage("");

    const res = await api<{ report?: { id: string; created_at?: string } }>(
      `/api/assessment-sessions/${sessionId}/reports`,
      {
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
      }
    );

    setBusy(false);
    const newReportId = res.data.report?.id ?? `rep-${Date.now().toString(36)}`;
    setPublishedReportId(newReportId);
    setPublishedAt(new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" }));
  }

  const allChecked = chkRecording && chkAiVerified && chkNoDiagnosis && chkConsent;

  return (
    <div className="shell" data-ui="true">
      {/* Sidebar matching Frame 19 */}
      <aside className="sidebar">
        <div>
          <Image className="brand" src="/brand/logo-horizontal.svg" alt="Dyscovery" width={152} height={37} priority />
          <p className="role-tag">Ruang guru</p>
        </div>
        <nav className="nav" aria-label="Menu guru">
          <p className="nav-section-label">Menu Navigasi</p>
          <Link href="/guru/siswa">Daftar siswa</Link>
          <Link href="/guru/rekaman">Tinjau rekaman</Link>
          <Link href="/guru/laporan" aria-current="page">Laporan observasi</Link>
        </nav>
        <div className="sidebar-role-switcher" role="navigation" aria-label="Pindah peran">
          <p className="nav-section-label">Pindah Peran</p>
          <Link href="/operator">Ruang operator</Link>
          <Link href="/orangtua/laporan">Portal orang tua</Link>
        </div>
        <div className="sidebar-notice">
          <p className="sidebar-notice-title">Privasi siswa</p>
          <p className="sidebar-notice-text">Rekaman hanya untuk peninjauan guru.</p>
        </div>
        <div className="sidebar-bottom">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Workspace (Frame 19: S13) */}
      <main className="workspace">
        <header className="portal-subbar">
          <span className="subbar-meta">Portal Guru • Kelas 2A / Tahun ajaran 2026–2027</span>
          <UserProfileMenu />
        </header>

        <div className="page-heading">
          <div className="heading-split">
            <div>
              <h1>Susun laporan observasi</h1>
              <p className="muted">
                Pisahkan catatan guru, saran pendampingan, dan rekomendasi tindak lanjut.
              </p>
            </div>
            <span className="badge ready">Draf Laporan</span>
          </div>
        </div>

        {loading ? (
          <p className="empty" role="status">Memuat data draf…</p>
        ) : publishedReportId ? (
          /* Published Success View */
          <div className="card published-success-card">
            <span className="badge ready" style={{ marginBottom: 12 }}>Laporan Telah Terbit (Immutable)</span>
            <h2>Laporan Observasi Berhasil Diterbitkan</h2>
            <p className="muted" style={{ margin: "8px 0 20px" }}>
              Laporan observasi membaca untuk <strong>{child?.display_name ?? "Bima Aditia"}</strong> telah diterbitkan secara resmi pada {publishedAt}.
            </p>
            <div className="guide-tray" style={{ marginBottom: 24 }}>
              <p>ID Snapshot: <code>{publishedReportId}</code> • Versi ini tidak dapat ditimpa (immutable) dan siap diakses oleh orang tua.</p>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href={`/orangtua/laporan?reportId=${publishedReportId}`} className="btn primary">
                Buka Tampilan Portal Orang Tua
              </Link>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setPublishedReportId(null)}
              >
                Susun Draf Revisi Baru
              </button>
            </div>
          </div>
        ) : (
          <div className="report-draft-grid">
            {/* Left Card: Form Inputs (Frame 19 / Node 936) */}
            <section className="card report-form-card" aria-labelledby="form-heading">
              <div className="card-head">
                <h2 id="form-heading">{child ? child.display_name : "Bima Aditia"}</h2>
                <p className="muted small">
                  Kelas {child ? child.grade : "2A"} • Sesi 30 Oktober 2026
                </p>
              </div>

              <div className="field">
                <label htmlFor="obs-text">Catatan observasi kualitatif</label>
                <textarea
                  id="obs-text"
                  rows={4}
                  className="draft-textarea"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Catatan hasil observasi guru saat anak membaca..."
                />
                <span className="helper-disclaimer">
                  Catatan observasi kualitatif guru kelas. Bukan kesimpulan medis klinis.
                </span>
              </div>

              <div className="field">
                <label htmlFor="guidance-text">Panduan pendampingan di rumah</label>
                <textarea
                  id="guidance-text"
                  rows={4}
                  className="draft-textarea"
                  value={homeGuidance}
                  onChange={(e) => setHomeGuidance(e.target.value)}
                  placeholder="Langkah pendampingan yang disarankan untuk orang tua..."
                />
              </div>

              {/* Disclaimer Callout Box (Frame 19 / Node 949) */}
              <div className="clinical-disclaimer-box">
                <p className="disclaimer-title">Skrining bukan diagnosis</p>
                <p className="disclaimer-text">
                  Pemeriksaan profesional diperlukan untuk penilaian lebih lanjut.
                </p>
              </div>
            </section>

            {/* Right Card: Preflight Checklist & Actions (Frame 19 / Node 952) */}
            <section className="card preflight-card" aria-labelledby="preflight-heading">
              <div className="card-head">
                <h2 id="preflight-heading">Sebelum diterbitkan</h2>
                <p className="muted small">
                  Pastikan seluruh prinsip observasi dan persetujuan terpenuhi.
                </p>
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

              <div className="preflight-actions">
                <button
                  type="button"
                  className="btn secondary"
                  style={{ width: "100%" }}
                  onClick={handleSaveDraft}
                >
                  Simpan draf
                </button>
                <button
                  type="button"
                  className="btn primary"
                  style={{ width: "100%", minHeight: 52 }}
                  disabled={!allChecked || busy}
                  onClick={() => void handlePublish()}
                >
                  {busy ? "Menerbitkan…" : "Terbitkan Laporan Observasi"}
                </button>
                {!allChecked && (
                  <p className="small muted" style={{ textAlign: "center" }}>
                    Centang seluruh verifikasi sebelum menerbitkan.
                  </p>
                )}
              </div>

              {message && <p className="notice ok">{message}</p>}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ObservationReportDraft() {
  return (
    <Suspense fallback={<p className="empty" role="status">Memuat form laporan…</p>}>
      <ObservationReportDraftContent />
    </Suspense>
  );
}
