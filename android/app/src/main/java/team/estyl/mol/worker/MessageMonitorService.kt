package team.estyl.mol.worker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.provider.Settings
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

class MessageMonitorService : Service() {
    companion object {
        private const val API = "https://n8n.estyl.team/webhook/"
        private const val BACKGROUND_CHANNEL = "mol_v3_background"
        private const val ALERT_CHANNEL = "mol_v3_critical_messages"
        private const val FOREGROUND_ID = 73001

        fun start(context: Context) {
            val i = Intent(context, MessageMonitorService::class.java)
            if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(i) else context.startService(i)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, MessageMonitorService::class.java))
        }
    }

    private lateinit var store: SessionStore
    private lateinit var scheduler: ScheduledExecutorService
    @Volatile private var lastSessionRefresh = 0L

    override fun onCreate() {
        super.onCreate()
        store = SessionStore(this)
        createChannels()
        startForeground(FOREGROUND_ID, backgroundNotification())
        scheduler = Executors.newSingleThreadScheduledExecutor()
        scheduler.scheduleWithFixedDelay({ safePoll() }, 0, 10, TimeUnit.SECONDS)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (store.token().isBlank()) {
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    override fun onDestroy() {
        if (::scheduler.isInitialized) scheduler.shutdownNow()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun safePoll() {
        val token = store.token()
        if (token.isBlank()) {
            stopSelf()
            return
        }
        try {
            val now = System.currentTimeMillis()
            if (now - lastSessionRefresh > 30 * 60 * 1000L) {
                val status = get("mol-app-v3-auth-session", token, mapOf("X-MOL-Surface" to "mobile"))
                if (status.code == 401 || status.code == 403) {
                    store.clearToken()
                    stopSelf()
                    return
                }
                if (status.code in 200..299) lastSessionRefresh = now
            }

            val response = get("mol-app-v3-comm-list?limit=100", token)
            if (response.code == 401 || response.code == 403) {
                store.clearToken()
                stopSelf()
                return
            }
            if (response.code !in 200..299) return
            handleMessages(response.body)
        } catch (_: Throwable) {
        }
    }

    private fun handleMessages(body: String) {
        val envelope = unwrapEnvelope(body) ?: return
        val data = envelope.optJSONObject("data") ?: return
        val items = data.optJSONArray("items") ?: JSONArray()
        val known = store.notifiedIds()
        val currentIds = mutableSetOf<String>()
        val baselineReady = store.baselineReady()

        for (i in 0 until items.length()) {
            val m = items.optJSONObject(i) ?: continue
            val id = m.optString("message_id").trim()
            if (id.isBlank()) continue
            currentIds += id

            val type = m.optString("type")
            val cause = m.optString("cause_status")
            val relevant = type == "MANUAL" || cause == "OPEN"
            if (baselineReady && relevant && !known.contains(id)) {
                notifyMessage(
                    id = id,
                    title = if (type == "MANUAL") "Nowa wiadomość od lidera" else alertTitle(type),
                    content = m.optString("content").ifBlank { "Nowy komunikat MOL V3" }
                )
            }
        }

        known += currentIds
        store.saveNotifiedIds(known)
        if (!baselineReady) store.markBaselineReady()
    }

    private fun alertTitle(type: String): String = when (type) {
        "NO_PROCESS" -> "Brak aktywnego procesu"
        "NO_ACTIVITY" -> "Brak aktywności"
        "WRONG_PROCESS" -> "Niezgodny proces"
        "WORK_OUTSIDE_APP" -> "Praca poza aplikacją"
        "ATTENDANCE_CORRECTION" -> "Korekta czasu pracy"
        "FORGOTTEN_STOP" -> "Brak STOP"
        else -> "Nowy komunikat MOL V3"
    }

    private fun notifyMessage(id: String, title: String, content: String) {
        wakeScreenBriefly()

        val open = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("wake", true)
            putExtra("openMessages", true)
            putExtra("messageId", id)
        }
        val pending = PendingIntent.getActivity(
            this,
            id.hashCode(),
            open,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = Notification.Builder(this, ALERT_CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle(title)
            .setContentText(content)
            .setStyle(Notification.BigTextStyle().bigText(content))
            .setContentIntent(pending)
            .setFullScreenIntent(pending, true)
            .setAutoCancel(true)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setCategory(Notification.CATEGORY_MESSAGE)
            .setPriority(Notification.PRIORITY_MAX)
            .build()

        getSystemService(NotificationManager::class.java)
            .notify(74000 + (id.hashCode() and 0x7fff), notification)
    }

    private fun wakeScreenBriefly() {
        @Suppress("DEPRECATION")
        val lock = (getSystemService(POWER_SERVICE) as PowerManager).newWakeLock(
            PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "MOLV3:MessageWake"
        )
        runCatching { lock.acquire(5000L) }
    }

    private fun createChannels() {
        val nm = getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(BACKGROUND_CHANNEL) == null) {
            nm.createNotificationChannel(
                NotificationChannel(
                    BACKGROUND_CHANNEL,
                    "MOL V3 — działanie w tle",
                    NotificationManager.IMPORTANCE_MIN
                ).apply {
                    description = "Stałe połączenie aplikacji pracownika"
                    setShowBadge(false)
                }
            )
        }

        if (nm.getNotificationChannel(ALERT_CHANNEL) == null) {
            val sound: Uri = Settings.System.DEFAULT_NOTIFICATION_URI
            val attrs = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                .build()
            nm.createNotificationChannel(
                NotificationChannel(
                    ALERT_CHANNEL,
                    "MOL V3 — wiadomości pilne",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Wiadomości lidera i aktywne alerty"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 500, 250, 500, 250, 700)
                    setSound(sound, attrs)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                }
            )
        }
    }

    private fun backgroundNotification(): Notification {
        val pending = PendingIntent.getActivity(
            this,
            73001,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return Notification.Builder(this, BACKGROUND_CHANNEL)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentTitle("MOL V3 działa w tle")
            .setContentText("Nasłuchiwanie komunikatów jest aktywne")
            .setContentIntent(pending)
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_SERVICE)
            .build()
    }

    private data class HttpResult(val code: Int, val body: String)

    private fun get(path: String, token: String, extraHeaders: Map<String, String> = emptyMap()): HttpResult {
        val conn = URL(API + path).openConnection() as HttpURLConnection
        return try {
            conn.requestMethod = "GET"
            conn.connectTimeout = 12000
            conn.readTimeout = 12000
            conn.setRequestProperty("Accept", "application/json")
            conn.setRequestProperty("Authorization", "Bearer $token")
            for ((k, v) in extraHeaders) conn.setRequestProperty(k, v)
            val code = conn.responseCode
            val stream = if (code in 200..399) conn.inputStream else conn.errorStream
            HttpResult(code, stream?.bufferedReader()?.use { it.readText() }.orEmpty())
        } finally {
            conn.disconnect()
        }
    }

    private fun unwrapEnvelope(raw: String): JSONObject? {
        val root = runCatching { JSONTokener(raw.removePrefix("\uFEFF")).nextValue() }.getOrNull() ?: return null
        var obj = when (root) {
            is JSONObject -> root
            is JSONArray -> if (root.length() == 1) root.optJSONObject(0) else null
            else -> null
        } ?: return null
        if (!obj.has("ok") && obj.opt("body") is JSONObject) obj = obj.optJSONObject("body") ?: obj
        return if (obj.optBoolean("ok", false)) obj else null
    }
}
