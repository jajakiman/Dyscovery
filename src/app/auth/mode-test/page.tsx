"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Practice } from "./practice";
import { TeacherPractice } from "./teacher-practice";

type Mode = "checking" | "anonymous" | "teacher" | "student" | "locked" | "error";

export default function ModeTestPage() {
  const [mode, setMode] = useState<Mode>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Memeriksa mode dari server…");
  const [session, setSession] = useState("");

  async function status() {
    try {
      const response = await fetch("/api/teacher-mode/status", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401) { setMode("anonymous"); return; }
      if (!response.ok || !["teacher", "student", "locked"].includes(data.mode)) throw new Error();
      setMode(data.mode);
      setSession(data.sessionId ?? "");
    } catch {
      setMode("error");
      setMessage("Status belum dapat diperiksa. Pastikan migrasi 006 tersedia, lalu coba lagi.");
    }
  }

  useEffect(() => {
    const initialCheck = window.setTimeout(() => void status(), 0);
    const recheck = () => { setMode("checking"); setMessage(""); void status(); };
    window.addEventListener("pageshow", recheck);
    window.addEventListener("focus", recheck);
    return () => {
      window.clearTimeout(initialCheck);
      window.removeEventListener("pageshow", recheck);
      window.removeEventListener("focus", recheck);
    };
  }, []);

  async function action(path: string, body?: object, method = "POST") {
    setBusy(true);
    setMessage("Memproses permintaan…");
    try {
      const response = await fetch(path, {
        method, cache: "no-store", credentials: "same-origin",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      if (path === "/api/auth/google" && response.ok && data.url) {
        const target = new URL(data.url);
        if (target.protocol !== "https:") throw new Error();
        window.location.assign(target.href);
        return;
      }
      if (!response.ok) {
        setMessage(`HTTP ${response.status}: ${data.error ?? "Permintaan ditolak."}`);
        return;
      }
      if (path === "/api/children") {
        setMessage(`HTTP ${response.status}: akses daftar siswa masih diizinkan. Jangan serahkan perangkat jika mode siswa sedang aktif.`);
        return;
      }
      await status();
      setMessage(data.sessionId ? `Mode guru kembali. Draf sebelumnya: ${data.sessionId}. Belum tersedia halaman asesmen.`
        : "Permintaan berhasil. Status mode telah diperiksa ulang.");
    } catch {
      setMode("error");
      setMessage("Koneksi atau respons gagal. Periksa status sebelum melanjutkan; jangan ulang setup PIN sembarangan.");
    } finally { setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>, path: string, fields: string[]) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = Object.fromEntries(fields.map((name) => [name, data.get(name)]));
    form.reset();
    void action(path, body);
  }

  const pinField = <><label htmlFor="pin">PIN guru (4 digit)</label>
    <input id="pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} autoComplete="off" required /></>;

  return <main className="mode-test">
    <style>{`
      .mode-test {max-width:560px;margin:0 auto;padding:24px;color:#202c38;background:#faf8f4;min-height:100vh;font-family:Arial,sans-serif;color-scheme:light}
      .mode-test h1 {font-size:1.7rem;line-height:1.25}.mode-test p {line-height:1.6;overflow-wrap:anywhere}
      .mode-test fieldset {border:0;padding:0;min-width:0;display:grid;gap:16px}
      .mode-test form {display:grid;gap:10px;padding-block:16px;border-top:1px solid #737d84}
      .mode-test input,.mode-test button {min-height:44px;min-width:0;font:inherit;padding:10px;border:1px solid #53616b;border-radius:6px}
      .mode-test input {background:white;color:#202c38;width:100%;box-sizing:border-box}
      .mode-test button {background:#202c38;color:white;cursor:pointer}.mode-test button:disabled {opacity:.65;cursor:wait}
      .mode-test :focus-visible {outline:3px solid #ad4c20;outline-offset:3px}
    `}</style>
    <h1>Uji mode guru dan siswa</h1>
    <p>Alat uji sintetis, bukan halaman asesmen. Jangan serahkan perangkat kepada anak nyata. PIN bukan pengganti MFA produksi.</p>
    <p aria-live="polite">Status: {mode === "teacher" ? "mode guru (kewenangan tetap diperiksa tiap operasi)" : mode}.</p>
    {session && <p>Draf sesi: {session}</p>}
    <fieldset disabled={busy || mode === "checking"}>
      {mode === "anonymous" && <>
        <button onClick={() => void action("/api/auth/google")}>Masuk dengan Google</button>
        <p>Setelah Google kembali ke JSON profil, buka lagi /auth/mode-test. Login email memerlukan akun yang sudah dikonfirmasi.</p>
        <form onSubmit={(event) => submit(event, "/api/auth/login", ["email", "password"])}>
          <label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" required />
          <label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" minLength={8} maxLength={128} required />
          <button type="submit">Masuk dengan email</button>
        </form>
      </>}
      {mode === "teacher" && <>
        <TeacherPractice key={session} sessionId={session} />
        <form onSubmit={(event) => submit(event, "/api/teacher-mode/pin", ["pin"])}>
          <h2>Buat PIN sekali</h2>{pinField}<button type="submit">Simpan PIN guru</button>
          <p>Lewati jika sudah punya PIN. Tidak ada penggantian atau reset PIN publik.</p>
        </form>
        <form onSubmit={(event) => submit(event, "/api/teacher-mode/enter", ["sessionId"])}>
          <label htmlFor="sessionId">ID draf sesi yang sudah dibuat dan berizin</label>
          <input id="sessionId" name="sessionId" required pattern="[0-9a-fA-F-]{36}" />
          <button type="submit">Masuk mode siswa uji</button>
          <p>Belum punya draf? Siapkan melalui endpoint assessment-sessions. Halaman ini tidak membuat fixture atau persetujuan wali.</p>
        </form>
        <button onClick={() => void action("/api/auth/logout")}>Keluar akun</button>
      </>}
      {(mode === "student" || mode === "locked") && <>
        <h2>{mode === "student" ? "Mode siswa uji" : "Sesi siswa tidak tersedia"}</h2>
        <p>Latihan sintetis saja, tanpa asesmen nyata atau rekaman. Kedaluwarsa tidak otomatis membuka hak guru.</p>
        {mode === "student" && <Practice />}
        <form onSubmit={(event) => submit(event, "/api/teacher-mode/unlock", ["pin"])}>
          {pinField}<button type="submit">Kembali ke mode guru</button>
          <p>Lima PIN salah mengunci akses selama 15 menit. Login ulang tidak menghapus kunci.</p>
        </form>
      </>}
      {mode !== "anonymous" && mode !== "error" && <button onClick={() => void action("/api/children", undefined, "GET")}>Uji penolakan akses daftar siswa</button>}
    </fieldset>
    <button disabled={busy} onClick={() => { setMessage(""); void status(); }} style={{ marginTop: 16 }}>Periksa ulang status</button>
    <p role="status" aria-live="polite">{message || "Belum ada hasil permintaan."}</p>
  </main>;
}
