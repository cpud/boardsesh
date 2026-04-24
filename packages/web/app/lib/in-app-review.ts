import { isNativeApp, getPlatform } from '@/app/lib/ble/capacitor-utils';
import { openExternalUrl } from '@/app/lib/open-external-url';
import { storeSchemeUrlForPlatform } from '@/app/lib/store-urls';

/**
 * Ask the OS to display its native in-app review sheet. Falls back to the
 * platform store scheme URL (itms-apps:// / market://) so the user lands in
 * the real store app rather than an in-WebView listing page.
 *
 * Note: iOS SKStoreReviewController silently no-ops if the quota is exceeded
 * (3+ calls per 365 days) or the user opted out. The Android In-App Review
 * API also no-ops when the user recently rated. Both are expected platform
 * behavior — callers should treat this call as fire-and-forget.
 */
export async function requestInAppReview(): Promise<void> {
  if (isNativeApp()) {
    const plugin = window.Capacitor?.Plugins?.InAppReview;
    if (plugin) {
      try {
        await plugin.requestReview();
        return;
      } catch {
        // Fall through to store URL
      }
    }
  }
  openExternalUrl(storeSchemeUrlForPlatform(getPlatform()));
}
