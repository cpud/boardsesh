'use client';

import React from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import Lightbulb from '@mui/icons-material/Lightbulb';
import IconButton from '@mui/material/IconButton';
import { useCurrentClimb, useSessionData } from '../graphql-queue';
import { useBluetoothContext } from '../board-bluetooth-control/bluetooth-context';
import './share-button.css';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';

export const ShareBoardButton = () => {
  const { showMessage } = useSnackbar();
  const {
    hasConnected,
    isSessionActive,
    sessionId,
  } = useSessionData();
  const {
    isConnected: isBoardConnected,
    connect: btConnect,
    disconnect: btDisconnect,
    loading: btLoading,
    isBluetoothSupported,
    isIOS,
  } = useBluetoothContext();
  const { currentClimbQueueItem } = useCurrentClimb();

  const isConnecting = !!(sessionId && !hasConnected);

  const handleLightbulbClick = async () => {
    if (isBoardConnected) {
      btDisconnect();
      return;
    }
    if (!isBluetoothSupported) {
      if (isIOS) {
        showMessage('Bluetooth needs the Bluefy browser on iOS', 'warning');
      } else {
        showMessage('Bluetooth is not supported in this browser', 'warning');
      }
      return;
    }
    if (currentClimbQueueItem) {
      await btConnect(
        currentClimbQueueItem.climb.frames,
        !!currentClimbQueueItem.climb.mirrored,
      );
    } else {
      await btConnect();
    }
  };

  return (
    <IconButton
      aria-label={isBoardConnected ? 'Disconnect from board' : 'Connect to board'}
      onClick={handleLightbulbClick}
      color={isSessionActive ? 'primary' : 'default'}
    >
      {isConnecting || btLoading ? (
        <CircularProgress size={16} />
      ) : isBoardConnected ? (
        <Lightbulb className="connect-button-glow" />
      ) : (
        <LightbulbOutlined />
      )}
    </IconButton>
  );
};
