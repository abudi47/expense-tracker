package expo.modules.androidnotificationlistener

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AndroidNotificationListenerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AndroidNotificationListener")

    Events("onNotificationReceived")

    OnCreate {
      NotificationBridge.listener = { payload ->
        sendEvent("onNotificationReceived", payload)
      }
    }

    OnDestroy {
      NotificationBridge.listener = null
    }

    Function("isSupported") {
      true
    }

    Function("hasPermission") {
      val context = appContext.reactContext ?: return@Function false
      isNotificationServiceEnabled(context)
    }

    Function("openSettings") {
      val context = appContext.reactContext ?: return@Function
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    Function("setAllowedPackages") { packages: List<String> ->
      NotificationBridge.allowedPackages = packages.map { it.lowercase() }.toSet()
    }
  }

  private fun isNotificationServiceEnabled(context: Context): Boolean {
    val cn = ComponentName(context, AssetTrackerNotificationListener::class.java)
    val flat = Settings.Secure.getString(
      context.contentResolver,
      "enabled_notification_listeners"
    ) ?: return false
    if (TextUtils.isEmpty(flat)) return false
    return flat.split(":").any {
      ComponentName.unflattenFromString(it)?.equals(cn) == true ||
        it.contains(context.packageName)
    }
  }
}
