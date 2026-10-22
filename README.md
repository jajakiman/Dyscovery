# Dyscovery

## Pengembangan lokal

Gunakan Node.js 22 (minimal 22.17) dan npm. Versi dependensi dikunci di `package-lock.json`.

```sh
npm ci
npm run dev
```

Buka http://localhost:3000. Halaman awal masih placeholder teknis, bukan dashboard siap pakai.

```sh
npm run lint
npm run typecheck
npm run build
npm start
```

Panduan produk ada di `Docs/`. Status implementasi, batas fitur, dan handoff ada di [Implementation Progress](Docs/Implementation-Progress.md).

Belum ada koneksi Supabase atau autentikasi. Jangan memasukkan data anak nyata. Jangan menyimpan kredensial dalam Git; file `.env*` diabaikan kecuali `.env.example`.
