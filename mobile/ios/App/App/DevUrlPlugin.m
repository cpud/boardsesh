#import <Capacitor/Capacitor.h>

CAP_PLUGIN(DevUrlPlugin, "DevUrl",
    CAP_PLUGIN_METHOD(getState, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(setUrl, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(clearUrl, CAPPluginReturnPromise);
)
