import 'package:flutkit/full_apps/other/medicare/chat_screen.dart';
import 'package:flutkit/full_apps/other/medicare/home_screen.dart';
import 'package:flutkit/full_apps/other/medicare/profile_screen.dart';
import 'package:flutkit/full_apps/other/medicare/schedule_screen.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_bottom_navigation_bar.dart';
import 'package:flutkit/helpers/widgets/my_bottom_navigation_bar_item.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class MediCareFullApp extends StatefulWidget {
  @override
  _MediCareFullAppState createState() => _MediCareFullAppState();
}

class _MediCareFullAppState extends State<MediCareFullApp> {
  late ThemeData theme;
  late CustomTheme customTheme;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: MyBottomNavigationBar(
        containerDecoration: BoxDecoration(
          color: customTheme.card,
          borderRadius: BorderRadius.only(
              topLeft: Radius.circular(16), topRight: Radius.circular(16)),
        ),
        activeContainerColor: customTheme.medicarePrimary.withAlpha(30),
        myBottomNavigationBarType: MyBottomNavigationBarType.containered,
        showActiveLabel: false,
        showLabel: false,
        activeIconSize: 24,
        iconSize: 24,
        activeIconColor: customTheme.medicarePrimary,
        iconColor: theme.colorScheme.onSurface.withAlpha(140),
        itemList: [
          MyBottomNavigationBarItem(
            page: MediCareHomeScreen(),
            activeIconData: LucideIcons.house,
            iconData: LucideIcons.house,
          ),
          MyBottomNavigationBarItem(
            page: MediCareScheduleScreen(),
            activeIconData: LucideIcons.calendar_days,
            iconData: LucideIcons.calendar_days,
          ),
          MyBottomNavigationBarItem(
            page: MediCareChatScreen(),
            activeIconData: LucideIcons.message_square,
            iconData: LucideIcons.message_square,
          ),
          MyBottomNavigationBarItem(
            page: MediCareProfileScreen(),
            activeIconData: LucideIcons.user,
            iconData: LucideIcons.user,
          ),
        ],
      ),
    );
  }
}
