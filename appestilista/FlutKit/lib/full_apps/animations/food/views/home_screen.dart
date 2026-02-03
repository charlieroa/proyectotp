import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_star_rating.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:flutkit/full_apps/animations/food/controllers/home_controller.dart';
import 'package:flutkit/full_apps/animations/food/models/category.dart';
import 'package:flutkit/full_apps/animations/food/models/food_item.dart';
import 'package:get/get.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late HomeController controller;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;
    controller = Get.put(HomeController());
  }

  Widget _buildCategoryList() {
    List<Widget> list = [];

    list.add(MySpacing.width(20));

    for (Category category in controller.categories) {
      list.add(MyContainer(
        width: 124,
        height: 150,
        color: category.color,
        borderRadiusAll: 8,
        margin: MySpacing.right(20),
        child: Column(
          children: [
            MyContainer(
              paddingAll: 0,
              borderRadiusAll: 8,
              clipBehavior: Clip.antiAliasWithSaveLayer,
              child: Image(
                height: 64,
                width: 64,
                fit: BoxFit.cover,
                image: AssetImage(category.image),
              ),
            ),
            MySpacing.height(12),
            MyText.bodyMedium(
              category.name,
              fontWeight: 700,
              color: Colors.black,
            ),
            MySpacing.height(4),
            MyText.bodySmall(
              '${category.dishes} Dishes',
              fontWeight: 600,
              xMuted: true,
              color: Colors.black,
            ),
          ],
        ),
      ));
    }

    return Row(
      children: list,
    );
  }

  List<Widget> _buildItemList() {
    List<Widget> list = [];

    list.add(MySpacing.height(20));

    for (FoodItem foodItem in controller.foodItems) {
      list.add(InkWell(
        onTap: () {
          controller.goToSingleScreen(foodItem);
        },
        child: Container(
          margin: MySpacing.x(20),
          child: Row(
            children: [
              MyContainer(
                paddingAll: 0,
                borderRadiusAll: 8,
                clipBehavior: Clip.antiAliasWithSaveLayer,
                child: Image(
                  height: 72,
                  width: 72,
                  fit: BoxFit.cover,
                  image: AssetImage(foodItem.image),
                ),
              ),
              MySpacing.width(12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: MyText.bodyMedium(
                            foodItem.name,
                            fontWeight: 700,
                          ),
                        ),
                        foodItem.favourite
                            ? Icon(
                                Icons.favorite,
                                color: customTheme.foodPrimary,
                                size: 20,
                              )
                            : Icon(
                                Icons.favorite_outline,
                                size: 20,
                              ),
                      ],
                    ),
                    MySpacing.height(6),
                    MyStarRating(
                      size: 16,
                      showInactive: true,
                      inactiveStarFilled: false,
                      activeColor: customTheme.colorWarning,
                      inactiveColor: customTheme.colorWarning,
                      spacing: 4,
                      rating: foodItem.ratings,
                    ),
                    MySpacing.height(6),
                    Row(
                      children: [
                        Icon(
                          Icons.local_fire_department,
                          size: 16,
                          color: customTheme.foodPrimary,
                        ),
                        MySpacing.width(4),
                        MyText.labelLarge(
                          '${foodItem.calories} Calories',
                          xMuted: true,
                          fontWeight: 600,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ));
      list.add(MySpacing.height(20));
    }

    return list;
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<HomeController>(
        init: controller,
        tag: 'food_home_controller',
        builder: (controller) {
          return _buildBody();
        });
  }

  Widget _buildBody() {

      return Scaffold(
        body: ListView(
          padding:
              MySpacing.fromLTRB(0, MySpacing.safeAreaTop(context) + 20, 0, 20),
          children: [
            MyText.displaySmall(
              'Hello, Foodie',
              color: customTheme.foodPrimary,
              textAlign: TextAlign.center,
              fontWeight: 700,
            ),
            MySpacing.height(8),
            MyText.titleMedium(
              'Want to eat delicious recipes?',
              fontWeight: 600,
              textAlign: TextAlign.center,
            ),
            MySpacing.height(20),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: _buildCategoryList(),
            ),
            MySpacing.height(20),
            MyContainer(
              margin: MySpacing.x(20),
              paddingAll: 20,
              borderRadiusAll: 8,
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        MyText.bodyMedium(
                          'Tasty food comes with perfect Ingredients',
                          fontWeight: 700,
                        ),
                        MySpacing.height(12),
                        MyText.labelLarge(
                          'Get perfect recipes now!',
                        ),
                      ],
                    ),
                  ),
                  MySpacing.width(20),
                  MyContainer(
                    paddingAll: 0,
                    borderRadiusAll: 8,
                    clipBehavior: Clip.antiAliasWithSaveLayer,
                    child: Image(
                      height: 80,
                      width: 100,
                      fit: BoxFit.cover,
                      image: AssetImage(Images.foodBanner),
                    ),
                  ),
                ],
              ),
            ),
            Column(
              children: _buildItemList(),
            ),
          ],
        ),
      );
    }

}
