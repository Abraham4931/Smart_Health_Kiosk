import 'package:flutter/material.dart';
import '../services/kiosk_service.dart';
import 'measurement_flow_screen.dart';

class KioskScreen extends StatefulWidget {
  const KioskScreen({super.key});

  @override
  State<KioskScreen> createState() => _KioskScreenState();
}

class _KioskScreenState extends State<KioskScreen> {
  final _kiosk = KioskService();
  final _ipCtrl = TextEditingController(text: '192.168.137.204');
  bool _connecting = false;
  String _status = 'Not connected';

  Future<void> _connect() async {
    setState(() { _connecting = true; _status = 'Connecting...'; });
    final ok = await _kiosk.connect(_ipCtrl.text.trim());
    setState(() {
      _connecting = false;
      _status = ok ? 'Connected to ${_kiosk.kioskId}' : (_kiosk.lastError ?? 'Connection failed');
    });
  }

  Future<void> _startMeasurement() async {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => MeasurementFlowScreen(kiosk: _kiosk),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final connected = _kiosk.isConnected;
    return Scaffold(
      appBar: AppBar(title: const Text('Kiosk Measurement')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(connected ? Icons.wifi : Icons.wifi_off, color: connected ? Colors.green : Colors.grey),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(_status, style: const TextStyle(fontWeight: FontWeight.w500), overflow: TextOverflow.ellipsis, maxLines: 2),
                        ),
                      ],
                    ),
                    if (!connected) ...[
                      const SizedBox(height: 16),
                      TextField(controller: _ipCtrl, decoration: const InputDecoration(labelText: 'Kiosk IP Address', border: OutlineInputBorder(), hintText: '192.168.137.204')),
                      const SizedBox(height: 8),
                      Text('Ensure the Pi is on the same network and the sensor server is running.', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey)),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: _connecting ? null : _connect,
                          child: _connecting ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Connect to Kiosk'),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Center(
                        child: TextButton(
                          onPressed: () => Navigator.of(context).pop(),
                          child: const Text('Skip — use app without kiosk'),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            if (connected) ...[
              const SizedBox(height: 24),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      const Icon(Icons.monitor_heart, size: 48, color: Colors.indigo),
                      const SizedBox(height: 12),
                      const Text('Ready to Measure', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      const Text('Place your arm in the cuff, finger on the oximeter, and stand on the scale.', textAlign: TextAlign.center),
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed: _startMeasurement,
                          icon: const Icon(Icons.play_arrow),
                          label: const Text('Start Measurement'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
