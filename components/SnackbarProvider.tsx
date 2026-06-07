'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, Loader, X, XCircle } from 'lucide-react';

type SnackbarVariant = 'success' | 'warning' | 'error' | 'info' | 'loading';

interface Snackbar {
  id: string;
  message: string;
  variant: SnackbarVariant;
  duration?: number;
}

interface SnackbarInput {
  message: string;
  variant?: SnackbarVariant;
  duration?: number;
}

interface SnackbarContextValue {
  showSnackbar: (input: SnackbarInput) => string;
  updateSnackbar: (id: string, input: SnackbarInput) => void;
  dismissSnackbar: (id: string) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | undefined>(undefined);

const variantStyles: Record<SnackbarVariant, string> = {
  success: 'border-emerald-400/30 text-emerald-100',
  warning: 'border-amber-400/30 text-amber-100',
  error: 'border-red-400/30 text-red-100',
  info: 'border-sky-400/30 text-sky-100',
  loading: 'border-primary/40 text-white',
};

function SnackbarIcon({ variant }: { variant: SnackbarVariant }) {
  if (variant === 'success') return <CheckCircle className="h-5 w-5 text-emerald-300" />;
  if (variant === 'warning') return <AlertTriangle className="h-5 w-5 text-amber-300" />;
  if (variant === 'error') return <XCircle className="h-5 w-5 text-red-300" />;
  if (variant === 'loading') return <Loader className="h-5 w-5 animate-spin text-primary" />;
  return <Info className="h-5 w-5 text-sky-300" />;
}

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [snackbars, setSnackbars] = useState<Snackbar[]>([]);

  const dismissSnackbar = useCallback((id: string) => {
    setSnackbars((current) => current.filter((snackbar) => snackbar.id !== id));
  }, []);

  const showSnackbar = useCallback((input: SnackbarInput) => {
    const id = `snackbar-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const snackbar: Snackbar = {
      id,
      message: input.message,
      variant: input.variant || 'info',
      duration: input.duration,
    };

    setSnackbars((current) => [...current, snackbar].slice(-3));
    return id;
  }, []);

  const updateSnackbar = useCallback((id: string, input: SnackbarInput) => {
    setSnackbars((current) =>
      current.map((snackbar) =>
        snackbar.id === id
          ? {
              ...snackbar,
              message: input.message,
              variant: input.variant || snackbar.variant,
              duration: input.duration,
            }
          : snackbar
      )
    );
  }, []);

  useEffect(() => {
    const timers = snackbars
      .filter((snackbar) => snackbar.variant !== 'loading')
      .map((snackbar) => {
        const duration = snackbar.duration ?? 4200;
        return window.setTimeout(() => dismissSnackbar(snackbar.id), duration);
      });

    return () => timers.forEach(window.clearTimeout);
  }, [dismissSnackbar, snackbars]);

  const value = useMemo(
    () => ({ showSnackbar, updateSnackbar, dismissSnackbar }),
    [dismissSnackbar, showSnackbar, updateSnackbar]
  );

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-col items-center gap-3 pointer-events-none">
        {snackbars.map((snackbar) => (
          <div
            key={snackbar.id}
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-lg border bg-slate-950/95 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-md ${variantStyles[snackbar.variant]}`}
          >
            <SnackbarIcon variant={snackbar.variant} />
            <p className="min-w-0 flex-1 text-sm leading-5">{snackbar.message}</p>
            <button
              type="button"
              onClick={() => dismissSnackbar(snackbar.id)}
              className="rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within SnackbarProvider');
  }
  return context;
}
