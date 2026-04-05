import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:hive/hive.dart';
import 'services/auth_service.dart';
import 'services/sync_service.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'hive_init.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  ErrorWidget.builder = (FlutterErrorDetails details) => Material(
    child: Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(details.exceptionAsString(), textAlign: TextAlign.center),
          ],
        ),
      ),
    ),
  );
  try {
    if (!kIsWeb) {
      await initHive();
      await Hive.openBox('measurements');
      await Hive.openBox('settings');
    }
    runApp(const SmartHealthKioskApp());
  } catch (e, stack) {
    debugPrint('Startup error: $e\n$stack');
    runApp(MaterialApp(
      home: Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Something went wrong', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                Text('$e', style: const TextStyle(color: Colors.red)),
                const SizedBox(height: 16),
                Expanded(child: SingleChildScrollView(child: Text('$stack', style: const TextStyle(fontSize: 12)))),
              ],
            ),
          ),
        ),
      ),
    ));
  }
}

class SmartHealthKioskApp extends StatelessWidget {
  const SmartHealthKioskApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Smart Health Kiosk',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF4F46E5),
        useMaterial3: true,
        fontFamily: 'Roboto',
      ),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool _loading = true;
  bool _loggedIn = false;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final token = await AuthService.getToken();
    setState(() {
      _loggedIn = token != null;
      _loading = false;
    });
    if (_loggedIn) SyncService.instance.startBackgroundSync();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return _loggedIn ? const HomeScreen() : LoginScreen(onLogin: () {
      setState(() => _loggedIn = true);
      SyncService.instance.startBackgroundSync();
    });
  }
}
