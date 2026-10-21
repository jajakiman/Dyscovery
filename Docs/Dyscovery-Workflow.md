# Dyscovery: Diagram Workflow Sistem

**Versi:** 1.2, baseline dokumentasi tersinkron  
**Tanggal:** 21 Oktober 2026  
**Tagline:** Kenali risiko, temukan dukungan.  
**Status:** rancangan alur berdasarkan keputusan produk; bukan bukti aplikasi sudah dibangun atau diuji.

Acuan: [PRD](Dyscovery-PRD.md), [ERD](Dyscovery-ERD.md), [Security Rules](Dyscovery-Security-Rules.md), dan [Design System](Dyscovery-Design-System.md).

Diagram Mermaid dapat dibaca melalui penampil Markdown yang mendukung Mermaid. AI merupakan fitur opsional dengan gerbang penyedia; kegagalannya tidak menonaktifkan alur manual. Tidak ada diagnosis otomatis.

Baseline: Next.js + React + TypeScript + Tailwind CSS, backend Node.js terintegrasi, Supabase dan Vercel dengan target Rp0 sesuai ketentuan/kuota gratis. Seluruh alur responsif desktop/laptop, tablet, dan handphone; dukungan tiap tugas asesmen ditetapkan melalui pengujian perangkat. Konteks penyajian dicatat pada sesi.

Identitas platform umum, childish, dan playful; hutan pixel art hanya tema modul asesmen gamifikasi. Model pretrained opsional menganalisis audio setelah tersimpan; tidak ada training/fine-tuning, real-time, atau AI generatif saran dalam MVP. Saran memakai aturan/narasi ahli atau penulisan manual yang ditinjau.

## 1. Workflow utama lintas pengguna

```mermaid
flowchart TD
    A["Sekolah dan akun dewasa diverifikasi"] --> B["Guru ditugaskan ke siswa; hubungan wali diverifikasi"]
    B --> C["Wali menerima penjelasan dan menentukan persetujuan"]
    C --> D{"Izin kegiatan dan prosedur tersedia?"}
    D -->|Tidak| E["Tunda sesi; selesaikan persyaratan"]
    D -->|Ya| F["Guru memilih siswa, materi versi disetujui, dan memeriksa perangkat"]
    F --> G["Aktifkan mode siswa; kunci hak guru di perangkat"]
    G --> H["Latihan dengan materi berbeda; tidak dinilai"]
    H --> I["Skrining tanpa koreksi langsung kepada siswa"]
    I --> J["Simpan respons dan rekaman yang valid; catat bantuan dan kendala"]
    J --> K["Peninjauan guru; AI opsional hanya sebagai kandidat"]
    K --> L["Draf laporan observasi dan batas interpretasi"]
    L --> M["Saran tindak lanjut mengikuti pedoman approved dan ditinjau"]
    M --> N["Guru berwenang menerbitkan versi laporan"]
    N --> O["Wali terverifikasi membaca laporan"]
    O --> P{"Wali ingin tindak lanjut?"}
    P -->|Tidak| Q["Simpan sesuai retensi; dukungan sekolah sesuai kewenangan"]
    P -->|Ya| R["Pilih psikolog terverifikasi; izin berbagi versi tertentu bila diperlukan"]
    R --> S["Ajukan jadwal; psikolog mengakses hanya data yang diizinkan"]
```

Alur ini tidak menganggap seluruh siswa wajib menyelesaikan semua tugas. Kondisi tidak berizin, belum siap, berhenti, atau data tidak memadai ditangani pada diagram rinci. Sampai instrumen/aturan klasifikasi tersedia, laporan berisi kinerja dan observasi tanpa label risiko.

## 2. Persiapan, latihan, dan skrining

