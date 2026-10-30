"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/ui/api";
import { Practice } from "@/app/auth/mode-test/practice";
import { Reading } from "./reading";

type Mode = "checking" | "student" | "locked";

export default function StudentMode() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("checking");
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

  async function exit() {
    setBusy(true);
    setError("");
    const result = await api("/api/teacher-mode/unlock", {});
    if (result.ok) return router.replace("/guru/siswa");
    setError(result.data.error ?? "Gagal kembali ke ruang guru.");
    setBusy(false);
  }

  return (
    <div className="student" data-ui="true">
      <header className="student-header">
        <div className="header-brand">
          <Image src="/brand/logo-horizontal.svg" alt="Dyscovery" width={180} height={44} priority />
        </div>
        <p className="header-title">Petualangan bersama Piko</p>
        <button type="button" className="btn-exit-student" disabled={busy} onClick={() => void exit()}>
          <span>{busy ? "Kembali…" : "Kembali ke Ruang Guru"}</span>
        </button>
      </header>

      <main className="student-main">
        {error && <p className="notice error" role="alert">{error}</p>}
        {mode === "checking" && <p role="status" className="checking-mode">Memeriksa sesi kegiatan…</p>}
        {mode === "locked" && (
          <div className="student-stage-box" style={{ background: "#ffffff", padding: "48px 24px" }}>
            <Image className="piko" src="/mascot/piko-rest.svg" alt="" width={160} height={165} />
            <h1 style={{ margin: "16px 0 8px" }}>Sesi ini belum bisa dilanjutkan.</h1>
            <p className="notice warn" style={{ maxWidth: 500 }}>Waktu sesi habis atau izin berubah. Panggil guru untuk melanjutkan.</p>
            <button type="button" className="btn primary" style={{ marginTop: 20 }} disabled={busy} onClick={() => void exit()}>
              Kembali ke Ruang Guru
            </button>
          </div>
        )}
        {mode === "student" && (
          <Reading
            onExitTeacher={() => void exit()}
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
        <p>Sesi kegiatan siswa • Guru mendampingi selama kegiatan • Bukan alat diagnosis medis</p>
      </footer>
    </div>
  );
}
