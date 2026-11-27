import 'package:flutter/material.dart';
import '../services/api_client.dart';

class StudioDashboardScreen extends StatefulWidget {
  const StudioDashboardScreen({super.key});

  @override
  State<StudioDashboardScreen> createState() => _StudioDashboardScreenState();
}

class _StudioDashboardScreenState extends State<StudioDashboardScreen> {
  final CineoraApiClient _apiClient = CineoraApiClient();
  int _selectedTab = 0;

  late Future<ApiHealth> _healthFuture;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    setState(() {
      _healthFuture = _apiClient.fetchHealth();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'CINEORA',
          style: TextStyle(
            letterSpacing: 3,
            fontWeight: FontWeight.bold,
            color: Color(0xFFE5A93C),
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh studio status',
            icon: const Icon(Icons.refresh),
            onPressed: _reload,
          ),
        ],
      ),
      body: IndexedStack(
        index: _selectedTab,
        children: [
          _buildOverviewTab(),
          _buildQualityTiersTab(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedTab,
        onDestinationSelected: (idx) => setState(() => _selectedTab = idx),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.movie_creation_outlined),
            selectedIcon: Icon(Icons.movie_creation),
            label: 'Studio',
          ),
          NavigationDestination(
            icon: Icon(Icons.hd_outlined),
            selectedIcon: Icon(Icons.hd),
            label: 'Quality Tiers',
          ),
        ],
      ),
    );
  }

  Widget _buildOverviewTab() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        FutureBuilder<ApiHealth>(
          future: _healthFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Card(
                child: ListTile(
                  leading: CircularProgressIndicator(),
                  title: Text('Connecting to CINEORA Studio...'),
                ),
              );
            }
            if (snapshot.hasError) {
              return Card(
                child: ListTile(
                  leading: const Icon(Icons.error_outline, color: Colors.redAccent),
                  title: const Text('Studio Offline'),
                  subtitle: Text(snapshot.error.toString()),
                ),
              );
            }
            final health = snapshot.data!;
            return Card(
              child: ListTile(
                leading: const Icon(Icons.check_circle, color: Colors.greenAccent),
                title: const Text('CINEORA Studio Online'),
                subtitle: Text('Version ${health.version}'),
              ),
            );
          },
        ),
        const SizedBox(height: 16),
        const Card(
          child: Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Mobile Cinema Production',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
                SizedBox(height: 8),
                Text(
                  'Manage storyboards, review automated Video QC scores, regenerate individual scenes, and export broadcast-ready masters from Android & iOS.',
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildQualityTiersTab() {
    const tiers = [
      (
        name: 'CINEORA Cinema Master',
        spec: 'Up to 4K UHD • Native Audio & Lip-Sync • 12 cr/sec',
        desc: 'Hero commercials, cinematic storytelling, and realistic human dialogue.',
      ),
      (
        name: 'CINEORA Studio HD',
        spec: 'Full HD 1080p • Studio Voiceover & Mix • 8 cr/sec',
        desc: 'Brand films, documentaries, and multi-scene continuity.',
      ),
      (
        name: 'CINEORA Express',
        spec: 'Full HD 1080p • Fast Turnaround • 6 cr/sec',
        desc: 'Rapid concept previews, B-roll, and social media cuts.',
      ),
    ];

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: tiers.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final t = tiers[index];
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                const SizedBox(height: 4),
                Text(t.spec, style: const TextStyle(color: Color(0xFFE5A93C), fontSize: 12)),
                const SizedBox(height: 6),
                Text(t.desc),
              ],
            ),
          ),
        );
      },
    );
  }
}
