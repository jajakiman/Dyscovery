"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/ui/api";
import { LogoutButton } from "@/lib/ui/logout-button";
import { UserProfileMenu } from "@/lib/ui/user-profile-menu";

type StudentRow = {
  id: string;
  name: string;
  grade: string;
  teacherName: string;
  consentActivity: boolean;
  consentAudio: boolean;
  consentAi: boolean;
  sessionStatus: "completed" | "in_progress" | "draft" | "ready";
};

const SEEDED_STUDENTS: StudentRow[] = [
  {
    id: "490d3e70-4130-46ec-8be2-b7e8a112b249",
    name: "Bima Aditia",
    grade: "2A",
    teacherName: "Ibu Saraswati, S.Pd.",
    consentActivity: true,
    consentAudio: true,
    consentAi: true,
    sessionStatus: "completed",
  },
  {
    id: "50000000-0000-4000-8000-000000000001",
    name: "Ayu Rahma",
    grade: "2B",
    teacherName: "Ibu Saraswati, S.Pd.",
    consentActivity: true,
    consentAudio: true,
    consentAi: true,
    sessionStatus: "draft",
  },
  {
    id: "50000000-0000-4000-8000-000000000002",
    name: "Doni Pratama",
    grade: "2A",
    teacherName: "Ibu Saraswati, S.Pd.",
    consentActivity: true,
    consentAudio: true,
    consentAi: true,
    sessionStatus: "draft",
  },
  {
    id: "50000000-0000-4000-8000-000000000003",
    name: "Siti Aisyah",
    grade: "2A",
    teacherName: "Ibu Saraswati, S.Pd.",
    consentActivity: true,
    consentAudio: true,
    consentAi: true,
    sessionStatus: "draft",
  },
  {
    id: "50000000-0000-4000-8000-000000000004",
    name: "Rian Hidayat",
    grade: "2B",
    teacherName: "Ibu Saraswati, S.Pd.",
    consentActivity: true,
    consentAudio: true,
    consentAi: true,
    sessionStatus: "draft",
  },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

function OperatorDashboardContent() {
  const [students, setStudents] = useState<StudentRow[]>(SEEDED_STUDENTS);
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");

  useEffect(() => {
    void api<{ children?: Array<{ id: string; display_name: string; grade: string }> }>("/api/children").then((res) => {
      if (res.ok && res.data.children && res.data.children.length > 0) {
        const mapped = res.data.children.map((c) => {
          const match = SEEDED_STUDENTS.find((s) => s.id === c.id || s.name === c.display_name);
          return {
            id: c.id,
            name: c.display_name,
            grade: c.grade.length === 1 ? `2${c.display_name.charCodeAt(0) % 2 === 0 ? "A" : "B"}` : c.grade,
            teacherName: "Ibu Saraswati, S.Pd.",
            consentActivity: true,
            consentAudio: true,
            consentAi: true,
            sessionStatus: match?.sessionStatus ?? "draft",
          };
        });
        setStudents(mapped);
      }
    });
  }, []);

  const filtered = students.filter((s) => {
    const matchQuery = s.name.toLowerCase().includes(query.toLowerCase());
    const matchGrade = gradeFilter === "all" || s.grade.toLowerCase() === gradeFilter.toLowerCase();
    return matchQuery && matchGrade;
  });

  return (
    <div className="shell" data-ui="true">
      {/* Sidebar matching teacher and parent layout */}
      <aside className="sidebar">
        <div>
          <Link href="/">
            <Image className="brand" src="/brand/logo-horizontal.svg" alt="Dyscovery" width={152} height={37} priority />
          </Link>
          <p className="role-tag">Ruang Operator Sekolah</p>
        </div>
        <nav className="nav" aria-label="Menu operator">
          <Link href="/operator" aria-current="page">Manajemen siswa</Link>
          <Link href="/guru/siswa">Ruang guru</Link>
          <Link href="/orangtua/laporan">Portal orang tua</Link>
        </nav>
        <div className="sidebar-notice">
          <p className="sidebar-notice-title">Keamanan Data Sekolah</p>
          <p className="sidebar-notice-text">
            Operator mengelola verifikasi pendidik, rombongan belajar, dan memastikan persetujuan orang tua telah terbit.
          </p>
        </div>
        <div className="sidebar-bottom">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="workspace">
        <header className="portal-subbar">
          <span className="subbar-meta">SD Negeri Nusantara 01 • Rombel Kelas 2 • Tahun Ajaran 2026/2027</span>
          <UserProfileMenu />
        </header>

        {/* Page Heading */}
        <div className="page-heading" style={{ marginTop: 8 }}>
          <div className="heading-split">
            <div>
              <h1>Dasbor Operator Sekolah</h1>
              <p className="muted">Integrasi data siswa ter-seed, penugasan guru kelas, dan verifikasi izin orang tua</p>
            </div>
            <Link href="/guru/siswa" className="btn primary" style={{ minHeight: 44, padding: "8px 20px" }}>
              Buka Ruang Guru
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="stats-row" style={{ marginTop: 20 }}>
          <div className="stat-card tone-blue">
            <span className="stat-num">{students.length}</span>
            <span className="stat-label">Siswa Terdaftar (Kelas 2)</span>
          </div>
          <div className="stat-card tone-apricot">
            <span className="stat-num">2</span>
            <span className="stat-label">Guru Terverifikasi</span>
          </div>
          <div className="stat-card tone-green">
            <span className="stat-num">100%</span>
            <span className="stat-label">Izin Wali Lengkap (Aktivitas, Audio, AI)</span>
          </div>
          <div className="stat-card tone-lilac">
            <span className="stat-num">9</span>
            <span className="stat-label">Sesi Observasi Tersedia</span>
          </div>
        </div>

        {/* Notice Info Box */}
        <div className="roster-notice-card" style={{ margin: "20px 0" }}>
          <div className="roster-notice-lead">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <strong>Data Rombel Terakreditasi & Tersinkronisasi</strong>
          </div>
          <p className="roster-notice-text">
            Seluruh siswa di bawah ini telah terhubung dengan akun pendidik dan izin wali murid yang sah. Guru kelas dapat langsung memulai pendampingan membaca tanpa kendala administrasi.
          </p>
        </div>

        {/* Table Filter & Roster Card */}
        <section className="card roster-card" aria-labelledby="operator-roster-title">
          <div className="table-filter-bar">
            <div className="filter-item search-box">
              <label className="small muted" htmlFor="op-q">Cari siswa</label>
              <input
                id="op-q"
                type="search"
                placeholder="Cari nama siswa"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="filter-item select-box">
              <label className="small muted" htmlFor="op-grade">Kelas</label>
              <select
                id="op-grade"
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
              >
                <option value="all">Semua kelas (2A & 2B)</option>
                <option value="2a">Kelas 2A</option>
                <option value="2b">Kelas 2B</option>
              </select>
            </div>
          </div>

          <div className="table-wrap">
            <table aria-label="Daftar Siswa dan Penugasan Operator">
              <thead>
                <tr>
                  <th scope="col">Siswa</th>
                  <th scope="col">Kelas</th>
                  <th scope="col">Guru Pendamping</th>
                  <th scope="col">Izin Wali Murid</th>
                  <th scope="col">Status Sesi</th>
                  <th scope="col" style={{ textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="roster-student-cell">
                        <span className="student-avatar" aria-hidden="true">
                          {initials(s.name)}
                        </span>
                        <div>
                          <strong>{s.name}</strong>
                          <p className="small muted" style={{ margin: 0 }}>NISN: 0148{s.id.slice(0, 6)}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge">Kelas {s.grade}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: "var(--ink)" }}>{s.teacherName}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span className="badge ready" title="Izin pelaksanaan sesi aktif">Aktivitas</span>
                        <span className="badge ready" title="Izin perekaman suara aktif">Audio</span>
                        <span className="badge ready" title="Izin analisis AI Gemini aktif">AI Gemini</span>
                      </div>
                    </td>
                    <td>
                      {s.sessionStatus === "completed" ? (
                        <span className="badge ready">Selesai (Ada Audio)</span>
                      ) : s.sessionStatus === "in_progress" ? (
                        <span className="badge warn">Sedang Berjalan</span>
                      ) : (
                        <span className="badge">Siap Dimulai</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        href="/guru/siswa"
                        className="btn secondary"
                        style={{ minHeight: 36, padding: "4px 14px", fontSize: 13 }}
                      >
                        Mulai Sesi
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* School Personnel Card */}
        <section className="card" style={{ padding: 24, marginTop: 20 }}>
          <h2 style={{ fontSize: 18, marginBottom: 14 }}>Pendidik & Tenaga Kependidikan Terdaftar</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div style={{ padding: 16, background: "var(--paper)", borderRadius: 12, border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <strong>Ibu Saraswati, S.Pd.</strong>
                <span className="badge ready">Terverifikasi</span>
              </div>
              <p className="small muted" style={{ margin: "2px 0" }}>NIP: 198504122010012015</p>
              <p className="small muted" style={{ margin: "2px 0" }}>Peran: Guru Kelas 2 (Wali Kelas 2A & 2B)</p>
              <p className="small muted" style={{ margin: "2px 0" }}>Email: guru@dyscovery.id</p>
            </div>

            <div style={{ padding: 16, background: "var(--paper)", borderRadius: 12, border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <strong>Ratna Handayani</strong>
                <span className="badge ready">Wali Terdaftar</span>
              </div>
              <p className="small muted" style={{ margin: "2px 0" }}>Peran: Perwakilan Paguyuban Orang Tua Siswa</p>
              <p className="small muted" style={{ margin: "2px 0" }}>Status: Seluruh Izin Observasi & AI Disetujui</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function OperatorPage() {
  return (
    <Suspense fallback={<div className="shell"><div className="workspace"><p className="muted">Memuat ruang operator…</p></div></div>}>
      <OperatorDashboardContent />
    </Suspense>
  );
}
