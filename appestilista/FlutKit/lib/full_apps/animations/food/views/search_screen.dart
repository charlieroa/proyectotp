import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutter/material.dart' hide SearchController;
import 'package:flutkit/full_apps/animations/food/controllers/search_controller.dart';
import 'package:flutkit/full_apps/animations/food/models/food_item.dart';
import 'package:flutkit/full_apps/animations/food/models/search_category.dart';
import 'package:get/get.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late SearchController controller;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;

    controller = Get.put(SearchController());
  }

  List<Widget> _buildCategoryList() {
    List<Widget> list = [];
    for (SearchCategory searchCategory in controller.categories) {
      list.add(_buildSingleSearchCategory(searchCategory));
    }

    return list;
  }

  Widget _buildSingleSearchCategory(SearchCategory searchCategory) {
    return MyContainer(
      paddingAll: 16,
      borderRadiusAll: 8,
      child: Column(
        children: [
          MyContainer(
            paddingAll: 0,
            height: 32,
            width: 32,
            child: Image(
              image: AssetImage(searchCategory.icon),
            ),
          ),
          MySpacing.height(8),
          MyText.bodySmall(
            searchCategory.name,
            fontWeight: 600,
            fontSize: 10,
          ),
        ],
      ),
    );
  }

  Widget _buildSingleFoodItem(FoodItem foodItem) {
    return MyContainer(
      onTap: () => controller.goToSingleScreen(foodItem),
      child: Stack(
        children: [
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              MyContainer.rounded(
                paddingAll: 0,
                borderRadiusAll: 8,
                clipBehavior: Clip.antiAliasWithSaveLayer,
                child: Image(
                  height: 80,
                  width: 80,
                  fit: BoxFit.cover,
                  image: AssetImage(foodItem.image),
                ),
              ),
              MySpacing.height(8),
              MyText.bodySmall(foodItem.name,
                  fontWeight: 700, textAlign: TextAlign.center),
              MySpacing.height(4),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.star,
                    color: customTheme.colorWarning,
                    size: 16,
                  ),
                  MySpacing.width(4),
                  MyText.bodySmall(
                    '${foodItem.ratings}(${foodItem.reviews} reviews )',
                    fontSize: 10,
                    fontWeight: 600,
                  ),
                ],
              ),
              MySpacing.height(4),
              MyText.bodyMedium(
                '\$${foodItem.price}',
                fontWeight: 700,
              ),
            ],
          ),
          Positioned(
            right: 0,
            child: foodItem.favourite
                ? Icon(
                    Icons.favorite,
                    color: customTheme.foodPrimary,
                    size: 20,
                  )
                : Icon(
                    Icons.favorite_outline,
                    size: 20,
                  ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<SearchController>(
        init: controller,
        tag: 'food_search_controller',
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
            MyText.titleMedium(
              'Searching something tasty?',
              fontWeight: 600,
              textAlign: TextAlign.center,
            ),
            MySpacing.height(2),
            MyText.bodyLarge(
              'Have a look here!',
              textAlign: TextAlign.center,
            ),
            MySpacing.height(20),
            Padding(
              padding: MySpacing.x(20),
              child: TextField(
                scrollPadding: EdgeInsets.zero,
                decoration: InputDecoration(
                  labelText: 'Search your food ...',
                  labelStyle: MyTextStyle.bodySmall(xMuted: true),
                  filled: true,
                  isDense: true,
                  isCollapsed: true,
                  contentPadding: MySpacing.fromLTRB(16, 12, 16, 16),
                  floatingLabelBehavior: FloatingLabelBehavior.never,
                ),
              ),
            ),
            MySpacing.height(20),
            Container(
              margin: MySpacing.x(20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: _buildCategoryList(),
              ),
            ),
            MySpacing.height(20),
            GridView.builder(
                padding: MySpacing.x(20),
                shrinkWrap: true,
                itemCount: controller.foodItems.length,
                physics: ClampingScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: controller.findAspectRatio(),
                  mainAxisSpacing: 20,
                  crossAxisSpacing: 20,
                ),
                itemBuilder: (BuildContext context, int index) {
                  return _buildSingleFoodItem(controller.foodItems[index]);
                }),
          ],
        ),
      );
    }
  }
