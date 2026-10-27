# Dyscovery: Diagram Workflow Sistem

**Versi:** 1.3, integrasi modul petualangan gamifikasi & arsitektur final  
**Tanggal:** 27 Oktober 2026  
**Tagline:** Kenali risiko, temukan dukungan.  
**Status:** Rancangan alur sistem, alur petualangan gamifikasi, dan diagram proses yang disepakati.

Acuan: [PRD](Dyscovery-PRD.md), [ERD](Dyscovery-ERD.md), [Security Rules](Dyscovery-Security-Rules.md), dan [Design System](Dyscovery-Design-System.md).

---

## Ringkasan Prinsip Arsitektur Workflow

1. **Modul Petualangan Interaktif Gamifikasi (*Dora-Style Adventure*):** Aktivitas asesmen dikemas ke dalam perjalanan eksplorasi naratif bersama Maskot Piko (mencari buah kelapa, menyusun ubin huruf, membaca sandi kata, membaca prasasti cerita lisan).
2. **Integritas Penilaian Membaca:** Pada saat anak membaca kata/teks lisan, antarmuka menyajikan kartu stimulus yang tenang dan stabil (Nunito Sans 26–28px di latar `#FAF8F4`), dan **Maskot Piko WAJIB DISEMBUNYIKAN TOTAL** untuk mencegah distraksi visual dan kecemasan membaca (*reading anxiety*).
3. **Perangkat Tunggal Guru (Single Teacher Device 1440×900px):** Seluruh sesi asesmen sekolah dijalankan pada laptop/desktop guru. Siswa tidak memiliki akun, melainkan berinteraksi melalui **Mode Siswa Sementara (*Student Mode*)** yang dikunci di sisi server (*Server-Side Student Access Lock*).
4. **Pemrosesan AI Pascarekaman (Post-Recording 2–15 Detik):** AI ucapan bekerja strictly pascarekaman setelah audio aman tersimpan di Supabase Private Storage. Tidak ada streaming real-time, live alignment, atau LLM generatif. AI bertindak sebagai *drafting assistant* yang memangkas beban kerja guru hingga 80–90%.
5. **Pemisahan Skrining Sekolah & Diagnosis Klinis:** Sekolah melakukan observasi objektif. Diagnosis resmi diserahkan kepada psikolog melalui **Direktori Psikolog Terverifikasi** dengan mekanisme izin berbagi laporan berbatas waktu (*time-bound access*).

---

## 1. Workflow Utama Lintas Pengguna

```mermaid
flowchart TD
    A["Sekolah dan akun guru diverifikasi"] --> B["Guru ditugaskan ke siswa; akun orang tua diverifikasi"]
    B --> C["Orang tua menentukan persetujuan bertingkat (kegiatan, audio, AI)"]
    C --> D{"Persetujuan aktif dan syarat terpenuhi?"}
    D -->|Tidak| E["Tunda sesi; lengkapi izin orang tua"]
    D -->|Ya| F["Guru login di laptop/desktop (1440x900px) dan pilih siswa"]
    F --> G["Cek mikrofon bersama Piko lalu aktifkan Student Access Lock"]
    G --> H["Mulai Modul Petualangan Gamifikasi (Dora-style) bersama Piko"]
    H --> I["Encounter 1-3: Cari buah kelapa, susun huruf, tebak gambar & kata"]
    I --> J["Encounter 4: Baca teks lisan stabil (Piko disembunyikan total)"]
    J --> K["Selesai petualangan: Selebrasi Piko gembira & upload audio otomatis"]
    K --> L["Guru re-autentikasi; kunci Student Mode dilepas"]
    L --> M["AI Pascarekaman menyusun draf kandidat anotasi (2-15 detik)"]
    M --> N["Guru meninjau via Teacher Verification Split-View (pangkas beban 80-90%)"]
    N --> O["Penerbitan Laporan Observasi Versi Immutable"]
    O --> P["Orang tua menerima notifikasi dan membaca laporan di dashboard"]
    P --> Q{"Orang tua memerlukan evaluasi klinis?"}
    Q -->|Tidak| R["Simpan riwayat observasi sesuai kebijakan retensi sekolah"]
    Q -->|Ya| S["Buka Direktori Psikolog Terverifikasi (Kartu Profil STR/NIP & Klinik)"]
    S --> T["Orang tua atur izin berbagi laporan berbatas waktu (time-bound access)"]
    T --> U["Psikolog mengakses laporan sah sebagai bukti autentik penegakan diagnosis"]
```

