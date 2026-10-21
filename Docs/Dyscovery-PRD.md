# Dyscovery: Product Requirements Document

**Versi:** 1.2, baseline dokumentasi tersinkron  
**Tanggal:** 21 Oktober 2026  
**Tagline:** Kenali risiko, temukan dukungan.  
**Status:** spesifikasi perencanaan, bukan bukti implementasi atau validitas skrining.

Dokumen ini menyatukan keputusan produk yang tersedia dalam percakapan, bukan salinan verbatim PRD sebelumnya. Nama Dyscovery menggantikan Dyscover; merek dan domain belum diperiksa. Acuan pendamping: [Design System](Dyscovery-Design-System.md) dan [Security Rules](Dyscovery-Security-Rules.md).

## 1. Tujuan dan batas

Dyscovery mendukung pengamatan kemampuan literasi dan skrining awal risiko disleksia pada siswa kelas 2 SD berbahasa Indonesia di sekolah, melalui kegiatan gamifikasi, dokumentasi bacaan, peninjauan guru, dan tindak lanjut bersama keluarga serta psikolog.

Sistem bukan terapi, diagnosis otomatis, atau alat yang menyimpulkan disleksia dari suara. Sampai instrumen dan aturan klasifikasi yang sesuai tersedia, sistem hanya menampilkan kinerja tugas dan observasi, tanpa kategori risiko, persentase risiko, persentil, atau kesimpulan bebas disleksia.

## 2. Pengguna dan scope

- Guru: siswa yang ditugaskan, persiapan sesi, pendampingan, peninjauan, dan penerbitan laporan sesuai kewenangan.
- Orang tua/wali: anak dengan hubungan terverifikasi, persetujuan, laporan terbit, dan tindak lanjut.
- Psikolog: profil terverifikasi, permintaan jadwal, laporan yang diizinkan, dan konsultasi terkait.
- Siswa: mode terbatas satu sesi tanpa akun anak dan tanpa akses dashboard dewasa.

MVP mencakup pelaksanaan di sekolah, bukan asesmen mandiri di rumah. Pembayaran, video call, terapi, rekam medis lengkap, serta pesan asinkron tidak wajib MVP. Konsultasi simulasi harus diberi label jika layanan nyata belum siap.

## 3. Arsitektur acuan

Next.js App Router, React, TypeScript, dan Tailwind CSS wajib digunakan dalam satu proyek, dengan backend terintegrasi pada runtime Node.js. React adalah lapisan antarmuka Next.js, bukan aplikasi kedua. Tailwind menjadi styling utama; CSS tambahan hanya bila diperlukan. Vercel untuk aplikasi; Supabase PostgreSQL, Auth, dan private Storage untuk data serta rekaman. Tidak perlu backend Express/NestJS, ORM, atau game engine terpisah pada tahap awal. Gunakan SDK resmi Supabase dan migrasi SQL dalam repositori.

Perekaman memakai API browser `getUserMedia` dan `MediaRecorder`, dengan pemeriksaan dukungan format per browser. Versi stabil paket/runtime dipilih berdasarkan kompatibilitas saat inisialisasi dan dikunci dengan lockfile; upgrade mayor memerlukan persetujuan.

### 3.1 Biaya dan layanan

Target operasional MVP Rp0: gunakan teknologi open-source serta paket gratis yang memenuhi ketentuan proyek. Supabase Free, Vercel gratis bila memenuhi syarat, Git/GitHub Free, Mermaid, font dan aset berlisensi sesuai. Subdomain bawaan cukup; domain premium, template berbayar, dan layanan berlangganan tidak wajib.

Tidak memasukkan metode pembayaran, mengaktifkan billing, atau upgrade tanpa persetujuan. Kuota, kelayakan paket, dan pengiriman email Auth diperiksa saat deployment, bukan diasumsikan tanpa batas. Tetapkan batas audio, retry, dan penggunaan AI; ketika kuota habis, hentikan fitur terkait dengan penjelasan, jangan otomatis upgrade atau menghapus data valid. Kredit percobaan bukan fondasi layanan. Jika layanan gratis tidak memenuhi keamanan/ketentuan, tunda penggunaan nyata, bukan mengurangi perlindungan.

### 3.2 Responsivitas wajib

