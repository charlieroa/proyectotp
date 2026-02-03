import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_star_rating.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutter/material.dart';
import 'package:flutkit/full_apps/animations/food/controllers/single_food_item_controller.dart';
import 'package:flutkit/full_apps/animations/food/models/food_item.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';

class SingleFoodItemScreen extends StatefulWidget {
  final FoodItem foodItem;

  const SingleFoodItemScreen(
    this.foodItem, {
    super.key,
  });

  @override
  State<SingleFoodItemScreen> createState() => _SingleFoodItemScreenState();
}

class _SingleFoodItemScreenState extends State<SingleFoodItemScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late SingleFoodItemController controller;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;

    controller =
        Get.put(SingleFoodItemController(widget.foodItem));
  }

  Widget _buildSingleIngredient(String image) {
    return MyContainer(
      paddingAll: 12,
      borderRadiusAll: 8,
      margin: MySpacing.right(12),
      height: 68,
      width: 68,
      child: Image(
        image: AssetImage(image),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<SingleFoodItemController>(
        init: controller,
        tag: 'food_single_food_controller',
        builder: (controller) {
          return _buildBody();
        });
  }

  Widget _buildBody() {
      return Scaffold(
        body: ListView(
          padding: MySpacing.fromLTRB(
              20, MySpacing.safeAreaTop(context) + 20, 20, 20),
          children: [
            Row(
              children: [
                MyContainer(
                  onTap: () => controller.goBack(),
                  color: customTheme.foodPrimary.withAlpha(40),
                  paddingAll: 8,
                  child: Icon(
                    LucideIcons.chevron_left,
                    size: 20,
                  ),
                ),
              ],
            ),
            MySpacing.height(20),
            MyText.titleLarge(
              controller.foodItem.name,
              fontWeight: 600,
              textAlign: TextAlign.center,
            ),
            MySpacing.height(4),
            MyText.labelLarge(
              'Driver is on the way to you',
              xMuted: true,
              textAlign: TextAlign.center,
            ),
            MySpacing.height(4),
            MyText.bodyLarge(
              '\$${controller.foodItem.price}',
              fontWeight: 600,
              textAlign: TextAlign.center,
            ),
            MySpacing.height(4),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                MyStarRating(
                  size: 16,
                  showInactive: true,
                  inactiveStarFilled: false,
                  activeColor: customTheme.colorWarning,
                  inactiveColor: customTheme.colorWarning,
                  spacing: 4,
                  rating: controller.foodItem.ratings,
                ),
              ],
            ),
            MySpacing.height(20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                MyContainer.rounded(
                  child: MyContainer.rounded(
                    marginAll: 0,
                    paddingAll: 0,
                    clipBehavior: Clip.antiAliasWithSaveLayer,
                    child: Image(
                      fit: BoxFit.cover,
                      width: 120,
                      height: 120,
                      image: AssetImage(controller.foodItem.image),
                    ),
                  ),
                ),
                Column(
                  children: [
                    Row(
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            MyText.labelLarge(
                              'Protein',
                              fontWeight: 600,
                            ),
                            MySpacing.height(2),
                            Row(
                              children: [
                                Image(
                                  height: 20,
                                  width: 20,
                                  image: AssetImage(
                                      'assets/images/full_apps/food/icons/leg.png'),
                                ),
                                MySpacing.width(4),
                                MyText.bodySmall(
                                  '${controller.foodItem.proteins}g',
                                  xMuted: true,
                                  fontWeight: 600,
                                ),
                              ],
                            ),
                          ],
                        ),
                        MySpacing.width(20),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            MyText.labelLarge(
                              'Carbo',
                              fontWeight: 600,
                            ),
                            MySpacing.height(2),
                            Row(
                              children: [
                                Image(
                                  height: 20,
                                  width: 20,
                                  image: AssetImage(
                                      'assets/images/full_apps/food/icons/broccoli.png'),
                                ),
                                MySpacing.width(4),
                                MyText.bodySmall(
                                  '${controller.foodItem.carbs}g',
                                  xMuted: true,
                                  fontWeight: 600,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                    MySpacing.height(20),
                    Row(
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            MyText.labelLarge(
                              'Fat',
                              fontWeight: 600,
                            ),
                            MySpacing.height(2),
                            Row(
                              children: [
                                Image(
                                  height: 20,
                                  width: 20,
                                  image: AssetImage(
                                      'assets/images/full_apps/food/icons/meat.png'),
                                ),
                                MySpacing.width(6),
                                MyText.bodySmall(
                                  '${controller.foodItem.fats}g',
                                  xMuted: true,
                                  fontWeight: 600,
                                ),
                              ],
                            ),
                          ],
                        ),
                        MySpacing.width(20),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            MyText.labelLarge(
                              'Calories',
                              fontWeight: 600,
                            ),
                            MySpacing.height(2),
                            Row(
                              children: [
                                Image(
                                  height: 20,
                                  width: 20,
                                  image: AssetImage(
                                      'assets/images/full_apps/food/icons/flame.png'),
                                ),
                                MySpacing.width(4),
                                MyText.bodySmall(
                                  '${controller.foodItem.calories}g',
                                  xMuted: true,
                                  fontWeight: 600,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
            MySpacing.height(20),
            Center(
              child: MyButton.small(
                onPressed: () {
                  controller.goToReviewScreen();
                },
                elevation: 0,
                borderRadiusAll: 4,
                padding: MySpacing.xy(20, 10),
                backgroundColor: customTheme.foodPrimary.withAlpha(60),
                splashColor: customTheme.foodPrimary.withAlpha(60),
                child: MyText.labelLarge(
                  'Write a review',
                  color: customTheme.foodPrimary,
                ),
              ),
            ),
            MySpacing.height(12),
            MyText.bodyLarge(
              'Details',
              fontWeight: 600,
            ),
            MySpacing.height(12),
            RichText(
              text: TextSpan(
                text: controller.foodItem.description,
                style: MyTextStyle.bodySmall(letterSpacing: 0.2, xMuted: true),
                children: <TextSpan>[
                  TextSpan(
                      text: ' Read more ...',
                      style: TextStyle(
                        color: customTheme.foodPrimary,
                      )),
                ],
              ),
            ),
            MySpacing.height(20),
            MyText.bodyLarge(
              'Ingredients',
              fontWeight: 600,
            ),
            MySpacing.height(20),
            Row(
              children: [
                _buildSingleIngredient(
                    'assets/images/full_apps/food/icons/cabbage.png'),
                _buildSingleIngredient(
                    'assets/images/full_apps/food/icons/tomato.png'),
                _buildSingleIngredient(
                    'assets/images/full_apps/food/icons/onion.png'),
                _buildSingleIngredient(
                    'assets/images/full_apps/food/icons/herb.png'),
              ],
            ),
            MySpacing.height(20),
            MyButton.block(
              onPressed: () => controller.goToCartScreen(),
              elevation: 0,
              borderRadiusAll: 8,
              backgroundColor: customTheme.foodPrimary,
              child: MyText.bodyMedium(
                'Add to cart',
                color: customTheme.foodOnPrimary,
              ),
            ),
          ],
        ),
      );
    }
}
