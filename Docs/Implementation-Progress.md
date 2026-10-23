# Dyscovery: Implementation Progress

## Latihan teks sintetis (migrasi 008 belum diterapkan)

- Pemilik melaporkan uji manual mode guru/siswa lulus: penolakan daftar siswa 403, refresh/tab tetap terkunci, PIN salah ditolak dan PIN benar kembali ke draf sama. Bukan bukti pembersihan cache/history atau kesiapan anak nyata.
- Migrasi 008 menambah practice_responses privat dan RPC student_practice/save_student_practice. Hanya materi synthetic=true, protocol text-practice-v1 dengan satu item fase practice; bukan instrumen atau sesi skrining. Status assessment_sessions tetap draft. Tidak ada skor, koreksi jawaban, audio, AI, atau klaim diagnosis.
- Setiap RPC memeriksa current_student_mode (kedaluwarsa, assignment, wali, notice). Save memakai lock mode+anak, idempotensi request_id dan satu respons per item; retry sama mengembalikan ID sama, isi berbeda ditolak tanpa overwrite. Guru membaca respons via RLS hanya setelah unlock dan izin masih tersedia. Belum ada UI review guru.
- GET/POST `/api/student/practice` memakai flag sintetis yang sama; POST membutuhkan Origin staging. UI mode-test menambah Muat latihan dan simpan respons, mengingat request ID hanya di memori untuk retry. Tidak menyimpan data pribadi di browser. Tidak ada klaim click-through: browser/HP, SQL/RLS, konkurensi dan pengujian sukses/idempotensi database belum dieksekusi agen.
- `supabase/tests/practice.sql` menguji akses tanpa mode dan direct insert ditolak (rollback). `supabase/tests/seed-synthetic-practice.sql` berbeda: fixture PERSISTEN operator, sekali saja, khusus akun manual 1326aa5a-f29a-4c00-bc5d-f2728d4eff1f dan materi fixture 90000000-0000-4000-8000-000000000001. Jalankan ketika mode guru sudah terbuka; membuat materi v2/draf baru tanpa menimpa v1. Hasil id_draf_latihan dipakai masuk mode siswa.
- Verifikasi aktual: lint/typecheck/build exit 0, 5 file input test lulus; warning Node experimental/module detection tetap ada. Input practice pertama gagal modul belum ada lalu lulus. SQL belum dijalankan; tidak mengklaim red-green database. Belum commit/push.

## Koreksi policy sesi setelah migrasi 006

- Pemilik menjalankan test teacher-mode dan mendapat SQLSTATE 42501 pada SELECT assessment_sessions: policy sessions_assigned_read masih mengacu OID fungsi lama yang di-rename menjadi assigned_child_without_mode dan dicabut hak EXECUTE-nya.
- Migrasi `202610230007_rebind_session_policy.sql` mengikat ulang policy ke can_access_assigned_child yang memeriksa lock. Tidak mengubah migrasi 006 yang sudah diterapkan, tidak membuka helper privat, dan tidak menghapus data.
- Test teacher-mode.sql sekarang memeriksa dependency policy tidak mengacu helper privat serta authenticated tidak dapat mengeksekusinya. Jalankan migrasi 007 sekali setelah 006, lalu ulang seluruh test teacher-mode sampai rollback. SQL belum dieksekusi agen; keberhasilan database masih menunggu hasil operator.

## UI validasi sementara mode guru/siswa

- `/auth/mode-test` menambah login Google/email-password, setup PIN sekali, masuk mode dengan ID draft, unlock PIN, cek status dan uji akses `/api/children` tanpa menampilkan data siswa. PIN/password dibersihkan setelah submit dan tidak disimpan di localStorage/hasil request. Callback Google tetap ke profile JSON; buka ulang halaman setelah login.
- Halaman teknis mengikuti warna/tipografi sederhana halaman auth/test, bukan UI final. Form guru ditampilkan hanya setelah status server; halaman memeriksa ulang saat focus/pageshow. Ini tidak menjamin penghapusan seluruh cache/history/tab lain. Jangan serahkan ke anak nyata; asesmen/stimulus/rekaman belum tersedia.
- Perlu migrasi 006, uji SQL teacher-mode, dan env Vercel `ENABLE_SYNTHETIC_TEACHER_PIN=true` lalu redeploy. Belum membuat fixture permanen atau draft otomatis; ID draft berizin harus disiapkan lebih dahulu. Email/password tetap butuh akun confirmed dan SMTP bila registrasi belum tersedia.
- Hasil aktual UI: lint, typecheck, build exit 0. Browser click-through/HP/OAuth/PIN database belum dijalankan agen; pengguna perlu memvalidasi di staging. Belum commit/push.

