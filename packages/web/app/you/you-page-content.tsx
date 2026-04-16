'use client';

import React, { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import ActivityFeed from '@/app/components/activity-feed/activity-feed';
import LogbookFeed from '@/app/components/library/logbook-feed';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import type { GetUserProfileStatsQueryResponse } from '@/app/lib/graphql/operations/ticks';
import styles from '@/app/profile/[user_id]/profile-page.module.css';
import { useProfileData } from '@/app/profile/[user_id]/hooks/use-profile-data';
import StatsSummary from '@/app/profile/[user_id]/components/stats-summary';
import BoardStatsSection from '@/app/profile/[user_id]/components/board-stats-section';
import type { UserProfile, LogbookEntry } from '@/app/profile/[user_id]/utils/profile-constants';
import { StatsFilterBridgeInjector } from '@/app/components/stats-filter-bridge/stats-filter-bridge-context';
import StatsFilterDrawer from '@/app/components/stats-filter-drawer/stats-filter-drawer';

type YouTab = 'progress' | 'sessions' | 'logbook';

export interface YouPageContentProps {
  userId: string;
  initialProfile?: UserProfile | null;
  initialProfileStats?: GetUserProfileStatsQueryResponse['userProfileStats'] | null;
  initialAllBoardsTicks?: Record<string, LogbookEntry[]>;
  initialLogbook?: LogbookEntry[];
}

export default function YouPageContent({
  userId,
  initialProfile,
  initialProfileStats,
  initialAllBoardsTicks,
  initialLogbook,
}: YouPageContentProps) {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const {
    loading,
    selectedBoard,
    setSelectedBoard,
    filteredLogbook,
    unifiedTimeframe,
    setUnifiedTimeframe,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    weeklyBars,
    aggregatedFlashRedpointBars,
    vPointsTimeline,
    loadingAggregated,
    aggregatedStackedBars,
    loadingProfileStats,
    statisticsSummary,
    hardestSend,
    hardestFlash,
    percentile,
  } = useProfileData(userId, {
    initialProfile: initialProfile ?? undefined,
    initialProfileStats: initialProfileStats ?? undefined,
    initialAllBoardsTicks,
    initialLogbook,
    initialIsOwnProfile: true,
  });

  // Tab state from URL path
  const activeTab: YouTab = pathname === '/you/sessions'
    ? 'sessions'
    : pathname === '/you/logbook'
      ? 'logbook'
      : 'progress';

  const handleTabChange = useCallback((_: React.SyntheticEvent, value: YouTab) => {
    const path = value === 'progress' ? '/you' : `/you/${value}`;
    router.push(path, { scroll: false });
  }, [router]);

  // Filter drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerRendered, setDrawerRendered] = useState(false);

  const openDrawer = useCallback(() => {
    setDrawerRendered(true);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleDrawerTransitionEnd = useCallback((open: boolean) => {
    if (!open) setDrawerRendered(false);
  }, []);

  const hasActiveFilters = unifiedTimeframe !== 'all' || selectedBoard !== 'all';
  const isOnProgressTab = activeTab === 'progress';

  // Determine if user is authenticated (for ActivityFeed)
  const isAuthenticated = sessionStatus === 'authenticated';

  if (loading) {
    return (
      <Box className={styles.layout}>
        <Box component="main" className={styles.loadingContent}>
          <CircularProgress size={48} />
        </Box>
      </Box>
    );
  }

  return (
    <Box className={styles.layout}>
      <StatsFilterBridgeInjector
        openDrawer={openDrawer}
        pageTitle="Progress"
        backUrl={null}
        hasActiveFilters={hasActiveFilters}
        isActive={isOnProgressTab}
      />
      <Box component="main" className={styles.content}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ mb: 2 }}
        >
          <Tab label="Progress" value="progress" />
          <Tab label="Sessions" value="sessions" />
          <Tab label="Logbook" value="logbook" />
        </Tabs>

        {activeTab === 'progress' && (
          <>
            <StatsSummary
              statisticsSummary={statisticsSummary}
              hardestSend={hardestSend}
              hardestFlash={hardestFlash}
              loadingProfileStats={loadingProfileStats}
              loadingAggregated={loadingAggregated}
              weeklyBars={weeklyBars}
              aggregatedStackedBars={aggregatedStackedBars}
              aggregatedFlashRedpointBars={aggregatedFlashRedpointBars}
              vPointsTimeline={vPointsTimeline}
              percentile={percentile}
            />
            <BoardStatsSection
              selectedBoard={selectedBoard}
              loading={loadingAggregated}
              filteredLogbook={filteredLogbook}
              isOwnProfile={true}
            />
          </>
        )}

        {activeTab === 'sessions' && (
          <ActivityFeed
            isAuthenticated={isAuthenticated}
            userId={userId}
          />
        )}

        {activeTab === 'logbook' && (
          <LogbookFeed />
        )}
      </Box>
      {drawerRendered && (
        <StatsFilterDrawer
          open={drawerOpen}
          onClose={closeDrawer}
          selectedBoard={selectedBoard}
          onBoardChange={setSelectedBoard}
          timeframe={unifiedTimeframe}
          onTimeframeChange={setUnifiedTimeframe}
          fromDate={fromDate}
          onFromDateChange={setFromDate}
          toDate={toDate}
          onToDateChange={setToDate}
          onTransitionEnd={handleDrawerTransitionEnd}
        />
      )}
    </Box>
  );
}
