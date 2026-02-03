import 'package:flutkit/full_apps/animations/smart_shopping/app_layout.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/controller/ui/details_controller.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/views/ui/shopping_cart_screen.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';

class DetailsScreen extends StatefulWidget {
  const DetailsScreen({super.key});

  @override
  State<DetailsScreen> createState() => _DetailsScreenState();
}

class _DetailsScreenState extends State<DetailsScreen> {
  late DetailsController controller;
  late ThemeData theme;

  @override
  void initState() {
    super.initState();
    controller = Get.put(DetailsController());
    theme = AppTheme.smartShopping;
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<DetailsController>(
      init: controller,
      builder: (controller) {
        return SafeArea(
          child: AppLayout(
            child: Scaffold(
              backgroundColor: Colors.transparent,
              appBar: AppBar(
                backgroundColor: Colors.transparent,
                iconTheme: IconThemeData(size: 20),
                actions: [
                  MyContainer.rounded(
                    margin: MySpacing.x(12),
                    onTap: () => controller.onToggleLike(),
                    paddingAll: 8,
                    color: theme.colorScheme.error.withValues(alpha: 0.2),
                    child: Icon(controller.isLike ? Icons.favorite : LucideIcons.heart, size: 16, color: theme.colorScheme.error),
                  ),
                ],
              ),
              floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
              floatingActionButton: MyContainer(
                marginAll: 12,
                width: double.infinity,
                height: 44,
                onTap: () {
                  Get.to(ShoppingCartScreen());
                },
                color: theme.colorScheme.primary,
                borderRadiusAll: 100,
                paddingAll: 12,
                child: Center(child: MyText.labelMedium("Add to cart", color: theme.colorScheme.onPrimary, fontWeight: 600)),
              ),
              body: Padding(
                padding: MySpacing.only(top: 12, right: 12, bottom: 80, left: 12),
                child: ScrollConfiguration(
                  behavior: ScrollConfiguration.of(context).copyWith(scrollbars: false),
                  child: ListView(
                    children: [
                      Stack(
                        children: [
                          MyContainer.bordered(
                            paddingAll: 0,
                            borderRadiusAll: 12,
                            height: Get.height * 0.4,
                            clipBehavior: Clip.antiAliasWithSaveLayer,
                            child: PageView.builder(
                              controller: controller.pageController,
                              itemCount: controller.imagePaths.length,
                              itemBuilder: (context, index) {
                                return AnimatedBuilder(
                                  animation: controller.pageController,
                                  builder: (context, child) {
                                    double value = 1.0;
                                    if (controller.pageController.position.haveDimensions) {
                                      value = controller.pageController.page! - index;
                                      value = (1 - (value.abs() * 0.3)).clamp(0.0, 1.0);
                                    }
                                    return Center(
                                      child: SizedBox(height: Curves.easeOut.transform(value) * Get.height * 0.4, child: child),
                                    );
                                  },
                                  child: Image.asset(controller.imagePaths[index], fit: BoxFit.cover, width: double.infinity),
                                );
                              },
                            ),
                          ),
                          _buildCustomIndicator(),
                        ],
                      ),
                      MySpacing.height(16),
                      _buildThumbnailBar(),
                      MySpacing.height(16),
                      productDetails(),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildCustomIndicator() {
    return Positioned(
      bottom: 12,
      left: 0,
      right: 0,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(controller.imagePaths.length, (index) {
          bool isActive = index == controller.currentPage;
          return AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            margin: const EdgeInsets.symmetric(horizontal: 4),
            height: 8,
            width: isActive ? 24 : 8,
            decoration: BoxDecoration(
              color: isActive ? theme.colorScheme.primary : theme.colorScheme.primary.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(4),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildThumbnailBar() {
    return SizedBox(
      height: 80,
      child: controller.imagePaths.isNotEmpty
          ? ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 4),
              itemCount: controller.imagePaths.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                bool isSelected = controller.currentPage == index;

                return GestureDetector(
                  onTap: () {
                    controller.pageController.animateToPage(index, duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                  },
                  child: Container(
                    width: 70,
                    decoration: BoxDecoration(
                      border: Border.all(color: isSelected ? theme.colorScheme.primary : Colors.transparent, width: 2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: Image.asset(controller.imagePaths[index], fit: BoxFit.cover),
                    ),
                  ),
                );
              },
            )
          : Center(child: Text('No Images Found', style: theme.textTheme.bodyMedium)),
    );
  }

  Widget productDetails() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: MyText.titleMedium("Pink & Blue Top", fontWeight: 700)),
            MyText.titleMedium("\$45.33", fontWeight: 700),
          ],
        ),
        MySpacing.height(12),
        MyText.labelMedium(
          "Cool, Windy weather is on its way. Send him out the door in a jacket he wants to wear. Warm Zipper Hoodie Jacket. Try it out to feel comfy.",
        ),
        MySpacing.height(12),
        MyText.titleMedium("Select Size", fontWeight: 700),
        MySpacing.height(8),
        Row(
          children: [
            selectSize(0, 'XS'),
            MySpacing.width(12),
            selectSize(1, 'S'),
            MySpacing.width(12),
            selectSize(2, 'M'),
            MySpacing.width(12),
            selectSize(3, 'L'),
            MySpacing.width(12),
            selectSize(4, 'XL'),
          ],
        ),
        MySpacing.height(20),
        Divider(color: theme.dividerColor.withValues(alpha: 0.4)),
        MySpacing.height(12),
        MyText.titleMedium("Product Details", fontWeight: 700),
        MySpacing.height(12),
        detailRow("Material", "100% Cotton"),
        detailRow("Care", "Machine wash"),
        detailRow("Brand", "CoolWear Co."),
        MySpacing.height(20),
        Divider(color: theme.dividerColor.withValues(alpha: 0.4)),
        MySpacing.height(12),
        MyText.titleMedium("Delivery Info", fontWeight: 700),
        MySpacing.height(8),
        MyText.labelMedium("Free shipping on orders over \$50. Delivered within 3–5 business days."),
      ],
    );
  }

  Widget selectSize(int id, String label) {
    bool isSelect = controller.isSelectSize == id;
    return MyContainer.rounded(
      onTap: () => controller.onToggleSelectSize(id),
      paddingAll: 0,
      height: 32,
      width: 32,
      splashColor: Colors.transparent,
      borderRadiusAll: 100,
      color: isSelect ? theme.colorScheme.primary : null,
      child: Center(child: MyText.labelMedium(label, color: isSelect ? theme.colorScheme.onPrimary : null, fontWeight: 600)),
    );
  }

  Widget detailRow(String title, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [MyText.bodyMedium(title, fontWeight: 500), MyText.bodyMedium(value, fontWeight: 600)],
      ),
    );
  }
}
