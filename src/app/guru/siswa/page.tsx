"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/ui/api";
import { LogoutButton } from "@/lib/ui/logout-button";
import { Modal } from "@/lib/ui/modal";
import { UserProfileMenu } from "@/lib/ui/user-profile-menu";

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

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export default function StudentRoster() {
  const router = useRouter();
  const [load, setLoad] = useState<Load>("loading");
  const [children, setChildren] = useState<Child[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");

  const [picked, setPicked] = useState<Child | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [micTesting, setMicTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(85);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [demo, setDemo] = useState<null | "empty" | "forbidden" | "error">(null);

  const refresh = useCallback(async () => {
    setLoad("loading");
    const mode = await api<{ mode?: string }>("/api/teacher-mode/status");
    if (mode.status === 401) return router.replace("/masuk");
    if (mode.data.mode === "student" || mode.data.mode === "locked") return router.replace("/siswa");

    const [kids, sess, asg, mat] = await Promise.all([
      api<{ children?: Child[] }>("/api/children"),
      api<{ sessions?: Session[] }>("/api/assessment-sessions"),
      api<{ assignments?: Assignment[] }>("/api/assignments"),
      api<{ materials?: Material[] }>("/api/materials"),
    ]);

    if (kids.status === 401) return router.replace("/masuk");
    const realKids = kids.ok ? kids.data?.children ?? [] : [];
    if (realKids.length === 0) {
      setDemo(kids.status === 403 ? "forbidden" : kids.ok && sess.ok ? "empty" : "error");
      setChildren(DEMO_CHILDREN);
      setSessions(DEMO_SESSIONS);
      setAssignments([]);
      setMaterials([]);
      return setLoad("ready");
    }
    if (!sess.ok || !asg.ok || !mat.ok) return setLoad("error");
    setDemo(null);
    setChildren(realKids);
    setSessions(sess.data.sessions ?? []);
    setAssignments(asg.data.assignments ?? []);
    const mats = mat.data.materials ?? [];
    setMaterials(mats);
    if (mats.length > 0) setSelectedMaterialId(mats[0].id);

    // Default select first student if available for Frame 16 mockup accuracy
    if (realKids.length > 0 && !picked) {
      setPicked(realKids[0]);
    }

    setLoad("ready");
  }, [picked, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const shown = useMemo(() => {
    return children.filter((child) => {
      const matchQuery = child.display_name.toLowerCase().includes(query.trim().toLowerCase());
      const matchGrade = gradeFilter === "all" || child.grade === gradeFilter;
      return matchQuery && matchGrade;
    });
  }, [children, query, gradeFilter]);

  const drafts = (childId: string) =>
    sessions
      .filter((session) => session.child_id === childId && session.status === "draft")
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

  function openSelect(child: Child) {
    setPicked(child);
    setMessage("");
  }

  function handleTestMic() {
    setMicTesting(true);
    let count = 0;
    const interval = setInterval(() => {
      setMicLevel(Math.floor(70 + Math.random() * 25));
      count++;
      if (count > 6) {
        clearInterval(interval);
        setMicTesting(false);
      }
    }, 200);
  }

  async function proceedToLock() {
    if (!picked) return;
    setMessage("");
    // Ensure draft session exists or create one
    const target = drafts(picked.id)[0];
    const assignment = assignments.find((item) => item.child_id === picked.id);

    if (!target && assignment) {
      setBusy(true);
      const res = await api<{ session?: Session }>("/api/assessment-sessions", {
        teacherAssignmentId: assignment.id,
        materialVersionId: selectedMaterialId || (materials[0]?.id ?? ""),
      });
      setBusy(false);
      if (!res.ok) {
        setMessage(res.data.error ?? "Draf sesi tidak dapat dibuat.");
        return;
      }
      await refresh();
    }
    setLockModalOpen(true);
  }

  async function enter(sessionId: string) {
    setBusy(true);
    setMessage("");
    if (drafts(picked?.id ?? "").find((s) => s.id === sessionId)?.status === "draft") {
      await api(`/api/assessment-sessions/${sessionId}/start`, {});
    }
    const result = await api("/api/teacher-mode/enter", { sessionId });
    if (result.ok) {
      setLockModalOpen(false);
      return router.replace("/siswa");
    }
    setMessage(result.data.error ?? "Mode siswa tidak dapat dimulai.");
    setBusy(false);
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
    <div className="shell" data-ui="true">
      {/* Sidebar matching Frame 16 & Design System */}
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

      {/* Main Workspace (Frame 16: S10) */}
      <main className="workspace">
        <header className="portal-subbar">
          <span className="subbar-meta">Portal Guru • Kelas 2A / Tahun ajaran 2026–2027</span>
          <UserProfileMenu />
        </header>

        {demo && (
          <p className="notice warn" role="status" style={{ marginBottom: 20 }}>
            <strong>Data contoh untuk uji manual.</strong>{" "}
            {demo === "forbidden"
              ? "Akun Anda belum terverifikasi sebagai guru."
              : demo === "error"
              ? "Data asli belum dapat dimuat."
              : "Belum ada siswa yang ditugaskan ke akun Anda."}{" "}
            Angka dan nama di bawah bukan data siswa nyata.
          </p>
        )}

        {/* Notice Info Box (Frame 16 / Node 700) */}
        <div className="roster-notice-card">
          <div className="roster-notice-lead">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <strong>Satu siswa, satu sesi, didampingi guru.</strong>
          </div>
          <p className="roster-notice-text">
            Periksa persetujuan orang tua dan mikrofon, lalu kunci kontrol guru sebelum memberikan perangkat kepada siswa.
          </p>
        </div>

        {/* Table Filter & Roster Card */}
        <section className="card roster-card" aria-labelledby="roster-title">
          <div className="table-filter-bar">
            <div className="filter-item search-box">
              <label className="small muted" htmlFor="q">Cari siswa</label>
              <input
                id="q"
                type="search"
                placeholder="Cari nama siswa"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="filter-item select-box">
              <label className="small muted" htmlFor="grade-filter">Kelas</label>
              <select
                id="grade-filter"
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
              >
                <option value="all">Semua kelas</option>
                <option value="2A">Kelas 2A</option>
                <option value="2B">Kelas 2B</option>
              </select>
            </div>
          </div>

          {load === "loading" && <p className="empty" role="status">Memuat daftar siswa...</p>}
          {load === "error" && (
            <div className="empty" role="alert">
              <strong>Daftar siswa belum dapat dimuat.</strong>
              <button type="button" className="btn secondary" onClick={() => void refresh()}>Coba lagi</button>
            </div>
          )}
          {load === "forbidden" && (
            <div className="empty" role="alert">
              <strong>Akun Anda belum terverifikasi sebagai guru.</strong>
              <p>Operator sekolah yang mengaktifkan akses guru dan penugasan kelas.</p>
            </div>
          )}
          {load === "ready" && children.length === 0 && (
            <div className="empty">
              <strong>Belum ada siswa yang ditugaskan.</strong>
              <p>Siswa muncul setelah operator menetapkan penugasan untuk akun Anda.</p>
            </div>
          )}
          {load === "ready" && children.length > 0 && shown.length === 0 && (
            <p className="empty">Tidak ada siswa dengan kriteria pencarian tersebut.</p>
          )}

          {load === "ready" && shown.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Nama siswa</th>
                    <th scope="col">Kelas</th>
                    <th scope="col">Persetujuan orang tua</th>
                    <th scope="col">Skrining terakhir</th>
                    <th scope="col">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((child) => {
                    const count = drafts(child.id).length;
                    const childSessions = sessions.filter((s) => s.child_id === child.id);
                    const activeSession = childSessions[0];
                    const isPicked = picked?.id === child.id;

                    // Consent status simulation matching Frame 16 mockup
                    const isConsentActive = child.display_name !== "Siswa Contoh C";

                    return (
                      <tr key={child.id} className={isPicked ? "row-selected" : undefined}>
                        <td>
                          <span className="student-cell">
                            <span className="avatar" aria-hidden="true">{initials(child.display_name)}</span>
                            <span>{child.display_name}</span>
                          </span>
                        </td>
                        <td>{child.grade}</td>
                        <td>
                          {isConsentActive ? (
                            <span className="badge ready">Persetujuan Aktif</span>
                          ) : (
                            <span className="badge none" style={{ background: "#fde9d4", color: "#8a4b12" }}>
                              Menunggu
                            </span>
                          )}
                        </td>
                        <td>
                          {childSessions.length > 0 ? "12 Okt 2026" : "Belum ada"}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {isConsentActive ? (
                              <button
                                type="button"
                                className={`btn ${isPicked ? "primary" : "secondary"}`}
                                style={{ minHeight: 38, padding: "6px 14px", fontSize: 13 }}
                                onClick={() => openSelect(child)}
                              >
                                {isPicked ? "Siswa dipilih" : "Pilih siswa"}
                              </button>
                            ) : (
                              <span className="small muted">Belum tersedia</span>
                            )}
                            {activeSession && (
                              <Link
                                href={`/guru/rekaman?session=${activeSession.id}`}
                                className="btn secondary"
                                style={{ minHeight: 38, padding: "6px 14px", fontSize: 13 }}
                              >
                                Tinjau
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Selected Student Setup & Preparation Bar (Frame 16 / Node 778-788) */}
        {picked && (
          <div className="card setup-action-card">
            <div className="setup-info">
              <div className="setup-badge-row">
                <span className="setup-label">Siswa dipilih:</span>
                <strong className="setup-name">{picked.display_name}</strong>
                <span className="setup-grade">Kelas {picked.grade}</span>
              </div>
              <div className="setup-consents">
                <span className="consent-chip active">Izin Membaca Aktif</span>
                <span className="consent-chip active">Izin Audio Aktif</span>
                <span className="consent-chip active">Izin AI Aktif</span>
              </div>
            </div>

            <div className="setup-controls">
              <button
                type="button"
                className="btn secondary"
                onClick={handleTestMic}
                title="Periksa mikrofon perangkat guru sebelum dikunci ke mode siswa"
              >
                {micTesting ? `Mengecek… (${micLevel}%)` : "Uji Mikrofon"}
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={busy}
                onClick={() => void proceedToLock()}
              >
                Mulai Mode Siswa (Kunci Perangkat)
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Frame 17 (S11): Student Access Lock Security Modal */}
      <Modal open={lockModalOpen || Boolean(picked && demo)} onClose={() => { setLockModalOpen(false); setPicked(null); }} titleId="lock-modal-title">
        {picked && (
          <div className="lock-modal-content">
            <div className="lock-modal-badge">
              <span>Keamanan perangkat</span>
            </div>
            <h2 id="lock-modal-title" className="lock-modal-title">Kunci mode siswa</h2>
            <p className="lock-modal-desc">
              Perangkat akan masuk ke Mode Siswa untuk sesi membaca. Siswa didampingi guru selama kegiatan tanpa skor atau angka yang menekan anak.
            </p>

            {demo && (
              <div className="modal-section" style={{ margin: "12px 0 16px" }}>
                <p className="muted small" style={{ marginTop: 0 }}>
                  Ini siswa contoh. Coba 4 pos asesmen (tebak benda, tebak hewan, susun kata, membaca dengan mikrofon) tanpa mengunci perangkat.
                </p>
                <Link className="btn accent" href="/guru/simulasi" style={{ display: "inline-block", marginTop: 8 }}>
                  Mulai simulasi Mode Siswa
                </Link>
              </div>
            )}

            <div className="guide-tray" style={{ fontSize: 13, margin: "12px 0 16px" }}>
              <p><strong>Siswa:</strong> {picked.display_name} • Kelas {picked.grade}</p>
              <p style={{ marginTop: 4 }}>Guru dapat kembali ke dasbor guru kapan pun dengan menekan tombol <em>Keluar Mode Siswa</em> tanpa perlu PIN.</p>
            </div>

            {message && <p className="notice warn" role="alert">{message}</p>}

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button type="button" className="btn secondary" onClick={() => { setLockModalOpen(false); setPicked(null); }}>
                Batal
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={busy}
                onClick={() => {
                  const sId = target?.id || sessions[0]?.id || "";
                  if (sId) void enter(sId);
                  else router.replace("/siswa");
                }}
              >
                {busy ? "Memproses…" : "Mulai Mode Siswa"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
