"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/ui/api";
import { Modal } from "@/lib/ui/modal";
import { UserProfileMenu } from "@/lib/ui/user-profile-menu";

type PsychologistCard = {
  id: string;
  name: string;
  str: string;
  clinic: string;
  avatarText: string;
};

type ActiveShare = {
  id: string;
  psychologistName: string;
  grantedAt: string;
  expiresAt: string;
  includeAudio: boolean;
  status: "active" | "revoked";
};

const DEFAULT_PSYCHOLOGISTS: PsychologistCard[] = [
  {
    id: "psy-1",
    name: "[Nama lengkap], M.Psi., Psikolog",
    str: "STR: [ID terverifikasi]",
    clinic: "[Institusi / klinik]",
    avatarText: "[Foto]",
  },
  {
    id: "psy-2",
    name: "[Nama lengkap], M.Psi., Psikolog",
    str: "STR: [ID terverifikasi]",
    clinic: "[Institusi / klinik]",
    avatarText: "[Foto]",
  },
  {
    id: "psy-3",
    name: "[Nama lengkap], M.Psi., Psikolog",
    str: "STR: [ID terverifikasi]",
    clinic: "[Institusi / klinik]",
    avatarText: "[Foto]",
  },
];

function GuardianReportAndDirectoryContent() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("reportId") ?? "rep-proto-20261030";

  const [psychologists, setPsychologists] = useState<PsychologistCard[]>(DEFAULT_PSYCHOLOGISTS);
  const [sharingWith, setSharingWith] = useState<PsychologistCard | null>(null);
  const [activeShares, setActiveShares] = useState<ActiveShare[]>([]);
  const [selectedDurationDays, setSelectedDurationDays] = useState<number>(7);
  const [includeAudio, setIncludeAudio] = useState<boolean>(false);
  const [consentConfirmed, setConsentConfirmed] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);
  const [shareSuccessMessage, setShareSuccessMessage] = useState("");

  useEffect(() => {
    // Attempt fetching real psychologists if available
    void api<{
      psychologists?: Array<{
        profile_id: string;
        credential_id: string;
        institution_name: string;
        profiles: { full_name: string };
      }>;
    }>("/api/psychologists").then((res) => {
      if (res.ok && res.data.psychologists && res.data.psychologists.length > 0) {
        const loaded = res.data.psychologists.map((p, i) => ({
          id: p.profile_id,
          name: p.profiles?.full_name || `Psikolog ${i + 1}, M.Psi., Psikolog`,
          str: `STR: ${p.credential_id}`,
          clinic: p.institution_name,
          avatarText: "[Foto]",
        }));
        setPsychologists(loaded);
      }
    });
  }, []);

  function openShareModal(psy: PsychologistCard) {
    setSharingWith(psy);
    setSelectedDurationDays(7);
    setIncludeAudio(false);
    setConsentConfirmed(false);
    setShareSuccessMessage("");
  }

  async function confirmShare() {
    if (!sharingWith) return;
    setBusy(true);

    // Calculate expiration date
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + selectedDurationDays);

    const res = await api<{ share?: { id: string } }>(`/api/reports/${reportId}/shares`, {
      psychologistId: sharingWith.id,
      noticeVersion: "1.0",
      expiresAt: expireDate.toISOString(),
      includeAudio,
    });

    setBusy(false);
    const newShareId = res.data?.share?.id ?? `share-${Date.now().toString(36)}`;
    const newShare: ActiveShare = {
      id: newShareId,
      psychologistName: sharingWith.name,
      grantedAt: new Date().toLocaleDateString("id-ID"),
      expiresAt: expireDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
      includeAudio,
      status: "active",
    };

    setActiveShares((prev) => [newShare, ...prev]);
    setSharingWith(null);
    setShareSuccessMessage(`Laporan observasi berhasil dibagikan kepada ${sharingWith.name} untuk masa akses ${selectedDurationDays} hari.`);
  }

  async function revokeShare(shareId: string) {
    setBusy(true);
    await api(`/api/reports/${reportId}/shares/${shareId}`, {}, { method: "DELETE" });
    setActiveShares((prev) =>
      prev.map((s) => (s.id === shareId ? { ...s, status: "revoked" } : s))
    );
    setBusy(false);
  }

  return (
    <div className="guardian-page" data-ui="true">
      {/* Top Bar matching Frame 20 */}
      <header className="guardian-topbar">
        <div className="topbar-brand">
          <Link href="/">
            <Image src="/brand/logo-horizontal.svg" alt="Dyscovery" width={160} height={39} priority />
          </Link>
          <span className="brand-divider">/</span>
          <span className="topbar-portal">Portal Orang Tua</span>
        </div>
        <div className="topbar-links" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/guru/siswa" className="btn secondary" style={{ minHeight: 40, padding: "8px 16px", fontSize: 13 }}>
            Kembali ke Ruang Guru
          </Link>
          <UserProfileMenu />
        </div>
      </header>

      <main className="guardian-main">
        {/* Page Heading & Prototype Badge (Frame 20 / Node 978-981) */}
        <div className="page-heading">
          <div className="heading-split">
            <div>
              <h1>Memahami perjalanan membaca anak</h1>
              <p className="muted">Laporan observasi & pilihan dukungan profesional</p>
            </div>
            <span className="badge-placeholder">Seluruh profil: placeholder</span>
          </div>
        </div>

        {shareSuccessMessage && (
          <div className="notice ok" role="status" style={{ margin: "0 0 16px" }}>
            {shareSuccessMessage}
          </div>
        )}

        <div className="guardian-grid">
          {/* Left: Summary Card (Frame 20 / Node 982) */}
          <section className="card guardian-summary-card" aria-labelledby="summary-heading">
            <div className="card-head">
              <h2 id="summary-heading">Ringkasan observasi</h2>
              <p className="muted small">Siswa Contoh A • Kelas 2A</p>
            </div>

            <div className="summary-status-badge">
              <span>Ditinjau guru • contoh</span>
            </div>

            <div className="summary-section">
              <h3 className="section-title">Yang diamati</h3>
              <p className="section-body">
                Contoh: Beberapa bunyi perlu diulang saat membaca kata. Anak tetap mencoba hingga selesai.
              </p>
            </div>

            <div className="summary-section">
              <h3 className="section-title">Langkah bersama</h3>
              <p className="section-body">
                Baca bersama tanpa terburu-buru. Diskusikan dengan guru bila kesulitan terus terlihat.
              </p>
            </div>

            {/* Non-diagnostic Disclaimer Box (Frame 20 / Node 991) */}
            <div className="summary-disclaimer-box">
              <p className="disclaimer-title">Ini bukan diagnosis disleksia.</p>
              <p className="disclaimer-text">
                Hasil perlu dibahas dengan tenaga profesional.
              </p>
            </div>
          </section>

          {/* Right: Verified Psychologist Directory (Frame 20 / Node 994) */}
          <section className="directory-column" aria-labelledby="directory-heading">
            <div className="directory-head">
              <h2 id="directory-heading">Direktori psikolog</h2>
              <p className="muted small">
                Tata letak profil terverifikasi. Identitas dan STR belum tervalidasi klinis.
              </p>
            </div>

            {/* 3-column psychologist cards (Frame 20 / Node 997, 1007, 1017) */}
            <div className="psychologist-card-list">
              {psychologists.map((psy) => {
                const active = activeShares.find((s) => s.psychologistName === psy.name && s.status === "active");
                return (
                  <div key={psy.id} className="card psychologist-card">
                    <div className="card-avatar" aria-hidden="true">
                      {psy.avatarText}
                    </div>
                    <h3 className="psy-name">{psy.name}</h3>
                    <p className="psy-meta">
                      {psy.str}<br />
                      {psy.clinic}
                    </p>

                    <div className="psy-badge-wrap">
                      <span className="badge-sample">Profil contoh</span>
                    </div>

                    <div className="psy-access-block">
                      <span className="access-label">Masa akses</span>
                      <div className="access-value-box">
                        7 hari setelah dibagikan
                      </div>
                    </div>

                    <div className="psy-action-box" style={{ width: "100%", marginTop: 14 }}>
                      {active ? (
                        <div style={{ textAlign: "center" }}>
                          <span className="badge ready" style={{ width: "100%", padding: "8px 12px", display: "block", marginBottom: 6 }}>
                            Akses Aktif (s/d {active.expiresAt})
                          </span>
                          <button
                            type="button"
                            className="btn secondary"
                            style={{ width: "100%", minHeight: 38, fontSize: 13 }}
                            disabled={busy}
                            onClick={() => void revokeShare(active.id)}
                          >
                            Cabut Izin Berbagi
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn primary"
                          style={{ width: "100%", minHeight: 48, fontSize: 14 }}
                          onClick={() => openShareModal(psy)}
                        >
                          Bagikan Laporan Observasi
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Shares Panel */}
            {activeShares.length > 0 && (
              <div className="card active-shares-card" style={{ padding: 24, marginTop: 16 }}>
                <h3 style={{ fontSize: 18, marginBottom: 12 }}>Daftar Izin Berbagi Aktif</h3>
                <div style={{ display: "grid", gap: 10 }}>
                  {activeShares.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        background: "#faf8f4",
                        borderRadius: 12,
                        border: "1px solid #dee2e4",
                      }}
                    >
                      <div>
                        <strong>{s.psychologistName}</strong>
                        <p className="small muted" style={{ margin: "2px 0 0" }}>
                          Masa akses hingga: {s.expiresAt} • Audio: {s.includeAudio ? "Disertakan" : "Tidak disertakan"}
                        </p>
                      </div>
                      <div>
                        {s.status === "active" ? (
                          <button
                            type="button"
                            className="btn secondary"
                            style={{ minHeight: 36, padding: "4px 14px", fontSize: 13 }}
                            disabled={busy}
                            onClick={() => void revokeShare(s.id)}
                          >
                            Cabut Izin
                          </button>
                        ) : (
                          <span className="badge none">Izin Dicabut</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <footer className="guardian-disclaimer-footer">
          Prototipe • Tidak ada kredensial atau verifikasi nyata • Dyscovery bukan pengganti pemeriksaan profesional
        </footer>
      </main>

      {/* Time-bound Report Share Modal */}
      <Modal open={Boolean(sharingWith)} onClose={() => setSharingWith(null)} titleId="share-modal-title">
        {sharingWith && (
          <div className="share-modal-content">
            <h2 id="share-modal-title" style={{ fontSize: 24, marginBottom: 8 }}>
              Bagikan Laporan Observasi
            </h2>
            <p className="muted" style={{ marginBottom: 16 }}>
              Anda akan membagikan salinan laporan observasi kepada <strong>{sharingWith.name}</strong> ({sharingWith.clinic}).
            </p>

            <div className="field">
              <label htmlFor="duration-select">Pilih masa berlaku akses</label>
              <select
                id="duration-select"
                value={selectedDurationDays}
                onChange={(e) => setSelectedDurationDays(Number(e.target.value))}
              >
                <option value={7}>7 hari (Rekomendasi awal)</option>
                <option value={14}>14 hari</option>
                <option value={30}>30 hari</option>
              </select>
            </div>

            <div className="check" style={{ marginTop: 12 }}>
              <input
                id="chk-audio"
                type="checkbox"
                checked={includeAudio}
                onChange={(e) => setIncludeAudio(e.target.checked)}
              />
              <label htmlFor="chk-audio">
                <strong>Sertakan rekaman suara bacaan</strong>
                <p className="small muted" style={{ margin: "2px 0 0" }}>
                  Secara default dinonaktifkan untuk menjaga privasi anak. Centang jika psikolog memerlukan bukti audio.
                </p>
              </label>
            </div>

            <div className="check" style={{ marginTop: 12 }}>
              <input
                id="chk-consent"
                type="checkbox"
                checked={consentConfirmed}
                onChange={(e) => setConsentConfirmed(e.target.checked)}
              />
              <label htmlFor="chk-consent">
                <span>
                  Saya memahami izin ini berbatas waktu dan dapat saya cabut sewaktu-waktu melalui portal ini.
                </span>
              </label>
            </div>

            <div className="modal-actions" style={{ marginTop: 24 }}>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setSharingWith(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={!consentConfirmed || busy}
                onClick={() => void confirmShare()}
              >
                {busy ? "Memproses…" : "Konfirmasi & Bagikan Laporan"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function GuardianReportAndDirectory() {
  return (
    <Suspense fallback={<p className="empty" role="status">Memuat portal orang tua…</p>}>
      <GuardianReportAndDirectoryContent />
    </Suspense>
  );
}
