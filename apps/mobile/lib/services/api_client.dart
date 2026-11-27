import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class ApiHealth {
  final String service;
  final String status;
  final String version;

  const ApiHealth({
    required this.service,
    required this.status,
    required this.version,
  });

  factory ApiHealth.fromJson(Map<String, dynamic> json) {
    return ApiHealth(
      service: json['service'] as String? ?? 'cineora-api',
      status: json['status'] as String? ?? 'unknown',
      version: json['version'] as String? ?? '0.0.0',
    );
  }
}

class ProviderSpec {
  final String providerId;
  final String displayName;
  final String modelId;
  final bool configured;
  final String maxResolution;
  final int visualQualityScore;
  final List<String> limitations;

  const ProviderSpec({
    required this.providerId,
    required this.displayName,
    required this.modelId,
    required this.configured,
    required this.maxResolution,
    required this.visualQualityScore,
    required this.limitations,
  });

  factory ProviderSpec.fromJson(Map<String, dynamic> json) {
    return ProviderSpec(
      providerId: json['providerId'] as String? ?? '',
      displayName: json['displayName'] as String? ?? '',
      modelId: json['modelId'] as String? ?? '',
      configured: json['configured'] as bool? ?? false,
      maxResolution: json['maxResolution'] as String? ?? '1080P',
      visualQualityScore: (json['visualQualityScore'] as num?)?.toInt() ?? 0,
      limitations: (json['limitations'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
    );
  }
}

class StudioProjectSummary {
  final String id;
  final String title;
  final String format;
  final String targetResolution;

  const StudioProjectSummary({
    required this.id,
    required this.title,
    required this.format,
    required this.targetResolution,
  });

  factory StudioProjectSummary.fromJson(Map<String, dynamic> json) {
    return StudioProjectSummary(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      format: json['format'] as String? ?? 'CINEMATIC_FILM',
      targetResolution: json['targetResolution'] as String? ?? 'P1080',
    );
  }
}

class CineoraApiClient {
  final http.Client _httpClient;
  String? accessToken;

  CineoraApiClient({http.Client? httpClient, this.accessToken})
      : _httpClient = httpClient ?? http.Client();

  Map<String, String> _headers({bool jsonBody = false}) {
    final headers = <String, String>{};
    if (jsonBody) headers['Content-Type'] = 'application/json';
    if (accessToken != null && accessToken!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $accessToken';
    }
    return headers;
  }

  Future<ApiHealth> fetchHealth() async {
    final response = await _httpClient.get(Uri.parse('${ApiConfig.baseUrl}/health'));
    if (response.statusCode != 200) {
      throw Exception('API returned HTTP ${response.statusCode}');
    }
    return ApiHealth.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<List<ProviderSpec>> fetchProviders() async {
    final response = await _httpClient.get(Uri.parse('${ApiConfig.baseUrl}/providers'));
    if (response.statusCode != 200) {
      throw Exception('Providers endpoint returned HTTP ${response.statusCode}');
    }
    final list = jsonDecode(response.body) as List<dynamic>;
    return list.map((e) => ProviderSpec.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> login(String email, String password) async {
    final response = await _httpClient.post(
      Uri.parse('${ApiConfig.baseUrl}/auth/login'),
      headers: _headers(jsonBody: true),
      body: jsonEncode({'email': email, 'password': password}),
    );
    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception('Login failed (${response.statusCode})');
    }
    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    accessToken = decoded['accessToken'] as String?;
  }

  Future<List<StudioProjectSummary>> fetchProjects() async {
    final response = await _httpClient.get(
      Uri.parse('${ApiConfig.baseUrl}/projects'),
      headers: _headers(),
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to load projects (${response.statusCode})');
    }
    final list = jsonDecode(response.body) as List<dynamic>;
    return list
        .map((e) => StudioProjectSummary.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Map<String, dynamic>> triggerSceneGeneration({
    required String projectId,
    required String sceneId,
    String mode = 'DEMO',
    String qualityTier = 'HIGH',
  }) async {
    final response = await _httpClient.post(
      Uri.parse('${ApiConfig.baseUrl}/projects/$projectId/scenes/$sceneId/generations'),
      headers: _headers(jsonBody: true),
      body: jsonEncode({
        'mode': mode,
        'qualityTier': qualityTier,
        'requiresLipSync': false,
        'requiresNativeAudio': false,
      }),
    );
    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception('Generation failed (${response.statusCode})');
    }
    return jsonDecode(response.body) as Map<String, dynamic>;
  }
}
