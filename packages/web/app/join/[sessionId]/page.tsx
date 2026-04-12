import React from 'react';
import type { Metadata } from 'next';
import { sql } from '@/app/lib/db/db';
import { BOULDER_GRADES } from '@/app/lib/board-data';
import JoinRedirect from './join-redirect';

type Props = {
  params: Promise<{ sessionId: string }>;
};

const DIFFICULTY_TO_GRADE: Record<number, string> = Object.fromEntries(
  BOULDER_GRADES.map((g) => [g.difficulty_id, g.font_grade]),
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sessionId: rawSessionId } = await params;
  const sessionId = decodeURIComponent(rawSessionId);

  try {
    const [sessionRows, participantRows, gradeRows] = await Promise.all([
      sql`
        SELECT bs.session_name
        FROM board_sessions bs
        WHERE bs.id = ${sessionId}
        LIMIT 1
      `,
      sql`
        SELECT DISTINCT
          COALESCE(up.display_name, u.name, 'Climber') as display_name
        FROM boardsesh_ticks bt
        JOIN users u ON u.id = bt.user_id
        LEFT JOIN user_profiles up ON up.user_id = bt.user_id
        WHERE bt.session_id = ${sessionId}
        LIMIT 6
      `,
      sql`
        SELECT bt.difficulty, COUNT(*) as cnt
        FROM boardsesh_ticks bt
        WHERE bt.session_id = ${sessionId}
          AND bt.status IN ('flash', 'send')
          AND bt.difficulty IS NOT NULL
        GROUP BY bt.difficulty
      `,
    ]);

    if (sessionRows.length === 0) {
      return { title: 'Session Not Found | Boardsesh' };
    }

    const sessionName = (sessionRows[0].session_name as string) || 'Climbing Session';
    const participantNames = participantRows
      .map((r) => r.display_name as string)
      .join(', ');

    const totalSends = gradeRows.reduce((sum, r) => sum + Number(r.cnt), 0);
    const grades = gradeRows
      .map((r) => DIFFICULTY_TO_GRADE[Number(r.difficulty)])
      .filter(Boolean);
    const gradeRange = grades.length > 0 ? `${grades[0]} - ${grades[grades.length - 1]}` : '';

    const title = `Join ${sessionName} | Boardsesh`;
    const description = participantNames
      ? `${participantNames} sent ${totalSends} climbs${gradeRange ? ` (${gradeRange})` : ''}. Get on the wall!`
      : `Join this climbing session on Boardsesh`;

    const ogImageUrl = new URL('/api/og/session', 'https://boardsesh.com');
    ogImageUrl.searchParams.set('sessionId', sessionId);
    ogImageUrl.searchParams.set('variant', 'join');

    return {
      title,
      description,
      robots: { index: false, follow: true },
      openGraph: {
        title,
        description,
        type: 'website',
        url: `/join/${sessionId}`,
        images: [
          {
            url: ogImageUrl.toString(),
            width: 1200,
            height: 630,
            alt: `Join ${sessionName}`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl.toString()],
      },
    };
  } catch {
    return {
      title: 'Join Session | Boardsesh',
      description: 'Join a climbing session on Boardsesh',
      robots: { index: false, follow: true },
    };
  }
}

export default async function JoinSessionPage({ params }: Props) {
  const { sessionId: rawSessionId } = await params;
  const sessionId = decodeURIComponent(rawSessionId);

  return <JoinRedirect sessionId={sessionId} />;
}
