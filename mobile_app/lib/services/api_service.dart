import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'auth_service.dart';

class ApiService {
  static String get _base => AuthService.baseUrl;

  static Future<Map<String, dynamic>> uploadSubscriptionReceipt({
    required Uint8List receiptBytes,
    required String receiptFilename,
    required double amount,
    required String paymentMethod,
  }) async {
    final uri = Uri.parse('$_base/subscriptions');
    final req = http.MultipartRequest('POST', uri)
      ..headers.addAll({'Authorization': 'Bearer ${await AuthService.getToken()}'})
      ..fields['amount'] = amount.toString()
      ..fields['paymentMethod'] = paymentMethod
      ..files.add(http.MultipartFile.fromBytes('receipt', receiptBytes, filename: receiptFilename));
    final res = await req.send();
    return jsonDecode(await res.stream.bytesToString());
  }

  static Future<Map<String, dynamic>> getMySubscription() async {
    final res = await http.get(
      Uri.parse('$_base/subscriptions/mine'),
      headers: AuthService.headers,
    );
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> createMeasurement({
    required String kioskId,
    required Map<String, dynamic> vitals,
  }) async {
    final res = await http.post(
      Uri.parse('$_base/measurements'),
      headers: AuthService.headers,
      body: jsonEncode({'kioskId': kioskId, 'vitals': vitals}),
    );
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> analyzeAndSuggest({
    required String measurementId,
    required double latitude,
    required double longitude,
  }) async {
    await AuthService.getToken(); // ensure token loaded so headers include Bearer
    final res = await http.post(
      Uri.parse('$_base/measurements/analyze'),
      headers: AuthService.headers,
      body: jsonEncode({
        'measurementId': measurementId,
        'latitude': latitude,
        'longitude': longitude,
      }),
    );
    if (res.statusCode != 200) {
      throw Exception('Analysis failed: ${res.statusCode} ${res.body}');
    }
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> uploadAppointmentReceipt({
    required Uint8List receiptBytes,
    required String receiptFilename,
    required String hospitalId,
    required String measurementId,
    String? aiInsightId,
    required double bookingFee,
    required String paymentMethod,
    required String conditionLabel,
  }) async {
    final uri = Uri.parse('$_base/appointments');
    final req = http.MultipartRequest('POST', uri)
      ..headers.addAll({'Authorization': 'Bearer ${await AuthService.getToken()}'})
      ..fields['hospitalId'] = hospitalId
      ..fields['measurementId'] = measurementId
      ..fields['bookingFee'] = bookingFee.toString()
      ..fields['paymentMethod'] = paymentMethod
      ..fields['conditionLabel'] = conditionLabel
      ..files.add(http.MultipartFile.fromBytes('receipt', receiptBytes, filename: receiptFilename));
    if (aiInsightId != null) req.fields['aiInsightId'] = aiInsightId;
    final res = await req.send();
    return jsonDecode(await res.stream.bytesToString());
  }

  static Future<Map<String, dynamic>> getMyAppointments() async {
    final res = await http.get(
      Uri.parse('$_base/appointments/mine'),
      headers: AuthService.headers,
    );
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> getMyMeasurements() async {
    final res = await http.get(
      Uri.parse('$_base/measurements/mine'),
      headers: AuthService.headers,
    );
    return jsonDecode(res.body);
  }
}
