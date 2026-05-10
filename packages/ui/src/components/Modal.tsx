import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { cn } from '../utils.js';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  width?: string;
}

export function Modal({ open, onClose, title, footer, children, width = 'max-w-md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={cn('w-full overflow-hidden rounded-lg bg-white shadow-xl', width)}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <div className="border-b border-slate-100 px-6 py-4 text-base font-semibold text-slate-900">
            {title}
          </div>
        ) : null}
        <div className="px-6 py-5">{children}</div>
        {footer ? <div className="border-t border-slate-100 bg-slate-50 px-6 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}