---

## 2. Alur Petualangan Gamifikasi & Skrining Membaca di Perangkat Guru

```mermaid
flowchart TD
    A["Guru login di perangkat desktop/laptop kelas (1440x900px)"] --> B{"Autentikasi dan penugasan siswa valid?"}
    B -->|Tidak| X["Tolak akses; proteksi privasi siswa"]
    B -->|Ya| C{"Persetujuan kegiatan & rekaman audio aktif?"}
    C -->|Tidak| Y["Tunda sesi; tampilkan status izin yang kurang"]
    C -->|Ya| D["Guru periksa kesiapan mikrofon sekolah"]
    D --> E["Aktifkan Student Mode: terapkan Server-Side Student Access Lock"]
    E --> F["Layar Sambutan Petualangan: Maskot Piko menyapa (piko-wave.svg)"]
    F --> G["Cek Suara Siswa: Piko mengenakan headphone (piko-listen.svg)"]
    G --> H["Latihan Misi Petualangan: Piko memandu contoh tugas (piko-guide.svg)"]
    H --> I{"Siswa siap menjelajah bersama Piko?"}
    I -->|Perlu penjelasan lagi| H
    I -->|Anak gelisah / tidak bersedia| STOP["Pilih jeda atau batalkan sesi; Piko istirahat (piko-rest.svg)"]
    I -->|Siap| J["Mulai Peta Perjalanan Petualangan Hutan"]

    subgraph AdventureEncounters["Babak Petualangan Interaktif Gamifikasi"]
        J --> POS1["Pos 1: Pohon Kelapa Ajaib (Cari buah kelapa & susun huruf jadi kata)"]
        POS1 --> POS2["Pos 2: Jejak Hutan (Tebak gambar objek & eja kata)"]
        POS2 --> POS3["Pos 3: Gerbang Sandi Batu (Membaca kata nyata & pseudoword)"]
        POS3 --> TRANSITION["Transisi ke Kartu Stimulus Membaca Teks Tenang"]
    end

    subgraph ActiveReadingScreening["Fase Pembacaan Teks Lisan Aktif (Pos 4)"]
        TRANSITION --> K["Tampilkan Kartu Stimulus Stabil (Nunito Sans 26-28px di latar #FAF8F4)"]
        K --> L["PIKO WAJIB DISEMBUNYIKAN TOTAL (display: none, tanpa maskot di layar)"]
        L --> M["Mulai Perekaman Audio Klien (MediaRecorder)"]
        M --> N{"Ada tombol Jeda atau Panggil Guru ditekan?"}
        N -->|Ya| PAUSE["Perekaman ditunda; Piko panggil guru (piko-call-teacher.svg)"]
        PAUSE --> RESUME{"Guru selesaikan kendala dan lanjutkan?"}
        RESUME -->|Ya| K
        RESUME -->|Tidak| STOP
        N -->|Tidak| O["Siswa selesai membaca teks lisan"]
        O --> P["Hentikan mikrofon; simpan berkas audio lokal"]
    end

    P --> POS5["Pos 5: Sahabat Hutan (Tanya jawab pemahaman cerita bacaan)"]
    POS5 --> R["Misi Petualangan Tuntas: Piko bersorak apresiasi (piko-cheer.svg)"]
    R --> S["Unggah audio ke Supabase Private Storage dengan Signed Upload URL"]
    S --> T{"Unggahan audio terverifikasi ready dan hash cocok?"}
    T -->|Gagal| U["Tandai unggahan gagal; sediakan retry terikat sesi tanpa overwrite"]
    T -->|Berhasil| V["Tutup Student Mode; Guru masukkan PIN/Kredensial untuk buka kunci"]
    STOP --> V
    U --> V
```

