import React from 'react';
import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { sql } from '@/app/lib/db/db';
import { themeTokens } from '@/app/theme/theme-config';

export const runtime = 'edge';

function capitalizeBoardType(boardType: string): string {
  if (boardType === 'moonboard') return 'MoonBoard';
  return boardType.charAt(0).toUpperCase() + boardType.slice(1);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uuid = searchParams.get('uuid');

    if (!uuid) {
      return new Response('Missing uuid parameter', { status: 400 });
    }

    const rows = await sql`
      SELECT p.name, p.description, p.color, p.icon, p.is_public,
             p.board_type,
             (SELECT COUNT(*) FROM playlist_climbs pc WHERE pc.playlist_id = p.id) as climb_count
      FROM playlists p
      WHERE p.uuid = ${uuid}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return new Response('Playlist not found', { status: 404 });
    }

    const playlist = rows[0];
    const name = (playlist.name as string) || 'Playlist';
    const description = playlist.description as string | null;
    const color = (playlist.color as string) || themeTokens.colors.primary;
    const icon = (playlist.icon as string) || null;
    const boardType = playlist.board_type as string;
    const climbCount = Number(playlist.climb_count);
    const boardLabel = capitalizeBoardType(boardType);

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            background: '#FFFFFF',
            padding: '60px 80px',
            gap: '48px',
          }}
        >
          {/* Left: Colored square with icon */}
          <div
            style={{
              width: '280px',
              height: '280px',
              borderRadius: '32px',
              backgroundColor: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: '120px',
                lineHeight: 1,
                color: '#FFFFFF',
              }}
            >
              {icon || '\u{1F3B5}'}
            </div>
          </div>

          {/* Right: Info */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: themeTokens.neutral[900],
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {name}
            </div>

            {description && (
              <div
                style={{
                  fontSize: '24px',
                  color: themeTokens.neutral[500],
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {description.length > 120 ? `${description.slice(0, 120)}...` : description}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '24px',
                marginTop: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '28px',
                  color: themeTokens.neutral[600],
                  fontWeight: 600,
                }}
              >
                {climbCount} {climbCount === 1 ? 'climb' : 'climbs'}
              </div>
              <div
                style={{
                  fontSize: '28px',
                  color: themeTokens.neutral[400],
                }}
              >
                {boardLabel}
              </div>
            </div>
          </div>

          {/* Branding */}
          <div
            style={{
              position: 'absolute',
              bottom: '24px',
              right: '40px',
              fontSize: '20px',
              color: themeTokens.neutral[300],
              fontWeight: 600,
            }}
          >
            boardsesh.com
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error) {
    console.error('Error generating playlist OG image:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`Error generating image: ${message}`, { status: 500 });
  }
}
