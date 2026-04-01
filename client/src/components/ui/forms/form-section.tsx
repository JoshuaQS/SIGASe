// src/components//forms/FormSection.tsx
import * as React from 'react';
import { cn } from '@//lib/utils';

export function FormSection({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        'space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm',
        className
      )}
      {...props}
    />
  );
}

export function FormSectionHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-1', className)} {...props} />;
}