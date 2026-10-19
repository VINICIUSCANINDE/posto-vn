'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Dialog({ title, onClose, busy = false, children, className = '' }: {
  title: ReactNode;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>('input:not([type=hidden]):not([type=radio]),select,textarea')?.focus();
    }
    return () => opener?.focus?.();
  }, []);

  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-labelledby="dialog-title"
      onClose={() => onCloseRef.current()}
      onCancel={(e) => { if (busy) e.preventDefault(); }}
    >
      <div className="modal-head">
        <h2 id="dialog-title">{title}</h2>
        <button type="button" className="icon-btn" aria-label="Fechar" onClick={() => ref.current?.close()} disabled={busy}><X size={18} aria-hidden="true" /></button>
      </div>
      {children}
    </dialog>
  );
}

export function closeDialog(from: HTMLElement | null) {
  from?.closest('dialog')?.close();
}
