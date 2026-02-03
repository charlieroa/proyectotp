import 'package:flutkit/full_apps/animations/smart_shopping/app_layout.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/controller/auth/reset_password_controller.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  late ThemeData theme;
  late ResetPasswordController controller;
  late OutlineInputBorder border;

  @override
  void initState() {
    theme = AppTheme.smartShopping;
    controller = Get.put(ResetPasswordController());
    border = OutlineInputBorder(borderRadius: BorderRadius.circular(100), borderSide: BorderSide.none);
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder(
      init: controller,
      tag: 'smart_shopping_reset_password_controller',
      builder: (controller) {
        return AppLayout(
          child: Form(
            key: controller.formKey,
            child: Padding(
              padding: MySpacing.all(8.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  heading(),
                  MySpacing.height(32),
                  passwordTextField(),
                  MySpacing.height(16),
                  passwordConfirmTextField(),
                  MySpacing.height(32),
                  resetPasswordButton(),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget heading() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MyText.titleLarge("Reset Password", fontWeight: 600, color: theme.colorScheme.primary),
        MySpacing.height(4),
        MyText.bodyMedium("Take back control in seconds.", fontWeight: 600, letterSpacing: 1),
      ],
    );
  }

  Widget passwordTextField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MyText.bodyMedium("Password", fontWeight: 600),
        MySpacing.height(8),
        TextFormField(
          style: MyTextStyle.labelMedium(fontWeight: 600, color: theme.colorScheme.onPrimaryContainer),

          obscureText: controller.enablePass,
          controller: controller.passwordTE,
          validator: controller.validatePassword,
          cursorColor: theme.colorScheme.primary,
          decoration: InputDecoration(
            hintText: "Enter your password",
            hintStyle: MyTextStyle.bodyMedium(),
            prefixIcon: Icon(LucideIcons.lock, color: theme.colorScheme.primary),
            contentPadding: MySpacing.all(14),
            suffixIcon: IconButton(
              onPressed: () => controller.togglePassword(),
              icon: Icon(controller.enablePass ? LucideIcons.eye : LucideIcons.eye_closed, color: theme.colorScheme.primary),
            ),
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
        ),
      ],
    );
  }

  Widget passwordConfirmTextField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MyText.bodyMedium("Confirm Password", fontWeight: 600),
        MySpacing.height(8),
        TextFormField(
          style: MyTextStyle.labelMedium(fontWeight: 600, color: theme.colorScheme.onPrimaryContainer),

          obscureText: controller.enableConfirmPass,
          controller: controller.confirmPasswordTE,
          validator: controller.validateConfirmPassword,
          cursorColor: theme.colorScheme.primary,
          decoration: InputDecoration(
            hintText: "Enter your confirm password",
            hintStyle: MyTextStyle.bodyMedium(),
            prefixIcon: Icon(LucideIcons.lock, color: theme.colorScheme.primary),
            contentPadding: MySpacing.all(14),
            suffixIcon: IconButton(
              onPressed: () => controller.toggleConfirmPassword(),
              icon: Icon(controller.enableConfirmPass ? LucideIcons.eye : LucideIcons.eye_closed, color: theme.colorScheme.primary),
            ),
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
        ),
      ],
    );
  }

  Widget resetPasswordButton() {
    return MyContainer(
      color: theme.colorScheme.primary,
      onTap: () => controller.resetPassword(),
      borderRadiusAll: 100,
      child: Center(child: MyText.bodyMedium("Reset Password", color: theme.colorScheme.onPrimary, fontWeight: 600)),
    );
  }
}
