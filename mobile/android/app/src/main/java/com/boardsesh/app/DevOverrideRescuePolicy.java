package com.boardsesh.app;

/**
 * Decides when the dev-override rescue page should be rendered.
 *
 * <p>When a debug build has a dev URL override active and the main-frame load
 * fails, the in-app Dev URL dialog is unreachable (the web UI never loads),
 * so we need a native-driven recovery page that links back to the
 * {@code boardsesh-dev://reset} escape hatch. Pure logic lives here so it can
 * be unit-tested without a running WebView.
 */
final class DevOverrideRescuePolicy {
    private DevOverrideRescuePolicy() {}

    /**
     * Network-level failures (DNS, connection refused, TLS, timeout) on the
     * main frame trigger the rescue page whenever a dev override is active,
     * regardless of device connectivity. Reuses {@link OfflineFallbackPolicy}
     * to keep the "is this a network error" definition in one place.
     */
    static boolean shouldShowForNetworkError(
        boolean isMainFrame,
        boolean isDebug,
        boolean hasOverride,
        int errorCode
    ) {
        return isMainFrame
            && isDebug
            && hasOverride
            && OfflineFallbackPolicy.isNetworkErrorCode(errorCode);
    }

    /**
     * HTTP-level failures on the main frame. Only surfaces for server errors
     * (5xx) and auth walls (401, 403) to match the "dev origin is broken /
     * gated" intent. 404s or other 4xx may be from a misconfigured route in
     * the dev server itself and are left to normal WebView handling.
     */
    static boolean shouldShowForHttpError(
        boolean isMainFrame,
        boolean isDebug,
        boolean hasOverride,
        int httpStatusCode
    ) {
        if (!(isMainFrame && isDebug && hasOverride)) return false;
        if (httpStatusCode >= 500) return true;
        return httpStatusCode == 401 || httpStatusCode == 403;
    }
}
