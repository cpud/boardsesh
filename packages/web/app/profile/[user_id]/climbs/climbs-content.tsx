'use client';

import React from 'react';
import Typography from '@mui/material/Typography';
import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import ProfileSubPageLayout from '../components/profile-sub-page-layout';
import SetterClimbList from '@/app/components/climb-list/setter-climb-list';
import { EmptyState } from '@/app/components/ui/empty-state';

interface ClimbsContentProps {
  userId: string;
  setters: Array<{ username: string; boardType: string }>;
  authToken: string | null;
}

export default function ClimbsContent({ userId, setters, authToken }: ClimbsContentProps) {
  return (
    <ProfileSubPageLayout userId={userId} title="Their Climbs">
      {setters.length === 0 ? (
        <EmptyState description="No created climbs found" />
      ) : (
        setters.map((setter) => (
          <MuiCard key={setter.username} sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" component="h5" sx={{ mb: 1 }}>
                {setter.boardType.charAt(0).toUpperCase() + setter.boardType.slice(1)}
              </Typography>
              <SetterClimbList username={setter.username} authToken={authToken} />
            </CardContent>
          </MuiCard>
        ))
      )}
    </ProfileSubPageLayout>
  );
}
