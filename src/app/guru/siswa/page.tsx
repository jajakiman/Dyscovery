"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/ui/api";
import { LogoutButton } from "@/lib/ui/logout-button";
import { UserProfileMenu } from "@/lib/ui/user-profile-menu";

type Child = { id: string; display_name: string; grade: string };
type Session = { id: string; child_id: string; status: string; created_at: string };
type Assignment = { id: string; child_id: string };
type Material = { id: string; material_key: string; version: number };
type Load = "loading" | "ready" | "forbidden" | "error";

// ponytail: dummy data for manual testing when the account has no real roster; remove once synthetic seed exists on PROD.
const DEMO_CHILDREN: Child[] = [
  { id: "490d3e70-4130-46ec-8be2-b7e8a112b249", display_name: "Bima Aditia", grade: "2A" },
  { id: "50000000-0000-4000-8000-000000000001", display_name: "Ayu Rahma", grade: "2B" },
  { id: "50000000-0000-4000-8000-000000000002", display_name: "Doni Pratama", grade: "2A" },
  { id: "50000000-0000-4000-8000-000000000003", display_name: "Siti Aisyah", grade: "2A" },
  { id: "50000000-0000-4000-8000-000000000004", display_name: "Rian Hidayat", grade: "2B" },
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
  const [micTesting, setMicTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(85);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [demo, setDemo] = useState<null | "empty" | "forbidden" | "error">(null);
  const [teacherName, setTeacherName] = useState("");

  useEffect(() => {
    void api<{ profile?: { full_name?: string } }>("/api/auth/profile").then((res) => setTeacherName(res.data.profile?.full_name ?? ""));
  }, []);

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

  async function startSession() {
    if (!picked) return;
    if (demo) return router.push("/guru/simulasi");
    setMessage("");
    setBusy(true);
    let sessionId = drafts(picked.id)[0]?.id;
    const assignment = assignments.find((item) => item.child_id === picked.id);

    if (!sessionId && assignment) {
      const res = await api<{ session?: Session }>("/api/assessment-sessions", {
        teacherAssignmentId: assignment.id,
        materialVersionId: selectedMaterialId || (materials[0]?.id ?? ""),
      });
      if (!res.ok || !res.data.session) {
        setMessage(res.data.error ?? "Draf sesi tidak dapat dibuat.");
        return setBusy(false);
      }
      sessionId = res.data.session.id;
    }
    if (!sessionId) {
      setMessage("Siswa ini belum memiliki penugasan sesi.");
      return setBusy(false);
    }

    await api(`/api/assessment-sessions/${sessionId}/start`, {});
    const result = await api("/api/teacher-mode/enter", { sessionId });
    if (result.ok) return router.replace("/siswa");
    setMessage(result.data.error ?? "Sesi kegiatan tidak dapat dimulai.");
    setBusy(false);
  }

  const countBy = (status: string) => sessions.filter((s) => s.status === status).length;
  const stats = [
    { tone: "blue", value: children.length, label: "Siswa ditugaskan", piko: "piko-guide" },
    { tone: "apricot", value: countBy("draft"), label: "Draf sesi siap dimulai", piko: "piko-wave" },
    { tone: "lilac", value: countBy("in_progress"), label: "Sesi sedang berjalan", piko: "piko-listen" },
    { tone: "green", value: countBy("completed"), label: "Sesi selesai, siap ditinjau", piko: "piko-cheer", href: "/guru/rekaman" },
  ];
  const nameOf = (childId: string) => children.find((c) => c.id === childId)?.display_name ?? "Siswa";
  const latest = (childId: string) =>
    sessions.filter((s) => s.child_id === childId).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const toReview = sessions.filter((s) => s.status === "completed");
  const statusLabel: Record<string, [string, string]> = {
    draft: ["Draf siap", "apricot"],
    in_progress: ["Sedang berjalan", "lilac"],
    completed: ["Siap ditinjau", "green"],
  };
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="shell" data-ui="true">
      <aside className="sidebar">
        <div>
          <Image className="brand" src="/brand/logo-horizontal.svg" alt="Dyscovery" width={152} height={37} priority />
          <p className="role-tag">Ruang guru</p>
        </div>
        <nav className="nav" aria-label="Menu guru">
          <Link href="/guru/siswa" aria-current="page">Daftar siswa</Link>
          <Link href="/guru/rekaman">Tinjau rekaman</Link>
          <Link href="/guru/laporan">Laporan observasi</Link>
          <Link href="/operator">Ruang operator</Link>
          <Link href="/orangtua/laporan">Portal orang tua</Link>
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
          <span className="subbar-meta">Portal Guru • Tahun ajaran 2026–2027</span>
          <UserProfileMenu />
        </header>

        <div className="gd-greet">
          <h1>Halo, {teacherName || "Guru"}</h1>
          <p className="muted small">{today} • Satu siswa, satu sesi, didampingi guru.</p>
        </div>

        {demo === "error" && (
          <p className="notice warn" role="status" style={{ marginBottom: 20 }}>
            Data siswa gagal dimuat dari server. Silakan muat ulang halaman.
          </p>
        )}

        <div className="gd-grid">
          <div className="gd-main">
            {picked && (
              <section className="dash-hero" aria-labelledby="hero-title">
                <div className="gd-hero-body">
                  <span className="dash-hero-tag">Siswa berikutnya</span>
                  <h2 id="hero-title" className="gd-hero-name">{picked.display_name}</h2>
                  <div className="gd-hero-meta">
                    <span><small>Kelas</small>{picked.grade}</span>
                    <span><small>Status</small>{statusLabel[latest(picked.id)?.status ?? ""]?.[0] ?? "Belum mulai"}</span>
                  </div>
                  <div className="setup-consents">
                    <span className="consent-chip">Izin Membaca Aktif</span>
                    <span className="consent-chip">Izin Audio Aktif</span>
                    <span className="consent-chip">Izin AI Aktif</span>
                  </div>
                  <div className="setup-controls">
                    <button type="button" className="btn secondary" onClick={handleTestMic}>
                      {micTesting ? `Mengecek… (${micLevel}%)` : "Uji Mikrofon"}
                    </button>
                    <button type="button" className="btn primary" disabled={busy} onClick={() => void startSession()}>
                      {busy ? "Memproses…" : "Mulai Sesi Membaca"}
                    </button>
                  </div>
                  {message && <p className="notice warn" role="alert">{message}</p>}
                </div>
                <Image className="dash-hero-piko" src="/mascot/piko-wave.svg" alt="" width={200} height={206} priority />
              </section>
            )}

            <ul className="dash-stats">
              {stats.map((s) => {
                const body = (
                  <>
                    <strong>{s.value}</strong>
                    <span>{s.label}</span>
                    <Image src={`/mascot/${s.piko}.svg`} alt="" width={84} height={86} />
                  </>
                );
                return (
                  <li key={s.label} className={`dash-stat ${s.tone}`}>
                    {s.href ? <Link href={s.href} className="gd-stat-link">{body}</Link> : body}
                  </li>
                );
              })}
            </ul>

            <section aria-labelledby="today-title">
              <div className="gd-section-head">
                <h2 id="today-title">Siswa hari ini</h2>
                <div className="gd-filters">
                  <label className="sr-only" htmlFor="q">Cari siswa</label>
                  <input id="q" type="search" placeholder="Cari nama siswa" value={query} onChange={(e) => setQuery(e.target.value)} />
                  <label className="sr-only" htmlFor="grade-filter">Kelas</label>
                  <select id="grade-filter" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
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
                <ul className="gd-students">
                  {shown.map((child) => {
                    const s = latest(child.id);
                    const [label, tone] = statusLabel[s?.status ?? ""] ?? ["Belum mulai", "none"];
                    const isPicked = picked?.id === child.id;
                    return (
                      <li key={child.id} className={`gd-student${isPicked ? " is-picked" : ""}`}>
                        <span className="avatar" aria-hidden="true">{initials(child.display_name)}</span>
                        <div className="gd-student-info">
                          <strong>{child.display_name}</strong>
                          <span className="muted small">Kelas {child.grade}</span>
                          <span className={`gd-chip tone-${tone}`}>{label}</span>
                        </div>
                        {s?.status === "completed" ? (
                          <Link className="gd-arrow" href={`/guru/rekaman?session=${s.id}`} aria-label={`Tinjau rekaman ${child.display_name}`}>→</Link>
                        ) : (
                          <button
                            type="button"
                            className="gd-arrow"
                            aria-pressed={isPicked}
                            aria-label={`Pilih ${child.display_name} untuk sesi berikutnya`}
                            onClick={() => { openSelect(child); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                          >
                            →
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <aside className="gd-side card" aria-labelledby="review-title">
            <h2 id="review-title">Perlu ditinjau</h2>
            {toReview.length === 0 ? (
              <div className="gd-side-empty">
                <Image src="/mascot/piko-rest.svg" alt="" width={110} height={113} />
                <p className="muted small">Belum ada sesi yang menunggu telaah.</p>
              </div>
            ) : (
              <ul className="gd-review">
                {toReview.map((s) => (
                  <li key={s.id}>
                    <Link href={`/guru/rekaman?session=${s.id}`}>
                      <strong>{nameOf(s.child_id)}</strong>
                      <span className="muted small">
                        {new Date(s.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} • Rekaman bacaan
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