## Fondasi PIN dan penguncian mode guru (parsial, belum handoff siswa)

- Keputusan pemilik: login Google atau email/password, tanpa username khusus; PIN 6 digit untuk kembali dari mode siswa. PIN bukan MFA produksi. Login manual sudah tersedia di endpoint auth, tetapi SMTP dan uji email end-to-end masih tertunda; tidak mengklaim UI login manual selesai.
- Migrasi 006 menambah teacher_device_modes privat, hash bcrypt cost 10 via pgcrypto, RPC set PIN satu kali, enter mode untuk draft sendiri yang berizin, status, unlock. Salah 5 kali memblokir 15 menit; counter diserialkan row lock dan hasil gagal dikembalikan tanpa exception agar counter tersimpan. Tidak ada PIN default/reset publik; recovery operator belum diimplementasikan.
- Lock berlaku SELURUH akun guru, bukan hanya satu device, agar login baru/tab lama tidak melewati lock. Restrictive RLS memblokir profiles/teacher_profiles/children/material_versions/assessment_sessions; trigger memblokir bypass onboarding security-definer. Helper akses assignment dibungkus lock; helper lama tidak dapat dipanggil authenticated. Data yang telanjur ditampilkan tidak dapat dihapus dari memori/tab lewat RLS.
- POST `/api/teacher-mode/{pin,enter,unlock}` menerima `{pin}` atau `{sessionId}`; perlu Origin staging dan `ENABLE_SYNTHETIC_TEACHER_PIN=true`. GET `/api/teacher-mode/status` memberikan mode teacher/student/locked. Flag endpoint bukan gerbang database: RPC authenticated tetap tersedia, sehingga jangan menerapkan migrasi ini ke penggunaan data nyata tanpa hardening. Mode siswa kedaluwarsa 1 jam, tetapi hak guru tetap terkunci sampai PIN benar. Unlock mengembalikan sessionId untuk navigasi kelak, bukan membuat sesi baru.
- BELUM siap menyerahkan perangkat kepada siswa: tidak ada UI mode/login manual/PIN, pembersihan tampilan/cache/tab, navigasi kembali, atau kapabilitas siswa terpisah; status hanya metadata satu draft, tidak menerima respons/stimulus. Tidak ada assessment berjalan, audio, skor, atau AI. Langkah berikutnya wajib menuntaskan client handoff dan menguji history/back/tab lama sebelum perangkat diserahkan.
- `supabase/tests/teacher-mode.sql` adalah test rollback penguncian akun, larangan baca/bypass onboarding, PIN immutable, 5 kesalahan dan pemulihan setelah lockout. Belum menguji enter end-to-end/konkurensi/HTTP/cache; SQL belum dijalankan agen. PostgreSQL lokal tidak tersedia pada tahap sebelumnya.
- Verifikasi lokal aktual: lint, typecheck, build exit 0; 4 file input test lulus dengan warning Node strip-types/module detection. Test PIN awal gagal karena modul belum ada lalu lulus setelah implementasi. Belum commit/push. Pemilik melaporkan migrasi dan test 005 berhasil.

## Materi versi tetap dan draf sesi (migrasi 005 belum diterapkan)

