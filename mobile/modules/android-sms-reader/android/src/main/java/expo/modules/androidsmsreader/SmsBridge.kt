package expo.modules.androidsmsreader

object SmsBridge {
  var listener: ((Map<String, Any?>) -> Unit)? = null

  /** Address keywords / body keywords for Ethiopian bank SMS */
  val addressHints = listOf(
    "cbe", "commercial", "abyssinia", "boa", "telebirr", "ethiotelecom",
    // Common Ethiopian short codes
    "127", "8072", "8894", "8907", "8520", "9401", "922", "989"
  )

  val bodyHints = listOf(
    "credited", "debited", "debit", "credit", "transferred", "received", "etb", "balance",
    "telebirr", "cbe", "abyssinia", "mb-receipt", "mbreciept", "mreciept", "txn",
    "purchase made", "transaction number", "ethiotelecom"
  )

  fun looksLikeBankSms(address: String?, body: String?): Boolean {
    val a = (address ?: "").lowercase()
    val b = (body ?: "").lowercase()
    if (addressHints.any { a.contains(it) }) return true
    if (bodyHints.count { b.contains(it) } >= 2) return true
    return Regex("etb\\s*[\\d,]+", RegexOption.IGNORE_CASE).containsMatchIn(b) &&
      (b.contains("balance") || b.contains("transfer") || b.contains("credit") || b.contains("debit"))
  }
}
