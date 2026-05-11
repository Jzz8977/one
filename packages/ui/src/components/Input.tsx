import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../utils';
import { Label } from './Label';

const inputBase =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * 兼容旧 API：传 label 时自动渲染 Label + 错误提示，否则就是裸 input。
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, hint, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  const inputEl = (
    <input
      ref={ref}
      id={inputId}
      className={cn(
        inputBase,
        error ? 'border-destructive focus-visible:ring-destructive' : '',
        className,
      )}
      {...rest}
    />
  );
  if (!label && !error && !hint) return inputEl;
  return (
    <div className="grid w-full items-center gap-1.5">
      {label ? <Label htmlFor={inputId}>{label}</Label> : null}
      {inputEl}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const textareaBase =
  'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, error, id, ...rest },
  ref,
) {
  const taId = id ?? rest.name;
  const ta = (
    <textarea
      ref={ref}
      id={taId}
      className={cn(
        textareaBase,
        error ? 'border-destructive focus-visible:ring-destructive' : '',
        className,
      )}
      {...rest}
    />
  );
  if (!label && !error) return ta;
  return (
    <div className="grid w-full items-center gap-1.5">
      {label ? <Label htmlFor={taId}>{label}</Label> : null}
      {ta}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
});
