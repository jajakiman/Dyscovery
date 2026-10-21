# Dyscovery Design System

**Versi:** 1.2, baseline dokumentasi tersinkron  
**Tanggal:** 21 Oktober 2026  
**Status:** palet dasar dan font disepakati; spesifikasi penerapan awal masih perlu diuji.

**Nama:** Dyscovery  
**Tagline:** Kenali risiko, temukan dukungan.

Nama menggantikan Dyscover. Ketersediaan merek dan domain belum diperiksa. Dokumen terkait: [PRD](Dyscovery-PRD.md) dan [Security Rules](Dyscovery-Security-Rules.md).

## 1. Tujuan dan batas dokumen

Dokumen ini menyatukan identitas visual Dyscovery untuk dashboard guru, orang tua, psikolog, dan mode siswa. Dyscovery mendukung skrining awal risiko disleksia di sekolah, bukan terapi atau diagnosis otomatis.

Warna dan font tidak diklaim memberikan manfaat terapeutik atau membuktikan ketepatan skrining. Keterbacaan tetap diperlukan agar tampilan tidak menjadi hambatan tambahan.

**Sudah disepakati:** identitas utama umum, childish, dan playful; palet Biru Tinta + Aprikot; Nunito Sans; hutan pixel art hanya pada lingkungan serta karakter modul asesmen gamifikasi, bukan tema seluruh platform. Implementasi UI menggunakan React melalui Next.js dan Tailwind CSS.

**Usulan penerapan:** ukuran tipografi, aturan komponen, aksesibilitas, dan gerak di bawah ini menjadi titik awal pengujian, bukan spesifikasi yang sudah tervalidasi.

## 2. Karakter visual

- **Ramah:** instruksi sederhana dan penyampaian hasil tidak menghakimi.
- **Jelas:** informasi, tindakan, dan status mudah dibedakan.
- **Terkendali:** dekorasi tidak bersaing dengan materi asesmen.
- **Konsisten:** kontrol dikenali meskipun tema petualangan berubah.

Dashboard berorientasi pada pekerjaan pengguna. Mode siswa memakai pixel art pada lingkungan dan karakter, bukan pada teks asesmen.

## 3. Palet warna

| Token | Nama | HEX | Penggunaan |
|---|---|---|---|
| `primary` | Biru tinta | `#24476A` | Tombol utama, tautan, navigasi aktif |
| `accent` | Aprikot | `#F2B880` | Penanda perjalanan dan detail ilustrasi |
| `background` | Putih hangat | `#FAF8F4` | Latar halaman |
| `surface` | Putih | `#FFFFFF` | Formulir, panel peninjauan, laporan |
| `foreground` | Arang kebiruan | `#202C38` | Judul, isi, label |

### Alasan pemilihan

Biru tinta menjadi identitas yang konsisten pada navigasi dan tindakan penting. Aprikot memberi karakter hangat pada elemen petualangan tanpa mengikat merek pada tema hutan. Latar terang memprioritaskan konten, sedangkan arang kebiruan menjadi warna teks utama.

Penjelasan tersebut merupakan alasan desain, bukan klaim efek psikologis atau klinis.

### Aturan penggunaan

- Tombol utama: biru tinta dengan teks putih.
- Area aprikot: teks arang kebiruan, bukan putih.
- Isi: teks arang kebiruan pada putih atau putih hangat.
- Aprikot digunakan terbatas, bukan pada seluruh komponen.
- Tautan di dalam paragraf diberi garis bawah.
- Teks pada area permainan memakai bidang solid jika ilustrasi mengganggu keterbacaan.
- Lingkungan permainan boleh memiliki warna tema; kontrol utama mempertahankan warna merek.
- Gradasi, glow, blur, dan bayangan bukan dekorasi wajib.

### Warna semantik dan interaksi

Warna berhasil, peringatan, kesalahan, border, teks sekunder, hover, fokus, dan nonaktif **belum ditetapkan**. Pilihannya harus diperiksa pada konteks pemakaian sebelum implementasi dinyatakan selesai.

Status selalu disertai label, bukan warna saja. Jangan memakai merah–kuning–hijau sebagai kategori risiko terselubung. Aprikot bukan risiko sedang dan biru bukan bebas risiko.

## 4. Tipografi

