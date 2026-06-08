'use client';

import { AuthProvider } from '@/lib/authContext';
import { PostLoginTransitionProvider } from '@/components/PostLoginTransition';
import { SnackbarProvider } from '@/components/SnackbarProvider';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SnackbarProvider>
      <PostLoginTransitionProvider>
        <AuthProvider>{children}</AuthProvider>
      </PostLoginTransitionProvider>
    </SnackbarProvider>
  );
}
