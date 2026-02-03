import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import 'package:flutkit/full_apps/animations/food/controllers/track_order_controller.dart';

class TrackOrderScreen extends StatefulWidget {
  const TrackOrderScreen({super.key});

  @override
  State<TrackOrderScreen> createState() => _TrackOrderScreenState();
}

class _TrackOrderScreenState extends State<TrackOrderScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late TrackOrderController controller;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;

    controller = Get.put(TrackOrderController());
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<TrackOrderController>(
        init: controller,
        tag: 'food_track_order_controller',
        builder: (controller) {
          return _buildBody();
        });
  }

  Widget _buildBody() {
      return Scaffold(
        body: Stack(
          children: [
            Column(
              children: [
                Expanded(
                  child: GoogleMap(
                    onMapCreated: controller.onMapCreated,
                    style: controller.mapStyle,
                    initialCameraPosition: CameraPosition(
                      target: controller.center,
                      zoom: 11.0,
                    ),
                  ),
                ),
                MySpacing.height(20),
                Padding(
                  padding: MySpacing.x(20),
                  child: Row(
                    children: [
                      MyContainer.rounded(
                        height: 56,
                        paddingAll: 0,
                        child: Image(
                          image: AssetImage(Images.foodProfile),
                        ),
                      ),
                      MySpacing.width(20),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: MyText.labelLarge(
                                    'Naira Andrew',
                                    fontWeight: 600,
                                  ),
                                ),
                                MySpacing.width(20),
                                MyContainer(
                                  paddingAll: 8,
                                  padding: MySpacing.xy(8, 4),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.star,
                                        size: 16,
                                        color: customTheme.colorWarning,
                                      ),
                                      MySpacing.width(4),
                                      MyText.bodySmall(
                                        '4.5',
                                        fontSize: 10,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            MyText.labelLarge(
                              'Your order is on the way',
                              xMuted: true,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                MySpacing.height(20),
                MyContainer.bordered(
                  color: theme.scaffoldBackgroundColor,
                  borderRadiusAll: 8,
                  padding: MySpacing.xy(16, 12),
                  margin: MySpacing.x(20),
                  child: Row(
                    children: [
                      Icon(
                        Icons.directions_bike,
                        size: 20,
                      ),
                      MySpacing.width(20),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            MyText.labelLarge(
                              'At Home Delivery',
                            ),
                            MySpacing.height(4),
                            MyText.labelLarge(
                              '15 mins',
                              color: customTheme.foodPrimary,
                            ),
                          ],
                        ),
                      ),
                      MySpacing.width(20),
                      MyButton.small(
                        onPressed: () {},
                        padding: MySpacing.xy(20, 10),
                        backgroundColor: customTheme.foodPrimary,
                        elevation: 0,
                        borderRadiusAll: 8,
                        splashColor: customTheme.foodOnPrimary.withAlpha(60),
                        child: MyText.labelLarge(
                          'Call',
                          color: customTheme.foodOnPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
                MySpacing.height(20),
              ],
            ),
            Positioned(
              top: MySpacing.safeAreaTop(context) + 20,
              left: 20,
              right: 20,
              child: MyContainer(
                color: theme.scaffoldBackgroundColor,
                onTap: () {
                  controller.goToCheckoutScreen();
                },
                child: Row(
                  children: [
                    InkWell(
                      onTap: () {
                        controller.goBack();
                      },
                      child: Icon(
                        LucideIcons.chevron_left,
                        size: 20,
                      ),
                    ),
                    MySpacing.width(12),
                    Icon(
                      LucideIcons.map_pin,
                      size: 20,
                      color: customTheme.foodPrimary,
                    ),
                    MySpacing.width(12),
                    MyText.labelLarge(
                      '512, Saint Street, New York',
                      fontWeight: 600,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
  }
}
