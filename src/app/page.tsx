"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import "./landing.css";

interface StudentSample {
  id: string;
  name: string;
  grade: string;
  title: string;
  syllables: string[];
  candidatePhoneme: string;
  candidateDesc: string;
  wordsPerMinute: number;
  initialAccuracy: number;
}

const SAMPLES: StudentSample[] = [
  {
    id: "bima",
    name: "Bima Aditia",
    grade: "Kelas 2A",
    title: "Kelapa di Pantai",
    syllables: ["Ke", "la", "pa", "tum", "buh", "di", "pan", "tai"],
    candidatePhoneme: "Fonem /p/ pada 'pan-tai'",
    candidateDesc: "Kandidat pelafalan fonem terdeteksi akurat pada detik 00:12",
    wordsPerMinute: 48,
    initialAccuracy: 94,
  },
  {
    id: "ayu",
    name: "Ayu Rahma",
    grade: "Kelas 2B",
    title: "Sepeda Roda Dua",
    syllables: ["Se", "pe", "da", "ba", "ru", "wa", "rna", "bi", "ru"],
    candidatePhoneme: "Fonem /b/ dan /d/ pada 'ro-da'",
    candidateDesc: "Kandidat fonem terbaca lancar tanpa substitusi huruf terbalik",
    wordsPerMinute: 52,
    initialAccuracy: 96,
  },
];

const WAVE_BARS = [
  24, 38, 55, 72, 45, 60, 85, 95, 65, 40, 75, 90, 80, 50, 65, 88, 100, 78, 62, 84, 92, 58, 42, 68, 75, 48, 62, 80,
  55, 40, 30, 20,
];

