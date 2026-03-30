'use client';

import React, { useRef, useEffect } from 'react';
import Skeleton from '@mui/material/Skeleton';
import CircularProgress from '@mui/material/CircularProgress';
import styles from './board-scroll.module.css';

interface BoardScrollSectionProps {
  title?: string;
  loading?: boolean;
  size?: 'default' | 'small';
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  children: React.ReactNode;
}

export default function BoardScrollSection({
  title,
  loading,
  size = 'default',
  onLoadMore,
  hasMore,
  isLoadingMore,
  children,
}: BoardScrollSectionProps) {
  const isSmall = size === 'small';
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!hasMore || !onLoadMoreRef.current || !sentinelRef.current || !scrollRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMoreRef.current?.();
        }
      },
      {
        root: scrollRef.current,
        rootMargin: '0px 200px 0px 0px',
        threshold: 0,
      },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`${styles.scrollSection} ${isSmall ? styles.scrollSectionSmall : ''}`}>
      {title && <div className={styles.sectionTitle}>{title}</div>}
      <div
        ref={scrollRef}
        className={`${styles.scrollContainer} ${isSmall ? styles.scrollContainerSmall : ''}`}
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`${styles.cardScroll} ${isSmall ? styles.cardScrollSmall : ''}`}>
                <Skeleton variant="rounded" className={styles.skeletonSquare} />
                <Skeleton variant="text" width="80%" className={styles.skeletonText} />
                <Skeleton variant="text" width="50%" className={styles.skeletonText} />
              </div>
            ))
          : children}
        {hasMore && (
          <div ref={sentinelRef} className={styles.loadMoreSentinel}>
            {isLoadingMore && <CircularProgress size={24} />}
          </div>
        )}
      </div>
    </div>
  );
}
