import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'hospital_selection_screen.dart';

class ResultsScreen extends StatefulWidget {
  final Map<String, dynamic> vitals;
  final String measurementId;
  const ResultsScreen({super.key, required this.vitals, required this.measurementId});

  @override
  State<ResultsScreen> createState() => _ResultsScreenState();
}

class _ResultsScreenState extends State<ResultsScreen> {
  bool _analyzing = false;
  Map<String, dynamic>? _insight;
  Map<String, dynamic>? _hospitals;
  String? _error;

  Future<void> _analyze() async {
    setState(() { _analyzing = true; _error = null; });
    try {
      final res = await ApiService.analyzeAndSuggest(
        measurementId: widget.measurementId,
        latitude: 8.54,
        longitude: 39.27,
      );
      setState(() {
        _insight = res['insight'];
        _hospitals = res['hospitals'];
        _analyzing = false;
      });
    } catch (e) {
      setState(() { _error = 'Analysis failed: $e'; _analyzing = false; });
    }
  }

  @override
  void initState() {
    super.initState();
    _analyze();
  }

  Color _riskColor(String? level) {
    switch (level) {
      case 'critical': return Colors.red;
      case 'high': return Colors.orange;
      case 'moderate': return Colors.amber.shade700;
      default: return Colors.green;
    }
  }

  @override
  Widget build(BuildContext context) {
    final v = widget.vitals;
    return Scaffold(
      appBar: AppBar(title: const Text('Results & AI Insights')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('Vital Signs', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          _vitalRow('Blood Pressure', '${v['systolicBP'] ?? '-'}/${v['diastolicBP'] ?? '-'} mmHg'),
          _vitalRow('Heart Rate', '${v['heartRate'] ?? '-'} bpm'),
          _vitalRow('SpO2', '${v['spo2'] ?? '-'}%'),
          _vitalRow('Temperature', '${v['temperatureCelsius'] ?? '-'}°C'),
          _vitalRow('Weight', (v['weightKg'] != null && v['weightKg'] != 0) ? '${v['weightKg']} kg' : '- kg'),
          _vitalRow('Height', '${v['heightCm'] ?? '-'} cm'),
          _vitalRow('BMI', '${v['bmi'] ?? '-'}'),
          const SizedBox(height: 24),
          if (_analyzing) const Center(child: Column(children: [CircularProgressIndicator(), SizedBox(height: 12), Text('Analyzing your vitals...')])),
          if (_error != null) ...[
            Card(color: Colors.red.shade50, child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_error!, style: TextStyle(color: Colors.red.shade700)),
                  const SizedBox(height: 12),
                  TextButton.icon(onPressed: () { setState(() => _error = null); _analyze(); }, icon: const Icon(Icons.refresh), label: const Text('Retry analysis')),
                ],
              ),
            )),
          ],
          if (_insight != null) ...[
            Card(
              elevation: 2,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.psychology, color: _insight!['isRuleBased'] == true ? Colors.grey : Colors.indigo, size: 28),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _insight!['isRuleBased'] == true ? 'Health summary (rule-based)' : 'AI Health Insight',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                        ),
                        Chip(
                          label: Text((_insight!['riskLevel'] ?? 'low').toString().toUpperCase(), style: TextStyle(color: _riskColor(_insight!['riskLevel']), fontWeight: FontWeight.w600)),
                          backgroundColor: _riskColor(_insight!['riskLevel']).withAlpha(40),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(_insight!['summaryText'] ?? '', style: const TextStyle(fontSize: 15, height: 1.4)),
                    if (_insight!['conditionCategory'] != null && (_insight!['conditionCategory'] as String).isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        children: [
                          const Text('Category: ', style: TextStyle(color: Colors.grey)),
                          Chip(
                            label: Text(_insight!['conditionCategory'].toString(), style: const TextStyle(fontSize: 12)),
                            padding: EdgeInsets.zero,
                            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                        ],
                      ),
                    ],
                    if (_insight!['preventiveAdvice'] != null && (_insight!['preventiveAdvice'] as String).isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Text('Advice: ${_insight!['preventiveAdvice']}', style: TextStyle(fontSize: 14, fontStyle: FontStyle.italic, color: Colors.grey.shade700)),
                    ],
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(8)),
                      child: const Text('This is NOT a clinical diagnosis. Please consult a healthcare professional.', style: TextStyle(fontSize: 12, color: Colors.brown)),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            if (_hospitals != null) FilledButton.icon(
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => HospitalSelectionScreen(
                hospitals: _hospitals!,
                measurementId: widget.measurementId,
                aiInsightId: _insight!['_id'],
                conditionLabel: _insight!['conditionCategory'] ?? '',
              ))),
              icon: const Icon(Icons.local_hospital),
              label: const Text('View Suggested Hospitals'),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.refresh),
              label: const Text('Re-measure'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _vitalRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
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
