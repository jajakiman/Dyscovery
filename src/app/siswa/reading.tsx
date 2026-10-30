"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/ui/api";
import { createClient } from "@/lib/supabase/client";

type Item = { key: string; phase: string; encounterType: string; prompt: string; tiles: string[] | null };
type Payload = { sessionId: string; items: Item[]; done: string[] };
type Stage = "loading" | "unavailable" | "welcome" | "task" | "bridge" | "recording" | "review" | "sending" | "finished" | "error";

const READ_TYPES = ["word_read", "passage_read"];
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const isRead = (item?: Item) => !!item && READ_TYPES.includes(item.encounterType);

function Tiles({ tiles, busy, onDone }: { tiles: string[]; busy: boolean; onDone: (word: string) => void }) {
  const [slots, setSlots] = useState<(number | null)[]>(() => tiles.map(() => null));
  const used = new Set(slots.filter((s): s is number => s !== null));
  const full = slots.every((s) => s !== null);
  const place = (tile: number) => { const at = slots.indexOf(null); if (at >= 0) setSlots(slots.map((s, i) => (i === at ? tile : s))); };
  const remove = (at: number) => setSlots(slots.map((s, i) => (i === at ? null : s)));
  return (
    <div className="tiles-wrap">
      <ol className="slots" aria-label={`Kotak jawaban 1 sampai ${tiles.length}`}>
        {slots.map((s, i) => <li key={i}><button type="button" className="slot" disabled={busy || s === null} aria-label={s === null ? `Kotak ${i + 1} kosong` : `Kotak ${i + 1} berisi ${tiles[s]}. Tekan untuk mengembalikan`} onClick={() => remove(i)}>{s === null ? "" : tiles[s]}</button></li>)}
      </ol>
      <ul className="tile-row" aria-label="Ubin huruf">
        {tiles.map((t, i) => <li key={i}><button type="button" className="tile" disabled={busy || used.has(i)} aria-label={`Huruf ${t}`} onClick={() => place(i)}>{t}</button></li>)}
      </ul>
      <div className="tile-actions">
        <button type="button" className="btn secondary" disabled={busy || used.size === 0} onClick={() => setSlots(tiles.map(() => null))}>Coba Lagi</button>
        <button type="button" className="btn primary" disabled={busy || !full} onClick={() => onDone(slots.map((s) => tiles[s as number]).join(""))}>Selesai</button>
      </div>
      {!full && <p className="muted small" role="status">Tombol Selesai aktif setelah semua kotak terisi.</p>}
    </div>
  );
}

function Bridge({ percent, title, text, next }: { percent: number; title: string; text: string; next: () => void }) {
  return (
    <section className="bridge" aria-labelledby="bridge-title">
      <div className="progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`Kemajuan ${percent} persen`}><span style={{ width: `${percent}%` }} /></div>
      <p className="badge">{percent}%</p>
      <div className="asset-missing">[ASET BELUM TERSEDIA: {percent === 33 ? "piko-walk.svg" : "piko-celebrate.svg"}]</div>
      <h1 id="bridge-title">{title}</h1>
      <p>{text}</p>
      <button className="btn accent" onClick={next}>{percent === 33 ? "Lanjut ke Membaca" : "Lanjut ke Misi Terakhir"}</button>
    </section>
  );
}

