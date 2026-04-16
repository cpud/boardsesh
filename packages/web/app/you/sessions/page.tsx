import React from 'react';
import { Metadata } from 'next';
import { getYouSession } from '../you-auth';
import { cachedUserSessionGroupedFeed } from '@/app/lib/graphql/server-cached-client';
import ActivityFeed from '@/app/components/activity-feed/activity-feed';

export const metadata: Metadata = {
  title: 'Sessions | Boardsesh',
  robots: { index: false, follow: true },
};

export default async function YouSessionsPage() {
  const session = await getYouSession();
  const userId = session!.user!.id;

  const initialFeedResult = await cachedUserSessionGroupedFeed(userId).catch(() => null);

  return (
    <ActivityFeed
      isAuthenticated={true}
      userId={userId}
      initialFeedResult={initialFeedResult}
    />
  );
}
