import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth/auth-options';
import { getProfileData } from '@/app/profile/[user_id]/server-profile-data';
import { fetchProfileStatsData } from '@/app/profile/[user_id]/server-profile-stats';
import YouPageContent from '../you-page-content';

export const metadata: Metadata = {
  title: 'Sessions | Boardsesh',
  robots: { index: false, follow: true },
};

export default async function YouSessionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/');
  }

  const userId = session.user.id;

  const [initialProfile, statsData] = await Promise.all([
    getProfileData(userId, userId),
    fetchProfileStatsData(userId),
  ]);

  return (
    <YouPageContent
      userId={userId}
      initialProfile={initialProfile}
      initialProfileStats={statsData.initialProfileStats}
      initialAllBoardsTicks={statsData.initialAllBoardsTicks}
      initialLogbook={statsData.initialLogbook}
    />
  );
}
