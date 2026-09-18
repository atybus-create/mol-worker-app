package team.estyl.mol.worker

import android.content.Context

class SessionStore(context: Context) {
    private val prefs = context.getSharedPreferences("mol_v3_native", Context.MODE_PRIVATE)

    fun token(): String = prefs.getString("session_token", "") ?: ""

    fun setToken(value: String) {
        if (value.isBlank()) clearToken() else prefs.edit()
            .putString("session_token", value.trim())
            .putBoolean("baseline_ready", false)
            .remove("notified_ids")
            .apply()
    }

    fun clearToken() {
        prefs.edit()
            .remove("session_token")
            .putBoolean("baseline_ready", false)
            .remove("notified_ids")
            .apply()
    }

    fun baselineReady(): Boolean = prefs.getBoolean("baseline_ready", false)

    fun markBaselineReady() {
        prefs.edit().putBoolean("baseline_ready", true).apply()
    }

    fun notifiedIds(): MutableSet<String> =
        (prefs.getStringSet("notified_ids", emptySet()) ?: emptySet()).toMutableSet()

    fun saveNotifiedIds(ids: Set<String>) {
        prefs.edit().putStringSet("notified_ids", ids.toSet()).apply()
    }

    fun promptedFullScreen(): Boolean = prefs.getBoolean("fsi_prompted", false)
    fun markFullScreenPrompted() = prefs.edit().putBoolean("fsi_prompted", true).apply()

    fun promptedBattery(): Boolean = prefs.getBoolean("battery_prompted", false)
    fun markBatteryPrompted() = prefs.edit().putBoolean("battery_prompted", true).apply()
}
