import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { resolveBoardBySlug } from '@/app/lib/board-slug-utils';
import { constructBoardSlugPlaylistsUrl } from '@/app/lib/url-utils';
import { getServerAuthToken } from '@/app/lib/auth/server-auth';
import { serverMyBoards } from '@/app/lib/graphql/server-cached-client';
import PlaylistDetailContent from '@/app/playlists/[playlist_uuid]/playlist-detail-content';
import { sql } from '@/app/lib/db/db';
import styles from '@/app/components/library/playlist-view.module.css';

interface PlaylistDetailPageProps {
  params: Promise<{ board_slug: string; angle: string; playlist_uuid: string }>;
}

export async function generateMetadata(props: PlaylistDetailPageProps): Promise<Metadata> {
  const params = await props.params;

  try {
    const rows = await sql`
      SELECT p.name, p.description, p.is_public,
             (SELECT COUNT(*) FROM playlist_climbs pc WHERE pc.playlist_id = p.id) as climb_count
      FROM playlists p
      WHERE p.uuid = ${params.playlist_uuid}
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

    const ogImageUrl = `https://boardsesh.com/api/og/playlist?uuid=${params.playlist_uuid}`;
    const canonicalUrl = `/playlists/${params.playlist_uuid}`;

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

export default async function BoardSlugPlaylistDetailPage(props: PlaylistDetailPageProps) {
  const params = await props.params;

  const board = await resolveBoardBySlug(params.board_slug);
  if (!board) {
    return notFound();
  }

  const playlistsBasePath = constructBoardSlugPlaylistsUrl(params.board_slug, Number(params.angle));

  // Fetch user's boards server-side for instant board filter selection
  const authToken = await getServerAuthToken();
  const initialMyBoards = authToken ? await serverMyBoards(authToken) : null;

  return (
    <div className={styles.pageContainer}>
      <PlaylistDetailContent
        playlistUuid={params.playlist_uuid}
        playlistsBasePath={playlistsBasePath}
        boardSlug={params.board_slug}
        initialMyBoards={initialMyBoards}
      />
    </div>
  );
}
