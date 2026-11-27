class ApiConfig {
  /// Connects to the same versioned NestJS Core API as the Web Studio.
  /// Override at build time with: --dart-define=CINEORA_API_URL=https://api.cineora.example/api/v1
  static const String baseUrl = String.fromEnvironment(
    'CINEORA_API_URL',
    defaultValue: 'http://localhost:4000/api/v1',
  );
}
