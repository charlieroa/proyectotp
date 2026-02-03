import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:flutkit/full_apps/animations/food/controllers/register_controller.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late RegisterController controller;

  late OutlineInputBorder outlineInputBorder;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;

    controller = Get.put(RegisterController());
    outlineInputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.all(Radius.circular(4)),
      borderSide: BorderSide(
        color: Colors.transparent,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<RegisterController>(
        init: controller,
        tag: 'food_register_controller',
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
          child: SingleChildScrollView(
            scrollDirection: Axis.vertical,
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
                    )),
                MySpacing.height(20),
                MyText.titleLarge(
                  'Register',
                  fontWeight: 700,
                  color: customTheme.foodPrimary,
                ),
                MySpacing.height(12),
                MyText.bodySmall(
                  'Enter your correct details to register in the app.',
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
                        LucideIcons.user,
                        color: theme.colorScheme.onSurface.withAlpha(160),
                      ),
                      hintText: "Name",
                      enabledBorder: outlineInputBorder,
                      focusedBorder: outlineInputBorder,
                      border: outlineInputBorder,
                      contentPadding: MySpacing.all(16),
                      hintStyle: MyTextStyle.bodyMedium(),
                      isCollapsed: true),
                  maxLines: 1,
                  controller: controller.nameTE,
                  validator: controller.validateName,
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
                        LucideIcons.mail,
                        color: theme.colorScheme.onSurface.withAlpha(160),
                      ),
                      hintText: "Email Address",
                      enabledBorder: outlineInputBorder,
                      focusedBorder: outlineInputBorder,
                      border: outlineInputBorder,
                      contentPadding: MySpacing.all(16),
                      hintStyle: MyTextStyle.bodyMedium(),
                      isCollapsed: true),
                  maxLines: 1,
                  controller: controller.emailTE,
                  validator: controller.validateEmail,
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
                Align(
                  alignment: Alignment.centerRight,
                  child: MyButton.text(
                    onPressed: () {
                      controller.goToForgotPasswordScreen();
                    },
                    padding: MySpacing.zero,
                    splashColor: AppTheme.customTheme.foodPrimary.withAlpha(28),
                    child: Text(
                      "Forgot Password ?",
                      style:
                          MyTextStyle.bodySmall(color: customTheme.foodPrimary),
                    ),
                  ),
                ),
                MySpacing.height(20),
                MyButton.block(
                  elevation: 0,
                  borderRadiusAll: 8,
                  onPressed: () {
                    controller.register();
                  },
                  splashColor: customTheme.foodOnPrimary.withAlpha(30),
                  backgroundColor: customTheme.foodPrimary,
                  child: MyText.labelLarge(
                    "Create an account",
                    fontWeight: 600,
                    color: customTheme.foodOnPrimary,
                    letterSpacing: 0.4,
                  ),
                ),
                MySpacing.height(20),
                Row(
                  children: [
                    Expanded(child: Divider()),
                    Padding(
                      padding: MySpacing.x(20),
                      child: MyText.bodySmall(
                        'Continue with',
                        fontSize: 10,
                        muted: true,
                        fontWeight: 600,
                      ),
                    ),
                    Expanded(child: Divider()),
                  ],
                ),
                MySpacing.height(24),
                MyButton.block(
                  onPressed: () {},
                  elevation: 0,
                  borderRadiusAll: 8,
                  backgroundColor: customTheme.card,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Image(
                        height: 24,
                        width: 24,
                        image: AssetImage(Images.google),
                      ),
                      MySpacing.width(12),
                      MyText.bodyMedium(
                        'Google',
                        fontWeight: 600,
                      ),
                    ],
                  ),
                ),
                MySpacing.height(20),
                Center(
                  child: MyButton.text(
                    onPressed: () {
                      controller.goToLogInScreen();
                    },
                    splashColor: customTheme.foodPrimary.withAlpha(40),
                    child: MyText.bodyMedium("I have an Account",
                        decoration: TextDecoration.underline,
                        color: customTheme.foodPrimary),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
