"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import "./landing.css";

export default function LandingPage() {
  const [activeSection, setActiveSection] = useState<string>("");
  const [scrollProgress, setScrollProgress] = useState(0);

  // Scroll-triggered animations and scroll progress observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    const elements = document.querySelectorAll(".lp-scroll-reveal");
    elements.forEach((el) => observer.observe(el));

    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (height > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (winScroll / height) * 100)));
      }

      const sections = ["alur", "peran", "etika"];
      const scrollPosition = window.scrollY + 140;
      for (const sectionId of [...sections].reverse()) {
        const el = document.getElementById(sectionId);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(sectionId);
          return;
        }
      }
      setActiveSection("");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  function handleSmoothScroll(e: React.MouseEvent<HTMLAnchorElement>, targetId: string) {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (!target) return;
    const yOffset = -96; // Offset so section lands comfortably below the floating pill navbar
    const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({
      top: y,
      behavior: "smooth",
    });
    if (window.history?.pushState) {
      window.history.pushState(null, "", `#${targetId}`);
    }
  }

  return (
    <div className="lp-page">
      {/* Floating Capsule / Pill Sticky Navigation Bar (Matching Screenshot Reference) */}
      <div className="lp-navbar-container">
        <header className="lp-pill-navbar" role="banner">
          <Link
            href="/"
            className="lp-pill-brand"
            aria-label="Halaman Beranda Dyscovery"
            onClick={(e) => {
              if (window.location.pathname === "/") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
          >
            <div className="lp-pill-logo-badge">
              <Image src="/brand/logo-symbol.svg" alt="Dyscovery" width={24} height={24} priority />
            </div>
            <div className="lp-pill-brand-text">
              <span className="lp-pill-brand-title">Dyscovery</span>
              <span className="lp-pill-brand-subtitle">Platform Observasi Literasi</span>
            </div>
          </Link>

          <nav aria-label="Navigasi Utama" className="lp-pill-nav">
            <ul className="lp-pill-nav-links">
              <li>
                <a
                  href="#alur"
                  className={`lp-pill-nav-link ${activeSection === "alur" ? "active" : ""}`}
                  onClick={(e) => handleSmoothScroll(e, "alur")}
                >
                  Alur Observasi
                </a>
              </li>
              <li>
                <a
                  href="#peran"
                  className={`lp-pill-nav-link ${activeSection === "peran" ? "active" : ""}`}
                  onClick={(e) => handleSmoothScroll(e, "peran")}
                >
                  Tiga Peran
                </a>
              </li>
              <li>
                <a
                  href="#etika"
                  className={`lp-pill-nav-link ${activeSection === "etika" ? "active" : ""}`}
                  onClick={(e) => handleSmoothScroll(e, "etika")}
                >
                  Prinsip Etis
                </a>
              </li>
            </ul>
          </nav>

          <div className="lp-pill-actions">
            <Link href="/masuk" className="lp-pill-btn-cta">
              Login
            </Link>
          </div>

          {/* Reading Progress Indicator Bar */}
          <div className="lp-pill-progress-track" aria-hidden="true">
            <div className="lp-pill-progress-bar" style={{ width: `${scrollProgress}%` }} />
          </div>
        </header>
      </div>

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
                  Login
                </Link>
                <a
                  href="#alur"
                  className="lp-btn lp-btn-secondary"
                  onClick={(e) => handleSmoothScroll(e, "alur")}
                >
                  Pelajari alur observasi
                </a>
              </div>

              <div className="lp-hero-trust lp-anim-4">
                <span>Diverifikasi operator sekolah</span>
                <span>•</span>
                <span>Observasi kualitatif non-diagnostik</span>
              </div>
            </div>

            {/* Right Column: Clean Piko Mascot Companion Card (No console/module simulation) */}
            <div className="lp-piko-hero-card lp-anim-5" style={{ maxWidth: "100%", padding: "28px 32px", gap: "24px" }}>
              <Image
                src="/mascot/piko-wave.png"
                alt="Piko menyapa"
                width={180}
                height={180}
                className="lp-piko-hero-img lp-piko-animated"
              />
              <div className="lp-piko-hero-text" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <strong style={{ fontSize: "19px", color: "var(--lp-ink-dark)" }}>
                  Petualangan Membaca Bersama Piko
                </strong>
                <span style={{ fontSize: "15px", color: "var(--lp-muted)", lineHeight: 1.55 }}>
                  Maskot ramah yang memandu siswa melewati 4 pos observasi literasi dalam suasana bercerita yang tenang, menyenangkan, dan bebas dari rasa cemas dinilai.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Asymmetric 2-Stage Workflow */}
        <section id="alur" className="lp-section lp-section-alt" aria-labelledby="judul-alur">
          <div className="lp-wrap lp-workflow-layout">
            <div className="lp-workflow-sticky lp-anim-11">
              <div className="lp-section-title-row">
                <h2 id="judul-alur">
                  Empat langkah<br />
                  observasi kelas
                </h2>
                <span className="lp-header-side-pill">Pos 01 — 04</span>
              </div>
              <p>
                Siklus observasi membaca yang melindungi kenyamanan anak dan mempertahankan kendali keputusan di tangan
                guru.
              </p>

              <div className="lp-workflow-piko-note">
                <Image
                  src="/mascot/piko-guide.png"
                  alt="Piko memandu alur"
                  width={160}
                  height={160}
                  className="lp-workflow-piko-img lp-piko-animated"
                />
                <div>
                  <strong>Alur Aman Kelas</strong>
                  <p>Perangkat terkunci PIN saat di tangan siswa. Rekaman hanya dibuka dan diulas di dasbor guru.</p>
                </div>
              </div>
            </div>

            <div className="lp-workflow-stages">
              {/* Stage Block A: Sesi Kelas & Interaksi Siswa */}
              <article className="lp-stage-block lp-scroll-reveal lp-delay-1">
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
                    <span className="lp-tile-box" data-ui="true">I</span>
                    <span className="lp-tile-box" data-ui="true">N</span>
                    <span className="lp-tile-box" data-ui="true">C</span>
                    <span className="lp-tile-box" data-ui="true">I</span>
                  </div>

                  <div style={{ color: "var(--lp-muted)", fontSize: 13, marginTop: 4 }}>
                    Stimulus fonemik taktil tanpa tekanan skor; anak fokus mengenali bentuk dan bunyi huruf.
                  </div>
                </div>
              </article>

              {/* Stage Block B: Telaah Guru & Rujukan */}
              <article className="lp-stage-block lp-scroll-reveal lp-delay-2">
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
            <header className="lp-section-header lp-scroll-reveal">
              <div className="lp-section-title-row">
                <h2 id="judul-peran">
                  Satu laporan untuk<br />
                  tiga pihak
                </h2>
                <span className="lp-header-side-pill">Tiga Ruang Kerja</span>
              </div>
              <p>
                Menjembatani pemahaman kelas, pengasuhan keluarga, dan pandangan tenaga ahli dalam satu wadah yang etis.
              </p>
            </header>

            <div className="lp-roles-asymmetric">
              {/* Featured Role: Guru Kelas with Real UI Picture Fragment */}
              <article className="lp-role-feature lp-scroll-reveal lp-delay-1">
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
                      Fitur Ruang Kerja Guru
                    </span>
                    <span style={{ fontSize: 13, color: "var(--lp-emerald)", fontWeight: 700 }}>
                      Kendali Penuh Pendidik
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontWeight: 800, color: "var(--lp-ink)" }}>
                      Panel Telaah Split-View & Kunci Akses Sesi
                    </div>
                    <div style={{ color: "var(--lp-muted)", fontSize: 13 }}>
                      Dilengkapi pemutar audio lambat 0.75x, draf anotasi fonem otomatis, serta penguncian PIN 4-digit saat perangkat digunakan di kelas.
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, fontWeight: 700 }}>
                    <span style={{ color: "var(--lp-primary)" }}>PIN Akses Terkunci</span>
                    <span>•</span>
                    <span style={{ color: "var(--lp-emerald)" }}>Verifikasi Manual & AI</span>
                  </div>
                </div>
              </article>

              {/* Secondary Roles Stack */}
              <div className="lp-role-stack">
                <article className="lp-role-subcard lp-scroll-reveal lp-delay-2">
                  <span className="lp-role-badge">Keluarga</span>
                  <h3>Orang Tua & Wali</h3>
                  <p>
                    Membaca perkembangan literasi anak dengan bahasa awam yang jelas, mengatur izin berbagi rekaman audio, dan mencabut akses kapan pun.
                  </p>
                </article>

                <article className="lp-role-subcard lp-scroll-reveal lp-delay-3">
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
            <div className="lp-ethics-lead lp-scroll-reveal">
              <div className="lp-section-title-row">
                <h2 id="judul-etika">
                  Prinsip etis dan<br />
                  batasan kerja
                </h2>
                <span className="lp-header-side-pill">Etika Non-Klinis</span>
              </div>
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
              <div className="lp-ethics-item lp-scroll-reveal lp-delay-1">
                <h3>Observasi, bukan diagnosis medis</h3>
                <p>
                  Laporan Dyscovery adalah rangkuman observasi guru kelas mengenai pola membaca, bukan instrumen atau
                  vonis diagnosis klinis.
                </p>
              </div>

              <div className="lp-ethics-item lp-scroll-reveal lp-delay-2">
                <h3>AI hanya memberi kandidat</h3>
                <p>
                  Algoritma kecerdasan buatan hanya menyarankan kemungkinan fonemik; guru tetap memegang wewenang
                  verifikasi akhir secara mutlak.
                </p>
              </div>

              <div className="lp-ethics-item lp-scroll-reveal lp-delay-3">
                <h3>Izin rekaman audio terpisah</h3>
                <p>
                  Berkas suara anak tidak pernah dibagikan ke pihak ketiga kecuali orang tua memilih mengaktifkannya secara
                  sadar dan sukarela.
                </p>
              </div>

              <div className="lp-ethics-item lp-scroll-reveal lp-delay-4">
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
        <section className="lp-close-section lp-scroll-reveal" aria-labelledby="judul-tutup">
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
              Akun pengguna diverifikasi langsung oleh operator sekolah untuk melindungi privasi dan integritas data seluruh
              siswa.
            </p>
            <Link href="/masuk" className="lp-btn lp-btn-primary">
              Login
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
                <a href="#alur" onClick={(e) => handleSmoothScroll(e, "alur")}>Alur Observasi</a>
              </li>
              <li>
                <a href="#peran" onClick={(e) => handleSmoothScroll(e, "peran")}>Tiga Peran</a>
              </li>
              <li>
                <a href="#etika" onClick={(e) => handleSmoothScroll(e, "etika")}>Prinsip Etis</a>
              </li>
              <li>
                <Link href="/masuk">Login</Link>
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
