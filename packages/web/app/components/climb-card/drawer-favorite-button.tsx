'use client';

import React from 'react';
import IconButton from '@mui/material/IconButton';
import FavoriteBorderOutlined from '@mui/icons-material/FavoriteBorderOutlined';
import Favorite from '@mui/icons-material/Favorite';
import { useFavorite } from '../climb-actions';
import { themeTokens } from '@/app/theme/theme-config';

type DrawerFavoriteButtonProps = {
  climbUuid: string;
};

/** Compact favorite toggle for use in drawer headers (e.g. playlist selector). */
export default function DrawerFavoriteButton({ climbUuid }: DrawerFavoriteButtonProps) {
  const { isFavorited, toggleFavorite } = useFavorite({ climbUuid });

  return (
    <IconButton
      size="small"
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite();
      }}
      sx={{ color: isFavorited ? themeTokens.colors.error : 'var(--neutral-400)' }}
    >
      {isFavorited ? <Favorite fontSize="small" /> : <FavoriteBorderOutlined fontSize="small" />}
    </IconButton>
  );
}
