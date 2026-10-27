# Dyscovery: Product Requirements Document

**Versi:** 1.3, integrasi modul petualangan gamifikasi & arsitektur final  
**Tanggal:** 27 Oktober 2026  
**Tagline:** Kenali risiko, temukan dukungan.  
**Status:** Spesifikasi kebutuhan produk dan acuan arsitektur final yang disepakati.

Dokumen ini mendefinisikan batasan arsitektur, modul petualangan gamifikasi interaktif, fungsionalitas produk, dan alur sistem Dyscovery. Acuan pendamping: [Workflow](Dyscovery-Workflow.md), [ERD](Dyscovery-ERD.md), [Design System](Dyscovery-Design-System.md), dan [Security Rules](Dyscovery-Security-Rules.md).

---

## 1. Tujuan, Batas, dan Nilai Platform Web

### 1.1 Tujuan dan Batasan Klinis
Dyscovery adalah platform web terpadu untuk mendukung pengamatan kemampuan literasi dan skrining awal risiko disleksia pada siswa kelas 2 SD berbahasa Indonesia di lingkungan sekolah melalui pendekatan **petualangan interaktif ramah anak (*Dora-style adventure gamification*)**.

- **Skrining Sekolah (Bukan Diagnosis):** Platform memfasilitasi guru dalam mengamati dan mendokumentasikan performa membaca lisan siswa secara objektif dalam suasana belajar yang menyenangkan. Dyscovery **BUKAN** alat diagnosis otomatis, bukan terapi medis, dan bukan pengganti otoritas klinis psikolog.
- **Kewenangan Diagnosis:** Penegakan diagnosis disleksia secara legal dan klinis sepenuhnya berada di bawah wewenang **Psikolog Profesional / Tenaga Klinis Berwenang**, bukan sistem AI atau pihak sekolah.
- **Pelaporan Berbasis Bukti:** Sebelum instrumen psikometrik formal tervalidasi secara nasional, sistem hanya menyajikan data observasi performa tugas bacaan (akurasi pelafalan, keraguan, pengulangan, substitusi) tanpa memberikan label klasifikasi risiko persentil atau klaim "bebas disleksia".

### 1.2 Nilai Utama Platform Web (Bukan Sekadar Kertas Digital)
Dyscovery dirancang bukan hanya sebagai pengganti lembar observasi kertas (*digital paper/board*), melainkan sebagai ekosistem digital terpercaya yang menghadirkan empat nilai esensial:
1. **Automated Teacher Drafting Assistant:** AI pascarekaman bekerja otomatis menyusun draf awal anotasi bacaan (2–15 detik pascaperekaman), memangkas beban kerja peninjauan guru hingga **80–90%** dibandingkan transkripsi manual murni.
2. **Secure Digital Audio Vault & Waveform Synchronization:** Menyimpan rekaman audio autentik siswa di penyimpanan privat terenkripsi yang disinkronkan secara presisi dengan visual waveform dan teks bacaan acuan.
3. **Immutable Consent & Audit Logger:** Menjamin transparansi hukum melalui pencatatan persetujuan wali murid (*consent log*) dan jejak audit yang *append-only* dan tidak dapat dimanipulasi.
4. **Secure Diagnostic Data Bridge:** Berfungsi sebagai jembatan data aman yang memungkinkan orang tua membagikan bukti autentik rekaman dan laporan observasi sekolah secara selektif kepada psikolog berwenang untuk mempercepat asesmen diagnostik klinis yang valid.

---

## 2. Pengguna dan Model Perangkat Tunggal (Single Teacher Device)

Sistem Dyscovery beroperasi dalam model **Perangkat Tunggal Guru (Single Teacher Device)** pada lingkungan sekolah. Siswa **TIDAK** memiliki akun pengguna dan **TIDAK** memerlukan perangkat khusus.

