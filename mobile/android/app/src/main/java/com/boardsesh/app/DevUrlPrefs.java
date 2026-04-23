package com.boardsesh.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.text.TextUtils;

/**
 * Debug-only persistence for overriding the Capacitor server URL at runtime.
 * Release callers should gate on {@link BuildConfig#DEBUG} — this class itself
 * is storage-only and does not enforce that guard.
 */
public final class DevUrlPrefs {
    private static final String PREFS_NAME = "dev_url_prefs";
    private static final String KEY_OVERRIDE_URL = "override_url";

    private DevUrlPrefs() {}

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext()
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public static String getOverrideUrl(Context context) {
        String stored = prefs(context).getString(KEY_OVERRIDE_URL, null);
        if (TextUtils.isEmpty(stored)) {
            return null;
        }
        return stored;
    }

    public static void setOverrideUrl(Context context, String url) {
        SharedPreferences.Editor editor = prefs(context).edit();
        if (url == null) {
            editor.remove(KEY_OVERRIDE_URL);
        } else {
            String trimmed = url.trim();
            if (trimmed.isEmpty()) {
                editor.remove(KEY_OVERRIDE_URL);
            } else {
                editor.putString(KEY_OVERRIDE_URL, trimmed);
            }
        }
        editor.apply();
    }
}
