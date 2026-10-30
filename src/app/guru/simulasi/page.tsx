"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/ui/api";
import { Reading } from "@/app/siswa/reading";

// ponytail: demo-only flow, no device lock and no data saved; remove with DEMO_CHILDREN once PROD has a synthetic seed.
export default function Simulation() {
  const router = useRouter();
  useEffect(() => {
    void api<{ mode?: string }>("/api/teacher-mode/status").then((r) => {
      if (r.status === 401) router.replace("/masuk");
      else if (r.data.mode === "student" || r.data.mode === "locked") router.replace("/siswa");
    });
  }, [router]);
  const back = () => router.replace("/guru/siswa");

  return (
    <div className="student">
      <header className="student-header">
        <div className="header-brand">
          <Image src="/brand/logo-horizontal.svg" alt="Dyscovery" width={180} height={44} priority />
        </div>
        <p className="header-title">Simulasi Alur Membaca Siswa</p>
        <button type="button" className="btn-exit-student" onClick={back}>
          <span>Kembali ke dasbor guru</span>
        </button>
      </header>
      <main className="student-main">
        <Reading demo onExitTeacher={back} fallback={null} />
      </main>
    </div>
  );
}