### 2.1 Peran Pengguna (*Roles*)
1. **Guru Kelas (Teacher):**
   - Mengakses aplikasi melalui laptop/desktop sekolah (resolusi optimal 1440×900px).
   - Mengelola siswa yang ditugaskan, memverifikasi kesiapan izin wali (*consent*) dan perangkat audio.
   - Mengaktifkan **Mode Siswa Sementara (*Student Mode*)** yang mengunci hak guru.
   - Mendampingi siswa menjalani misi petualangan membaca tanpa mengintervensi jawaban.
   - Melakukan verifikasi draf anotasi AI pascarekaman melalui antarmuka *split-view*, memberi catatan bantuan, dan menerbitkan laporan observasi.
2. **Siswa (Student - Mode Sementara Tanpa Akun):**
   - Berinteraksi langsung di depan laptop/desktop guru yang telah dikunci dalam *Student Mode*.
   - Menjelajahi cerita petualangan hutan bersama maskot Piko, menyelesaikan misi menemukan objek/huruf, dan membaca kartu stimulus secara tenang.
3. **Orang Tua / Wali Murid (Parent/Guardian):**
   - Mengakses dashboard orang tua dari perangkat pribadi.
   - Memberikan atau mencabut persetujuan perekaman dan pemrosesan data anak.
   - Menerima laporan observasi resmi yang telah diterbitkan sekolah.
   - Memilih psikolog dari Direktori Psikolog Terverifikasi dan memberikan izin akses laporan berbatas waktu (*time-bound access*).
4. **Psikolog Terverifikasi (Verified Psychologist):**
   - Memiliki profil terverifikasi dengan kredensial resmi (STR / NIP, klinik/institusi).
   - Menerima permohonan konsultasi dari orang tua dan mengakses bukti observasi bacaan sekolah sesuai cakupan izin dan batas waktu yang diberikan.

### 2.2 Mekanisme Kunci Akses Siswa (*Student Access Lock*)
- Guru memilih siswa di dashboard, memeriksa persetujuan aktif, dan mengklik "Mulai Sesi Petualangan Siswa".
- Sistem menerbitkan token sesi sementara (`STUDENT_ACCESS`) dan memberlakukan **Server-Side Student Access Lock**.
- Hak akses guru (navigasi dashboard, daftar siswa lain, pengaturan akun, dan tombol penerbitan laporan) dikunci secara ketat di sisi server.
- Siswa tidak dapat mengakses data siswa lain atau memulihkan hak akses guru melalui *tab* lama, tombol *Back*, atau *direct API calls*.
- Untuk kembali ke area kerja guru pascaskrining, guru wajib melakukan autentikasi ulang (PIN/re-autentikasi guru).

---

## 3. Arsitektur Acuan & Spesifikasi Antarmuka

### 3.1 Spesifikasi Tampilan: 100% Desktop Web Focus (1440×900px)
- **Fokus Desktop Penuh:** Sesi asesmen sekolah dirancang khusus untuk layar **Desktop / Laptop (Target Viewport 1440×900px)** pada meja pendampingan guru.
- Menghilangkan ketergantungan *mobile-first layout* pada modul asesmen ruang kelas guna menjamin kestabilan tipografi bacaan anak, konsistensi pemenggalan baris teks stimulus, serta keandalan *audio recording capture*.
- Area kerja guru (peninjauan *split-view*) dioptimalkan pada layar 1440×900px untuk menampilkan visual *waveform* audio di sisi kiri/atas dan teks anotasi interaktif di sisi kanan/bawah secara simultan.
- Dashboard orang tua dan direktori psikolog tetap mempertahankan tata letak web responsif standar untuk kemudahan akses dari berbagai peramban.

### 3.2 Teknologi dan Infrastruktur
- **Frontend & Backend:** Next.js App Router, React, TypeScript, dan Tailwind CSS dalam satu repositori terintegrasi pada runtime Node.js.
- **Basis Data & Autentikasi:** Supabase PostgreSQL dengan Row-Level Security (RLS) ketat dan Supabase Auth.
- **Penyimpanan Berkas:** Supabase Private Storage dengan *signed upload/download URLs*. Berkas audio rekaman tidak pernah disimpan dalam bucket publik.
- **Hosting Aplikasi:** Vercel Web Hosting terintegrasi.
- **Perekaman Audio Klien:** Menggunakan API peramban standar `navigator.mediaDevices.getUserMedia` dan `MediaRecorder` (format audio standar: WebM / OGG / WAV sesuai dukungan browser).

