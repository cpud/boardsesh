import { isNativeApp, getPlatform } from '@/app/lib/ble/capacitor-utils';
import { openExternalUrl } from '@/app/lib/open-external-url';
import { storeHttpsUrlForPlatform, storeSchemeUrlForPlatform } from '@/app/lib/store-urls';

/**
 * Ask the OS to display its native in-app review sheet. Falls back to the
 * platform store URL so the user still lands on a way to rate the app.
 *
 * Note: iOS SKStoreReviewController silently no-ops if the quota is exceeded
 * (3+ calls per 365 days) or the user opted out. The Android In-App Review
 * API also no-ops when the user recently rated. Both are expected platform
 * behavior — callers should treat this call as fire-and-forget.
 */
export async function requestInAppReview(): Promise<void> {
  const platform = getPlatform();
  if (isNativeApp()) {
    const plugin = window.Capacitor?.Plugins?.InAppReview;
    if (plugin) {
      try {
        await plugin.requestReview();
        return;
      } catch {
        // Fall through to store scheme URL — opens the real App Store /
        // Play Store app rather than an in-WebView listing page.
      }
    }
    openExternalUrl(storeSchemeUrlForPlatform(platform));
    return;
  }
  // Web: scheme URLs (itms-apps://, market://) don't resolve in a browser.
  // Use the https store URL instead.
  openExternalUrl(storeHttpsUrlForPlatform(platform));
}