- Pemilik melaporkan migrasi 004 dan seluruh test consent sukses; bukan eksekusi agen. Tahap ini membangun persiapan saja: sesi selalu draft, belum dapat dimulai sebelum isolasi mode siswa tersedia sesuai Workflow/Security Rules.
- `202610230005_assessment_drafts.sql`: material_versions immutable (hanya approval_status dapat berubah), referensi versi consent kegiatan, dan assessment_sessions draft. content_hash adalah MD5 JSONB kanonik untuk penanda perubahan, bukan bukti autentisitas/kriptografi. Operator menerbitkan versi baru untuk perubahan materi. Tidak membuat instrumen, rubrik, klasifikasi, atau materi approved nyata secara otomatis.
- RPC `create_assessment_draft` mengambil child dari assignment server-side, memverifikasi pemilik assignment, masa aktif/status, RLS helper dan consent kegiatan seluruh wali pada versi yang terikat materi. Lock anak menserialkan keputusan consent/pembuatan draft; retry pasangan assignment+material mengembalikan draft yang sama, namun tetap memeriksa izin ulang. Gerbang ini bukan izin permanen menjalankan sesi.
- GET `/api/materials?offset=0`: materi approved untuk guru verified aktif; GET `/api/assessment-sessions?offset=0`: draft siswa yang masih ditugaskan dan consent/material masih sesuai. Masing-masing maksimal 50. POST `/api/assessment-sessions` menerima `{teacherAssignmentId,materialVersionId}` dengan Origin staging; tidak menerima child/status dari browser. Belum ada UI, detail route, kapabilitas siswa, respons, audio, skor, atau AI.
- `supabase/tests/assessment-drafts.sql`: transaksi sintetis rollback untuk materi draft ditolak, izin kosong ditolak, pembuatan sah, retry idempotent, larangan update langsung, guru tanpa assignment ditolak, serta withdrawal memblokir baca/retry. Belum dieksekusi PostgreSQL oleh agen; pengujian konkurensi juga belum dilakukan. Jangan klaim kesiapan produksi.
- Verifikasi lokal aktual: lint, typecheck, build exit 0; `node --experimental-strip-types --test tests/*.test.mjs` lulus 3 file input. Test input sesi awalnya gagal karena modul belum ada lalu lulus. Warning Node strip-types/module detection tetap muncul. SQL/RLS dan route end-to-end belum diuji. Belum commit/push.
- Operator: jalankan migrasi 005 sekali setelah 004, lalu seluruh test assessment-drafts.sql sampai rollback. Tidak perlu fixture permanen atau data anak nyata. Langkah berikutnya: desain isolasi mode siswa, prosedur materi dan kontrak respons sebelum sesi dapat dimulai; izin rekaman tetap terpisah saat fitur rekaman dibuat.

## Hubungan wali dan persetujuan (migrasi 004 belum diterapkan)

- Verifikasi lokal aktual: lint, typecheck, build exit 0; `node --experimental-strip-types --test tests/*.test.mjs` lulus 2 file uji (auth/consent input). Test input consent pertama gagal karena modul belum ada, kemudian lulus setelah implementasi. Warning Node experimental strip-types/module detection tetap muncul. SQL/RLS dan route end-to-end belum diuji; tidak mengklaim siklus red-green database. Belum commit/push.
- Kebijakan disetujui pemilik: semua wali sah terverifikasi yang masih terhubung harus grant; jumlah sesuai kondisi anak, dapat satu atau lebih. Nol wali, keputusan kosong/deny/withdraw atau akun wali tidak aktif memblokir izin. Operator wajib memastikan daftar lengkap, bukan mencabut hubungan untuk melewati penolakan.
- `202610230004_consents.sql`: guardian_links operator-only; consent_notices immutable dan disabled secara default; consent_events append-only. Tujuan activity/recording/ai terpisah. Tidak ada persetujuan berbagi laporan atau aktivasi AI pada tahap ini.
- `record_guardian_consent` memeriksa auth.uid, role guardian terverifikasi, identitas terkonfirmasi, akun aktif dan hubungan. Tidak menerima actor dari browser; guru tidak dapat menyetujui atas nama wali. Keputusan diurutkan ID server, perubahan keputusan per anak diserialkan dengan row lock. Verifikasi ulang memerlukan persetujuan baru.
- `has_effective_consent` hanya menjawab untuk wali sah atau guru yang ditugaskan; false untuk pengguna lain. Harus dipanggil ulang pada operasi pemrosesan kelak; belum ada sesi/upload/dispatch sehingga belum ada integrasi gerbang operasi tersebut.
- GET `/api/guardian/consents?offset=0` membaca hubungan sendiri, pemberitahuan, dan riwayat sendiri (masing-masing maksimal 50, offset yang sama). POST menerima `{guardianLinkId,purpose,decision,noticeVersion,processingScopeVersion,confirmed:true}` dengan Origin staging. RPC juga dapat dipanggil langsung oleh wali sah; confirmed adalah validasi endpoint, bukan bukti wali telah membaca teks. Belum ada UI persetujuan.
- Tidak membuat akun/role wali, pemberitahuan, atau fixture permanen otomatis. Teks pemberitahuan nyata, prosedur verifikasi wali/audit provisioning, rate limiting dan kebutuhan rilis tetap harus diselesaikan sebelum data anak nyata. Jangan memindahkan role akun guru uji menjadi wali: MVP satu role per akun.
- Uji `supabase/tests/consents.sql` memakai rollback: satu dari dua wali belum cukup, semua grant cukup, withdrawal memblokir, satu wali sah cukup setelah pencabutan hubungan oleh operator, verifikasi ulang tidak memakai keputusan lama, akun suspended ditolak, akses wali lain ditolak. PostgreSQL lokal tidak tersedia dan Docker daemon tidak berjalan; uji database belum dieksekusi agen.
- Pemilik sebelumnya melaporkan migrasi/test 003 dan akses daftar/detail siswa sintetis sesuai; bukan eksekusi database agen. Status guru uji dan fixture permanen sebelumnya perlu dibersihkan sebelum produksi.

