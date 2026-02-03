import 'package:flutkit/full_apps/animations/smart_shopping/views/ui/shopping_cart_screen.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/views/ui/home_screen.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/controller/ui/full_app_controller.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/views/ui/profile_screen.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/views/ui/search_screen.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/theme/constant.dart';
import 'package:flutkit/helpers/widgets/my_bottom_navigation_bar.dart';
import 'package:flutkit/helpers/widgets/my_bottom_navigation_bar_item.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

import 'package:get/get.dart';

class FullAppScreen extends StatefulWidget {
  const FullAppScreen({super.key});

  @override
  State<FullAppScreen> createState() => _FullAppScreenState();
}

class _FullAppScreenState extends State<FullAppScreen> {
  late FullAppController controller;
  late ThemeData theme;

  @override
  void initState() {
    controller = Get.put(FullAppController());
    theme = AppTheme.smartShopping;
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder(
      init: controller,
      tag: 'smart_shopping_full_app',
      builder: (controller) {
        return Scaffold(
          body: MyBottomNavigationBar(
            activeTitleStyle: MyTextStyle.bodySmall(color: theme.colorScheme.primary, fontWeight: 800),
            activeContainerColor: theme.colorScheme.primary.withAlpha(120),
            containerShape: BoxShape.rectangle,
            myBottomNavigationBarType: MyBottomNavigationBarType.containered,
            containerRadius: Constant.containerRadius.small,
            backgroundColor: theme.colorScheme.primaryContainer,
            showLabel: false,
            labelSpacing: 8,
            initialIndex: 0,
            labelDirection: Axis.horizontal,
            itemList: [
              MyBottomNavigationBarItem(
                page: HomeScreen(),
                icon: Icon(LucideIcons.house, color: theme.colorScheme.primary, size: 24),
                activeIcon: Icon(LucideIcons.house, fill: 1, color: theme.colorScheme.primary, size: 24),
                title: "Home",
                activeIconColor: theme.colorScheme.primary,
              ),
              MyBottomNavigationBarItem(
                page: SearchScreen(),
                icon: Icon(LucideIcons.search, color: theme.colorScheme.primary, size: 24),
                activeIcon: Icon(Icons.search, color: theme.colorScheme.primary, size: 24),
                title: "Search",
                activeIconColor: theme.colorScheme.primary,
                activeTitleColor: theme.colorScheme.primary,
              ),
              MyBottomNavigationBarItem(
                page: ShoppingCartScreen(),
                icon: Icon(LucideIcons.shopping_cart, color: theme.colorScheme.primary, size: 24),
                activeIcon: Icon(Icons.shopping_cart, color: theme.colorScheme.primary, size: 24),
                title: "Cart",
                activeIconColor: theme.colorScheme.primary,
                activeTitleColor: theme.colorScheme.primary,
              ),
              MyBottomNavigationBarItem(
                page: ProfileScreen(),
                icon: Icon(LucideIcons.circle_user, color: theme.colorScheme.primary, size: 24),
                activeIcon: Icon(LucideIcons.circle_user, color: theme.colorScheme.primary, size: 24),
                title: "Profile",
                activeIconColor: theme.colorScheme.primary,
                activeTitleColor: theme.colorScheme.primary,
              ),
            ],
          ),
        );
      },
    );
  }
}
