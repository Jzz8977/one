import type { ReactNode } from 'react';
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

/**
 * 兼容老 API：useToast() 返回 { success, error, info, show }，内部用 sonner。
 * 需要在应用根挂一个 <ToastProvider>（即 sonner 的 Toaster）。
 */
interface ToastApi {
  show: (message: string, type?: 'success' | 'error' | 'info') => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const api: ToastApi = {
  show(message, type = 'info') {
    if (type === 'success') sonnerToast.success(message);
    else if (type === 'error') sonnerToast.error(message);
    else sonnerToast(message);
  },
  success: (m) => sonnerToast.success(m),
  error: (m) => sonnerToast.error(m),
  info: (m) => sonnerToast(m),
};

export function useToast(): ToastApi {
  return api;
}

export const toast = api;

export function ToastProvider({ children }: { children?: ReactNode }) {
  return (
    <>
      {children}
      <SonnerToaster richColors closeButton position="top-right" />
    </>
  );
}

export { SonnerToaster as Toaster };
