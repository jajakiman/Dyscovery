# Dyscovery: panduan aset logo

## Sumber dan keputusan

Logo direkonstruksi dari tiga gambar pemilik di folder ini. Gambar asli dan
draft tetap disimpan. Simbol D dengan halaman mempertahankan identitas literasi;
lipatan aprikot menjadi aksen tunggal. Kontur dibuat solid agar tidak membawa
tekstur raster ke antarmuka. Wordmark dan tagline ditelusuri lalu diperhalus
dengan kurva kuadratik, bukan diganti dengan font yang belum terverifikasi.
Rekonstruksi tidak identik piksel demi piksel dengan gambar sumber.

## Aset web

Master SVG sekaligus aset publik berada di `../../public/brand/`.

| File | Penempatan |
| --- | --- |
| `logo-horizontal.svg` | Navbar desktop, login, header laporan |
| `logo-symbol.svg` | Navbar mobile, area branding sempit |
| `logo-wordmark.svg` | Teks merek tanpa simbol |
| `logo-stacked.svg` | Sampul dan area branding vertikal |
| `logo-with-tagline.svg` | Proposal dan pengenalan berukuran besar |
| `logo-horizontal-white.svg` | Latar biru tinta atau gelap yang memadai |
| `logo-horizontal-black.svg` | Cetak satu warna |
| `logo-symbol-white.svg` | Simbol pada latar gelap |
| `favicon.svg`, `favicon.ico` | Tab browser; tanpa aksen kecil aprikot |
| `apple-touch-icon.png` | Ikon sentuh 180 × 180 |
| `icon-192.png`, `icon-512.png` | Sumber ikon instalasi; bukan ikon maskable |

Saat aplikasi dibangun, URL aset mengikuti pola `/brand/logo-horizontal.svg`.
Konfigurasi metadata situs belum dipasang karena aplikasi belum dibuat.
Jangan memakai gambar referensi berlatar sebagai logo navbar.

## Warna dan ukuran

- Biru tinta `#24476A`: bentuk utama dan wordmark.
- Aprikot `#F2B880`: lipatan halaman saja.
- Putih hangat `#FAF8F4`: latar terang yang dianjurkan.
- Teks tagline `#202C38`; versi terbalik putih `#FFFFFF`.
- Titik awal ruang bebas di luar kanvas: 1/8 tinggi logo.
- Ukuran awal navbar horizontal: lebar 160–200 px; simbol mobile 32–40 px.
- Gunakan favicon monokrom untuk 16 px, bukan logo lengkap.
- Tagline hanya untuk lebar minimal sekitar 480 px; uji pada media sebenarnya.
- Jangan meregangkan, memutar, menambah efek, mengubah jarak elemen, atau
  meletakkan logo di latar ramai. Pertahankan rasio aspek.
- Nama aksesibel gambar logo: `Dyscovery`. Jika di dalam tautan beranda yang
  sudah bernama aksesibel, gambar boleh dekoratif agar tidak dibaca dua kali.

## Pemeriksaan dan batasan

SVG memakai path, tanpa font aktif, gambar tertanam, script, atau sumber eksternal.
Simbol lolos audit geometris otomatis tanpa temuan. Audit wordmark masih memberi
peringatan kompleksitas titik karena bentuk mengikuti gambar sumber; ini bukan
klaim bahwa kurva sudah setara lettering manual profesional.
Preview terang, gelap, susunan vertikal, tagline, dan ukuran ikon tersedia di
`Final-Previews/`. Semua tetap perlu diperiksa kembali pada layout aplikasi nyata.

Asal font gambar belum diketahui. Hak penggunaan sumber dan pemeriksaan merek
belum diverifikasi; konversi ke outline tidak menggantikan izin penggunaan.
Tidak ada klaim registrasi merek atau kesiapan cetak CMYK/Pantone.

## Pemeriksaan ulang

Jalankan dari root proyek:

```powershell
python Docs/Brand/build_logo.py --check
```

Script build memerlukan OpenCV dan NumPy yang telah tersedia di mesin development,
bukan dependensi aplikasi. Build biasa menolak menimpa aset; opsi
`--replace-generated` hanya untuk regenerasi sembilan SVG hasil script ini.