---

## 3. Pemrosesan AI Pascarekaman & Verifikasi Guru

```mermaid
flowchart TD
    A["Audio selesai diunggah dan tervalidasi di Supabase Private Storage"] --> B{"Persetujuan komputasi AI aktif dan kuota gratis tersedia?"}
    B -->|Tidak| MANUAL["Lewati AI; arahkan langsung ke antarmuka tinjauan manual murni"]
    B -->|Ya| QUEUE["Kirim trigger aman ke antrean worker analisis pascarekaman"]
    
    subgraph PostRecordingAI["Pemrosesan AI Pascarekaman (Latensi 2-15 Detik)"]
        QUEUE --> C["Jalankan model pretrained speech recognition / phonetic alignment"]
        C --> D["Ekstraksi teks ucapan dan perbandingan terhadap teks stimulus acuan"]
        D --> E["Hasilkan kandidat anotasi: substitusi, pengulangan, keraguan, lewatan"]
        E --> F["Hitung keselarasan waktu audio terhadap teks (audio-text alignment timestamps)"]
        F --> G["Simpan hasil sebagai AI_ANALYSIS dan draf AI_ANNOTATION"]
    end

    G --> H["Guru membuka antarmuka Teacher Verification Split-View (1440x900px)"]
    MANUAL --> H
    
    subgraph SplitViewVerification["Teacher Verification Split-View"]
        H --> I["Panel Kiri: Audio player interaktif dengan visualisasi Waveform"]
        H --> J["Panel Kanan: Teks acuan dengan sorotan kandidat anotasi AI"]
        I <-->|Sinkronisasi klik kata ke posisi waktu audio| J
        J --> K["Guru konfirmasi/koreksi kandidat draf AI (pangkas 80-90% usaha manual)"]
        K --> L["Guru tambahkan catatan pendampingan atau interupsi jika ada"]
        L --> M["Finalisasi dan simpan peninjauan ke REVIEW_REVISION"]
    end
```

---

## 4. Peninjauan, Penyusunan Laporan, dan Saran Tindak Lanjut

```mermaid
flowchart TD
    A["Guru mengakses hasil tinjauan final (REVIEW_REVISION)"] --> B["Sistem menyusun draf laporan observasi performa membaca"]
    B --> C["Sajikan metrik objektif: akurasi fonetik, kecepatan baca, jenis kesalahan"]
    C --> D{"Pedoman tindak lanjut resmi disetujui (GUIDANCE_VERSION) tersedia?"}
    D -->|Tidak| E["Sajikan narasi observasi deskriptif tanpa klasifikasi risiko otomatis"]
    D -->|Ya| F["Terapkan aturan deterministik pedoman (rule-based engine, bukan Generative AI)"]
    F --> G["Hasilkan saran tindak lanjut pedagogis sekolah yang terstandar"]
    E --> H["Guru memeriksa kelengkapan draf laporan observasi"]
    G --> H
    H --> I{"Draf laporan disetujui untuk diterbitkan?"}
    I -->|Perlu perbaikan| B
    I -->|Ya| J["Guru menandatangani & menerbitkan REPORT_VERSION (Immutable)"]
    J --> K["Sistem kirim notifikasi aman ke dashboard orang tua (tanpa data sensitif)"]
    J --> L["Laporan terkunci dan memiliki nomor versi serta stempel waktu penerbitan"]
```

---

## 5. Direktori Psikolog Terverifikasi & Izin Berbagi Berbatas Waktu