```mermaid
flowchart TD
    A["Guru login dan memilih siswa"] --> B{"Akun, penugasan, dan sekolah sah?"}
    B -->|Tidak| X["Tolak akses; jangan ungkap data siswa"]
    B -->|Ya| C{"Izin kegiatan dan materi/prosedur sesuai?"}
    C -->|Tidak| Y["Tunda; jelaskan persyaratan yang belum selesai"]
    C -->|Ya| D["Cek izin rekaman, perangkat, dan mikrofon"]
    D --> E["Kunci hak guru; berikan kapabilitas satu sesi siswa"]
    E --> F["Latihan: contoh berbeda dan penjelasan guru; tanpa skor"]
    F --> G{"Anak memahami cara mengerjakan dan bersedia?"}
    G -->|Belum memahami| F
    G -->|Tidak nyaman atau ingin berhenti| STOP["Jeda atau hentikan; catat alasan tanpa memaksa"]
    G -->|Ya| H["Mulai tugas skrining; tampilkan stimulus stabil"]
    H --> I{"Tugas memerlukan rekaman?"}
    I -->|Tidak| J["Simpan respons tugas sesuai prosedur"]
    I -->|Ya| K{"Izin rekaman aktif dan mikrofon berfungsi?"}
    K -->|Tidak| U["Tugas terkait tidak dilakukan atau belum dapat dinilai; bukan salah"]
    K -->|Ya| L["Rekam setelah tindakan pengguna; tanpa koreksi atau petunjuk jawaban"]
    L --> M{"Ada kendala atau permintaan bantuan?"}
    M -->|Tidak| N["Selesaikan tugas; hentikan mikrofon dan validasi unggahan"]
    M -->|Ya| O["Guru menangani sesuai prosedur dan mencatat bantuan/jeda"]
    O --> P{"Dapat dilanjutkan sesuai prosedur?"}
    P -->|Ya| L
    P -->|Tidak| STOP
    N --> V{"Audio tersimpan dan valid?"}
    V -->|Ya| J
    V -->|Tidak| W["Tandai unggahan gagal; retry terikat sesi tanpa overwrite"]
    W --> T{"Pemulihan diperbolehkan prosedur?"}
    T -->|Ya| N
    T -->|Tidak| U
    U --> NEXT{"Ada tugas lain yang boleh dilanjutkan?"}
    J --> NEXT
    NEXT -->|Ya| H
    NEXT -->|Tidak| END["Tutup kapabilitas siswa; guru autentikasi ulang untuk peninjauan"]
    STOP --> END
```

Retry unggahan tidak berarti anak otomatis diminta membaca ulang. Pengulangan tugas hanya mengikuti prosedur instrumen. Penghentian menghasilkan laporan/status parsial bila sesuai, bukan laporan yang menyamar sebagai sesi lengkap.

## 3. Analisis suara pascarekaman dengan model pretrained

```mermaid
flowchart TD
    A["Selesaikan perekaman dengan izin"] --> B["Unggah ke private Storage dengan izin objek terbatas"]
    B --> READY{"Audio tersimpan, valid, dan hash input tersedia?"}
    READY -->|Tidak| FAIL["Pulihkan unggahan sesuai prosedur atau tandai belum dapat dinilai"]
    READY -->|Ya| CHECK{"AI aktif, izin masih sah, penyedia sesuai, dan kuota gratis tersedia?"}
    CHECK -->|Tidak| MANUAL["Tidak kirim ke AI; tinjauan manual"]
    CHECK -->|Ya| AI["Analisis model pretrained dengan input minimum dan kunci idempotensi"]
    AI --> VALID{"Hasil terstruktur valid dan input cocok?"}
    VALID -->|Tidak| ERR["Gagal atau belum dapat dianalisis; jangan buat skor"]
    VALID -->|Ya| SAVE["Simpan kandidat final terpisah dari keputusan guru"]
    SAVE --> REVIEW["Guru meninjau rekaman dan anotasi"]
    ERR --> REVIEW
    MANUAL --> REVIEW
    FAIL --> REVIEW
    AI --> REVOKE["Jika izin dicabut: hentikan pemrosesan baru dan batalkan pekerjaan tertunda"]
    REVOKE --> REVIEW
```

