import 'package:flutkit/full_apps/animations/smart_shopping/app_layout.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/controller/auth/login_controller.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  late ThemeData theme;
  late LoginController controller;
  late OutlineInputBorder border;

  @override
  void initState() {
    theme = AppTheme.smartShopping;
    controller = Get.put(LoginController());
    border = OutlineInputBorder(borderRadius: BorderRadius.circular(100), borderSide: BorderSide.none);
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder(
      init: controller,
      tag: 'smart_shopping_login_controller',
      builder: (controller) {
        return AppLayout(
          child: Form(
            key: controller.formKey,
            child: Padding(
              padding: MySpacing.all(16),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  heading(),
                  MySpacing.height(32),
                  emailTextField(),
                  MySpacing.height(16),
                  passwordTextField(),
                  MySpacing.height(16),
                  Align(alignment: Alignment.centerRight, child: forgotPasswordButton()),
                  MySpacing.height(32),
                  signInButton(),
                  MySpacing.height(16),
                  createAccountButton(),
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
        MyText.titleLarge("Sign In", fontWeight: 600, color: theme.colorScheme.primary),
        MySpacing.height(4),
        MyText.bodyMedium("Smart tools for smarter you.", fontWeight: 600, letterSpacing: 1),
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

  Widget passwordTextField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MyText.bodyMedium("Password", fontWeight: 600),
        MySpacing.height(8),
        TextFormField(
          style: MyTextStyle.labelMedium(fontWeight: 600,color: theme.colorScheme.onPrimaryContainer),
          obscureText: controller.isVisiblePassword,
          controller: controller.passwordTE,
          validator: controller.validatePassword,
          cursorColor: theme.colorScheme.primary,
          decoration: InputDecoration(
            hintText: "Enter your password",
            hintStyle: MyTextStyle.bodyMedium(),
            prefixIcon: Icon(LucideIcons.lock, color: theme.colorScheme.primary),
            contentPadding: MySpacing.all(14),
            suffixIcon: IconButton(
              onPressed: () => controller.onToggleVisiblePassword(),
              icon: Icon(controller.isVisiblePassword ? LucideIcons.eye : LucideIcons.eye_closed, color: theme.colorScheme.primary),
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

  Widget signInButton() {
    return MyContainer(
      color: theme.colorScheme.primary,
      onTap: () => controller.login(),
      borderRadiusAll: 100,
      child: Center(child: MyText.bodyMedium("Sign In Smart Shopping", color: theme.colorScheme.onPrimary, fontWeight: 600)),
    );
  }

  Widget createAccountButton() {
    return MyContainer.bordered(
      borderColor: theme.colorScheme.primary,
      onTap: () => controller.goToCreateNewAccount(),
      borderRadiusAll: 100,
      paddingAll: 12,
      child: Center(child: MyText.bodyMedium("Create New Account", color: theme.colorScheme.primary, fontWeight: 600)),
    );
  }

  Widget forgotPasswordButton() {
    return InkWell(onTap: () => controller.goToForgotPassword(), child: MyText.labelMedium("Forgot Password?"));
  }
}
