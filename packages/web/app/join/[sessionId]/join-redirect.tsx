'use client';

import { useEffect } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

export default function JoinRedirect({ sessionId, joinUrl }: { sessionId: string; joinUrl: string }) {
  useEffect(() => {
    window.location.href = joinUrl;
  }, [joinUrl]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2,
      }}
    >
      <CircularProgress size={48} />
      <Typography variant="body1" color="text.secondary">
        Joining session...
      </Typography>
      <Link href={joinUrl} variant="body2" color="text.secondary">
        Tap here if you&apos;re not redirected
      </Link>
    </Box>
  );
}
