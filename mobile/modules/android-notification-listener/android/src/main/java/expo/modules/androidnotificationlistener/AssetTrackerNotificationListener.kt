package expo.modules.androidnotificationlistener

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.app.Notification

class AssetTrackerNotificationListener : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    if (sbn == null) return
    val pkg = sbn.packageName ?: return

    val allowed = NotificationBridge.allowedPackages
    if (allowed.isNotEmpty() && !allowed.contains(pkg.lowercase())) {
      return
    }

    val extras = sbn.notification?.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
    val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
      ?: extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
      ?: ""

    if (title.isBlank() && text.isBlank()) return

    NotificationBridge.listener?.invoke(
      mapOf(
        "title" to title,
        "body" to text,
        "packageName" to pkg,
        "postTime" to sbn.postTime
      )
    )
  }
}
