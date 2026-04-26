import Capacitor
import Foundation

/// Lets debug builds swap the Capacitor server URL at runtime.
///
/// The web UI (packages/web/app/lib/dev-url.ts) calls `getState` to decide
/// whether to render the Dev URL menu. In release builds `isDebug` is always
/// false and `setUrl` / `clearUrl` no-op.
@objc(DevUrlPlugin)
public class DevUrlPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DevUrlPlugin"
    public let jsName = "DevUrl"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setUrl", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearUrl", returnType: CAPPluginReturnPromise),
    ]

    static let defaultsKey = "dev_server_url"
    static let defaultUrl = "https://www.boardsesh.com"

    static var isDebugBuild: Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }

    static func currentOverride() -> String? {
        let stored = UserDefaults.standard.string(forKey: defaultsKey)
        guard let stored, !stored.isEmpty else { return nil }
        return stored
    }

    @objc func getState(_ call: CAPPluginCall) {
        call.resolve([
            "isDebug": DevUrlPlugin.isDebugBuild,
            "currentUrl": DevUrlPlugin.currentOverride() as Any? ?? NSNull(),
            "defaultUrl": DevUrlPlugin.defaultUrl,
        ])
    }

    @objc func setUrl(_ call: CAPPluginCall) {
        guard DevUrlPlugin.isDebugBuild else {
            call.resolve()
            return
        }
        let url = (call.getString("url") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard DevUrlPlugin.isValidHttpUrl(url) else {
            call.reject("Invalid URL: must be an http:// or https:// URL")
            return
        }
        UserDefaults.standard.set(url, forKey: DevUrlPlugin.defaultsKey)
        // Force synchronous persistence before we terminate. Deprecated but not
        // removed, and documented as the way to flush before `exit(0)` — which
        // bypasses the normal UIKit termination path that would flush for us.
        UserDefaults.standard.synchronize()
        call.resolve()
        scheduleRestart()
    }

    /// Only accept absolute http(s) URLs — guards against garbage blocking the app.
    static func isValidHttpUrl(_ url: String) -> Bool {
        guard !url.isEmpty, let parsed = URL(string: url), let scheme = parsed.scheme else {
            return false
        }
        let normalized = scheme.lowercased()
        guard normalized == "http" || normalized == "https" else { return false }
        guard let host = parsed.host, !host.isEmpty else { return false }
        return true
    }

    @objc func clearUrl(_ call: CAPPluginCall) {
        guard DevUrlPlugin.isDebugBuild else {
            call.resolve()
            return
        }
        UserDefaults.standard.removeObject(forKey: DevUrlPlugin.defaultsKey)
        UserDefaults.standard.synchronize()
        call.resolve()
        scheduleRestart()
    }

    private func scheduleRestart() {
        // Defense in depth: the compile-time #if DEBUG keeps `exit(0)` out of the
        // release binary, and the runtime isDebugBuild guard protects against a
        // future caller accidentally invoking this method in a release context.
        guard DevUrlPlugin.isDebugBuild else { return }
        #if DEBUG
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            exit(0)
        }
        #endif
    }
}
