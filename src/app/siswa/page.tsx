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
  const [reading, setReading] = useState(false);
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
    return () => { window.clearTimeout(first); window.removeEventListener("pageshow", recheck); window.removeEventListener("focus", recheck); };
  }, [router]);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pin = new FormData(event.currentTarget).get("pin");
    event.currentTarget.reset();
    setBusy(true); setError("");
    const result = await api("/api/teacher-mode/unlock", { pin });
    if (result.ok) return router.replace("/guru/siswa");
    setError(result.data.error ?? "PIN tidak diterima.");
    setBusy(false);
  }

  return (
    <div className="student">
      <header className="student-header"><Image src="/brand/logo-horizontal.svg" alt="Dyscovery" width={168} height={41} priority /></header>
      <main className="student-main">
        {mode === "checking" && <p role="status">Memeriksa mode…</p>}
        {mode !== "checking" && <>
          {!reading && <Image className="piko" src={mode === "student" ? "/mascot/piko-wave.svg" : "/mascot/piko-rest.svg"} alt="" width={160} height={165} />}
          <h1>{mode === "student" ? "Halo! Ayo berlatih membaca." : "Sesi ini belum bisa dilanjutkan."}</h1>
          {mode === "locked" && <p className="notice warn">Waktu sesi habis atau izin berubah. Panggil guru untuk melanjutkan.</p>}
          {mode === "student" && <section className="reading-card reading" aria-label="Latihan"><Reading onReadingChange={setReading} fallback={<Practice />} /></section>}
        </>}
      </main>
      <footer className="student-bottom">
        <span className="muted small">Jangan menekan tombol ini sendiri. Minta bantuan guru.</span>
        <button className="btn secondary" onClick={() => { setAsking(true); setError(""); }}>Serahkan perangkat ke guru</button>
      </footer>
      <Modal open={asking} onClose={() => setAsking(false)} titleId="unlock-title">
        <h2 id="unlock-title">Kembali ke mode guru</h2>
        <form onSubmit={(event) => void unlock(event)}>
          <div className="field"><label htmlFor="unlock-pin">PIN guru</label>
            <input className="pin-input" id="unlock-pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} autoComplete="off" required /></div>
          {error && <p className="notice error" role="alert" style={{ marginBottom: 16 }}>{error}</p>}
          <div className="modal-actions"><button type="button" className="btn secondary" onClick={() => setAsking(false)}>Batal</button>
            <button className="btn primary" type="submit" disabled={busy}>{busy ? "Memeriksa…" : "Buka mode guru"}</button></div>
        </form>
      </Modal>
    </div>
  );
}
