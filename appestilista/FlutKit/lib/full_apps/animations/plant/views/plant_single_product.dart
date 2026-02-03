import 'package:flutkit/full_apps/animations/plant/controller/plant_single_product_controller.dart';
import 'package:flutkit/full_apps/animations/plant/model/plant_data.dart';
import 'package:flutkit/full_apps/animations/plant/views/plant_shopping_screen.dart';

import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class PlantSingleProduct extends StatefulWidget {
  final String heroKey;
  final Plant plant;

  const PlantSingleProduct(this.plant, this.heroKey, {super.key});

  @override
  State<PlantSingleProduct> createState() => _PlantSingleProductState();
}

class _PlantSingleProductState extends State<PlantSingleProduct> {
  late PlantSingleProductController controller;

  @override
  void initState() {
    controller = PlantSingleProductController();
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<PlantSingleProductController>(
      init: controller,
      tag: 'plant_single_product_controller',
      builder: (controller) {
        return Scaffold(
          floatingActionButtonLocation:
              FloatingActionButtonLocation.centerFloat,
          floatingActionButton: Padding(
            padding: MySpacing.x(16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                MyButton.block(
                  backgroundColor: AppTheme.plantTheme.colorScheme.primary,
                  elevation: 0,
                  borderRadiusAll: 8,
                  padding: MySpacing.xy(20, 20),
                  onPressed: () {
                    Get.to(PlantShoppingScreen(rootContext: context));
                  },
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(
                            LucideIcons.shopping_bag,
                            size: 20,
                            color: AppTheme.plantTheme.colorScheme.surface,
                          ),
                          MySpacing.width(12),
                          MyText.bodyMedium(
                            'Add To Cart',
                            fontWeight: 600,
                            fontSize: 16,
                            color: AppTheme.plantTheme.colorScheme.surface,
                          )
                        ],
                      ),
                      MyText.titleLarge(
                        "\$ ${widget.plant.price * controller.itemCount}.00",
                        color: AppTheme.plantTheme.colorScheme.surface,
                        fontSize: 16,
                      ),
                    ],
                  ),
                ),

              ],
            ),
          ),
          appBar: AppBar(
            elevation: 0,
            backgroundColor: widget.plant.color,
            title: MyText.titleMedium(
              widget.plant.title,
              fontWeight: 600,
            ),
            leading: IconButton(
              onPressed: () => Navigator.of(context).pop(),
              icon: Icon(LucideIcons.move_left),
            ),
            actions: [
              Hero(
                tag: UniqueKey,
                child: IconButton(
                  onPressed: () {
                    setState(() {
                      controller.isLiked = !controller.isLiked;
                    });
                  },
                  icon: Icon(
                      !controller.isLiked
                          ? Icons.favorite_outline
                          : Icons.favorite,
                      size: 24),
                ),
              ),
            ],
            centerTitle: true,
          ),
          body: ListView(
            children: [
              Center(
                child: MyContainer(
                  height: 300,
                  width: double.infinity,
                  color: widget.plant.color,
                  paddingAll: 0,
                  bordered: false,
                  clipBehavior: Clip.antiAliasWithSaveLayer,
                  child: Hero(
                    tag: widget.plant.image,
                    child: Image.asset(
                      widget.plant.image,
                      height: 300,
                      width: double.infinity,
                    ),
                  ),
                ),
              ),
              Padding(
                padding: MySpacing.xy(20, 20),
                child: Hero(
                  tag: UniqueKey(),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.start,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      MyText.titleLarge(
                        widget.plant.title,
                        fontSize: 24,
                        fontWeight: 600,
                      ),
                      MySpacing.height(8),
                      buildReviewStar(),
                      MySpacing.height(12),
                      MyText.titleMedium(
                        widget.plant.description,
                        fontSize: 16,
                        fontWeight: 600,
                        muted: true,
                      ),
                      Divider(
                        height: 32,
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          buildProductDetail('Size', 'Medium'),
                          VerticalDivider(),
                          buildProductDetail('Plant', 'Orchid'),
                          VerticalDivider(),
                          buildProductDetail('Height', '10.5"'),
                          VerticalDivider(),
                          buildProductDetail('Humidity', '80%'),
                        ],
                      ),
                      MySpacing.height(20),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          MyText.titleLarge(
                            "\$ ${widget.plant.price * controller.itemCount}.00",
                            fontWeight: 600,
                          ),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              MyContainer(
                                borderRadiusAll: 4,
                                onTap: () {
                                  setState(() {
                                    if (controller.itemCount > 1) {
                                      controller.priceDecrement();
                                    }
                                  });
                                },
                                padding: MySpacing.all(8),
                                color: AppTheme.plantTheme.colorScheme.primary
                                    .withAlpha(70),
                                child: Icon(
                                  LucideIcons.minus,
                                  size: 14,
                                  color:
                                      AppTheme.plantTheme.colorScheme.primary,
                                ),
                              ),
                              MySpacing.width(12),
                              MyText.bodyLarge(controller.itemCount.toString(),
                                  fontWeight: 600),
                              MySpacing.width(12),
                              MyContainer(
                                borderRadiusAll: 4,
                                onTap: () {
                                  setState(() {
                                    controller.priceIncrement();
                                  });
                                },
                                padding: MySpacing.all(8),
                                color: AppTheme.plantTheme.colorScheme.primary
                                    .withAlpha(70),
                                child: Icon(
                                  LucideIcons.plus,
                                  size: 14,
                                  color:
                                      AppTheme.plantTheme.colorScheme.primary,
                                ),
                              ),
                            ],
                          ),
                        ],
                      )
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget buildProductDetail(String title, String subtitle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MyText.bodyMedium(
          title,
          fontWeight: 600,
          muted: true,
        ),
        MySpacing.height(8),
        MyText.titleMedium(
          subtitle,
          fontWeight: 600,
        )
      ],
    );
  }

  Widget buildReviewStar() {
    return Row(
      children: [
        for (var i = 0; i < 5; i++)
          GestureDetector(
            onTap: () {
              setState(() {
                controller.initialRating = i;
              });
            },
            child: i <= controller.initialRating
                ? Icon(
                    Icons.star,
                    color: Colors.amber,
                    size: 16,
                  )
                : Icon(
                    Icons.star_outline,
                    color: Colors.amber,
                    size: 16,
                  ),
          ),
      ],
    );
  }
}
