'use client';

import React from 'react';
import type { CssBarChartBar, GroupedBar } from '@/app/components/charts/css-bar-chart';
import type { UserProfile } from '../utils/profile-constants';
import type { AggregatedTimeframeType } from '../utils/profile-constants';
import type { LayoutPercentage, LayoutLegendEntry, VPointsTimelineData } from '../utils/chart-data-builders';
import UserCard from './user-card';
import StatsSummary from './stats-summary';

interface ProfileHeaderProps {
  userId: string;
  profile: UserProfile;
  isOwnProfile: boolean;
  statisticsSummary: {
    totalAscents: number;
    layoutPercentages: LayoutPercentage[];
  };
  loadingProfileStats: boolean;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
  aggregatedTimeframe: AggregatedTimeframeType;
  onAggregatedTimeframeChange: (value: AggregatedTimeframeType) => void;
  loadingAggregated: boolean;
  aggregatedStackedBars: { bars: CssBarChartBar[]; legendEntries: LayoutLegendEntry[] } | null;
  aggregatedFlashRedpointBars: GroupedBar[] | null;
  vPointsTimeline: VPointsTimelineData | null;
}

export default function ProfileHeader({
  userId,
  profile,
  isOwnProfile,
  statisticsSummary,
  loadingProfileStats,
  onProfileUpdate,
  aggregatedTimeframe,
  onAggregatedTimeframeChange,
  loadingAggregated,
  aggregatedStackedBars,
  aggregatedFlashRedpointBars,
  vPointsTimeline,
}: ProfileHeaderProps) {
  return (
    <>
      <UserCard
        userId={userId}
        profile={profile}
        isOwnProfile={isOwnProfile}
        onProfileUpdate={onProfileUpdate}
      />
      <StatsSummary
        statisticsSummary={statisticsSummary}
        loadingProfileStats={loadingProfileStats}
        aggregatedTimeframe={aggregatedTimeframe}
        onAggregatedTimeframeChange={onAggregatedTimeframeChange}
        loadingAggregated={loadingAggregated}
        aggregatedStackedBars={aggregatedStackedBars}
        aggregatedFlashRedpointBars={aggregatedFlashRedpointBars}
        vPointsTimeline={vPointsTimeline}
      />
    </>
  );
}
