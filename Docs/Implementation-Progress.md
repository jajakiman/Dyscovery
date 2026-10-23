# Dyscovery: Implementation Progress

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