```mermaid
flowchart TD
    A["Orang tua login dan membuka laporan hasil observasi sekolah"] --> B["Orang tua membaca temuan observasi dan batas interpretasi (bukan diagnosis)"]
    B --> C{"Orang tua memutuskan konsultasi ke tenaga profesional?"}
    C -->|Tidak| D["Laporan tersimpan aman di akun orang tua sebagai arsip perkembangan anak"]
    C -->|Ya| E["Orang tua membuka menu 'Direktori Psikolog Terverifikasi'"]
    
    subgraph DirectoryComponent["Komponen Direktori Psikolog Terverifikasi"]
        E --> F["Tampilkan Kartu Profil: Foto Avatar, Nama Lengkap & Gelar"]
        F --> G["Tampilkan Nomor Registrasi Kredensial Resmi (STR / NIP Terverifikasi)"]
        G --> H["Tampilkan Nama Fasilitas: Klinik Psikologi / Rumah Sakit Rekanan"]
        H --> I["Klik tombol 'Pilih Konsultasi & Bagikan Laporan'"]
    end

    I --> J["Buka Modal Pengaturan Izin Berbagi (REPORT_SHARE)"]
    J --> K["Tentukan Cakupan: Versi laporan tertentu (rekaman audio dikecualikan secara default)"]
    K --> L["Tentukan Batas Waktu Akses (Tanggal Kedaluwarsa / Time-Bound Access)"]
    L --> M["Orang tua konfirmasi persetujuan; simpan baris REPORT_SHARE aktif"]
    M --> N["Buat permohonan konsultasi (CONSULTATION_REQUEST)"]
    N --> O["Psikolog menerima permohonan dan memeriksa jadwal"]
    O --> P["Psikolog mengakses laporan observasi sekolah dalam rentang waktu berizin"]
    P --> Q["Psikolog gunakan data otentik sekolah untuk mendukung asesmen diagnosis klinis resmi"]
    
    subgraph ExpirationRevocation["Pencabutan & Kedaluwarsa Akses"]
        M --> R{"Batas waktu kedaluwarsa tercapai atau orang tua klik Cabut Izin?"}
        R -->|Ya| S["Akses laporan langsung terblokir server; kunci akses tertutup"]
    end
```

---

## 6. Penarikan Persetujuan dan Penghentian Pemrosesan

```mermaid
flowchart TD
    A["Orang tua mengajukan tindakan hak privasi di dashboard"] --> B{"Pilihan tindakan orang tua?"}
    B -->|Jeda / Batalkan Sesi Berjalan| C["Instruksi stop dikirim; mikrofon mati seketika; Student Mode ditutup"]
    B -->|Cabut Persetujuan AI| D["Catat penarikan izin AI di CONSENT_EVENT; batalkan antrean pemrosesan AI"]
    D --> E["Sistem pertahankan rekaman untuk peninjauan guru manual 100%"]
    B -->|Cabut Izin Rekaman Audio| F["Hentikan perekaman; sesi hanya mencakup tugas non-audio"]
    B -->|Cabut Izin Berbagi Laporan| G["Ubah status REPORT_SHARE menjadi revoked; blokir akses psikolog seketika"]
    B -->|Permohonan Penghapusan Data| H["Verifikasi identitas dan periksa kewajiban retensi arsip sekolah"]
    H --> I["Penghapusan / pseudonimisasi berkas audio dan data turunan di Supabase"]
    I --> J["Catat bukti eksekusi ke AUDIT_EVENT secara append-only"]
```

---

## 7. Pemetaan Alur ke Entitas Database (ERD)

