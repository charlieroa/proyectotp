import 'package:flutkit/full_apps/animations/smart_shopping/app_layout.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/controller/auth/create_new_account_controller.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';

class CreateNewAccountScreen extends StatefulWidget {
  const CreateNewAccountScreen({super.key});

  @override
  State<CreateNewAccountScreen> createState() => _CreateNewAccountScreenState();
}

class _CreateNewAccountScreenState extends State<CreateNewAccountScreen> {
  late ThemeData theme;
  late CreateNewAccountController controller;
  late OutlineInputBorder border;

  @override
  void initState() {
    theme = AppTheme.smartShopping;
    controller = Get.put(CreateNewAccountController());
    border = OutlineInputBorder(borderRadius: BorderRadius.circular(100), borderSide: BorderSide.none);
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder(
      init: controller,
      tag: 'smart_shopping_create_new_account_controller',
      builder: (controller) {
        return AppLayout(
          child: Padding(
            padding: MySpacing.all(16),
            child: Form(
              key: controller.formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  heading(),
                  MySpacing.height(32),
                  nameTextField(),
                  MySpacing.height(16),
                  emailTextField(),
                  MySpacing.height(16),
                  passwordTextField(),
                  MySpacing.height(32),
                  registerButton(),
                  MySpacing.height(16),
                  loginBtn(),
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
        MyText.titleLarge("Sign Up", fontWeight: 600, color: theme.colorScheme.primary),
        MySpacing.height(4),
        MyText.bodyMedium("Join the smarter way forward.", fontWeight: 600, letterSpacing: 1),
      ],
    );
  }

  Widget nameTextField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MyText.bodyMedium("Name", fontWeight: 600),
        MySpacing.height(8),
        TextFormField(
          style: MyTextStyle.labelMedium(fontWeight: 600,color: theme.colorScheme.onPrimaryContainer),
          controller: controller.nameTE,
          validator: controller.validateName,
          cursorColor: theme.colorScheme.primary,
          decoration: InputDecoration(
            hintText: "Enter your full name",
            hintStyle: MyTextStyle.bodyMedium(),
            prefixIcon: Icon(LucideIcons.user, color: theme.colorScheme.primary),
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

  Widget registerButton() {
    return MyContainer.bordered(
      borderColor: theme.colorScheme.primary,
      onTap: ()  {
        controller.register();
      },
      borderRadiusAll: 100,
      paddingAll: 12,
      child: Center(child: MyText.bodyMedium("Register Account", color: theme.colorScheme.primary, fontWeight: 600)),
    );
  }

  Widget loginBtn() {
    return Center(
      child: InkWell(
        onTap: () => Get.back(),
        child: MyText.labelMedium("Already have an account?"),
      ),
    );
  }
}
