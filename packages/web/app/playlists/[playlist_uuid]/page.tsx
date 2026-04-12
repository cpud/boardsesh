import React from 'react';
import { Metadata } from 'next';
import { getServerAuthToken } from '@/app/lib/auth/server-auth';
import { serverMyBoards } from '@/app/lib/graphql/server-cached-client';
import { sql } from '@/app/lib/db/db';
import PlaylistDetailContent from './playlist-detail-content';
import styles from '@/app/components/library/playlist-view.module.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ playlist_uuid: string }>;
}): Promise<Metadata> {
  const { playlist_uuid } = await params;

  try {
    const rows = await sql`
      SELECT p.name, p.description, p.is_public,
             (SELECT COUNT(*) FROM playlist_climbs pc WHERE pc.playlist_id = p.id) as climb_count
      FROM playlists p
      WHERE p.uuid = ${playlist_uuid}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return { title: 'Playlist | Boardsesh', description: 'View playlist details and climbs' };
    }

    const playlist = rows[0];
    const name = playlist.name as string;
    const climbCount = Number(playlist.climb_count);
    const description = (playlist.description as string) || `A climbing playlist on Boardsesh with ${climbCount} climb${climbCount === 1 ? '' : 's'}`;
    const title = `${name} | Boardsesh`;

    const ogImageUrl = `https://boardsesh.com/api/og/playlist?uuid=${playlist_uuid}`;
    const canonicalUrl = `/playlists/${playlist_uuid}`;

    return {
      title,
      description,
      alternates: { canonical: canonicalUrl },
      ...(!playlist.is_public && { robots: { index: false, follow: true } }),
      openGraph: {
        title,
        description,
        type: 'website',
        url: canonicalUrl,
        images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${name} playlist` }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl],
      },
    };
  } catch {
    return { title: 'Playlist | Boardsesh', description: 'View playlist details and climbs' };
  }
}

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
