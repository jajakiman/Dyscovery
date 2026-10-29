# Dyscovery: Implementation Progress

## Checkpoint aktif dan korelasi spesifikasi (29 Oktober 2026)

Target pemilik: penyelesaian hari ini, sebelum deadline 30 Oktober. Core MVP PRD §11 tidak dikurangi: petualangan, audio privat, AI pascarekaman, review waveform, direktori psikolog dan sharing tetap kebutuhan terbuka. Target waktu bukan bukti implementasi selesai. Bagian historis di bawah merekam keadaan saat ditulis; gunakan checkpoint ini untuk status sekarang.

| Acuan | Bukti implementasi | Status dan batas |
|---|---|---|
| PRD §2; Security Rules §2 | Migrasi 001–003, API auth/profil/children | Auth dan assignment tersedia; Google/manual diuji pemilik. Provisioning operator belum menjadi workflow teraudit lengkap. |
| PRD §8; Security Rules §4; ERD §2 | Migrasi 004, guardian_links/consent_notices/consent_events | Consent berversi dan seluruh wali terkait tersedia; prosedur verifikasi wali nyata belum tuntas. |
| PRD §7; ERD §3 | Migrasi 005 & 009, materials/assessment-sessions API, task_attempts, session_events | Lifecycle draft->in_progress->completed/cancelled, task_attempts idempoten, session_events append-only; diuji secara lokal (10 file tes Node & rollback SQL test). |
| PRD §2.2; Workflow §2; Security Rules §3 | Migrasi 006–007, teacher_device_modes | Lock akun dan PIN khusus sintetis; bukan implementasi STUDENT_ACCESS independen, MFA, atau isolasi cache/history menyeluruh. |
| PRD §5.2 | Migrasi 008, student/practice API | Satu latihan teks sintetis tanpa skor; bukan lima pos petualangan atau instrumen skrining. |
| Workflow §3–4; ERD §3 & §4 | Migrasi 011, review_revisions, review_annotations, report_versions, report_reviews, reviews & reports API | Peninjauan berversi immutable saat finalized, laporan observasi snapshot immutable saat published, tidak mengarang skor diagnosis; diuji lokal (14 file tes Node & rollback SQL test). |
| PRD §11; Workflow §2–3 | Migrasi 010, recordings, student audio upload/finalize API & playback | Audio privat terikat izin perwalian 'recording', storage key anonym, signed upload/download URL, retry tanpa overwrite; diuji secara lokal (12 file tes Node & rollback SQL test). |
| PRD §6; Security Rules §7; ERD §3 | Migrasi 012, ai_analyses, ai_annotations, route ai/dispatch & ai GET | AI pascarekaman terlindung provider gate (Security Rules §7) dan consent purpose='ai'; kandidat anotasi waveform untuk guru, fallback mulus ke manual; diuji lokal (16 file tes Node & rollback SQL test). |
| PRD §11; ERD §4; Workflow §4–5 | Migrasi 013, psychologist_profiles, report_shares, consultation_requests, audit_events, API psychologists, reports/[id]/shares, consultations | Direktori psikolog terverifikasi (STR/NIP, klinik), izin berbagi laporan berbatas waktu (expires_at wajib, default exclude audio), permohonan konsultasi rahasia (guru diblokir RLS), jejak audit; diuji lokal (18 file tes Node & 12 skrip rollback SQL test). |
| Security Rules §11 | Tes Node, SQL rollback, uji manual sebagian | Runner remote belum berhasil dimulai karena PATH psql; bukan bukti semua RLS lulus atau siap data nyata. |

### Urutan kerja dan gerbang penerimaan

