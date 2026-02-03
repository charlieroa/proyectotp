import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/app_layout.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/controller/ui/home_screen_controller.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/model/product.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late HomeScreenController controller;
  late ThemeData theme;
  late OutlineInputBorder border;
  final TextEditingController searchController = TextEditingController();

  @override
  void initState() {
    controller = HomeScreenController();
    theme = AppTheme.smartShopping;
    border = OutlineInputBorder(borderRadius: BorderRadius.circular(100), borderSide: BorderSide.none);
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder(
      init: controller,
      builder: (controller) {
        return AppLayout(
          child: SafeArea(
            child: Padding(
              padding: MySpacing.all(12),
              child: Column(
                children: [
                  header(),
                  MySpacing.height(12),
                  productSearch(),
                  Expanded(child: _buildProductGrid()),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget header() {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [MyText.titleMedium("Hi, Olivia", fontWeight: 700), MyText.labelMedium("Welcome Back")],
          ),
        ),
        MyContainer.rounded(
          color: theme.colorScheme.primaryContainer,
          paddingAll: 8,
          child: Icon(LucideIcons.shopping_bag, size: 20, color: theme.colorScheme.primary),
        ),
        MySpacing.width(12),
        MyContainer.rounded(
          color: theme.colorScheme.primaryContainer,
          paddingAll: 8,
          child: Icon(LucideIcons.bell, size: 20, color: theme.colorScheme.primary),
        ),
      ],
    );
  }

  Widget productSearch() {
    return TextFormField(
      controller: searchController,
      onChanged: (value) => controller.searchProducts(value),
      style: MyTextStyle.labelMedium(fontWeight: 600, color: theme.colorScheme.onPrimaryContainer),
      cursorColor: theme.colorScheme.primary,
      decoration: InputDecoration(
        hintText: "Search Product",
        hintStyle: MyTextStyle.bodyMedium(fontWeight: 600, color: theme.colorScheme.onPrimaryContainer),
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

  Widget _buildProductGrid() {
    if (controller.filteredProducts == null) {
      return const Center(child: CircularProgressIndicator());
    }

    if (controller.filteredProducts!.isEmpty) {
      return const Center(child: Text("No products found"));
    }

    return GridView.builder(
      itemCount: controller.filteredProducts?.length,
      padding: MySpacing.top(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.67,
      ),
      itemBuilder: (context, index) {
        Product product = controller.filteredProducts![index];
        String query = searchController.text;

        return MyContainer.bordered(
          onTap: () => controller.goToSingleProduct(),
          borderRadiusAll: 20,
          paddingAll: 0,
          clipBehavior: Clip.antiAliasWithSaveLayer,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              MyContainer.bordered(
                marginAll: 8,
                paddingAll: 0,
                borderRadiusAll: 16,
                clipBehavior: Clip.antiAliasWithSaveLayer,
                child: Image.asset(product.image, height: 120, width: double.infinity, fit: BoxFit.cover),
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
                                MyText.labelSmall(product.rating.toString(), fontWeight: 600, color: theme.colorScheme.onPrimary),
                              ],
                            ),
                          ),
                          MyContainer.bordered(paddingAll: 4, borderRadiusAll: 12, child: Icon(LucideIcons.plus, size: 14)),
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
      return MyText.labelMedium(text, fontWeight: bold ? 600 : 500, maxLines: 2, overflow: TextOverflow.ellipsis);
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
            decoration: BoxDecoration(color: theme.colorScheme.primary.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(4)),
            child: MyText.labelMedium(matchText, fontWeight: bold ? 600 : 500, color: theme.colorScheme.primary),
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