### 3.3 Target Operasional Biaya Rp0
- Arsitektur MVP mematuhi batasan kuota gratis (*free tier*): Supabase Free Plan, Vercel Hobby, GitHub Free, font berlisensi terbuka (Google Fonts Nunito Sans), dan aset ilustrasi orisinal.
- Tidak ada gateway pembayaran, tagihan otomatis (*billing*), atau dependensi server backend terpisah (Express/NestJS) dalam cakupan MVP.
- Analisis AI menggunakan alokasi kuota komputasi terukur; jika kuota tercapai, sistem secara elegan beralih ke alur peninjauan manual murni (*graceful fallback*) tanpa menghambat kelangsungan sesi.

---

## 4. Modul Petualangan Interaktif Gamifikasi (*Dora-Style Adventure*)

Untuk menghapus stigma ujian yang menegangkan bagi siswa kelas 2 SD, seluruh aktivitas asesmen dikemas ke dalam **Modul Petualangan Interaktif Gamifikasi (konsep petualangan ala Dora the Explorer)**. Siswa diajak melakukan penjelajahan hutan ajaib bersama Maskot Piko melalui babak naratif berurutan:

```
+-----------------------------------------------------------------------------------------+
|                              PETA PETUALANGAN HUTAN PIKO                                 |
|                                                                                         |
|  [Pos 1: Pohon Kelapa]  -->  [Pos 2: Jejak Hutan]  -->  [Pos 3: Gerbang Batu]           |
|   Cari & Susun Huruf          Tebak Gambar & Eja         Kata Nyata & Pseudoword        |
|                                                                    |                    |
|                                                                    v                    |
|  [Misi Tuntas Selebrasi] <-- [Pos 5: Teman Hutan]  <-- [Pos 4: Prasasti Cerita]        |
|   Piko Bersorak Gembira       Tanya Jawab Cerita         Baca Teks Lisan (Tenang)       |
+-----------------------------------------------------------------------------------------+
```

### 4.1 Rincian Babak Petualangan (*Adventure Encounters*)
1. **Pos 1: Pohon Kelapa Ajaib (Menemukan Objek & Menyusun Huruf):**
   - Siswa membantu Piko mengumpulkan buah kelapa atau benda tersembunyi yang bertuliskan huruf acak.
   - Siswa menyusun ubin huruf (*letter arrangement*) menjadi kata bermakna untuk mengamati kesadaran fonologis dan pemahaman struktur ejaan.
2. **Pos 2: Jejak Rahasia Hutan (Mengeja Berdasarkan Gambar):**
   - Piko menemukan gambar jejak satwa atau benda di peta petualangan.
   - Siswa menyebutkan atau mengeja nama benda tersebut secara lisan/visual.
3. **Pos 3: Gerbang Sandi Batu (Membaca Kata Nyata & Pseudoword):**
   - Untuk membuka gerbang rahasia, siswa membaca kata sandi penjelajah yang terdiri atas kata nyata bahasa Indonesia dan kata semu (*pseudoword* fonotaktik valid).
   - Bertujuan mengamati kemampuan *decoding* murni tanpa ketergantungan memori visual.
4. **Pos 4: Prasasti Cerita Hutan (Membaca Teks Bacaan Lisan):**
   - Siswa membaca paragraf kisah petualangan hutan secara lisan yang direkam oleh sistem.
   - Mengukur kelancaran membaca lisan (*oral reading fluency*), intonasi, dan ketepatan pelafalan.
5. **Pos 5: Sahabat Hutan (Pemahaman Bacaan / Reading Comprehension):**
   - Karakter sahabat hutan mengajukan pertanyaan lisan/pilihan sederhana seputar petualangan yang baru dibaca untuk menilai daya serap isi bacaan.

