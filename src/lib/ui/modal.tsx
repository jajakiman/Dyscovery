"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Modal({ open, onClose, titleId, children }: { open: boolean; onClose: () => void; titleId: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} aria-labelledby={titleId} onClose={onClose}>{open && <div className="modal-body">{children}</div>}</dialog>;
}
