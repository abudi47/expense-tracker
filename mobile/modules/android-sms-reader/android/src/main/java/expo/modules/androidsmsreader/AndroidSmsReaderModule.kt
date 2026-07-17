package expo.modules.androidsmsreader

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Telephony
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AndroidSmsReaderModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AndroidSmsReader")

    Events("onSmsReceived")

    OnCreate {
      SmsBridge.listener = { payload ->
        sendEvent("onSmsReceived", payload)
      }
    }

    OnDestroy {
      SmsBridge.listener = null
    }

    Function("isSupported") {
      true
    }

    Function("hasPermission") {
      val context = appContext.reactContext ?: return@Function false
      ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) ==
        PackageManager.PERMISSION_GRANTED
    }

    AsyncFunction("scanRecent") { limit: Int ->
      val context = appContext.reactContext
        ?: throw CodedException("NO_CONTEXT", "React context unavailable", null)
      if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) !=
        PackageManager.PERMISSION_GRANTED
      ) {
        throw CodedException("NO_PERMISSION", "READ_SMS not granted", null)
      }

      val max = limit.coerceIn(1, 200)
      val results = mutableListOf<Map<String, Any?>>()
      val uri: Uri = Telephony.Sms.Inbox.CONTENT_URI
      val projection = arrayOf(
        Telephony.Sms._ID,
        Telephony.Sms.ADDRESS,
        Telephony.Sms.BODY,
        Telephony.Sms.DATE
      )

      context.contentResolver.query(
        uri,
        projection,
        null,
        null,
        "${Telephony.Sms.DATE} DESC"
      )?.use { cursor ->
        val idIdx = cursor.getColumnIndex(Telephony.Sms._ID)
        val addrIdx = cursor.getColumnIndex(Telephony.Sms.ADDRESS)
        val bodyIdx = cursor.getColumnIndex(Telephony.Sms.BODY)
        val dateIdx = cursor.getColumnIndex(Telephony.Sms.DATE)
        var scanned = 0
        while (cursor.moveToNext() && results.size < max && scanned < max * 8) {
          scanned += 1
          val address = if (addrIdx >= 0) cursor.getString(addrIdx) else null
          val body = if (bodyIdx >= 0) cursor.getString(bodyIdx) else null
          if (!SmsBridge.looksLikeBankSms(address, body)) continue
          val id = if (idIdx >= 0) cursor.getString(idIdx) else null
          val date = if (dateIdx >= 0) cursor.getLong(dateIdx) else System.currentTimeMillis()
          results.add(
            mapOf(
              "messageId" to (id ?: "${address}-$date"),
              "address" to (address ?: ""),
              "body" to (body ?: ""),
              "date" to date
            )
          )
        }
      }
      results
    }
  }
}
