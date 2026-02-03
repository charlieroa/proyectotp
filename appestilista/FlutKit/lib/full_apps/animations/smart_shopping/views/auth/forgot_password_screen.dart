import 'package:flutkit/full_apps/animations/smart_shopping/app_layout.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/controller/auth/forgot_password_controller.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  late ThemeData theme;
  late ForgotPasswordController controller;
  late OutlineInputBorder border;

  @override
  void initState() {
    theme = AppTheme.smartShopping;
    controller = Get.put(ForgotPasswordController());
    border = OutlineInputBorder(borderRadius: BorderRadius.circular(100), borderSide: BorderSide.none);
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder(
      init: controller,
      tag: 'smart_shopping_forgot_password_controller',
      builder: (controller) {
        return AppLayout(
          child: Form(
            key: controller.formKey,
            child: Padding(
              padding: MySpacing.all(16),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [heading(), MySpacing.height(40), emailTextField(), MySpacing.height(32), resetPasswordButton()],
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
        MyText.titleLarge("Forgot Password", fontWeight: 600, color: theme.colorScheme.primary),
        MySpacing.height(4),
        MyText.bodyMedium("Smart minds. Simple mistakes. Quick recovery.", fontWeight: 600, letterSpacing: 1),
      ],
    );
  }

  Widget emailTextField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MyText.bodyMedium("Email Address", fontWeight: 600),
        MySpacing.height(8),
        TextFormField(
          style: MyTextStyle.labelMedium(fontWeight: 600,color: theme.colorScheme.onPrimaryContainer),

          controller: controller.emailTE,
          validator: controller.validateEmail,
          cursorColor: theme.colorScheme.primary,
          decoration: InputDecoration(
            hintText: "Enter your email address",
            hintStyle: MyTextStyle.bodyMedium(),
            prefixIcon: Icon(LucideIcons.mail, color: theme.colorScheme.primary),
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
        ),
      ],
    );
  }

  Widget resetPasswordButton() {
    return MyContainer(
      color: theme.colorScheme.primary,
      onTap: () => controller.goToResetPasswordScreen(),
      borderRadiusAll: 100,
      child: Center(child: MyText.bodyMedium("Continue", color: theme.colorScheme.onPrimary, fontWeight: 600)),
    );
  }
}