### 4.2 Integritas Asesmen Membaca (Assessment Integrity Rules)
Meskipun dibalut nuansa petualangan yang seru, integritas pengamatan klinis tetap dijaga ketat:
- **Pemberian Stimulus yang Stabil & Tenang:** Pada babak membaca teks/kata (Pos 3 & Pos 4), antarmuka secara halus bertransisi ke tampilan kartu stimulus membaca terpusat dengan tipografi **Nunito Sans 26–28px**, berbingkai latar Putih Hangat (`#FAF8F4`), dengan aksen hutan pixel art statis di batas luar.
- **Piko Sembunyi Total Saat Membaca Teks:** Selama rekaman bacaan berlangsung, **Maskot Piko WAJIB DISEMBUNYIKAN SEPENUHNYA DARI KARTU STIMULUS**. Tidak ada animasi gerak, ekspresi wajah, atau karakter di layar agar tidak terjadi *cognitive overload*, distraksi visual, atau kecemasan membaca pada siswa.
- **Bebas Elemen Bergerak:** Dilarang keras menampilkan penanda kata bergerak (*bouncing ball*), teks melompat-lompat, atau perubahan warna kata secara real-time saat membaca.

---

## 5. Alur Sesi yang Disepakati

### 5.1 Tahap 1: Persiapan Guru & Aktivasi Mode Siswa
- Guru login di laptop/desktop sekolah (1440×900px), memilih siswa dari daftar penugasan resmi (`TEACHER_ASSIGNMENT`).
- Sistem memverifikasi ketersediaan persetujuan aktif (`CONSENT_EVENT`) dari orang tua untuk kegiatan asesmen, audio, dan AI.
- Guru melakukan cek mikrofon (*audio soundcheck*).
- Guru mengaktifkan **Mode Siswa**, memicu penguncian hak akses guru di server (*Student Access Lock*), dan menghadapkan layar laptop ke siswa.

### 5.2 Tahap 2: Pembukaan Petualangan & Latihan Bersama Piko (Tidak Dinilai)
- Layar menyambut siswa dengan hangat bersama Maskot Piko melambaikan tangan (`piko-wave.svg`).
- Pengecekan mikrofon siswa dipandu interaktif dengan visual Piko memakai headphone mendengarkan suara (`piko-listen.svg`).
- Siswa mencoba simulasi tugas petualangan membaca contoh dipandu Piko (`piko-guide.svg`).
- Tahap ini murni mengenalkan alur permainan dan memastikan kesiapan anak; tidak ada skor skrining yang dihitung.

### 5.3 Tahap 3: Pelaksanaan Misi Petualangan & Skrining Aktif
- Siswa menuntaskan babak petualangan (mencari buah kelapa, menyusun huruf, membaca sandi kata, membaca prasasti cerita).
- **Pada pembacaan teks lisan aktif:** Piko disembunyikan total (`display: none`), stimulus stabil di atas kartu `#FAF8F4`, dan mikrofon merekam suara tanpa koreksi benar/salah langsung di layar siswa.
- **Interupsi / Istirahat:** Jika anak lelah, tombol jeda atau panggil guru menampilkan visual Piko istirahat santai atau memanggil guru (`piko-rest.svg` / `piko-call-teacher.svg`).
- **Selebrasi Akhir:** Setelah misi tuntas, rekaman dihentikan, berkas audio diunggah otomatis ke penyimpanan privat, dan layar menampilkan apresiasi petualangan bersama Piko bersorak gembira (`piko-cheer.svg`).

### 5.4 Tahap 4: Pemrosesan AI Pascarekaman & Peninjauan Guru
- Sesi siswa terkunci; guru melakukan re-autentikasi identitas untuk membuka kembali hak akses guru.
- Berkas audio yang telah valid di private Storage diproses oleh *pipeline* AI pascarekaman (**latensi pemrosesan 2–15 detik**).
- Guru membuka **Teacher Verification Split-View (1440×900px)**:
  - Sisi kiri/atas: Pemutar audio dengan visualisasi *waveform* tersinkronisasi.
  - Sisi kanan/bawah: Teks bacaan acuan dengan kandidat anotasi AI (substitusi, pengulangan, jeda panjang, kata terlewat).
