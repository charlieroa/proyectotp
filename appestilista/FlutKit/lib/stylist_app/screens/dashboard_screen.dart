import 'package:flutter/material.dart';
import '../../helpers/theme/app_theme.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';
import 'bookings_screen.dart';
import 'services_screen.dart';
import 'products_screen.dart';
import 'geolocation_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _stats;
  bool _isLoading = true;
  bool _isInsideGeofence = false;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
    _initializeLocation();
  }

  Future<void> _loadDashboard() async {
    try {
      final stats = await ApiService.getDashboardStats();
      setState(() {
        _stats = stats;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _initializeLocation() async {
    try {
      await LocationService.initialize();
      LocationService.onGeofenceStatusChanged = (isInside) {
        setState(() => _isInsideGeofence = isInside);
      };
      LocationService.startTracking();
    } catch (e) {
      print('Error inicializando geolocalización: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: Icon(
              _isInsideGeofence ? Icons.location_on : Icons.location_off,
              color: _isInsideGeofence ? Colors.green : Colors.red,
            ),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const GeolocationScreen()),
              );
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadDashboard,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Cards de estadísticas
                    Row(
                      children: [
                        Expanded(
                          child: _StatCard(
                            title: 'Servicios Hoy',
                            value: '${_stats?['services_today'] ?? 0}',
                            icon: Icons.cut,
                            color: Colors.blue,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _StatCard(
                            title: 'Ganancias Hoy',
                            value:
                                '\$${(_stats?['earnings_today'] ?? 0).toStringAsFixed(0)}',
                            icon: Icons.attach_money,
                            color: Colors.green,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: _StatCard(
                            title: 'Pendientes',
                            value: '${_stats?['pending_approval'] ?? 0}',
                            icon: Icons.pending,
                            color: Colors.orange,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _StatCard(
                            title: 'Total Mes',
                            value: '${_stats?['total_services_month'] ?? 0}',
                            icon: Icons.calendar_month,
                            color: Colors.purple,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    // Botones de acceso rápido
                    _QuickActionButton(
                      title: 'Bookings Pendientes',
                      subtitle: 'Aceptar o rechazar citas',
                      icon: Icons.event_note,
                      color: Colors.orange,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const BookingsScreen()),
                        );
                      },
                    ),
                    const SizedBox(height: 12),
                    _QuickActionButton(
                      title: 'Servicios Atendidos',
                      subtitle: 'Ver historial de servicios',
                      icon: Icons.history,
                      color: Colors.blue,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const ServicesScreen()),
                        );
                      },
                    ),
                    const SizedBox(height: 12),
                    _QuickActionButton(
                      title: 'Ventas de Productos',
                      subtitle: 'Ver productos vendidos',
                      icon: Icons.shopping_bag,
                      color: Colors.green,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const ProductsScreen()),
                        );
                      },
                    ),
                    const SizedBox(height: 12),
                    _QuickActionButton(
                      title: 'Geolocalización',
                      subtitle: 'Ver ubicación y geocerca',
                      icon: Icons.map,
                      color: Colors.red,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const GeolocationScreen()),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _loadDashboard,
        child: const Icon(Icons.refresh),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Icon(icon, color: color),
                Text(
                  value,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: color,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickActionButton extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionButton({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withOpacity(0.1),
          child: Icon(icon, color: color),
        ),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
        onTap: onTap,
      ),
    );
  }
}
