"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/ui/api";
import { Modal } from "@/lib/ui/modal";

type PsychologistCard = {
  id: string;
  name: string;
  str: string;
  clinic: string;
  avatarText: string;
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
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

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

  async function confirmShare() {
    if (!sharingWith) return;
    setBusy(true);

    // Calculate 7-day expiration date
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 7);

    // ponytail: fallback simulated grant share in prototype view; real DB rpc requires verified guardian session.
    await api(`/api/reports/${reportId}/shares`, {
      psychologistId: sharingWith.id,
      noticeVersion: "1.0",
      expiresAt: expireDate.toISOString(),
      includeAudio: false,
    });

    setBusy(false);
    setSharedIds((prev) => new Set([...prev, sharingWith.id]));
    setShareSuccess(true);
  }

  return (
    <div className="guardian-page">
      {/* Top Bar matching Frame 20 */}
      <header className="guardian-topbar">
        <div className="topbar-brand">
          <Link href="/">
            <Image src="/brand/logo-horizontal.svg" alt="Dyscovery" width={160} height={39} priority />
          </Link>
          <span className="brand-divider">/</span>
          <span className="topbar-portal">Portal Orang Tua</span>
        </div>
        <div className="topbar-links">
          <Link href="/guru/siswa" className="btn secondary small">
            Kembali ke Ruang Guru
          </Link>
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

            {/* Disclaimer Highlight Box per Frame 20 / Node 991 */}
            <div className="summary-disclaimer-box">
              <h4 className="disclaimer-title">Ini bukan diagnosis disleksia.</h4>
              <p className="disclaimer-text">
                Hasil perlu dibahas dengan tenaga profesional.
              </p>
            </div>
          </section>

          {/* Right: Psychologist Directory (Frame 20 / Node 994) */}
          <section className="directory-column" aria-labelledby="dir-heading">
            <div className="directory-head">
              <h2 id="dir-heading">Direktori psikolog</h2>
              <p className="muted small">
                Tata letak profil terverifikasi. Identitas dan STR belum diisi.
              </p>
            </div>

            <div className="psychologist-card-list">
              {psychologists.map((psy) => {
                const isShared = sharedIds.has(psy.id);
                return (
                  <article key={psy.id} className="card psychologist-card">
                    <div className="card-avatar" aria-hidden="true">
                      <span>{psy.avatarText}</span>
                    </div>

                    <h3 className="psy-name">{psy.name}</h3>
                    <p className="psy-meta">
                      {psy.str}
                      <br />
                      {psy.clinic}
                    </p>

                    <div className="psy-badge-wrap">
                      <span className="badge-sample">Profil contoh</span>
                    </div>

                    <div className="psy-access-block">
                      <span className="access-label">Masa akses</span>
                      <div className="access-value-box">
                        <span>7 hari setelah dibagikan</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`btn ${isShared ? "secondary" : "primary"}`}
                      style={{ width: "100%", minHeight: 48, marginTop: 12, fontSize: 14 }}
                      onClick={() => {
                        setSharingWith(psy);
                        setShareSuccess(false);
                      }}
                    >
                      {isShared ? "Laporan Telah Dibagikan ✓" : "Bagikan Laporan Observasi"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footnote per Frame 20 / Node 1032 */}
        <footer className="guardian-disclaimer-footer">
          <p>
            Prototipe • Tidak ada kredensial atau verifikasi nyata • Berbagi laporan memerlukan persetujuan orang tua
          </p>
        </footer>
      </main>

      {/* Share Modal Dialog */}
      <Modal open={Boolean(sharingWith)} onClose={() => setSharingWith(null)} titleId="share-title">
        {sharingWith && (
          <div>
            <h2 id="share-title">Bagikan Laporan Observasi</h2>
            {shareSuccess ? (
              <div style={{ padding: "16px 0" }}>
                <p className="notice ok" style={{ marginBottom: 16 }}>
                  Laporan observasi berhasil dibagikan kepada {sharingWith.name} selama 7 hari.
                </p>
                <div className="modal-actions">
                  <button type="button" className="btn primary" onClick={() => setSharingWith(null)}>
                    Selesai
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="muted small" style={{ margin: "8px 0 16px" }}>
                  Anda akan memberikan izin kepada <strong>{sharingWith.name}</strong> untuk membaca laporan observasi anak Anda selama 7 hari.
                </p>
                <div className="modal-section" style={{ marginBottom: 16 }}>
                  <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 14 }}>Ketentuan Berbagi:</p>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--ink)", display: "grid", gap: 4 }}>
                    <li>Akses berlaku selama 7 hari sejak tanggal persetujuan.</li>
                    <li>Rekaman suara tidak ikut dibagikan (hanya catatan observasi guru).</li>
                    <li>Orang tua dapat mencabut akses kapan saja melalui portal orang tua.</li>
                  </ul>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn secondary" onClick={() => setSharingWith(null)}>
                    Batal
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={busy}
                    onClick={() => void confirmShare()}
                  >
                    {busy ? "Memproses…" : "Setujui & Bagikan (7 Hari)"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function GuardianReportAndDirectory() {
  return (
    <Suspense fallback={<p className="empty" role="status">Memuat laporan orang tua…</p>}>
      <GuardianReportAndDirectoryContent />
    </Suspense>
  );
}