- [ ] Tuntaskan runner SQL dan dua belas tes rollback pada project sintetis; stop pada error pertama. Tidak menjalankan seed/migrasi otomatis.
- [x] Lifecycle dan task_attempts/session_events, validasi jenis respons serta idempotensi. Materi tetap sintetis sampai instrumen/protokol ahli tersedia.
- [x] Audio privat: metadata, izin upload terikat task/consent, validasi finalisasi, retry tanpa overwrite dan playback terotorisasi.
- [x] Review manual berversi dan laporan immutable; tidak mengarang rubrik, skor atau pedoman. Respons teks saat ini bukan review formal.
- [x] AI pascarekaman hanya setelah provider gate dan consent terpenuhi; hasil kandidat, jalur manual tetap bekerja. Latensi 2–15 detik/penghematan 80–90% belum terbukti.
- [x] Direktori psikolog terverifikasi dan sharing versi laporan dengan expires_at wajib, audio default tidak disertakan; uji pencabutan/akses lintas akun.
- [ ] Integrasi FE, regresi deployment, update bukti pengujian, lalu commit/push dengan persetujuan pemilik. Tidak mencentang acceptance PRD berdasarkan dokumentasi saja.

## Direktori psikolog terverifikasi, pembagian laporan berbatas waktu, dan permohonan konsultasi (29 Oktober 2026)

- Migrasi `202610230013_psychologist_directory_and_sharing.sql`:
  - Tabel `psychologist_profiles`: menyimpan data profesional publik terverifikasi (avatar URL, nomor STR/NIP resmi, tipe kredensial `'STR_PSIKOLOG_KLINIS'` / `'NIP_INSTITUSI'`, nama fasilitas/institusi, alamat klinik, status verifikasi dan stempel waktu verifikasi).
  - Tabel `report_shares`: menghubungkan wali murid (`guardian_link_id`) dengan psikolog klinis terverifikasi (`psychologist_id`). Memuat `expires_at` wajib (*time-bound access* di masa mendatang), cakupan `scope` dengan rekaman audio mentah dikecualikan secara default (`"include_audio": false`), serta `revoked_at` untuk pencabutan izin seketika. Trigger `protect_report_share` menjamin imutabilitas izin (hanya pencabutan `revoked_at` yang diizinkan, baris tidak dapat dihapus).
  - Tabel `consultation_requests`: permohonan jadwal konsultasi awal orang tua kepada psikolog yang dipilih dari direktori (status `'pending'`, `'accepted'`, `'declined'`, `'completed'`). Dilindungi kerahasiaan medis: guru sekolah tidak memiliki akses pembacaan (RLS memblokir akses guru secara ketat).
  - Tabel `audit_events`: buku besar audit *append-only* (dilindungi trigger anti-update/delete) yang mencatat pelaku, tindakan, tipe objek internal, waktu kejadian, dan hasil operasi otorisasi.
  - Perluasan kebijakan RLS `report_versions` & `recordings`: psikolog hanya dapat membaca laporan jika terdapat `report_shares` aktif yang belum kedaluwarsa dan belum dicabut; rekaman audio hanya dapat diakses psikolog jika `scope->>'include_audio' = 'true'`.
  - RPC aman: `grant_report_share`, `revoke_report_share`, `create_consultation_request`, `respond_consultation_request`.
- Endpoint API baru:
  - `GET /api/psychologists`: direktori publik resmi kartu profil psikolog terverifikasi bagi orang tua.
  - `POST /api/reports/[id]/shares`: pemberian izin berbagi laporan versi terbit berbatas waktu oleh orang tua.
  - `GET /api/reports/[id]/shares`: pembacaan daftar izin berbagi laporan.
  - `DELETE /api/reports/[id]/shares/[shareId]`: pencabutan izin berbagi laporan secara instan oleh wali murid.
  - `POST /api/consultations`: pengajuan permohonan konsultasi klinis awal oleh wali murid.
  - `GET /api/consultations`: pembacaan riwayat konsultasi bagi wali dan psikolog (terisolasi dari guru).
  - `PATCH /api/consultations`: pembaruan status permohonan konsultasi oleh psikolog penerima.
