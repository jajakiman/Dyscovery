"use client";

import { useState } from "react";

export function Practice() {
  const [prompt, setPrompt] = useState("");
  const [itemKey, setItemKey] = useState("");
  const [message, setMessage] = useState("Naikkan materi sintetis ke protokol text-practice-v1 sebelum memuat latihan.");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submission, setSubmission] = useState<{ itemKey: string; response: string; requestId: string } | null>(null);

  async function load() {
    setBusy(true); setPrompt(""); setMessage("Memuat latihan…");
    try {
      const response = await fetch("/api/student/practice", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const item = data.items[0];
      setPrompt(item.prompt); setItemKey(item.key); setSaved(data.responses.length > 0);
      setMessage(data.responses.length ? "Respons sudah tersimpan. Tidak ada skor." : "Latihan sintetis, bukan penilaian membaca. Ketik respons uji, tanpa data pribadi.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Latihan gagal dimuat. Coba lagi."); }
    finally { setBusy(false); }
  }

  return <section aria-label="Latihan sintetis">
    <h2>Latihan teks sintetis</h2>
    <button disabled={busy} onClick={() => void load()}>Muat latihan</button>
    {prompt && !saved && <form onSubmit={async (event) => {
      event.preventDefault();
      const body = submission ?? { itemKey, response: String(new FormData(event.currentTarget).get("response")), requestId: crypto.randomUUID() };
      setSubmission(body); setBusy(true); setMessage("Menyimpan respons…");
      try {
        const response = await fetch("/api/student/practice", { method: "POST", cache: "no-store",
          headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setSaved(true); setSubmission(null); setPrompt(""); setMessage("Respons tersimpan. Tidak dinilai dan tidak diberi skor.");
      } catch (error) { setPrompt(""); setMessage(error instanceof Error ? error.message : "Gagal menyimpan. Muat ulang latihan untuk memeriksa hasil."); }
      finally { setBusy(false); }
    }}>
      <label htmlFor="practice-response">{prompt}</label>
      <input id="practice-response" name="response" required maxLength={500} disabled={busy || submission !== null} defaultValue={submission?.response} autoComplete="off" />
      <button disabled={busy} type="submit">{submission ? "Ulang pengiriman yang sama" : "Simpan respons uji"}</button>
    </form>}
    <p role="status">{message}</p>
  </section>;
}
