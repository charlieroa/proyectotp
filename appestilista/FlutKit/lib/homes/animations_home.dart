import 'package:flutkit/animations/flip/flip_screen.dart';
import 'package:flutkit/animations/radial_menu/radial_menu_screen.dart';
import 'package:flutkit/animations/theme_changer/theme_changer_screen.dart';
import 'package:flutkit/helpers/theme/app_notifier.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/homes/single_grid_item.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:provider/provider.dart';

class AnimationsHome extends StatefulWidget {
  const AnimationsHome({super.key});

  @override
  _AnimationsHomeState createState() => _AnimationsHomeState();
}

class _AnimationsHomeState extends State<AnimationsHome> {
  late ThemeData theme;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AppNotifier>(
      builder: (BuildContext context, AppNotifier value, Widget? child) {
        return Container(
          padding: MySpacing.fromLTRB(20, 0, 20, 20),
          child: ListView(
            shrinkWrap: true,
            physics: ClampingScrollPhysics(),
            children: [
              GridView.count(
                  shrinkWrap: true,
                  physics: ClampingScrollPhysics(),
                  crossAxisCount: 2,
                  padding: MySpacing.zero,
                  mainAxisSpacing: 20,
                  childAspectRatio: 3 / 2,
                  crossAxisSpacing: 20,
                  children: <Widget>[

                    SinglePageItem(
                      title: "Theme Changer",
                      iconData: LucideIcons.sun,
                      // icon: './assets/icons/sun_outline.png',
                      navigation: ThemeChangerScreen(),
                    ),
                    SinglePageItem(
                      title: "Flip",
                      iconData: LucideIcons.arrow_right_left,
                      navigation: FlipScreen(),
                    ),
                    SinglePageItem(
                      title: "Radial Menu",
                      iconData: LucideIcons.menu,
                      navigation: RadialMenuScreen(),
                    ),
                  ]),
            ],
          ),
        );
      },
    );
  }
}