- Guru memverifikasi atau mengoreksi setiap anotasi dengan cepat (mengurangi beban kerja hingga 80–90%).
- Guru menambahkan catatan bantuan pendampingan atau kendala lingkungan, kemudian memfinalisasi revisi tinjauan (`REVIEW_REVISION`).

### 5.5 Tahap 5: Penerbitan Laporan & Rujukan Direktori Psikolog
- Guru berwenang menerbitkan draf laporan observasi menjadi **Laporan Resmi Versi Immutable** (`REPORT_VERSION`). Laporan memuat performa objektif dan batas interpretasi (bukan diagnosis medis).
- Orang tua menerima notifikasi aman dan dapat membaca laporan lengkap di dashboard mereka.
- Jika anak memerlukan evaluasi klinis lanjutan:
  - Orang tua membuka **Direktori Psikolog Terverifikasi** pada aplikasi.
  - Direktori menampilkan kartu profil psikolog terstandar (Avatar, Nama Lengkap, Nomor Kredensial STR/NIP, dan Nama Klinik/Institusi).
  - Orang tua membuat permohonan konsultasi dan memberikan izin akses berbatas waktu (*time-bound access* dengan tanggal kedaluwarsa dan pembatasan versi laporan). Rekaman audio dikecualikan dari pembagian secara *default*.

---

## 6. Fungsi AI dan Batasan Ketat Produk

### AI-01: Analisis AI Pascarekaman (Post-Recording AI Analysis)
- **Pemrosesan Pascarekaman:** Pemrosesan AI **hanya dan secara ketat** dilakukan setelah rekaman audio selesai seutuhnya dan tersimpan valid di Supabase Private Storage. Latensi pemrosesan berkisar antara **2 hingga 15 detik**.
- **Model Pretrained Ringan:** Menggunakan model pengenalan ucapan (*speech recognition / phonetic alignment*) terlatih tanpa pelatihan dari nol (*no pretraining from scratch*) atau *fine-tuning* dalam MVP.
- **Asisten Penyusun Draf (Drafting Assistant):** AI menghasilkan kandidat anotasi teks:
  - Kata terbaca sesuai teks acuan (*matched*).
  - Penggantian kata / substitusi fonem (*substitution candidate*).
  - Kata terlewat / penghilangan (*omission candidate*).
  - Keraguan / jeda abnormal (*hesitation / pause candidate*).
  - Segmen audio tidak jelas (*unclear / noise*).
- **Nilai Efisiensi:** Mereduksi beban waktu pemeriksaan manual guru sebesar **80–90%**. Guru tidak memulai dari halaman kosong, melainkan meninjau draf usulan AI yang sudah diselaraskan dengan garis waktu audio.
- **Integritas Penilaian:** Kandidat AI bukan vonis final. Guru memiliki otoritas penuh untuk menerima, mengubah, atau membatalkan usulan AI. Segala ketidakpastian audio dilabeli "belum dapat dinilai", bukan dipaksa menjadi kesalahan siswa.

### AI-02: Penundaan Ketat Real-Time AI Streaming & Live Alignment (Out of Scope MVP)
Dyscovery secara sadar dan tegas **MENOLAK** penggunaan *Real-Time Speech Recognition Streaming*, *Live Audio Alignment*, serta *Live Corrective Highlighting* pada MVP. Fitur-fitur ini dinyatakan **DEFERRED & OUT OF SCOPE**.

#### 5 Alasan Rasional Arsitektural & Pedagogis:
1. **Mencegah Distraksi dan Kecemasan Membaca Siswa (*Preventing Student Distraction & Reading Anxiety*):**  
   Efek visual teks yang melompat-lompat, pewarnaan kata real-time saat anak berbicara, atau koreksi instan di layar terbukti memicu kecemasan performa (*reading anxiety*) pada anak kelas 2 SD, merusak ritme membaca alami, dan mendistraksi konsentrasi decoding fonologis.
2. **Mengakomodasi Latensi & Konektivitas Internet Sekolah (*Accommodating School Internet Latency*):**  
   Koneksi internet di sekolah-sekolah Indonesia memiliki variasi *bandwidth* dan latensi yang lebar. Streaming audio dua arah (WebSockets/gRPC) berisiko tinggi mengalami *packet drop*, jeda rendering, dan kegagalan sinkronisasi yang dapat merusak integritas data asesmen.