Seluruh area web mendukung desktop/laptop, tablet, dan handphone melalui layout mobile-first. Tidak ada overflow halaman; tabel dapat memakai area gulir tersendiri. Formulir, navigasi, peninjauan, dan laporan tidak kehilangan fungsi pada layar kecil. Dukung keyboard, sentuhan, portrait/landscape, pembesaran teks, serta target sentuh minimal 44 × 44 CSS px; tidak bergantung pada hover atau drag-and-drop.

Asesmen diuji terpisah dari responsivitas dashboard: cek ukuran stimulus, pemenggalan baris, izin/format audio, layar terkunci, perpindahan aplikasi, dan interupsi telepon. Catat kelas perangkat, browser, serta konfigurasi penyajian pada sesi tanpa fingerprint berlebihan. Jika tugas tidak didukung, blokir tugas sebelum mulai dengan penjelasan; jangan menganggap hasil antarperangkat otomatis setara.

Unggahan rekaman langsung ke private Storage menggunakan izin terbatas, bukan melewatkan seluruh audio melalui fungsi aplikasi. Pemrosesan harus ditunggu dalam batas runtime atau memakai pekerjaan tahan gangguan jika diperlukan, bukan proses fire-and-forget setelah respons HTTP.

## 4. Kelompok aktivitas

1. Mengeja berdasarkan gambar.
2. Membaca kata nyata dan pseudoword.
3. Membaca teks secara lisan.
4. Pemahaman bacaan.

Butir, durasi, urutan, rubrik, aturan bantuan, dan ambang klasifikasi belum ditetapkan. Semuanya mengikuti peninjauan instrumen dan ahli, termasuk izin adaptasi. Pseudoword ditinjau manual pada tahap awal. Tidak ada petunjuk audio; mikrofon digunakan untuk merekam.

## 5. Alur sesi yang disepakati

### 5.1 Persiapan

Guru memilih siswa yang ditugaskan, memeriksa persetujuan dan mikrofon, serta memastikan perangkat sesuai prosedur. Mode siswa mengunci hak guru secara server-side. Anak tidak dapat mengambil kembali akses guru melalui tab lama atau API.

### 5.2 Latihan tidak dinilai

Materi latihan berbeda dari materi skrining. Latihan mengenalkan instruksi, kontrol, dan mikrofon. Umpan balik langsung mengikuti aturan tugas atau pendampingan guru, tanpa masuk skor skrining. MVP tidak mengikuti ucapan dengan AI secara real-time, termasuk saat latihan. Hasil AI pascarekaman, jika tersedia, tetap kandidat; gangguan pengenalan tidak dilabeli sebagai kesalahan pasti anak.

Guru boleh menjelaskan dan memberi contoh pada tahap ini. Tidak menambahkan program terapi ke dalam scope.

### 5.3 Skrining tanpa koreksi langsung

Anak melihat teks stabil, indikator perekaman, dan kontrol bantuan/jeda. Tidak ada penanda benar–salah, pembocoran jawaban, permintaan mengulang otomatis, atau penanda kata mengikuti suara pada tampilan siswa secara default. Pengecualian harus diizinkan prosedur instrumen.

Guru mengawasi dan menjelaskan cara menggunakan sistem sesuai prosedur, bukan spontan memberi kata jawaban. Bantuan membaca, pengulangan instruksi, jeda, kendala teknis, serta penghentian dicatat. Ketidaknyamanan anak ditangani dengan jeda atau penghentian.

### 5.4 Peninjauan dan penerbitan

Guru memeriksa rekaman terhadap teks acuan, mengonfirmasi atau memperbaiki kandidat anotasi, kemudian menerapkan rubrik yang disetujui. Sistem mempertahankan bukti dan asal anotasi. Laporan memiliki versi dan hanya diterbitkan setelah syarat kelengkapan serta tinjauan terpenuhi.

### 5.5 Tindak lanjut

Wali melihat laporan terbit beserta batas interpretasi. Pembagian kepada psikolog memerlukan izin terpisah untuk penerima, versi laporan, dan cakupan tertentu; rekaman tidak dibagikan secara default. Konsultasi tidak otomatis terlihat oleh guru.

## 6. Fungsi AI dan batasnya

### AI-01: Kandidat anotasi bacaan

