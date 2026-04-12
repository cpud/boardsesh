import { track } from '@vercel/analytics';

type ShareOptions = {
  /** The full URL to share */
  url: string;
  /** Title for the native share sheet */
  title: string;
  /** Description text for the native share sheet */
  text: string;
  /** Vercel Analytics event name, e.g. 'Profile Shared' */
  trackingEvent: string;
  /** Additional properties for the analytics event */
  trackingProps?: Record<string, string>;
  /** Called after successful clipboard copy */
  onClipboardSuccess?: () => void;
  /** Called when sharing fails entirely */
  onError?: () => void;
};

export async function shareWithFallback({
  url,
  title,
  text,
  trackingEvent,
  trackingProps = {},
  onClipboardSuccess,
  onError,
}: ShareOptions): Promise<void> {
  const shareData = { title, text, url };

  try {
    if (navigator.share && navigator.canShare?.(shareData)) {
      await navigator.share(shareData);
      track(trackingEvent, { ...trackingProps, method: 'native' });
    } else {
      await navigator.clipboard.writeText(url);
      onClipboardSuccess?.();
      track(trackingEvent, { ...trackingProps, method: 'clipboard' });
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      try {
        await navigator.clipboard.writeText(url);
        onClipboardSuccess?.();
      } catch {
        onError?.();
      }
    }
  }
}
