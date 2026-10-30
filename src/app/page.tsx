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
      {/* Navigation Bar */}
      <header className="lp-wrap lp-bar lp-anim-1">
        <Link href="/" className="lp-brand-link" aria-label="Halaman Beranda Dyscovery">
          <Image src="/brand/logo-horizontal.svg" alt="Dyscovery" width={152} height={36} priority />
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
              {/* No eyebrow kicker */}
              <h1 id="judul-hero" className="lp-anim-1">
                Catat cara membaca,<br />
                bukan cuma skornya.
              </h1>
              <p className="lp-anim-2">
                Dyscovery mendokumentasikan pola membaca siswa kelas 2 melalui rekaman suara dan telaah guru, bukan sekadar
                menghitung tes angka kaku.
              </p>

              <div className="lp-hero-cta lp-anim-3">
                <Link href="/masuk" className="lp-btn lp-btn-primary">
                  Masuk ke Ruang Guru
                </Link>
                <a href="#alur" className="lp-btn lp-btn-secondary">
                  Pelajari alur observasi
                </a>
              </div>

              {/* Piko Hero Feature Card with real raster image (160x160) */}
              <div className="lp-piko-hero-card lp-anim-4">
                <Image
                  src="/mascot/piko-wave.png"
                  alt="Piko menyapa"
                  width={160}
                  height={160}
                  className="lp-piko-hero-img lp-piko-animated"
                />
                <div className="lp-piko-hero-text">
                  <strong>Didampingi Piko:</strong> Maskot ramah yang memandu siswa melewati 4 pos membaca tanpa rasa takut atau cemas dinilai.
                </div>
              </div>

              <div className="lp-hero-trust lp-anim-5">
                <span>Diverifikasi operator sekolah</span>
                <span>•</span>
                <span>Observasi kualitatif non-diagnostik</span>
              </div>
            </div>

            {/* Master Interactive Analytics Console (Fragment data-ui="true") */}
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
                  <span className="lp-pulse-indicator" data-ui="true" />
                  <span>Sesi Observasi Aktif</span>
                </div>
              </div>

              {/* Audio Waveform Panel */}
              <div className="lp-audio-panel lp-anim-7" data-ui="true">
                <div className="lp-audio-controls" data-ui="true">
                  <div className="lp-audio-left" data-ui="true">
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
                      <div className="lp-audio-time-row" data-ui="true">
                        <span>
                          00:{currentTimeSec < 10 ? `0${currentTimeSec}` : currentTimeSec} / 00:32
                        </span>
                        <span>•</span>
                        <span>{selectedStudent.title}</span>
                      </div>
                      <span className="lp-audio-title" data-ui="true">
                        {isPlaying ? "Memutar audio bacaan siswa..." : "Tekan putar untuk simulasi suara"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Image
                      src="/mascot/piko-listen.png"
                      alt="Piko mendengarkan"
                      width={38}
                      height={38}
                      className={isPlaying ? "lp-piko-animated" : ""}
                    />
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
                </div>

                {/* Animated Waveform Bars */}
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
                      className={`lp-wave-bar ${i <= activeWaveBarIdx ? "active" : ""} ${isPlaying ? "playing" : ""}`}
                      style={{
                        height: `${height}%`,
                        animationDelay: isPlaying ? `${(i % 10) * 0.08}s` : undefined,
                      }}
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
                      <Image src="/mascot/piko-cheer.png" alt="" width={22} height={22} />
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

        {/* Section 2: Asymmetric 2-Stage Workflow */}
        <section id="alur" className="lp-section lp-section-alt" aria-labelledby="judul-alur">
          <div className="lp-wrap lp-workflow-layout">
            <div className="lp-workflow-sticky lp-anim-11">
              <h2 id="judul-alur">
                Empat langkah dari kelas<br />
                sampai keluarga
              </h2>
              <p>
                Siklus observasi membaca yang melindungi kenyamanan anak dan mempertahankan kendali keputusan di tangan
                guru.
              </p>

              <div className="lp-workflow-piko-note">
                <Image
                  src="/mascot/piko-guide.png"
                  alt="Piko memandu alur"
                  width={120}
                  height={120}
                  className="lp-piko-animated"
                />
                <div>
                  <strong>Alur Aman Kelas</strong>
                  <p>Perangkat terkunci PIN saat di tangan siswa. Rekaman hanya dibuka dan diulas di dasbor guru.</p>
                </div>
              </div>
            </div>

            <div className="lp-workflow-stages">
              {/* Stage Block A: Sesi Kelas & Interaksi Siswa */}
              <article className="lp-stage-block lp-anim-12">
                <div className="lp-stage-header">
                  <span className="lp-stage-badge">Fase 1: Pendampingan Kelas</span>
                  <h3 className="lp-stage-title">Persiapan Sesi & Mode Siswa Taktil</h3>
                  <p className="lp-stage-desc">
                    Guru mengunci perangkat dengan PIN 4-digit agar siswa tetap berada dalam alur asesmen. Siswa membaca secara nyaman tanpa distraksi akun atau angka skor.
                  </p>
                </div>
                <div className="lp-step-preview" data-ui="true">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="lp-preview-tag" data-ui="true">
                      Proteksi Layar & Huruf Taktil
                    </span>
                    <span style={{ fontSize: 13, color: "var(--lp-muted)", fontWeight: 700 }}>
                      Pos 01 & Pos 02
                    </span>
                  </div>

                  <div style={{ color: "var(--lp-ink)", fontWeight: 700, margin: "4px 0" }}>
                    Fokus belajar tanpa distraksi luar
                  </div>

                  <div className="lp-preview-tiles" data-ui="true">
                    <span className="lp-tile-box" data-ui="true">K</span>
                    <span className="lp-tile-box" data-ui="true">E</span>
                    <span className="lp-tile-box" data-ui="true">L</span>
                    <span className="lp-tile-box" data-ui="true">A</span>
                    <span className="lp-tile-box" data-ui="true">P</span>
                    <span className="lp-tile-box" data-ui="true">A</span>
                  </div>

                  <div style={{ color: "var(--lp-muted)", fontSize: 13, marginTop: 4 }}>
                    Stimulus fonemik taktil tanpa tekanan skor; anak fokus mengenali bentuk dan bunyi huruf.
                  </div>
                </div>
              </article>

              {/* Stage Block B: Telaah Guru & Rujukan */}
              <article className="lp-stage-block lp-anim-13">
                <div className="lp-stage-header">
                  <span className="lp-stage-badge">Fase 2: Analisis & Kolaborasi</span>
                  <h3 className="lp-stage-title">Telaah Audio 0.75x & Rujukan Terarah</h3>
                  <p className="lp-stage-desc">
                    Guru mendengarkan rekaman suara anak dengan perlambatan audio, memverifikasi saran kandidat fonem dari AI, dan menyiapkan laporan berbatas waktu.
                  </p>
                </div>

                <div className="lp-step-preview" data-ui="true">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="lp-preview-tag" data-ui="true">
                      Pemutaran Lambat & Tautan Aman
                    </span>
                    <span style={{ fontSize: 13, color: "var(--lp-emerald)", fontWeight: 700 }}>
                      Pos 03 & Pos 04
                    </span>
                  </div>

                  <div style={{ color: "var(--lp-ink)", fontWeight: 800 }}>
                    Waveform visual & anotasi fonem tersinkronisasi
                  </div>

                  <div style={{ color: "var(--lp-muted)", fontSize: 13 }}>
                    Tautan berbagi aman ke wali & rujukan psikolog terverifikasi STR (kedaluwarsa otomatis 7 hari).
                  </div>

                  <div style={{ color: "var(--lp-blue)", fontWeight: 700, fontSize: 13, marginTop: 2 }}>
                    Opsi Rujukan: Psikolog Klinis Terverifikasi STR
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Section 3: Three Roles (Asymmetric Spotlight Layout) */}
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

            <div className="lp-roles-asymmetric">
              {/* Featured Role: Guru Kelas with Real UI Picture Fragment */}
              <article className="lp-role-feature lp-anim-14">
                <span className="lp-role-badge">Pendidik Utama</span>
                <h3>Dasbor Guru Kelas</h3>
                <p>
                  Menjalankan sesi membaca, meninjau rekaman audio dengan cermat, menandai kesulitan fonem, dan memvalidasi
                  catatan observasi siswa.
                </p>

                {/* Additional UI Picture Fragment (data-ui="true", >= 300x200) */}
                <div className="lp-role-ui-fragment" data-ui="true">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="lp-preview-tag" data-ui="true">
                      Lembar Observasi Sesi #04
                    </span>
                    <span style={{ fontSize: 13, color: "var(--lp-emerald)", fontWeight: 700 }}>
                      Terverifikasi Guru
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontWeight: 800, color: "var(--lp-ink)" }}>
                      Bima Aditia • Kelas 2A (Membaca Mandiri)
                    </div>
                    <div style={{ color: "var(--lp-muted)", fontSize: 13 }}>
                      Catatan: Siswa lancar pada suku kata terbuka, pengulangan fonem /p/ terverifikasi mandiri.
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, fontWeight: 700 }}>
                    <span style={{ color: "var(--lp-primary)" }}>Kelancaran: 48 KPM</span>
                    <span>•</span>
                    <span style={{ color: "var(--lp-emerald)" }}>Akurasi: 94%</span>
                  </div>
                </div>
              </article>

              {/* Secondary Roles Stack */}
              <div className="lp-role-stack">
                <article className="lp-role-subcard lp-anim-15">
                  <span className="lp-role-badge">Keluarga</span>
                  <h3>Orang Tua & Wali</h3>
                  <p>
                    Membaca perkembangan literasi anak dengan bahasa awam yang jelas, mengatur izin berbagi rekaman audio, dan mencabut akses kapan pun.
                  </p>
                </article>

                <article className="lp-role-subcard lp-anim-16">
                  <span className="lp-role-badge">Tenaga Ahli</span>
                  <h3>Psikolog Mitra</h3>
                  <p>
                    Mempelajari laporan observasi yang dibagikan secara resmi oleh wali untuk memberikan arahan pendukung yang terarah dan non-vonis.
                  </p>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Ethical Guardrails — Narrative Split */}
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

              {/* Piko Teacher Guidance Box with raster image (160x160) */}
              <div className="lp-piko-ethics-box">
                <Image
                  src="/mascot/piko-call-teacher.png"
                  alt="Piko memanggil guru"
                  width={160}
                  height={160}
                  className="lp-piko-ethics-img lp-piko-animated"
                />
                <div className="lp-piko-ethics-text">
                  <strong>Didampingi Guru:</strong> Piko dan AI adalah alat bantu pendukung pengamatan. Seluruh verifikasi akhir dan keputusan bimbingan tetap berada di tangan guru.
                </div>
              </div>
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
              width={160}
              height={160}
              className="lp-close-piko lp-piko-animated"
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
              <Image src="/brand/logo-horizontal.svg" alt="Dyscovery" width={140} height={32} />
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
