'use client';

import React, { useEffect } from 'react';
import { SessionProvider, signIn } from 'next-auth/react';
import { ReactNode } from 'react';
import { isNativeApp } from '@/app/lib/ble/capacitor-utils';

interface SessionProviderWrapperProps {
  children: ReactNode;
}

export default function SessionProviderWrapper({ children }: SessionProviderWrapperProps) {
  useEffect(() => {
    if (!isNativeApp()) {
      return;
    }

    const appPlugin = window.Capacitor?.Plugins?.App;
    if (!appPlugin) {
      return;
    }

    let cancelled = false;
    let listenerHandle: { remove: () => Promise<void> } | null = null;

    appPlugin.addListener('appUrlOpen', async ({ url }) => {
      if (!url.startsWith('com.boardsesh.app://auth/callback')) {
        return;
      }

      const parsed = new URL(url);
      const transferToken = parsed.searchParams.get('transferToken');
      const error = parsed.searchParams.get('error');
      const nextPath = parsed.searchParams.get('next') ?? '/';

      // Close the external browser regardless of outcome
      await window.Capacitor?.Plugins?.Browser?.close?.();

      if (error || !transferToken) {
        // Redirect to login with context about the failure
        window.location.assign('/auth/login');
        return;
      }

      const safeCallbackUrl = nextPath.startsWith('/') ? nextPath : '/';
      const result = await signIn('native-oauth', {
        transferToken,
        callbackUrl: safeCallbackUrl,
        redirect: false,
      });

      if (result?.error) {
        window.location.assign('/auth/login');
        return;
      }

      window.location.assign(result?.url ?? safeCallbackUrl);
    }).then((handle) => {
      if (cancelled) {
        // Component unmounted before the listener was registered — clean up
        void handle.remove();
      } else {
        listenerHandle = handle;
      }
    }).catch((err) => {
      console.error('[Native OAuth] Failed to register appUrlOpen listener:', err);
    });

    return () => {
      cancelled = true;
      void listenerHandle?.remove();
    };
  }, []);

  return (
    <SessionProvider
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  );
}
