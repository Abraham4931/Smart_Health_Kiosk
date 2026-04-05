import 'dart:async';
import 'package:flutter/material.dart';
import '../services/kiosk_service.dart';
import '../services/api_service.dart';
import '../services/sync_service.dart';
import 'results_screen.dart';

/// Ordered measurement steps: BP → Height → Weight → SpO2/HR → Temperature.
const List<Map<String, String>> _measurementSteps = [
  {'id': 'bp', 'label': 'Blood Pressure', 'hint': 'Place your arm in the cuff'},
  {'id': 'height', 'label': 'Height', 'hint': 'Stand still under the sensor'},
  {'id': 'weight', 'label': 'Weight', 'hint': 'Stand on the scale'},
  {'id': 'spo2_hr', 'label': 'SpO2 & Heart Rate', 'hint': 'Place finger on the oximeter'},
  {'id': 'temperature', 'label': 'Temperature', 'hint': 'Stay in front of the sensor'},
];

bool _isSensorResultValid(String sensorId, Map<String, dynamic>? data) {
  if (data == null) return false;
  switch (sensorId) {
    case 'bp':
      return data['systolicBP'] != null && data['diastolicBP'] != null;
    case 'height':
      return data['heightCm'] != null;
    case 'weight':
      return data['weightKg'] != null && data['weightKg'] != 0;
    case 'spo2_hr':
      return (data['heartRate'] != null || data['spo2'] != null);
    case 'temperature':
      return data['temperatureCelsius'] != null;
    default:
      return false;
  }
}

void _mergeVitals(Map<String, dynamic> vitals, String sensorId, Map<String, dynamic> data) {
  if (sensorId == 'bp') {
    vitals['systolicBP'] = data['systolicBP'];
    vitals['diastolicBP'] = data['diastolicBP'];
  } else if (sensorId == 'height') {
    vitals['heightCm'] = data['heightCm'];
  } else if (sensorId == 'weight') {
    final w = data['weightKg'];
    vitals['weightKg'] = (w != null && w != 0) ? w : null;
  } else if (sensorId == 'spo2_hr') {
    vitals['heartRate'] = data['heartRate'];
    vitals['spo2'] = data['spo2'];
  } else if (sensorId == 'temperature') {
    vitals['temperatureCelsius'] = data['temperatureCelsius'];
  }
}

void _computeDerived(Map<String, dynamic> vitals) {
  final weightKg = vitals['weightKg'] as num?;
  final heightCm = vitals['heightCm'] as num?;
  if (weightKg != null && heightCm != null && heightCm > 0) {
    final heightM = heightCm / 100;
    vitals['bmi'] = (weightKg / (heightM * heightM)).roundToDouble();
  }
  final systolic = vitals['systolicBP'] as num?;
  final diastolic = vitals['diastolicBP'] as num?;
  if (systolic != null && diastolic != null) {
    vitals['meanArterialPressure'] = (diastolic + (systolic - diastolic) / 3).roundToDouble();
  }
}

class MeasurementFlowScreen extends StatefulWidget {
  final KioskService kiosk;

  const MeasurementFlowScreen({super.key, required this.kiosk});

  @override
  State<MeasurementFlowScreen> createState() => _MeasurementFlowScreenState();
}