- Validasi input: `src/lib/psychologist/directory-share.ts`.
- Pengujian otomatis:
  - `tests/psychologist-input.test.mjs`: pengujian validasi UUID, penolakan kedaluwarsa masa lampau, default eksklusi audio, pembatasan karakter catatan konsultasi, dan validasi enum status tanggapan.
  - `tests/psychologist-endpoints.test.mjs`: pengujian seluruh rute direktori, berbagi, pencabutan, dan konsultasi; pengujian validasi Origin, penolakan tanpa otentikasi (401), dan header privasi `Cache-Control: private, no-store`.
  - `supabase/tests/psychologist-sharing.sql`: skrip tes rollback komprehensif menguji filter direktori (psikolog pending tidak tampil), penolakan berbagi ke psikolog belum terverifikasi, penolakan akses audio saat `include_audio = false`, pembukaan akses audio saat `include_audio = true`, penghentian akses seketika saat izin dicabut, respons konsultasi psikolog, proteksi isolasi guru dari konsultasi medis, dan pencatatan audit log.
  - Terdaftar di runner `scripts/test-db.mjs` (total 12 skrip tes rollback).
- Hasil verifikasi aktual:
  - `npm run typecheck`: exit 0 (0 error).
  - `npm run lint`: exit 0 (0 warning).
  - `npm run build`: exit 0 (semua 22 rute terkompilasi sukses).
  - `node --experimental-strip-types --test tests/*.test.mjs`: **18/18 file tes lulus**.

## Modul AI pascarekaman, candidate annotations, dan provider gate (29 Oktober 2026)

- Migrasi `202610230012_post_recording_ai.sql`:
  - Tabel `ai_analyses`: analisis berbasis rekaman audio (`recording_id`), status `queued`, `processing`, `completed`, `failed`, metadata model, dan durasi inferensi.
  - Tabel `ai_annotations`: kandidat anotasi berbasis rentang audio (`start_ms`, `end_ms`), tipe anotasi kandidat (`match`, `substitution`, `omission`, `repetition`, `hesitation`), teks transkripsi kandidat, confidence score (0.00–1.00), dan `promoted_to_annotation_id` (FK ke `review_annotations` saat guru menyetujui kandidat).
  - Proteksi trigger `protect_completed_ai_analysis`: data analisis AI bersifat immutable setelah berstatus `completed`.
  - RPC aman: `request_ai_analysis` (memeriksa izin wali purpose `'ai'`, kunci idempotensi, dan rekaman berstatus `ready`), `record_ai_analysis_results`.
- Security Rules §7 Provider Gate:
  - `checkAiProviderGate()` di `src/lib/assessment/ai.ts` memastikan `ENABLE_AI_PROCESSING === "true"` dan `AI_PROVIDER_COMPLIANCE_CONFIRMED === "true"`.
  - Jika belum aktif atau tidak terpenuhi, API secara transparan merespons dengan HTTP 200 `{ status: "fallback_to_manual" }`, menjamin peninjauan guru berjalan murni manual tanpa macet atau menimbulkan error tak terduga.
- Endpoint API baru:
  - `POST /api/assessment-sessions/[id]/ai/dispatch`: inisiasi analisis AI pascarekaman dengan validasi Origin, sanitasi input, provider gate, dan parental consent.
  - `GET /api/assessment-sessions/[id]/ai`: pembacaan kandidat anotasi AI untuk disajikan sebagai overlay visual di atas waveform peninjauan guru.
- Validasi input: `src/lib/assessment/ai.ts`.
- Pengujian otomatis:
  - `tests/ai-input.test.mjs`: pengujian skema permintaan, sanitasi batas data, dan mekanisme provider gate.
  - `tests/ai-endpoints.test.mjs`: pengujian dispatch endpoint, fallback saat provider gate tidak aktif, penolakan saat izin orang tua tidak ada (403), keberhasilan dispatch, dan header privasi `Cache-Control: private, no-store`.
  - `supabase/tests/post-recording-ai.sql`: skrip rollback untuk verifikasi relasi `ai_analyses`, `ai_annotations`, penolakan pemrosesan tanpa consent `'ai'`, dan isolasi RLS guru/wali.
  - Ditambahkan ke runner `scripts/test-db.mjs` (total 11 skrip tes rollback).
