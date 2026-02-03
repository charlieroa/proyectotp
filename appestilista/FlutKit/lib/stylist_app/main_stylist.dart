import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../helpers/theme/app_theme.dart';
import '../helpers/theme/app_notifier.dart';
import 'package:provider/provider.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'services/api_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  AppTheme.init();

  // Verificar si hay token guardado
  final prefs = await SharedPreferences.getInstance();
  final token = prefs.getString('token');

  if (token != null) {
    ApiService.setToken(token);
  }

  runApp(
    ChangeNotifierProvider<AppNotifier>(
      create: (context) => AppNotifier(),
      child: const StylistApp(),
    ),
  );
}

class StylistApp extends StatelessWidget {
  const StylistApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppNotifier>(
      builder: (BuildContext context, AppNotifier value, Widget? child) {
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: AppTheme.theme,
          home: FutureBuilder<String?>(
            future: SharedPreferences.getInstance()
                .then((prefs) => prefs.getString('token')),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Scaffold(
                  body: Center(child: CircularProgressIndicator()),
                );
              }
              // Si hay token, ir a dashboard, sino a login
              return snapshot.hasData && snapshot.data != null
                  ? const DashboardScreen()
                  : const LoginScreen();
            },
          ),
        );
      },
    );
  }
}