3. **Mengeliminasi False Negatives & False Positives Variasi Bicara Anak (*Eliminating Errors from Child Speech Variations*):**  
   Karakteristik bicara anak usia 7–8 tahun (intonasi naik-turun, keraguan berpikir, artikulasi gigi tanggal, dialek kedaerahan, dan jeda bernapas) sering kali disalahartikan oleh mesin ASR streaming sebagai kesalahan membaca (*false positive*), atau sebaliknya memaklumi kesalahan akibat *language-model auto-correction* (*false negative*). Pemrosesan pascarekaman yang ditinjau telinga manusia guru memberikan akurasi 100% akuntabel.
4. **Mempertahankan Target Operasional Biaya Rp0 (*Maintaining Strict Rp0 Operational Target*):**  
   Infrastruktur streaming audio real-time dan koneksi server inferensi terus-menerus membutuhkan biaya komputasi GPU/server tinggi yang membatalkan target operasional Rp0 pada *free tier*.
5. **Menjaga Privasi Data Anak & Kepatuhan Layanan Penyedia (*Preserving Child Privacy & Provider Terms*):**  
   Penyedia AI global memberlakukan regulasi ketat terhadap pemrosesan biometrik suara anak di bawah umur. Menghindari streaming data terbuka dan memanfaatkan berkas privat pascarekaman dengan kendali persetujuan orang tua memastikan kepatuhan penuh terhadap prinsip etika data anak.

### AI-03: Rekomendasi Berbasis Aturan (Bukan AI Generatif)
- Sistem **TIDAK** menggunakan *Generative AI* (seperti LLM teks bebas) untuk mengarang saran tindak lanjut atau kesimpulan asesmen.
- Saran tindak lanjut disusun menggunakan aturan deterministik (*rule-based decision tree*) yang dirumuskan oleh ahli pendidikan dan psikologi klinis berwenang.
- Draf narasi saran diperiksa secara manual oleh guru sebelum diterbitkan. Tidak ada diagnosis otomatis atau pengelompokan risiko yang dibuat-buat oleh algoritma *black-box*.

### AI-04: Gerbang Kepatuhan Penyedia (*Provider Gate*)
- Integrasi API eksternal (misalnya Google AI Studio / Gemini) diposisikan di balik gerbang validasi izin ketat.
- Bila ketentuan layanan pihak ketiga belum memenuhi regulasi data privasi anak atau kuota gratis habis, sistem otomatis beralih ke alur kerja peninjauan manual guru tanpa menampilkan kegagalan pada antarmuka pengguna.

---

## 7. Status, Data, dan Integritas Sistem

- **Pemisahan Status Entitas:** Status sesi (`ASSESSMENT_SESSION`), status percobaan tugas gamifikasi (`TASK_ATTEMPT`), status berkas rekaman (`RECORDING`), status analisis AI (`AI_ANALYSIS`), status peninjauan (`REVIEW_REVISION`), dan status laporan (`REPORT_VERSION`) berdiri independen.
- **Kegagalan Teknis Bukan Kesalahan Anak:** Rekaman yang gagal terunggah atau terputus dicatat sebagai masalah teknis (*upload failed* / *incomplete*), **BUKAN** jawaban salah atau skor nol.
- **Kekebalan Idempotensi:** Retry unggahan audio atau pengulangan analisis AI menggunakan kunci idempotensi (`idempotency_key`) dan hash berkas untuk mencegah duplikasi baris data.
- **Pemisahan Latihan dan Skrining:** Seluruh percobaan pada fase latihan (`practice`) ditandai khusus dan diisolasi secara matematis agar tidak mencemari skor skrining formal.

---

## 8. Persetujuan dan Keamanan Data