**Font utama: Nunito Sans.** Tidak digunakan font khusus disleksia.

| Penggunaan | Ketebalan |
|---|---|
| Isi dan teks bacaan | Regular `400` |
| Label, tombol, instruksi singkat | Semibold `600` |
| Judul halaman dan bagian | Bold `700` |

Nunito Sans dipilih sebagai identitas visual yang ramah dan konsisten, bukan karena terbukti lebih baik untuk anak disleksia.

### Ukuran awal

| Elemen | Ukuran |
|---|---|
| Judul halaman dashboard | 28–32 px |
| Judul bagian | 20–24 px |
| Isi dashboard dan laporan | 16–18 px |
| Label dan tombol | 16–18 px |
| Instruksi siswa | 20–24 px |
| Teks bacaan siswa | 24–28 px |

Ukuran ini adalah titik awal desain, bukan standar instrumen. Pengaturan final materi asesmen mengikuti peninjauan dan pengujian pada perangkat sekolah.

### Aturan penyajian

- Rata kiri, bukan rata kiri-kanan.
- Jarak antarbaris awal sekitar 1,5 kali ukuran font, lalu diperiksa sesuai konteks.
- Hindari paragraf kapital penuh dan huruf miring untuk instruksi penting.
- Jangan menebalkan seluruh paragraf atau memperlebar jarak huruf berlebihan.
- Gunakan instruksi pendek dengan tindakan yang jelas.
- Font pixel tidak digunakan pada soal, instruksi, atau laporan.
- Antarmuka mendukung pembesaran teks; akomodasi materi asesmen mengikuti protokol dan dicatat.

## 5. Konsistensi materi asesmen

Ketentuan instrumen lebih diutamakan daripada keseragaman merek.

- Font, ukuran, jarak, pemenggalan baris, serta bentuk stimulus ditinjau sebelum digunakan.
- Versi materi dan konfigurasi tampilannya dapat ditelusuri dari sesi.
- Font dimuat sebelum tugas yang dinilai dimulai agar tata letak tidak berubah di tengah pengerjaan.
- Perubahan penyajian atau akomodasi yang dapat memengaruhi tugas dicatat.
- Tidak ada koreksi langsung selama bagian yang dinilai.
- Tidak ada petunjuk warna atau ilustrasi yang membocorkan jawaban.

### Latihan, skrining, dan peninjauan

| Tahap | Tampilan siswa | Tampilan guru |
|---|---|---|
| Latihan | Label “Latihan, tidak dinilai”; materi berbeda; penanda posisi dan umpan balik langsung diperbolehkan | Panduan menjelaskan instruksi dan memeriksa mikrofon |
| Skrining | Teks stabil, indikator perekaman, bantuan/jeda; tanpa koreksi benar–salah, jawaban, atau pengulangan otomatis | Pendampingan langsung dan pencatatan bantuan; tanpa dashboard AI real-time pada MVP |
| Peninjauan | Tidak ada kewajiban menampilkan koreksi kepada anak | Rekaman, teks acuan, kandidat AI, dan keputusan guru |

- Penanda posisi mengikuti suara tidak ditampilkan pada materi skrining siswa secara default; perubahan memerlukan persetujuan prosedur instrumen.
- Umpan balik latihan mengikuti aturan tugas atau pendampingan guru. Tidak ada pelacakan ucapan AI real-time dalam MVP; latihan tidak menjadi terapi.
- AI pretrained hanya menganalisis rekaman tersimpan dan valid, tanpa training/fine-tuning. Kandidat pascarekaman membedakan kecocokan, dugaan perbedaan, dan belum dikenali; bukan vonis pasti.
- Real-time ditunda di luar MVP. Dashboard guru tidak dibuka di perangkat mode siswa.
- Gangguan AI tidak menghentikan rekaman yang masih berfungsi. Status rekaman dan analisis ditampilkan terpisah.
- Guru dapat mencatat bantuan, jeda, dan penghentian; bantuan antarmuka dibedakan dari bantuan membaca.
- Saran tindak lanjut memakai aturan/narasi ahli atau penulisan manual, berlabel draf sampai ditinjau, dan tidak menyatakan diagnosis. Tidak ada AI generatif saran dalam MVP.

## 6. Penerapan per area

