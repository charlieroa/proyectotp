import 'package:flutkit/full_apps/animations/smart_shopping/model/product.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/app_layout.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutter/material.dart' hide SearchController;
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/controller/ui/search_controller.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  late SearchController controller;
  late ThemeData theme;
  late OutlineInputBorder border;

  final List<String> categories = ["All", "Men", "Women", "Kids", "Accessories", "Shoes"];

  @override
  void initState() {
    controller = Get.put(SearchController());
    theme = AppTheme.smartShopping;
    border = OutlineInputBorder(
      borderRadius: BorderRadius.circular(100),
      borderSide: BorderSide.none,
    );
    controller.selectedCategory = "All";
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<SearchController>(
      init: controller,
      builder: (controller) {
        return AppLayout(
          child: SafeArea(
            child: Padding(
              padding: MySpacing.all(12),
              child: Column(
                children: [
                  productSearch(),
                  MySpacing.height(12),
                  categoryFilterChips(),
                  MySpacing.height(12),
                  Expanded(
                    child: ScrollConfiguration(
                      behavior: ScrollConfiguration.of(context).copyWith(scrollbars: false),
                      child: _buildProductGrid(),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget productSearch() {
    return TextFormField(
      controller: controller.searchController,
      onChanged: (value) => controller.searchProducts(value),
      style: MyTextStyle.labelMedium(fontWeight: 600),
      cursorColor: theme.colorScheme.primary,
      decoration: InputDecoration(
        hintText: "Search Product",
        hintStyle: MyTextStyle.bodyMedium(),
        prefixIcon: Icon(LucideIcons.search, color: theme.colorScheme.primary),
        contentPadding: MySpacing.all(14),
        isDense: true,
        isCollapsed: true,
        filled: true,
        fillColor: theme.colorScheme.primaryContainer,
        border: border,
        enabledBorder: border,
        focusedBorder: border,
        errorBorder: border,
        focusedErrorBorder: border,
      ),
    );
  }

  Widget categoryFilterChips() {
    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (context, index) => MySpacing.width(8),
        itemBuilder: (context, index) {
          String cat = categories[index];
          bool isSelected = controller.selectedCategory == cat;

          return GestureDetector(
            onTap: () {
              controller.selectedCategory = cat;
              controller.searchProducts(controller.searchController.text);
              controller.update();
            },
            child: MyContainer(
              borderRadiusAll: 24,
              padding: MySpacing.xy(16, 8),
              color: isSelected ? theme.colorScheme.primary : theme.colorScheme.primaryContainer,
              child: MyText.labelMedium(
                cat,
                fontWeight: 600,
                color: isSelected ? theme.colorScheme.onPrimary : theme.colorScheme.primary,
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildProductGrid() {
    if (controller.filteredProducts == null) {
      return const Center(child: CircularProgressIndicator());
    }

    if (controller.filteredProducts!.isEmpty) {
      return const Center(child: Text("No products found"));
    }

    return GridView.builder(
      itemCount: controller.filteredProducts?.length,
      padding: MySpacing.top(4),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.67,
      ),
      itemBuilder: (context, index) {
        Product product = controller.filteredProducts![index];
        String query = controller.searchController.text;

        return MyContainer.bordered(
          onTap: () => controller.goToSingleProduct(),
          borderRadiusAll: 20,
          paddingAll: 0,
          color: theme.colorScheme.surface,
          clipBehavior: Clip.antiAliasWithSaveLayer,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              MyContainer.bordered(
                marginAll: 8,
                paddingAll: 0,
                borderRadiusAll: 16,
                clipBehavior: Clip.antiAliasWithSaveLayer,
                child: Image.asset(
                  product.image,
                  height: 120,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
              Expanded(
                child: Padding(
                  padding: MySpacing.nTop(6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(child: _highlightText(product.name, query, bold: true)),
                          Icon(
                            product.favorite ? Icons.favorite_rounded : Icons.favorite_outline_rounded,
                            size: 18,
                            color: theme.colorScheme.primary,
                          ),
                        ],
                      ),
                      MySpacing.height(4),
                      Expanded(child: _highlightText(product.description, query)),
                      MySpacing.height(4),
                      MyText.labelLarge('\$${product.price}', fontWeight: 700),
                      MySpacing.height(6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          MyContainer(
                            borderRadiusAll: 8,
                            padding: MySpacing.xy(8, 4),
                            color: theme.colorScheme.primary,
                            child: Row(
                              children: [
                                Icon(LucideIcons.star, color: theme.colorScheme.onPrimary, size: 10),
                                MySpacing.width(4),
                                MyText.labelSmall(
                                  product.rating.toString(),
                                  fontWeight: 600,
                                  color: theme.colorScheme.onPrimary,
                                ),
                              ],
                            ),
                          ),
                          MyContainer.bordered(
                            paddingAll: 4,
                            borderRadiusAll: 12,
                            child: Icon(LucideIcons.plus, size: 14, color: theme.colorScheme.onSurface),
                          ),
                        ],
                      ),
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

  Widget _highlightText(String text, String query, {bool bold = false}) {
    if (query.isEmpty) {
      return MyText.labelMedium(
        text,
        fontWeight: bold ? 600 : 500,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      );
    }

    final List<InlineSpan> spans = [];
    final lowerText = text.toLowerCase();
    final lowerQuery = query.toLowerCase();

    int start = 0;
    int index;

    while ((index = lowerText.indexOf(lowerQuery, start)) != -1) {
      if (index > start) {
        spans.add(
          TextSpan(
            text: text.substring(start, index),
            style: MyTextStyle.labelMedium(fontWeight: bold ? 600 : 500),
          ),
        );
      }

      String matchText = text.substring(index, index + query.length);
      spans.add(
        WidgetSpan(
          alignment: PlaceholderAlignment.middle,
          child: Container(
            padding: MySpacing.symmetric(horizontal: 1),
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(4),
            ),
            child: MyText.labelMedium(
              matchText,
              fontWeight: bold ? 600 : 500,
              color: theme.colorScheme.primary,
            ),
          ),
        ),
      );

      start = index + query.length;
    }

    if (start < text.length) {
      spans.add(
        TextSpan(
          text: text.substring(start),
          style: MyTextStyle.labelMedium(fontWeight: bold ? 600 : 500),
        ),
      );
    }

    return RichText(
      text: TextSpan(children: spans),
      maxLines: 2,
      overflow: TextOverflow.ellipsis,
    );
  }
}
