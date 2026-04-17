'use client';

import React from 'react';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import BoardThumbnailGrid from './board-thumbnail-grid';
import styles from './board-scroll.module.css';

interface SearchBoardsCardProps {
  onClick: () => void;
  size?: 'default' | 'small';
}

export default function SearchBoardsCard({ onClick, size = 'default' }: SearchBoardsCardProps) {
  const isSmall = size === 'small';
  const iconSize = isSmall ? 28 : 36;

  return (
    <div className={`${styles.cardScroll} ${isSmall ? styles.cardScrollSmall : ''}`} onClick={onClick}>
      <div className={styles.cardSquare}>
        <BoardThumbnailGrid />
        <div className={styles.findNearbyOverlay}>
          <SearchOutlined sx={{ fontSize: iconSize, color: 'var(--color-primary)' }} />
        </div>
      </div>
      <div className={styles.cardName}>Search</div>
    </div>
  );
}