Cabang pencabutan adalah interupsi, bukan langkah yang harus selalu terjadi. Periksa izin lagi sebelum dispatch/retry; respons yang telanjur diproses ditangani sesuai kebijakan. Kandidat final AI bukan penilaian final guru. Analisis lama atau terlambat tidak boleh mengubah revisi tinjauan yang telah final. Pseudoword pada tahap awal tetap manual. Real-time dan training/fine-tuning di luar MVP.

## 4. Peninjauan, laporan, dan saran tindak lanjut

```mermaid
flowchart TD
    A["Guru berwenang membuka antrean peninjauan"] --> B["Periksa respons, audio, versi materi, serta catatan bantuan"]
    B --> C{"Bukti memadai untuk tugas terkait?"}
    C -->|Tidak| D["Tandai belum dapat dinilai dan jelaskan keterbatasan"]
    C -->|Ya| E["Konfirmasi/perbaiki kandidat AI atau anotasi manual; gunakan rubrik disetujui"]
    D --> F["Finalisasi revisi tinjauan; jangan ganti data hilang menjadi nol"]
    E --> F
    F --> G["Buat draf versi laporan yang mengikat revisi tinjauan tertentu"]
    G --> H{"Pedoman tindak lanjut approved tersedia?"}
    H -->|Tidak| I["Sajikan temuan dan batas interpretasi; tidak membuat rujukan otomatis"]
    H -->|Ya| J["Aturan pedoman menentukan tindak lanjut yang sesuai"]
    J --> L["Gunakan narasi pedoman atau susun manual; tanpa AI generatif"]
    L --> N["Pihak berwenang memeriksa saran sebelum publikasi"]
    N --> O{"Isi dan kelengkapan layak diterbitkan?"}
    I --> O
    O -->|Tidak| G
    O -->|Ya| P["Terbitkan versi immutable; notifikasi tanpa isi sensitif"]
    P --> Q["Wali terverifikasi login untuk membaca"]
    P --> R["Perbaikan berikutnya menghasilkan versi baru; bukan overwrite"]
```

Laporan parsial harus jelas status dan batasnya. Tidak ada persentase atau kategori risiko tanpa instrumen serta aturan yang mendukung. AI tidak memilih ambang maupun menentukan diagnosis.

## 5. Pembagian laporan dan permintaan konsultasi

```mermaid
flowchart TD
    A["Wali terverifikasi memilih psikolog terverifikasi"] --> B{"Ingin membagikan laporan?"}
    B -->|Tidak| C["Ajukan jadwal tanpa membuka laporan"]
    B -->|Ya| D["Pilih anak, versi laporan terbit, penerima, dan cakupan; audio tidak default"]
    D --> E["Tampilkan penjelasan berbagi dan catat persetujuan eksplisit"]
    E --> F["Buat izin untuk kombinasi tersebut; ajukan jadwal bila diinginkan"]
    C --> G["Psikolog menanggapi permintaan jadwal"]
    F --> G
    F --> H["Psikolog meminta akses laporan"]
    H --> I{"Penerima, hubungan wali, versi, cakupan, dan izin masih sah?"}
    I -->|Tidak| DENY["Tolak akses"]
    I -->|Ya| J["Tampilkan hanya data berizin dan catat audit"]
    J --> K["Konsultasi sesuai layanan; tidak otomatis terlihat oleh guru"]
    F --> L{"Ada perubahan izin/laporan?"}
    L -->|Izin dicabut atau kedaluwarsa| M["Blokir akses baru dan hentikan koneksi terkait"]
    L -->|Versi laporan baru| N["Versi baru tidak ikut dibagikan; minta izin baru"]
```

Pencabutan tidak menghapus salinan yang sudah diunduh dan belum tentu mematikan signed URL yang telah diterbitkan sebelum kedaluwarsa. Sampaikan batas ini; gunakan akses berotorisasi tiap permintaan bila pencabutan seketika diperlukan. Penjadwalan bukan izin mengakses seluruh data.

