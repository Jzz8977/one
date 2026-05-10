import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, hint, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <label className="block w-full text-sm" htmlFor={inputId}>
      {label ? <span className="mb-1 block font-medium text-slate-700">{label}</span> : null}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : '',
          className,
        )}
        {...rest}
      />
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
      {!error && hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, error, id, ...rest },
  ref,
) {
  return (
    <label className="block w-full text-sm" htmlFor={id ?? rest.name}>
      {label ? <span className="mb-1 block font-medium text-slate-700">{label}</span> : null}
      <textarea
        ref={ref}
        id={id ?? rest.name}
        className={cn(
          'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : '',
          className,
        )}
        {...rest}
      />
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  );
});
