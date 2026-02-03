import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_star_rating.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:flutkit/full_apps/animations/food/controllers/review_controller.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';

class ReviewScreen extends StatefulWidget {
  const ReviewScreen({super.key});

  @override
  State<ReviewScreen> createState() => _ReviewScreenState();
}

class _ReviewScreenState extends State<ReviewScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late ReviewController controller;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;

    controller = Get.put(ReviewController());
  }

  Widget _buildSingleImage(String image) {
    return MyContainer(
      paddingAll: 0,
      borderRadiusAll: 8,
      margin: MySpacing.right(12),
      height: 72,
      width: 72,
      clipBehavior: Clip.antiAliasWithSaveLayer,
      child: Image(
        fit: BoxFit.cover,
        image: AssetImage(image),
      ),
    );
  }

  Widget _buildReviewList() {
    List<Widget> list = [];

    for (int i = 0; i < 3; i++) {
      list.add(Container(
        margin: MySpacing.nTop(20),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            MyContainer.rounded(
              paddingAll: 0,
              height: 40,
              width: 40,
              clipBehavior: Clip.antiAliasWithSaveLayer,
              child: Image(
                fit: BoxFit.cover,
                image: AssetImage(controller.reviews[i].image),
              ),
            ),
            MySpacing.width(12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MyText.labelLarge(
                    controller.reviews[i].name,
                    fontWeight: 600,
                  ),
                  MySpacing.height(4),
                  MyStarRating(
                    size: 16,
                    showInactive: true,
                    inactiveStarFilled: false,
                    activeColor: customTheme.colorWarning,
                    inactiveColor: customTheme.colorWarning,
                    spacing: 4,
                    rating: 4.5,
                  ),
                  MySpacing.height(4),
                  MyText.bodySmall(
                    controller.reviews[i].review,
                    textAlign: TextAlign.justify,
                  ),
                ],
              ),
            ),
          ],
        ),
      ));
    }

    return Column(
      children: list,
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<ReviewController>(
        init: controller,
        tag: 'food_review_controller',
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
            Padding(
              padding: MySpacing.x(20),
              child: Row(
                children: [
                  MyContainer(
                    onTap: () {
                      controller.goBack();
                    },
                    color: customTheme.foodPrimary.withAlpha(40),
                    paddingAll: 8,
                    borderRadiusAll: 8,
                    child: Icon(
                      LucideIcons.chevron_left,
                      size: 20,
                    ),
                  ),
                ],
              ),
            ),
            MySpacing.height(20),
            Padding(
              padding: MySpacing.x(20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  MyText.displaySmall(
                    'Reviews',
                    fontWeight: 700,
                  ),
                  MyContainer(
                    borderRadiusAll: 8,
                    padding: MySpacing.xy(8, 6),
                    color: customTheme.foodPrimary,
                    child: Row(
                      children: [
                        Icon(
                          Icons.star,
                          size: 16,
                          color: customTheme.foodOnPrimary,
                        ),
                        MySpacing.width(4),
                        MyText.labelLarge(
                          '4.5',
                          color: customTheme.foodOnPrimary,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            MySpacing.height(20),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  MySpacing.width(20),
                  _buildSingleImage('assets/images/apps/food/images/food2.jpg'),
                  _buildSingleImage('assets/images/apps/food/images/food1.jpg'),
                  _buildSingleImage('assets/images/apps/food/images/food8.jpg'),
                  _buildSingleImage('assets/images/apps/food/images/food9.jpg'),
                  _buildSingleImage(
                      'assets/images/apps/food/images/food10.jpg'),
                  _buildSingleImage('assets/images/apps/food/images/food3.jpg'),
                ],
              ),
            ),
            MySpacing.height(20),
            _buildReviewList(),
            Center(
              child: MyContainer(
                onTap: () {},
                color: customTheme.foodPrimary.withAlpha(40),
                padding: MySpacing.xy(16, 8),
                borderRadiusAll: 8,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      LucideIcons.plus,
                      size: 20,
                    ),
                    MySpacing.width(4),
                    MyText.labelLarge(
                      'Add Review',
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
