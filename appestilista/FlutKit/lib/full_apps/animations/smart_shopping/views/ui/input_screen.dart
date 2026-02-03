import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/app_layout.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/controller/ui/input_controller.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:get/get.dart';
import 'package:lottie/lottie.dart';

class InputScreen extends StatefulWidget {
  const InputScreen({super.key});

  @override
  State<InputScreen> createState() => _InputScreenState();
}

class _InputScreenState extends State<InputScreen> with TickerProviderStateMixin {
  late InputController controller;
  late TextEditingController _textController;
  late FocusNode _focusNode;
  late ThemeData appTheme;
  late OutlineInputBorder outlineInputBorder;

  @override
  void initState() {
    super.initState();
    controller = Get.put(InputController());
    _textController = controller.textEditingController;
    _focusNode = FocusNode();
    appTheme = AppTheme.smartShopping;
    outlineInputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: theme.dividerColor, width: 1),
    );
  }

  @override
  void dispose() {
    _textController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void onSuggestionTapped(String suggestion) {
    controller.setInputWithAnimation(suggestion);
    _focusNode.requestFocus();
  }

  void clearInput() {
    controller.clearInputAnimated();
    _focusNode.unfocus();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder(
      init: controller,
      builder: (_) {
        return AppLayout(
          child: SafeArea(
            child: Padding(
              padding: MySpacing.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MyText.titleLarge("🛍️ AI Shopping Assistant", fontWeight: 700),

                  Expanded(
                    child: Center(
                      child: Lottie.asset(
                        'assets/full_apps/animations/smart_shopping/shopping_cart_loader.json',
                        fit: BoxFit.contain,
                        repeat: true,
                      ),
                    ),
                  ),

                  MySpacing.height(20),

                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        SizedBox(
                          height: 100,
                          child: SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              spacing: 12,
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.start,
                              children: List.generate((controller.suggestions.length / 2).ceil(), (index) {
                                final int start = index * 2;
                                final int end = (start + 2 <= controller.suggestions.length) ? start + 2 : controller.suggestions.length;
                                final items = controller.suggestions.sublist(start, end);

                                return Column(
                                  spacing: 12,
                                  mainAxisSize: MainAxisSize.min,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: items.map((s) {
                                    return MyContainer.bordered(
                                      borderRadiusAll: 12,
                                      paddingAll: 10,
                                      color: appTheme.colorScheme.surfaceContainerLowest,
                                      onTap: () => onSuggestionTapped(s),
                                      child: MyText.bodyMedium(s, fontWeight: 600,color: appTheme.colorScheme.onSurface),
                                    );
                                  }).toList(),
                                );
                              }),
                            ),
                          ),
                        ),

                        MySpacing.height(12),
                        Stack(
                          children: [
                            TextFormField(
                              key: ValueKey(controller.inputKey),
                              controller: controller.textEditingController,
                              focusNode: _focusNode,
                              onChanged: controller.onInputChange,
                              maxLines: 8,
                              decoration: InputDecoration(
                                hintText: "Ask something about shopping…",
                                hintStyle: MyTextStyle.labelMedium(),
                                border: outlineInputBorder,
                                focusedBorder: outlineInputBorder,
                                disabledBorder: outlineInputBorder,
                                enabledBorder: outlineInputBorder,
                                errorBorder: outlineInputBorder,
                                focusedErrorBorder: outlineInputBorder,
                                isDense: true,
                                contentPadding: const EdgeInsets.all(16),
                              ),
                              style: MyTextStyle.labelMedium(),
                            ),
                            if (controller.textEditingController.text.isNotEmpty)
                              Positioned(
                                top: 12,
                                right: 12,
                                child: AnimatedOpacity(
                                  opacity: 1.0,
                                  duration: const Duration(milliseconds: 250),
                                  child: IconButton(
                                    icon: const Icon(Icons.cancel, color: Colors.grey, size: 20),
                                    onPressed: controller.clearInputAnimated,
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                  ),
                                ),
                              ),
                          ],
                        ),
                        MySpacing.height(12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            MyText.labelMedium("Tokens used: ${controller.tokenCount}/1000", muted: true),
                            MyContainer(
                              onTap: controller.sendInput,
                              color: appTheme.colorScheme.primary,
                              paddingAll: 10,
                              borderRadiusAll: 100,
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(LucideIcons.send, color: appTheme.colorScheme.onPrimary, size: 16),
                                  MySpacing.width(8),
                                  MyText.labelMedium("Send", color: appTheme.colorScheme.onPrimary),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
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
}
