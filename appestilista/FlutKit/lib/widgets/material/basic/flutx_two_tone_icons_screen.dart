
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class FxTwoToneIconsScreen extends StatefulWidget {
  @override
  _FxTwoToneIconsScreenState createState() => _FxTwoToneIconsScreenState();
}

class _FxTwoToneIconsScreenState extends State<FxTwoToneIconsScreen> {
  late CustomTheme customTheme;
  late ThemeData theme;

  @override
  void initState() {
    super.initState();
    customTheme = AppTheme.customTheme;
    theme = AppTheme.theme;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListView(
        padding: MySpacing.vertical(16),
        children: [
          GridView.count(
              shrinkWrap: true,
              physics: ClampingScrollPhysics(),
              crossAxisCount: 4,
              padding: MySpacing.all(8),
              mainAxisSpacing: 24,
              childAspectRatio: 3 / 2,
              crossAxisSpacing: 24,
              children: <Widget>[
                Icon(
                  LucideIcons.circle,
                  color: customTheme.violet,
                ),
                Icon(
                  LucideIcons.circle_plus,
                  color: customTheme.violet,
                ),
                Icon(
                  LucideIcons.circle_play,
                  color: customTheme.violet,
                ),
                Icon(
                  LucideIcons.user,
                  color: customTheme.violet,
                ),
                Icon(
                  LucideIcons.square_check,
                  color: customTheme.indigo,
                ),
                Icon(
                  LucideIcons.square_plus,
                  color: customTheme.indigo,
                ),
                Icon(
                  LucideIcons.projector,
                  color: customTheme.indigo,
                ),
                Icon(
                  LucideIcons.user,
                  color: customTheme.indigo,
                ),
                Icon(
                  LucideIcons.triangle,
                  color: CustomTheme.blue,
                ),
                Icon(
                  LucideIcons.triangle_alert,
                  color: CustomTheme.blue,
                ),
                Icon(
                  Icons.details,
                  color: CustomTheme.blue,
                ),
                Icon(
                  Icons.eject,
                  color: CustomTheme.blue,
                ),
                Icon(
                  LucideIcons.smile,
                  color: CustomTheme.green,
                ),
                Icon(
                  LucideIcons.laugh,
                  color: CustomTheme.green,
                ),
                Icon(
                  LucideIcons.meh,
                  color: CustomTheme.green,
                ),
                Icon(
                  LucideIcons.angry,
                  color: CustomTheme.green,
                ),
                Icon(
                  LucideIcons.house,
                  color: CustomTheme.orange,
                ),
                Icon(
                  LucideIcons.school,
                  color: CustomTheme.orange,
                ),
                Icon(
                  LucideIcons.rocking_chair,
                  color: CustomTheme.orange,
                ),
                Icon(
                  Icons.night_shelter,
                  color: CustomTheme.orange,
                ),
                Icon(
                  Icons.admin_panel_settings,
                  color: CustomTheme.red,
                ),
                Icon(
                  LucideIcons.bookmark,
                  color: CustomTheme.red,
                ),
                Icon(
                  Icons.extension,
                  color: CustomTheme.red,
                ),
                Icon(
                  LucideIcons.hand,
                  color: CustomTheme.red,
                ),
                Icon(
                  LucideIcons.star,
                  color: CustomTheme.green,
                ),
                Icon(
                  LucideIcons.star_half,
                  color: CustomTheme.green,
                ),
                Icon(
                  LucideIcons.star,
                  color: CustomTheme.green,
                ),
                Icon(
                  LucideIcons.badge_check,
                  color: CustomTheme.green,
                ),
              ]),

        ],
      ),
    );
  }
}
