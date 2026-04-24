import { isNativeApp } from '@/app/lib/ble/capacitor-utils';

let cached: string | null | undefined;

/**
 * Returns a short version string for telemetry. On native this is
 * `${version} (${build})` from `@capacitor/app` App.getInfo(). On web it
 * returns `process.env.NEXT_PUBLIC_APP_VERSION` if present, otherwise null.
 * Result is memoized for the life of the page.
 */
export async function getAppVersion(): Promise<string | null> {
  if (cached !== undefined) return cached;
  if (isNativeApp()) {
    const plugin = window.Capacitor?.Plugins?.App;
    if (plugin) {
      try {
        const info = await plugin.getInfo();
        cached = `${info.version} (${info.build})`;
        return cached;
      } catch {
        // Fall through
      }
    }
  }
  cached = process.env.NEXT_PUBLIC_APP_VERSION ?? null;
  return cached;
}
