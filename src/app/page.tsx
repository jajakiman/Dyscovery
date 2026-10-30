import Image from "next/image";
import Link from "next/link";
import "./landing.css";

const steps = [
  ["Siapkan sesi", "Guru memilih siswa dan materi yang sudah disetujui, lalu mengisi persetujuan wali."],
  ["Siswa membaca", "Siswa memakai Mode Siswa sementara tanpa akun. Tidak ada skor di layar anak."],
  ["Guru meninjau", "Guru mendengar rekaman, menandai pengamatan, dan memverifikasi kandidat dari AI."],
  ["Laporan observasi", "Wali menerima ringkasan observasi dan memilih apakah akan berkonsultasi."],
];

const roles = [
  ["Guru", "Menjalankan sesi, meninjau rekaman, dan menerbitkan laporan observasi."],
  ["Wali", "Membaca laporan anak, mengatur izin berbagi, dan mencabutnya kapan saja."],
  ["Psikolog", "Membuka laporan yang dibagikan wali dan menjawab permintaan konsultasi."],
];

const limits = [
  "Laporan adalah observasi guru. Dyscovery tidak memberi diagnosis.",
  "Hasil AI hanya kandidat. Guru yang memutuskan.",
  "Rekaman suara tidak ikut dibagikan kecuali wali memilihnya.",
  "Setiap izin berbagi punya tanggal berakhir.",
];

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-wrap lp-bar">
        <Image src="/brand/logo-horizontal.svg" alt="Dyscovery" width={160} height={40} priority />
        <Link className="btn secondary" href="/masuk">Masuk</Link>
      </header>
      <main>
        <section className="lp-wrap lp-hero" aria-labelledby="judul">
          <div>
            <h1 id="judul">Catat cara anak membaca, bukan cuma skornya.</h1>
            <p>Dyscovery membantu guru kelas 2 mendokumentasikan observasi membaca dan membagikannya ke wali.</p>
            <Link className="btn primary" href="/masuk">Masuk sebagai guru</Link>
          </div>
          <div className="lp-art"><Image src="/mascot/piko-wave.svg" alt="Piko, maskot Dyscovery, melambai" width={280} height={288} priority /></div>
        </section>

        <section className="lp-section" aria-labelledby="alur">
          <div className="lp-wrap">
            <h2 id="alur">Empat langkah dari kelas sampai keluarga</h2>
            <ol className="lp-steps">
              {steps.map(([title, text]) => <li key={title}><h3>{title}</h3><p>{text}</p></li>)}
            </ol>
          </div>
        </section>

        <section className="lp-section" aria-labelledby="peran">
          <div className="lp-wrap">
            <h2 id="peran">Satu laporan, tiga peran</h2>
            <ul className="lp-roles">
              {roles.map(([title, text]) => <li key={title}><h3>{title}</h3><p>{text}</p></li>)}
            </ul>
          </div>
        </section>

        <section className="lp-section lp-limits" aria-labelledby="batas">
          <div className="lp-wrap">
            <h2 id="batas">Yang tidak dilakukan Dyscovery</h2>
            <ul>{limits.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </section>

        <section className="lp-wrap lp-close" aria-labelledby="mulai">
          <h2 id="mulai">Akun guru diverifikasi oleh operator sekolah.</h2>
          <Link className="btn accent" href="/masuk">Masuk sebagai guru</Link>
        </section>
      </main>
      <footer className="lp-wrap lp-foot">Dyscovery mendukung observasi guru dan bukan alat diagnosis klinis.</footer>
    </div>
  );
}