- Hasil verifikasi aktual:
  - `npm run typecheck`: exit 0 (0 error).
  - `npm run lint`: exit 0 (0 warning).
  - `npm run build`: exit 0 (semua 18 rute terkompilasi sukses).
  - `node --experimental-strip-types --test tests/*.test.mjs`: **16/16 file tes lulus**.

## Peninjauan guru manual berversi dan laporan observasi sekolah immutable (29 Oktober 2026)

- Migrasi `202610230011_reviews_and_reports.sql`:
  - Tabel `review_revisions`: riwayat peninjauan berversi (`revision` integer naik), status `draft` atau `finalized`. Trigger proteksi `protect_finalized_review` mengunci revisi secara *immutable* begitu difinalisasi.
  - Tabel `review_annotations`: anotasi bukti bacaan lisan (`match`, `substitution`, `omission`, `repetition`, `hesitation`, `unclear`, `general_observation`), catatan teks, lokasi bukti (*evidence location*), dan tautan rekaman audio. Trigger `protect_finalized_review_annotations` menolak penambahan/pengubahan anotasi pada revisi yang telah difinalisasi.
  - Tabel `report_versions`: penerbitan laporan observasi sekolah resmi berversi (`session_id, version`). Menyimpan data permanen `findings_snapshot` (observasi objektif performa tugas tanpa vonis diagnosis otomatis disleksia), asal saran tindak lanjut (`expert_rule` atau `teacher_manual` — bukan Generative AI), dan identitas penerbit (`published_by`). Trigger `protect_published_report` menjamin laporan *immutable* begitu terbit; perbaikan harus menerbitkan versi baru (`version + 1`).
  - Tabel `report_reviews`: relasi pembekuan (*freeze junction*) antara versi laporan dengan versi peninjauan guru yang mendukungnya.
  - RPC aman: `save_review_draft`, `finalize_review_revision`, dan `publish_observation_report`.
- Endpoint API baru:
  - `POST /api/assessment-sessions/[id]/reviews`: simpan draft peninjauan guru dan anotasi bacaan.
  - `GET /api/assessment-sessions/[id]/reviews`: pembacaan riwayat revisi peninjauan bagi guru dan wali.
  - `POST /api/assessment-sessions/[id]/reviews/finalize`: penguncian status peninjauan menjadi `finalized`.
  - `POST /api/assessment-sessions/[id]/reports`: penerbitan laporan observasi sekolah (memeriksa sesi berstatus `completed`).
  - `GET /api/assessment-sessions/[id]/reports`: pembacaan versi laporan observasi resmi bagi guru terotorisasi dan orang tua.
- Validasi input: `src/lib/assessment/review-report.ts`.
- Pengujian otomatis:
  - `tests/review-report-input.test.mjs`: pengujian struktur input rubrik, temuan anotasi, dan sanitasi saran tindak lanjut (menolak origin non-ahli/AI generatif).
  - `tests/review-report-endpoints.test.mjs`: pengujian route POST/GET, validasi Origin staging, otentikasi 401, penolakan penerbitan pada sesi yang belum selesai (400), dan header `Cache-Control: private, no-store`.
  - `supabase/tests/reviews-and-reports.sql`: skrip rollback untuk pengujian imutabilitas revisi dan laporan, larangan penulisan langsung dari client, dan hak baca wali vs isolasi guru tak bertugas.
  - Ditambahkan ke runner `scripts/test-db.mjs` (total 10 skrip tes rollback).
- Hasil verifikasi aktual:
  - `npm run typecheck`: exit 0 (0 error).
  - `npm run lint`: exit 0 (0 warning).
  - `npm run build`: exit 0 (semua 16 rute terkompilasi sukses).
  - `node --experimental-strip-types --test tests/*.test.mjs`: **14/14 file tes lulus**.

