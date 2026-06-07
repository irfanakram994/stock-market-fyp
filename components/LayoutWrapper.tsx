'use client';

import { AuthProvider } from '@/lib/authContext';
import { SnackbarProvider } from '@/components/SnackbarProvider';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SnackbarProvider>
      <AuthProvider>{children}</AuthProvider>
    </SnackbarProvider>
  );
}
