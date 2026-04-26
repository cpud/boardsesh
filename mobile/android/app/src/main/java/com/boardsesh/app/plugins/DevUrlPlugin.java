package com.boardsesh.app.plugins;

import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.os.Process;
import android.text.TextUtils;

import com.boardsesh.app.BuildConfig;
import com.boardsesh.app.DevUrlPrefs;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

/**
 * Lets debug builds swap the Capacitor server URL at runtime.
 *
 * The web UI (packages/web/app/lib/dev-url.ts) calls {@code getState} to decide
 * whether to render the Dev URL menu. In release builds {@code isDebug} is
 * always false and {@code setUrl} / {@code clearUrl} no-op.
 */
@CapacitorPlugin(name = "DevUrl")
public class DevUrlPlugin extends Plugin {
    public static final String DEFAULT_URL = "https://www.boardsesh.com";

    @PluginMethod
    public void getState(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("isDebug", BuildConfig.DEBUG);
        String current = DevUrlPrefs.getOverrideUrl(getContext());
        // Use JSONObject.NULL so the key serializes as JS `null` (not `undefined`)
        // to match the TypeScript contract `string | null`.
        ret.put("currentUrl", current != null ? current : JSONObject.NULL);
        ret.put("defaultUrl", DEFAULT_URL);
        call.resolve(ret);
    }

    @PluginMethod
    public void setUrl(PluginCall call) {
        if (!BuildConfig.DEBUG) {
            call.resolve();
            return;
        }
        String url = call.getString("url");
        if (!isValidHttpUrl(url)) {
            call.reject("Invalid URL: must be an http:// or https:// URL");
            return;
        }
        DevUrlPrefs.setOverrideUrl(getContext(), url);
        call.resolve();
        scheduleRestart();
    }

    /** Only accept absolute http(s) URLs — guards against garbage blocking the app. */
    static boolean isValidHttpUrl(String url) {
        if (TextUtils.isEmpty(url)) return false;
        Uri parsed = Uri.parse(url.trim());
        String scheme = parsed.getScheme();
        if (scheme == null) return false;
        String normalized = scheme.toLowerCase();
        if (!"http".equals(normalized) && !"https".equals(normalized)) return false;
        return !TextUtils.isEmpty(parsed.getHost());
    }

    @PluginMethod
    public void clearUrl(PluginCall call) {
        if (!BuildConfig.DEBUG) {
            call.resolve();
            return;
        }
        DevUrlPrefs.setOverrideUrl(getContext(), null);
        call.resolve();
        scheduleRestart();
    }

    private void scheduleRestart() {
        // Small delay so the JS-side promise resolves before we tear the process down.
        new Handler(Looper.getMainLooper()).postDelayed(
            () -> Process.killProcess(Process.myPid()),
            150
        );
    }
}
