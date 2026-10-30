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

function Tiles({ tiles, busy, onDone }: { tiles: string[]; busy: boolean; onDone: (word: string) => void }) {
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
        <Image src="/assets/kelapa.svg" alt="Buah kelapa" width={106} height={94} priority />
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

      <div className="tray tile-guide">
        <span>Sentuh ubin huruf untuk memasukkan ke kotak. Ketuk ubin di kotak untuk membatalkan.</span>
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
            <span className={`checkpoint-circle ${isDone || isActive ? "active" : "inactive"}`} aria-hidden="true">
              {st.num}
            </span>
            <span className={`checkpoint-label ${isDone || isActive ? "active" : ""}`}>{st.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Bridge({ percent, title, text, next }: { percent: number; title: string; text: string; next: () => void }) {
  const isSecond = percent > 50;
  return (
    <div className="student-stage-box bridge-stage">
      <Stepper currentStep={isSecond ? 2 : 1} />
      <h1 className="stage-title">{title}</h1>
      <div className="bridge-mascot">
        <Image
          src={isSecond ? "/mascot/piko-cheer.svg" : "/mascot/piko-guide.svg"}
          alt=""
          width={isSecond ? 280 : 280}
          height={isSecond ? 298 : 278}
          priority
        />
      </div>
      <div className="bridge-dialog-card">
        <p className="bridge-dialog-text">{text}</p>
        <button type="button" className="btn primary" onClick={next}>
          Lanjutkan
        </button>
      </div>
    </div>
  );
}

export function Reading({ fallback, onExitTeacher }: { fallback: React.ReactNode; onExitTeacher: () => void }) {
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

  useEffect(() => {
    let alive = true;
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
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const item = data?.items[index];
  const reading = isRead(item) && stage !== "finished" && stage !== "welcome" && stage !== "bridge";

  // Calculate percentage matching prototype milestones
  const pct = stage === "finished" ? 100 : index < 2 ? 0 : index < 3 ? 33 : 66;

  async function start() {
    setMessage("");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const rec = new MediaRecorder(
        stream.current,
        MediaRecorder.isTypeSupported("audio/webm") ? { mimeType: "audio/webm" } : undefined
      );
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        duration.current = Date.now() - startedAt.current;
        setBlob(new Blob(chunks.current, { type: "audio/webm" }));
        setStage("review");
      };
      recorder.current = rec;
      startedAt.current = Date.now();
      rec.start();
      setStage("recording");
    } catch {
      setMessage("Mikrofon tidak dapat dipakai. Panggil guru untuk memeriksa izin mikrofon.");
    }
  }

  async function send(text = "") {
    if (!data || !item) return;
    setStage("sending");
    setMessage("");
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
    }
    requestId.current = "";
    attemptId.current = "";
    setBlob(null);

    const next = index + 1;
    setIndex(next);
    if (next >= data.items.length) {
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
                <button type="button" className="btn primary welcome-btn" onClick={() => setStage("task")}>
                  Mulai Petualangan!
                </button>
              </div>
            </div>
          </div>
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

      {/* S02/S03/S05: Task Screens */}
      {(stage === "task" || stage === "recording" || stage === "review" || stage === "sending") && item && (
        <div className={`student-stage-box ${reading ? "reading-meadow" : "task-meadow"}`}>
          {/* Header area of the task */}
          <div className="task-header-block">
            <h1 className="task-main-heading">
              {reading ? "Saatnya membaca pelan-pelan" : item.tiles ? "Bantu Piko menyusun kata" : "Tantangan berikutnya"}
            </h1>
            <p className="task-sub-heading">
              {reading
                ? "Bacalah dengan suaramu sendiri. Mikrofon merekam bacaanmu secara otomatis."
                : item.tiles
                ? "Pilih ubin huruf di bawah, lalu masukkan ke dalam kotak 1 sampai 6."
                : item.prompt}
            </p>
          </div>

          {reading ? (
            /* S05 / Frame 11: Active Reading Card (Piko HIDDEN) */
            <div className="reading-stage-wrap">
              <section className="reading-passage-card" aria-label="Teks bacaan anak">
                <p className="passage-category-tag">Pos {index + 1} dari {data.items.length}</p>
                <div className="reading-text-body">
                  <p className="reading">{item.prompt}</p>
                </div>

                <div className="reading-mic-tray" role="status">
                  <div className="mic-indicator-bars" aria-hidden="true">
                    {[10, 16, 24, 30, 12, 18, 26, 32, 14, 20, 28].map((h, i) => (
                      <span
                        key={i}
                        className="mic-bar"
                        style={{
                          height: stage === "recording" ? `${h}px` : "6px",
                          opacity: stage === "recording" ? 1 : 0.35,
                        }}
                      />
                    ))}
                  </div>
                  <span className="mic-status-label">
                    {stage === "recording"
                      ? "Mikrofon aktif: merekam suara bacaan"
                      : stage === "review"
                      ? "Rekaman siap dikirim ke guru"
                      : stage === "sending"
                      ? "Mengirim rekaman ke guru…"
                      : "Mikrofon belum aktif. Tekan Mulai saat siap."}
                  </span>
                </div>
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
                      Mulai merekam
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
            </div>
          ) : (
            /* S02 / S03: Task with Mascot Piko Guide & Tactile Tiles */
            <div className="task-stage-layout">
              <div className="task-mascot-side">
                <Image src="/mascot/piko-guide.svg" alt="Piko memandu" width={240} height={238} priority />
              </div>
              <div className="task-interactive-side">
                {item.tiles ? (
                  <Tiles key={item.key} tiles={item.tiles} busy={stage === "sending"} onDone={(w) => void send(w)} />
                ) : (
                  <form
                    key={item.key}
                    className="task-form-box"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void send(String(new FormData(e.currentTarget).get("response") ?? "").trim());
                    }}
                  >
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

      {/* Frame 14: Petualangan Selesai */}
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