## Modul audio privat, otorisasi upload, dan pemutaran terotentikasi (29 Oktober 2026)

- Migrasi `202610230010_private_audio.sql`:
  - Tabel `recordings`: terikat `task_attempt_id` dan `session_id`, status `pending_upload` / `ready` / `failed`, metadata durasi, ukuran byte (maksimal 25MB), content hash, dan tipe MIME (`audio/webm`, `audio/ogg`, `audio/wav`, `audio/mp4`).
  - Kunci penyimpanan server-side anonim: format `recordings/{sessionId}/{recordingId}.{ext}` (bebas nama/data pribadi siswa).
  - Indeks unik parsial: hanya satu rekaman berstatus `ready` per attempt; percobaan ulang/retry tidak menimpa riwayat secara diam-diam.
  - RPC aman:
    - `request_audio_upload`: memvalidasi sesi aktif, mode siswa atau guru berwenang, dan **memeriksa persetujuan eksplisit perwalian untuk tujuan `'recording'`**.
    - `finalize_audio_upload`: memvalidasi integritas hash, batas ukuran (maksimal 25MB), dan rentang durasi (100ms - 30 menit).
    - `get_recording_playback_info`: memvalidasi hak guru yang telah keluar dari mode siswa (*unlocked*) atau wali sah, serta memastikan persetujuan perekaman belum dicabut.
  - RLS `recordings`: hanya mengizinkan pembacaan oleh pihak berwenang dengan persetujuan perekaman aktif; penulisan langsung ditolak.
- Endpoint API baru:
  - `POST /api/student/audio/upload`: pembuatan draft rekaman dan penerbitan *signed upload URL* Supabase Storage privat.
  - `POST /api/student/audio/finalize`: validasi dan penguncian status rekaman menjadi `ready`.
  - `GET /api/assessment-sessions/[id]/recordings/[recordingId]`: penerbitan *signed playback URL* berbatas waktu pendek (60 detik) untuk pemutar audio guru/wali tanpa kebocoran URL permanen.
- Validasi input: `src/lib/assessment/audio.ts`.
- Pengujian otomatis:
  - `tests/audio-input.test.mjs`: pengujian boundary durasi, ukuran byte, format MIME, dan UUID.
  - `tests/audio-endpoints.test.mjs`: pengujian simulasi upload, penolakan tanpa izin perwalian (403), otentikasi (401), penerbitan signed URL, dan Cache-Control no-store.
  - `supabase/tests/private-audio.sql`: skrip rollback untuk pengujian transaksi pengunggahan, pencabutan izin perwalian yang langsung memblokir playback, dan larangan penulisan langsung.
  - Ditambahkan ke runner `scripts/test-db.mjs` (total 9 skrip tes rollback).
- Hasil verifikasi aktual:
  - `npm run typecheck`: exit 0 (0 error).
  - `npm run lint`: exit 0 (0 warning).
  - `npm run build`: exit 0 (semua 16 rute terkompilasi sukses).
  - `node --experimental-strip-types --test tests/*.test.mjs`: **12/12 file tes lulus**.

## Siklus hidup sesi asesmen, task attempts, dan session events (29 Oktober 2026)

- Migrasi `202610230009_session_lifecycle.sql`:
  - Membuka constraint status `assessment_sessions` ke `draft`, `in_progress`, `completed`, `cancelled` beserta kolom `theme_key`, `presentation_context`, `started_at`, `ended_at`.
  - Menambahkan tabel `task_attempts` ber-idempoten (`session_id, item_key, attempt_number` dan `session_id, request_id`), mencakup jenis encounter petualangan (`letter_arrange`, `spelling_image`, `word_read`, `passage_read`, `comprehension`) dan fase (`warmup`, `practice`, `screening`).
  - Menambahkan tabel `session_events` dengan trigger proteksi *append-only* (update dan delete dilarang) untuk event `session_started`, `pause_requested`, `resumed`, `teacher_called`, `session_completed`, `session_cancelled`.
  - RPC aman: `start_assessment_session`, `record_session_event`, `save_task_attempt`, dan `complete_assessment_session`.
