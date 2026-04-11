import React from 'react';
import { Metadata } from 'next';
import { getServerAuthToken } from '@/app/lib/auth/server-auth';
import { serverMyBoards } from '@/app/lib/graphql/server-cached-client';
import PlaylistDetailContent from './playlist-detail-content';
import styles from '@/app/components/library/playlist-view.module.css';

export const metadata: Metadata = {
  title: 'Playlist | Boardsesh',
  description: 'View playlist details and climbs',
};

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ playlist_uuid: string }>;
}) {
  const { playlist_uuid } = await params;

  // Fetch user's boards server-side so the filter strip renders populated on first paint
  // and the current-queue fallback can seed the selection without flashing "All Boards".
  const authToken = await getServerAuthToken();
  const initialMyBoards = authToken ? await serverMyBoards(authToken) : null;

  return (
    <div className={styles.pageContainer}>
      <PlaylistDetailContent playlistUuid={playlist_uuid} initialMyBoards={initialMyBoards} />
    </div>
  );
}
