import React from 'react';
import { themeTokens } from '@/app/theme/theme-config';

export default function MyLibraryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        paddingTop: 'var(--global-header-height)',
        paddingBottom: themeTokens.layout.safeAreaBottom,
      }}
    >
      {children}
    </div>
  );
}
