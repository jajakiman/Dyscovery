"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/ui/api";
import { Modal } from "@/lib/ui/modal";
import { Practice } from "@/app/auth/mode-test/practice";
import { Reading } from "./reading";

type Mode = "checking" | "student" | "locked";

export default function StudentMode() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("checking");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const check = async () => {
      const result = await api<{ mode?: string }>("/api/teacher-mode/status");
      if (result.status === 401) return router.replace("/masuk");
      if (result.data.mode === "teacher") return router.replace("/guru/siswa");
      setMode(result.data.mode === "student" ? "student" : "locked");
    };
    const first = window.setTimeout(() => void check(), 0);
    const recheck = () => void check();
    window.addEventListener("pageshow", recheck);
    window.addEventListener("focus", recheck);
    return () => {
      window.clearTimeout(first);
      window.removeEventListener("pageshow", recheck);
      window.removeEventListener("focus", recheck);
    };
  }, [router]);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pin = new FormData(event.currentTarget).get("pin");
    event.currentTarget.reset();
    setBusy(true);
    setError("");
    const result = await api("/api/teacher-mode/unlock", { pin });
    if (result.ok) return router.replace("/guru/siswa");
    setError(result.data.error ?? "PIN tidak diterima.");
    setBusy(false);
  }

  return (
    <div className="student" data-ui="true">
      <header className="student-header">
        <div className="header-brand">
          <Image src="/brand/logo-horizontal.svg" alt="Dyscovery" width={180} height={44} priority />
        </div>
        <p className="header-title">Petualangan bersama Piko</p>
        <button
          type="button"
          className="btn-exit-student"
          onClick={() => { setAsking(true); setError(""); }}
          aria-label="Keluar Mode Siswa (perlu PIN guru)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Keluar Mode Siswa</span>
        </button>
      </header>

      <main className="student-main">
        {mode === "checking" && <p role="status" className="checking-mode">Memeriksa mode petualangan…</p>}
        {mode === "locked" && (
          <div className="student-stage-box" style={{ background: "#ffffff", padding: "48px 24px" }}>
            <Image className="piko" src="/mascot/piko-rest.svg" alt="" width={160} height={165} />
            <h1 style={{ margin: "16px 0 8px" }}>Sesi ini belum bisa dilanjutkan.</h1>
            <p className="notice warn" style={{ maxWidth: 500 }}>Waktu sesi habis atau izin berubah. Panggil guru untuk membuka mode.</p>
            <button type="button" className="btn primary" style={{ marginTop: 20 }} onClick={() => { setAsking(true); setError(""); }}>
              Buka Kunci Perangkat
            </button>
          </div>
        )}
        {mode === "student" && (
          <Reading
            onExitTeacher={() => { setAsking(true); setError(""); }}
            fallback={
              <section className="reading-card reading" aria-label="Latihan">
                <h1>Latihan</h1>
                <Practice />
              </section>
            }
          />
        )}
      </main>

      <footer className="student-footnote">
        <p>Mode siswa • Guru mendampingi selama kegiatan • Bukan alat diagnosis medis</p>
      </footer>

      <Modal open={asking} onClose={() => setAsking(false)} titleId="unlock-title">
        <h2 id="unlock-title">Keluar Mode Siswa</h2>
        <p className="muted small" style={{ marginBottom: 16 }}>Masukkan PIN guru (4 digit) untuk membuka kembali kontrol guru.</p>
        <form onSubmit={(event) => void unlock(event)}>
          <div className="field">
            <label htmlFor="unlock-pin">PIN guru</label>
            <input
              className="pin-input"
              id="unlock-pin"
              name="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,6}"
              minLength={4}
              maxLength={6}
              placeholder="• • • •"
              autoComplete="off"
              required
            />
          </div>
          {error && <p className="notice error" role="alert" style={{ marginBottom: 16 }}>{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={() => setAsking(false)}>Batal</button>
            <button className="btn primary" type="submit" disabled={busy}>{busy ? "Memeriksa…" : "Buka mode guru"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