## Penugasan dan akses siswa (kode tersedia, database belum diterapkan)

- Verifikasi lokal tahap ini: `npm run lint`, `npm run typecheck`, dan `npm run build` selesai dengan exit 0. Ini tidak memvalidasi eksekusi SQL/RLS; migrasi 003 dan test database masih menunggu pengujian staging oleh operator. Belum commit/push.
- Migrasi `202610230003_assignments.sql`: schools, school_members, children, teacher_assignments. school_id tambahan pada assignment mengikat dua FK gabungan untuk mencegah penugasan lintas sekolah. Tidak menambah tabel kelas.
- Status usulan sebelumnya dipakai: keanggotaan pending/active/revoked, assignment active/revoked/completed; siswa active/inactive. Grade dibatasi '2' sesuai scope MVP.
- RLS read siswa memeriksa akun guru aktif/verified, sekolah verified, keanggotaan aktif/verified, siswa aktif, serta assignment aktif dan rentang waktu. Status dievaluasi ulang setiap query; profil pending tidak diberi akses.
- GET `/api/children?offset=0`: maksimal 50 siswa ditugaskan; 401 tanpa login, 403 bukan guru verified, hasil kosong bila tidak ada penugasan. GET `/api/children/{uuid}`: detail minimal; 404 sama untuk tidak ada/tidak berizin agar tidak mengungkap keberadaan siswa.
- Tidak ada endpoint tulis/provisioning, akses browser ke tabel sekolah/keanggotaan/penugasan, atau akses data anak nyata. Operator SQL saja yang mengelola provisioning sintetis pada tahap ini; audit provisioning belum dibangun, jangan gunakan data nyata.
- Uji runnable: `supabase/tests/assignments.sql`, fixture rollback; mencakup baca sah, guru tanpa assignment, FK lintas sekolah, larangan tulis, assignment kedaluwarsa, dan akun suspended. Belum dijalankan pada database oleh agen.
- Langkah operator: review dan jalankan migrasi 003 sekali setelah 001/002, lalu seluruh test assignments.sql pada staging. Jangan drop/reset bila konflik. Fixture test tidak membuat penugasan permanen untuk akun OAuth; provisioning akun uji riil menunggu UUID dan persetujuan pemilik.
- OAuth/onboarding/logout sebelumnya dilaporkan sesuai oleh pemilik di staging, bukan pengujian otomatis agen.
- Tahap berikutnya setelah validasi: hubungan wali/persetujuan, sebelum materi dan sesi asesmen.

## Halaman uji HP

Halaman teknis `/auth/test` ditambahkan untuk Google OAuth, cek profil, onboarding sintetis, dan logout tanpa Console. Callback tetap ke JSON profil; buka ulang `/auth/test` setelah OAuth. Tidak ada form password/registrasi pada halaman ini karena SMTP masih belum disiapkan. Ini alat uji staging, bukan UI final. Tidak mengubah kewenangan atau membuat data anak. Pengujian browser HP/end-to-end tetap dilakukan pemilik setelah deployment; perubahan belum otomatis di-push.

## Langkah 3: Backend autentikasi dan onboarding (belum uji end-to-end)

