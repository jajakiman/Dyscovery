"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/ui/api";
import { Modal } from "@/lib/ui/modal";

interface UserProfileData {
  email: string;
  fullName: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
}

export function UserProfileMenu() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfileData>({
    email: "guru@sekolah.sch.id",
    fullName: "Guru Kelas 2",
    displayName: "Guru",
    avatarUrl: null,
    role: "Guru Kelas 2A",
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  // Form edit state
  const [formFullName, setFormFullName] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formAvatarUrl, setFormAvatarUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const popoverRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load profile on mount
  useEffect(() => {
    let alive = true;
    void api<{
      email?: string;
      profile?: { full_name?: string; display_name?: string; product_role?: string };
      avatarUrl?: string | null;
    }>("/api/auth/profile").then((res) => {
      if (!alive || !res.ok) return;
      const fn = res.data.profile?.full_name || "Guru Kelas 2";
      const dn = res.data.profile?.display_name || fn.split(" ")[0] || "Guru";
      const em = res.data.email || "guru@sekolah.sch.id";
      const av = res.data.avatarUrl || null;
      const rl = ({ teacher: "Guru Kelas 2A", guardian: "Orang Tua / Wali", psychologist: "Psikolog Mitra", operator: "Operator Sekolah" } as Record<string, string>)[res.data.profile?.product_role ?? ""] ?? "Pengguna";

      setUser({ email: em, fullName: fn, displayName: dn, avatarUrl: av, role: rl });
      setFormFullName(fn);
      setFormDisplayName(dn);
      setFormAvatarUrl(av);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Close floating popover when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  // Generate initials for avatar fallback (e.g. "Budi Santoso" -> "BS", "Guru" -> "GR")
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "GR";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Compress and handle file upload as a clean data URL
  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Format berkas harus berupa gambar (JPG, PNG, atau WEBP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("Ukuran foto maksimal 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize to maximum 160x160 to keep storage small and snappy
        const canvas = document.createElement("canvas");
        const maxDim = 160;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setFormAvatarUrl(resizedDataUrl);
          setErrorMsg("");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleOpenProfileModal() {
    setMenuOpen(false);
    setFormFullName(user.fullName);
    setFormDisplayName(user.displayName);
    setFormAvatarUrl(user.avatarUrl);
    setErrorMsg("");
    setSuccessMsg("");
    setProfileModalOpen(true);
  }

  function handleOpenLogoutModal() {
    setMenuOpen(false);
    setLogoutModalOpen(true);
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!formFullName.trim()) {
      setErrorMsg("Nama lengkap wajib diisi.");
      return;
    }

    setBusy(true);
    setErrorMsg("");
    setSuccessMsg("");

    const res = await api<{
      profile?: { full_name?: string; display_name?: string };
      avatarUrl?: string | null;
      message?: string;
    }>(
      "/api/auth/profile",
      {
        fullName: formFullName.trim(),
        displayName: formDisplayName.trim() || formFullName.trim(),
        avatarUrl: formAvatarUrl,
      },
      { method: "PATCH" }
    );

    setBusy(false);

    if (!res.ok) {
      setErrorMsg(res.data.error ?? "Gagal menyimpan perubahan profil.");
      return;
    }

    // Update parent state
    const newFn = res.data.profile?.full_name || formFullName.trim();
    const newDn = res.data.profile?.display_name || formDisplayName.trim() || newFn.split(" ")[0];
    const newAv = res.data.avatarUrl !== undefined ? res.data.avatarUrl : formAvatarUrl;

    setUser((prev) => ({
      ...prev,
      fullName: newFn,
      displayName: newDn,
      avatarUrl: newAv,
    }));

    setSuccessMsg("Profil berhasil diperbarui.");
    setTimeout(() => {
      setProfileModalOpen(false);
      setSuccessMsg("");
    }, 900);
  }

  async function handleConfirmLogout() {
    setBusy(true);
    await api("/api/auth/logout", {});
    router.replace("/masuk");
  }

  return (
    <div className="user-profile-menu-container" ref={popoverRef}>
      {/* Avatar Button Trigger */}
      <button
        type="button"
        className="user-badge-trigger"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-haspopup="true"
        aria-expanded={menuOpen}
        aria-label="Menu profil pengguna"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="user-badge-avatar-img"
          />
        ) : (
          <span className="user-badge-initials">{getInitials(user.displayName || user.fullName)}</span>
        )}
      </button>

      {/* Floating Popover Menu */}
      {menuOpen && (
        <div className="profile-popover-card" role="menu" aria-label="Opsi profil">
          <div className="popover-user-header">
            <div className="popover-avatar">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="popover-avatar-img" />
              ) : (
                <span>{getInitials(user.displayName || user.fullName)}</span>
              )}
            </div>
            <div className="popover-meta">
              <strong className="popover-name">{user.fullName}</strong>
              <span className="popover-email">{user.email}</span>
              <span className="popover-role">{user.role}</span>
            </div>
          </div>

          <div className="popover-divider" />

          <div className="popover-actions">
            <button
              type="button"
              className="popover-menu-item"
              role="menuitem"
              onClick={handleOpenProfileModal}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Kelola Profil</span>
            </button>

            <button
              type="button"
              className="popover-menu-item popover-logout"
              role="menuitem"
              onClick={handleOpenLogoutModal}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Keluar</span>
            </button>
          </div>
        </div>
      )}

      {/* Profile Management Modal */}
      <Modal open={profileModalOpen} onClose={() => setProfileModalOpen(false)} titleId="profile-modal-title">
        <div className="profile-modal-body">
          <h2 id="profile-modal-title" className="profile-modal-title">
            Kelola Profil Guru
          </h2>
          <p className="muted small" style={{ marginBottom: 20 }}>
            Perbarui foto profil dan nama yang ditampilkan pada lembar observasi.
          </p>

          <form onSubmit={handleSaveProfile} className="profile-form">
            {/* Avatar upload / preview section */}
            <div className="avatar-edit-section">
              <div className="avatar-preview-box">
                {formAvatarUrl ? (
                  <img src={formAvatarUrl} alt="Pratinjau Foto" className="avatar-preview-img" />
                ) : (
                  <span className="avatar-preview-initials">{getInitials(formDisplayName || formFullName)}</span>
                )}
              </div>

              <div className="avatar-edit-controls">
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoChange}
                />
                <button
                  type="button"
                  className="btn secondary"
                  style={{ minHeight: 38, padding: "6px 14px", fontSize: 13 }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Ubah Foto
                </button>
                {formAvatarUrl && (
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ minHeight: 38, padding: "6px 14px", fontSize: 13, color: "var(--danger)" }}
                    onClick={() => setFormAvatarUrl(null)}
                  >
                    Hapus Foto
                  </button>
                )}
                <span className="small muted">JPG, PNG, atau WEBP maks 2 MB.</span>
              </div>
            </div>

            {/* Inputs */}
            <div className="field">
              <label htmlFor="prof-full-name">Nama Lengkap</label>
              <input
                id="prof-full-name"
                type="text"
                value={formFullName}
                onChange={(e) => setFormFullName(e.target.value)}
                maxLength={150}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="prof-display-name">Nama Panggilan / Tampilan</label>
              <input
                id="prof-display-name"
                type="text"
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                maxLength={150}
                placeholder="Misal: Bu Rini / Pak Budi"
              />
            </div>

            <div className="field">
              <label htmlFor="prof-email">Email Terdaftar</label>
              <input
                id="prof-email"
                type="email"
                value={user.email}
                disabled
                style={{ background: "#f8f9fa", color: "var(--muted)" }}
              />
            </div>

            {errorMsg && <p className="notice error" role="alert">{errorMsg}</p>}
            {successMsg && <p className="notice ok" role="status">{successMsg}</p>}

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setProfileModalOpen(false)}
                disabled={busy}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn primary"
                disabled={busy}
              >
                {busy ? "Menyimpan…" : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal open={logoutModalOpen} onClose={() => setLogoutModalOpen(false)} titleId="logout-confirm-title">
        <div className="logout-confirm-body" style={{ textAlign: "center", padding: "8px 4px" }}>
          <div className="logout-icon-wrap" style={{ display: "grid", placeItems: "center", width: 56, height: 56, borderRadius: "50%", background: "#fbeeee", color: "var(--danger)", margin: "0 auto 16px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
          <h2 id="logout-confirm-title" style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", margin: "0 0 8px" }}>
            Konfirmasi Keluar Akun
          </h2>
          <p className="muted" style={{ margin: "0 0 24px", lineHeight: 1.5 }}>
            Apakah Anda yakin ingin keluar dari akun guru? Pastikan seluruh draf observasi atau rekaman membaca telah tersimpan.
          </p>
          <div className="modal-actions" style={{ justifyContent: "center", gap: 12 }}>
            <button
              type="button"
              className="btn secondary"
              style={{ minWidth: 120 }}
              onClick={() => setLogoutModalOpen(false)}
              disabled={busy}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn primary"
              style={{ minWidth: 140, background: "var(--danger)" }}
              onClick={() => void handleConfirmLogout()}
              disabled={busy}
            >
              {busy ? "Memproses…" : "Ya, Keluar Akun"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

