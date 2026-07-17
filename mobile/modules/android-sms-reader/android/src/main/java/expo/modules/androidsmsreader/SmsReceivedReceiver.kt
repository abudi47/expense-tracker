package expo.modules.androidsmsreader

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import android.telephony.SmsMessage

class SmsReceivedReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context?, intent: Intent?) {
    if (intent?.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

    val messages: Array<SmsMessage> =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
        Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
      } else {
        return
      }

    if (messages.isEmpty()) return

    val body = StringBuilder()
    var address: String? = null
    var date: Long = System.currentTimeMillis()

    for (msg in messages) {
      if (address == null) address = msg.originatingAddress
      body.append(msg.messageBody ?: "")
      date = msg.timestampMillis
    }

    val text = body.toString()
    if (!SmsBridge.looksLikeBankSms(address, text)) return

    SmsBridge.listener?.invoke(
      mapOf(
        "messageId" to "${address ?: ""}-$date-${text.hashCode()}",
        "address" to (address ?: ""),
        "body" to text,
        "date" to date
      )
    )
  }
}
