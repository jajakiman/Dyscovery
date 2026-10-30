"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/ui/api";
import { createClient } from "@/lib/supabase/client";
import { micVerdict, rms, SILENCE_RMS, SILENCE_WARN_MS } from "@/lib/ui/mic";

type Item = { key: string; phase: string; encounterType: string; prompt: string; tiles: string[] | null; image?: string | null; choices?: string[] | null };
type Payload = { sessionId: string; items: Item[]; done: string[] };
type MicIssue = "" | "denied" | "missing" | "silent" | "short";

// ponytail: local simulation for demo roster; nothing is saved. Same items as seed-reading-4pos.sql.
export const DEMO_PAYLOAD: Payload = {
  sessionId: "demo",
  done: [],
  items: [
    { key: "pos1-benda", phase: "screening", encounterType: "spelling_image", prompt: "Benda apa ini?", tiles: null, image: "/assets/bola.svg", choices: ["bola", "bula", "dola"] },
    { key: "pos2-hewan", phase: "screening", encounterType: "spelling_image", prompt: "Apa hewan ini?", tiles: null, image: "/assets/kucing.svg", choices: ["kucing", "kusing", "kuncing"] },
    { key: "pos3-susun", phase: "screening", encounterType: "letter_arrange", prompt: "Susun huruf menjadi nama benda di gambar.", tiles: ["P", "A", "K", "E", "A", "L"], image: "/assets/kelapa.svg" },
    { key: "pos4-bacaan", phase: "screening", encounterType: "passage_read", prompt: "Budi pergi ke kebun bersama Ibu. Mereka memetik kelapa di bawah pohon rindang.", tiles: null },
  ],
};

const MIC_TEXT: Record<Exclude<MicIssue, "">, string> = {
  denied: "Izin mikrofon ditolak. Minta guru mengizinkan mikrofon di pengaturan browser, lalu tekan Periksa ulang.",
  missing: "Mikrofon tidak ditemukan. Minta guru memasang atau menyalakan mikrofon, lalu tekan Periksa ulang.",
  silent: "Suara tidak terdengar di rekaman. Periksa tombol bisu mikrofon, lalu rekam ulang.",
  short: "Rekaman terlalu pendek. Bacalah sampai selesai, lalu rekam ulang.",
};

type Stage =
  | "loading"
  | "unavailable"
  | "welcome"      // S01: Frame 7
  | "discovery"    // S02: Frame 8 (Penemuan kelapa)
  | "task"         // S03: Frame 9 (Susun huruf) / S05: Frame 11 (Membaca nyaring)
  | "bridge"       // S04: Frame 10 (Transisi 33%) / S06: Frame 12 (Transisi 66%)
  | "recording"    // S05 recording state
  | "review"       // S05 review audio state
  | "sending"      // S05 upload & finalize state
  | "finished"     // S08: Frame 14 (Petualangan selesai)
  | "error";

const READ_TYPES = ["word_read", "passage_read"];
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const isRead = (item?: Item) => !!item && READ_TYPES.includes(item.encounterType);

