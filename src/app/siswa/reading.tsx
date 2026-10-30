"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/ui/api";
import { createClient } from "@/lib/supabase/client";

type Item = { key: string; phase: string; encounterType: string; prompt: string };
type Payload = { sessionId: string; items: Item[]; done: string[] };
type Stage = "loading" | "unavailable" | "ready" | "recording" | "review" | "sending" | "finished" | "error";

const READ_TYPES = ["word_read", "passage_read"];
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export function Reading({ onReadingChange, fallback }: { onReadingChange: (active: boolean) => void; fallback: React.ReactNode }) {
  const [data, setData] = useState<Payload | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [index, setIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const duration = useRef(0);
  const stream = useRef<MediaStream | null>(null);
  const requestId = useRef<string>("");
  const attemptId = useRef<string>("");

  useEffect(() => {
    let alive = true;
    void api<Payload>("/api/student/session").then((r) => {
      if (!alive) return;
      if (!r.ok) { setMessage(r.data.error ?? "Materi tidak tersedia."); return setStage("unavailable"); }
      const done = new Set(r.data.done);
      const next = r.data.items.findIndex((i) => !done.has(i.key));
      setData(r.data); setIndex(next < 0 ? r.data.items.length : next);
      setStage(next < 0 ? "finished" : "ready");
    });
    return () => { alive = false; stream.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const item = data?.items[index];
  const needsAudio = !!item && READ_TYPES.includes(item.encounterType);
  useEffect(() => { onReadingChange(needsAudio && stage !== "finished"); return () => onReadingChange(false); }, [needsAudio, stage, onReadingChange]);

  async function start() {
    setMessage("");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const rec = new MediaRecorder(stream.current, MediaRecorder.isTypeSupported("audio/webm") ? { mimeType: "audio/webm" } : undefined);
      rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        duration.current = Date.now() - startedAt.current;
        setBlob(new Blob(chunks.current, { type: "audio/webm" })); setStage("review");
      };
      recorder.current = rec; startedAt.current = Date.now(); rec.start(); setStage("recording");
    } catch {
      setMessage("Mikrofon tidak dapat dipakai. Panggil guru untuk memeriksa izin mikrofon.");
    }
  }

  async function send(form?: HTMLFormElement) {
    if (!data || !item) return;
    setStage("sending"); setMessage("");
    if (!requestId.current) requestId.current = crypto.randomUUID();
    const text = form ? String(new FormData(form).get("response") ?? "").trim() : "";
    if (!attemptId.current) {
      const saved = await api<{ attemptId?: string }>("/api/student/task-attempts", {
        itemKey: item.key, encounterType: item.encounterType, phase: item.phase, requestId: requestId.current,
        attemptNumber: 1, response: needsAudio ? null : { text },
      });
      if (!saved.ok || !saved.data.attemptId) { setMessage(saved.data.error ?? "Belum tersimpan. Coba kirim lagi."); return setStage(needsAudio ? "review" : "ready"); }
      attemptId.current = saved.data.attemptId;
    }
    if (needsAudio && blob) {
      const up = await api<{ recordingId?: string; storageObjectKey?: string; token?: string }>("/api/student/audio/upload", { taskAttemptId: attemptId.current, mimeType: "audio/webm" });
      if (!up.ok || !up.data.token || !up.data.storageObjectKey || !up.data.recordingId) { setMessage(up.data.error ?? "Rekaman belum terkirim. Coba lagi."); return setStage("review"); }
      const put = await createClient().storage.from("private-recordings").uploadToSignedUrl(up.data.storageObjectKey, up.data.token, blob, { contentType: "audio/webm" });
      if (put.error) { setMessage("Rekaman belum terkirim. Coba lagi."); return setStage("review"); }
      const hash = hex(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()));
      const fin = await api("/api/student/audio/finalize", { recordingId: up.data.recordingId, contentHash: hash, byteSize: blob.size, durationMs: Math.max(100, duration.current) });
      if (!fin.ok) { setMessage(fin.data.error ?? "Rekaman belum terkonfirmasi. Coba lagi."); return setStage("review"); }
    }
    requestId.current = ""; attemptId.current = ""; setBlob(null);
    const next = index + 1;
    if (next >= data.items.length) {
      const done = await api(`/api/assessment-sessions/${data.sessionId}/complete`, {});
      if (!done.ok) { setMessage("Jawaban tersimpan, tetapi sesi belum ditutup. Panggil guru."); setIndex(next); return setStage("error"); }
      setIndex(next); return setStage("finished");
    }
    setIndex(next); setStage("ready");
  }

  if (stage === "loading") return <p role="status">Memuat bacaan.</p>;
  if (stage === "unavailable") return <>{fallback}</>;
  if (stage === "finished") return <p role="status">Sesi selesai. Terima kasih sudah membaca. Serahkan perangkat ke guru.</p>;
  if (stage === "error") return <p className="notice error" role="alert">{message}</p>;
  if (!data || !item) return null;

  const busy = stage === "sending";
  return (
    <section aria-label={`Soal ${index + 1} dari ${data.items.length}`}>
      <p className="muted small">Soal {index + 1} dari {data.items.length}</p>
      <p className="reading" style={{ margin: "16px 0 24px" }}>{item.prompt}</p>
      {needsAudio ? <div style={{ display: "grid", gap: 12 }}>
        {stage === "ready" && <button className="btn primary" onClick={() => void start()}>Mulai merekam</button>}
        {stage === "recording" && <>
          <p role="status">Sedang merekam.</p>
          <button className="btn accent" onClick={() => recorder.current?.stop()}>Selesai membaca</button>
        </>}
        {(stage === "review" || stage === "sending") && <>
          <p>Rekaman siap dikirim ke guru. Tidak ada nilai untuk anak.</p>
          <button className="btn primary" disabled={busy} onClick={() => void send()}>{busy ? "Mengirim." : "Kirim rekaman"}</button>
        </>}
      </div> : <form onSubmit={(e) => { e.preventDefault(); void send(e.currentTarget); }} style={{ display: "grid", gap: 12 }}>
        <div className="field"><label htmlFor="resp">Jawabanmu</label><input id="resp" name="response" required maxLength={300} autoComplete="off" disabled={busy} /></div>
        <button className="btn primary" type="submit" disabled={busy}>{busy ? "Menyimpan." : "Simpan jawaban"}</button>
      </form>}
      {message && <p className="notice error" role="alert" style={{ marginTop: 16 }}>{message}</p>}
    </section>
  );
}
