import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:flutkit/full_apps/animations/food/controllers/reset_password_controller.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late ResetPasswordController controller;
  late OutlineInputBorder outlineInputBorder;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;

    controller = Get.put(ResetPasswordController());
    outlineInputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.all(Radius.circular(4)),
      borderSide: BorderSide(
        color: Colors.transparent,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<ResetPasswordController>(
        init: controller,
        tag: 'food_reset_password_controller',
        builder: (controller) {
          return _buildBody();
        });
  }

  Widget _buildBody() {
    return Scaffold(
      body: Padding(
        padding:
            MySpacing.fromLTRB(20, MySpacing.safeAreaTop(context) + 20, 20, 20),
        child: Form(
          key: controller.formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Image(
                  height: 64,
                  width: 64,
                  image: AssetImage(Images.foodAuthentication),
                ),
              ),
              MySpacing.height(12),
              Align(
                alignment: Alignment.center,
                child: MyText.titleMedium(
                  'Food',
                  fontWeight: 600,
                  color: customTheme.foodPrimary,
                ),
              ),
              MySpacing.height(20),
              MyText.titleLarge(
                'Reset Password',
                fontWeight: 700,
                color: customTheme.foodPrimary,
              ),
              MySpacing.height(12),
              MyText.bodySmall(
                'Enter new password to change your password.',
                xMuted: true,
              ),
              MySpacing.height(20),
              TextFormField(
                style: MyTextStyle.bodyMedium(xMuted: true),
                decoration: InputDecoration(
                    floatingLabelBehavior: FloatingLabelBehavior.never,
                    filled: true,
                    isDense: true,
                    fillColor: customTheme.card,
                    prefixIcon: Icon(
                      LucideIcons.lock,
                      color: theme.colorScheme.onSurface.withAlpha(160),
                    ),
                    hintText: "Password",
                    enabledBorder: outlineInputBorder,
                    focusedBorder: outlineInputBorder,
                    border: outlineInputBorder,
                    contentPadding: MySpacing.all(16),
                    hintStyle: MyTextStyle.bodyMedium(),
                    isCollapsed: true),
                maxLines: 1,
                controller: controller.passwordTE,
                validator: controller.validatePassword,
                cursorColor: theme.colorScheme.onSurface,
              ),
              MySpacing.height(20),
              TextFormField(
                style: MyTextStyle.bodyMedium(xMuted: true),
                decoration: InputDecoration(
                    floatingLabelBehavior: FloatingLabelBehavior.never,
                    filled: true,
                    isDense: true,
                    fillColor: customTheme.card,
                    prefixIcon: Icon(
                      LucideIcons.lock,
                      color: theme.colorScheme.onSurface.withAlpha(160),
                    ),
                    hintText: "Confirm Password",
                    enabledBorder: outlineInputBorder,
                    focusedBorder: outlineInputBorder,
                    border: outlineInputBorder,
                    contentPadding: MySpacing.all(16),
                    hintStyle: MyTextStyle.bodyMedium(),
                    isCollapsed: true),
                maxLines: 1,
                controller: controller.confirmPasswordTE,
                validator: controller.validateConfirmPassword,
                cursorColor: theme.colorScheme.onSurface,
              ),
              MySpacing.height(20),
              MyButton.block(
                onPressed: () {
                  controller.resetPassword();
                },
                backgroundColor: customTheme.foodPrimary,
                splashColor: customTheme.foodOnPrimary.withAlpha(40),
                elevation: 0,
                borderRadiusAll: 8,
                child: MyText.bodyMedium(
                  'Submit',
                  color: customTheme.foodOnPrimary,
                  fontWeight: 600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
