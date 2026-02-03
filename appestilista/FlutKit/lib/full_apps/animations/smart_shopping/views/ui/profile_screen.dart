import 'package:flutkit/full_apps/animations/shopping_manager/controllers/profile_controller.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/app_layout.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late ProfileController controller;
  late ThemeData theme;

  @override
  void initState() {
    theme = AppTheme.smartShopping;
    controller = Get.put(ProfileController());
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder(
      init: controller,
      builder: (controller) {
        return AppLayout(
          child: Scaffold(
            backgroundColor: Colors.transparent,
            appBar: AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              title: MyText.titleMedium('Profile', fontWeight: 700, letterSpacing: 1.2),
              automaticallyImplyLeading: false,
            ),
            body: SingleChildScrollView(
              padding: MySpacing.symmetric(horizontal: 20, vertical: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildProfileCard(),
                  MySpacing.height(30),
                  _buildSectionTitle('Account'),
                  MySpacing.height(12),
                  _buildMenuCard([
                    _buildMenuItem(LucideIcons.circle_user, 'Account Details'),
                    _buildMenuItem(LucideIcons.credit_card, 'Payment History', subText: 'View your past orders'),
                    _buildMenuItem(LucideIcons.bell, 'Notification'),
                    _buildMenuItem(LucideIcons.cog, 'Settings'),
                  ]),
                  MySpacing.height(30),
                  _buildSectionTitle('Support & Info'),
                  MySpacing.height(12),
                  _buildMenuCard([
                    _buildMenuItem(LucideIcons.phone, 'Contact Us'),
                    _buildMenuItem(LucideIcons.scroll_text, 'Terms & Conditions'),
                    _buildMenuItem(LucideIcons.lock_keyhole, 'Privacy Policy'),
                    _buildMenuItem(LucideIcons.badge_question_mark, 'Get Help'),
                    _buildMenuItem(LucideIcons.log_out, 'Log out'),
                  ]),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildSectionTitle(String title) {
    return MyText.bodyMedium(title.toUpperCase(), fontWeight: 800, color: theme.colorScheme.primary, letterSpacing: 1.5);
  }

  Widget _buildProfileCard() {
    return MyContainer(
      padding: MySpacing.all(20),
      borderRadiusAll: 20,
      color: Colors.white,
      child: Row(
        children: [
          CircleAvatar(radius: 28, backgroundImage: AssetImage(Images.profile2)),
          MySpacing.width(18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MyText.bodyLarge('Mr. Jacob', fontWeight: 900, letterSpacing: 1.1, color: theme.colorScheme.onSurface),
                MySpacing.height(6),
                MyText.labelMedium('Welcome to California', muted: true, fontWeight: 600, letterSpacing: 0.4),
              ],
            ),
          ),
          IconButton(
            icon: Icon(LucideIcons.pencil, size: 20, color: theme.colorScheme.primary),
            onPressed: () {},
            splashRadius: 24,
            tooltip: 'Edit Profile',
          ),
        ],
      ),
    );
  }

  Widget _buildMenuCard(List<Widget> items) {
    return MyContainer(
      borderRadiusAll: 20,
      color: Colors.white,
      padding: MySpacing.vertical(6),
      child: Column(
        children: List.generate(items.length, (index) {
          return Column(
            children: [
              items[index],
              if (index != items.length - 1)
                Divider(height: 1, color: theme.colorScheme.onSurface.withValues(alpha: 0.1), indent: 64, endIndent: 12, thickness: 1),
            ],
          );
        }),
      ),
    );
  }

  Widget _buildMenuItem(IconData icon, String title, {String? subText}) {
    return ListTile(
      contentPadding: MySpacing.symmetric(horizontal: 16, vertical: 12),
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(color: theme.colorScheme.primary.withValues(alpha: 0.12), shape: BoxShape.circle),
        child: Icon(icon, color: theme.colorScheme.primary, size: 22),
      ),
      title: MyText.bodyMedium(title, fontWeight: 700, letterSpacing: 0.4, color: theme.colorScheme.onSurface),
      subtitle: subText != null ? MyText.labelMedium(subText, muted: true, fontWeight: 500, letterSpacing: 0.2) : null,
      trailing: Icon(Icons.chevron_right, size: 18, color: theme.colorScheme.onSurfaceVariant),
      onTap: () {},
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      minLeadingWidth: 36,
      horizontalTitleGap: 12,
    );
  }
}
