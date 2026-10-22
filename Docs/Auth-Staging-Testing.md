# Autentikasi staging: kontrak dan handoff

Status: endpoint backend tersedia, UI belum dibuat. Belum diuji end-to-end pada Supabase/Vercel. Jangan membuka penggunaan nyata atau mengklaim guru terverifikasi.

## Migrasi dan email

1. Pemilik proyek melaporkan migrasi 001 dan uji identity selesai melalui screenshot; agen tidak menjalankan database tersebut.
2. Review lalu jalankan `supabase/migrations/202610230002_onboarding.sql` satu kali pada staging. Jangan mengulang/drop fungsi bila terjadi konflik.
3. Jalankan `supabase/tests/onboarding.sql`; transaksi fixture sintetis di-rollback. Harus selesai tanpa error.
4. Supabase Authentication → Email Templates → Confirm signup: gunakan link berikut untuk template konfirmasi SSR:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Konfirmasi email</a>
```

Site URL harus `https://dyscovery.vercel.app`. Confirm email tetap aktif. Pastikan SMTP/penerima penguji diizinkan. Token/link konfirmasi jangan masuk screenshot/log atau dibagikan. Template reset password tidak diubah; reset password belum diimplementasikan.

## Kontrak endpoint

Semua POST memakai JSON dan header Origin `https://dyscovery.vercel.app`, cookie sesi browser, tanpa cache. Tidak mendukung localhost atau domain preview sebagai origin autentikasi. Origin staging sengaja tetap sampai deployment lain disetujui.

| Endpoint | JSON | Hasil |
|---|---|---|
| POST `/api/auth/register` | `{email,password}` | 202: instruksi konfirmasi generik; tidak mengklaim email baru |
| POST `/api/auth/login` | `{email,password}` | 200 atau 401 generik; baca profile setelah login |
| POST `/api/auth/google` | Tidak diperlukan | `{url}`; frontend harus melakukan navigasi penuh ke URL tersebut |
| POST `/api/auth/logout` | Tidak diperlukan | Logout sesi lokal browser; bukan pencabutan semua JWT langsung |
| GET `/api/auth/profile` | Tidak ada | Email, profil sendiri, suggestedName jika belum punya full_name, needsOnboarding |
| POST `/api/auth/onboarding` | `{fullName,displayName?,nip?,confirmed:true}` | Nama/NIP tersimpan, role tetap null/pending; bukan verifikasi guru |
| GET `/auth/callback` | Kode PKCE dari Google/Supabase | Sesi lalu redirect ke profile JSON sampai UI tersedia |
| GET `/auth/confirm` | token_hash dari email | Sesi lalu redirect ke profile JSON sampai UI tersedia |

Password 8–128 karakter; kebijakan Supabase yang lebih ketat tetap berlaku. NIP string 18 digit atau kosong/null. Nama satu kata dan Unicode diterima; nama Google tidak menimpa identitas tersimpan. Operasi RPC atomik dan mengecek auth.uid serta status aktif; tidak menerima ID pengguna atau role dari browser.

## Verifikasi

Lokal: `node --experimental-strip-types tests/auth-input.test.mjs`, `npm run lint`, `npm run typecheck`, `npm run build`.

Staging setelah deployment dan migrasi: uji pendaftaran+email, password salah, Google dibatalkan, callback tanpa kode, konfirmasi kedaluwarsa, profile tanpa login (401), onboarding tanpa konfirmasi (400), NIP invalid, nama Unicode, role tetap pending/null, perubahan nama membatalkan konfirmasi, logout dan profile ulang. Jangan kirim password/token melalui URL.

## Batas sebelum rilis

- Belum ada UI; endpoint tidak berarti pengalaman login selesai.
- Rate limit Auth Supabase berlaku, tetapi perlindungan abuse aplikasi/kuota onboarding dan pengujian enumeration/rate limit belum lengkap. Harus dituntaskan sebelum registrasi umum/produksi; staging tetap pengujian terbatas.
- Logout lokal tidak membuktikan isolasi perangkat siswa. Mode siswa belum dibuat.
- Tidak ada audit perubahan NIP/konfirmasi saat ini. Audit dan mekanisme verifikasi profesi wajib diselesaikan sebelum data anak nyata.
- Endpoint menggunakan SDK dan bukan privileged key; error vendor tidak dikirim ke pengguna. Error infrastruktur tak terduga masih memerlukan observabilitas tersanitasi di tahap operasional.
