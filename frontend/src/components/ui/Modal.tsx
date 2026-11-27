import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { SilutLogo } from './SilutLogo';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  maxWidthClass = 'max-w-2xl',
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className={`w-full ${maxWidthClass} rounded-lg bg-white p-0 shadow-xl border border-zinc-200 open:flex open:flex-col max-h-[90vh]`}
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <SilutLogo variant="mark" size="sm" />
          <h2 id={titleId} className="text-sm font-semibold text-zinc-900 truncate">
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ventana"
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5 overflow-y-auto text-zinc-700 bg-white">{children}</div>
    </dialog>
  );
};
