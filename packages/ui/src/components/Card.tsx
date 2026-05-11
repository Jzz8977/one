import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Card(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}
      {...props}
    />
  );
});

/**
 * shadcn 标准结构：CardHeader > CardTitle/CardDescription
 * 兼容老 API：CardHeader title="..." description="..." action={...}
 */
export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & { title?: ReactNode; description?: ReactNode; action?: ReactNode }
>(function CardHeader({ className, title, description, action, children, ...props }, ref) {
  if (title || description || action) {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start justify-between gap-4 border-b border-border px-6 py-4',
          className,
        )}
        {...props}
      >
        <div className="flex-1 space-y-1.5">
          {title ? <CardTitle>{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    );
  }
  return (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props}>
      {children}
    </div>
  );
});

export const CardTitle = forwardRef<HTMLDivElement, HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...props }, ref) {
    return (
      <h3
        ref={ref}
        className={cn('text-base font-semibold leading-none tracking-tight', className)}
        {...props}
      />
    );
  },
);

export const CardDescription = forwardRef<HTMLDivElement, HTMLAttributes<HTMLParagraphElement>>(
  function CardDescription({ className, ...props }, ref) {
    return <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />;
  },
);

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className, ...props }, ref) {
    return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />;
  },
);

/** 兼容老 API: CardBody === CardContent，但默认带上下 padding（旧版风格） */
export const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardBody(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn('px-6 py-5', className)} {...props} />;
});

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('flex items-center border-t border-border px-6 py-3', className)}
        {...props}
      />
    );
  },
);
