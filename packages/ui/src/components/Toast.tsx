import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { cn } from '../utils.js';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastApi {
  show: (message: string, type?: ToastType) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setItems((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);
  const api: ToastApi = {
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
    info: (m) => show(m, 'info'),
  };
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-[1000] flex w-72 flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto rounded-md border px-4 py-2 text-sm shadow-md',
              t.type === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
              t.type === 'error' && 'border-red-200 bg-red-50 text-red-900',
              t.type === 'info' && 'border-slate-200 bg-white text-slate-800',
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