- Endpoint API baru:
  - `POST /api/assessment-sessions/[id]/start`: transisi sesi ke `in_progress` dan pencatatan event mulai.
  - `POST /api/assessment-sessions/[id]/complete`: transisi sesi ke `completed` dan pencatatan timestamp selesai.
  - `POST /api/assessment-sessions/[id]/events`: pencatatan event mid-session (jeda, resume, panggil guru).
  - `POST /api/student/task-attempts`: penyimpanan pengerjaan siswa dalam mode siswa ber-idempoten.
- Validasi input dan modul: `src/lib/assessment/lifecycle.ts`.
- Pengujian otomatis:
  - `tests/session-lifecycle-input.test.mjs`: pengujian boundary dan sanitasi parameter input.
  - `tests/session-lifecycle-endpoints.test.mjs`: pengujian route POST, Origin staging, autentikasi 401, penanganan 400/403/503, dan header `Cache-Control: private, no-store`.
  - `supabase/tests/session-lifecycle.sql`: skrip rollback untuk pengujian validasi status sesi, trigger append-only event, penyimpanan attempt idempoten, dan penolakan akses lintas guru/siswa.
  - Ditambahkan ke daftar runner `scripts/test-db.mjs` (total 8 skrip tes rollback).
- Hasil verifikasi aktual:
  - `npm run typecheck`: exit 0 (0 error).
  - `npm run lint`: exit 0 (0 warning).
  - `npm run build`: exit 0 (semua 14 rute terkompilasi sukses).
  - `node --experimental-strip-types --test tests/*.test.mjs`: **10/10 file tes lulus**.

### Konflik spesifikasi yang tidak boleh mengendurkan keamanan

- Workflow persiapan mensyaratkan audio untuk seluruh sesi, tetapi Security Rules §4 membolehkan tugas non-audio; implementasi mempertahankan izin per tujuan, tidak memaksa consent audio untuk tugas teks.
- PRD/ERD menyebut PIN secara umum; Security Rules §3 membatasinya untuk sintetis. Penggunaan nyata tetap membutuhkan MFA dan hardening.
- ERD adalah target logis, belum inventaris skema terpasang. teacher_profiles, consent_notices, teacher_device_modes dan practice_responses tetap ada; jangan menghapus/mengganti tabel tanpa migrasi yang direview.
- Klaim performa dan kredensial psikolog harus memiliki bukti; NIP saja bukan bukti kewenangan praktik. Pencabutan sharing tidak menarik kembali unduhan lama.

## Otomasi SQL lokal

- Pada shell pemilik, npm menyerap argumen `--service`. Gunakan `npm run test:db:synthetic` (service dyscovery-test sudah ditentukan dalam script) atau `node scripts/test-db.mjs --service dyscovery-test`. Tidak ada password dalam package.json. Tes konfigurasi script gagal sebelum perubahan lalu lulus setelahnya.
- Client ditemukan di `C:\Program Files\PostgreSQL\17\bin` (17.5), PATH pengguna dikonfigurasi. Service lokal di luar Git dan PGSERVICEFILE pengguna sudah dibuat. Pemilik membuktikan koneksi psql interaktif berhasil ke database postgres sebagai postgres melalui session pooler. Password belum disimpan untuk otomasi; gunakan PGPASSWORD sementara hanya di terminal lokal dan bersihkan lewat finally. Tes remote belum terbukti berjalan; percobaan npm sebelumnya berhenti pada parsing argumen sebelum koneksi.

