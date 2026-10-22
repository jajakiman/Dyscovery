# Karakter Maskot Dyscovery: Piko

**Piko** adalah karakter pendamping anak pada antarmuka mode siswa Dyscovery. Piko dirancang untuk memberikan rasa aman, menemani anak selama persiapan dan latihan membaca, serta mengapresiasi partisipasi mereka tanpa menghakimi.

---

## 1. Identitas & Nilai Karakter

- **Nama:** Piko (diambil dari konsep *pocket book* / buku saku yang mungil dan bersahabat).
- **Peran:** Teman belajar yang memandu (*learning buddy*), bukan guru yang menguji atau figur yang menilai benar/salah.
- **Prinsip Ekspresi:**
  - **Non-judgmental:** Tidak memiliki ekspresi sedih, kecewa, menangis, kaget, atau marah saat anak berhenti atau salah membaca.
  - **Bebas Distraksi:** Piko **TIDAK aktif dan disembunyikan** dari area stimulus ketika tugas rekaman membaca sedang berlangsung.

---

## 2. Palet Warna & Anatomi

- **Sampul & Anggota Badan:** Biru tinta `#24476A` (tebal, membulat, ramah).
- **Halaman Wajah:** Putih hangat `#FAF8F4`.
- **Aksen Lipatan Halaman:** Aprikot `#F2B880` di pojok kanan atas (mengikat visual dengan logo utama Dyscovery).
- **Mata & Mulut:** Biru tinta `#24476A`.

---

## 3. Aset 6 Pose Fungsional

Semua file siap pakai telah tersedia di folder web publik: `C:\Dyscovery\public\mascot\`.

| File SVG | File PNG | Nama Pose | Penggunaan pada Web / UI |
|---|---|---|---|
| `piko-wave.svg` | `piko-wave.png` | **1. Menyapa (Wave)** | Layar sambutan mode siswa sebelum asesmen dimulai. |
| `piko-guide.svg` | `piko-guide.png` | **2. Mengarahkan (Guide)** | Layar uji mikrofon dan simulasi tombol latihan. |
| `piko-listen.svg` | `piko-listen.png` | **3. Menyimak Mic (Listen)** | Layar soundcheck uji coba suara mic anak. |
| `piko-rest.svg` | `piko-rest.png` | **4. Menunggu (Rest)** | Saat proses unggah audio, jeda guru, atau sistem memproses. |
| `piko-call-teacher.svg` | `piko-call-teacher.png` | **5. Panggil Guru (Call)** | Saat kendala teknis (mic error / internet putus / minta bantuan). |
| `piko-cheer.svg` | `piko-cheer.png` | **6. Apresiasi (Cheer)** | Layar penutup: *"Hebat sudah mencoba! Panggil Bu/Pak Guru ya."* |
| `mascot-master.svg` | `mascot-master.png` | **Master Netral** | Pose default untuk ikon, avatar siswa, atau referensi desain. |

---

## 4. Panduan Penempatan pada UI (Frontend)

1. **Jalur Akses di Kode Next.js:**
   ```tsx
   <img src="/mascot/piko-wave.svg" alt="Piko menyapa" width={160} height={170} />
   ```
2. **Ukuran Ideal:**
   - Desktop: Tinggi 160–200 px di samping teks dialog instruksi.
   - Mobile: Tinggi 110–130 px di atas card instruksi agar tidak memakan ruang tombol.
3. **Aksesibilitas (A11y):** Berikan atribut `alt="Piko"` atau `aria-hidden="true"` jika teks instruksi di sampingnya sudah dibacakan oleh screen reader.
