package com.nukhba.distributiondemo;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public final class MainActivity extends Activity {
    private static final String PREFS = "nukhba_distribution_trial_native_v1";
    private static final String FIRST = "first_launch_ms";
    private static final String LAST = "last_seen_ms";
    private static final long DURATION = 3L * 24L * 60L * 60L * 1000L;
    private static final long ROLLBACK_TOLERANCE = 5L * 60L * 1000L;
    private WebView webView;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        immersive();
        configureWebView();
    }

    private void immersive() {
        Window w = getWindow();
        w.setStatusBarColor(Color.TRANSPARENT);
        w.setNavigationBarColor(Color.BLACK);
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = w.getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            w.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private void configureWebView() {
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(244, 244, 240));
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new TrialBridge(), "NativeTrial");
        setContentView(webView);
        webView.loadUrl("file:///android_asset/index.html");
    }

    private TrialState trialState() {
        SharedPreferences p = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        long now = System.currentTimeMillis();
        long first = p.getLong(FIRST, 0L);
        long last = p.getLong(LAST, 0L);
        if (first <= 0L) {
            first = now;
            last = now;
            p.edit().putLong(FIRST, first).putLong(LAST, last).apply();
        }
        boolean rollback = last > 0L && now < last - ROLLBACK_TOLERANCE;
        long remaining = Math.max(0L, DURATION - Math.max(0L, now - first));
        if (!rollback && now > last) p.edit().putLong(LAST, now).apply();
        return new TrialState(!rollback && remaining > 0L, remaining, rollback);
    }

    @Override protected void onResume() {
        super.onResume();
        immersive();
        if (webView != null) webView.evaluateJavascript("if(window.refreshNativeTrial){window.refreshNativeTrial();}", null);
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }

    private final class TrialBridge {
        @JavascriptInterface public boolean isAllowed() { return trialState().allowed; }
        @JavascriptInterface public long getRemainingMillis() { return trialState().remaining; }
        @JavascriptInterface public boolean isClockRollbackDetected() { return trialState().rollback; }
    }

    private static final class TrialState {
        final boolean allowed; final long remaining; final boolean rollback;
        TrialState(boolean allowed, long remaining, boolean rollback) { this.allowed = allowed; this.remaining = remaining; this.rollback = rollback; }
    }
}
