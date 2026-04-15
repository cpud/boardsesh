import React from 'react';
import { Metadata } from 'next';
import { getServerAuthToken } from '@/app/lib/auth/server-auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth/auth-options';
import { cachedUserProfileStats, cachedUserTicks } from '@/app/lib/graphql/server-cached-client';
import { SUPPORTED_BOARDS } from '@/app/lib/board-data';
import AnalyticsContent from './analytics-content';
import type { LogbookEntry } from '../utils/profile-constants';

type PageProps = { params: Promise<{ user_id: string }> };

export const metadata: Metadata = {
  title: 'Analytics | Boardsesh',
  robots: { index: false, follow: true },
};

export default async function ProfileAnalyticsPage({ params }: PageProps) {
  const { user_id } = await params;
  const authToken = await getServerAuthToken();
  let viewerUserId: string | undefined;
  if (authToken) {
    const session = await getServerSession(authOptions);
    viewerUserId = session?.user?.id;
  }

  const [initialProfileStats, ...ticksResults] = await Promise.all([
    cachedUserProfileStats(user_id),
    ...SUPPORTED_BOARDS.map((boardType) => cachedUserTicks(user_id, boardType)),
  ]);

  const initialAllBoardsTicks: Record<string, LogbookEntry[]> = {};
  SUPPORTED_BOARDS.forEach((bt, i) => {
    const ticks = ticksResults[i];
    initialAllBoardsTicks[bt] = ticks
      ? ticks.map((tick) => ({
          climbed_at: tick.climbedAt,
          difficulty: tick.difficulty,
          tries: tick.attemptCount,
          angle: tick.angle,
          status: tick.status as LogbookEntry['status'],
          layoutId: tick.layoutId,
          boardType: bt,
          climbUuid: tick.climbUuid,
        }))
      : [];
  });

  const defaultBoard = 'kilter';
  const initialLogbook = initialAllBoardsTicks[defaultBoard] ?? [];

  return (
    <AnalyticsContent
      userId={user_id}
      initialProfileStats={initialProfileStats}
      initialAllBoardsTicks={initialAllBoardsTicks}
      initialLogbook={initialLogbook}
      initialIsOwnProfile={viewerUserId === user_id}
    />
  );
}
