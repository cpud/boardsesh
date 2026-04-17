'use client';

import React from 'react';
import BluetoothOutlined from '@mui/icons-material/BluetoothOutlined';
import BoardThumbnailGrid from './board-thumbnail-grid';
import styles from './board-scroll.module.css';

interface BluetoothQuickStartCardProps {
  size?: 'default' | 'small';
}

export default function BluetoothQuickStartCard({ size = 'default' }: BluetoothQuickStartCardProps) {
  const isSmall = size === 'small';
  const iconSize = isSmall ? 28 : 36;

  return (
    <div
      className={`${styles.cardScroll} ${isSmall ? styles.cardScrollSmall : ''} ${styles.cardScrollDisabled}`}
      aria-disabled="true"
    >
      <div className={`${styles.cardSquare} ${styles.cardSquareDisabled}`}>
        <BoardThumbnailGrid />
        <div className={styles.findNearbyOverlay}>
          <BluetoothOutlined sx={{ fontSize: iconSize, color: 'var(--neutral-500)' }} />
        </div>
      </div>
      <div className={`${styles.cardName} ${styles.cardNameDisabled}`}>Quick start (coming soon)</div>
    </div>
  );
}