| Area | Prioritas |
|---|---|
| Dashboard guru | Pemilihan siswa, kesiapan sesi, peninjauan bacaan, penerbitan laporan |
| Mode siswa | Stimulus jelas, instruksi singkat, kontrol bantuan/jeda, cerita |
| Dashboard orang tua | Temuan, batas interpretasi, persetujuan, tindak lanjut |
| Dashboard psikolog | Laporan yang diizinkan dan konteks konsultasi |
| Laporan | Informasi terstruktur yang dipahami tanpa bergantung pada warna |

Tidak perlu menambahkan grafik atau statistik jika tidak membantu keputusan pengguna. Data demonstrasi diberi label. Tidak ada testimoni, angka penggunaan, atau klaim kepercayaan fiktif.

## 7. Pedoman komponen awal

### Tombol dan tautan

- Satu tindakan utama paling menonjol pada satu area kerja.
- Label menyebut tindakan: “Mulai sesi”, “Simpan catatan”, atau “Bagikan laporan”.
- Tindakan sekunder memiliki penekanan lebih rendah.
- Tindakan sensitif menjelaskan dampak dan meminta konfirmasi bila diperlukan.
- Tidak ada tombol atau tautan tanpa fungsi nyata.

### Formulir

- Label tetap terlihat; placeholder bukan pengganti label.
- Kesalahan dijelaskan dekat isian beserta langkah perbaikan.
- Isian tidak hilang ketika pengiriman gagal.
- Persetujuan tidak dicentang sebelumnya.
- Pilihan persetujuan yang berbeda tidak disatukan untuk menyamarkan konsekuensi.

### Panel peninjauan bacaan

- Teks acuan, rekaman, dan anotasi mudah dibandingkan.
- Kandidat AI dibedakan dari hasil yang sudah ditinjau.
- Temuan tidak ditandai dengan warna saja.
- Kandidat AI tidak ditampilkan sebagai kesalahan pasti anak.
- Koreksi guru memiliki jejak perubahan.

### Status sistem

| Status | Informasi yang harus ditampilkan |
|---|---|
| Kosong | Penyebab dan langkah berikutnya |
| Memuat | Data atau proses yang sedang dimuat |
| Gagal | Apa yang gagal dan cara mencoba kembali |
| Tersimpan | Konfirmasi setelah penyimpanan server berhasil |
| Belum dapat dinilai | Keterangan data tidak memadai, bukan nilai nol |

## 8. Aksesibilitas dan responsivitas

Responsif wajib untuk desktop/laptop, tablet, dan handphone. Gunakan Tailwind mobile-first dengan layout fleksibel, bukan memperkecil seluruh halaman. Navigasi menyesuaikan ruang; formulir dan panel peninjauan bertumpuk saat sempit; tabel dapat memiliki gulir internal tanpa overflow halaman. Tidak ada fungsi hover-only. Dukung portrait/landscape, keyboard virtual, dan pembesaran teks tanpa kehilangan fungsi.

Uji alur utama pada lebar awal 360, 768, dan 1280 CSS px serta ukuran di antaranya; angka ini adalah titik pemeriksaan layout, bukan batas instrumen atau jaminan dukungan semua perangkat. Uji mikrofon, format rekaman, interupsi, dan teks asesmen pada perangkat/browser nyata yang ditetapkan. Perangkat yang tidak mendukung tugas diberi penjelasan sebelum mulai. Catat konfigurasi penyajian; kesetaraan hasil antarperangkat tidak diasumsikan.

- Target kontras teks normal minimal 4,5:1; teks besar minimal 3:1 sesuai kriteria WCAG AA.
- Batas kontrol dan indikator fokus yang diperlukan cukup kontras terhadap sekitarnya.
- Semua tindakan dapat dioperasikan dengan keyboard dan memiliki fokus terlihat.
- Drag-and-drop bukan satu-satunya cara menyusun jawaban.
- Target sentuh dirancang minimal 44 × 44 px.
- Dialog mendukung keyboard, Escape, dan pengelolaan fokus.
- Informasi penting tidak disampaikan hanya melalui warna, suara, atau animasi.
- Dashboard menyesuaikan layar tanpa overflow yang menghalangi tugas.
- Perangkat asesmen yang didukung ditetapkan melalui pengujian; semua ukuran layar tidak dianggap setara secara otomatis.

