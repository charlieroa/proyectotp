import 'package:flutkit/full_apps/animations/hr/controller/full_app_controller.dart';
import 'package:flutkit/full_apps/animations/hr/views/ui/employee_screen.dart';
import 'package:flutkit/full_apps/animations/hr/views/ui/hire_candidate_screen.dart';
import 'package:flutkit/full_apps/animations/hr/views/ui/home_screen.dart';
import 'package:flutkit/full_apps/animations/hr/views/ui/profile_screen.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class FullApp extends StatefulWidget {
  const FullApp({super.key});

  @override
  State<FullApp> createState() => _FullAppState();
}

class _FullAppState extends State<FullApp> with SingleTickerProviderStateMixin {
  late ThemeData theme;
  late FullAppController controller;

  @override
  void initState() {
    theme = AppTheme.employeeCommunication;
    controller = FullAppController();
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<FullAppController>(
      tag: 'full_app',
      init: controller,
      builder: (controller) {
        return Scaffold(
          bottomNavigationBar: NavigationBar(
            onDestinationSelected: (int index) {
              setState(() {
                controller.selectedIndex = index;
              });
            },
            elevation: 2,
            selectedIndex: controller.selectedIndex,
            labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
            animationDuration: Duration(milliseconds: 800),
            destinations: [
              NavigationDestination(
                label: 'Home',
                icon: Icon(LucideIcons.house),
              ),
              NavigationDestination(
                label: 'Hire Candidate',
                icon: Icon(LucideIcons.search),
              ),
              NavigationDestination(
                label: 'Employee',
                icon: Icon(LucideIcons.users),
              ),
              NavigationDestination(
                label: 'Profile',
                icon: Icon(LucideIcons.user),
              ),
            ],
          ),
          body: [
            HomeScreen(),
            HireCandidateScreen(),
            EmployeeScreen(),
            ProfileScreen()
          ][controller.selectedIndex],
        );
      },
    );
  }
}
