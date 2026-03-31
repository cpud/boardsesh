/**
 * Web Worker for board rendering using WASM.
 *
 * Composites background board images + WASM-rendered hold overlay
 * into a single ImageBitmap, returned to the main thread.
 */

// Message types shared with worker-manager.ts
export type RenderRequest = {
  id: number;
  boardWidth: number;
  boardHeight: number;
  outputWidth: number;
  frames: string;
  mirrored: boolean;
  thumbnail: boolean;
  holds: Array<{ id: number; mirrored_hold_id?: number | null; cx: number; cy: number; r: number }>;
  holdStateMap: Record<number, { color: string }>;
  backgroundUrls: string[];
};

export type RenderResponse =
  | { id: number; bitmap: ImageBitmap }
  | { id: number; error: string };

// --- WASM module state ---
let wasmRenderOverlay: ((configJson: string) => Uint8Array) | null = null;
let wasmInitPromise: Promise<void> | null = null;

async function ensureWasmInitialized(): Promise<void> {
  if (wasmRenderOverlay) return;
  if (!wasmInitPromise) {
    wasmInitPromise = (async () => {
      // Dynamic import of the wasm-pack glue code
      // The glue's default export accepts a URL to the .wasm file
      // @ts-expect-error Runtime-resolved public asset, no TS declarations
      const wasmModule = await import(/* webpackIgnore: true */ '/wasm/board_renderer_wasm.js');
      await wasmModule.default('/wasm/board_renderer_wasm_bg.wasm');
      wasmRenderOverlay = wasmModule.render_overlay;
    })();
  }
  await wasmInitPromise;
}

// --- Image cache for background images ---
const bgImageCache = new Map<string, ImageBitmap>();

async function fetchBackgroundImage(url: string): Promise<ImageBitmap> {
  const cached = bgImageCache.get(url);
  if (cached) return cached;

  const response = await fetch(url);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  bgImageCache.set(url, bitmap);
  return bitmap;
}

// --- Main render function ---
async function renderBoard(request: RenderRequest): Promise<ImageBitmap> {
  await ensureWasmInitialized();

  const { boardWidth, boardHeight, outputWidth, frames, mirrored, thumbnail, holds, holdStateMap, backgroundUrls } =
    request;

  const outputHeight = Math.round((outputWidth * boardHeight) / boardWidth);

  // Fetch all background images in parallel
  const bgImages = await Promise.all(backgroundUrls.map(fetchBackgroundImage));

  // Create OffscreenCanvas at target resolution
  const canvas = new OffscreenCanvas(outputWidth, outputHeight);
  const ctx = canvas.getContext('2d')!;

  // Apply mirroring transform before drawing anything
  if (mirrored) {
    ctx.translate(outputWidth, 0);
    ctx.scale(-1, 1);
  }

  // Draw background images (scaled to fill canvas)
  for (const bgImage of bgImages) {
    ctx.drawImage(bgImage, 0, 0, outputWidth, outputHeight);
  }

  // Render hold overlay via WASM
  if (frames && wasmRenderOverlay) {
    const config = {
      board_width: boardWidth,
      board_height: boardHeight,
      output_width: outputWidth,
      frames,
      mirrored: false, // We handle mirroring via canvas transform
      thumbnail,
      holds,
      hold_state_map: holdStateMap,
    };

    const rawBytes = wasmRenderOverlay(JSON.stringify(config));

    // Parse dimension header: first 8 bytes are width + height as u32 LE
    const view = new DataView(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength);
    const overlayWidth = view.getUint32(0, true);
    const overlayHeight = view.getUint32(4, true);
    // Copy into a fresh Uint8ClampedArray (ImageData requires an owned ArrayBuffer)
    const rgbaSlice = rawBytes.slice(8);
    const rgbaData = new Uint8ClampedArray(rgbaSlice.buffer);

    // Draw overlay on top of backgrounds
    const overlayImageData = new ImageData(rgbaData, overlayWidth, overlayHeight);
    ctx.drawImage(await createImageBitmap(overlayImageData), 0, 0, outputWidth, outputHeight);
  }

  // Transfer as ImageBitmap
  return canvas.transferToImageBitmap();
}

// --- Worker message handler ---
self.onmessage = async (event: MessageEvent<RenderRequest>) => {
  const request = event.data;
  try {
    const bitmap = await renderBoard(request);
    const response: RenderResponse = { id: request.id, bitmap };
    self.postMessage(response, { transfer: [bitmap] });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const response: RenderResponse = { id: request.id, error };
    self.postMessage(response);
  }
};
