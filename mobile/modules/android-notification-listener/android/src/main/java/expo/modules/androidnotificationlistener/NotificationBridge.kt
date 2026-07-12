package expo.modules.androidnotificationlistener

object NotificationBridge {
  @Volatile
  var listener: ((Map<String, Any?>) -> Unit)? = null

  @Volatile
  var allowedPackages: Set<String> = emptySet()
}
