package team.estyl.mol.worker

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.NotificationManager
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {
    companion object {
        private const val MOBILE_ROOT = "https://atybus-create.github.io/mol-worker-app/pwa/mobile/"
    }

    private lateinit var webView: WebView
    private lateinit var store: SessionStore

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        store = SessionStore(this)

        webView = WebView(this)
        setContentView(webView)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.databaseEnabled = true
        webView.settings.userAgentString = webView.settings.userAgentString + " MOLNative/3.0"
        webView.addJavascriptInterface(NativeBridge(), "MOLNative")
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return false
                val allowed = uri.scheme == "https" &&
                    uri.host == "atybus-create.github.io" &&
                    uri.path.orEmpty().startsWith("/mol-worker-app/")
                if (allowed) return false
                runCatching { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
                return true
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                if (intent.getBooleanExtra("openMessages", false)) {
                    view?.evaluateJavascript("window.MOLMobileShow?.('messages');", null)
                    intent.removeExtra("openMessages")
                }
            }
        }

        requestNotificationPermission()
        handleWakeIntent(intent)

        val startPage = if (store.token().isNotBlank()) "index.html" else "login.html"
        webView.loadUrl(MOBILE_ROOT + startPage)

        if (store.token().isNotBlank()) {
            MessageMonitorService.start(this)
            requestCriticalAlertAccessIfNeeded()
        }
    }

    override fun onResume() {
        super.onResume()
        if (::store.isInitialized && store.token().isNotBlank()) {
            requestCriticalAlertAccessIfNeeded()
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleWakeIntent(intent)
        if (::webView.isInitialized && intent.getBooleanExtra("openMessages", false)) {
            webView.evaluateJavascript("window.MOLMobileShow?.('messages');", null)
            intent.removeExtra("openMessages")
        }
    }

    private fun handleWakeIntent(intent: Intent) {
        if (!intent.getBooleanExtra("wake", false)) return
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 4101)
        }
    }

    private fun requestCriticalAlertAccessIfNeeded() {
        if (Build.VERSION.SDK_INT >= 34) {
            val nm = getSystemService(NotificationManager::class.java)
            if (!nm.canUseFullScreenIntent()) {
                runCatching {
                    startActivity(
                        Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)
                            .setData(Uri.parse("package:$packageName"))
                    )
                }
                return
            }
        }

        val pm = getSystemService(PowerManager::class.java)
        if (!pm.isIgnoringBatteryOptimizations(packageName)) {
            runCatching {
                startActivity(
                    Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                        .setData(Uri.parse("package:$packageName"))
                )
            }
        }
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    inner class NativeBridge {
        @JavascriptInterface
        fun getSessionToken(): String = store.token()

        @JavascriptInterface
        fun setSessionToken(token: String?) {
            val clean = token.orEmpty().trim()
            if (clean.isBlank()) {
                store.clearToken()
                runOnUiThread { MessageMonitorService.stop(this@MainActivity) }
            } else {
                store.setToken(clean)
                runOnUiThread {
                    MessageMonitorService.start(this@MainActivity)
                    requestCriticalAlertAccessIfNeeded()
                }
            }
        }
    }
}
