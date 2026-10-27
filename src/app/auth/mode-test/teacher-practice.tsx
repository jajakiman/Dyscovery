"use client";

import { useState, type FormEvent } from "react";

type PracticeSession = {
  id: string;
  status: string;
  practice_responses: { item_key: string; response: string; created_at: string }[];
};

export function TeacherPractice({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Belum ada respons yang dimuat.");

  async function load(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = String(new FormData(event.currentTarget).get("draftId")).trim();
    setSession(null); setBusy(true); setMessage("Memuat respons…");
    try {
      const response = await fetch(`/api/assessment-sessions/${encodeURIComponent(id)}/practice`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${data.error ?? "Permintaan ditolak."}`);
      setSession(data.session);
      setMessage(data.session.practice_responses.length ? "Respons dimuat, tanpa penilaian atau skor." : "Belum ada respons tersimpan pada draf ini.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Respons gagal dimuat. Coba lagi.");
    } finally { setBusy(false); }
  }

  return <section aria-labelledby="teacher-practice-heading">
    <h2 id="teacher-practice-heading">Baca respons latihan</h2>
    <p>Uji sintetis, baca saja. Kewenangan diperiksa server pada setiap permintaan.</p>
    <form onSubmit={(event) => void load(event)}>
      <label htmlFor="review-draft-id">ID draf latihan</label>
      <input id="review-draft-id" name="draftId" defaultValue={sessionId} required
        pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
        autoComplete="off" disabled={busy} onChange={() => { setSession(null); setMessage("Belum ada respons yang dimuat."); }} />
      <button type="submit" disabled={busy}>{busy ? "Memuat respons…" : "Baca respons latihan"}</button>
    </form>
    <p role="status">{message}</p>
    {session && <>
      <p>Draf: {session.id}. Status: {session.status}.</p>
      <ul>{session.practice_responses.map((item) => <li key={item.item_key}>
        <p>Butir: {item.item_key}</p>
        <p style={{ whiteSpace: "pre-wrap" }}>Respons: {item.response}</p>
        <p>Disimpan: <time dateTime={item.created_at}>{item.created_at}</time></p>
      </li>)}</ul>
    </>}
  </section>;
}
