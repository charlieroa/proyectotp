import 'package:flutkit/full_apps/animations/plant/controller/plant_full_app_controller.dart';
import 'package:flutkit/full_apps/animations/plant/views/plant_analysis_screen.dart';
import 'package:flutkit/full_apps/animations/plant/views/plant_home_screen.dart';
import 'package:flutkit/full_apps/animations/plant/views/plant_profile_screen.dart';
import 'package:flutkit/full_apps/animations/plant/views/plant_shopping_screen.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class PlantFullAppScreen extends StatefulWidget {
  const PlantFullAppScreen({super.key});

  @override
  State<PlantFullAppScreen> createState() => _PlantFullAppScreenState();
}

class _PlantFullAppScreenState extends State<PlantFullAppScreen>
    with TickerProviderStateMixin {
  late PlantFullAppController controller;

  @override
  void initState() {
    controller = Get.put(PlantFullAppController());
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<PlantFullAppController>(
      init: controller,
      tag: 'plant_full_app_controller',
      builder: (controller) {
        return Scaffold(
          body: [
            PlantHomeScreen(rootContext: context),
            PlantShoppingScreen(rootContext: context),
            AnalysisScreen(),
            PlantProfileScreen(),
          ][controller.selectedIndex],
          bottomNavigationBar: NavigationBar(
            onDestinationSelected: (int index) {
              setState(() {
                controller.selectedIndex = index;
              });
            },
            selectedIndex: controller.selectedIndex,
            elevation: 0,
            labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
            animationDuration: Duration(milliseconds: 800),
            destinations: [
              NavigationDestination(
                label: 'Home',
                icon: Icon(LucideIcons.house),
              ),
              NavigationDestination(
                label: 'Cart',
                icon: Icon(LucideIcons.shopping_cart),
              ),
              NavigationDestination(
                label: 'Analysis',
                icon: Icon(LucideIcons.chart_pie),
              ),
              NavigationDestination(
                label: 'Profile',
                icon: Icon(LucideIcons.circle_user),
              ),
            ],
          ),
        );
      },
    );
  }
}
