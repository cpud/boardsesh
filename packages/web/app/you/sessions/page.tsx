import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerAuthToken } from '@/app/lib/auth/server-auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth/auth-options';
import YouPageContent from '../you-page-content';

export const metadata: Metadata = {
  title: 'Sessions | Boardsesh',
  robots: { index: false, follow: true },
};

export default async function YouSessionsPage() {
  const authToken = await getServerAuthToken();
  if (!authToken) {
    redirect('/');
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/');
  }

  return <YouPageContent userId={session.user.id} />;
}