| Tahap Workflow | Entitas Database Terkait | Deskripsi Pemrosesan |
|---|---|---|
| **Verifikasi & Penugasan** | `PROFILE`, `SCHOOL_MEMBER`, `CHILD`, `TEACHER_ASSIGNMENT`, `GUARDIAN_LINK` | Memastikan guru dan siswa berada di sekolah yang sama dengan penugasan sah. |
| **Persetujuan Granular** | `CONSENT_EVENT` | Mencatat izin orang tua untuk kegiatan, perekaman audio, dan analisis AI secara append-only. |
| **Persiapan & Student Mode** | `ASSESSMENT_SESSION`, `STUDENT_ACCESS`, `MATERIAL_VERSION` | Mengunci akses guru di desktop (1440×900px) dan memuat paket petualangan gamifikasi. |
| **Tugas Gamifikasi Petualangan** | `TASK_ATTEMPT`, `SESSION_EVENT` | Mencatat respons babak petualangan (susun huruf, eja gambar, kata nyata/semu). |
| **Skrining Membaca Lisan** | `TASK_ATTEMPT`, `RECORDING` | Menyajikan kartu stimulus tenang, menyembunyikan Piko, merekam audio, dan unggah ke storage. |
| **Analisis AI Pascarekaman** | `AI_ANALYSIS`, `AI_ANNOTATION` | Memproses audio pascarekaman (2–15 detik) untuk menghasilkan draf anotasi tanpa streaming real-time. |
| **Peninjauan Split-View** | `REVIEW_REVISION`, `REVIEW_ANNOTATION` | Guru memvalidasi usulan draf AI melalui tampilan visual waveform, memangkas beban 80–90%. |
| **Penerbitan Laporan** | `REPORT_VERSION`, `REPORT_REVIEW`, `GUIDANCE_VERSION` | Mengunci hasil observasi sekolah menjadi laporan resmi versi immutable dengan saran berbasis aturan. |
| **Direktori & Berbagi Data** | `PSYCHOLOGIST_PROFILE`, `REPORT_SHARE`, `CONSULTATION_REQUEST` | Menampilkan profil psikolog (STR/NIP, klinik) dan memberikan izin akses laporan berbatas waktu. |
| **Jejak Audit & Keamanan** | `AUDIT_EVENT` | Merekam setiap akses data sensitif, perubahan izin, dan penerbitan laporan tanpa data rahasia. |

---

## 8. Checklist Validasi Workflow Sebelum Implementasi

- [ ] **Modul Petualangan Terintegrasi:** Alur petualangan ramah anak (menemukan kelapa/huruf, tebak gambar, membaca kata/teks) berjalan runtut dan menyenangkan.
- [ ] **Model Perangkat Tunggal:** Alur asesmen berjalan mulus pada satu laptop/desktop guru (1440×900px) tanpa membutuhkan akun atau perangkat khusus siswa.
- [ ] **Kunci Akses Siswa:** Saat mode siswa aktif, semua navigasi guru, pengaturan akun, dan akses ke data siswa lain terblokir di tingkat server.
- [ ] **Visibilitas Piko Teruji:** Piko tampil ramah saat sambutan, cek suara, latihan, jeda, dan penutupan, tetapi **tersembunyi 100% tanpa visualisasi apa pun** saat pembacaan teks aktif.
- [ ] **Pemrosesan Pascarekaman Murni:** AI hanya aktif setelah berkas audio selesai direkam dan tersimpan valid (latensi 2–15 detik); tidak ada dependensi WebSocket streaming audio real-time.
- [ ] **Teacher Verification Split-View:** Antarmuka peninjauan menyinkronkan pemutar audio dan waveform dengan teks stimulus secara interaktif, memangkas usaha peninjauan guru hingga 80–90%.
- [ ] **Direktori Psikolog Terstandar:** Menampilkan kartu profil psikolog dengan data kredensial lengkap (Avatar, Nama Lengkap, STR/NIP, Fasilitas Klinik).
- [ ] **Berbagi Berbatas Waktu (Time-Bound):** Akses psikolog ke laporan observasi dibatasi oleh tanggal kedaluwarsa dan nomor versi laporan tertentu; audio tidak dibagikan secara default.
- [ ] **Kemandirian Jalur Manual:** Bila AI dimatikan atau kuota habis, seluruh alur asesmen dan peninjauan tetap dapat diselesaikan guru secara manual.
