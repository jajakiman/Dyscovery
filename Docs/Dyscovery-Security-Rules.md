# Dyscovery Security Rules

**Versi:** 1.2, baseline dokumentasi tersinkron  
**Tanggal:** 21 Oktober 2026  
**Tagline:** Kenali risiko, temukan dukungan.  
**Status:** persyaratan untuk implementasi dan pengujian, bukan hasil audit atau sertifikasi kepatuhan.

Acuan: [PRD](Dyscovery-PRD.md) dan [Design System](Dyscovery-Design-System.md). Nama menggantikan Dyscover; merek dan domain belum diperiksa.

## 1. Prinsip dan data

Akses ditolak secara default. Login bukan izin melihat seluruh data. Validasi dilakukan di server, database, dan Storage, bukan hanya UI. Kegagalan pemeriksaan harus menolak akses. Kumpulkan data minimum. MVP tidak memiliki jalur streaming AI; penambahannya memerlukan tinjauan keamanan dan persetujuan scope baru.

Identitas anak, jawaban, rekaman, anotasi, laporan, dan konsultasi diperlakukan sebagai data terbatas dengan perlindungan tinggi. Rekaman tidak dipakai untuk identifikasi biometrik. Kredensial, token, dan API key adalah rahasia sistem. Data demo dipisahkan dari data nyata.

## 2. Identitas dan otorisasi

| Subjek | Cakupan |
|---|---|
| Guru | Siswa yang ditugaskan pada sekolah terkait dan tindakan sesuai kewenangan |
| Orang tua/wali | Anak dengan hubungan yang diverifikasi; bukan hasil pencarian nama/tanggal lahir |
| Psikolog | Laporan versi tertentu yang dibagikan dengan izin aktif dan konsultasi terkait |
| Mode siswa | Satu sesi terbatas; tanpa akses daftar siswa, laporan, atau dashboard |
| Operator teknis | Kebutuhan operasional terbatas, dapat diaudit; bukan akses rutin bebas ke data anak |

- Verifikasi email dan keanggotaan/peran sebelum akses sensitif.
- Peran guru/psikolog dan hubungan wali tidak dapat diklaim sendiri melalui formulir atau metadata yang dapat diedit pengguna.
- Undangan terikat penerima, sekali pakai, kedaluwarsa, dan dibatasi percobaan.
- Periksa identitas, hubungan, sekolah, penugasan, tindakan, status objek, dan persetujuan untuk setiap permintaan.
- Jangan percaya `role`, `school_id`, atau ID objek dari browser sebagai bukti izin.
- Perubahan peran/penugasan dan pemblokiran harus memengaruhi akses aktif, bukan hanya login berikutnya.
- Gunakan Supabase Auth, bukan penyimpanan kata sandi sendiri. Wajib MFA untuk akun infrastruktur/operator; baseline penggunaan nyata mewajibkan MFA guru dan psikolog.
- Batasi percobaan login, reset, undangan, dan pengaitan akun; hindari respons yang memudahkan enumerasi akun.

## 3. Perangkat bersama

Sebelum perangkat diserahkan kepada siswa, hak guru dikunci efektif dan hanya kapabilitas satu sesi tersedia. Kembali ke area guru memerlukan autentikasi ulang. Tab lama, API langsung, akses database/Storage, dan koneksi aktif harus tunduk pada pembatasan ini.

Tutup koneksi berprivilege serta bersihkan cache dan data sensitif lokal ketika berpindah mode/akun/siswa. Token guru yang masih berlaku tidak boleh menjadi jalan belakang. Jika isolasi belum terjamin, gunakan konteks browser terpisah tanpa kredensial guru; jangan menyerahkan browser guru aktif kepada anak.

MVP tidak menyediakan dashboard AI real-time. Guru mendampingi langsung dan meninjau setelah rekaman. Pada desktop, tablet, maupun handphone, perubahan layout tidak mengubah kewenangan; dashboard guru tidak dibuka di perangkat mode siswa.