export function Reading({ fallback }: { fallback: React.ReactNode }) {
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
  const requestId = useRef("");
  const attemptId = useRef("");

  useEffect(() => {
    let alive = true;
    void api<Payload>("/api/student/session").then((r) => {
      if (!alive) return;
      if (!r.ok) return setStage("unavailable");
      const done = new Set(r.data.done);
      const next = r.data.items.findIndex((i) => !done.has(i.key));
      setData(r.data); setIndex(next < 0 ? r.data.items.length : next);
      setStage(next < 0 ? "finished" : next === 0 ? "welcome" : "task");
    });
    return () => { alive = false; stream.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const item = data?.items[index];
  const reading = isRead(item) && stage !== "finished" && stage !== "welcome" && stage !== "bridge";

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

  async function send(text = "") {
    if (!data || !item) return;
    setStage("sending"); setMessage("");
    const audio = isRead(item);
    if (!requestId.current) requestId.current = crypto.randomUUID();
    if (!attemptId.current) {
      const saved = await api<{ attemptId?: string }>("/api/student/task-attempts", {
        itemKey: item.key, encounterType: item.encounterType, phase: item.phase, requestId: requestId.current,
        attemptNumber: 1, response: audio ? null : { text },
      });
      if (!saved.ok || !saved.data.attemptId) { setMessage(saved.data.error ?? "Belum tersimpan. Coba lagi."); return setStage(audio ? "review" : "task"); }
      attemptId.current = saved.data.attemptId;
    }
    if (audio && blob) {
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
    setIndex(next);
    if (next >= data.items.length) {
      const done = await api(`/api/assessment-sessions/${data.sessionId}/complete`, {});
      if (!done.ok) { setMessage("Jawaban tersimpan, tetapi sesi belum ditutup. Panggil guru."); return setStage("error"); }
      return setStage("finished");
    }
    const gap = data.items[next];
    const wasRead = isRead(item), nowRead = isRead(gap);
    setStage(!wasRead && nowRead ? "bridge" : wasRead && !nowRead ? "bridge" : "task");
  }

  if (stage === "loading") return <p role="status">Memuat petualangan.</p>;
  if (stage === "unavailable") return <>{fallback}</>;
  if (!data) return null;

  const stageClass = reading ? "stage stage-read" : "stage";
  return (
    <div className={stageClass}>
      {stage === "welcome" && <section className="welcome" aria-labelledby="hi">
        <Image className="piko" src="/mascot/piko-wave.svg" alt="" width={160} height={165} priority />
        <p className="badge">Selamat datang</p>
        <h1 id="hi">Halo, penjelajah kecil!</h1>
        <p>Piko siap menemanimu menjelajah pulau kata dan mengumpulkan petunjuk seru.</p>
        <p className="tray">Sentuh layar atau gunakan tetikus untuk berpetualang. Tidak perlu berbicara di awal petualangan.</p>
        <button className="btn accent big" onClick={() => setStage("task")}>Mulai Petualangan!</button>
      </section>}

      {stage === "bridge" && (isRead(item) && !isRead(data.items[index - 1])
        ? <Bridge percent={33} title="Hebat! Piko melanjutkan perjalanan ke bukit membaca." text="Bersiaplah membaca dengan mikrofon!" next={() => setStage("task")} />
        : <Bridge percent={66} title="Satu rintangan lagi untuk menyelesaikan peta!" text="Terima kasih sudah membaca dengan sungguh-sungguh." next={() => setStage("task")} />)}

      {(stage === "task" || stage === "recording" || stage === "review" || stage === "sending") && item && <>
        {!reading && <Image className="piko" src="/mascot/piko-guide.svg" alt="" width={120} height={124} />}
        <section className="reading-card" aria-label={`Soal ${index + 1} dari ${data.items.length}`}>
          <p className="muted small">Soal {index + 1} dari {data.items.length}</p>
          {reading
            ? <>
                <p className="muted" style={{ margin: "8px 0 16px" }}>Bacalah dengan suaramu sendiri. Mikrofon merekam bacaanmu secara otomatis.</p>
                <p className="reading" style={{ margin: "0 0 24px" }}>{item.prompt}</p>
              </>
            : <p className="reading" style={{ margin: "12px 0 24px" }}>{item.prompt}</p>}

          {isRead(item) ? <div style={{ display: "grid", gap: 12 }}>
            {stage === "task" && <button className="btn primary big" onClick={() => void start()}>Mulai merekam</button>}
            {stage === "recording" && <button className="btn accent big" onClick={() => recorder.current?.stop()}>Selesai membaca</button>}
            {(stage === "review" || stage === "sending") && <>
              <p>Rekaman siap dikirim ke guru.</p>
              <button className="btn primary big" disabled={stage === "sending"} onClick={() => void send()}>{stage === "sending" ? "Mengirim." : "Kirim rekaman"}</button>
            </>}
            <p className="tray" role="status">{stage === "recording" ? "Mikrofon aktif: merekam suara bacaan" : "Mikrofon belum aktif. Tekan Mulai merekam saat siap."}</p>
          </div>
          : item.tiles ? <Tiles key={item.key} tiles={item.tiles} busy={stage === "sending"} onDone={(w) => void send(w)} />
          : <form key={item.key} onSubmit={(e) => { e.preventDefault(); void send(String(new FormData(e.currentTarget).get("response") ?? "").trim()); }} style={{ display: "grid", gap: 12 }}>
              <div className="field"><label htmlFor="resp">Jawabanmu</label><input id="resp" name="response" required maxLength={300} autoComplete="off" disabled={stage === "sending"} /></div>
              <button className="btn primary big" type="submit" disabled={stage === "sending"}>{stage === "sending" ? "Menyimpan." : "Simpan jawaban"}</button>
            </form>}
          {message && <p className="notice error" role="alert" style={{ marginTop: 16 }}>{message}</p>}
        </section>
      </>}

      {stage === "finished" && <section className="welcome" aria-labelledby="fin">
        <Image className="piko" src="/mascot/piko-cheer.svg" alt="" width={160} height={165} />
        <h1 id="fin">Petualangan selesai!</h1>
        <p>Terima kasih sudah ikut berpetualang. Serahkan perangkat ke guru.</p>
      </section>}
      {stage === "error" && <p className="notice error" role="alert">{message}</p>}
    </div>
  );
}