class _MeasurementFlowScreenState extends State<MeasurementFlowScreen> {
  int _currentStep = 0;
  final Map<String, dynamic> _vitals = {};
  final List<String> _skipped = [];
  String _status = 'Starting...';
  bool _measuring = false;
  bool _showCorrectPrompt = false;
  int _correctCountdown = 30;
  int _getReadyCountdown = 0;
  Timer? _countdownTimer;
  bool _flowComplete = false;

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  Future<void> _runStep(int stepIndex) async {
    if (stepIndex >= _measurementSteps.length) {
      _computeDerived(_vitals);
      setState(() {
        _flowComplete = true;
        _measuring = false;
        _getReadyCountdown = 0;
        _status = 'Measurement complete';
      });
      return;
    }

    final step = _measurementSteps[stepIndex];
    final label = step['label']!;

    setState(() {
      _currentStep = stepIndex;
      _measuring = false;
      _showCorrectPrompt = false;
      _getReadyCountdown = 5;
      _status = 'Get ready for $label';
    });

    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() {
        _getReadyCountdown--;
        _status = _getReadyCountdown > 0 ? 'Get ready... $_getReadyCountdown' : 'Measuring...';
      });
      if (_getReadyCountdown <= 0) {
        t.cancel();
        _doMeasure(stepIndex);
      }
    });
  }

  Future<void> _doMeasure(int stepIndex) async {
    final step = _measurementSteps[stepIndex];
    final sensorId = step['id']!;
    final label = step['label']!;

    setState(() {
      _measuring = true;
      _status = 'Measuring $label...';
    });

    final result = await widget.kiosk.startMeasurement(sensorId);
    final data = result != null ? result['data'] as Map<String, dynamic>? : null;

    if (!mounted) return;
    if (_isSensorResultValid(sensorId, data)) {
      _mergeVitals(_vitals, sensorId, data!);
      await _runStep(stepIndex + 1);
      return;
    }

    setState(() {
      _measuring = false;
      _showCorrectPrompt = true;
      _correctCountdown = 30;
      _status = 'Sensor not detected';
    });

    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() {
        _correctCountdown--;
        if (_correctCountdown <= 0) {
          t.cancel();
          _skipped.add(sensorId);
          _showCorrectPrompt = false;
          _runStep(stepIndex + 1);
        }
      });
    });
  }

  void _onRetry() {
    _countdownTimer?.cancel();
    setState(() => _showCorrectPrompt = false);
    _runStep(_currentStep);
  }

  void _onSkip() {
    _countdownTimer?.cancel();
    setState(() {
      _showCorrectPrompt = false;
      _skipped.add(_measurementSteps[_currentStep]['id']!);
    });
    _runStep(_currentStep + 1);
  }

  void _onRemeasure() {
    setState(() {
      _currentStep = 0;
      _vitals.clear();
      _skipped.clear();
      _flowComplete = false;
      _status = 'Starting...';
    });
    _runStep(0);
  }

  Future<void> _onDone() async {
    final measuredAt = DateTime.now().toIso8601String();
    final payload = {
      'kioskId': widget.kiosk.kioskId,
      'vitals': Map<String, dynamic>.from(_vitals),
      'measuredAt': measuredAt,
    };

    // Always buffer so MQTT sync runs (portal visibility + offline backup). Backend dedupes.
    await SyncService.instance.bufferMeasurement(payload);

    try {
      final saveRes = await ApiService.createMeasurement(
        kioskId: widget.kiosk.kioskId!,
        vitals: _vitals,
      );
      if (saveRes.containsKey('measurement') && mounted) {
        final measurementId = saveRes['measurement']['_id'];
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => ResultsScreen(vitals: _vitals, measurementId: measurementId),
          ),
        );
        return;
      }
    } catch (_) {
      // Offline or backend error: data already buffered, will sync via MQTT
    }

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Saved locally. Will sync when online.')),
      );
      Navigator.pop(context);
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _runStep(0));
  }

  @override
  Widget build(BuildContext context) {
    if (_flowComplete) {
      return _buildSummary();
    }

    final step = _currentStep < _measurementSteps.length
        ? _measurementSteps[_currentStep]
        : null;

    return Scaffold(
      appBar: AppBar(title: const Text('Kiosk Measurement')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: List.generate(
                _measurementSteps.length,
                (i) => Expanded(
                  child: Container(
                    height: 4,
                    margin: const EdgeInsets.symmetric(horizontal: 2),
                    decoration: BoxDecoration(
                      color: i <= _currentStep
                          ? Theme.of(context).colorScheme.primary
                          : Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Step ${_currentStep + 1} of ${_measurementSteps.length}',
              style: Theme.of(context).textTheme.labelLarge?.copyWith(color: Colors.grey),
            ),
            const SizedBox(height: 8),
            if (step != null) ...[
              Text(
                step['label']!,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                step['hint']!,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey),
              ),
            ],
            const SizedBox(height: 32),
            Center(
              child: _showCorrectPrompt
                  ? _buildCorrectPrompt()
                  : _getReadyCountdown > 0
                      ? Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '$_getReadyCountdown',
                              style: Theme.of(context).textTheme.displayLarge?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: Theme.of(context).colorScheme.primary,
                                  ),
                            ),
                            const SizedBox(height: 8),
                            Text(_status, style: Theme.of(context).textTheme.bodyLarge),
                          ],
                        )
                      : _measuring
                          ? const Column(
                              children: [
                                CircularProgressIndicator(),
                                SizedBox(height: 16),
                                Text('Please wait for sensor...'),
                              ],
                            )
                          : Text(_status, style: Theme.of(context).textTheme.bodyLarge),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCorrectPrompt() {
    final step = _currentStep < _measurementSteps.length ? _measurementSteps[_currentStep] : null;
    final sensorLabel = step?['label'] ?? 'Sensor';
    return Card(
      color: Colors.amber.shade50,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Icon(Icons.warning_amber_rounded, size: 48, color: Colors.amber.shade700),
            const SizedBox(height: 12),
            Text(
              '$sensorLabel sensor not detected. Please correct the sensor and retry, or skip to the next.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              'Next step in ${_correctCountdown}s',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                FilledButton.icon(
                  onPressed: _onRetry,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
                ),
                const SizedBox(width: 12),
                OutlinedButton.icon(
                  onPressed: _onSkip,
                  icon: const Icon(Icons.skip_next),
                  label: const Text('Skip'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummary() {
    final v = _vitals;
    return Scaffold(
      appBar: AppBar(title: const Text('Measurement Summary')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Text(
            'Vital signs',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          _summaryRow('Blood Pressure', v['systolicBP'] != null && v['diastolicBP'] != null
              ? '${v['systolicBP']}/${v['diastolicBP']} mmHg'
              : _skipped.contains('bp') ? 'Skipped' : '—'),
          _summaryRow('Height', v['heightCm'] != null ? '${v['heightCm']} cm' : _skipped.contains('height') ? 'Skipped' : '—'),
          _summaryRow('Weight', (v['weightKg'] != null && v['weightKg'] != 0) ? '${v['weightKg']} kg' : _skipped.contains('weight') ? 'Skipped' : '—'),
          _summaryRow('Heart Rate', v['heartRate'] != null ? '${v['heartRate']} bpm' : _skipped.contains('spo2_hr') ? 'Skipped' : '—'),
          _summaryRow('SpO2', v['spo2'] != null ? '${v['spo2']}%' : _skipped.contains('spo2_hr') ? 'Skipped' : '—'),
          _summaryRow('Temperature', v['temperatureCelsius'] != null ? '${v['temperatureCelsius']}°C' : _skipped.contains('temperature') ? 'Skipped' : '—'),
          if (v['bmi'] != null) _summaryRow('BMI', '${v['bmi']}'),
          const SizedBox(height: 32),
          FilledButton.icon(
            onPressed: _onDone,
            icon: const Icon(Icons.check),
            label: const Text('Done – View results & insights'),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _onRemeasure,
            icon: const Icon(Icons.refresh),
            label: const Text('Re-measure'),
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
        ],
      ),
    );
  }
}
