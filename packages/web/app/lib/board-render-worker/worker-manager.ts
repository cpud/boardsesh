/**
 * Singleton manager for the board render Web Worker.
 *
 * Provides a Promise-based API to request board renders from the worker,
 * multiplexing multiple concurrent requests over a single worker instance.
 */

import type { RenderRequest, RenderResponse } from './board-render.worker';
import type { BoardDetails } from '@/app/lib/types';
import type { HoldRenderData } from '@/app/components/board-renderer/types';
import { getImageUrl } from '@/app/components/board-renderer/util';
import { HOLD_STATE_MAP } from '@/app/components/board-renderer/types';

// Thumbnail width matches server-side constant
const THUMBNAIL_WIDTH = 300;

// LRU cache for rendered bitmaps
const CACHE_MAX = 50;
const bitmapCache = new Map<string, ImageBitmap>();

function cacheKey(boardDetails: BoardDetails, frames: string, mirrored: boolean, thumbnail: boolean): string {
  return `${boardDetails.board_name}:${boardDetails.layout_id}:${boardDetails.size_id}:${boardDetails.set_ids.join(',')}:${frames}:${mirrored ? 1 : 0}:${thumbnail ? 1 : 0}`;
}

function cachePut(key: string, bitmap: ImageBitmap): void {
  // Evict oldest entry if at capacity
  if (bitmapCache.size >= CACHE_MAX) {
    const firstKey = bitmapCache.keys().next().value;
    if (firstKey !== undefined) {
      const evicted = bitmapCache.get(firstKey);
      evicted?.close();
      bitmapCache.delete(firstKey);
    }
  }
  bitmapCache.set(key, bitmap);
}

// Pending request tracking
type PendingRequest = {
  resolve: (bitmap: ImageBitmap) => void;
  reject: (error: Error) => void;
};

let worker: Worker | null = null;
let nextRequestId = 0;
const pendingRequests = new Map<number, PendingRequest>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./board-render.worker.ts', import.meta.url));
    worker.onmessage = (event: MessageEvent<RenderResponse>) => {
      const response = event.data;
      const pending = pendingRequests.get(response.id);
      if (!pending) return;
      pendingRequests.delete(response.id);

      if ('error' in response) {
        pending.reject(new Error(response.error));
      } else {
        pending.resolve(response.bitmap);
      }
    };
    worker.onerror = (event) => {
      // Reject all pending requests on worker error
      for (const [id, pending] of pendingRequests) {
        pending.reject(new Error(`Worker error: ${event.message}`));
        pendingRequests.delete(id);
      }
    };
  }
  return worker;
}

export interface RenderBoardOptions {
  boardDetails: BoardDetails;
  frames: string;
  mirrored: boolean;
  thumbnail?: boolean;
}

/**
 * Check if the browser supports OffscreenCanvas (required for worker rendering).
 */
export function isWorkerRenderingSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof OffscreenCanvas !== 'undefined' && typeof Worker !== 'undefined';
}

/**
 * Render a board image via the Web Worker.
 * Returns a cached ImageBitmap if available, otherwise queues a render request.
 */
export function renderBoard(options: RenderBoardOptions): Promise<ImageBitmap> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('renderBoard is not available during SSR'));
  }

  const { boardDetails, frames, mirrored, thumbnail = false } = options;
  const key = cacheKey(boardDetails, frames, mirrored, thumbnail);

  // Check cache
  const cached = bitmapCache.get(key);
  if (cached) {
    // Move to end for LRU ordering
    bitmapCache.delete(key);
    bitmapCache.set(key, cached);
    return Promise.resolve(cached);
  }

  const id = nextRequestId++;
  const outputWidth = thumbnail ? THUMBNAIL_WIDTH : boardDetails.boardWidth;

  // Build holds array for WASM
  const holds = boardDetails.holdsData.map((h: HoldRenderData) => ({
    id: h.id,
    mirrored_hold_id: h.mirroredHoldId,
    cx: h.cx,
    cy: h.cy,
    r: h.r,
  }));

  // Build hold state map for this board
  const holdStateMap: Record<number, { color: string }> = {};
  const boardStates = HOLD_STATE_MAP[boardDetails.board_name];
  for (const [code, info] of Object.entries(boardStates)) {
    holdStateMap[Number(code)] = { color: info.color };
  }

  // Build background image URLs
  const backgroundUrls = Object.keys(boardDetails.images_to_holds).map((img) =>
    getImageUrl(img, boardDetails.board_name, thumbnail),
  );

  const request: RenderRequest = {
    id,
    boardWidth: boardDetails.boardWidth,
    boardHeight: boardDetails.boardHeight,
    outputWidth,
    frames,
    mirrored,
    thumbnail,
    holds,
    holdStateMap,
    backgroundUrls,
  };

  return new Promise<ImageBitmap>((resolve, reject) => {
    pendingRequests.set(id, {
      resolve: (bitmap) => {
        cachePut(key, bitmap);
        resolve(bitmap);
      },
      reject,
    });
    getWorker().postMessage(request);
  });
}
