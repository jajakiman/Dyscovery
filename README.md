# Dyscovery

Platform web untuk **skrining awal risiko disleksia** pada siswa kelas 2 SD. Guru mendampingi siswa menjalani aktivitas membaca berbentuk petualangan bersama maskot Piko, sistem merekam respons dan bacaan nyaring, AI (Gemini) menyiapkan kandidat anotasi, lalu **guru** meninjau dan menerbitkan laporan observasi untuk orang tua. Orang tua dapat membagikan laporan kepada psikolog terverifikasi dengan izin berbatas waktu.

> Dyscovery **bukan alat diagnosis**. Hasilnya berupa profil performa dan temuan kegiatan, tanpa kategori risiko buatan. Diagnosis disleksia tetap memerlukan pemeriksaan profesional.

- Produksi: https://dyscovery.vercel.app
- Status implementasi: [Docs/Implementation-Progress.md](Docs/Implementation-Progress.md)

## Daftar isi

1. [Peran pengguna](#peran-pengguna)
2. [Fitur utama](#fitur-utama)
3. [Workflow](#workflow)
4. [ERD](#erd)
5. [Autentikasi & otorisasi (JWT)](#autentikasi--otorisasi-jwt)
6. [Arsitektur & teknologi](#arsitektur--teknologi)
7. [Struktur halaman & API](#struktur-halaman--api)
8. [Akun uji](#akun-uji)
9. [Pengembangan lokal](#pengembangan-lokal)
10. [Batasan yang diketahui](#batasan-yang-diketahui)
11. [Rujukan](#rujukan)

## Peran pengguna

| Peran (`product_role`) | Ruang kerja | Tugas |
|---|---|---|
| `operator` | `/operator` | Mengelola data siswa, penugasan guru, dan memantau status izin wali. |
| `teacher` | `/guru/*`, `/siswa` | Memilih siswa, menjalankan sesi, meninjau rekaman & kandidat AI, menerbitkan laporan. |
| Siswa (tanpa akun) | `/siswa` di perangkat guru | Mengikuti 4 pos kegiatan. Tidak mengetik kredensial, tidak memilih profil. |
| `guardian` | `/orangtua/*` | Memberi persetujuan, membaca laporan anak, membagikan laporan ke psikolog. |
| `psychologist` | `/orangtua/*` (tampilan berbagi) | Membaca laporan yang dibagikan selama izin masih berlaku. |

Setiap peran **hanya** dapat membuka ruang kerjanya sendiri; lihat [Autentikasi & otorisasi](#autentikasi--otorisasi-jwt).

## Fitur utama

- **Login umum `/masuk`** dengan pengalihan otomatis sesuai peran akun.
- **Dasbor guru**: kartu "siswa berikutnya", uji mikrofon nyata (Web Audio API), statistik sesi, daftar siswa, dan antrean "Perlu ditinjau".
- **Sesi kegiatan siswa 4 pos**: susun ubin huruf, tebak kata bergambar (benda & hewan), dan membaca nyaring dengan mikrofon. Tanpa skor atau tanda benar–salah di layar anak; tersedia tombol Jeda dan Bantuan Guru.
- **Rekaman privat**: audio diunggah ke bucket privat `private-recordings` beserta hash SHA-256; pemutaran memakai signed URL 60 detik.
- **Kandidat anotasi AI pascarekaman** (Gemini), hanya bila izin `ai` aktif. Kandidat AI tidak pernah menimpa keputusan guru.
- **Tinjauan guru**: pemutar 1.0x/0.75x, waveform tersinkron teks, verifikasi/tolak kandidat AI, rubrik ketepatan, kelancaran, dan kualitas audio.
- **Laporan berversi**: setiap penerbitan adalah snapshot tetap; koreksi menghasilkan versi baru.
- **Persetujuan wali per tujuan**: `activity`, `recording`, `ai`, diperiksa ulang di setiap operasi (bukan hanya saat draf dibuat).
- **Berbagi ke psikolog**: berbatas waktu (7/14/30 hari), audio tidak ikut secara default, dapat dicabut kapan saja.
- **Audit log** untuk aksi sensitif.

## Workflow

### Alur end-to-end

```mermaid
flowchart TD
    A[Pengguna buka /masuk] --> B{Login Supabase Auth}
    B -->|gagal| A
    B -->|berhasil| C{product_role}
    C -->|operator| OP[/operator<br/>data siswa, penugasan guru, status izin/]
    C -->|guardian| WL[/orangtua/laporan/]
    C -->|teacher| GR[/guru/siswa/]

    WL --> W1[Beri persetujuan:<br/>activity, recording, ai]
    W1 -.izin efektif.-> GR

    GR --> G1[Pilih siswa berikutnya]
    G1 --> G2[Uji mikrofon]
    G2 --> G3[Mulai Sesi Membaca]
    G3 --> G4{Izin activity aktif?}
    G4 -->|tidak| G1
    G4 -->|ya| S[/siswa: 4 pos kegiatan/]

    S --> S1[Pos 1: susun ubin huruf]
    S1 --> S2[Pos 2-3: tebak kata bergambar]
    S2 --> S3[Pos 4: membaca nyaring]
    S3 --> S4{Unggah audio + SHA-256}
    S4 -->|gagal| S5[Status tertunda, kirim ulang<br/>tanpa membaca ulang]
    S5 --> S4
    S4 -->|berhasil| S6[Sesi selesai]
    S6 --> AI{Izin ai aktif?}
    AI -->|ya| AI1[Gemini: kandidat anotasi]
    AI -->|tidak| RV
    AI1 --> RV[/guru/rekaman: tinjau rekaman,<br/>verifikasi/tolak kandidat, isi rubrik/]
    S6 -->|kembali ke ruang guru| GR

    RV --> RP[/guru/laporan: susun & periksa/]
    RP --> RP1[Terbitkan report_version v1]
    RP1 -->|koreksi| RP2[Versi baru v2, v1 tetap ada]
    RP1 --> WL2[Wali membaca laporan]
    WL2 --> SH{Bagikan ke psikolog?}
    SH -->|ya| SH1[Pilih psikolog, durasi, audio opsional]
    SH1 --> PS[Psikolog membaca selama izin berlaku]
    SH1 -->|cabut| SH2[Akses baru diblokir]
```

### Sesi kegiatan (urutan antar komponen)

```mermaid
sequenceDiagram
    actor Guru
    participant UI as Next.js (browser)
    participant API as Route Handler
    participant DB as Supabase Postgres (RLS)
    participant ST as Storage (private-recordings)
    participant G as Gemini

    Guru->>UI: Mulai Sesi Membaca
    UI->>API: POST /api/assessment-sessions
    API->>DB: insert draf (cek penugasan + izin)
    UI->>API: POST /api/assessment-sessions/{id}/start
    UI->>API: POST /api/teacher-mode/enter
    API->>DB: teacher_device_modes = student
    UI-->>Guru: redirect /siswa
    loop Pos 1-3
        UI->>API: POST /api/student/task-attempts
        API->>DB: task_attempts
    end
    UI->>ST: upload audio (Pos 4)
    UI->>API: POST /api/student/audio/finalize (hash SHA-256)
    API->>DB: recordings
    API->>G: analisis pascarekaman (jika izin ai)
    G-->>DB: ai_analyses, ai_annotations
    Guru->>UI: Kembali ke Ruang Guru
    UI->>API: POST /api/teacher-mode/unlock
```

## ERD

Diturunkan langsung dari `supabase/migrations/` (28 migrasi). Semua tabel berada di skema `public` dengan Row Level Security aktif.

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "id"
    PROFILES ||--o| TEACHER_PROFILES : "profile_id"
    PROFILES ||--o| PSYCHOLOGIST_PROFILES : "profile_id"
    PROFILES ||--o{ SCHOOL_MEMBERS : "profile_id"
    SCHOOLS ||--o{ SCHOOL_MEMBERS : "school_id"
    SCHOOLS ||--o{ CHILDREN : "school_id"
    SCHOOL_MEMBERS ||--o{ TEACHER_ASSIGNMENTS : "school_member_id"
    CHILDREN ||--o{ TEACHER_ASSIGNMENTS : "child_id"

    PROFILES ||--o{ GUARDIAN_LINKS : "guardian_id"
    CHILDREN ||--o{ GUARDIAN_LINKS : "child_id"
    GUARDIAN_LINKS ||--o{ CONSENT_EVENTS : "guardian_link_id"
    CONSENT_NOTICES ||--o{ CONSENT_EVENTS : "purpose + version"
    CONSENT_NOTICES ||--o{ MATERIAL_VERSIONS : "purpose + version"

    CHILDREN ||--o{ ASSESSMENT_SESSIONS : "child_id"
    TEACHER_ASSIGNMENTS ||--o{ ASSESSMENT_SESSIONS : "teacher_assignment_id"
    MATERIAL_VERSIONS ||--o{ ASSESSMENT_SESSIONS : "material_version_id"
    PROFILES ||--o| TEACHER_DEVICE_MODES : "teacher_id"
    ASSESSMENT_SESSIONS ||--o{ TEACHER_DEVICE_MODES : "session_id"

    ASSESSMENT_SESSIONS ||--o{ PRACTICE_RESPONSES : "session_id"
    ASSESSMENT_SESSIONS ||--o{ TASK_ATTEMPTS : "session_id"
    ASSESSMENT_SESSIONS ||--o{ SESSION_EVENTS : "session_id"
    PROFILES ||--o{ SESSION_EVENTS : "actor_id"
    TASK_ATTEMPTS ||--o{ RECORDINGS : "task_attempt_id"
    ASSESSMENT_SESSIONS ||--o{ RECORDINGS : "session_id"

    RECORDINGS ||--o{ AI_ANALYSES : "recording_id"
    ASSESSMENT_SESSIONS ||--o{ AI_ANALYSES : "session_id"
    AI_ANALYSES ||--o{ AI_ANNOTATIONS : "ai_analysis_id"

    TASK_ATTEMPTS ||--o{ REVIEW_REVISIONS : "task_attempt_id"
    PROFILES ||--o{ REVIEW_REVISIONS : "reviewer_id"
    REVIEW_REVISIONS ||--o{ REVIEW_ANNOTATIONS : "review_revision_id"
    RECORDINGS ||--o{ REVIEW_ANNOTATIONS : "recording_id"
    AI_ANNOTATIONS ||--o{ REVIEW_ANNOTATIONS : "source_ai_annotation_id"

    ASSESSMENT_SESSIONS ||--o{ REPORT_VERSIONS : "session_id"
    PROFILES ||--o{ REPORT_VERSIONS : "published_by"
    REPORT_VERSIONS ||--o{ REPORT_REVIEWS : "report_version_id"
    REVIEW_REVISIONS ||--o{ REPORT_REVIEWS : "review_revision_id"

    REPORT_VERSIONS ||--o{ REPORT_SHARES : "report_version_id"
    GUARDIAN_LINKS ||--o{ REPORT_SHARES : "guardian_link_id"
    PSYCHOLOGIST_PROFILES ||--o{ REPORT_SHARES : "psychologist_id"
    GUARDIAN_LINKS ||--o{ CONSULTATION_REQUESTS : "guardian_link_id"
    PSYCHOLOGIST_PROFILES ||--o{ CONSULTATION_REQUESTS : "psychologist_id"
    REPORT_SHARES ||--o{ CONSULTATION_REQUESTS : "report_share_id"
    PROFILES ||--o{ AUDIT_EVENTS : "actor_id"

    PROFILES {
        uuid id PK
        text full_name
        text display_name
        text product_role "teacher | guardian | psychologist | operator"
        text verification_status
        text account_status
    }
    CHILDREN {
        uuid id PK
        uuid school_id FK
        text display_name
        text grade
    }
    GUARDIAN_LINKS {
        uuid id PK
        uuid guardian_id FK
        uuid child_id FK
    }
    CONSENT_EVENTS {
        uuid id PK
        uuid guardian_link_id FK
        text purpose "activity | recording | ai"
        text decision
    }
    ASSESSMENT_SESSIONS {
        uuid id PK
        uuid child_id FK
        uuid teacher_assignment_id FK
        uuid material_version_id FK
        text status "draft | in_progress | completed | cancelled"
    }
    RECORDINGS {
        uuid id PK
        uuid session_id FK
        uuid task_attempt_id FK
        text storage_object_key
        text content_hash "SHA-256"
        text upload_status
    }
    REPORT_VERSIONS {
        uuid id PK
        uuid session_id FK
        int version
        uuid published_by FK
    }
    REPORT_SHARES {
        uuid id PK
        uuid report_version_id FK
        uuid psychologist_id FK
        timestamptz expires_at
        bool include_audio
    }
```

Atribut yang ditampilkan hanya kolom kunci; definisi lengkap ada di file migrasi.

## Autentikasi & otorisasi (JWT)

**Ya, sistem sudah menerapkan autentikasi berbasis JWT** melalui Supabase Auth. Berikut lapisannya:

| Lapisan | Implementasi | Lokasi |
|---|---|---|
| **Identitas (JWT)** | Supabase Auth (GoTrue) menerbitkan *access token* JWT dan *refresh token* saat login email/password atau Google OAuth. | `src/app/api/auth/[action]/route.ts` |
| **Penyimpanan token** | Token disimpan di cookie oleh `@supabase/ssr` (bukan `localStorage`). | `src/lib/supabase/server.ts`, `client.ts` |
| **Verifikasi & penyegaran** | Setiap request melewati `proxy.ts` yang memanggil `supabase.auth.getClaims()` untuk memverifikasi tanda tangan JWT dan menyegarkan sesi. | `src/proxy.ts` |
| **Otorisasi halaman per peran** | `proxy.ts` membaca `product_role`; belum login → `/masuk`, salah peran → dikembalikan ke ruang kerjanya sendiri. | `src/proxy.ts`, `src/lib/auth/role-home.ts` |
| **Otorisasi API** | Setiap route handler memanggil `auth.getUser()` dan memeriksa peran, status verifikasi, dan status akun (401/403). | `src/app/api/**` |
| **Otorisasi data (RLS)** | Postgres Row Level Security memakai `auth.uid()` dari JWT: 26 tabel ber-RLS, 40 policy, ditambah fungsi `security definer` untuk operasi sensitif (izin efektif, penerbitan, berbagi). | `supabase/migrations/` |
| **Proteksi tambahan** | Cek header `Origin` pada endpoint auth, batas ukuran body, pesan error yang tidak membocorkan keberadaan akun, signed URL audio 60 detik, `Cache-Control: private, no-store`. | route handler terkait |

Pemetaan peran → ruang kerja:

```text
teacher                 → /guru/*, /siswa
guardian, psychologist  → /orangtua/*
operator                → /operator, /admin
```

Diuji oleh `src/lib/auth/role-home.test.ts` dan `scripts/check-login-roles.mjs`.

## Arsitektur & teknologi

```mermaid
flowchart LR
    B[Browser] -->|HTTPS + cookie JWT| V[Vercel: Next.js 16<br/>App Router + proxy.ts]
    V -->|supabase-js, JWT pengguna| SA[Supabase Auth]
    V --> PG[(Postgres + RLS)]
    V --> ST[(Storage privat)]
    V -->|server-only API key| GM[Google Gemini]
```

| Bagian | Teknologi |
|---|---|
| Frontend & API | Next.js 16 (App Router, Route Handlers), React 19, TypeScript 5.9 |
| Gaya | CSS global + Tailwind CSS 4; font Nunito Sans (UI) dan Andika (teks bacaan anak) |
| Auth, DB, Storage | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| AI | Google Gemini (server-side, dijaga flag `ENABLE_AI_PROCESSING`) |
| Hosting | Vercel |

## Struktur halaman & API

**Halaman**

| URL | Peran | Isi |
|---|---|---|
| `/` | publik | Landing page |
| `/masuk` | publik | Login, daftar, lupa/atur ulang kata sandi |
| `/guru/siswa` | guru | Dasbor guru & mulai sesi |
| `/guru/rekaman` | guru | Tinjau rekaman & kandidat AI |
| `/guru/laporan` | guru | Susun & terbitkan laporan |
| `/guru/simulasi` | guru | Simulasi alur kegiatan |
| `/siswa` | guru (perangkat) | Sesi kegiatan siswa 4 pos |
| `/orangtua/laporan` | wali, psikolog | Laporan anak & berbagi ke psikolog |
| `/operator`, `/admin` | operator | Manajemen data sekolah |

**API (Route Handlers, `src/app/api`)**

| Kelompok | Endpoint |
|---|---|
| Auth | `POST /api/auth/{login,register,google,logout,onboarding,forgot,reset}`, `GET /api/auth/profile` |
| Data sekolah | `/api/children`, `/api/children/[id]`, `/api/assignments`, `/api/materials` |
| Sesi | `/api/assessment-sessions`, `.../[id]/start`, `.../complete`, `.../events`, `.../practice` |
| Mode perangkat | `/api/teacher-mode/{status,enter,unlock}` |
| Siswa | `/api/student/session`, `/api/student/task-attempts`, `/api/student/practice`, `/api/student/audio/{upload,finalize}` |
| Tinjauan & laporan | `.../[id]/recordings/[recordingId]`, `.../[id]/reviews`, `.../reviews/finalize`, `.../[id]/reports` |
| AI | `.../[id]/ai`, `.../[id]/ai/dispatch` |
| Wali & psikolog | `/api/guardian/consents`, `/api/psychologists`, `/api/reports/[id]/shares`, `.../shares/[shareId]`, `/api/consultations` |

## Akun uji

Akun berikut hanya untuk pengujian dan tidak terhubung ke data anak nyata.

| Peran | Email | Kata sandi | Diarahkan ke |
|---|---|---|---|
| Guru | `guru@dyscovery.id` | `GuruDyscovery2026!` | `/guru/siswa` |
| Orang tua / wali | `wali@dyscovery.id` | `WaliDyscovery2026!` | `/orangtua/laporan` |
| Operator sekolah | `operator@dyscovery.id` | `OperatorDyscovery2026!` | `/operator` |

## Pengembangan lokal

Butuh Node.js 22 (≥ 22.17) dan npm. Versi dependensi dikunci di `package-lock.json`.

```sh
cp .env.example .env.local   # isi URL & publishable key Supabase, GEMINI_API_KEY
npm ci
npm run dev                  # http://localhost:3000
```

| Perintah | Fungsi |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | Pemeriksaan tipe TypeScript |
| `npm run build` / `npm start` | Build & jalankan produksi |
| `npm run db:migrate` | Terapkan migrasi `supabase/migrations/` |
| `npm run test:db` | Tes database |
| `node --test tests/` | Tes endpoint & validasi input |
| `node --env-file=.env.local scripts/check-login-roles.mjs` | Verifikasi login & pengalihan tiap peran |

Jangan memasukkan data anak nyata dan jangan menyimpan kredensial di Git; file `.env*` diabaikan kecuali `.env.example`.

## Batasan yang diketahui

- Halaman operator dan sebagian portal orang tua (direktori psikolog) masih memakai data yang ditulis di kode; belum sepenuhnya dibaca dari database.
- Ambang deteksi suara mikrofon masih nilai tetap (`SILENCE_RMS = 0.02`), belum dikalibrasi per perangkat.
- Validitas instrumen untuk anak berbahasa Indonesia dan ketepatan anotasi AI belum diuji; hasil tidak boleh dipakai sebagai kategori risiko.

## Rujukan

- International Dyslexia Association. (2019). *Universal screening: K–2 reading* [Fact sheet]. https://dyslexiaida.org/universal-screening-k-2-reading/
- Jap, B. A. J., Borleffs, E., & Maassen, B. A. M. (2017). Towards identifying dyslexia in Standard Indonesian: The development of a reading assessment battery. *Reading and Writing, 30*(8), 1729–1751. https://doi.org/10.1007/s11145-017-9748-y
- Rello, L., Baeza-Yates, R., Ali, A., Bigham, J. P., & Serra, M. (2020). Predicting risk of dyslexia with an online gamified test. *PLOS ONE, 15*(12), e0241687. https://doi.org/10.1371/journal.pone.0241687
- Sanfilippo, J., Ness, M., Petscher, Y., Rappaport, L., Zuckerman, B., & Gaab, N. (2020). Reintroducing dyslexia: Early identification and implications for pediatric practice. *Pediatrics, 146*(1), e20193046. https://doi.org/10.1542/peds.2019-3046
- van der Velde, M., Harmsen, W., Veldkamp, B. P., Feskens, R., Keuning, J., & Swart, N. (2025). Speech enabled reading fluency assessment: A validation study. *International Journal of Artificial Intelligence in Education, 35*(4), 2569–2595. https://doi.org/10.1007/s40593-025-00480-y
