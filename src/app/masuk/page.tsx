"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/ui/api";

type Step = "checking" | "login" | "register" | "forgot" | "reset" | "onboarding";

const titles: Record<Exclude<Step, "checking">, string> = {
  login: "Masuk", register: "Daftar akun", forgot: "Lupa kata sandi",
  reset: "Atur ulang kata sandi", onboarding: "Konfirmasi identitas",
};

function EmailField() {
  return <div className="field"><label htmlFor="email">Email</label>
    <span className="input-icon">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
      <input id="email" name="email" type="email" autoComplete="username" placeholder="nama@sekolah.sch.id" maxLength={254} required />
    </span>
  </div>;
}

function PasswordField({ label, autoComplete }: { label: string; autoComplete: "current-password" | "new-password" }) {
  const [show, setShow] = useState(false);
  return <div className="field"><label htmlFor="password">{label}</label>
    <span className="input-icon">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
      <input id="password" name="password" type={show ? "text" : "password"} autoComplete={autoComplete} minLength={8} maxLength={128} required />
      <button type="button" className="input-eye" aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} aria-pressed={show} onClick={() => setShow(!show)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{show && <path d="M4 4l16 16" />}</svg>
      </button>
    </span>
    {autoComplete === "new-password" && <span className="small muted">Minimal 8 karakter.</span>}
  </div>;
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [suggested, setSuggested] = useState("");

  useEffect(() => {
    let alive = true;
    const resetting = new URLSearchParams(window.location.search).has("reset");
    void api<{ needsOnboarding?: boolean; suggestedName?: string | null }>("/api/auth/profile").then((result) => {
      if (!alive) return;
      if (!result.ok) return setStep("login");
      if (resetting) return setStep("reset");
      if (result.data.needsOnboarding) {
        setSuggested(result.data.suggestedName ?? "");
        return setStep("onboarding");
      }
      router.replace("/guru/siswa");
    });
    return () => { alive = false; };
  }, [router]);

  function go(next: Step) {
    setStep(next); setError(""); setInfo("");
  }

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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = data.get("email"), password = data.get("password");
    setBusy(true); setError(""); setInfo("");
    if (step === "login") {
      const result = await api("/api/auth/login", { email, password });
      if (result.ok) return router.replace("/guru/siswa");
      setError(result.data.error ?? "Login gagal.");
    } else if (step === "register") {
      const result = await api<{ message?: string }>("/api/auth/register", { email, password });
      if (result.ok) { form.reset(); setInfo(result.data.message ?? "Periksa email untuk konfirmasi."); }
      else setError(result.data.error ?? "Registrasi gagal.");
    } else if (step === "forgot") {
      const result = await api<{ message?: string }>("/api/auth/forgot", { email });
      if (result.ok) setInfo(result.data.message ?? "Periksa email Anda.");
      else setError(result.data.error ?? "Permintaan gagal.");
    } else if (step === "reset") {
      const result = await api("/api/auth/reset", { password });
      if (result.ok) return router.replace("/guru/siswa");
      setError(result.data.error ?? "Kata sandi belum dapat diperbarui.");
    }
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

  const submitLabel = { login: "Masuk", register: "Daftar", forgot: "Kirim tautan", reset: "Simpan kata sandi" } as const;

  return (
    <main className="login">
      <section className="login-art" aria-hidden="true">
        <Image className="login-logo" src="/brand/logo-horizontal.svg" alt="" width={176} height={43} priority />
        <span className="login-paper"><i /><i /><i /><i /></span>
        <span className="login-bullets"><i /><i /></span>
        <Image className="login-piko" src="/mascot/piko-wave.svg" alt="" width={380} height={392} priority />
      </section>

      <section className="login-main">
        <Link className="login-close" href="/" aria-label="Kembali ke beranda">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </Link>
        <div className="login-card">
          {step === "checking" && <div className="login-loading" role="status">
            <Image src="/mascot/piko-listen.svg" alt="" width={140} height={144} priority />
            <span className="login-progress" aria-hidden="true"><i /></span>
            <p>Piko sedang memeriksa sesi login…</p>
          </div>}
          {step !== "checking" && <h1 className="login-title">{titles[step]}</h1>}

          {(step === "login" || step === "register" || step === "forgot" || step === "reset") && <>
            {step === "register" && <p className="login-lead">Mendaftar belum memberi akses guru. Operator sekolah yang memverifikasi akun Anda.</p>}
            {step === "forgot" && <p className="login-lead">Masukkan email akun Anda. Kami kirim tautan untuk mengatur ulang kata sandi.</p>}
            {step === "reset" && <p className="login-lead">Buat kata sandi baru untuk akun Anda.</p>}
            <form key={step} onSubmit={(event) => void submit(event)}>
              {step !== "reset" && <EmailField />}
              {step === "login" && <PasswordField label="Kata sandi" autoComplete="current-password" />}
              {(step === "register" || step === "reset") && <PasswordField label="Kata sandi baru" autoComplete="new-password" />}
              {step === "login" && <button type="button" className="login-link login-forgot" onClick={() => go("forgot")}>Lupa kata sandi?</button>}
              <button className="btn accent wide login-submit" type="submit" disabled={busy}>{busy ? "Memproses…" : submitLabel[step]}</button>
            </form>
            {error && <p className="notice error" role="alert">{error}</p>}
            {info && <p className="notice ok" role="status">{info}</p>}
          </>}

          {(step === "login" || step === "register") && <>
            <p className="login-divider"><span>{step === "login" ? "atau masuk dengan" : "atau daftar dengan"}</span></p>
            <button className="login-google" type="button" disabled={busy} onClick={() => void google()} aria-label="Lanjutkan dengan Google">
              <svg viewBox="0 0 48 48" width="24" height="24" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
              </svg>
            </button>
          </>}

          {step === "login" && <p className="login-foot">Belum punya akun? <button type="button" className="login-link" onClick={() => go("register")}>Daftar</button></p>}
          {(step === "register" || step === "forgot") && <p className="login-foot">{step === "register" ? "Sudah punya akun?" : "Ingat kata sandi?"} <button type="button" className="login-link" onClick={() => go("login")}>Masuk</button></p>}

          {step === "onboarding" && <form onSubmit={(event) => void onboard(event)}>
            <p className="login-lead">Langkah sekali jalan. Ini bukan verifikasi profesi guru dan bukan persetujuan wali.</p>
            <div className="field"><label htmlFor="fullName">Nama lengkap</label>
              <span className="input-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
                <input id="fullName" name="fullName" defaultValue={suggested} required maxLength={150} autoComplete="name" /></span></div>
            <div className="field"><label htmlFor="displayName">Nama panggilan (opsional)</label>
              <span className="input-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M6 16l10-10 3 3-10 10H6z" /></svg>
                <input id="displayName" name="displayName" maxLength={150} /></span></div>
            <div className="field"><label htmlFor="nip">NIP (opsional, 18 digit)</label>
              <span className="input-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 10h4M7 14h6" /></svg>
                <input id="nip" name="nip" inputMode="numeric" pattern="[0-9]{18}" maxLength={18} /></span></div>
            <label className="check"><input type="checkbox" name="confirmed" required />Saya mengonfirmasi data profil ini benar.</label>
            <button className="btn accent wide login-submit" type="submit" disabled={busy}>{busy ? "Menyimpan…" : "Simpan identitas"}</button>
            {error && <p className="notice error" role="alert" style={{ marginTop: 16 }}>{error}</p>}
          </form>}
        </div>
      </section>
    </main>
  );
}