- Ditambahkan route `/api/auth/[action]`, `/api/auth/profile`, `/auth/callback`, `/auth/confirm`, validasi `src/lib/auth/input.ts`, serta check runnable `tests/auth-input.test.mjs`.
- Migrasi 002 menambahkan RPC onboarding atomik tanpa memberikan role teacher/verified. Persetujuan eksplisit divalidasi endpoint; RPC hanya mencatat konfirmasi identitas sendiri.
- Hasil aktual: check input lulus; lint, typecheck, build exit 0. Node 22 menampilkan warning experimental strip-types/module detection saat check, bukan kegagalan.
- Migrasi 001/uji identity dilaporkan sukses oleh pemilik melalui screenshot; bukan eksekusi agen. Migrasi 002, uji SQL onboarding, OAuth/email/session staging belum dijalankan.
- Panduan template konfirmasi email, kontrak API, matriks uji dan batas rilis: [Auth-Staging-Testing.md](Auth-Staging-Testing.md).
- Belum UI, reset password, audit onboarding, perlindungan abuse aplikasi lengkap, atau akses siswa nyata. Tidak commit/push atau deploy otomatis pada tahap ini.

## Langkah 2: Integrasi Supabase dan identitas (kode tersedia, staging belum diuji)

- Client `src/lib/supabase/{config,client,server}.ts` dan refresh sesi `src/proxy.ts` menggunakan SDK resmi; tidak ada privileged key atau otorisasi berdasarkan metadata Google.
- `.env.example` tersedia. Konfigurasi URL HTTPS dan publishable key wajib saat request aplikasi, bukan saat build.
- Migrasi: `supabase/migrations/202610230001_identity.sql`; profil pending, role null, NIP opsional pada teacher_profiles, RLS self-read, update terbatas nama, kolom kewenangan tidak dapat ditulis pengguna. Nama berubah membatalkan konfirmasi identitas.
- Pengujian SQL runnable: `supabase/tests/identity.sql` (rollback fixture sintetis; baca lintas akun dan eskalasi kewenangan ditolak).
- Verifikasi aktual: `npm run lint`, `npm run typecheck`, `npm run build` selesai exit 0.
- BELUM dijalankan: migrasi staging, pengujian SQL, refresh sesi riil atau OAuth end-to-end. Tidak ada kredensial/proyek Supabase yang diakses sesi ini. Jangan menganggap RLS sudah terbukti sampai SQL test dijalankan.
- Panduan operator dan batas implementasi: [Supabase-Staging-Setup.md](Supabase-Staging-Setup.md).
- Belum ada login/callback/onboarding. Tahap selanjutnya setelah review dan uji migrasi: endpoint autentikasi dan RPC onboarding. Tidak ada commit/push otomatis untuk tahap ini.
- Instalasi masih melaporkan konflik peer tooling ESLint dan temuan audit yang sudah tercatat; bukan perbaikan keamanan tooling pada tahap ini.

## Batas implementasi

- Acuan: `Dyscovery-PRD.md`, `Dyscovery-ERD.md`, `Dyscovery-Workflow.md`, `Dyscovery-Security-Rules.md`.
- Eksekusi bertahap; tahap berikutnya menunggu validasi pemilik proyek.
- Tidak menggunakan data anak nyata, mengaktifkan billing, atau mengubah aset brand/mascot.

## Langkah 1: Fondasi aplikasi (selesai, dengan temuan dependensi)

- [x] Konfigurasi Next.js App Router, TypeScript strict, Tailwind, dan ESLint.
- [x] Kode aplikasi di `src/app/`; `Docs/` dan `public/` dipertahankan.
- [x] Instalasi dependensi dan penguncian versi.
- [x] Lint, typecheck, build, dan pemeriksaan HTTP halaman awal.

### File dan versi

- Ditambahkan: `package.json`, `package-lock.json`, `.gitignore`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `src/app/{layout.tsx,page.tsx,globals.css}`.
- Diperbarui: `README.md` untuk perintah pengembangan. Aset lama tidak diubah.
- Next.js 16.4.2; React/React DOM 19.3.1; Tailwind 4.3.3; TypeScript 5.9.3; ESLint 10.13.0.
- TypeScript terbaru yang sempat terpasang (7) tidak didukung typescript-eslint; dipin ke 5.9.3 setelah kegagalan lint ditemukan. ESLint 9 menghasilkan peringatan tidak didukung; versi akhir memakai 10.13.0.

### Hasil verifikasi aktual

