import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/theme/constant.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import 'package:flutkit/full_apps/animations/hr/controller/auth/reset_password_controller.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  late ThemeData theme;
  late ResetPasswordController controller;
  late OutlineInputBorder outlineInputBorder;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.employeeCommunication;
    controller = ResetPasswordController();
    outlineInputBorder = OutlineInputBorder(
      borderRadius:
          BorderRadius.all(Radius.circular(Constant.containerRadius.small)),
      borderSide: BorderSide(
        color: Colors.transparent,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder(
      tag: 'reset_password_screen',
      init: controller,
      builder: (controller) {
        return Scaffold(
          body: Padding(
            padding: MySpacing.fromLTRB(
                20, MySpacing.safeAreaTop(context) + 40, 20, 0),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MyText.titleLarge(
                    "Enter new Password",
                    fontWeight: 700,
                  ),
                  MySpacing.height(40),
                  resetPasswordForm(),
                  MySpacing.height(20),
                  resetPasswordBtn(),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget resetPasswordForm() {
    return Form(
      key: controller.formKey,
      child: Column(
        children: [passwordField(), MySpacing.height(20), resetPasswordField()],
      ),
    );
  }

  Widget passwordField() {
    return TextFormField(
      style: MyTextStyle.bodyMedium(),
      keyboardType: TextInputType.emailAddress,
      decoration: InputDecoration(
          floatingLabelBehavior: FloatingLabelBehavior.never,
          isDense: true,
          filled: true,
          fillColor: theme.cardTheme.color,
          hintText: "Password",
          enabledBorder: outlineInputBorder,
          focusedBorder: outlineInputBorder,
          border: outlineInputBorder,
          contentPadding: MySpacing.all(16),
          hintStyle: MyTextStyle.bodySmall(xMuted: true),
          isCollapsed: true),
      maxLines: 1,
      controller: controller.passwordTE,
      validator: controller.validatePassword,
      cursorColor: theme.colorScheme.primary,
    );
  }

  Widget resetPasswordField() {
    return TextFormField(
      style: MyTextStyle.bodyMedium(),
      keyboardType: TextInputType.emailAddress,
      decoration: InputDecoration(
          floatingLabelBehavior: FloatingLabelBehavior.never,
          isDense: true,
          filled: true,
          fillColor: theme.cardTheme.color,
          hintText: "Confirm Password",
          enabledBorder: outlineInputBorder,
          focusedBorder: outlineInputBorder,
          border: outlineInputBorder,
          contentPadding: MySpacing.all(16),
          hintStyle: MyTextStyle.bodySmall(xMuted: true),
          isCollapsed: true),
      maxLines: 1,
      controller: controller.confirmPasswordTE,
      validator: controller.validateConfirmPassword,
      cursorColor: theme.colorScheme.primary,
    );
  }

  Widget resetPasswordBtn() {
    return MyButton.block(
      onPressed: () {
        controller.resetPassword();
      },
      elevation: 0,
      padding: MySpacing.y(20),
      borderRadiusAll: Constant.textFieldRadius.small,
      backgroundColor: theme.colorScheme.primary,
      child: MyText.labelLarge(
        "Reset Password",
        fontWeight: 700,
        color: theme.colorScheme.onPrimary,
      ),
    );
  }
}
