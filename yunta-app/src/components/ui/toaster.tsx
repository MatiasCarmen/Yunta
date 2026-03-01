'use client';

import * as React from 'react';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] gap-2">
      {toasts.map(({ id, title, description, action, variant, ...props }) => (
        <Card
          key={id}
          className={`group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 pr-8 shadow-2xl transition-all animate-in slide-in-from-bottom-5 ${
            variant === 'destructive'
              ? 'border-red-200 bg-red-50 text-red-900'
              : 'border-slate-200 bg-white'
          }`}
          {...props}
        >
          <div className="grid gap-1 flex-1">
            {title && <div className="text-sm font-semibold">{title}</div>}
            {description && (
              <div className="text-sm opacity-90">{description}</div>
            )}
          </div>
          {action}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => {
              // Close toast - implement via useToast().dismiss(id)
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </Card>
      ))}
    </div>
  );
}