- **Persetujuan Granular & Bertingkat:** Persetujuan orang tua dipisahkan menjadi tiga kategori mandiri: (1) Izin keikutsertaan kegiatan skrining sekolah, (2) Izin perekaman audio digital, dan (3) Izin analisis komputasi AI.
- **Penolakan Tanpa Diskriminasi:** Penolakan terhadap AI tetap memungkinkan guru melakukan peninjauan manual 100%. Penolakan rekaman audio menyebabkan butir tugas bacaan lisan dilewati atau ditandai "belum dinilai" tanpa mengurangi hak belajar anak.
- **Hak Pencabutan (*Revocation*):** Pencabutan persetujuan oleh wali murid secara langsung menghentikan proses transmisi data baru dan membatalkan antrean pemrosesan di server.
- **Keamanan Penyimpanan:** Seluruh berkas audio disimpan dalam bucket privat Supabase dengan penamaan UUID acak (tidak menggunakan nama anak). Akses berkas hanya dapat dibuka melalui *signed URL* jangka pendek berumur menit untuk guru peninjau atau psikolog berizin.

---

## 9. Identitas Visual, Maskot Piko & Desain Petualangan

### 9.1 Brand Design Tokens
- **Primary (Biru Tinta):** `#24476A` — Elemen navigasi utama, tombol tindakan primer, status fokus aktif.
- **Accent (Aprikot):** `#F2B880` — Aksen hangat, penanda langkah panduan, lencana progres ramah anak.
- **Background (Putih Hangat):** `#FAF8F4` — Warna kanvas utama dan kartu stimulus bacaan anak.
- **Surface (Putih Bersih):** `#FFFFFF` — Permukaan kartu peninjauan, formulir, dan lembar laporan.
- **Foreground (Arang Kebiruan):** `#202C38` — Teks bacaan utama, judul, dan label instruksi dengan kontras tinggi.

### 9.2 Tipografi & Kartu Stimulus
- Font utama antarmuka dan bacaan adalah **Nunito Sans** (bobot 400, 600, 700).
- Kartu bacaan siswa menggunakan ukuran font **26–28px** dengan *line-height* 1.6 untuk memastikan keterbacaan optimal tanpa memicu kelelahan visual (*visual crowding*).
- Teks bacaan disajikan statis di atas kartu berlatar `#FAF8F4` dengan elemen tepi bertema hutan pixel-art yang lembut.

### 9.3 Aturan Integrasi Maskot Piko (Piko Mascot Visibility Rules)
Maskot Piko dirancang untuk memberikan dukungan emosional yang ramah sepanjang petualangan, namun diatur dengan batasan ketat agar tidak mengganggu penilaian:
1. **Fase Sambutan Petualangan (*Welcome*):** Piko melambaikan tangan dengan ramah (`piko-wave.svg`).
2. **Fase Pengecekan Suara (*Soundcheck*):** Piko mengenakan headphone dan mendengarkan suara anak (`piko-listen.svg`).
3. **Fase Panduan Latihan & Petualangan (*Adventure Practice*):** Piko memandu instruksi latihan membaca contoh dan aturan misi (`piko-guide.svg`).
4. **Fase Skrining Membaca Aktif (*Active Reading*):** **PIKO WAJIB DISEMBUNYIKAN SEPENUHNYA DARI KARTU BACAAN (HIDDEN)**. Layar hanya memuat teks stimulus bacaan dan indikator mikrofon halus.
5. **Fase Jeda / Bantuan (*Pause / Call Teacher*):** Piko beristirahat atau membantu memanggil guru (`piko-rest.svg` / `piko-call-teacher.svg`).
6. **Fase Misi Tuntas (*Completion*):** Piko bersorak memberikan apresiasi atas tuntasnya misi petualangan anak (`piko-cheer.svg`).

### 9.4 Komponen Kartu Profil Direktori Psikolog
Direktori psikolog menampilkan daftar kartu profil (*verified psychologist cards*) dengan spesifikasi:
- **Foto Profil / Avatar:** Gambar resmi psikolog terverifikasi.
- **Nama Lengkap & Gelar:** Nama lengkap profesional (contoh: *Dra. Anita Wijaya, M.Psi., Psikolog*).
- **Nomor Kredensial Resmi:** Nomor STR (Surat Tanda Registrasi) atau NIP yang tervalidasi.
- **Nama Institusi / Klinik:** Nama fasilitas layanan psikologi atau rumah sakit rekanan.
- **Tombol Tindakan:** "Pilih Konsultasi & Bagikan Laporan" untuk memicu modal pengaturan izin berbatas waktu (*time-bound access*).

