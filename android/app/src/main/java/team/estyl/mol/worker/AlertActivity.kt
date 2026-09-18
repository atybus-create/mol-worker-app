package team.estyl.mol.worker

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class AlertActivity : Activity() {
    private var wakeLock: PowerManager.WakeLock? = null
    private val closeHandler = Handler(Looper.getMainLooper())
    private val autoClose = Runnable { if (!isFinishing) finish() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prepareLockScreen()
        acquireWakeLock()
        renderAlert(intent)
        closeHandler.postDelayed(autoClose, 60_000L)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        prepareLockScreen()
        acquireWakeLock()
        renderAlert(intent)
        closeHandler.removeCallbacks(autoClose)
        closeHandler.postDelayed(autoClose, 60_000L)
    }

    private fun prepareLockScreen() {
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }
        @Suppress("DEPRECATION")
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON
        )
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility =
            View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
    }

    @Suppress("DEPRECATION")
    private fun acquireWakeLock() {
        if (wakeLock?.isHeld == true) return
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or
                PowerManager.ACQUIRE_CAUSES_WAKEUP or
                PowerManager.ON_AFTER_RELEASE,
            "MOLV3:FullScreenAlert"
        ).apply {
            runCatching { acquire(65_000L) }
        }
    }

    private fun renderAlert(source: Intent) {
        val title = source.getStringExtra("title").orEmpty().ifBlank { "Nowa wiadomość" }
        val content = source.getStringExtra("content").orEmpty().ifBlank { "Sprawdź komunikaty MOL V3." }

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(28), dp(28), dp(28), dp(28))
            setBackgroundColor(Color.rgb(165, 18, 18))
        }

        root.addView(TextView(this).apply {
            text = "!"
            setTextColor(Color.WHITE)
            textSize = 160f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            contentDescription = "Ważne powiadomienie"
        }, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            0,
            3f
        ))

        root.addView(TextView(this).apply {
            text = title.uppercase()
            setTextColor(Color.WHITE)
            textSize = 30f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { bottomMargin = dp(18) })

        root.addView(TextView(this).apply {
            text = content
            setTextColor(Color.WHITE)
            textSize = 21f
            gravity = Gravity.CENTER
            setLineSpacing(0f, 1.15f)
        }, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            0,
            2f
        ))

        root.addView(Button(this).apply {
            text = "OTWÓRZ WIADOMOŚCI"
            textSize = 18f
            setOnClickListener { openMessages() }
        }, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            dp(58)
        ).apply { topMargin = dp(24) })

        root.addView(Button(this).apply {
            text = "ZAMKNIJ"
            textSize = 16f
            setOnClickListener { finish() }
        }, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            dp(52)
        ).apply { topMargin = dp(10) })

        setContentView(root)
    }

    private fun openMessages() {
        startActivity(
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("openMessages", true)
                putExtra("messageId", intent.getStringExtra("messageId"))
            }
        )
        finish()
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    override fun onDestroy() {
        closeHandler.removeCallbacks(autoClose)
        wakeLock?.let { if (it.isHeld) runCatching { it.release() } }
        wakeLock = null
        super.onDestroy()
    }
}
