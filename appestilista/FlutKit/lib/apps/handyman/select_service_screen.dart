import 'package:flutkit/apps/handyman/single_service_screen.dart';

import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class SelectServiceScreen extends StatefulWidget {
  const SelectServiceScreen({super.key});

  @override
  State<SelectServiceScreen> createState() => _SelectServiceScreenState();
}

class _SelectServiceScreenState extends State<SelectServiceScreen> {
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
      physics: ClampingScrollPhysics(),
      children: [
        Container(
          margin: MySpacing.fromLTRB(32, 48, 0, 0),
          child: RichText(
            text: TextSpan(children: <TextSpan>[
              TextSpan(
                  text: "Which ",
                  style: MyTextStyle.headlineSmall(
                      fontWeight: 500,
                      color: theme.colorScheme.onSurface,
                      letterSpacing: 0)),
              TextSpan(
                  text: "service ",
                  style: MyTextStyle.headlineSmall(
                      fontWeight: 700,
                      color: customTheme.colorError,
                      letterSpacing: 0)),
              TextSpan(
                  text: "\ndo you",
                  style: MyTextStyle.headlineSmall(
                      fontWeight: 500,
                      color: theme.colorScheme.onSurface,
                      letterSpacing: 0)),
              TextSpan(
                  text: "\nneed?",
                  style: MyTextStyle.headlineSmall(
                      fontWeight: 700,
                      color: theme.colorScheme.primary,
                      letterSpacing: 0)),
            ]),
          ),
        ),
        Container(
          margin: MySpacing.fromLTRB(32, 48, 32, 0),
          child: GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: ClampingScrollPhysics(),
            childAspectRatio: 1.3,
            crossAxisSpacing: 32,
            mainAxisSpacing: 32,
            children: [
              singleService(
                  serviceIcon: LucideIcons.spray_can, service: "Cleaning"),
              singleService(serviceIcon: LucideIcons.brush, service: "Paint"),
              singleService(serviceIcon: LucideIcons.car, service: "Car Wash"),
              singleService(
                  serviceIcon: LucideIcons.chef_hat, service: "Cooking"),
              singleService(
                  serviceIcon: LucideIcons.camera, service: "Camera Man"),
              singleService(serviceIcon: LucideIcons.droplet, service: "Water"),
              singleService(
                  serviceIcon: Icons.table_restaurant_outlined,
                  service: "Furniture"),
              singleService(
                  serviceIcon: LucideIcons.circle_dot_dashed, service: "Other"),
            ],
          ),
        ),

      ],
    ));
  }

  Widget singleService({IconData? serviceIcon, required String service}) {
    return InkWell(
      onTap: () {
        Navigator.push(context,
            MaterialPageRoute(builder: (context) => SingleServiceScreen()));
      },
      child: Container(
        decoration: BoxDecoration(
            border: Border.all(color: theme.colorScheme.primary, width: 1),
            borderRadius: BorderRadius.all(Radius.circular(8)),
            color: theme.colorScheme.primary.withAlpha(40)),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              serviceIcon,
              color: theme.colorScheme.primary,
            ),
            Container(
              margin: MySpacing.top(8),
              child: MyText.titleSmall(service,
                  color: theme.colorScheme.primary,
                  fontWeight: 500,
                  letterSpacing: 0),
            )
          ],
        ),
      ),
    );
  }
}
