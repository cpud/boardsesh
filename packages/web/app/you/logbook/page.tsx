import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth/auth-options';
import YouPageContent from '../you-page-content';

export const metadata: Metadata = {
  title: 'Logbook | Boardsesh',
  robots: { index: false, follow: true },
};

export default async function YouLogbookPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/');
  }

  return <YouPageContent userId={session.user.id} />;
}
