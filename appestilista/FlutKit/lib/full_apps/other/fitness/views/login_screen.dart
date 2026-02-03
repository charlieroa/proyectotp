import 'package:flutkit/full_apps/other/fitness/controllers/login_controller.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class LogInScreen extends StatefulWidget {
  const LogInScreen({super.key});

  @override
  _LogInScreenState createState() => _LogInScreenState();
}

class _LogInScreenState extends State<LogInScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late LogInController controller;
  late OutlineInputBorder outlineInputBorder;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;

    controller = LogInController();
    outlineInputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.all(Radius.circular(4)),
      borderSide: BorderSide(
        color: Colors.transparent,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<LogInController>(
        init: controller,
        tag: 'log_in_controller',
        builder: (controller) {
          return _buildBody();
        });
  }

  Widget _buildBody() {
    return Scaffold(
      body: Padding(
        padding: MySpacing.x(20),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            MyText.displaySmall(
              'Log In',
              fontWeight: 700,
            ),
            MySpacing.height(20),
            Form(
              key: controller.formKey,
              child: Column(
                children: [
                  TextFormField(
                    style: MyTextStyle.bodyMedium(),
                    decoration: InputDecoration(
                        floatingLabelBehavior: FloatingLabelBehavior.never,
                        filled: true,
                        isDense: true,
                        fillColor: customTheme.card,
                        prefixIcon: Icon(
                          LucideIcons.mail,
                          color: theme.colorScheme.onSurface,
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
                    style: MyTextStyle.bodyMedium(),
                    decoration: InputDecoration(
                        floatingLabelBehavior: FloatingLabelBehavior.never,
                        filled: true,
                        isDense: true,
                        fillColor: customTheme.card,
                        prefixIcon: Icon(
                          LucideIcons.lock,
                          color: theme.colorScheme.onSurface,
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
                ],
              ),
            ),
            MySpacing.height(20),
            Align(
              alignment: Alignment.centerRight,
              child: MyButton.text(
                  onPressed: () {
                    controller.goToForgotPasswordScreen();
                  },
                  padding: MySpacing.zero,
                  splashColor: customTheme.fitnessPrimary.withAlpha(40),
                  child: MyText.bodySmall(
                    'Forgot password ?',
                    color: customTheme.fitnessPrimary,
                  )),
            ),
            MySpacing.height(20),
            Row(
              children: [
                MyButton(
                    padding: MySpacing.xy(16, 20),
                    onPressed: () {
                      controller.login();
                    },
                    backgroundColor: customTheme.card,
                    splashColor: theme.colorScheme.onSurface.withAlpha(40),
                    elevation: 0,
                    borderRadiusAll: 4,
                    child: Row(
                      children: [
                        Image(
                          image: AssetImage(Images.google),
                          height: 17,
                          width: 17,
                        ),
                        MySpacing.width(20),
                        MyText.labelMedium(
                          'Login with Google',
                          fontWeight: 600,
                          color: theme.colorScheme.onSurface,
                        ),
                      ],
                    )),
                MySpacing.width(20),
                Expanded(
                  child: MyButton(
                    padding: MySpacing.y(20),
                    onPressed: () {
                      controller.login();
                    },
                    backgroundColor: customTheme.fitnessPrimary,
                    elevation: 0,
                    borderRadiusAll: 4,
                    child: MyText.bodyMedium(
                      'Log In',
                      color: customTheme.fitnessOnPrimary,
                      fontWeight: 600,
                    ),
                  ),
                ),
              ],
            ),
            MySpacing.height(20),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                MyText.bodySmall(
                  'New to fitness? ',
                ),
                MyButton.text(
                    onPressed: () {
                      controller.goToRegisterScreen();
                    },
                    padding: MySpacing.zero,
                    splashColor: customTheme.fitnessPrimary.withAlpha(40),
                    child: MyText.bodySmall(
                      'Register',
                      color: customTheme.fitnessPrimary,
                    )),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
