"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/ui/api";
import { Modal } from "@/lib/ui/modal";

export function LogoutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setBusy(true); setError("");
    const result = await api("/api/auth/logout", {});
    if (result.ok) return router.replace("/masuk");
    setError(result.data.error ?? "Logout gagal. Coba lagi.");
    setBusy(false);
  }

  return <>
    <button type="button" className="btn secondary btn-logout" onClick={() => { setError(""); setOpen(true); }}>Keluar</button>
    <Modal open={open} onClose={() => !busy && setOpen(false)} titleId="logout-title">
      <div className="logout-modal">
        <Image src="/mascot/piko-rest.svg" alt="" width={120} height={124} />
        <h2 id="logout-title">Keluar dari ruang guru?</h2>
        <p className="muted">Sesi login di perangkat ini akan diakhiri. Masuk lagi untuk membuka portal guru.</p>
        {error && <p className="notice error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn secondary" disabled={busy} onClick={() => setOpen(false)}>Batal</button>
          <button type="button" className="btn danger" disabled={busy} onClick={() => void logout()}>{busy ? "Memproses…" : "Ya, keluar"}</button>
        </div>
      </div>
    </Modal>
  </>;
}
