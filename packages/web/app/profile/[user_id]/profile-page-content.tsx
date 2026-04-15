'use client';

import React, { useCallback } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import { IosShare } from '@mui/icons-material';
import { EmptyState } from '@/app/components/ui/empty-state';
import Logo from '@/app/components/brand/logo';
import BackButton from '@/app/components/back-button';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { shareWithFallback } from '@/app/lib/share-utils';
import ActivityFeed from '@/app/components/activity-feed/activity-feed';
import LogbookFeed from '@/app/components/library/logbook-feed';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { GetUserProfileStatsQueryResponse } from '@/app/lib/graphql/operations/ticks';
import styles from './profile-page.module.css';
import { useProfileData } from './hooks/use-profile-data';
import ProfileHeader from './components/profile-header';
import BoardStatsSection from './components/board-stats-section';
import type { UserProfile, LogbookEntry } from './utils/profile-constants';

type ProfileTab = 'progress' | 'sessions' | 'logbook';
const VALID_TABS: ProfileTab[] = ['progress', 'sessions', 'logbook'];

interface ProfilePageContentProps {
  userId: string;
  initialProfile?: UserProfile | null;
  initialProfileStats?: GetUserProfileStatsQueryResponse['userProfileStats'] | null;
  initialAllBoardsTicks?: Record<string, LogbookEntry[]>;
  initialLogbook?: LogbookEntry[];
  initialIsOwnProfile?: boolean;
  initialNotFound?: boolean;
}

export default function ProfilePageContent({
  userId,
  initialProfile,
  initialProfileStats,
  initialAllBoardsTicks,
  initialLogbook,
  initialIsOwnProfile,
  initialNotFound,
}: ProfilePageContentProps) {
  const { showMessage } = useSnackbar();
  const { data: authSession, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    loading,
    notFound,
    profile,
    setProfile,
    isOwnProfile,
    selectedBoard,
    setSelectedBoard,
    loadingStats,
    filteredLogbook,
    timeframe,
    setTimeframe,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    weeklyBars,
    aggregatedFlashRedpointBars,
    vPointsTimeline,
    weeklyFromDate,
    setWeeklyFromDate,
    weeklyToDate,
    setWeeklyToDate,
    aggregatedTimeframe,
    setAggregatedTimeframe,
    loadingAggregated,
    aggregatedStackedBars,
    loadingProfileStats,
    statisticsSummary,
  } = useProfileData(userId, {
    initialProfile: initialProfile ?? undefined,
    initialProfileStats: initialProfileStats ?? undefined,
    initialAllBoardsTicks,
    initialLogbook,
    initialIsOwnProfile,
    initialNotFound,
  });

  // Tab state from URL search params
  const tabParam = searchParams.get('tab');
  const activeProfileTab: ProfileTab = VALID_TABS.includes(tabParam as ProfileTab)
    ? (tabParam as ProfileTab)
    : 'progress';

  // Only allow logbook tab on own profile
  const effectiveTab = activeProfileTab === 'logbook' && !isOwnProfile
    ? 'progress'
    : activeProfileTab;

  const handleTabChange = useCallback((_: React.SyntheticEvent, value: ProfileTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'progress') {
      params.delete('tab');
    } else {
      params.set('tab', value);
    }
    const qs = params.toString();
    router.push(qs ? `/profile/${userId}?${qs}` : `/profile/${userId}`, { scroll: false });
  }, [router, searchParams, userId]);

  // Determine if user is authenticated (for ActivityFeed)
  const isAuthenticated = sessionStatus === 'authenticated';

  const handleShare = useCallback(async () => {
    const displayName = profile?.profile?.displayName || profile?.name || 'Climber';
    const shareUrl = `${window.location.origin}/profile/${userId}`;

    await shareWithFallback({
      url: shareUrl,
      title: `${displayName}'s climbing profile`,
      text: `Check out ${displayName}'s climbing profile on Boardsesh`,
      trackingEvent: 'Profile Shared',
      trackingProps: { userId },
      onClipboardSuccess: () => showMessage('Link copied to clipboard!', 'success'),
      onError: () => showMessage('Failed to share', 'error'),
    });
  }, [profile, userId, showMessage]);

  if (loading) {
    return (
      <Box className={styles.layout}>
        <Box component="main" className={styles.loadingContent}>
          <CircularProgress size={48} />
        </Box>
      </Box>
    );
  }

  if (notFound) {
    return (
      <Box className={styles.layout}>
        <Box component="header" className={styles.header}>
          <BackButton fallbackUrl="/" />
          <Logo size="sm" showText={false} />
          <Typography variant="h6" component="h4" className={styles.headerTitle}>
            Profile
          </Typography>
        </Box>
        <Box component="main" className={styles.content}>
          <EmptyState description="User not found" />
        </Box>
      </Box>
    );
  }

  return (
    <Box className={styles.layout}>
      <Box component="header" className={styles.header}>
        <BackButton fallbackUrl="/" />
        <Logo size="sm" showText={false} />
        <Typography variant="h6" component="h4" className={styles.headerTitle}>
          {isOwnProfile ? 'You' : 'Profile'}
        </Typography>
        {profile && (
          <IconButton onClick={handleShare} aria-label="Share profile">
            <IosShare />
          </IconButton>
        )}
      </Box>

      <Box component="main" className={styles.content}>
        {profile && (
          <ProfileHeader
            userId={userId}
            profile={profile}
            isOwnProfile={isOwnProfile}
            statisticsSummary={statisticsSummary}
            loadingProfileStats={loadingProfileStats}
            onProfileUpdate={setProfile}
            aggregatedTimeframe={aggregatedTimeframe}
            onAggregatedTimeframeChange={setAggregatedTimeframe}
            loadingAggregated={loadingAggregated}
            aggregatedStackedBars={aggregatedStackedBars}
            aggregatedFlashRedpointBars={aggregatedFlashRedpointBars}
            vPointsTimeline={vPointsTimeline}
          />
        )}

        <Tabs
          value={effectiveTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ mb: 2 }}
        >
          <Tab label="Progress" value="progress" />
          <Tab label="Sessions" value="sessions" />
          {isOwnProfile && <Tab label="Logbook" value="logbook" />}
        </Tabs>

        {effectiveTab === 'progress' && (
          <BoardStatsSection
            selectedBoard={selectedBoard}
            onBoardChange={setSelectedBoard}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            fromDate={fromDate}
            onFromDateChange={setFromDate}
            toDate={toDate}
            onToDateChange={setToDate}
            loadingStats={loadingStats}
            filteredLogbook={filteredLogbook}
            weeklyBars={weeklyBars}
            isOwnProfile={isOwnProfile}
            weeklyFromDate={weeklyFromDate}
            onWeeklyFromDateChange={setWeeklyFromDate}
            weeklyToDate={weeklyToDate}
            onWeeklyToDateChange={setWeeklyToDate}
          />
        )}

        {effectiveTab === 'sessions' && (
          <ActivityFeed
            isAuthenticated={isAuthenticated}
            userId={userId}
          />
        )}

        {effectiveTab === 'logbook' && isOwnProfile && (
          <LogbookFeed />
        )}
      </Box>
    </Box>
  );
}