**Status:** belum ada audit implementasi. Dokumen ini menetapkan target, bukan menyatakan kepatuhan WCAG penuh.

## 9. Ilustrasi, tema, dan gerak

- Tema utama platform umum dan childish melalui bentuk, ilustrasi, dan bahasa ramah anak. Dashboard dewasa serta laporan tetap tenang dan jelas.
- Petualangan hutan adalah tema pertama modul asesmen gamifikasi saja; tidak diterapkan sebagai latar wajib landing page, dashboard, atau laporan.
- Aset hutan dipisahkan dari materi/rubrik. Satu tema MVP tidak memerlukan theme engine atau pemilih tema.
- Pixel art digunakan pada karakter, lingkungan, dan elemen cerita yang relevan.
- Stimulus dan kontrol tidak tertutup dekorasi.
- Tidak ada kedipan atau gerak dekoratif berulang selama tugas membaca.
- Animasi digunakan untuk transisi atau konfirmasi yang diperlukan dan menghormati preferensi pengurangan gerak.
- Tidak ada hukuman visual, nyawa habis, atau bonus kecepatan.
- Logo dan karakter final belum dipilih. Aset sementara harus ditandai, bukan dianggap final.

## 10. Narasi untuk proposal

### Warna

Dyscovery menggunakan biru tinta (`#24476A`) sebagai warna utama pada navigasi dan tindakan penting. Aprikot (`#F2B880`) digunakan secara terbatas untuk memberi karakter hangat pada elemen petualangan. Putih hangat (`#FAF8F4`) dan putih (`#FFFFFF`) menjadi dasar tampilan agar konten tetap menonjol, sedangkan arang kebiruan (`#202C38`) digunakan untuk teks. Palet ini menyeimbangkan kebutuhan antarmuka sekolah dan pengalaman anak tanpa klaim manfaat terapeutik.

### Jenis huruf

Dyscovery menggunakan Nunito Sans sebagai jenis huruf utama pada antarmuka, instruksi, dan laporan. Pemilihannya mendukung konsistensi visual dan keterbacaan, tanpa klaim manfaat terapeutik. Penyajian teks asesmen mengikuti kebutuhan instrumen dan prosedur yang ditetapkan.

## 11. Keputusan yang masih terbuka

- Logo dan aset karakter final.
- Warna semantik serta variasi status interaksi.
- Skala jarak, radius, ikon, dan detail komponen.
- Tata letak layar dan perilaku responsif.
- Konfigurasi final materi asesmen.
- Pemeriksaan kontras, keyboard, perangkat, dan keterpakaian.

## 12. Checklist verifikasi implementasi

- [ ] Palet dasar dan Nunito Sans konsisten.
- [ ] Kontras pasangan warna teks, kontrol, dan fokus diperiksa.
- [ ] Teks terbaca saat diperbesar dan pada perangkat sasaran.
- [ ] Penyajian materi asesmen ditinjau dan versinya dicatat.
- [ ] Semua interaksi bekerja dengan keyboard dan ketukan.
- [ ] Status kosong, memuat, gagal, dan belum dapat dinilai tersedia.
- [ ] Mode siswa tidak memperlihatkan data peserta lain.
- [ ] Data demo dan konsultasi simulasi diberi label.
- [ ] Gerak tidak mengganggu pengerjaan.
- [ ] Tidak ada klaim font terapeutik atau diagnosis melalui tampilan.
- [ ] Latihan terpisah dari skor; skrining tidak memberi koreksi langsung kepada siswa.
- [ ] Status kandidat AI, ketidakpastian, dan hasil tinjauan guru dapat dibedakan.
- [ ] Nama Dyscovery dan tagline konsisten pada layar yang memuat identitas produk.
- [ ] React dan Tailwind digunakan; desktop, tablet, dan handphone diuji tanpa fungsi yang hilang.
- [ ] Tema hutan terbatas pada modul; tidak ada UI live alignment atau saran AI generatif dalam MVP.

## 13. Aset dan biaya

Gunakan font/aset buatan tim atau berlisensi sesuai, tanpa template, ikon, atau komponen premium wajib. Target MVP Rp0 bukan izin memakai aset tanpa lisensi. Ketentuan layanan gratis dan pengendalian kuota mengikuti PRD.

Dokumen ini bukan hasil audit antarmuka atau bukti validitas instrumen skrining.