- `npm run test:db -- --service dyscovery-test` menjalankan tujuh tes rollback melalui psql, berhenti pada error pertama (`ON_ERROR_STOP=1`, tanpa psqlrc), tidak menjalankan seed persisten atau migrasi. `npm run test:db -- --list` menampilkan allowlist. Hanya gunakan database pengujian sintetis yang telah menerima migrasi 001–008; jangan jalankan paralel karena fixture menggunakan UUID tetap.
- Koneksi memakai PostgreSQL service lokal (PGSERVICEFILE/pg_service.conf) dan password file di luar repository; bukan anon key/service-role API. Konfigurasi SSL minimal require, disarankan verify-full dengan sertifikat sesuai petunjuk Supabase. Runner tidak menerima URL/password sebagai argumen dan tidak membuat endpoint SQL. Ini kontrol terhadap file tes yang direview, bukan sandbox SQL umum.
- psql 17.5 terpasang dan koneksi interaktif dibuktikan pemilik. Terminal runner terakhir belum mewarisi PATH bin PostgreSQL; tes berhenti sebelum mengakses DB. Tes runner dan seluruh delapan file tes Node pernah lulus, lint lulus. Jangan menaruh kredensial di Git atau chat. Otomasi belum commit/push.
- Pemilik melaporkan pembacaan respons guru sesuai pada deployment 37857d5. Draf latihan v2 yang benar: 865694c9-2e97-4044-898c-38515e11b3ea. Draf 69f42e3e-6ab4-4c60-98dc-9151cb9d1ccf memakai materi v1 kosong, sehingga GET practice menolak 400; jangan gunakan draf itu untuk latihan text-practice-v1 atau mengubah materi immutable.

## Pembacaan respons sintetis oleh guru (28 Oktober 2026)

- GET `/api/assessment-sessions/[id]/practice` membaca `id`, `status`, dan `practice_responses(item_key,response,created_at)` dalam satu query menggunakan client pengguna dan RLS, tanpa service-role. ID invalid 400, belum login 401, sesi tidak ada/tidak diizinkan 404 (tidak membocorkan keberadaan), gangguan database 503; seluruh respons private/no-store.
- Tidak perlu migrasi baru. Policy sesi migrasi 007 dan policy respons migrasi 008 tetap memeriksa penugasan, consent kegiatan dan lock guru. Endpoint hanya membaca; tidak memberi skor, mengubah respons, atau memfinalisasi sesi.
- Tes endpoint gagal terlebih dahulu karena endpoint belum tersedia, lalu lulus: validasi ID, login, hasil kosong, sukses, no-store, dan error tersanitasi. Boundary Supabase/Next di-stub; ini bukan bukti RLS database. `supabase/tests/assessment-drafts.sql` ditambah assert respons guru sah, lock/unlock, guru tanpa penugasan, dan consent dicabut; SQL belum dijalankan agen/operator untuk perubahan tes ini.
- UI low-fi sesuai arahan pemilik: bagian Baca respons latihan pada `/auth/mode-test`, hanya dirender dalam mode guru. Input ID draf (otomatis jika status menyediakannya), tombol baca, daftar butir/respons/waktu, status loading/kosong/error. Hasil dihapus sebelum fetch baru atau saat ID diedit; komponen unmount saat pemeriksaan mode/mode siswa. Tidak menyimpan hasil ke localStorage. Ini bukan jaminan isolasi cache/tab menyeluruh.
- Lint/typecheck/build exit 0; seluruh 7 file tes Node lulus. Tes render awal UI gagal sebelum komponen ada lalu lulus; belum menguji interaksi browser. Warning Node experimental/module detection lama masih ada. Belum commit/push, belum diuji HTTP deployment. Tidak ada redesign, audio, AI, skor atau perubahan skema.
- Koreksi catatan historis di bawah: migrasi/test/seed 008 sudah dilaporkan berhasil oleh pemilik, implementasi sudah dipush melalui a31e2c9. Pemilik juga melaporkan flow simpan respons/refresh/muat ulang sesuai. Pemeriksaan 403 dan unlock pernah lulus pada pengujian mode sebelumnya; pengulangan keduanya setelah latihan terbaru belum dikonfirmasi secara terpisah.

## Latihan teks sintetis (catatan historis sebelum migrasi/deployment)

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
