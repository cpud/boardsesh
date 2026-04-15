import React from 'react';
import { Metadata } from 'next';
import { getServerAuthToken } from '@/app/lib/auth/server-auth';
import { getProfileData } from '../server-profile-data';
import ClimbsContent from './climbs-content';

type PageProps = { params: Promise<{ user_id: string }> };

export const metadata: Metadata = {
  title: 'Climbs | Boardsesh',
  robots: { index: false, follow: true },
};

export default async function ProfileClimbsPage({ params }: PageProps) {
  const { user_id } = await params;
  const authToken = await getServerAuthToken();
  const profile = await getProfileData(user_id);

  const credentials = profile?.credentials ?? [];
  const uniqueSetters = Array.from(
    new Map(credentials.map((c) => [c.auroraUsername, c])).values(),
  );

  return (
    <ClimbsContent
      userId={user_id}
      setters={uniqueSetters.map((c) => ({ username: c.auroraUsername, boardType: c.boardType }))}
      authToken={authToken ?? null}
    />
  );
}
