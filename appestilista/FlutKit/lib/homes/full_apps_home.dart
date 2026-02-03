import 'package:flutkit/full_apps/animations/food/views/splash_screen.dart';
import 'package:flutkit/full_apps/animations/nft/views/splash_screen.dart' as nft;
import 'package:flutkit/full_apps/animations/plant/views/plant_splash_screen.dart';
import 'package:flutkit/full_apps/animations/rental_service/views/splash_screen.dart' as rental_service;
import 'package:flutkit/full_apps/animations/shopping/views/splash_screen.dart' as shopping;
import 'package:flutkit/full_apps/animations/shopping_manager/views/login_screen.dart' as shopping_manager;
import 'package:flutkit/full_apps/m3/cookify/views/splash_screen.dart' as cookify;
import 'package:flutkit/full_apps/m3/dating/views/splash_screen.dart' as dating;
import 'package:flutkit/full_apps/m3/estate/views/splash_screen.dart' as estate;
import 'package:flutkit/full_apps/m3/homemade/views/splash_screen.dart' as homemade;
import 'package:flutkit/full_apps/m3/learning/views/splash_screen.dart' as learning;
import 'package:flutkit/full_apps/other/cookify/views/splash_screen.dart';
import 'package:flutkit/full_apps/other/dating/views/splash_screen.dart';
import 'package:flutkit/full_apps/other/estate/views/splash_screen.dart';
import 'package:flutkit/full_apps/other/grocery/full_app.dart';
import 'package:flutkit/full_apps/other/homemade/views/splash_screen.dart';
import 'package:flutkit/full_apps/other/medicare/splash_screen.dart';
import 'package:flutkit/full_apps/other/muvi/views/splash_screen.dart' as muvi;
import 'package:flutkit/full_apps/animations/smart_shopping/views/auth/login_screen.dart' as ai_shopping;
import 'package:flutkit/full_apps/other/shopping/full_app.dart';
import 'package:flutkit/helpers/theme/app_notifier.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/homes/single_grid_item.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:provider/provider.dart';

import 'package:flutkit/full_apps/animations/hr/views/auth/login_screen.dart';

class FullAppsHome extends StatefulWidget {
  const FullAppsHome({super.key});

  @override
  State<FullAppsHome> createState() => _FullAppsHomeState();
}

class _FullAppsHomeState extends State<FullAppsHome> with TickerProviderStateMixin {
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
    return Consumer<AppNotifier>(
      builder: (BuildContext context, AppNotifier value, Widget? child) {
        return ListView(
          padding: MySpacing.fromLTRB(20, 0, 20, 80),
          shrinkWrap: true,
          physics: ClampingScrollPhysics(),
          children: <Widget>[
            MyText.titleSmall("COOL ANIMATION", fontWeight: 700, muted: true),
            MySpacing.height(20),
            GridView.count(
              shrinkWrap: true,
              physics: ClampingScrollPhysics(),
              crossAxisCount: 2,
              padding: MySpacing.zero,
              mainAxisSpacing: 20,
              childAspectRatio: 3 / 2,
              crossAxisSpacing: 20,
              children: <Widget>[
                SinglePageItem(iconData: LucideIcons.shopping_bag, navigation: shopping.SplashScreen(), title: "Shopping"),
                SinglePageItem(title: "Rental Service", iconData: LucideIcons.car, navigation: rental_service.SplashScreen()),
                SinglePageItem(iconData: LucideIcons.bitcoin, navigation: nft.SplashScreen(), title: "NFT"),
                SinglePageItem(iconData: LucideIcons.user_cog, navigation: shopping_manager.LoginScreen(), title: "Shopping Manager"),
                SinglePageItem(iconData: LucideIcons.flower_2, navigation: PlantSplashScreen(), title: "Plants"),
                SinglePageItem(iconData: LucideIcons.user_cog, navigation: LoginScreen(), title: "HR"),
                SinglePageItem(iconData: LucideIcons.donut, navigation: SplashScreen(), title: "Food"),
                SinglePageItem(iconData: LucideIcons.scan_qr_code, navigation: ai_shopping.LoginScreen(), title: "AI Shopping"),
              ],
            ),
            MySpacing.height(20),
            MyText.titleSmall("FULL APPS", fontWeight: 700, muted: true),
            MySpacing.height(20),
            GridView.count(
              shrinkWrap: true,
              physics: ClampingScrollPhysics(),
              crossAxisCount: 2,
              padding: MySpacing.zero,
              mainAxisSpacing: 20,
              childAspectRatio: 3 / 2,
              crossAxisSpacing: 20,
              children: <Widget>[
                SinglePageItem(iconData: LucideIcons.cake, navigation: HomeMadeSplashScreen(), title: "Homemade"),
                SinglePageItem(iconData: LucideIcons.cookie, navigation: CookifySplashScreen(), title: "Cookify"),
                SinglePageItem(iconData: LucideIcons.cross, navigation: MediCareSplashScreen(), title: "Medi Care"),
                SinglePageItem(iconData: LucideIcons.shopping_cart, navigation: ShoppingFullApp(), title: "Shopping"),
                SinglePageItem(iconData: LucideIcons.building_2, navigation: EstateSplashScreen(), title: "Estate"),
                SinglePageItem(iconData: LucideIcons.apple, title: "Grocery", navigation: GroceryFullApp()),
                SinglePageItem(iconData: LucideIcons.heart, navigation: DatingSplashScreen(), title: "Dating"),
                SinglePageItem(iconData: LucideIcons.tv, navigation: muvi.SplashScreen(), title: "Muvi"),
              ],
            ),
            MySpacing.height(20),
            MyText.titleSmall("MATERIAL YOU", fontWeight: 700, muted: true),
            MySpacing.height(20),
            GridView.count(
              shrinkWrap: true,
              physics: ClampingScrollPhysics(),
              crossAxisCount: 2,
              padding: MySpacing.zero,
              mainAxisSpacing: 20,
              childAspectRatio: 3 / 2,
              crossAxisSpacing: 20,
              children: <Widget>[
                SinglePageItem(iconData: LucideIcons.book_open, navigation: learning.SplashScreen(), title: "Learning"),
                SinglePageItem(iconData: LucideIcons.chef_hat, navigation: cookify.SplashScreen(), title: "Cookify"),
                SinglePageItem(iconData: LucideIcons.heart, navigation: dating.SplashScreen(), title: "Dating"),
                SinglePageItem(iconData: LucideIcons.building, navigation: estate.SplashScreen(), title: "Estate"),
                SinglePageItem(iconData: LucideIcons.cake, navigation: homemade.SplashScreen(), title: "Homemade"),
              ],
            ),
            MyContainer(
              margin: MySpacing.y(20),
              borderRadiusAll: 4,
              color: theme.colorScheme.primary.withAlpha(24),
              child: Center(
                child: MyText.bodyMedium("More widgets are coming very soon...", fontWeight: 600, color: theme.colorScheme.primary),
              ),
            ),
          ],
        );
      },
    );
  }
}