---

## 10. Kriteria Penerimaan dan Bukti Pengujian (Acceptance Criteria)

- [ ] **Modul Petualangan Interaktif Berfungsi:** Siswa dapat menjalani narasi petualangan mencari kelapa/huruf, mengeja gambar, dan membaca kata/teks bersama Piko pada alur yang menyenangkan.
- [ ] **Alur Perangkat Tunggal:** Guru dapat login di desktop/laptop (1440×900px), memilih siswa, dan mengaktifkan Mode Siswa Sementara dengan *Student Access Lock* yang mengunci hak guru di sisi server.
- [ ] **Visibilitas Maskot Piko Sesuai Tahap:** Maskot Piko tampil pada fase Sambutan, Cek Suara, Latihan/Petualangan, Jeda, dan Selesai, serta **terbukti 100% tersembunyi** selama pembacaan teks aktif.
- [ ] **Pemberian Stimulus Bersih:** Teks bacaan ditampilkan dalam kartu berlatar `#FAF8F4` dengan ukuran Nunito Sans 26–28px tanpa ada koreksi visual atau pelompatan kata saat siswa membaca.
- [ ] **AI Pascarekaman Berfungsi:** Rekaman audio terunggah ke Supabase Private Storage, memicu inferensi AI pascarekaman dengan latensi 2–15 detik, dan menyajikan draf anotasi awal pada Teacher Verification Split-View.
- [ ] **Tidak Ada Streaming Real-Time:** Terbukti tidak ada implementasi WebSocket audio streaming, live alignment, atau LLM generatif dalam alur skrining MVP.
- [ ] **Efisiensi Kerja Guru:** Guru dapat meninjau rekaman audio dengan waveform tersinkronisasi dan memfinalisasi anotasi draf AI dengan pengurangan intervensi manual sebesar 80–90%.
- [ ] **Direktori Psikolog & Pembagian Berbatas Waktu:** Orang tua dapat melihat profil kartu psikolog terverifikasi (Avatar, Nama, STR/NIP, Klinik) dan membagikan laporan observasi dengan masa berlaku tanggal kedaluwarsa eksplisit (*time-bound*).
- [ ] **Fallback Manual Utuh:** Jika koneksi AI dinonaktifkan atau kuota habis, guru dapat menyelesaikan seluruh proses anotasi bacaan secara manual tanpa kegagalan sistem.
- [ ] **Kepatuhan Anggaran Rp0:** Seluruh modul berjalan di atas konfigurasi gratis Supabase, Vercel, dan pustaka open-source tanpa pemicu billing.

---

## 11. Prioritas Fitur dan Batasan Rilis

1. **Prioritas Inti (Core MVP):**
   - Modul Petualangan Gamifikasi Ramah Anak (*Dora-style adventure*): menyusun huruf, tebak gambar, membaca kata/teks.
   - Autentikasi guru dan penguncian sesi siswa (*Student Access Lock*) pada layar desktop 1440×900px.
   - Perekaman audio stabil berbasis browser dengan penyimpanan privat Supabase Storage.
   - Analisis AI pascarekaman (latensi 2–15 detik) untuk penyusunan draf anotasi guru.
   - Antarmuka *Teacher Verification Split-View* dengan sinkronisasi waveform.
   - Direktori Psikolog Terverifikasi dan mekanisme izin berbagi laporan berbatas waktu bagi orang tua.
2. **Ditunda Pasca-MVP (Explicitly Deferred):**
   - Pengenalan ucapan real-time (*Real-Time Speech Streaming*).
   - Penyorotan kata live saat membaca (*Live Alignment Highlighting*).
   - Rekomendasi teks berbasis *Generative AI / LLM*.
   - Integrasi telekonsultasi video call dan sistem pembayaran di dalam aplikasi.
   - Aplikasi mobile native untuk siswa (tetap berpegang pada model web perangkat tunggal sekolah).