## 4. Persetujuan

Pisahkan persetujuan kegiatan, perekaman, pengiriman ke AI, dan berbagi laporan. Simpan pemberi terverifikasi, waktu, cakupan, versi pemberitahuan, dan pencabutan. Jelaskan tujuan, penerima, penyedia, masa simpan, dan cara mencabut. Tidak ada centang persetujuan bawaan.

- AI ditolak: tinjauan manual tetap tersedia.
- Rekaman ditolak: tugas terkait tidak dilakukan/belum dapat dinilai, bukan salah.
- Anak tidak nyaman: jeda atau hentikan; izin wali tidak membenarkan pemaksaan.
- Pencabutan menghentikan pemrosesan baru sesuai cakupan; penghentian sesi dan permintaan penghapusan adalah tindakan berbeda.
- Periksa izin sebelum unggah, dispatch AI, retry, serta penerbitan/pembagian. Batalkan pekerjaan tertunda yang tidak lagi berizin.
- Pemeriksaan izin berlaku kembali pada setiap akses baru dan pekerjaan yang akan dijalankan; jangan bergantung hanya pada status saat sesi dibuat.
- Hentikan pengiriman segera setelah pencabutan diketahui. Data yang telanjur dikirim ditangani menurut prosedur penyedia dan dijelaskan sebagai batas teknis, bukan dianggap otomatis terhapus.

## 5. Database, aplikasi, dan kredensial

- Aktifkan dan uji RLS pada tabel terbatas yang diekspos melalui API. Uji baca/tambah/ubah/hapus terpisah, termasuk perubahan pemilik dan sekolah.
- Peran, hubungan, persetujuan, dan izin berbagi tidak dapat diubah bebas oleh akun pengguna.
- Tinjau fungsi/view berprivilege dan gunakan constraint database untuk hubungan serta konsistensi data.
- Secret key, legacy `service_role`, dan API key AI hanya di server. Endpoint berprivilege wajib memeriksa izin eksplisit karena kunci dapat melewati RLS.
- Gunakan HTTPS, validasi server, query terparameterisasi, proteksi CSRF sesuai autentikasi, pembatasan tujuan URL server, serta header keamanan/CSP yang diuji.
- Setiap endpoint dan Server Action memeriksa kewenangan. CORS bukan pengganti otorisasi.
- Batasi permintaan/kuota unggah, ekspor, undangan, dan AI. Konfigurasi token/cookie mengikuti pola resmi penyedia.
- Respons sensitif tidak masuk cache publik, cache lintas akun, atau cache service worker. Error tidak mengungkap SQL, stack trace, atau rahasia.
- Pisahkan development, preview, dan produksi. Preview tidak otomatis mendapat data/kredensial produksi. Periksa rahasia pada repositori, riwayat, build browser, dan log; rotasi jika bocor.

## 6. Audio dan pemrosesan pascarekaman

- Rekaman hanya pada private bucket dengan ID internal, bukan nama anak.
- Izin unggah terikat satu objek/sesi; validasi format aktual, ukuran, durasi, dan kelengkapan sebelum pemrosesan.
- Tetapkan batas ukuran/durasi sebelum pilot. Rekaman gagal/rusak tidak menjadi skor nol.
- Jangan menimpa rekaman ditinjau secara diam-diam; retry idempoten dan sesi tidak boleh tertukar.
- Mikrofon aktif hanya setelah tindakan pengguna; berhenti saat selesai, dibatalkan, atau sesi ditutup.
- Signed URL diterbitkan setelah otorisasi, berumur sesingkat kebutuhan, dan tidak masuk log. Pencabutan izin tidak menjamin URL yang sudah terbit langsung mati. Jika pencabutan seketika dibutuhkan, gunakan jalur yang memeriksa izin tiap permintaan.
- Analisis hanya menggunakan audio ready dengan hash input yang cocok. Upload gagal atau izin dicabut tidak boleh memicu pengiriman AI.
- Jangan menaruh token jangka panjang dalam URL/log. Keluaran peninjauan guru tidak dikirim ke perangkat siswa lalu sekadar disembunyikan UI.
- Status penyimpanan dan analisis dipisahkan. Gangguan AI tidak mengubah rekaman valid menjadi gagal atau skor nol.
- Uji izin mikrofon, format audio, layar terkunci, perpindahan aplikasi, interupsi telepon, dan koneksi putus di perangkat yang didukung. Deteksi kehilangan rekaman dan jelaskan statusnya; jangan mengklaim tersimpan sebelum server mengonfirmasi.