- `npm run lint`: lulus, tanpa warning.
- `npm run typecheck`: lulus.
- `npm run build`: exit 0.
- Server produksi melalui `node node_modules/next/dist/bin/next start --port 3100`: HTTP 200, isi halaman memuat Dyscovery.
- Tidak dilakukan pengujian browser interaktif; halaman teknis tidak memiliki kontrol.
- `npm audit`: 5 temuan high pada rantai dependensi pengembangan ESLint Next → fast-glob → micromatch → braces. Belum diperbaiki; rekomendasi otomatis menurunkan konfigurasi ke Next 14 tidak diterapkan karena tidak sesuai major aplikasi. Ini temuan terbuka, bukan klaim dependensi aman. Tinjau perbaikan upstream sebelum rilis.
- Percobaan `npm start -- --port 3100` gagal karena penerusan argumen npm di lingkungan PowerShell ini; perintah langsung Node di atas berhasil. `npm start` standar menggunakan port 3000.

### Cara melanjutkan

Jalankan `npm ci`, lalu `npm run dev`. Gunakan `npm run lint`, `npm run typecheck`, dan `npm run build` untuk verifikasi. `.env` belum dibutuhkan pada tahap ini. Tidak ada migrasi atau perubahan resource cloud, dan tidak ada commit otomatis.

Halaman awal hanya placeholder teknis, bukan desain UI final. Belum ada endpoint bisnis, autentikasi, Supabase, database, ataupun akses siswa.

## Arah autentikasi yang disepakati (belum diimplementasikan)

- Supabase Auth: Google OAuth dan email/password; verifikasi email untuk registrasi manual.
- Onboarding: nama lengkap wajib, nama panggilan opsional, email tidak diedit pada formulir, NIP opsional, pernyataan kesesuaian data wajib tanpa centang bawaan.
- Nama Google hanya isian awal; tidak menimpa nama yang telah dikonfirmasi saat login berikutnya.
- Konfirmasi pengguna bukan verifikasi profesi. NIP dan Google OAuth tidak otomatis memberi hak guru.
- Akun baru hanya dashboard demo/data sintetis; akses data nyata memerlukan verifikasi dan penugasan.
- Usulan ERD yang belum dituangkan: `profiles.full_name`, `profiles.identity_confirmed_at`, dan `teacher_profiles(profile_id, nip)`.
- Mekanisme verifikasi guru untuk penggunaan nyata belum ditetapkan. MFA guru tetap wajib sesuai Security Rules.

## Langkah berikutnya (menunggu validasi)

### Target staging publik

- Pengujian bersama memakai deployment Vercel publik dan proyek Supabase khusus staging, bukan localhost sebagai callback staging.
- Gunakan domain stabil Vercel yang benar-benar tersedia; domain belum dicatat karena belum dikonfirmasi.
- Vercel: preset Next.js, root `./`, build/output default, Node.js 22.x. Proyek Vercel khusus staging dapat memakai environment bernama Production milik Vercel tanpa menjadikannya produksi data nyata.
- Environment aplikasi: `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` proyek staging. Jangan menaruh secret/service-role pada variabel publik atau Git.
- Supabase Site URL: origin staging HTTPS. Redirect allowlist: origin tersebut ditambah `/auth/callback` dan `/auth/confirm` setelah endpoint diimplementasikan.
- Google OAuth: JavaScript origin memakai origin staging; redirect URI memakai callback Supabase staging `/auth/v1/callback`. Client Secret disimpan pada provider Supabase, bukan frontend.
- Google Testing hanya menerima test users; akses publik ke situs tidak berarti OAuth terbuka untuk semua akun. Email confirmation tetap aktif; pembatasan penerima/SMTP perlu diperiksa.
- Kode autentikasi dan resource cloud belum dibuat oleh implementasi ini. Tidak ada data anak nyata atau billing yang diaktifkan.

Konfigurasi client Supabase dan environment staging, kemudian migrasi identitas/RLS dan alur autentikasi. Jangan membuat seluruh tabel ERD atau mengaktifkan provider eksternal sekaligus.

## Aturan handoff

Setiap perubahan berikutnya wajib memperbarui dokumen ini dengan file terkait, cara menjalankan, hasil uji aktual, blocker, serta langkah berikutnya. Perubahan model/alur juga harus disinkronkan dengan ERD/Workflow setelah disetujui. Jangan menulis nilai kredensial dalam dokumentasi atau Git.
