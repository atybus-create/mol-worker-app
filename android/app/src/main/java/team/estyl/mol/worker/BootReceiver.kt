package team.estyl.mol.worker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (SessionStore(context).token().isNotBlank()) {
            MessageMonitorService.start(context)
        }
    }
}
