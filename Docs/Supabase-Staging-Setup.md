# Supabase staging: fondasi identitas

## Cakupan

Client browser/server dan proxy refresh sesi tersedia. Proxy bukan otorisasi bisnis; setiap endpoint mendatang tetap harus memeriksa akun, peran, penugasan, dan RLS. Belum ada halaman login, callback OAuth/email, onboarding, atau akses data anak.

## Environment

Di Vercel, proyek khusus staging `https://dyscovery.vercel.app`, environment Production:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Isi nilai aktual, bukan placeholder. Redeploy setelah perubahan. Jangan memakai service-role/secret key. `.env.example` hanya contoh nama variabel; tidak ada nilai rahasia dalam Git.

## Terapkan migrasi (manual, setelah review)

1. Pastikan proyek Supabase yang dipilih adalah staging dan belum memiliki tabel/fungsi dengan nama yang sama. Jika ada, hentikan dan periksa konflik; jangan drop/reset.
2. Buka SQL Editor sebagai operator berwenang.
3. Tinjau dan jalankan isi `supabase/migrations/202610230001_identity.sql` satu kali. Transaksi membuat profil, RLS, izin kolom, serta trigger akun baru; akun lama mendapat profil pending tanpa menyalin metadata role.
4. Catat nama migrasi, waktu, pelaksana, dan hasil pada Implementation-Progress. SQL Editor tidak otomatis mencatat riwayat migrasi CLI; jangan kemudian memakai `db push` tanpa menyelaraskan riwayat terlebih dahulu.
5. Jalankan `supabase/tests/identity.sql` pada staging. Fixture sintetis di-rollback; error assertion berarti uji gagal. Script ini mengasumsikan UUID fixture belum digunakan.
6. Jangan mengaktifkan data anak nyata. Tidak ada operasi cloud yang dijalankan oleh perubahan kode ini.

## Batas model

- Profil dibuat pending dengan role null; user metadata tidak dipercaya untuk otorisasi.
- Pengguna aktif hanya membaca profilnya sendiri dan mengubah full_name/display_name. Mengubah full_name membatalkan identity_confirmed_at.
- verification_status, account_status, role, NIP, dan waktu konfirmasi tidak dapat ditulis langsung oleh authenticated. RPC onboarding yang memvalidasi pernyataan pengguna belum tersedia.
- teacher_profiles adalah data pendukung/profil pengajuan guru, bukan bukti role teacher atau profesi. Barisnya tidak memberi izin apa pun. NIP opsional; regex 18 digit hanya memeriksa format, tidak memverifikasi pemerintah. NIP tidak dibuat unik karena belum ada kebijakan menyelesaikan klaim duplikat.
- Penghapusan akun dibatasi FK restrict; tidak ada cascade penghapusan bukti secara luas.
- Tipe database generated baru ditambahkan setelah skema diterapkan dan hasil generate tersedia; tidak mengklaim tipe manual sebagai hasil generate.

## Pemeriksaan aplikasi

`npm run lint`, `npm run typecheck`, `npm run build`. Pengujian SQL dan refresh sesi riil perlu environment Supabase staging; build saja tidak membuktikan RLS atau autentikasi berfungsi.
