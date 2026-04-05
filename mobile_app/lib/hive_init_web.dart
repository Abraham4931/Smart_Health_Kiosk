// Hive file storage is not supported on web; skip init so the app loads.
Future<void> initHive() async {
  // No-op on web. Storage uses SharedPreferences / API only.
}