Gunakan model pretrained tanpa training dari nol atau fine-tuning dalam MVP. Analisis hanya setelah rekaman tersimpan dan valid. Masukan minimum berupa rekaman dan teks acuan. AI membantu mencocokkan bacaan dan menandai kandidat penggantian, penghilangan, pengulangan, serta segmen tidak jelas. Koreksi mandiri anak ditangani sesuai rubrik. Model pengenalan ucapan dapat menormalkan kesalahan; transkrip yang tampak cocok tidak membuktikan pelafalan benar dan harus dibandingkan dengan rekaman.

Keluaran wajib menyertakan identitas sesi/tugas, versi materi, asal model, dan lokasi bukti bila tersedia. Jangan membuat timestamp atau confidence numerik yang tidak benar-benar disediakan atau divalidasi. Ketidakpastian dipertahankan sebagai “belum dapat dikenali/dinilai”, bukan dipaksa menjadi benar atau salah.

### AI-02: Real-time ditunda, di luar MVP

Tidak membangun streaming audio, live alignment, atau dashboard anotasi langsung untuk MVP. Guru mendampingi secara langsung dan meninjau setelah sesi. Real-time memerlukan persetujuan scope baru setelah akurasi, latensi, biaya, keamanan, dan kelayakan penyedia terbukti. Rekaman, analisis, dan tinjauan tetap memiliki status terpisah; hasil terlambat tidak menimpa keputusan guru.

### AI-03: Saran tindak lanjut berbasis aturan, tanpa AI generatif

Hanya menggunakan hasil yang telah ditinjau serta aturan dan narasi yang disetujui ahli. Gunakan template atau penulisan manual oleh pihak berwenang; AI generatif untuk saran tidak termasuk MVP. Draf diperiksa sebelum diterbitkan. Tidak ada diagnosis otomatis, ambang risiko buatan, resep terapi, atau tenaga profesional fiktif.

Selama aturan klasifikasi belum tersedia, gunakan narasi temuan dan kebutuhan evaluasi lebih lanjut tanpa label “terindikasi disleksia”. Rekomendasi profil tertentu hanya dari direktori terverifikasi, dengan izin berbagi terpisah.

### AI-04: Gerbang penyedia

Gemini melalui Google AI Studio masih merupakan pilihan teknis yang belum layak diaktifkan untuk data anak sampai kesesuaian ketentuan penyedia terdokumentasi. Akun guru, backend, pembayaran, dan persetujuan wali tidak otomatis menyelesaikan pembatasan usia atau penggunaan klinis. Alur manual wajib berfungsi tanpa AI; demo memakai data sintetis atau rekaman dewasa yang diizinkan dan memenuhi ketentuan penyedia.

## 7. Status, data, dan integritas

- Pisahkan status sesi, rekaman/unggahan, analisis AI, tinjauan, dan laporan.
- Unggahan tertunda, gagal, atau rusak bukan jawaban salah maupun skor nol.
- Simpan versi materi, konfigurasi penyajian, aturan penilaian, dan laporan.
- Pisahkan kandidat AI dari keputusan guru; simpan jejak koreksi tanpa overwrite diam-diam.
- Retry idempoten; hasil terikat sesi dan versi input, bukan hanya nama berkas.
- Latihan dan bantuan tidak dicampur ke skor skrining.
- Entitas minimum: akun, keanggotaan/penugasan, anak, hubungan wali, persetujuan, materi, sesi, respons, rekaman, analisis, tinjauan, laporan, izin berbagi, permintaan konsultasi, dan audit.

## 8. Persetujuan dan keamanan

Persetujuan perekaman, AI, dan berbagi dipisahkan. Penolakan AI memungkinkan tinjauan manual; penolakan rekaman membuat tugas terkait tidak dilakukan atau belum dapat dinilai. Penarikan persetujuan menghentikan pemrosesan baru sesuai cakupannya dan berbeda dari permintaan penghapusan.

Otorisasi berlaku pada server, RLS, dan Storage. Privileged key tidak tersedia di browser. Laporan tidak masuk cache publik; data siswa sebelumnya tidak terbawa saat berganti sesi. Ketentuan lengkap terdapat di Security Rules.

## 9. Identitas dan UX

