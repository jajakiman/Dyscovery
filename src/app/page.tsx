"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/ui/api";

type Step = "checking" | "login" | "onboarding";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [suggested, setSuggested] = useState("");

  useEffect(() => {
    let alive = true;
    void api<{ needsOnboarding?: boolean; suggestedName?: string | null }>("/api/auth/profile").then((result) => {
      if (!alive) return;
      if (!result.ok) return setStep("login");
      if (result.data.needsOnboarding) {
        setSuggested(result.data.suggestedName ?? "");
        return setStep("onboarding");
      }
      router.replace("/guru/siswa");
    });
    return () => { alive = false; };
  }, [router]);

  async function google() {
    setBusy(true); setError("");
    const result = await api<{ url?: string }>("/api/auth/google", {});
    if (result.ok && result.data.url) {
      const target = new URL(result.data.url);
      if (target.protocol === "https:") return window.location.assign(target.href);
    }
    setError(result.data.error ?? "Login Google tidak tersedia.");
    setBusy(false);
  }

  async function password(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError("");
    const result = await api("/api/auth/login", { email: data.get("email"), password: data.get("password") });
    if (result.ok) return router.replace("/guru/siswa");
    setError(result.data.error ?? "Login gagal.");
    setBusy(false);
  }

  async function onboard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError("");
    const result = await api("/api/auth/onboarding", {
      fullName: data.get("fullName"), displayName: data.get("displayName"),
      nip: data.get("nip") || null, confirmed: data.get("confirmed") === "on",
    });
    if (result.ok) return router.replace("/guru/siswa");
    setError(result.data.error ?? "Data belum dapat disimpan.");
    setBusy(false);
  }

  return (
    <main className="login">
      <section className="login-story" aria-label="Tentang Dyscovery">
        <Image className="brand" src="/brand/logo-horizontal-white.svg" alt="Dyscovery" width={200} height={49} priority />
        <h1>Ruang guru untuk mendampingi sesi membaca anak kelas 2.</h1>
        <Image className="piko" src="/mascot/piko-wave.svg" alt="" width={160} height={165} />
      </section>
      <section className="login-main">
        <div className="login-card">
          {step === "checking" && <p role="status">Memeriksa sesi login…</p>}
          {step === "login" && <>
            <div><h2>Masuk sebagai guru</h2><p className="muted small">Akun guru diverifikasi oleh operator sekolah. Mendaftar saja belum memberi akses guru.</p></div>
            <button className="btn secondary wide" disabled={busy} onClick={() => void google()}>Masuk dengan Google</button>
            <p className="divider">atau dengan email</p>
            <form onSubmit={(event) => void password(event)}>
              <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" required /></div>
              <div className="field"><label htmlFor="password">Kata sandi</label><input id="password" name="password" type="password" autoComplete="current-password" minLength={8} maxLength={128} required /></div>
              <button className="btn primary wide" type="submit" disabled={busy}>{busy ? "Memproses…" : "Masuk"}</button>
            </form>
          </>}
          {step === "onboarding" && <form onSubmit={(event) => void onboard(event)}>
            <h2>Konfirmasi identitas</h2>
            <p className="muted small" style={{ margin: "4px 0 16px" }}>Langkah sekali jalan. Ini bukan verifikasi profesi guru dan bukan persetujuan wali.</p>
            <div className="field"><label htmlFor="fullName">Nama lengkap</label><input id="fullName" name="fullName" defaultValue={suggested} required maxLength={150} autoComplete="name" /></div>
            <div className="field"><label htmlFor="displayName">Nama panggilan (opsional)</label><input id="displayName" name="displayName" maxLength={150} /></div>
            <div className="field"><label htmlFor="nip">NIP (opsional, 18 digit)</label><input id="nip" name="nip" inputMode="numeric" pattern="[0-9]{18}" maxLength={18} /></div>
            <label className="check"><input type="checkbox" name="confirmed" required />Saya mengonfirmasi data profil ini benar.</label>
            <button className="btn primary wide" type="submit" disabled={busy}>{busy ? "Menyimpan…" : "Simpan identitas"}</button>
          </form>}
          {error && <p className="notice error" role="alert">{error}</p>}
        </div>
      </section>
    </main>
  );
}
