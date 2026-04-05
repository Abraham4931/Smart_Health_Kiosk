import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});

  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen> {
  List<dynamic> _appointments = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiService.getMyAppointments();
      setState(() { _appointments = res['appointments'] ?? []; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'approved': return Colors.green;
      case 'rejected': return Colors.red;
      case 'cancelled': return Colors.grey;
      default: return Colors.orange;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Appointments')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _appointments.isEmpty
              ? const Center(child: Text('No appointments yet'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _appointments.length,
                  itemBuilder: (context, index) {
                    final a = _appointments[index];
                    final hospital = a['hospitalId'];
                    final date = DateTime.tryParse(a['createdAt'] ?? '') ?? DateTime.now();
                    final imageUrl = hospital?['imageUrl'] as String?;
                    final photoUrl = imageUrl != null && imageUrl.isNotEmpty
                        ? '${AuthService.uploadsBase}$imageUrl'
                        : null;
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
                                if (photoUrl != null)
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: Image.network(photoUrl, width: 48, height: 48, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox.shrink()),
                                  ),
                                if (photoUrl != null) const SizedBox(width: 12),
                                Expanded(child: Text(hospital?['name'] ?? 'Hospital', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
                                Chip(
                                  label: Text(a['status'] ?? 'pending', style: TextStyle(color: _statusColor(a['status'] ?? 'pending'), fontSize: 12)),
                                  backgroundColor: _statusColor(a['status'] ?? 'pending').withAlpha(25),
                                ),
                              ],
                            ),
                            if (a['conditionLabel'] != null && a['conditionLabel'].isNotEmpty)
                              Padding(padding: const EdgeInsets.only(top: 4), child: Text('Condition: ${a['conditionLabel']}', style: const TextStyle(color: Colors.grey))),
                            const SizedBox(height: 4),
                            Text('Fee: ${a['bookingFee']} ETB  |  ${date.day}/${date.month}/${date.year}', style: const TextStyle(fontSize: 13, color: Colors.grey)),
                            if (a['status'] == 'approved' && a['appointmentDate'] != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: Row(
                                  children: [
                                    const Icon(Icons.event, size: 16, color: Colors.green),
                                    const SizedBox(width: 4),
                                    Text('Appointment: ${DateTime.tryParse(a['appointmentDate'] ?? '')?.toLocal().toString().substring(0, 16) ?? '-'}', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.w500)),
                                  ],
                                ),
                              ),
                            if (a['status'] == 'rejected' && a['rejectionReason'] != null && a['rejectionReason'].isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: Text('Reason: ${a['rejectionReason']}', style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
