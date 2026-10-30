"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/ui/api";
import { Modal } from "@/lib/ui/modal";
import { LogoutButton } from "@/lib/ui/logout-button";
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
    name: "Dr. Anindya Kusuma, M.Psi., Psikolog",
    str: "STR: 19870512-201201-2-001",
    clinic: "Klinik Tumbuh Kembang Pelangi",
    avatarText: "AK",
  },
  {
    id: "psy-2",
    name: "Bambang Wicaksono, M.Psi., Psikolog",
    str: "STR: 19840322-200902-1-042",
    clinic: "Pusat Layanan Psikologi Terpadu",
    avatarText: "BW",
  },
  {
    id: "psy-3",
    name: "Citra Dewi, M.Psi., Psikolog",
    str: "STR: 19901104-201503-2-088",
    clinic: "Lembaga Psikologi Bina Literasi",
    avatarText: "CD",
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
          avatarText: p.profiles?.full_name?.split(" ").slice(0, 2).map((n) => n[0]).join("") || "PS",
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
    <div className="shell" data-ui="true">
      {/* Sidebar with consistent design across teacher, operator, and parent */}
      <aside className="sidebar">
        <div>
          <Link href="/">
            <Image className="brand" src="/brand/logo-horizontal.svg" alt="Dyscovery" width={152} height={37} priority />
          </Link>
          <p className="role-tag">Portal Orang Tua</p>
        </div>
        <nav className="nav" aria-label="Menu orang tua">
          <Link href="/orangtua/laporan" aria-current="page">Laporan observasi</Link>
        </nav>
        <div className="sidebar-notice">
          <p className="sidebar-notice-title">Keluarga & Privasi</p>
          <p className="sidebar-notice-text">Laporan anak hanya dapat dibagikan kepada psikolog dengan persetujuan sadar orang tua.</p>
        </div>
        <div className="sidebar-bottom">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="workspace">
        <header className="portal-subbar">
          <span className="subbar-meta">Portal Orang Tua & Wali • Siswa Kelas 2 • SD Negeri Nusantara 01</span>
          <UserProfileMenu />
        </header>

        {/* Page Heading (Frame 20 / S14) */}
        <div className="page-heading" style={{ marginTop: 8 }}>
          <div className="heading-split">
            <div>
              <h1>Memahami perjalanan membaca anak</h1>
              <p className="muted">Laporan observasi berkala & pilihan rujukan tenaga ahli profesional</p>
            </div>
          </div>
        </div>

        {shareSuccessMessage && (
          <div className="notice ok" role="status" style={{ margin: "16px 0" }}>
            {shareSuccessMessage}
          </div>
        )}

        <div className="guardian-grid" style={{ marginTop: 20 }}>
          {/* Left: Summary Card (Frame 20 / S14) */}
          <section className="card guardian-summary-card" aria-labelledby="summary-heading">
            <div className="card-head">
              <h2 id="summary-heading">Ringkasan observasi</h2>
              <p className="muted small">Bima Aditia • Kelas 2A</p>
            </div>

            <div className="summary-status-badge">
              <span>Ditinjau Guru Kelas</span>
            </div>

            <div className="summary-section">
              <h3 className="section-title">Yang diamati</h3>
              <p className="section-body">
                Beberapa bunyi konsonan diulang saat membaca kalimat panjang. Anak menunjukkan antusiasme tinggi dan tetap menyelesaikan seluruh rangkaian 4 pos.
              </p>
            </div>

            <div className="summary-section">
              <h3 className="section-title">Langkah bersama di rumah</h3>
              <p className="section-body">
                Dampingi membaca santai 10 menit setiap hari tanpa terburu-buru. Berikan penguatan positif saat anak mengenali kata baru.
              </p>
            </div>

            {/* Non-diagnostic Disclaimer Box */}
            <div className="summary-disclaimer-box">
              <p className="disclaimer-title">Bukan diagnosis klinis disleksia.</p>
              <p className="disclaimer-text">
                Rangkuman ini merupakan catatan observasi kelas. Konsultasikan dengan psikolog berlisensi untuk asesmen menyeluruh.
              </p>
            </div>
          </section>

          {/* Right: Verified Psychologist Directory */}
          <section className="directory-column" aria-labelledby="directory-heading">
            <div className="directory-head">
              <h2 id="directory-heading">Direktori psikolog mitra</h2>
              <p className="muted small">
                Tenaga ahli profesional terverifikasi Surat Tanda Registrasi (STR) untuk rujukan keluarga.
              </p>
            </div>

            {/* 3-column psychologist cards */}
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
                      <span className="badge ready">Terverifikasi STR</span>
                    </div>

                    <div className="psy-access-block">
                      <span className="access-label">Masa akses</span>
                      <div className="access-value-box">
                        7–30 hari (berbatas waktu)
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

        <footer className="guardian-disclaimer-footer" style={{ marginTop: 40 }}>
          Dyscovery mendukung observasi literasi guru kelas dan orang tua, bukan merupakan instrumen diagnosis medis klinis.
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
              Anda akan membagikan salinan laporan observasi anak kepada <strong>{sharingWith.name}</strong> ({sharingWith.clinic}).
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
                  Rekaman suara anak hanya akan diperdengarkan kepada psikolog terpilih dan kedaluwarsa otomatis.
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
                <strong>Saya mengonfirmasi pemberian akses berbatas waktu ini</strong>
                <p className="small muted" style={{ margin: "2px 0 0" }}>
                  Anda dapat mencabut izin berbagi ini sewaktu-waktu melalui tombol &quot;Cabut Izin&quot;.
                </p>
              </label>
            </div>

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button type="button" className="btn secondary" onClick={() => setSharingWith(null)}>
                Batal
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={busy || !consentConfirmed}
                onClick={() => void confirmShare()}
              >
                {busy ? "Memproses…" : "Setujui & Bagikan"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function GuardianReportAndDirectoryPage() {
  return (
    <Suspense fallback={<div className="shell"><div className="workspace"><p className="muted">Memuat portal orang tua…</p></div></div>}>
      <GuardianReportAndDirectoryContent />
    </Suspense>
  );
}