## 7. AI dan saran tindak lanjut

### Gerbang penyedia

Gemini untuk data anak tetap nonaktif sampai kesesuaian ketentuan layanan dan pemrosesan data terdokumentasi. Persetujuan wali, akun guru, backend, atau pembayaran tidak otomatis menyelesaikan pembatasan penyedia. Pemeriksaan mencakup usia, tujuan penggunaan, penyimpanan, penggunaan pelatihan, peninjauan manusia, transfer data, dan penghapusan. Demo dewasa/sintetis tetap harus memenuhi ketentuan penyedia.

### Batas pemrosesan

- Kirim rekaman dan teks acuan minimum tanpa identitas lengkap bila tidak diperlukan.
- Tidak ada penggunaan pelatihan atau tujuan sekunder tanpa dasar yang sesuai.
- Audio, transkrip, dan teks pengguna adalah data, bukan instruksi. Model tidak memperoleh akses SQL, perubahan izin, atau data siswa lain.
- Validasi struktur, panjang, nilai, dan hubungan hasil dengan sesi/input; tampilkan sebagai teks aman, bukan HTML executable.
- Model pretrained digunakan tanpa training/fine-tuning, hanya setelah rekaman tersimpan. Hasil AI adalah kandidat; ketidakpastian tidak diubah menjadi benar/salah pasti. Akurasi harus dibandingkan dengan penilaian manusia sebelum diandalkan.
- AI tidak menentukan diagnosis, ambang risiko, atau skor tanpa rubrik. Pseudoword awalnya manual.
- Simpan provenance dan jejak tinjauan; hasil terlambat tidak menimpa keputusan manusia.
- Draf tindak lanjut hanya memakai hasil ditinjau serta aturan/narasi ahli atau penulisan manual; AI generatif saran di luar MVP. Draf ditinjau sebelum terbit.
- Profil psikolog berasal dari direktori terverifikasi. Jangan mengarang kredensial atau mengirim laporan hanya karena suatu profil direkomendasikan.
- Kegagalan AI tidak menghalangi alur manual. Retry dibatasi agar tidak menggandakan biaya atau data.

## 8. Integritas asesmen

Latihan berbeda dari materi skrining dan tidak masuk skor. Umpan balik langsung hanya di latihan. Selama skrining siswa tidak menerima benar–salah, jawaban, permintaan mengulang otomatis, atau penanda posisi suara secara default. Perubahan memerlukan dasar prosedur instrumen.

Catat bantuan guru, jeda, kendala teknis, dan penghentian. Bedakan kesulitan antarmuka, kegagalan pengenalan suara, dan kesulitan membaca. Pertahankan versi materi, konfigurasi penyajian, rubrik, anotasi, dan laporan.

## 9. Pembagian dan konsultasi

Izin berbagi mengikat anak, penerima terverifikasi, versi laporan, dan cakupan. Versi baru tidak otomatis dibagikan. Audio mentah dikecualikan secara default. Konsultasi tidak otomatis dapat dibaca guru. Ekspor hanya untuk pihak berwenang dan diaudit. Notifikasi tidak memuat hasil sensitif; arahkan pengguna untuk login. Salinan yang diunduh tidak dapat ditarik kembali secara teknis.

## 10. Operasional