Nama: **Dyscovery**. Tagline: **Kenali risiko, temukan dukungan.** Identitas utama umum, childish, dan playful, bukan bertema hutan. Dashboard dewasa dan laporan lebih tenang serta berorientasi informasi. Palet biru tinta `#24476A`, aprikot `#F2B880`, putih hangat `#FAF8F4`, putih `#FFFFFF`, dan teks `#202C38`. Font Nunito Sans 400/600/700, bukan font terapi. Hutan pixel art hanya tema pertama modul asesmen gamifikasi; teks asesmen tetap non-pixel dan stabil. Aset tema dipisahkan dari materi/rubrik; tidak membangun theme engine atau pemilih tema untuk satu tema MVP.

Sediakan status kosong, memuat, gagal, dan belum dapat dinilai. Interaksi mendukung keyboard, fokus terlihat, pembesaran teks, dan tidak bergantung pada warna saja. Detail mengacu Design System.

## 10. Kriteria penerimaan dan bukti uji

- [ ] Latihan memakai materi berbeda dan tidak mengubah skor skrining.
- [ ] Siswa tidak melihat koreksi langsung selama skrining.
- [ ] Guru dapat mencatat jenis bantuan, jeda, dan penghentian.
- [ ] Mode siswa menolak hak guru pada tab lama, API, database, Storage, dan koneksi aktif.
- [ ] Kegagalan AI tidak mengubah hasil menjadi nol atau menggagalkan rekaman yang berfungsi.
- [ ] Audio dan anotasi tidak tertukar antarsesi; retry tidak menggandakan data.
- [ ] Keluaran tidak pasti dan keluaran tidak valid tidak menjadi keputusan final.
- [ ] Hasil AI terlambat tidak menimpa tinjauan guru.
- [ ] Draf saran hanya memakai hasil ditinjau dan pedoman disetujui; tidak berisi diagnosis atau profil fiktif.
- [ ] Izin yang dicabut menghentikan pengiriman/pemrosesan baru dan pekerjaan tertunda.
- [ ] Versi baru laporan tidak otomatis dibagikan.
- [ ] Pengujian AI membandingkan anotasi dengan penilaian manusia, mencakup suara tidak jelas, pengulangan, koreksi mandiri, kebisingan, kata dan pseudoword.
- [ ] Model pretrained diuji terhadap penilaian manusia; tidak ada training, fine-tuning, streaming, atau AI generatif saran dalam MVP.
- [ ] React dan Tailwind digunakan; alur utama diuji di desktop, tablet, dan handphone dengan bukti perangkat/browser.
- [ ] Kuota gratis dan kelayakan paket diperiksa; tidak ada billing atau upgrade tanpa persetujuan.

Uji keamanan, usability, akurasi AI, dan validitas skrining adalah bukti berbeda. Belum ada hasil uji atau validasi yang diklaim dalam dokumen ini.

## 11. Prioritas dan gerbang rilis

1. Inti MVP: latihan, perekaman andal, peninjauan manual, laporan observasi, persetujuan, dan pembatasan akses.
2. AI pascarekaman: hanya setelah penyedia sesuai dan hasil dibandingkan dengan penilaian manusia.
3. Saran tindak lanjut: aturan/narasi ahli dan pemeriksaan manusia, tanpa ketergantungan AI generatif.
4. Di luar MVP: real-time, training/fine-tuning, AI generatif saran, dan theme engine. Penambahannya memerlukan persetujuan scope baru, bukan aktivasi diam-diam.

### Kendali perubahan

PRD adalah acuan scope; Workflow menjelaskan urutan; ERD menjelaskan data; Security Rules menetapkan batas akses; Design System menetapkan penyajian. Konflik diselesaikan pada dokumen sebelum kode. Perubahan role, relasi data, consent, scoring, dan urutan asesmen memerlukan persetujuan. Perubahan aset tidak boleh mengubah prosedur penilaian. Baseline ini tidak membekukan keputusan yang belum terselesaikan atau menjanjikan tidak ada migrasi database.

Sebelum data anak digunakan: tetapkan instrumen/materi/rubrik, pihak sekolah dan ahli, penanggung jawab data, verifikasi akun, masa retensi, penghapusan/backup, batas rekaman, perangkat/browser, dan respons insiden. Klasifikasi risiko tetap nonaktif tanpa dasar. Penggunaan nyata dan demo harus dibedakan jelas.
