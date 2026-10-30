"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/ui/api";
import { LogoutButton } from "@/lib/ui/logout-button";
import { Modal } from "@/lib/ui/modal";

type Child = { id: string; display_name: string; grade: string };
type Session = { id: string; child_id: string; status: string; created_at: string };
type Assignment = { id: string; child_id: string };
type Material = { id: string; material_key: string; version: number };
type Load = "loading" | "ready" | "forbidden" | "error";

// ponytail: dummy data for manual testing when the account has no real roster; remove once synthetic seed exists on PROD.
const DEMO_CHILDREN: Child[] = [
  { id: "00000000-0000-4000-8000-000000000001", display_name: "Siswa Contoh A", grade: "2A" },
  { id: "00000000-0000-4000-8000-000000000002", display_name: "Siswa Contoh B", grade: "2A" },
  { id: "00000000-0000-4000-8000-000000000003", display_name: "Siswa Contoh C", grade: "2A" },
  { id: "00000000-0000-4000-8000-000000000004", display_name: "Siswa Contoh D", grade: "2B" },
  { id: "00000000-0000-4000-8000-000000000005", display_name: "Siswa Contoh E", grade: "2B" },
];
const DEMO_SESSIONS: Session[] = [
  { id: "00000000-0000-4000-9000-000000000001", child_id: DEMO_CHILDREN[0].id, status: "completed", created_at: "2026-10-29T08:00:00Z" },
  { id: "00000000-0000-4000-9000-000000000002", child_id: DEMO_CHILDREN[1].id, status: "in_progress", created_at: "2026-10-30T08:00:00Z" },
  { id: "00000000-0000-4000-9000-000000000003", child_id: DEMO_CHILDREN[2].id, status: "draft", created_at: "2026-10-30T09:00:00Z" },
  { id: "00000000-0000-4000-9000-000000000004", child_id: DEMO_CHILDREN[3].id, status: "draft", created_at: "2026-10-30T09:30:00Z" },
];

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
  const [name, setName] = useState("");
  const [demo, setDemo] = useState<null | "empty" | "forbidden" | "error">(null);

  const refresh = useCallback(async () => {
    setLoad("loading");
    const mode = await api<{ mode?: string }>("/api/teacher-mode/status");
    if (mode.status === 401) return router.replace("/masuk");
    if (mode.data.mode === "student" || mode.data.mode === "locked") return router.replace("/siswa");
    const [kids, sess, asg, mat] = await Promise.all([api<{ children?: Child[] }>("/api/children"), api<{ sessions?: Session[] }>("/api/assessment-sessions"), api<{ assignments?: Assignment[] }>("/api/assignments"), api<{ materials?: Material[] }>("/api/materials")]);
    if (kids.status === 401) return router.replace("/masuk");
    const me = await api<{ profile?: { full_name?: string | null; display_name?: string | null } }>("/api/auth/profile");
    setName(me.data.profile?.display_name || me.data.profile?.full_name || "");
    const realKids = kids.ok ? kids.data.children ?? [] : [];
    if (realKids.length === 0) {
      setDemo(kids.status === 403 ? "forbidden" : kids.ok && sess.ok ? "empty" : "error");
      setChildren(DEMO_CHILDREN); setSessions(DEMO_SESSIONS); setAssignments([]); setMaterials([]);
      return setLoad("ready");
    }
    if (!sess.ok || !asg.ok || !mat.ok) return setLoad("error");
    setDemo(null);
    setChildren(realKids);
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
  const drafts = (childId: string) => sessions.filter((session) => session.child_id === childId && session.status === "draft").sort((a, b) => b.created_at.localeCompare(a.created_at));

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

  const countBy = (status: string) => sessions.filter((s) => s.status === status).length;
  const stats = [
    { tone: "blue", value: children.length, label: "Siswa ditugaskan", piko: "piko-guide" },
    { tone: "apricot", value: countBy("draft"), label: "Draf sesi siap dimulai", piko: "piko-wave" },
    { tone: "lilac", value: countBy("in_progress"), label: "Sesi sedang berjalan", piko: "piko-listen" },
    { tone: "green", value: countBy("completed"), label: "Sesi selesai, siap ditinjau", piko: "piko-cheer" },
  ];

  const pickedDrafts = picked ? drafts(picked.id) : [];
  const target = pickedDrafts[0];
  const assignment = picked ? assignments.find((item) => item.child_id === picked.id) : undefined;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <Image className="brand" src="/brand/logo-horizontal.svg" alt="Dyscovery" width={152} height={37} priority />
          <p className="role-tag">Ruang guru</p>
        </div>
        <nav className="nav" aria-label="Menu guru">
          <Link href="/guru/siswa" aria-current="page">Daftar siswa</Link>
          <Link href="/guru/rekaman">Tinjau rekaman</Link>
          <Link href="/guru/laporan">Laporan observasi</Link>
        </nav>
        <div className="sidebar-notice">
          <p className="sidebar-notice-title">Privasi siswa</p>
          <p className="sidebar-notice-text">Rekaman hanya untuk peninjauan guru.</p>
        </div>
        <div className="sidebar-bottom">
          <LogoutButton />
        </div>
      </aside>
      <main className="workspace">
        <header className="portal-subbar">
          <span className="subbar-meta">Portal Guru • Kelas 2A / Tahun ajaran 2026–2027</span>
          <div className="user-badge" aria-label={name ? `Profil ${name}` : "Profil guru"}>{name ? initials(name) : "GR"}</div>
        </header>

        <section className="dash-hero" aria-labelledby="hero-title">
          <div>
            <p className="dash-hero-tag">Ruang guru</p>
            <h1 id="hero-title">Hai{name ? `, ${name}` : ""}</h1>
            <p>Pilih siswa, siapkan sesi, lalu serahkan perangkat setelah mode siswa aktif.</p>
          </div>
          <Image className="dash-hero-piko" src="/mascot/piko-wave.svg" alt="" width={200} height={206} priority />
        </section>

        {demo && <p className="notice warn" role="status" style={{ marginBottom: 20 }}>
          <strong>Data contoh untuk uji manual.</strong>{" "}
          {demo === "forbidden" ? "Akun Anda belum terverifikasi sebagai guru." : demo === "error" ? "Data asli belum dapat dimuat." : "Belum ada siswa yang ditugaskan ke akun Anda."}{" "}
          Angka dan nama di bawah bukan data siswa nyata.
        </p>}

        {load === "ready" && <ul className="dash-stats" aria-label="Ringkasan sesi">
          {stats.map((s) => <li key={s.label} className={`dash-stat ${s.tone}`}>
            <strong>{s.value}</strong>
            <span>{s.label}</span>
            <Image src={`/mascot/${s.piko}.svg`} alt="" width={72} height={74} />
          </li>)}
        </ul>}

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
            <thead><tr><th scope="col">Siswa</th><th scope="col">Kelas</th><th scope="col">Status sesi</th><th scope="col"><span className="sr-only">Aksi</span></th></tr></thead>
            <tbody>{shown.map((child) => {
              const count = drafts(child.id).length;
              const childSessions = sessions.filter((s) => s.child_id === child.id);
              const activeSession = childSessions[0];
              return <tr key={child.id}>
                <td><span className="student-cell"><span className="avatar" aria-hidden="true">{initials(child.display_name)}</span>{child.display_name}</span></td>
                <td>Kelas {child.grade}</td>
                <td>
                  {count > 0 ? (
                    <span className="badge ready">{count} draf siap</span>
                  ) : childSessions.length > 0 ? (
                    <span className="badge ready">Sesi tersedia</span>
                  ) : (
                    <span className="badge none">Belum ada sesi</span>
                  )}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn secondary" onClick={() => open(child)}>Siapkan sesi</button>
                    {activeSession && (
                      <Link href={`/guru/rekaman?session=${activeSession.id}`} className="btn secondary">
                        Tinjau rekaman
                      </Link>
                    )}
                  </div>
                </td>
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
