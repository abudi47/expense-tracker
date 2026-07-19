package expo.modules.androidsmsreader

object SmsBridge {
  var listener: ((Map<String, Any?>) -> Unit)? = null

  /** Address keywords / body keywords for Ethiopian bank SMS */
  val addressHints = listOf(
    "cbe", "commercial", "abyssinia", "boa", "telebirr", "ethiotelecom", "ethio telecom",
    "ethio", "bank of abyssinia",
    // Common Ethiopian short codes / sender ids
    "127", "8072", "8894", "8907", "8520", "9401", "922", "989", "8397"
  )

  val bodyHints = listOf(
    "credited", "debited", "debit", "credit", "transferred", "received", "etb", "balance",
    "telebirr", "cbe", "abyssinia", "mb-receipt", "mbreciept", "mreciept", "mbreciept.cbe",
    "txn", "purchase made", "transaction number", "ethiotelecom", "ethio telecom",
    "thanks for banking", "service charge", "disaster recovery", "available balance",
    "e-money", "bankofabyssinia", "you have paid", "you have transferred", "you have received"
  )

  fun looksLikeBankSms(address: String?, body: String?): Boolean {
    val a = (address ?: "").lowercase().replace("\\s+".toRegex(), " ").trim()
    val b = (body ?: "").lowercase()
    if (addressHints.any { a.contains(it) }) return true
    if (bodyHints.count { b.contains(it) } >= 2) return true
    if (b.contains("mbreciept") || b.contains("mreciept") || b.contains("bankofabyssinia")) return true
    if (b.contains("transactioninfo.ethiotelecom")) return true
    return Regex("etb\\s*[\\d,]+", RegexOption.IGNORE_CASE).containsMatchIn(b) &&
      (b.contains("balance") || b.contains("transfer") || b.contains("credit") ||
        b.contains("debit") || b.contains("telebirr") || b.contains("paid"))
  }
}
