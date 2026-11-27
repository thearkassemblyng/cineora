import 'package:flutter/material.dart';
import 'screens/studio_dashboard_screen.dart';

void main() {
  runApp(const CineoraMobileApp());
}

class CineoraMobileApp extends StatelessWidget {
  const CineoraMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CINEORA Studio',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF08090D),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFE5A93C),
          surface: Color(0xFF12151F),
        ),
        useMaterial3: true,
      ),
      home: const StudioDashboardScreen(),
    );
  }
}