function Subbar({ percent }: { percent: number }) {
  return (
    <div className="student-subbar">
      <span className="subbar-title">Peta petualangan</span>
      <div className="subbar-track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`Kemajuan ${percent} persen`}>
        <div className="subbar-fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="subbar-pct">{percent}% selesai</span>
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  const steps = [
    { num: 1, label: "Hutan kelapa" },
    { num: 2, label: "Bukit membaca" },
    { num: 3, label: "Peta selesai" },
  ];
  return (
    <div className="checkpoint-stepper" aria-label="Alur pos petualangan">
      {steps.map((st, i) => {
        const isDone = st.num < currentStep;
        const isActive = st.num === currentStep;
        return (
          <div key={st.num} className="checkpoint-step">
            {i > 0 && <span className={`checkpoint-line ${isDone || isActive ? "active" : ""}`} aria-hidden="true" />}
            <span className={`checkpoint-circle ${isDone ? "done" : isActive ? "active" : "inactive"}`} aria-hidden="true">
              {st.num}
            </span>
            <span className={`checkpoint-label ${isDone || isActive ? "active" : ""}`}>{st.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Tiles({ tiles, image, busy, onDone }: { tiles: string[]; image?: string | null; busy: boolean; onDone: (word: string) => void }) {
  const [slots, setSlots] = useState<(number | null)[]>(() => tiles.map(() => null));
  const used = new Set(slots.filter((s): s is number => s !== null));
  const full = slots.every((s) => s !== null);

  const place = (tileIdx: number) => {
    const at = slots.indexOf(null);
    if (at >= 0) setSlots(slots.map((s, i) => (i === at ? tileIdx : s)));
  };
  const remove = (at: number) => setSlots(slots.map((s, i) => (i === at ? null : s)));

  return (
    <div className="tiles-interactive">
      <div className="coconut-preview">
        <Image src={image || "/assets/kelapa.svg"} alt="Gambar benda yang dieja" width={112} height={100} priority />
      </div>

      <ol className="slots-container" aria-label={`Kotak jawaban 1 sampai ${tiles.length}`}>
        {slots.map((s, i) => (
          <li key={i} className="slot-col">
            <span className="slot-num" aria-hidden="true">{i + 1}</span>
            <button
              type="button"
              className={`slot-box ${s !== null ? "filled" : ""}`}
              disabled={busy || s === null}
              aria-label={s === null ? `Kotak ${i + 1} kosong` : `Kotak ${i + 1} berisi ${tiles[s]}. Tekan untuk batal`}
              onClick={() => remove(i)}
            >
              {s === null ? "" : tiles[s]}
            </button>
          </li>
        ))}
      </ol>

      <ul className="tile-row" aria-label="Pilihan ubin huruf">
        {tiles.map((t, i) => (
          <li key={i}>
            <button
              type="button"
              className="tile-box"
              disabled={busy || used.has(i)}
              aria-label={`Huruf ${t}`}
              onClick={() => place(i)}
            >
              {t}
            </button>
          </li>
        ))}
      </ul>

      <div className="guide-tray tile-guide">
        <p>Sentuh ubin huruf untuk memasukkan ke kotak. Ketuk ubin di kotak untuk membatalkan.</p>
      </div>

      <div className="tile-actions">
        <button
          type="button"
          className="btn secondary"
          disabled={busy || used.size === 0}
          onClick={() => setSlots(tiles.map(() => null))}
        >
          Coba Lagi
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={busy || !full}
          onClick={() => onDone(slots.map((s) => tiles[s as number]).join(""))}
        >
          {busy ? "Menyimpan…" : "Selesai latihan"}
        </button>
      </div>
      {!full && <p className="muted small" role="status">Lengkapi semua kotak untuk melanjutkan.</p>}
    </div>
  );
}

function Bridge({
  percent,
  title,
  text,
  next,
}: {
  percent: number;
  title: string;
  text: string;
  next: () => void;
}) {
  const isSecond = percent > 50;
  return (
    <div className="student-stage-box bridge-stage">
      <Stepper currentStep={isSecond ? 3 : 2} />
      <h1 className="stage-title">{title}</h1>
      <div className="bridge-mascot">
        <Image
          src={isSecond ? "/mascot/piko-cheer.svg" : "/mascot/piko-guide.svg"}
          alt=""
          width={280}
          height={290}
          priority
        />
      </div>
      <div className="bridge-dialog-card">
        <p className="bridge-dialog-text">{text}</p>
        <button type="button" className="btn primary" onClick={next}>
          Lanjutkan
        </button>
      </div>
      <p className="caption-disclaimer">
        Kartu transisi • Pose Piko menggunakan aset pengganti yang disetujui
      </p>
    </div>
  );
}

export function Reading({ fallback, onExitTeacher, demo = false }: { fallback: React.ReactNode; onExitTeacher: () => void; demo?: boolean }) {
  const [data, setData] = useState<Payload | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [index, setIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [pauseKind, setPauseKind] = useState<"rest" | "call" | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const duration = useRef(0);
  const stream = useRef<MediaStream | null>(null);
  const requestId = useRef("");
  const attemptId = useRef("");
  const [micIssue, setMicIssue] = useState<MicIssue>("");
  const [level, setLevel] = useState(0);
  const [quiet, setQuiet] = useState(false);
  const audioCtx = useRef<AudioContext | null>(null);
  const peak = useRef(0);

  const stopMeter = () => {
    void audioCtx.current?.close();
    audioCtx.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
  };

  useEffect(() => {
    let alive = true;
    if (demo) {
      const t = window.setTimeout(() => { setData(DEMO_PAYLOAD); setStage("welcome"); }, 0);
      return () => { window.clearTimeout(t); stopMeter(); };
    }
    void api<Payload>("/api/student/session").then((r) => {
      if (!alive) return;
      if (!r.ok) return setStage("unavailable");
      const done = new Set(r.data.done);
      const next = r.data.items.findIndex((i) => !done.has(i.key));
      setData(r.data);
      setIndex(next < 0 ? r.data.items.length : next);
      setStage(next < 0 ? "finished" : next === 0 ? "welcome" : "task");
    });
    return () => {
      alive = false;
      stopMeter();
    };
  }, [demo]);

  const item = data?.items[index];
  const reading = isRead(item) && stage !== "finished" && stage !== "welcome" && stage !== "discovery" && stage !== "bridge";

  // Calculate percentage matching prototype milestones (0%, 33%, 66%, 100%)
  const pct = stage === "finished" ? 100 : index < 2 ? 0 : index < 3 ? 33 : 66;

  async function start() {
    setMessage(""); setMicIssue(""); setQuiet(false); setLevel(0);
    peak.current = 0;
    if (!navigator.mediaDevices?.getUserMedia) return setMicIssue("missing");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      return setMicIssue(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "missing");
    }
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream.current).connect(analyser);
      audioCtx.current = ctx;
      const buf = new Float32Array(analyser.fftSize);
      const t0 = Date.now();
      const tick = () => {
        if (audioCtx.current !== ctx) return;
        analyser.getFloatTimeDomainData(buf);
        const v = rms(buf);
        peak.current = Math.max(peak.current, v);
        setLevel(v);
        setQuiet(Date.now() - t0 > SILENCE_WARN_MS && peak.current < SILENCE_RMS);
        requestAnimationFrame(tick);
      };
      tick();
    } catch {
      peak.current = 1; // ponytail: no Web Audio → skip silence check, keep recording usable.
    }
    try {
      chunks.current = [];
      const rec = new MediaRecorder(
        stream.current,
        MediaRecorder.isTypeSupported("audio/webm") ? { mimeType: "audio/webm" } : undefined
      );
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        stopMeter();
        setLevel(0); setQuiet(false);
        duration.current = Date.now() - startedAt.current;
        const verdict = micVerdict(duration.current, peak.current);
        if (verdict !== "ok") { setMicIssue(verdict); setBlob(null); return setStage("task"); }
        setBlob(new Blob(chunks.current, { type: "audio/webm" }));
        setStage("review");
      };
      recorder.current = rec;
      startedAt.current = Date.now();
      rec.start();
      setStage("recording");
    } catch {
      stopMeter();
      setMicIssue("missing");
    }
  }

  async function send(text = "") {
    if (!data || !item) return;
    setStage("sending");
    setMessage("");
    if (demo) return advance();
    const audio = isRead(item);
    if (!requestId.current) requestId.current = crypto.randomUUID();
    if (!attemptId.current) {
      const saved = await api<{ attemptId?: string }>("/api/student/task-attempts", {
        itemKey: item.key,
        encounterType: item.encounterType,
        phase: item.phase,
        requestId: requestId.current,
        attemptNumber: 1,
        response: audio ? null : { text },
      });
      if (!saved.ok || !saved.data.attemptId) {
        setMessage(saved.data.error ?? "Belum tersimpan. Coba lagi.");
        return setStage(audio ? "review" : "task");
      }
      attemptId.current = saved.data.attemptId;
    }
    if (audio && blob) {
      const up = await api<{ recordingId?: string; storageObjectKey?: string; token?: string }>(
        "/api/student/audio/upload",
        { taskAttemptId: attemptId.current, mimeType: "audio/webm" }
      );
      if (!up.ok || !up.data.token || !up.data.storageObjectKey || !up.data.recordingId) {
        setMessage(up.data.error ?? "Rekaman belum terkirim. Coba lagi.");
        return setStage("review");
      }
      const put = await createClient()
        .storage.from("private-recordings")
        .uploadToSignedUrl(up.data.storageObjectKey, up.data.token, blob, { contentType: "audio/webm" });
      if (put.error) {
        setMessage("Rekaman belum terkirim. Coba lagi.");
        return setStage("review");
      }
      const hash = hex(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()));
      const fin = await api("/api/student/audio/finalize", {
        recordingId: up.data.recordingId,
        contentHash: hash,
        byteSize: blob.size,
        durationMs: Math.max(100, duration.current),
      });
      if (!fin.ok) {
        setMessage(fin.data.error ?? "Rekaman belum terkonfirmasi. Coba lagi.");
        return setStage("review");
      }

      // Automatically dispatch AI candidate analysis in the background
      void api(`/api/assessment-sessions/${data.sessionId}/ai/dispatch`, {
        purpose: "ai",
      });
    }
    return advance();
  }

  async function advance() {
    if (!data) return;
    requestId.current = "";
    attemptId.current = "";
    setBlob(null);

    const next = index + 1;
    setIndex(next);
    if (next >= data.items.length) {
      if (demo) return setStage("finished");
      const done = await api(`/api/assessment-sessions/${data.sessionId}/complete`, {});
      if (!done.ok) {
        setMessage("Jawaban tersimpan, tetapi sesi belum ditutup. Panggil guru.");
        return setStage("error");
      }
      return setStage("finished");
    }
    const gap = data.items[next];
    const wasRead = isRead(item);
    const nowRead = isRead(gap);
    setStage(!wasRead && nowRead ? "bridge" : wasRead && !nowRead ? "bridge" : "task");
  }

  if (stage === "loading") return <p role="status" className="checking-mode">Memuat petualangan…</p>;
  if (stage === "unavailable") return <>{fallback}</>;
  if (!data) return null;

  return (
    <div className="student-flow-wrap">
      {stage !== "welcome" && <Subbar percent={pct} />}

      {/* S01 / Frame 7: Sambutan */}
      {stage === "welcome" && (
        <div className="student-stage-box stage-forest">
          <div className="stage-split">
            <div className="stage-mascot-col">
              <Image className="mascot-img" src="/mascot/piko-wave.svg" alt="Piko melambaikan tangan" width={380} height={392} priority />
              <p className="mascot-banner">Ayo mulai petualangan seru bersama Piko!</p>
            </div>
            <div className="stage-card-col">
              <div className="stage-card">
                <span className="badge-welcome">Selamat datang</span>
                <h1 className="welcome-heading">Halo, penjelajah kecil!</h1>
                <p className="welcome-desc">Piko siap menemanimu menjelajah pulau kata dan mengumpulkan petunjuk seru.</p>
                <div className="tray guide-tray">
                  <p>Sentuh layar atau gunakan tetikus untuk berpetualang. Tidak perlu berbicara di awal petualangan.</p>
                </div>
                <p className="welcome-helper">Duduk yang nyaman. Tidak perlu terburu-buru.</p>
                <button type="button" className="btn primary welcome-btn" onClick={() => setStage("discovery")}>
                  Mulai Petualangan!
                </button>
              </div>
            </div>
          </div>
          <p className="caption-disclaimer">
            Mode siswa • Guru mendampingi selama kegiatan • Sentuh tombol untuk mulai
          </p>
        </div>
      )}

      {/* S02 / Frame 8: Story Scene 1 (Penemuan Kelapa) */}
      {stage === "discovery" && (
        <div className="student-stage-box stage-forest">
          <div className="discovery-layout">
            <div className="discovery-object-wrap">
              <Image src="/assets/kelapa.svg" alt="Buah kelapa di tanah hutan" width={180} height={160} priority />
            </div>
            <div className="discovery-mascot-wrap">
              <Image src="/mascot/piko-guide.svg" alt="Piko memandu" width={220} height={218} priority />
            </div>
            <div className="bridge-dialog-card discovery-dialog">
              <div>
                <h2 className="discovery-title">Wah, ada buah kelapa!</h2>
                <p className="bridge-dialog-text">Bisakah kamu membantu Piko menyusun hurufnya?</p>
              </div>
              <button
                type="button"
                className="btn primary"
                style={{ minWidth: 180, minHeight: 52 }}
                onClick={() => setStage("task")}
              >
                Ayo, bantu Piko
              </button>
            </div>
          </div>
          <p className="caption-disclaimer">
            Kegiatan membaca terbimbing • Didampingi guru
          </p>
        </div>
      )}

      {/* S04 / S06: Layar Jeda / Transisi Bridge */}
      {stage === "bridge" && (
        isRead(item) && !isRead(data.items[index - 1]) ? (
          <Bridge
            percent={33}
            title="Menuju bukit membaca"
            text="Hebat! Piko melanjutkan perjalanan ke bukit membaca. Bersiaplah membaca cerita dengan mikrofon!"
            next={() => setStage("task")}
          />
        ) : (
          <Bridge
            percent={66}
            title="Peti harta sudah terbuka!"
            text="Satu rintangan lagi untuk menyelesaikan peta!"
            next={() => setStage("task")}
          />
        )
      )}

      {/* S03 / S05: Task Screens */}
      {(stage === "task" || stage === "recording" || stage === "review" || stage === "sending") && item && (
        <div className={`student-stage-box ${reading ? "reading-meadow" : "task-meadow"}`}>
          {/* Header area of the task */}
          <div className="task-header-block">
            <h1 className="task-main-heading">
              {reading ? "Saatnya membaca pelan-pelan" : item.tiles ? "Bantu Piko menyusun kata" : item.image ? item.prompt : "Tantangan berikutnya"}
            </h1>
            <p className="task-sub-heading">
              {reading
                ? "Bacalah dengan suaramu sendiri. Mikrofon merekam bacaanmu secara otomatis."
                : item.tiles
                ? `Pilih ubin huruf di bawah, lalu masukkan ke dalam kotak 1 sampai ${item.tiles.length}.`
                : item.image
                ? item.choices ? "Sentuh nama yang tepat untuk gambar ini." : "Ketik nama gambar ini."
                : item.prompt}
            </p>
          </div>

          {reading ? (
            /* S05 / Frame 11: Active Reading Card (Piko STRICTLY HIDDEN) */
            <div className="reading-stage-wrap">
              <section className="reading-passage-card" aria-label="Teks bacaan anak">
                <div className="passage-title-row">
                  <h2 className="passage-title">Pagi di kebun</h2>
                  <span className="passage-category-tag">Pos {index + 1} dari {data.items.length}</span>
                </div>
                <div className="reading-text-body">
                  <p className="reading">{item.prompt}</p>
                </div>

                <div className="reading-mic-tray" role="status">
                  <div className="mic-indicator-bars" aria-hidden="true">
                    {[0.3, 0.5, 0.75, 0.95, 0.4, 0.6, 0.8, 1, 0.45, 0.65, 0.85].map((w, i) => (
                      <span
                        key={i}
                        className="mic-bar"
                        style={{
                          height: stage === "recording" ? `${Math.max(6, Math.min(32, level * 400 * w))}px` : "6px",
                          opacity: stage === "recording" ? 1 : 0.35,
                        }}
                      />
                    ))}
                  </div>
                  <span className="mic-status-label">
                    {stage === "recording" && quiet
                      ? "Suara belum terdengar. Bacalah lebih dekat ke mikrofon."
                      : stage === "recording" && level >= SILENCE_RMS
                      ? "Suara terdengar jelas"
                      : stage === "recording"
                      ? "Mikrofon aktif: merekam suara bacaan"
                      : stage === "review"
                      ? "Rekaman siap dikirim ke guru"
                      : stage === "sending"
                      ? "Mengirim rekaman ke guru…"
                      : "Mikrofon belum aktif. Tekan Mulai saat siap."}
                  </span>
                </div>
                {micIssue && (
                  <div className="notice warn mic-issue" role="alert">
                    <Image src="/mascot/piko-call-teacher.svg" alt="" width={64} height={66} />
                    <p>{MIC_TEXT[micIssue]}</p>
                  </div>
                )}
              </section>

              {/* Bottom Reading Controls Bar per Frame 11 */}
              <div className="reading-controls-bar">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setPauseKind("call")}
                >
                  Bantuan Guru
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setPauseKind("rest")}
                >
                  Jeda
                </button>
                <div className="reading-action-right">
                  {stage === "task" && (
                    <button type="button" className="btn primary reading-cta-btn" onClick={() => void start()}>
                      {micIssue === "denied" || micIssue === "missing" ? "Periksa ulang" : micIssue ? "Rekam ulang" : "Mulai merekam"}
                    </button>
                  )}
                  {stage === "recording" && (
                    <button
                      type="button"
                      className="btn accent reading-cta-btn"
                      onClick={() => recorder.current?.stop()}
                    >
                      Selesai membaca
                    </button>
                  )}
                  {(stage === "review" || stage === "sending") && (
                    <button
                      type="button"
                      className="btn primary reading-cta-btn"
                      disabled={stage === "sending"}
                      onClick={() => void send()}
                    >
                      {stage === "sending" ? "Mengirim…" : "Kirim rekaman"}
                    </button>
                  )}
                </div>
              </div>
              <p className="caption-disclaimer">
                Membaca terbimbing • Piko mendampingi di awal dan akhir pos
              </p>
            </div>
          ) : (
            /* S03: Frame 9 Task with Mascot Piko Guide & Tactile Tiles */
            <div className="task-stage-layout">
              <div className="task-mascot-side">
                <Image src="/mascot/piko-guide.svg" alt="Piko memandu" width={240} height={238} priority />
              </div>
              <div className="task-interactive-side">
                {item.tiles ? (
                  <Tiles key={item.key} tiles={item.tiles} image={item.image} busy={stage === "sending"} onDone={(w) => void send(w)} />
                ) : item.image && item.choices ? (
                  <div key={item.key} className="picture-task">
                    <Image src={item.image} alt="Gambar soal" width={160} height={160} priority />
                    <ul className="choice-row" aria-label="Pilihan jawaban">
                      {item.choices.map((c) => (
                        <li key={c}>
                          <button type="button" className="tile-box choice-box reading" disabled={stage === "sending"} onClick={() => void send(c)}>{c}</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <form
                    key={item.key}
                    className="task-form-box"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void send(String(new FormData(e.currentTarget).get("response") ?? "").trim());
                    }}
                  >
                    {item.image && <Image src={item.image} alt="Gambar soal" width={160} height={160} priority style={{ justifySelf: "center" }} />}
                    <div className="field">
                      <label htmlFor="resp">Jawabanmu</label>
                      <input id="resp" name="response" required maxLength={300} autoComplete="off" disabled={stage === "sending"} />
                    </div>
                    <button className="btn primary" type="submit" disabled={stage === "sending"}>
                      {stage === "sending" ? "Menyimpan…" : "Simpan jawaban"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {message && <p className="notice error" role="alert" style={{ marginTop: 20 }}>{message}</p>}
        </div>
      )}

      {/* S07 / Frame 13: Modal Jeda & Bantuan Teknis */}
      {pauseKind && (
        <div className="pause-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pause-heading">
          <div className="pause-modal-card">
            <Image
              src={pauseKind === "call" ? "/mascot/piko-call-teacher.svg" : "/mascot/piko-rest.svg"}
              alt=""
              width={160}
              height={170}
              priority
            />
            <h2 id="pause-heading" className="pause-modal-title">
              {pauseKind === "call" ? "Panggil bantuan guru" : "Istirahat sebentar, yuk."}
            </h2>
            <p className="pause-modal-desc">
              {pauseKind === "call"
                ? "Ada kendala teknis atau pertanyaan? Panggil guru pendampingmu."
                : "Rekaman dijeda. Tarik napas pelan-pelan. Panggil guru jika butuh bantuan."}
            </p>

            <div className="soundcheck-box">
              <span className="soundcheck-label">Periksa suara sekitar</span>
              <span className="soundcheck-badge">Kebisingan rendah</span>
            </div>

            <div className="pause-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => setPauseKind(null)}
              >
                Kembali ke kegiatan
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setPauseKind(null);
                  onExitTeacher();
                }}
              >
                Buka dasbor guru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* S08 / Frame 14: Petualangan Selesai */}
      {stage === "finished" && (
        <div className="student-stage-box stage-forest">
          <div className="stage-split">
            <div className="stage-mascot-col">
              <Image className="mascot-img" src="/mascot/piko-cheer.svg" alt="Piko bersorak gembira" width={380} height={400} priority />
            </div>
            <div className="stage-card-col">
              <div className="stage-card finish-card">
                <span className="badge-welcome">Peta selesai • 100%</span>
                <h1 className="welcome-heading">Hore! Petualangan Selesai!</h1>
                <p className="welcome-desc">
                  Terima kasih sudah membantu Piko.<br />
                  Kamu sudah berusaha dengan sangat baik!
                </p>
                <div className="tray guide-tray finish-notice">
                  <p>Sekarang, serahkan perangkat ini kepada bapak atau ibu guru.</p>
                </div>
                <button
                  type="button"
                  className="btn primary welcome-btn"
                  onClick={onExitTeacher}
                >
                  Serahkan Perangkat ke Guru
                </button>
                <p className="finish-disclaimer">
                  Tidak ada skor, label risiko, atau diagnosis yang ditampilkan kepada anak
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {stage === "error" && <p className="notice error" role="alert">{message}</p>}
    </div>
  );
}