## 6. Penarikan persetujuan dan penghapusan

```mermaid
flowchart TD
    A["Wali terverifikasi mengajukan tindakan"] --> B{"Jenis tindakan?"}
    B -->|Hentikan sesi| C["Jeda/akhiri tugas; hentikan mikrofon dan tutup kapabilitas siswa"]
    B -->|Tarik persetujuan| D["Catat pencabutan untuk tujuan dan cakupan terkait"]
    D --> E["Hentikan pemrosesan baru, retry, dan pekerjaan tertunda terkait"]
    E --> F["Tangani data yang telanjur dikirim sesuai kebijakan/penyedia; jelaskan batasnya"]
    B -->|Minta penghapusan| G["Verifikasi kewenangan dan cakupan permintaan"]
    G --> H["Periksa kewajiban retensi dan tentukan pelaksanaan oleh penanggung jawab"]
    H --> I["Hapus/pseudonimkan sesuai keputusan pada database, audio, turunan, dan penyedia"]
    I --> J["Catat hasil serta batas backup dan salinan eksternal; informasikan kepada wali"]
    C --> K["Audit minimum tanpa isi sensitif"]
    F --> K
    J --> K
```

Detail masa simpan, pengecualian retensi, tenggat, dan proses backup harus ditetapkan sebelum data anak dipakai. Diagram ini tidak menjanjikan penghapusan instan dari seluruh pihak.

## 7. Pemetaan alur ke ERD

| Tahap | Entitas utama |
|---|---|
| Verifikasi dan penugasan | PROFILE, SCHOOL_MEMBER, CHILD, TEACHER_ASSIGNMENT, GUARDIAN_LINK, PSYCHOLOGIST_PROFILE |
| Persetujuan | CONSENT_EVENT dan GUARDIAN_LINK |
| Persiapan/latihan/skrining | MATERIAL_VERSION, ASSESSMENT_SESSION, STUDENT_ACCESS, TASK_ATTEMPT, SESSION_EVENT |
| Rekaman dan AI | RECORDING, AI_ANALYSIS, AI_ANNOTATION |
| Peninjauan | REVIEW_REVISION, REVIEW_ANNOTATION |
| Laporan dan saran | REPORT_VERSION, REPORT_REVIEW, GUIDANCE_VERSION |
| Berbagi dan penjadwalan | REPORT_SHARE, CONSULTATION_REQUEST |
| Jejak tindakan | AUDIT_EVENT |

## 8. Pemeriksaan sebelum implementasi

- [ ] Jalur manual berfungsi tanpa AI dan tanpa real-time.
- [ ] Latihan tidak memengaruhi skor; skrining tidak mengirim koreksi ke siswa.
- [ ] Perangkat guru dan kapabilitas siswa tidak berbagi hak akses.
- [ ] Izin diperiksa kembali sebelum pengiriman/retry; kuota gratis diperiksa sebelum proses AI.
- [ ] Rekaman rusak/gagal dan tugas dilewati tidak menjadi nilai nol.
- [ ] Revisi tinjauan dan versi laporan tidak tertimpa hasil terlambat.
- [ ] Pembagian mengikat penerima dan versi tertentu; konsultasi tetap terpisah.
- [ ] Penyedia AI, instrumen, aturan beberapa wali, retensi, dan penanggung jawab sudah diselesaikan sebelum penggunaan nyata.
- [ ] Tidak ada real-time, training/fine-tuning, atau saran AI generatif dalam scope MVP.
- [ ] Seluruh alur diuji desktop, tablet, dan handphone; konteks penyajian asesmen dicatat.
- [ ] Tema hutan hanya modul gamifikasi; React dan Tailwind menjadi dasar antarmuka responsif.
- [ ] Tidak ada billing/upgrade tanpa persetujuan; kuota habis tidak menghapus data valid.

Tidak ada hasil uji pengguna, akurasi AI, atau validitas skrining yang diklaim oleh diagram ini.