export default function LandingPage() {
  const [selectedStudent, setSelectedStudent] = useState<StudentSample>(SAMPLES[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(14);
  const [speed, setSpeed] = useState<"0.75x" | "1.0x">("1.0x");
  const [isVerified, setIsVerified] = useState(false);

  // Playback simulation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTimeSec((prev) => {
        if (prev >= 32) return 0;
        return prev + 1;
      });
    }, speed === "0.75x" ? 1300 : 1000);
    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  function handleSelectStudent(student: StudentSample) {
    setSelectedStudent(student);
    setIsVerified(false);
    setCurrentTimeSec(14);
  }

  function togglePlay() {
    setIsPlaying((prev) => !prev);
  }

  function toggleSpeed() {
    setSpeed((prev) => (prev === "1.0x" ? "0.75x" : "1.0x"));
  }

  function handleVerifyCandidate() {
    setIsVerified(true);
  }

  const activeSyllableIdx = Math.floor((currentTimeSec / 32) * selectedStudent.syllables.length);
  const activeWaveBarIdx = Math.floor((currentTimeSec / 32) * WAVE_BARS.length);

  return (
    <div className="lp-page">
      {/* Dealt Font: Schibsted Grotesk */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* Navigation Bar */}
      <header className="lp-wrap lp-bar lp-anim-1">
        <Link href="/" className="lp-brand-link" aria-label="Halaman Beranda Dyscovery">
          <Image src="/brand/logo-horizontal-white.svg" alt="Dyscovery" width={152} height={36} priority />
        </Link>

        <nav aria-label="Navigasi Utama">
          <ul className="lp-nav-links">
            <li>
              <a href="#alur" className="lp-nav-link">
                Alur Observasi
              </a>
            </li>
            <li>
              <a href="#peran" className="lp-nav-link">
                Tiga Peran
              </a>
            </li>
            <li>
              <a href="#etika" className="lp-nav-link">
                Prinsip Etis
              </a>
            </li>
          </ul>
        </nav>

        <div className="lp-nav-actions">
          <Link href="/masuk" className="lp-btn lp-btn-secondary">
            Masuk sebagai guru
          </Link>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="lp-hero-section" aria-labelledby="judul-hero">
          <div className="lp-wrap lp-hero-grid">
            <div className="lp-hero-copy">
              <h1 id="judul-hero" className="lp-anim-2">
                Catat cara anak membaca,<br />
                bukan cuma skornya.
              </h1>
              <p className="lp-anim-3">
                Dyscovery mendokumentasikan pola membaca siswa kelas 2 melalui rekaman audio dan telaah guru, bukan sekadar
                menghitung tes angka.
              </p>

              <div className="lp-hero-cta lp-anim-4">
                <Link href="/masuk" className="lp-btn lp-btn-primary">
                  Masuk ke Ruang Guru
                </Link>
                <a href="#alur" className="lp-btn lp-btn-secondary">
                  Pelajari alur observasi
                </a>
              </div>

              <div className="lp-hero-trust lp-anim-5">
                <span>Diverifikasi operator sekolah</span>
                <span>•</span>
                <span>Observasi kualitatif non-diagnostik</span>
              </div>
            </div>

            {/* Master Interactive Analytics Console (Fragment data-ui) */}
            <div className="lp-console-stage lp-anim-6" data-ui="true" aria-label="Pratinjau Konsol Observasi Guru">
              <div className="lp-console-head" data-ui="true">
                <div className="lp-console-tabs" data-ui="true" role="tablist" aria-label="Pilih sampel siswa">
                  {SAMPLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="tab"
                      aria-selected={selectedStudent.id === s.id}
                      className={`lp-console-tab ${selectedStudent.id === s.id ? "active" : ""}`}
                      onClick={() => handleSelectStudent(s)}
                      data-ui="true"
                    >
                      {s.name} ({s.grade})
                    </button>
                  ))}
                </div>

                <div className="lp-console-badge" data-ui="true">
                  <span className="lp-console-dot" data-ui="true" />
                  <span>Sesi Observasi Aktif</span>
                </div>
              </div>

              {/* Audio Waveform Panel */}
              <div className="lp-audio-panel lp-anim-7" data-ui="true">
                <div className="lp-audio-controls" data-ui="true">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                      type="button"
                      className="lp-play-btn"
                      onClick={togglePlay}
                      aria-label={isPlaying ? "Jeda rekaman" : "Putar rekaman"}
                      data-ui="true"
                    >
                      {isPlaying ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}>
                          <path d="M5 3l14 9-14 9V3z" />
                        </svg>
                      )}
                    </button>
                    <div className="lp-audio-meta" data-ui="true">
                      <span>
                        00:{currentTimeSec < 10 ? `0${currentTimeSec}` : currentTimeSec} / 00:32
                      </span>
                      <span>•</span>
                      <span>{selectedStudent.title}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="lp-speed-toggle"
                    onClick={toggleSpeed}
                    aria-label={`Ubah kecepatan audio. Saat ini ${speed}`}
                    data-ui="true"
                  >
                    Kecepatan {speed}
                  </button>
                </div>

                <div
                  className="lp-waveform-track"
                  data-ui="true"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    setCurrentTimeSec(Math.round(ratio * 32));
                  }}
                  title="Klik untuk mencari posisi audio"
                >
                  {WAVE_BARS.map((height, i) => (
                    <div
                      key={i}
                      className={`lp-wave-bar ${i <= activeWaveBarIdx ? "active" : ""}`}
                      style={{ height: `${height}%` }}
                      data-ui="true"
                    />
                  ))}
                </div>
              </div>

              {/* Synchronized Reading Stimulus Text */}
              <div className="lp-stimulus-box lp-anim-8" data-ui="true">
                <span className="lp-stimulus-label" data-ui="true">
                  Teks bacaan terverifikasi (Sinkronisasi audio membaca):
                </span>
                <div className="lp-stimulus-text" data-ui="true">
                  {selectedStudent.syllables.map((syl, idx) => (
                    <span
                      key={idx}
                      className={`lp-syllable ${idx === activeSyllableIdx ? "highlight" : ""}`}
                      data-ui="true"
                    >
                      {syl}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Candidate Callout */}
              <div className="lp-candidate-card lp-anim-9" data-ui="true">
                <div className="lp-candidate-info" data-ui="true">
                  <div className="lp-candidate-title" data-ui="true">
                    Kandidat AI: {selectedStudent.candidatePhoneme}
                  </div>
                  <div className="lp-candidate-desc" data-ui="true">
                    {selectedStudent.candidateDesc}
                  </div>
                </div>

                <div className="lp-candidate-actions" data-ui="true">
                  {isVerified ? (
                    <span className="lp-candidate-btn verified" data-ui="true">
                      Diverifikasi Guru
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="lp-candidate-btn verify"
                      onClick={handleVerifyCandidate}
                      data-ui="true"
                    >
                      Setujui Anotasi
                    </button>
                  )}
                </div>
              </div>

              {/* Metrics Row */}
              <div className="lp-metrics-row lp-anim-10" data-ui="true">
                <div className="lp-metric-card" data-ui="true">
                  <span className="lp-metric-num" data-ui="true">
                    {selectedStudent.wordsPerMinute} KPM
                  </span>
                  <span className="lp-metric-label" data-ui="true">
                    Kelancaran kata per menit kelas 2
                  </span>
                </div>
                <div className="lp-metric-card" data-ui="true">
                  <span className="lp-metric-num" data-ui="true">
                    {isVerified ? selectedStudent.initialAccuracy + 2 : selectedStudent.initialAccuracy}%
                  </span>
                  <span className="lp-metric-label" data-ui="true">
                    Akurasi fonemik terverifikasi
                  </span>
                </div>
                <div className="lp-metric-card" data-ui="true">
                  <span className="lp-metric-num" data-ui="true">
                    0 Label
                  </span>
                  <span className="lp-metric-label" data-ui="true">
                    Observasi murni non-klinis
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Four Steps Bento Grid */}
        <section id="alur" className="lp-section lp-section-alt" aria-labelledby="judul-alur">
          <div className="lp-wrap">
            <header className="lp-section-header lp-anim-11">
              <h2 id="judul-alur">
                Empat langkah dari kelas<br />
                sampai keluarga
              </h2>
              <p>
                Siklus observasi membaca yang melindungi kenyamanan anak dan mempertahankan kendali keputusan di tangan
                guru.
              </p>
            </header>

            <div className="lp-bento-grid">
              {/* Step 1 */}
              <article className="lp-bento-card lp-anim-12">
                <div className="lp-bento-content">
                  <h3>Persiapan Sesi & Izin Wali</h3>
                  <p>
                    Guru memilih siswa dan materi terakreditasi sebelum sesi dimulai, memastikan izin orang tua telah aktif
                    dan aman.
                  </p>
                </div>
                <div className="lp-bento-preview" data-ui="true">
                  <span className="lp-preview-tag" data-ui="true">
                    Izin Observasi Aktif
                  </span>
                  <div style={{ color: "var(--lp-muted)" }}>
                    PIN Kunci Layar Siswa (Mencegah keluar alur):
                  </div>
                  <div className="lp-preview-pin" data-ui="true">
                    <span className="lp-pin-box" data-ui="true">8</span>
                    <span className="lp-pin-box" data-ui="true">3</span>
                    <span className="lp-pin-box" data-ui="true">1</span>
                    <span className="lp-pin-box" data-ui="true">5</span>
                  </div>
                  <div style={{ color: "var(--lp-muted)", marginTop: 4 }}>
                    Sesi terlindungi dalam ruang kelas tanpa distraksi web luar.
                  </div>
                </div>
              </article>

              {/* Step 2 */}
              <article className="lp-bento-card lp-anim-13">
                <div className="lp-bento-content">
                  <h3>Mode Siswa Tanpa Akun</h3>
                  <p>
                    Siswa membaca di perangkat tanpa perlu membuat akun. Tidak ada skor, hitung mundur, atau angka yang
                    menekan anak.
                  </p>
                </div>
                <div className="lp-bento-preview" data-ui="true">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="lp-preview-tag" data-ui="true">
                      Stimulus Fonemik Taktil
                    </span>
                    <Image
                      src="/mascot/piko-guide.png"
                      alt="Piko memandu"
                      width={52}
                      height={52}
                      style={{ borderRadius: 8 }}
                    />
                  </div>
                  <div style={{ color: "var(--lp-muted)" }}>
                    Huruf taktil 3D ramah anak:
                  </div>
                  <div className="lp-preview-tiles" data-ui="true">
                    <span className="lp-tile-box" data-ui="true">K</span>
                    <span className="lp-tile-box" data-ui="true">E</span>
                    <span className="lp-tile-box" data-ui="true">L</span>
                    <span className="lp-tile-box" data-ui="true">A</span>
                    <span className="lp-tile-box" data-ui="true">P</span>
                    <span className="lp-tile-box" data-ui="true">A</span>
                  </div>
                </div>
              </article>

              {/* Step 3 */}
              <article className="lp-bento-card lp-anim-14">
                <div className="lp-bento-content">
                  <h3>Guru Meninjau Rekaman & AI</h3>
                  <p>
                    Guru mendengar rekaman audio dengan kecepatan 0.75x, menandai pengamatan, dan memverifikasi rekomendasi
                    kandidat dari AI.
                  </p>
                </div>
                <div className="lp-bento-preview" data-ui="true">
                  <span className="lp-preview-tag" data-ui="true">
                    Telaah Pemutaran 0.75x
                  </span>
                  <div style={{ color: "var(--lp-ink)", fontWeight: 600 }}>
                    Waveform visual & anotasi fonem tersinkronisasi
                  </div>
                  <div style={{ color: "var(--lp-muted)" }}>
                    AI hanya memberi saran awal; guru memegang verifikasi akhir.
                  </div>
                  <div style={{ color: "var(--lp-emerald)", fontWeight: 600, marginTop: 4 }}>
                    Status: Siap Ditelaah Guru
                  </div>
                </div>
              </article>

              {/* Step 4 */}
              <article className="lp-bento-card lp-anim-15">
                <div className="lp-bento-content">
                  <h3>Laporan Observasi Terstruktur</h3>
                  <p>
                    Keluarga menerima ringkasan catatan kualitatif, panduan pendampingan di rumah, dan opsi konsultasi
                    profesional berbatas waktu.
                  </p>
                </div>
                <div className="lp-bento-preview" data-ui="true">
                  <span className="lp-preview-tag" data-ui="true">
                    Privasi Berbatas Waktu
                  </span>
                  <div style={{ color: "var(--lp-ink)", fontWeight: 600 }}>
                    Tautan berbagi aman (Kedaluwarsa otomatis 7 hari)
                  </div>
                  <div style={{ color: "var(--lp-muted)" }}>
                    Rekaman suara tidak ikut dibagikan kecuali wali memilihnya.
                  </div>
                  <div style={{ color: "var(--lp-accent)", fontWeight: 600, marginTop: 4 }}>
                    Opsi Rujukan: Psikolog Terverifikasi STR
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Section 3: Three Roles (Asymmetric Row) */}
        <section id="peran" className="lp-section" aria-labelledby="judul-peran">
          <div className="lp-wrap">
            <header className="lp-section-header">
              <h2 id="judul-peran">
                Satu laporan untuk<br />
                tiga pihak
              </h2>
              <p>
                Menjembatani pemahaman kelas, pengasuhan keluarga, dan pandangan tenaga ahli dalam satu wadah yang etis.
              </p>
            </header>

            <div className="lp-roles-row">
              <article className="lp-role-panel featured">
                <span className="lp-role-badge">Pendidik</span>
                <h3>Guru Kelas</h3>
                <p>
                  Menjalankan sesi membaca, meninjau rekaman audio dengan cermat, menandai kesulitan fonem, dan menyusun
                  catatan kualitatif.
                </p>
              </article>

              <article className="lp-role-panel">
                <span className="lp-role-badge">Keluarga</span>
                <h3>Orang Tua & Wali</h3>
                <p>
                  Membaca perkembangan literasi anak dengan bahasa awam yang jelas, mengatur izin berbagi, dan mencabut akses
                  kapan pun.
                </p>
              </article>

              <article className="lp-role-panel">
                <span className="lp-role-badge">Tenaga Ahli</span>
                <h3>Psikolog Mitra</h3>
                <p>
                  Mempelajari laporan observasi yang dibagikan secara resmi oleh wali untuk memberikan arahan pendukung yang
                  terarah.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Section 4: Ethical Guardrails — Narrative Split (No icon cards) */}
        <section id="etika" className="lp-section lp-section-alt" aria-labelledby="judul-etika">
          <div className="lp-wrap lp-ethics-split">
            <div className="lp-ethics-lead">
              <h2 id="judul-etika">
                Prinsip etis dan<br />
                batasan kerja
              </h2>
              <p>
                Dyscovery dirancang khusus untuk mendukung pendidik tanpa menggantikan peran manusia. Kami menetapkan
                batasan tegas demi perlindungan privasi anak dan akurasi observasi literasi.
              </p>
            </div>

            <div className="lp-ethics-list">
              <div className="lp-ethics-item">
                <h3>Observasi, bukan diagnosis medis</h3>
                <p>
                  Laporan Dyscovery adalah rangkuman observasi guru kelas mengenai pola membaca, bukan instrumen atau
                  vonis diagnosis klinis.
                </p>
              </div>

              <div className="lp-ethics-item">
                <h3>AI hanya memberi kandidat</h3>
                <p>
                  Algoritma kecerdasan buatan hanya menyarankan kemungkinan fonemik; guru tetap memegang wewenang
                  verifikasi akhir secara mutlak.
                </p>
              </div>

              <div className="lp-ethics-item">
                <h3>Izin rekaman audio terpisah</h3>
                <p>
                  Berkas suara anak tidak pernah dibagikan ke pihak ketiga kecuali orang tua memilih mengaktifkannya secara
                  sadar dan sukarela.
                </p>
              </div>

              <div className="lp-ethics-item">
                <h3>Akses berbagi berbatas waktu</h3>
                <p>
                  Setiap tautan berbagi laporan ke psikolog memiliki batas waktu kedaluwarsa otomatis dan dapat dicabut
                  sewaktu-waktu oleh wali.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Closing CTA */}
        <section className="lp-close-section" aria-labelledby="judul-tutup">
          <div className="lp-wrap lp-close-wrap">
            <Image
              src="/mascot/piko-cheer.png"
              alt="Piko memberi semangat"
              width={120}
              height={120}
              className="lp-anim-16"
            />
            <h2 id="judul-tutup">
              Dampingi literasi anak<br />
              dengan bukti nyata.
            </h2>
            <p>
              Akun guru diverifikasi langsung oleh operator sekolah untuk melindungi privasi dan integritas data seluruh
              siswa.
            </p>
            <Link href="/masuk" className="lp-btn lp-btn-primary">
              Masuk sebagai guru
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="lp-footer" role="contentinfo">
        <div className="lp-wrap">
          <div className="lp-footer-content">
            <Link href="/" aria-label="Halaman Beranda Dyscovery">
              <Image src="/brand/logo-horizontal-white.svg" alt="Dyscovery" width={140} height={32} />
            </Link>

            <ul className="lp-footer-links">
              <li>
                <a href="#alur">Alur Observasi</a>
              </li>
              <li>
                <a href="#peran">Tiga Peran</a>
              </li>
              <li>
                <a href="#etika">Prinsip Etis</a>
              </li>
              <li>
                <Link href="/masuk">Masuk Ruang Guru</Link>
              </li>
            </ul>
          </div>

          <div className="lp-footer-disclaimer">
            Dyscovery mendukung observasi literasi guru kelas 2 dan bukan merupakan instrumen diagnosis klinis medis.
          </div>
        </div>
      </footer>
    </div>
  );
}
