import 'package:flutkit/full_apps/other/fitness/controllers/forgot_password_controller.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  _ForgotPasswordScreenState createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late ForgotPasswordController controller;
  late OutlineInputBorder outlineInputBorder;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;

    controller = ForgotPasswordController();
    outlineInputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.all(Radius.circular(4)),
      borderSide: BorderSide(
        color: Colors.transparent,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<ForgotPasswordController>(
        init: controller,
        tag: 'forgot_password_controller',
        builder: (controller) {
          return Scaffold(
            body: Padding(
              padding: MySpacing.fromLTRB(
                  20, MySpacing.safeAreaTop(context) + 20, 20, 20),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MyText.displaySmall(
                    'Forgot \nPassword?',
                    fontWeight: 700,
                  ),
                  MySpacing.height(20),
                  MyText.bodySmall(
                    'Don\'t worry! It happens. Please enter the address associated with your account.',
                  ),
                  MySpacing.height(20),
                  Form(
                    key: controller.formKey,
                    child: TextFormField(
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
                  ),
                  MySpacing.height(40),
                  MyButton.block(
                    onPressed: () {
                      controller.goToResetPasswordScreen();
                    },
                    backgroundColor: customTheme.fitnessPrimary,
                    elevation: 0,
                    borderRadiusAll: 4,
                    padding: MySpacing.y(20),
                    child: MyText.bodyMedium(
                      'Submit',
                      color: customTheme.fitnessOnPrimary,
                      fontWeight: 600,
                    ),
                  ),
                  MySpacing.height(20),
                ],
              ),
            ),
          );
        });
  }
}
