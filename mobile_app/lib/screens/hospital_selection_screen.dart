import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class HospitalSelectionScreen extends StatefulWidget {
  final Map<String, dynamic> hospitals;
  final String measurementId;
  final String? aiInsightId;
  final String conditionLabel;

  const HospitalSelectionScreen({
    super.key,
    required this.hospitals,
    required this.measurementId,
    this.aiInsightId,
    required this.conditionLabel,
  });

  @override
  State<HospitalSelectionScreen> createState() => _HospitalSelectionScreenState();
}

class _HospitalSelectionScreenState extends State<HospitalSelectionScreen> {
  Map<String, dynamic>? _selected;
  Uint8List? _receiptBytes;
  String? _receiptName;
  String _paymentMethod = 'Telebirr';
  bool _submitting = false;
  String? _message;
  bool _success = false;

  List<Map<String, dynamic>> get _registered =>
      (widget.hospitals['registered'] as List?)?.cast<Map<String, dynamic>>() ?? [];

  List<Map<String, dynamic>> get _external =>
      (widget.hospitals['external'] as List?)?.cast<Map<String, dynamic>>() ?? [];

  Future<void> _pickReceipt() async {
    final result = await FilePicker.platform.pickFiles(type: FileType.image, withData: true);
    if (result != null && result.files.single.bytes != null) {
      setState(() {
        _receiptBytes = result.files.single.bytes!;
        _receiptName = result.files.single.name;
      });
    }
  }

  Future<void> _submitAppointment() async {
    if (_selected == null || _receiptBytes == null) return;
    setState(() { _submitting = true; _message = null; });
    try {
      final res = await ApiService.uploadAppointmentReceipt(
        receiptBytes: _receiptBytes!,
        receiptFilename: _receiptName ?? 'receipt.png',
        hospitalId: _selected!['_id'],
        measurementId: widget.measurementId,
        aiInsightId: widget.aiInsightId,
        bookingFee: (_selected!['bookingFee'] as num?)?.toDouble() ?? 0,
        paymentMethod: _paymentMethod,
        conditionLabel: widget.conditionLabel,
      );
      if (res.containsKey('appointment')) {
        setState(() { _success = true; _message = 'Appointment request sent! Waiting for hospital confirmation.'; });
      } else {
        setState(() => _message = res['error'] ?? 'Failed');
      }
    } catch (e) {
      setState(() => _message = 'Error: $e');
    }
    setState(() => _submitting = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Suggested Hospitals')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (_registered.isNotEmpty) ...[
            Text('Registered Hospitals', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ..._registered.map((h) => _hospitalCard(h, registered: true)),
          ],
          if (_external.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text('Other Nearby Hospitals', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ..._external.map((h) => _hospitalCard(h, registered: false)),
          ],
          if (_selected != null && _selected!['source'] == 'registered') ...[
            const SizedBox(height: 24),
            const Divider(),
            const SizedBox(height: 16),
            Text('Book Appointment at ${_selected!['name']}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('Booking fee: ${_selected!['bookingFee']} ETB'),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _paymentMethod,
              decoration: const InputDecoration(labelText: 'Payment Method', border: OutlineInputBorder()),
              items: ['Telebirr', 'CBE Birr', 'Bank Transfer'].map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
              onChanged: (v) => setState(() => _paymentMethod = v!),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _pickReceipt,
              icon: const Icon(Icons.upload_file),
              label: Text(_receiptBytes == null ? 'Upload Payment Receipt' : 'Receipt Selected'),
            ),
            if (_receiptBytes != null) Padding(
              padding: const EdgeInsets.only(top: 12),
              child: ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.memory(_receiptBytes!, height: 150, fit: BoxFit.cover)),
            ),
            const SizedBox(height: 16),
            if (_message != null) Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(color: _success ? Colors.green.shade50 : Colors.red.shade50, borderRadius: BorderRadius.circular(12)),
              child: Text(_message!, style: TextStyle(color: _success ? Colors.green.shade700 : Colors.red.shade700)),
            ),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _submitting || _success || _receiptBytes == null ? null : _submitAppointment,
                child: _submitting ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Submit Appointment Request'),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _hospitalCard(Map<String, dynamic> h, {required bool registered}) {
    final isSelected = _selected == h;
    final imageUrl = h['imageUrl'] as String?;
    final photoUrl = imageUrl != null && imageUrl.isNotEmpty
        ? '${AuthService.uploadsBase}$imageUrl'
        : null;
    return Card(
      color: isSelected ? Theme.of(context).colorScheme.primaryContainer : null,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: photoUrl != null
            ? ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(photoUrl, width: 56, height: 56, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _leadingIcon(registered)),
              )
            : _leadingIcon(registered),
        title: Text(h['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (h['address'] != null) Text(h['address'], style: const TextStyle(fontSize: 12)),
            Text('${h['distance'] ?? '?'} km away', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            if (registered && h['bookingFee'] != null) Text('Fee: ${h['bookingFee']} ETB', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
          ],
        ),
        trailing: registered ? const Icon(Icons.chevron_right) : null,
        onTap: registered ? () => setState(() => _selected = h) : null,
      ),
    );
  }

  Widget _leadingIcon(bool registered) => CircleAvatar(
    backgroundColor: registered ? Colors.indigo.shade50 : Colors.grey.shade100,
    child: Icon(Icons.local_hospital, color: registered ? Colors.indigo : Colors.grey),
  );
}
