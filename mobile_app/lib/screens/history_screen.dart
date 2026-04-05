import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/sync_service.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<dynamic> _measurements = [];
  List<Map<String, dynamic>> _pending = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiService.getMyMeasurements();
      final pending = await SyncService.instance.getBufferedMeasurements();
      setState(() {
        _measurements = res['measurements'] ?? [];
        _pending = pending;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Measurement History'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loading ? null : () { setState(() => _loading = true); _load(); },
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _measurements.isEmpty && _pending.isEmpty
              ? const Center(child: Text('No measurements yet'))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (_pending.isNotEmpty) ...[
                        const Padding(
                          padding: EdgeInsets.only(bottom: 8),
                          child: Text('Pending sync', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.orange)),
                        ),
                        ..._pending.map((m) => _buildCard(m, pending: true)),
                        const SizedBox(height: 16),
                      ],
                      if (_measurements.isNotEmpty)
                        const Padding(
                          padding: EdgeInsets.only(bottom: 8),
                          child: Text('Synced', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                        ),
                      ..._measurements.map((m) => _buildCard(m, pending: false)),
                    ],
                  ),
                ),
    );
  }

  Widget _buildCard(dynamic m, {required bool pending}) {
    final v = (m['vitals'] ?? {}) as Map;
    final date = DateTime.tryParse(m['measuredAt']?.toString() ?? '') ?? DateTime.now();
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}', style: const TextStyle(fontWeight: FontWeight.w600)),
                Row(
                  children: [
                    if (pending)
                      const Padding(
                        padding: EdgeInsets.only(right: 8),
                        child: Chip(label: Text('Pending sync', style: TextStyle(fontSize: 11)), backgroundColor: Colors.orange),
                      ),
                    Text('Kiosk: ${m['kioskId'] ?? '-'}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
              ],
            ),
            const Divider(),
            Wrap(
              spacing: 16,
              runSpacing: 8,
              children: [
                _chip('BP', '${v['systolicBP'] ?? '-'}/${v['diastolicBP'] ?? '-'}'),
                _chip('HR', '${v['heartRate'] ?? '-'}'),
                _chip('SpO2', '${v['spo2'] ?? '-'}%'),
                _chip('Temp', '${v['temperatureCelsius'] ?? '-'}°C'),
                _chip('Height', v['heightCm'] != null ? '${v['heightCm']} cm' : '-'),
                _chip('Weight', (v['weightKg'] != null && v['weightKg'] != 0) ? '${v['weightKg']} kg' : '-'),
                _chip('BMI', '${v['bmi'] ?? '-'}'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _chip(String label, String value) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
      ],
    );
  }
}