Audit mencatat pelaku, tindakan, objek internal, waktu, dan hasil untuk perubahan akses/persetujuan, akses audio, ekspor, berbagi, tinjauan, penerbitan, penghapusan, dan administrasi. Lindungi log dari perubahan tanpa izin dan batasi pembacanya. Jangan mencatat isi audio/konsultasi, password, token, atau signed URL.

Tetapkan masa simpan setiap kelompok data sebelum pilot. Penghapusan mencakup database, Storage, hasil turunan, serta penyedia sesuai mekanisme yang tersedia. Jelaskan batas backup; pemulihan tidak boleh mengaktifkan ulang data terhapus tanpa penanganan. Uji restore, bukan hanya keberadaan backup.

Tetapkan penanggung jawab dan prosedur insiden: batasi dampak, cabut kredensial, jaga bukti, identifikasi pihak terdampak, penuhi kewajiban pemberitahuan, perbaiki penyebab, lalu uji ulang. Tinjau dependensi dan konfigurasi sebelum rilis. Tidak ada klaim kepatuhan hukum/sertifikasi tanpa bukti; kewajiban pelindungan data anak perlu peninjauan kompeten.

## 11. Checklist validasi sebelum data nyata

- [ ] Akses lintas akun, sekolah, penugasan, anak, dan laporan ditolak pada API/database/Storage.
- [ ] Pengguna tidak dapat menaikkan peran atau mengganti pemilik data.
- [ ] Mode siswa menolak kredensial/jalur guru lama, termasuk koneksi aktif.
- [ ] Tidak ada endpoint streaming AI atau training dalam MVP.
- [ ] Pencabutan izin menghentikan pemrosesan baru dan pekerjaan tertunda; retry memeriksa izin lagi.
- [ ] Upload rusak, duplikat, tertukar, terlalu besar, dan sambung ulang ditangani tanpa kehilangan data valid.
- [ ] Output AI salah format/instruksi berbahaya tidak dieksekusi atau menjadi hasil final.
- [ ] Skrining tidak membocorkan koreksi ke siswa; latihan tidak memengaruhi skor.
- [ ] Tinjauan manusia tidak tertimpa hasil AI terlambat.
- [ ] Pembagian hanya untuk versi/penerima berizin dan tidak membuka konsultasi ke guru.
- [ ] Logout/pergantian akun tidak memperlihatkan data cache sebelumnya.
- [ ] Rahasia tidak ada di browser, repositori, atau log.
- [ ] Retensi, penghapusan, restore, penanggung jawab, dan respons insiden ditetapkan serta diuji.
- [ ] Penyedia AI disetujui secara terdokumentasi atau fitur nonaktif.
- [ ] React/Tailwind responsif tidak mengubah kontrol akses; uji lintas perangkat dan cache akun sebelumnya.
- [ ] Kuota gratis dipantau; billing/upgrade tidak aktif tanpa persetujuan dan kuota habis tidak menghapus data valid.

### Biaya dan layanan gratis

Target MVP Rp0 menggunakan stack PRD: Next.js/React/TypeScript/Tailwind, Node.js, Supabase, dan Vercel. Periksa kelayakan paket, fitur keamanan, kuota, serta email Auth sebelum deployment. Tidak memakai layanan berbayar, metode pembayaran, atau upgrade otomatis tanpa persetujuan. Keamanan tidak boleh dikurangi agar cocok paket gratis; bila kapasitas/fitur tidak cukup, batasi atau tunda penggunaan nyata. Tidak ada jaminan provider AI gratis yang sesuai tersedia; manual wajib tetap berfungsi.

Catat skenario, hasil yang diharapkan, hasil aktual, dan bukti tersanitasi. Periksa isi respons serta efek database, bukan hanya pesan penolakan UI. Selama gerbang ini belum terpenuhi, gunakan data sintetis untuk demonstrasi.

## 12. Acuan untuk implementasi

- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Gemini API terms](https://ai.google.dev/gemini-api/terms)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)

Ketentuan penyedia perlu diperiksa kembali saat pemilihan dan sebelum aktivasi. Daftar acuan bukan bukti bahwa kontrol sudah diterapkan.
