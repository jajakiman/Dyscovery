"use client";

import { useState } from "react";

export default function AuthTestPage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("Belum ada pengujian.");

  async function request(path: string, body?: object, method = "POST") {
    setBusy(true);
    try {
      const response = await fetch(path, {
        method, credentials: "same-origin", cache: "no-store",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      if (response.ok && path === "/api/auth/google" && data.url) {
        const target = new URL(data.url);
        if (target.protocol !== "https:") throw new Error("URL login tidak valid.");
        window.location.assign(target.href);
      }
      setResult(`${response.status}\n${JSON.stringify(data, null, 2)}`);
    } catch {
      setResult("Permintaan gagal. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: 24, fontFamily: "sans-serif", color: "#202C38", background: "#FAF8F4", minHeight: "100vh" }}>
      <h1>Uji autentikasi staging</h1>
      <p>Gunakan data sintetis. Ini bukan verifikasi profesi guru. Login Google saat ini kembali ke tampilan JSON; setelah itu buka lagi halaman ini untuk melanjutkan.</p>
      <fieldset disabled={busy} style={{ display: "grid", gap: 16, border: 0, padding: 0, minWidth: 0 }}>
        <button style={{ minHeight: 44 }} onClick={() => request("/api/auth/google")}>Masuk dengan Google</button>
        <button style={{ minHeight: 44 }} onClick={() => request("/api/auth/profile", undefined, "GET")}>Cek profil</button>
        <form style={{ display: "grid", gap: 12 }} onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void request("/api/auth/onboarding", {
            fullName: data.get("fullName"), displayName: data.get("displayName"),
            nip: data.get("nip") || null, confirmed: data.get("confirmed") === "on",
          });
        }}>
          <h2>Konfirmasi identitas uji</h2>
          <label htmlFor="fullName">Nama lengkap (wajib)</label>
          <input id="fullName" name="fullName" required maxLength={150} autoComplete="name" style={{ minHeight: 44, minWidth: 0 }} />
          <label htmlFor="displayName">Nama panggilan (opsional)</label>
          <input id="displayName" name="displayName" maxLength={150} style={{ minHeight: 44, minWidth: 0 }} />
          <label htmlFor="nip">NIP (opsional, 18 digit)</label>
          <input id="nip" name="nip" inputMode="numeric" pattern="[0-9]{18}" maxLength={18} style={{ minHeight: 44, minWidth: 0 }} />
          <label style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44 }}>
            <input type="checkbox" name="confirmed" required style={{ width: 24, height: 24, flexShrink: 0 }} />
            Saya mengonfirmasi data profil uji ini. Ini bukan persetujuan wali atau verifikasi guru.
          </label>
          <button style={{ minHeight: 44 }} type="submit">Simpan identitas uji</button>
        </form>
        <button style={{ minHeight: 44 }} onClick={() => request("/api/auth/logout")}>Keluar dari sesi ini</button>
      </fieldset>
      <p role="status" aria-live="polite">{busy ? "Memproses…" : "Siap."}</p>
      <pre aria-live="polite" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", background: "#FFFFFF", padding: 16 }}>{result}</pre>
    </main>
  );
}
