package com.boardsesh.app;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.webkit.WebViewClient;

import org.junit.Test;

public class DevOverrideRescuePolicyTest {

    // -- shouldShowForNetworkError ------------------------------------------

    @Test
    public void networkError_shownWhenDebugMainFrameOverrideAndNetworkCode() {
        assertTrue(DevOverrideRescuePolicy.shouldShowForNetworkError(
            true, true, true, WebViewClient.ERROR_HOST_LOOKUP));
        assertTrue(DevOverrideRescuePolicy.shouldShowForNetworkError(
            true, true, true, WebViewClient.ERROR_CONNECT));
        assertTrue(DevOverrideRescuePolicy.shouldShowForNetworkError(
            true, true, true, WebViewClient.ERROR_TIMEOUT));
    }

    @Test
    public void networkError_notShownForSubframeRequests() {
        assertFalse(DevOverrideRescuePolicy.shouldShowForNetworkError(
            false, true, true, WebViewClient.ERROR_CONNECT));
    }

    @Test
    public void networkError_notShownInReleaseBuilds() {
        assertFalse(DevOverrideRescuePolicy.shouldShowForNetworkError(
            true, false, true, WebViewClient.ERROR_CONNECT));
    }

    @Test
    public void networkError_notShownWithoutActiveOverride() {
        assertFalse(DevOverrideRescuePolicy.shouldShowForNetworkError(
            true, true, false, WebViewClient.ERROR_CONNECT));
    }

    @Test
    public void networkError_notShownForNonNetworkErrors() {
        assertFalse(DevOverrideRescuePolicy.shouldShowForNetworkError(
            true, true, true, WebViewClient.ERROR_UNKNOWN));
        assertFalse(DevOverrideRescuePolicy.shouldShowForNetworkError(
            true, true, true, WebViewClient.ERROR_UNSUPPORTED_SCHEME));
    }

    @Test
    public void networkError_boundaryForIoAndFileNotFound() {
        // ERROR_IO is classified as a network error by OfflineFallbackPolicy — a
        // truncated response mid-flight should show the rescue page.
        assertTrue(DevOverrideRescuePolicy.shouldShowForNetworkError(
            true, true, true, WebViewClient.ERROR_IO));
        // ERROR_FILE_NOT_FOUND is NOT a network error (it's a file:// failure,
        // not relevant to a dev server) and should not trigger the rescue page.
        assertFalse(DevOverrideRescuePolicy.shouldShowForNetworkError(
            true, true, true, WebViewClient.ERROR_FILE_NOT_FOUND));
    }

    // -- shouldShowForHttpError ---------------------------------------------

    @Test
    public void httpError_shownForServerErrors() {
        assertTrue(DevOverrideRescuePolicy.shouldShowForHttpError(true, true, true, 500));
        assertTrue(DevOverrideRescuePolicy.shouldShowForHttpError(true, true, true, 502));
        assertTrue(DevOverrideRescuePolicy.shouldShowForHttpError(true, true, true, 503));
        assertTrue(DevOverrideRescuePolicy.shouldShowForHttpError(true, true, true, 599));
    }

    @Test
    public void httpError_shownForAuthWalls() {
        assertTrue(DevOverrideRescuePolicy.shouldShowForHttpError(true, true, true, 401));
        assertTrue(DevOverrideRescuePolicy.shouldShowForHttpError(true, true, true, 403));
    }

    @Test
    public void httpError_notShownForOtherClientErrors() {
        // 404 / 418 / 429 may be intentional responses from the dev server and
        // are better handled as normal pages, not by swallowing them with the
        // rescue page.
        assertFalse(DevOverrideRescuePolicy.shouldShowForHttpError(true, true, true, 404));
        assertFalse(DevOverrideRescuePolicy.shouldShowForHttpError(true, true, true, 418));
        assertFalse(DevOverrideRescuePolicy.shouldShowForHttpError(true, true, true, 429));
    }

    @Test
    public void httpError_notShownForSuccessStatuses() {
        assertFalse(DevOverrideRescuePolicy.shouldShowForHttpError(true, true, true, 200));
        assertFalse(DevOverrideRescuePolicy.shouldShowForHttpError(true, true, true, 304));
    }

    @Test
    public void httpError_notShownForSubframeRequests() {
        assertFalse(DevOverrideRescuePolicy.shouldShowForHttpError(false, true, true, 500));
    }

    @Test
    public void httpError_notShownInReleaseBuilds() {
        assertFalse(DevOverrideRescuePolicy.shouldShowForHttpError(true, false, true, 500));
    }

    @Test
    public void httpError_notShownWithoutActiveOverride() {
        assertFalse(DevOverrideRescuePolicy.shouldShowForHttpError(true, true, false, 500));
    }
}
