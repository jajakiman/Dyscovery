"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/ui/api";
import { Modal } from "@/lib/ui/modal";

type Child = { id: string; display_name: string; grade: string };
type Session = { id: string; child_id: string; status: string; created_at: string };
type Assignment = { id: string; child_id: string };
type Material = { id: string; material_key: string; version: number };
type Load = "loading" | "ready" | "forbidden" | "error";

const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");

export default function StudentRoster() {
  const router = useRouter();
  const [load, setLoad] = useState<Load>("loading");
  const [children, setChildren] = useState<Child[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Child | null>(null);
  const [needPin, setNeedPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    setLoad("loading");
    const mode = await api<{ mode?: string }>("/api/teacher-mode/status");
    if (mode.status === 401) return router.replace("/masuk");
    if (mode.data.mode === "student" || mode.data.mode === "locked") return router.replace("/siswa");
    const [kids, sess, asg, mat] = await Promise.all([api<{ children?: Child[] }>("/api/children"), api<{ sessions?: Session[] }>("/api/assessment-sessions"), api<{ assignments?: Assignment[] }>("/api/assignments"), api<{ materials?: Material[] }>("/api/materials")]);
    if (kids.status === 401) return router.replace("/masuk");
    if (kids.status === 403) return setLoad("forbidden");
    if (!kids.ok || !sess.ok || !asg.ok || !mat.ok) return setLoad("error");
    setChildren(kids.data.children ?? []);
    setSessions(sess.data.sessions ?? []);
    setAssignments(asg.data.assignments ?? []);
    setMaterials(mat.data.materials ?? []);
    setLoad("ready");
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const shown = useMemo(() => children.filter((child) => child.display_name.toLowerCase().includes(query.trim().toLowerCase())), [children, query]);
  const drafts = (childId: string) => sessions.filter((session) => session.child_id === childId && session.status === "draft");

  function open(child: Child) { setPicked(child); setNeedPin(false); setMessage(""); }

  async function enter(sessionId: string) {
    setBusy(true); setMessage("");
    if (drafts(picked?.id ?? "").find((s) => s.id === sessionId)?.status === "draft") await api(`/api/assessment-sessions/${sessionId}/start`, {});
    const result = await api("/api/teacher-mode/enter", { sessionId });
    if (result.ok) return router.replace("/siswa");
    if (result.status === 403) {
      setNeedPin(true);
      setMessage("Mode siswa belum bisa dimulai. Jika ini pertama kali, buat PIN dulu. Jika sudah punya PIN, periksa persetujuan wali dan penugasan.");
    } else setMessage(result.data.error ?? "Mode siswa tidak dapat dimulai.");
    setBusy(false);
  }

  async function makeDraft(event: FormEvent<HTMLFormElement>, assignmentId: string) {
    event.preventDefault();
    const materialVersionId = new FormData(event.currentTarget).get("material");
    setBusy(true); setMessage("");
    const result = await api("/api/assessment-sessions", { teacherAssignmentId: assignmentId, materialVersionId });
    setBusy(false);
    if (!result.ok) return setMessage(result.data.error ?? "Draf sesi tidak dapat dibuat.");
    await refresh();
  }

  async function createPin(event: FormEvent<HTMLFormElement>, sessionId: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get("pin") !== data.get("again")) return setMessage("Kedua PIN harus sama.");
    setBusy(true);
    const result = await api("/api/teacher-mode/pin", { pin: data.get("pin") });
    if (!result.ok) { setMessage("PIN tidak dapat dibuat. PIN hanya bisa dibuat sekali; hubungi operator untuk pemulihan."); return setBusy(false); }
    await enter(sessionId);
  }

  const pickedDrafts = picked ? drafts(picked.id) : [];
  const target = pickedDrafts[0];
  const assignment = picked ? assignments.find((item) => item.child_id === picked.id) : undefined;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <Image className="brand" src="/brand/logo-horizontal.svg" alt="Dyscovery" width={152} height={37} priority />
          <p className="role-tag">Ruang Guru</p>
        </div>
        <nav className="nav" aria-label="Menu guru"><a href="/guru/siswa" aria-current="page">Daftar siswa</a></nav>
        <div className="sidebar-bottom">
          <button className="btn secondary" onClick={async () => { await api("/api/auth/logout", {}); router.replace("/masuk"); }}>Keluar</button>
        </div>
      </aside>
      <main className="workspace">
        <div className="page-heading">
          <h1>Daftar siswa</h1>
          <p className="muted">Pilih siswa, lalu serahkan perangkat setelah mode siswa aktif.</p>
        </div>
        <section className="card" aria-labelledby="roster-title">
          <div className="table-head">
            <h2 id="roster-title">Siswa kelas Anda</h2>
            <div className="search"><label className="small muted" htmlFor="q">Cari nama siswa</label>
              <input id="q" value={query} onChange={(event) => setQuery(event.target.value)} style={{ marginTop: 4 }} /></div>
          </div>
          {load === "loading" && <p className="empty" role="status">Memuat daftar siswa...</p>}
          {load === "error" && <div className="empty" role="alert"><strong>Daftar siswa belum dapat dimuat.</strong><button className="btn secondary" onClick={() => void refresh()}>Coba lagi</button></div>}
          {load === "forbidden" && <div className="empty" role="alert"><strong>Akun Anda belum terverifikasi sebagai guru.</strong><p>Operator sekolah yang mengaktifkan akses guru dan penugasan kelas.</p></div>}
          {load === "ready" && children.length === 0 && <div className="empty"><strong>Belum ada siswa yang ditugaskan.</strong><p>Siswa muncul setelah operator menetapkan penugasan untuk akun Anda.</p></div>}
          {load === "ready" && children.length > 0 && shown.length === 0 && <p className="empty">Tidak ada siswa dengan nama tersebut.</p>}
          {load === "ready" && shown.length > 0 && <div className="table-wrap"><table>
            <thead><tr><th scope="col">Siswa</th><th scope="col">Kelas</th><th scope="col">Draf sesi</th><th scope="col"><span className="sr-only">Aksi</span></th></tr></thead>
            <tbody>{shown.map((child) => {
              const count = drafts(child.id).length;
              return <tr key={child.id}>
                <td><span className="student-cell"><span className="avatar" aria-hidden="true">{initials(child.display_name)}</span>{child.display_name}</span></td>
                <td>Kelas {child.grade}</td>
                <td>{count ? <span className="badge ready">{count} draf siap</span> : <span className="badge none">Belum ada draf</span>}</td>
                <td><button className="btn secondary" onClick={() => open(child)}>Siapkan sesi</button></td>
              </tr>;
            })}</tbody>
          </table></div>}
        </section>
      </main>

      <Modal open={Boolean(picked)} onClose={() => setPicked(null)} titleId="session-title">
        {picked && <>
          <h2 id="session-title">Mode siswa untuk {picked.display_name}</h2>
          {!target && !assignment && <p className="notice warn">Siswa ini belum punya penugasan aktif untuk akun Anda. Hubungi operator sekolah.</p>}
          {!target && assignment && (materials.length === 0
            ? <p className="notice warn">Belum ada materi yang disetujui. Hubungi operator.</p>
            : <form className="modal-section" onSubmit={(event) => void makeDraft(event, assignment.id)}>
                <div className="field"><label htmlFor="material">Materi</label>
                  <select id="material" name="material" required>{materials.map((m) => <option key={m.id} value={m.id}>{m.material_key} (v{m.version})</option>)}</select></div>
                <button className="btn primary" type="submit" disabled={busy}>{busy ? "Membuat..." : "Buat draf sesi"}</button>
              </form>)}
          {target && <>
            <p className="muted">Setelah dimulai, perangkat terkunci dari akses guru sampai PIN dimasukkan kembali. Jangan serahkan perangkat sebelum layar berubah ke mode siswa.</p>
            {needPin && <form className="modal-section" onSubmit={(event) => void createPin(event, target.id)}>
              <h3>Buat PIN guru (4 digit, sekali saja)</h3>
              <div className="field"><label htmlFor="pin">PIN</label><input className="pin-input" id="pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} autoComplete="off" required /></div>
              <div className="field"><label htmlFor="again">Ulangi PIN</label><input className="pin-input" id="again" name="again" type="password" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} autoComplete="off" required /></div>
              <p className="small muted" style={{ marginBottom: 12 }}>Lima kali salah mengunci akses 15 menit. PIN ini hanya untuk uji sintetis, bukan pengaman produksi.</p>
              <button className="btn primary" type="submit" disabled={busy}>Simpan PIN dan mulai</button>
            </form>}
          </>}
          {message && <p className="notice warn" role="alert">{message}</p>}
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setPicked(null)}>Batal</button>
            {target && !needPin && <button className="btn accent" disabled={busy} onClick={() => void enter(target.id)}>{busy ? "Memproses..." : "Mulai Mode Siswa"}</button>}
          </div>
        </>}
      </Modal>
    </div>
  );
}
