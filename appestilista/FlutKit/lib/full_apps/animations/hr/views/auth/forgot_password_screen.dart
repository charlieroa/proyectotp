import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/theme/constant.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutter/material.dart';
import 'package:flutkit/full_apps/animations/hr/controller/auth/forgot_password_controller.dart';
import 'package:get/get.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  late ThemeData theme;
  late ForgotPasswordController controller;
  late OutlineInputBorder outlineInputBorder;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.employeeCommunication;
    controller = ForgotPasswordController();
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
      tag: 'forgot_password',
      init: controller,
      builder: (controller) {
        return Scaffold(
          body: Padding(
            padding: MySpacing.fromLTRB(
                20, MySpacing.safeAreaTop(context) + 60, 20, 0),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MyText.titleLarge(
                    "Enter email to get link",
                    fontWeight: 700,
                  ),
                  MySpacing.height(40),
                  forgotPasswordForm(),
                  MySpacing.height(20),
                  forgotPasswordBtn(),
                  registerBtn(),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget forgotPasswordForm() {
    return Form(
      key: controller.formKey,
      child: Column(
        children: [emailField()],
      ),
    );
  }

  Widget emailField() {
    return TextFormField(
      style: MyTextStyle.bodyMedium(),
      keyboardType: TextInputType.emailAddress,
      decoration: InputDecoration(
          floatingLabelBehavior: FloatingLabelBehavior.never,
          isDense: true,
          filled: true,
          fillColor: theme.cardTheme.color,
          hintText: "Email Address",
          enabledBorder: outlineInputBorder,
          focusedBorder: outlineInputBorder,
          border: outlineInputBorder,
          contentPadding: MySpacing.all(16),
          hintStyle: MyTextStyle.bodySmall(xMuted: true),
          isCollapsed: true),
      maxLines: 1,
      controller: controller.emailController,
      validator: controller.validateEmail,
      cursorColor: theme.colorScheme.primary,
    );
  }

  Widget forgotPasswordBtn() {
    return MyButton.block(
      onPressed: () {
        controller.forgotPassword();
      },
      elevation: 0,
      padding: MySpacing.y(20),
      borderRadiusAll: Constant.textFieldRadius.small,
      backgroundColor: theme.colorScheme.primary,
      child: MyText.labelLarge(
        "Submit",
        fontWeight: 700,
        color: theme.colorScheme.onPrimary,
      ),
    );
  }

  Widget registerBtn() {
    return Center(
      child: MyButton.text(
        onPressed: () {
          controller.goToRegisterScreen();
        },
        padding: MySpacing.xy(16, 16),
        child: MyText.bodySmall(
          "Don't have an account?",
          fontWeight: 600,
          xMuted: true,
        ),
      ),
    );
  }
}
